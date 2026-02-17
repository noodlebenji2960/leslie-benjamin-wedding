import React, { useState, useEffect, useRef, useCallback } from "react";
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

const MusicRequestManager = ({
  musicRequests,
  onChange,
}: MusicRequestManagerProps) => {
  const [songQuery, setSongQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const safeMusicRequests = musicRequests || [];

  // Helper function to stop audio (memoized to prevent re-renders)
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlayingUrl(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Format seconds as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Debounced iTunes search
  useEffect(() => {
    const query = `${songQuery} ${artistQuery}`.trim();
    if (!query) {
      setSuggestions([]);
      setError(null);
      // Stop audio when clearing search
      stopAudio();
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const handler = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      // Stop audio when starting a new search
      stopAudio();

      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            query,
          )}&entity=song&limit=20`,
          { signal },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch songs");
        }

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
          // Auto-hide error after 5 seconds
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        if ((err as any).name !== "AbortError") {
          console.error(err);
          setError("Failed to search. Please try again.");
          // Auto-hide error after 5 seconds
          setTimeout(() => setError(null), 5000);
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [songQuery, artistQuery, stopAudio]);

  // Play/stop preview with proper cleanup
  const handlePlayToggle = (song: MusicRequestItem) => {
    if (!song.previewUrl) return;

    // Clear any existing errors when user interacts
    setError(null);

    // If currently playing this song, stop it
    if (playingUrl === song.previewUrl) {
      stopAudio();
      return;
    }

    // Stop any currently playing audio
    stopAudio();

    // Create and play new audio
    const audio = new Audio(song.previewUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setPlayingUrl(null);
      setCurrentTime(0);
      setDuration(0);
      cleanupListeners();
    };

    const handleError = () => {
      setPlayingUrl(null);
      setCurrentTime(0);
      setDuration(0);
      setError("Failed to play preview");
      // Auto-hide error after 5 seconds
      setTimeout(() => setError(null), 5000);
      cleanupListeners();
    };

    const cleanupListeners = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    audio.play().catch((err) => {
      console.error("Audio play error:", err);
      setError("Failed to play preview");
      // Auto-hide error after 5 seconds
      setTimeout(() => setError(null), 5000);
      cleanupListeners();
    });

    setPlayingUrl(song.previewUrl);
  };

  const handleAddSong = (song: MusicRequestItem) => {
    if (
      !safeMusicRequests.some(
        (s) =>
          s.trackName === song.trackName && s.artistName === song.artistName,
      )
    ) {
      onChange([...safeMusicRequests, song].slice(0, 10));
    }

    // Stop audio when adding a song
    stopAudio();
  };

  const handleRemoveSong = (index: number) => {
    const updated = [...safeMusicRequests];
    const removedSong = updated[index];
    updated.splice(index, 1);
    onChange(updated);

    // Stop audio when removing a song (especially if it's currently playing)
    if (playingUrl === removedSong?.previewUrl) {
      stopAudio();
    }
  };

  const handleClearAll = () => {
    onChange([]);
    // Stop audio when clearing all songs
    stopAudio();
  };

  return (
    <div className="music-request-manager">
      {/* Added Songs List */}
      {safeMusicRequests.length > 0 && (
        <div className="added-songs-section">
          <div className="added-songs-header">
            <span className="song-count">
              {safeMusicRequests.length} / 10 songs
            </span>
            <button
              onClick={handleClearAll}
              className="clear-all-btn"
              aria-label="Clear all songs"
            >
              Clear All
            </button>
          </div>
          <ul className="added-songs-list">
            {safeMusicRequests.map((song, idx) => (
              <li
                key={`${song.trackName}-${song.artistName}-${idx}`}
                className="added-song-item"
              >
                <div className="song-info">
                  <img
                    src={song.artworkUrl100}
                    alt={`${song.trackName} album art`}
                    className="song-artwork-small"
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
                        playingUrl === song.previewUrl
                          ? "Stop preview"
                          : "Play preview"
                      }
                    >
                      {playingUrl === song.previewUrl ? (
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
      </div>

      {/* Loading State */}
      {isSearching && (
        <div
          
          role="status"
          aria-live="polite"
        >
          Searching...
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul className="suggestions-list" role="list">
          {suggestions.map((song, idx) => {
            const alreadyAdded = safeMusicRequests.some(
              (s) =>
                s.trackName === song.trackName &&
                s.artistName === song.artistName,
            );
            const isPlaying = playingUrl === song.previewUrl;

            return (
              <li
                key={`${song.trackName}-${song.artistName}-${idx}`}
                className="suggestion-item"
              >
                {/* Left controls with grayscale/color album art */}
                <div className="left-controls">
                  {/* Grayscale background layer */}
                  <img
                    src={song.artworkUrl100}
                    alt=""
                    className="album-grayscale"
                    style={{ filter: "grayscale(100%)" }}
                  />
                  {/* Color circle layer */}
                  <img
                    src={song.artworkUrl100}
                    alt={`${song.trackName} album art`}
                    className="album-color"
                  />
                  {/* Play button overlay */}
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

                {/* Song info */}
                <div className="suggestion-info">
                  <div>
                    <strong>{song.trackName}</strong>
                  </div>
                  <div>
                    <em>{song.artistName}</em>
                  </div>
                  {isPlaying && duration > 0 && (
                    <div className="playback-time" aria-live="polite">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  )}
                </div>

                {/* Add button */}
                <button
                  onClick={() => handleAddSong(song)}
                  className="add-btn"
                  disabled={alreadyAdded || safeMusicRequests.length >= 10}
                  aria-label={
                    alreadyAdded
                      ? `${song.trackName} already added`
                      : `Add ${song.trackName} to requests`
                  }
                >
                  {alreadyAdded ? (
                    <>
                      <Icon.Tick />
                    </>
                  ) : (
                    <>
                      <Icon.Add />
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {safeMusicRequests.length >= 10 && (
        <div className="limit-message" role="status">
          Maximum of 10 songs reached. Remove a song to add more.
        </div>
      )}
    </div>
  );
};

export default MusicRequestManager;
