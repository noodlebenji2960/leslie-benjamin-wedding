import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLenis } from "lenis/react";
import { useLanguage } from "@/contexts/LanguageContext";
import MiniPlayer from "./MiniPlayer";
import ManualEntry from "./ManualEntry";
import SearchDropdown from "./SearchDropdown";
import AddedSongsList from "./AddedSongsList";

export interface MusicRequestItem {
  id: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl?: string;
}

export interface SongSuggestion extends MusicRequestItem {}

export interface MusicRequestManagerProps {
  musicRequests?: MusicRequestItem[];
  onChange: (updatedList: MusicRequestItem[]) => void;
}

export interface PlayerState {
  song: MusicRequestItem | null;
  url: string | null;
  currentTime: number;
  duration: number;
  isTransitioning?: boolean;
}

const EMPTY_PLAYER: PlayerState = {
  song: null,
  url: null,
  currentTime: 0,
  duration: 0,
  isTransitioning: false,
};

export const FALLBACK_ARTWORK = "https://placehold.co/100x100?text=♪";
export const MAX_SONGS = 10;
export const SEARCH_DEBOUNCE_MS = 400;
export const API_MAX_RESULTS = 200;
export const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100];
export const SEARCH_ATTRIBUTES = {
  song: "songTerm",
  artist: "artistTerm",
  all: "allArtistTerm",
} as const;

