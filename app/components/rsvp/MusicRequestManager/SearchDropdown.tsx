import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MusicRequestItem, PlayerState, SongSuggestion } from "./MusicRequestManager";
import { Icon } from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import DropdownPagination from "./DropdownPagination";
import { ITEMS_PER_PAGE_OPTIONS } from "./MusicRequestManager";

interface SearchDropdownProps {
  songQuery: string;
  artistQuery: string;
  onSongChange: (value: string) => void;
  onArtistChange: (value: string) => void;
  onClear: () => void;
  suggestions: SongSuggestion[];
  isSearching: boolean;
  error: string | null;
  addedSongKeys: Set<string>;
  canAddMore: boolean;
  player: PlayerState;
  onPlayToggle: (song: MusicRequestItem) => void;
  onAddSong: (song: MusicRequestItem) => void;
  formatTime: (seconds: number) => string;
  // pagination
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  t: (key: string, options?: any) => string;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  setIsOpen,
  songQuery,
  artistQuery,
  onSongChange,
  onArtistChange,
  onClear,
  suggestions,
  isSearching,
  error,
  addedSongKeys,
  canAddMore,
  player,
  onPlayToggle,
  onAddSong,
  formatTime,
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const songInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const lenis = useLenis();

  const hasQuery = !!(songQuery || artistQuery);

  // Open whenever we have a query (typing); close on outside click
  useEffect(() => {
    if (hasQuery) setIsOpen(true);
    else setIsOpen(false);
  }, [hasQuery]);

