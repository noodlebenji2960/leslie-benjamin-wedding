import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { PageTitle } from "@/components/PageTitle";
import { UploadButton } from "@/components/gallery/UploadButton";
import { useSSE } from "@/hooks/useSSE";
import type { SSEImageRecord } from "@/hooks/useSSE";
import "@/styles/gallery.scss";
import type { Route } from "./+types/gallery";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Gallery - Leslie & Benjamin" }];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const UPLOADER_NAME_KEY = "wedding_uploader_name";

interface GalleryResponse {
  images: SSEImageRecord[];
  nextCursor: string | null;
  total: number;
}

export default function GalleryPage() {
  const { t } = useTranslation("gallery");

  const [images, setImages] = useState<SSEImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [uploaderName, setUploaderName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(UPLOADER_NAME_KEY)?.trim() ?? "";
  });

  const abortRef = useRef<AbortController | null>(null);
  const hasInitRef = useRef(false);

  const fetchImages = useCallback(async (existingCursor?: string | null) => {
    if (!API_BASE) return;

    const isInitial = !existingCursor;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams({ limit: "24" });
    if (existingCursor) params.set("cursor", existingCursor);

    try {
      const res = await fetch(`${API_BASE}/gallery?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) return;

      const data: GalleryResponse = await res.json();

      setImages((prev) =>
        existingCursor ? [...prev, ...data.images] : data.images,
      );

      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
        console.error("Gallery fetch failed", err);
      }
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;
    void fetchImages();
  }, [fetchImages]);

  // Refresh the first page when the tab regains focus — a backstop in case
  // the SSE connection silently dropped while the tab was backgrounded.
  const refreshFirstPage = useCallback(async () => {
    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/gallery?limit=24`);
      if (!res.ok) return;
      const data: GalleryResponse = await res.json();

      setImages((prev) => {
        const refreshedIds = new Set(data.images.map((img) => img.id));
        const olderImages = prev.filter((img) => !refreshedIds.has(img.id));
        return [...data.images, ...olderImages];
      });
    } catch (err) {
      console.error("Gallery refresh failed", err);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshFirstPage();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [refreshFirstPage]);

  useSSE(
    (newImage) => {
      setImages((prev) => {
        if (prev.some((img) => img.id === newImage.id)) return prev;
        return [newImage, ...prev];
      });
    },
    (deletedId) => {
      setImages((prev) => prev.filter((img) => img.id !== deletedId));
    },
    (updatedId, uploaderName) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === updatedId ? { ...img, uploaderName } : img,
        ),
      );
    },
    (reactedId, reactions) => {
      setImages((prev) =>
        prev.map((img) => (img.id === reactedId ? { ...img, reactions } : img)),
      );
    },
    () => {
      setImages([]);
    },
  );

  const handleUploaded = useCallback((image: SSEImageRecord) => {
    setImages((prev) => {
      if (prev.some((img) => img.id === image.id)) return prev;
      return [image, ...prev];
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    void fetchImages(cursor);
  }, [cursor, loadingMore, fetchImages]);

  return (
    <div className="gallery-page container">
      <PageTitle>{t("title")}</PageTitle>

      <UploadButton onUploaded={handleUploaded} setUploaderName={setUploaderName} uploaderName={uploaderName}/>

      <GalleryGrid
        images={images}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        locked={!uploaderName.trim()}
        onReactImage={(imageId, reactions) =>
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageId ? { ...img, reactions } : img,
            ),
          )
        }
      />
    </div>
  );
}