const MusicRequestManager = ({
  musicRequests = [],
  onChange,
}: MusicRequestManagerProps) => {
  const { locale } = useLanguage();
  const [songQuery, setSongQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [player, setPlayer] = useState<PlayerState>(EMPTY_PLAYER);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTrack, setManualTrack] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { t } = useTranslation(["home", "common", "rsvp"]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  const lenis = useLenis();

  const addedSongKeys = useMemo(
    () => new Set(musicRequests.map((s) => s.id)),
    [musicRequests],
  );

  const canAddMore = musicRequests.length < MAX_SONGS;
  const showLimitMessage = musicRequests.length >= MAX_SONGS;

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }, []);

  const getSearchAttribute = useCallback((): string => {
    if (!songQuery && artistQuery) return SEARCH_ATTRIBUTES.artist;
    if (songQuery && !artistQuery) return SEARCH_ATTRIBUTES.song;
    return SEARCH_ATTRIBUTES.all;
  }, [songQuery, artistQuery]);

  // Audio setup
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const handleLoadedMetadata = () => {
      setPlayer((prev) => ({
        ...prev,
        duration: audio.duration,
        isTransitioning: false,
      }));
    };
    const handleTimeUpdate = () => {
      setPlayer((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };
    const handleEnded = () => {
      setPlayer(EMPTY_PLAYER);
    };
    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      setPlayer(EMPTY_PLAYER);
      setError(t("rsvp:musicRequest.errors.playbackFailed"));
      setTimeout(() => setError(null), 5000);
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.pause();
      audio.src = "";
      audio.load();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [t]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayer(EMPTY_PLAYER);
  }, []);

  useEffect(() => {
    setShowMiniPlayer(player.song !== null);
  }, [player.song]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Search effect
  useEffect(() => {
    const query = `${songQuery} ${artistQuery}`.trim();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (!query) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setIsSearching(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    const attribute = getSearchAttribute();
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const url = new URL("https://itunes.apple.com/search");
        url.searchParams.append("term", query);
        url.searchParams.append("entity", "song");
        url.searchParams.append("attribute", attribute);
        url.searchParams.append("limit", API_MAX_RESULTS.toString());
        url.searchParams.append("lang", locale);
        const res = await fetch(url.toString(), {
          signal: abortControllerRef.current?.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch songs");
        const data = await res.json();
        setSuggestions(
          data.results?.map((item: any) => ({
            id: String(item.trackId),
            trackName: item.trackName,
            artistName: item.artistName,
            artworkUrl100: item.artworkUrl100,
            previewUrl: item.previewUrl,
          })) || [],
        );
        if (data.results?.length === 0) {
          setError(t("rsvp:musicRequest.errors.noResults"));
        }
        setCurrentPage(1);
      } catch (err) {
        if ((err as any).name !== "AbortError") {
          console.error("Search error:", err);
          setError(t("rsvp:musicRequest.errors.searchFailed"));
        }
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [songQuery, artistQuery, t, locale, getSearchAttribute]);

  // Pagination
  const totalPages = Math.ceil(suggestions.length / itemsPerPage) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedSuggestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return suggestions.slice(start, start + itemsPerPage);
  }, [suggestions, currentPage, itemsPerPage]);

  // Handlers
  const handlePlayToggle = useCallback(
    (song: MusicRequestItem) => {
      if (!song.previewUrl || !audioRef.current) return;
      if (player.url === song.previewUrl) {
        stopAudio();
        return;
      }
      audioRef.current.pause();
      audioRef.current.src = song.previewUrl;
      audioRef.current.load();
      setPlayer({
        song,
        url: song.previewUrl,
        currentTime: 0,
        duration: 0,
        isTransitioning: true,
      });
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
        setPlayer(EMPTY_PLAYER);
        setError(t("rsvp:musicRequest.errors.playbackFailed"));
        setTimeout(() => setError(null), 5000);
      });
    },
    [player.url, stopAudio, t],
  );

  const handleAddSong = useCallback(
    (song: MusicRequestItem) => {
      if (!addedSongKeys.has(song.id) && canAddMore) {
        onChange([...musicRequests, song].slice(0, MAX_SONGS));
        setShowDropdown(false);
      }
    },
    [addedSongKeys, canAddMore, musicRequests, onChange, lenis],
  );

  const handleAddManual = useCallback(() => {
    if (!manualTrack.trim() || !manualArtist.trim() || !canAddMore) return;
    const manual: MusicRequestItem = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `manual-${Date.now()}-${Math.random()}`,
      trackName: manualTrack.trim(),
      artistName: manualArtist.trim(),
      artworkUrl100: FALLBACK_ARTWORK,
    };
    if (!addedSongKeys.has(manual.id)) {
      onChange([...musicRequests, manual].slice(0, MAX_SONGS));
    }
    setManualTrack("");
    setManualArtist("");
    setShowManualEntry(false);
  }, [
    manualTrack,
    manualArtist,
    canAddMore,
    addedSongKeys,
    musicRequests,
    onChange,
    lenis,
  ]);

  const handleRemoveSong = useCallback(
    (index: number) => {
      const updated = [...musicRequests];
      const removedSong = updated[index];
      updated.splice(index, 1);
      onChange(updated);
      if (player.url === removedSong?.previewUrl) stopAudio();
    },
    [musicRequests, onChange, player.url, stopAudio],
  );

  const handleClearSearch = useCallback(() => {
    setSongQuery("");
    setArtistQuery("");
    stopAudio();
  }, [stopAudio]);

  const progressPercent =
    player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;

  useEffect(() => {
    const isOpen = isSearching || !!error || suggestions.length > 0;
    setShowDropdown(isOpen);
  }, []);

  return (
    <div className="music-request-manager">
      <div className="search-label">
        <motion.label
          className="add-another-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {showManualEntry
            ? t("rsvp:addSong")
            : musicRequests.length === 0
              ? t("rsvp:searchSong")
              : t("rsvp:addAnother")}
        </motion.label>
        {!showManualEntry && <button
          type="button"
          className="manual-entry-toggle"
          onClick={() => setShowManualEntry(true)}
        >
          {t("rsvp:musicRequest.manualEntry.toggle")}
        </button>}
      </div>
      {showManualEntry && (songQuery || artistQuery) && canAddMore ? (
        <ManualEntry
          showManualEntry={showManualEntry}
          manualTrack={manualTrack}
          manualArtist={manualArtist}
          onManualTrackChange={setManualTrack}
          onManualArtistChange={setManualArtist}
          onAddManual={handleAddManual}
          onCancel={() => {
            setShowManualEntry(false);
            setManualTrack("");
            setManualArtist("");
          }}
          onToggle={() => setShowManualEntry(true)}
          t={t}
        />
      ) : (
        <SearchDropdown
          isOpen={showDropdown}
          setIsOpen={setShowDropdown}
          songQuery={songQuery}
          artistQuery={artistQuery}
          onSongChange={setSongQuery}
          onArtistChange={setArtistQuery}
          onClear={handleClearSearch}
          suggestions={paginatedSuggestions}
          isSearching={isSearching}
          error={error}
          addedSongKeys={addedSongKeys}
          canAddMore={canAddMore}
          player={player}
          onPlayToggle={handlePlayToggle}
          onAddSong={handleAddSong}
          formatTime={formatTime}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={suggestions.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          t={t}
        />
      )}
      {musicRequests.length > 0 && (
        <AddedSongsList
          songs={musicRequests}
          playerUrl={player.url}
          onPlayToggle={handlePlayToggle}
          onRemove={handleRemoveSong}
          t={t}
        />
      )}

      {showLimitMessage && (
        <div className="limit-message" role="status">
          {t("rsvp:musicRequest.limitMessage", { max: MAX_SONGS })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {showMiniPlayer && player.song && (
          <MiniPlayer
            player={player}
            onStop={stopAudio}
            onAdd={handleAddSong}
            isAdded={addedSongKeys.has(player.song.id)}
            canAddMore={canAddMore}
            formatTime={formatTime}
            progressPercent={progressPercent}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(MusicRequestManager);
