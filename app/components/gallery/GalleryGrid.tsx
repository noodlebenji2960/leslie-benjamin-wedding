import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLenis } from "lenis/react";
import { Icon } from "@/components/Icon";
import { InlineReactionPicker } from "@/components/gallery/ReactionPicker";
import { Toast } from "@/components/Toast";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { SSEImageRecord } from "@/hooks/useSSE";

const REACTIONS_KEY = "wedding_my_reactions";

function loadMyReactions(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(REACTIONS_KEY) ?? "{}") as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") result[k] = v;
      else if (Array.isArray(v) && v.length > 0) result[k] = v[v.length - 1] as string;
    }
    return result;
  } catch {
    return {};
  }
}
function saveMyReactions(data: Record<string, string>) {
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(data));
}

// Deterministic pseudo-random from a string seed (same approach as the homepage carousel)
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function polaroidRotation(id: string): number {
  return (seededRandom(id) - 0.5) * 10;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface GalleryGridProps {
  images: SSEImageRecord[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onReactImage?: (imageId: string, reactions: Record<string, number>) => void;
}

const SKELETON_HEIGHTS = [
  220, 160, 280, 190, 240, 170, 300, 150, 210, 260, 180, 230,
];

const SWIPE_THRESHOLD = 60;
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function GalleryGrid({
  images,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onReactImage,
}: GalleryGridProps) {
  const { t } = useTranslation("gallery");

  const sentinelRef = useInfiniteScroll({
    onLoadMore: onLoadMore ?? (() => {}),
    hasMore: !!hasMore,
    loading: !!loading || !!loadingMore,
  });

  // ── lightbox ──────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const committingRef = useRef(false);

  // Stop the lenis-driven page scroll while the lightbox is open
  const lenis = useLenis(() => {});
  useEffect(() => {
    if (!lenis) return;
    lightboxIndex !== null ? lenis.stop() : lenis.start();
  }, [lightboxIndex, lenis]);
  useEffect(() => () => lenis?.start(), [lenis]);

  // Keep track of open image by ID so we can recover index when array shifts
  const lightboxImageIdRef = useRef<string | null>(null);
  useEffect(() => {
    lightboxImageIdRef.current = lightboxIndex !== null ? (images[lightboxIndex]?.id ?? null) : null;
  });

  // If the open image was deleted, close lightbox; if array shifted, re-sync index
  useEffect(() => {
    if (lightboxIndex === null) return;
    const id = lightboxImageIdRef.current;
    if (!id) return;
    const newIndex = images.findIndex((img) => img.id === id);
    if (newIndex === -1) {
      setLightboxIndex(null);
      setDragOffset(0);
      setTransitioning(false);
    } else if (newIndex !== lightboxIndex) {
      setLightboxIndex(newIndex);
    }
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  // reaction details keyed by imageId
  const [reactionDetails, setReactionDetails] = useState<
    Record<string, { emoji: string; name: string }[]>
  >({});

  const fetchReactionDetails = useCallback((imageId: string) => {
    fetch(`${API_BASE}/reactions/${imageId}`)
      .then((r) => r.json())
      .then((data: { emoji: string; name: string }[]) =>
        setReactionDetails((prev) => ({ ...prev, [imageId]: data })),
      )
      .catch(() => {});
  }, []);

  // When reactions change on an image (via SSE or own react), invalidate its detail cache
  const prevReactionsRef = useRef<Record<string, Record<string, number> | undefined>>({});
  useEffect(() => {
    const invalidated: string[] = [];
    for (const img of images) {
      const prev = prevReactionsRef.current[img.id];
      const curr = img.reactions;
      if (prev !== curr) {
        invalidated.push(img.id);
        prevReactionsRef.current[img.id] = curr;
      }
    }
    if (invalidated.length > 0) {
      setReactionDetails((prev) => {
        const next = { ...prev };
        for (const id of invalidated) delete next[id];
        return next;
      });
    }
  }, [images]);

  // fetch reaction details when lightbox opens or navigates to a new image
  useEffect(() => {
    if (lightboxIndex === null) return;
    const img = images[lightboxIndex];
    if (!img) return;
    if (reactionDetails[img.id] !== undefined) return; // already fetched
    if (!img.reactions || Object.keys(img.reactions).length === 0) {
      setReactionDetails((prev) => ({ ...prev, [img.id]: [] }));
      return;
    }
    fetchReactionDetails(img.id);
  }, [lightboxIndex, images, reactionDetails, fetchReactionDetails]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setDragOffset(0);
    setTransitioning(false);
    setLightboxPickerOpen(false);
  }, []);

  const navigate = useCallback(
    (direction: 1 | -1, fromSwipe = false) => {
      if (committingRef.current) return;
      setLightboxPickerOpen(false);
      setLightboxIndex((prev) => {
        if (prev === null) return prev;
        const next = prev + direction;
        if (next < 0 || next >= images.length) return prev;

        if (!fromSwipe) {
          return next;
        }

        // Swipe: animate off-screen, then swap index, then reset
        committingRef.current = true;
        const vw = window.innerWidth;
        setTransitioning(true);
        setDragOffset(direction === 1 ? -vw : vw);

        setTimeout(() => {
          setTransitioning(false);
          setDragOffset(0);
          committingRef.current = false;
        }, 260);

        return next;
      });
    },
    [images.length],
  );

  // keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, navigate, closeLightbox]);

  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    setDragOffset(e.touches[0].clientX - touchStartX.current);
  }, []);

  const handleLightboxTouchEnd = useCallback(() => {
    if (touchStartX.current === null) return;
    const offset = dragOffset;
    touchStartX.current = null;

    if (offset < -SWIPE_THRESHOLD) navigate(1, true);
    else if (offset > SWIPE_THRESHOLD) navigate(-1, true);
    else { setTransitioning(true); setDragOffset(0); setTimeout(() => setTransitioning(false), 260); }
  }, [dragOffset, navigate]);

  // ── reactions ─────────────────────────────
  const [myReactions, setMyReactions] = useState<Record<string, string>>(() =>
    loadMyReactions(),
  );

  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);
  const [lightboxPickerOpen, setLightboxPickerOpen] = useState(false);
  const longPressedRef = useRef(false);

  const handleReacted = useCallback(
    (imageId: string, emoji: string, reactions: Record<string, number>) => {
      setMyReactions((prev) => {
        const next = { ...prev, [imageId]: emoji };
        saveMyReactions(next);
        return next;
      });
      setPickerOpenId(null);
      onReactImage?.(imageId, reactions);
    },
    [onReactImage],
  );

  // ── selection ─────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [downloading, setDownloading] = useState(false);
  const [downloadErrorOpen, setDownloadErrorOpen] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  }, [images]);

  const handleDownload = useCallback(async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : images.map((img) => img.id);
    if (ids.length === 0 || downloading) return;

    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wedding-photos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error", err);
      setDownloadErrorOpen(true);
    } finally {
      setDownloading(false);
    }
  }, [selectedIds, images, downloading, t]);

  const handleGridItemPointerDown = useCallback(
    (img: SSEImageRecord, e: React.PointerEvent) => {
      const el = e.currentTarget;
      const timer = setTimeout(() => {
        if (!selectionMode) {
          longPressedRef.current = true;
          setPickerOpenId(img.id);
        }
      }, 450);
      (el as any)._pressTimer = timer;
    },
    [selectionMode],
  );

  const handleGridItemPointerUp = useCallback((e: React.PointerEvent) => {
    const timer = (e.currentTarget as any)._pressTimer;
    if (timer) clearTimeout(timer);
  }, []);

  const handleGridItemClick = useCallback(
    (img: SSEImageRecord, index: number) => {
      // Suppress the click that fires right after a long press
      if (longPressedRef.current) {
        longPressedRef.current = false;
        return;
      }
      // Close picker if tapping outside an emoji button
      if (pickerOpenId) {
        setPickerOpenId(null);
        return;
      }
      if (selectionMode) {
        toggleSelect(img.id);
        return;
      }
      setLightboxIndex(index);
    },
    [pickerOpenId, selectionMode, toggleSelect],
  );

  // ── render ────────────────────────────────
  const loadingEmpty = loading && images.length === 0;

  if (loadingEmpty) {
    return (
      <div className="gallery-grid">
        {SKELETON_HEIGHTS.map((h, i) => (
          <div key={i} className="gallery-grid__skeleton">
            <div className="gallery-grid__skeleton-img" style={{ height: h }} />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && images.length === 0) {
    return (
      <div className="gallery-grid__empty">
        <Icon.Images size={40} className="gallery-grid__empty-icon" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  const prevImg = lightboxIndex !== null && lightboxIndex > 0 ? images[lightboxIndex - 1] : null;
  const currImg = lightboxIndex !== null ? images[lightboxIndex] : null;
  const nextImg = lightboxIndex !== null && lightboxIndex < images.length - 1 ? images[lightboxIndex + 1] : null;

  const stripStyle: React.CSSProperties = {
    transform: `translateX(calc(-100vw + ${dragOffset}px))`,
    transition: transitioning ? "transform 0.25s ease" : "none",
  };

  return (
    <>
      <div className="gallery-grid__toolbar">
        {selectionMode ? (
          <>
            <span className="gallery-grid__toolbar-count">
              {t("selection.count", { count: selectedIds.size })}
            </span>
            <button
              type="button"
              className="gallery-grid__toolbar-btn"
              onClick={selectAll}
            >
              {t("selection.selectAll")}
            </button>
            <button
              type="button"
              className="gallery-grid__toolbar-btn"
              onClick={clearSelection}
            >
              {t("selection.clear")}
            </button>
            <button
              type="button"
              className="gallery-grid__toolbar-btn gallery-grid__toolbar-btn--primary"
              onClick={() => void handleDownload()}
              disabled={downloading}
            >
              {downloading ? t("selection.downloading") : t("selection.download")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="gallery-grid__toolbar-btn"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            <Icon.Download size={14} />
            {downloading ? t("selection.downloading") : t("selection.downloadAll")}
          </button>
        )}
      </div>

      <div className="gallery-grid">
        {images.map((img, index) => {
          const selected = selectedIds.has(img.id);
          const pickerOpen = pickerOpenId === img.id;

          return (
            <button
              key={img.id}
              className={`gallery-grid__item${selected ? " gallery-grid__item--selected" : ""}${pickerOpen ? " gallery-grid__item--picker-open" : ""}`}
              style={{ "--rotation": `${polaroidRotation(img.id)}deg` } as React.CSSProperties}
              onClick={() => handleGridItemClick(img, index)}
              onPointerDown={(e) => handleGridItemPointerDown(img, e)}
              onPointerUp={handleGridItemPointerUp}
              onPointerLeave={handleGridItemPointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="gallery-grid__img-wrap">
                <img src={img.thumbnailUrl} alt="" className="gallery-grid__thumb" />

                <div className="gallery-grid__overlay" />

                <span
                  className="gallery-grid__check"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(img.id); }}
                >
                  {selected && <Icon.Tick size={9} />}
                </span>

                {pickerOpen && (
                  <InlineReactionPicker
                    imageId={img.id}
                    myReaction={myReactions[img.id] ?? null}
                    onReacted={(emoji: string, reactions: Record<string, number>) =>
                      handleReacted(img.id, emoji, reactions)
                    }
                    onClose={() => setPickerOpenId(null)}
                  />
                )}
              </div>

              {img.reactions && Object.keys(img.reactions).length > 0 && (
                <span
                  className="gallery-grid__reactions"
                  onClick={(e) => { e.stopPropagation(); setPickerOpenId(img.id); }}
                >
                  {Object.entries(img.reactions).map(([emoji, count]) => (
                    <span key={emoji}>
                      {emoji} {count}
                    </span>
                  ))}
                </span>
              )}

              {img.uploaderName && (
                <span className="gallery-grid__name">Uploaded by {img.uploaderName.slice(0,1).toLocaleUpperCase() + img.uploaderName.slice(1)}</span>
              )}
            </button>
          );
        })}
      </div>

      {hasMore && onLoadMore && (
        <>
          <div ref={sentinelRef} className="gallery-grid__sentinel" aria-hidden="true" />
          <button
            className="gallery-grid__load-more"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </button>
        </>
      )}

      {lightboxIndex !== null && currImg && (
        <div
          className="gallery-lightbox"
          onTouchStart={handleLightboxTouchStart}
          onTouchMove={handleLightboxTouchMove}
          onTouchEnd={handleLightboxTouchEnd}
          onClick={() => lightboxPickerOpen && setLightboxPickerOpen(false)}
        >
          {/* Strip: prev / current / next */}
          <div className="gallery-lightbox__strip" style={stripStyle}>
            {[prevImg, currImg, nextImg].map((slide, i) => (
              <div
                key={i}
                className={`gallery-lightbox__slide${i === 1 ? " gallery-lightbox__slide--current" : ""}`}
              >
                {slide && (
                  <>
                    <img src={slide.url} alt="" className="gallery-lightbox__image" />
                    <div className="gallery-lightbox__caption">
                      {slide.uploaderName && (
                        <span className="gallery-lightbox__caption-name">{slide.uploaderName}</span>
                      )}
                      <span className="gallery-lightbox__caption-date">{formatDate(slide.uploadedAt)}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Controls — outside strip so they don't move with it */}
          <div className="gallery-lightbox__controls">
            <button className="gallery-lightbox__close" onClick={closeLightbox} aria-label="Close">
              ✕
            </button>

            <span className="gallery-lightbox__counter">
              {lightboxIndex + 1} / {images.length}
            </span>

            {lightboxIndex > 0 && (
              <button className="gallery-lightbox__nav gallery-lightbox__nav--prev" onClick={() => navigate(-1)} aria-label="Previous">
                ‹
              </button>
            )}

            {lightboxIndex < images.length - 1 && (
              <button className="gallery-lightbox__nav gallery-lightbox__nav--next" onClick={() => navigate(1)} aria-label="Next">
                ›
              </button>
            )}

            {(() => {
              const details = reactionDetails[currImg.id];
              const grouped: Record<string, string[]> = {};
              for (const { emoji, name } of details ?? []) {
                (grouped[emoji] ??= []).push(name);
              }
              const hasReactions = Object.keys(grouped).length > 0;
              return (
                <>
                  {hasReactions && (
                    <div
                      className="gallery-lightbox__reactions gallery-lightbox__reactions--clickable"
                      onClick={(e) => { e.stopPropagation(); setLightboxPickerOpen((v) => !v); }}
                    >
                      {Object.entries(grouped).map(([emoji, names]) => (
                        <div key={emoji} className="gallery-lightbox__reaction-group">
                          <span className="gallery-lightbox__reaction-emoji">{emoji}</span>
                          <span className="gallery-lightbox__reaction-names">
                            {names.join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {lightboxPickerOpen && (
                    <div className="gallery-lightbox__picker">
                      <InlineReactionPicker
                        imageId={currImg.id}
                        myReaction={myReactions[currImg.id] ?? null}
                        onReacted={(emoji, reactions) => {
                          handleReacted(currImg.id, emoji, reactions);
                          setLightboxPickerOpen(false);
                        }}
                        onClose={() => setLightboxPickerOpen(false)}
                      />
                    </div>
                  )}
                  {!hasReactions && !lightboxPickerOpen && (
                    <button
                      className="gallery-lightbox__react-btn"
                      onClick={(e) => { e.stopPropagation(); setLightboxPickerOpen(true); }}
                      aria-label="Add reaction"
                    >
                      ❤️
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <Toast isOpen={downloadErrorOpen} onClose={() => setDownloadErrorOpen(false)}>
        {t("selection.downloadError")}
      </Toast>
    </>
  );
}
