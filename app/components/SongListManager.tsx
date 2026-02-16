import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

interface Song {
  title: string;
  artist: string;
}

interface SongListManagerProps {
  songs?: Song[];
  onUpdate: (songs: Song[]) => void;
}

export const SongListManager = ({
  songs = [],
  onUpdate,
}: SongListManagerProps) => {
  const { t } = useTranslation(["rsvp"]);
  const [draftSong, setDraftSong] = useState<Song>({ title: "", artist: "" });

  const handleAddSong = () => {
    // Only add if at least title or artist is filled
    if (!draftSong.title.trim() && !draftSong.artist.trim()) return;

    onUpdate([...songs, draftSong]);
    setDraftSong({ title: "", artist: "" }); // Clear the draft
  };

  const handleRemoveSong = (index: number) => {
    const updatedSongs = songs.filter((_, i) => i !== index);
    onUpdate(updatedSongs);
  };

  const isAddDisabled = !draftSong.title.trim() && !draftSong.artist.trim();

  return (
    <div className="songs-container">
      {/* Existing songs */}
      <AnimatePresence>
        {songs.map((song, i) => (
          <motion.div
            key={i}
            className="form-row song-row"
            initial={{ opacity: 0, scaleY: 0.8, originY: 0 }}
            animate={{
              opacity: 1,
              scaleY: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 30,
              },
            }}
            exit={{
              opacity: 0,
              scaleY: 0.8,
              transition: { duration: 0.15 },
            }}
          >
            <div className="song-display">
              <span className="song-title">{song.title || "Untitled"}</span>
              {song.artist && (
                <>
                  <span className="song-separator"> — </span>
                  <span className="song-artist">{song.artist}</span>
                </>
              )}
            </div>
            <button
              type="button"
              className="close-btn"
              onClick={() => handleRemoveSong(i)}
              title={t("rsvp:removeSong")}
            >
              <Icon.Close />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Always-visible draft input */}
      <div className="form-row song-row draft-row">
        <input
          type="text"
          placeholder={t("rsvp:songTitlePlaceholder")}
          value={draftSong.title}
          onChange={(e) =>
            setDraftSong((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <input
          type="text"
          placeholder={t("rsvp:songArtistPlaceholder")}
          value={draftSong.artist}
          onChange={(e) =>
            setDraftSong((prev) => ({ ...prev, artist: e.target.value }))
          }
        />
        <button
          type="button"
          className="form-btn add-song-btn"
          onClick={handleAddSong}
          disabled={isAddDisabled}
          title={t("rsvp:addSong")}
        >
          <Icon.Add />
        </button>
      </div>
    </div>
  );
};
