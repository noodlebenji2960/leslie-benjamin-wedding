import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import "@/styles/components/GuestCard.scss";
import { Icon } from "./Icon";
import { SongListManager } from "./SongListManager";

// Song interface
interface Song {
  title: string;
  artist: string;
}

interface Guest {
  firstName: string;
  lastName: string;
  dietary: string;
  note?: string;
  musicRequest?: string;
  songs?: Song[]; // NEW: array of songs
}

interface GuestCardProps {
  index: number;
  guest: Guest;
  onUpdate?: (index: number, field: keyof Guest, value: any) => void;
  onRemove?: (index: number) => void;
  onConfirm?: () => void;
  isDraft?: boolean;
  isRostered?: boolean;
}

// --- Main GuestCard Component ---
const GuestCard = ({
  index,
  guest,
  onUpdate,
  onRemove,
  onConfirm,
  isDraft = false,
  isRostered = false,
}: GuestCardProps) => {
  const { t } = useTranslation(["rsvp"]);

  const [showDietary, setShowDietary] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showMusicRequest, setShowMusicRequest] = useState(false);

  const isValid = guest.firstName.trim() && guest.lastName.trim();

  const handleChange = (field: keyof Guest, value: any) => {
    onUpdate?.(index, field, value);
  };

  useEffect(() => {
    if (guest.dietary) setShowDietary(true);
    if (guest.note) setShowNote(true);
    if (guest.songs && guest.songs.length > 0) setShowMusicRequest(true);
  }, [guest.dietary, guest.note, guest.musicRequest, guest.songs]);

  return (
    <motion.div
      className={`guest-card ${!isValid ? "invalid" : ""}`}
      layout="position"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        layout: { type: "spring", stiffness: 500 },
      }}
    >
      <div className="inputs-container">
        {/* Name fields */}
        <div className="form-row">
          <input
            type="text"
            placeholder={t("rsvp:firstName")}
            value={guest.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
          />
          <input
            type="text"
            placeholder={t("rsvp:lastName")}
            value={guest.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
          />
        </div>

        {/* Dietary / Note / Music Request fields */}
        <AnimatePresence>
          {showDietary && (
            <motion.div
              className="form-row"
              initial={{ opacity: 0, scaleY: 0.8, originY: 0 }}
              animate={{
                opacity: 1,
                scaleY: 1,
                transition: { type: "spring", stiffness: 400, damping: 30 },
              }}
              exit={{ opacity: 0, scaleY: 0.8, transition: { duration: 0.15 } }}
            >
              <input
                type="text"
                placeholder={t("rsvp:dietaryPlaceholder")}
                value={guest.dietary}
                onChange={(e) => handleChange("dietary", e.target.value)}
              />
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDietary(false)}
              >
                ×
              </button>
            </motion.div>
          )}
          {showNote && (
            <motion.div
              className="form-row"
              initial={{ opacity: 0, scaleY: 0.8, originY: 0 }}
              animate={{
                opacity: 1,
                scaleY: 1,
                transition: { type: "spring", stiffness: 400, damping: 30 },
              }}
              exit={{ opacity: 0, scaleY: 0.8, transition: { duration: 0.15 } }}
            >
              <textarea
                placeholder={t("rsvp:notePlaceholder")}
                value={guest.note || ""}
                onChange={(e) => handleChange("note", e.target.value)}
              />
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowNote(false)}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Song Manager */}
        {showMusicRequest && (
          <SongListManager
            songs={guest.songs}
            onUpdate={(updatedSongs) => handleChange("songs", updatedSongs)}
          />
        )}
      </div>

      <div className="guest-card-actions">
        {isDraft ? (
          <motion.button
            type="button"
            className="form-btn add-guest-btn"
            disabled={!isValid}
            onClick={() => {
              if (onConfirm) onConfirm();
              setShowDietary(false);
              setShowNote(false);
              setShowMusicRequest(false);
            }}
            whileHover={isValid ? { scale: 1.02 } : {}}
            title={t("rsvp:addGuest")}
          >
            <Icon.Add />
          </motion.button>
        ) : (
          <>
            {!showDietary && (
              <button
                type="button"
                className="three-dots-btn"
                onClick={() => setShowDietary(true)}
                title={t("rsvp:addDietary")}
              >
                <Icon.Food />
              </button>
            )}
            {!showNote && (
              <button
                type="button"
                className="three-dots-btn"
                onClick={() => setShowNote(true)}
                title={t("rsvp:addNote")}
              >
                <Icon.Note />
              </button>
            )}
            <button
              type="button"
              className="three-dots-btn"
              onClick={() => setShowMusicRequest((prev) => !prev)}
              title={t("rsvp:addMusicRequest")}
            >
              {showMusicRequest ? <Icon.Music.on /> : <Icon.Music.off />}
            </button>
            <button
              type="button"
              className="remove-guest"
              onClick={() => {
                const confirmed = window.confirm(
                  `Are you sure you want to remove ${guest.firstName} ${guest.lastName} from the guest roster?`,
                );
                if (confirmed) onRemove?.(index);
              }}
            >
              <Icon.Close />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default GuestCard;