  // Close on outside click / focus-out
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions, currentPage]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Escape") {
        setIsOpen(false);
        songInputRef.current?.blur();
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const song = suggestions[activeIndex];
        if (song && !addedSongKeys.has(song.id) && canAddMore) {
          onAddSong(song);
        }
      }
    },
    [isOpen, suggestions, activeIndex, addedSongKeys, canAddMore],
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLLIElement>(
        ".dropdown-suggestion-item",
      );
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (isOpen && containerRef.current && suggestions.length > 0) {
      // Optional: Add slight delay to ensure animation completes first
      const timer = setTimeout(() => {
        if (containerRef.current) {
          lenis?.scrollTo(containerRef.current, {
            offset: (document.documentElement.clientHeight / 4) * -1,
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, suggestions]);

  return (
    <div
      className="search-dropdown"
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Input row */}
      <div className="search-dropdown__inputs">
        <div className="search-dropdown__input-wrapper">
          <span className="search-dropdown__icon search-dropdown__icon--song">
            {/* music note */}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 13V3l7-1v10" />
              <circle cx="4" cy="13" r="2" />
              <circle cx="11" cy="12" r="2" />
            </svg>
          </span>
          <input
            ref={songInputRef}
            type="text"
            value={songQuery}
            onChange={(e) => onSongChange(e.target.value)}
            onFocus={() => hasQuery && setIsOpen(true)}
            placeholder={t("rsvp:musicRequest.searchPlaceholder.song")}
            className="form-input search-dropdown__input"
            aria-label={t("rsvp:musicRequest.searchPlaceholder.song")}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
            aria-controls="suggestions-listbox"
            aria-activedescendant={
              activeIndex >= 0
                ? `suggestion-item-${suggestions[activeIndex]?.id}`
                : undefined
            }
          />
          {songQuery && (
            <button
              className="search-dropdown__clear-single"
              onClick={() => onSongChange("")}
              aria-label="Clear song search"
              tabIndex={-1}
            >
              ✕
            </button>
          )}
        </div>

        <div className="search-dropdown__input-wrapper">
          <span className="search-dropdown__icon search-dropdown__icon--artist">
            {/* person / artist */}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="5" r="3" />
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" />
            </svg>
          </span>
          <input
            type="text"
            value={artistQuery}
            onChange={(e) => onArtistChange(e.target.value)}
            onFocus={() => hasQuery && setIsOpen(true)}
            placeholder={t("rsvp:musicRequest.searchPlaceholder.artist")}
            className="form-input search-dropdown__input"
            aria-label={t("rsvp:musicRequest.searchPlaceholder.artist")}
          />
          {artistQuery && (
            <button
              className="search-dropdown__clear-single"
              onClick={() => onArtistChange("")}
              aria-label="Clear artist search"
              tabIndex={-1}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="search-dropdown__panel"
            initial={{ opacity: 0, y: -6, scaleY: 0.97 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top center" }}
          >
            {/* Panel header: pagination controls */}
            {totalItems > 0 && (
              <div className="search-dropdown__panel-header">
                <span className="search-dropdown__total">
                  {totalItems} {totalItems === 1 ? "result" : "results"}
                </span>
                <div className="search-dropdown__pagination-top">
                  {totalPages > 1 && (
                    <div className="search-dropdown__page-select">
                      <label htmlFor="dd-page-select">Page</label>
                      <select
                        id="dd-page-select"
                        value={currentPage}
                        onChange={(e) => onPageChange(parseInt(e.target.value))}
                        className="form-select"
                      >
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="search-dropdown__per-page">
                    <select
                      value={itemsPerPage}
                      onChange={(e) =>
                        onItemsPerPageChange(parseInt(e.target.value))
                      }
                      className="form-select"
                      aria-label="Results per page"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Status / error states */}
            {isSearching && (
              <div
                role="status"
                aria-live="polite"
                className="search-dropdown__status"
              >
                <span className="search-dropdown__spinner" aria-hidden="true" />
                {t("rsvp:musicRequest.searching")}
              </div>
            )}
            {error && !isSearching && (
              <div role="alert" className="search-dropdown__error">
                {error}
              </div>
            )}

            {/* Results list */}
            {!isSearching && suggestions.length > 0 && (
              <ul
                id="suggestions-listbox"
                ref={listRef}
                className="search-dropdown__list"
                role="listbox"
                aria-label="Song suggestions"
              >
                {suggestions.map((song, idx) => {
                  const alreadyAdded = addedSongKeys.has(song.id);
                  const isPlaying = player.url === song.previewUrl;
                  const isActive = idx === activeIndex;

                  return (
                    <motion.li
                      key={song.id}
                      id={`suggestion-item-${song.id}`}
                      className={`dropdown-suggestion-item${isActive ? " dropdown-suggestion-item--active" : ""}${alreadyAdded ? " dropdown-suggestion-item--added" : ""}`}
                      role="option"
                      aria-selected={alreadyAdded}
                      onMouseEnter={() => setActiveIndex(idx)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.1, delay: idx * 0.012 }}
                    >
                      {/* Album art stack */}
                      <div className="dd-item__artwork">
                        <img
                          src={song.artworkUrl100}
                          alt=""
                          className="dd-item__artwork-gray"
                          loading="lazy"
                        />
                        <img
                          src={song.artworkUrl100}
                          alt={`${song.trackName} album art`}
                          className="dd-item__artwork-color"
                          loading="lazy"
                        />
                        {song.previewUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayToggle(song);
                            }}
                            className={`dd-item__play-btn${isPlaying ? " dd-item__play-btn--playing" : ""}`}
                            aria-label={
                              isPlaying
                                ? t("rsvp:musicRequest.stopAriaLabel", {
                                    songName: song.trackName,
                                  })
                                : t("rsvp:musicRequest.playAriaLabel", {
                                    songName: song.trackName,
                                  })
                            }
                            tabIndex={-1}
                          >
                            {isPlaying ? <Icon.Stop /> : <Icon.Play />}
                          </button>
                        )}
                      </div>

                      {/* Info */}
                      <div className="dd-item__info">
                        <span className="dd-item__track">{song.trackName}</span>
                        <span className="dd-item__artist">
                          {song.artistName}
                        </span>
                      </div>

                      {/* Add button */}
                      <button
                        className="dd-item__add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddSong(song);
                        }}
                        disabled={alreadyAdded || !canAddMore}
                        aria-label={
                          alreadyAdded
                            ? `${song.trackName} already added`
                            : t("rsvp:musicRequest.addAriaLabel", {
                                songName: song.trackName,
                              })
                        }
                      >
                        {alreadyAdded ? <Icon.Tick /> : <Icon.Add />}
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}

            {/* Bottom pagination */}
            {totalPages > 1 && (
              <div className="search-dropdown__panel-footer">
                <DropdownPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchDropdown;