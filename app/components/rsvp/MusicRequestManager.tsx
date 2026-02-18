import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icon";

export interface MusicRequestItem {
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl?: string;
}

interface SongSuggestion extends MusicRequestItem {}

interface MusicRequestManagerProps {
  musicRequests?: MusicRequestItem[];
  onChange: (updatedList: MusicRequestItem[]) => void;
}

interface PlayerState {
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

const FALLBACK_ARTWORK = "https://placehold.co/100x100?text=♪";
const MAX_SONGS = 10;
const SEARCH_DEBOUNCE_MS = 400;

const MusicRequestManager = ({
  musicRequests = [],
  onChange,
}: MusicRequestManagerProps) => {
  const [songQuery, setSongQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [player, setPlayer] = useState<PlayerState>(EMPTY_PLAYER);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTrack, setManualTrack] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Memoize derived data
  const addedSongKeys = useMemo(
    () => new Set(musicRequests.map((s) => `${s.trackName}-${s.artistName}`)),
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

  // Initialize audio element once
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
      setError("Failed to play preview");
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
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Optionally clear src to stop loading
      // audioRef.current.src = "";
      // audioRef.current.load();
    }
    setPlayer(EMPTY_PLAYER);
  }, []);

  // Control mini player visibility based on player state
  useEffect(() => {
    setShowMiniPlayer(player.song !== null);
  }, [player.song]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Search effect with cleanup
  useEffect(() => {
    const query = `${songQuery} ${artistQuery}`.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`,
          { signal: abortControllerRef.current?.signal },
        );

        if (!res.ok) throw new Error("Failed to fetch songs");

        const data = await res.json();

        setSuggestions(
          data.results?.map((item: any) => ({
            trackName: item.trackName,
            artistName: item.artistName,
            artworkUrl100: item.artworkUrl100,
            previewUrl: item.previewUrl,
          })) || [],
        );

        if (data.results?.length === 0) {
          setError("No songs found. Try a different search.");
        }
      } catch (err) {
        if ((err as any).name !== "AbortError") {
          setError("Failed to search. Please try again.");
        }
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [songQuery, artistQuery]);

  const handlePlayToggle = useCallback(
    (song: MusicRequestItem) => {
      if (!song.previewUrl || !audioRef.current) return;

      // If clicking the same song, stop it
      if (player.url === song.previewUrl) {
        stopAudio();
        return;
      }

      // Stop current playback
      audioRef.current.pause();
      audioRef.current.src = song.previewUrl;
      audioRef.current.load();

      // Set transitioning state to keep mini player visible
      setPlayer({
        song,
        url: song.previewUrl,
        currentTime: 0,
        duration: 0,
        isTransitioning: true,
      });

      // Attempt to play
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
        setPlayer(EMPTY_PLAYER);
        setError("Failed to play preview");
        setTimeout(() => setError(null), 5000);
      });
    },
    [player.url, stopAudio],
  );

  const handleAddSong = useCallback(
    (song: MusicRequestItem) => {
      if (
        !addedSongKeys.has(`${song.trackName}-${song.artistName}`) &&
        canAddMore
      ) {
        onChange([...musicRequests, song].slice(0, MAX_SONGS));
      }
    },
    [addedSongKeys, canAddMore, musicRequests, onChange],
  );

  const handleAddManual = useCallback(() => {
    if (!manualTrack.trim() || !manualArtist.trim() || !canAddMore) return;

    const manual: MusicRequestItem = {
      trackName: manualTrack.trim(),
      artistName: manualArtist.trim(),
      artworkUrl100: FALLBACK_ARTWORK,
    };

    if (!addedSongKeys.has(`${manual.trackName}-${manual.artistName}`)) {
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
  ]);

  const handleRemoveSong = useCallback(
    (index: number) => {
      const updated = [...musicRequests];
      const removedSong = updated[index];
      updated.splice(index, 1);
      onChange(updated);

      if (player.url === removedSong?.previewUrl) {
        stopAudio();
      }
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

  return (
    <div className="music-request-manager">
      {/* Added Songs List */}
      {musicRequests.length > 0 && (
        <div className="added-songs-section">
          <div className="added-songs-header">
            <span className="song-count">
              {musicRequests.length} / {MAX_SONGS} songs
            </span>
          </div>
          <ul className="added-songs-list">
            {musicRequests.map((song, idx) => (
              <li
                key={`${song.trackName}-${song.artistName}-${idx}`}
                className="added-song-item"
              >
                <div className="song-info">
                  <img
                    src={song.artworkUrl100}
                    alt={`${song.trackName} album art`}
                    className="song-artwork-small"
                    loading="lazy"
                  />
                  <div className="song-text">
                    <span className="song-name">{song.trackName}</span>
                    <span className="artist-name">{song.artistName}</span>
                  </div>
                </div>
                <div className="song-actions">
                  {song.previewUrl && (
                    <button
                      onClick={() => handlePlayToggle(song)}
                      className="play-btn-small"
                      aria-label={
                        player.url === song.previewUrl
                          ? "Stop preview"
                          : "Play preview"
                      }
                    >
                      {player.url === song.previewUrl ? (
                        <Icon.Stop />
                      ) : (
                        <Icon.Play />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveSong(idx)}
                    className="remove-btn"
                    aria-label={`Remove ${song.trackName}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search Inputs */}
      <div className="search-inputs">
        <input
          type="text"
          value={songQuery}
          onChange={(e) => setSongQuery(e.target.value)}
          placeholder="Search by song title"
          className="form-input"
          aria-label="Song title"
        />
        <input
          type="text"
          value={artistQuery}
          onChange={(e) => setArtistQuery(e.target.value)}
          placeholder="Search by artist"
          className="form-input"
          aria-label="Artist name"
        />
        <button onClick={handleClearSearch}>Clear</button>
      </div>

      {isSearching && (
        <div role="status" aria-live="polite" className="searching-status">
          Searching...
        </div>
      )}

      {error && (
        <div role="alert" className="search-error">
          {error}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul className="suggestions-list" role="list">
          {suggestions.map((song, idx) => {
            const songKey = `${song.trackName}-${song.artistName}`;
            const alreadyAdded = addedSongKeys.has(songKey);
            const isPlaying = player.url === song.previewUrl;

            return (
              <li key={`${songKey}-${idx}`} className="suggestion-item">
                <div className="left-controls">
                  <img
                    src={song.artworkUrl100}
                    alt=""
                    className="album-grayscale"
                    style={{ filter: "grayscale(100%)" }}
                    loading="lazy"
                  />
                  <img
                    src={song.artworkUrl100}
                    alt={`${song.trackName} album art`}
                    className="album-color"
                    loading="lazy"
                  />
                  {song.previewUrl && (
                    <button
                      onClick={() => handlePlayToggle(song)}
                      className={`play-btn ${isPlaying ? "playing" : ""}`}
                      aria-label={
                        isPlaying
                          ? `Stop preview of ${song.trackName}`
                          : `Play preview of ${song.trackName}`
                      }
                    >
                      {isPlaying ? <Icon.Stop /> : <Icon.Play />}
                    </button>
                  )}
                </div>

                <div className="suggestion-info">
                  <div>
                    <strong>{song.trackName}</strong>
                  </div>
                  <div>
                    <em>{song.artistName}</em>
                  </div>
                  {isPlaying && player.duration > 0 && (
                    <div className="playback-time" aria-live="polite">
                      {formatTime(player.currentTime)} /{" "}
                      {formatTime(player.duration)}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleAddSong(song)}
                  className="add-btn"
                  disabled={alreadyAdded || !canAddMore}
                  aria-label={
                    alreadyAdded
                      ? `${song.trackName} already added`
                      : `Add ${song.trackName} to requests`
                  }
                >
                  {alreadyAdded ? <Icon.Tick /> : <Icon.Add />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showLimitMessage && (
        <div className="limit-message" role="status">
          Maximum of {MAX_SONGS} songs reached. Remove a song to add more.
        </div>
      )}

      {/* Manual Entry */}
      {(songQuery || artistQuery) && canAddMore && (
        <div className="manual-entry-section">
          {!showManualEntry ? (
            <button
              type="button"
              className="manual-entry-toggle"
              onClick={() => setShowManualEntry(true)}
            >
              Can't find your song? Add it manually
            </button>
          ) : (
            <div className="manual-entry-form">
              <input
                type="text"
                value={manualTrack}
                onChange={(e) => setManualTrack(e.target.value)}
                placeholder="Song title"
                className="form-input"
                aria-label="Manual song title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddManual();
                }}
              />
              <input
                type="text"
                value={manualArtist}
                onChange={(e) => setManualArtist(e.target.value)}
                placeholder="Artist name"
                className="form-input"
                aria-label="Manual artist name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddManual();
                }}
              />
              <div className="manual-entry-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualTrack("");
                    setManualArtist("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleAddManual}
                  disabled={!manualTrack.trim() || !manualArtist.trim()}
                >
                  Add Song
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini Player - Controlled by useEffect */}
      <AnimatePresence mode="wait">
        {showMiniPlayer && player.song && (
          <motion.div
            key={player.url}
            className="mini-player"
            role="region"
            aria-label="Now playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <motion.img
              key={player.song.artworkUrl100}
              src={player.song.artworkUrl100}
              alt={`${player.song.trackName} album art`}
              className="mini-player__artwork"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              loading="lazy"
            />
            <div className="mini-player__info">
              <motion.span
                key={`track-${player.song.trackName}`}
                className="mini-player__track"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                {player.song.trackName}
              </motion.span>
              <motion.span
                key={`artist-${player.song.artistName}`}
                className="mini-player__artist"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: 0.03 }}
              >
                {player.song.artistName}
              </motion.span>
              <div
                className="mini-player__progress-bar"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="mini-player__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="mini-player__time">
                {formatTime(player.currentTime)} / {formatTime(player.duration)}
              </span>
            </div>
            <button
              className="mini-player__stop"
              onClick={stopAudio}
              aria-label="Stop preview"
            >
              <Icon.Stop />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(MusicRequestManager);
