import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import "@/styles/components/GuestCard.scss";
import { g } from "framer-motion/client";
import { Icon } from "./Icon";

interface Guest {
  firstName: string;
  lastName: string;
  dietary: string;
  note?: string;
}

interface GuestCardProps {
  index: number;
  guest: Guest;
  onUpdate?: (index: number, field: keyof Guest, value: string) => void;
  onRemove?: (index: number) => void;
  onConfirm?: () => void;
  isDraft?: boolean;
  isRostered?: boolean;
}

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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const isValid = guest.firstName.trim() && guest.lastName.trim();

  const handleChange = (field: keyof Guest, value: string) => {
    onUpdate?.(index, field, value);
  };

  useEffect(() => {
    if (guest.dietary) setShowDietary(true);
    if (guest.note) setShowNote(true);
  }, [guest.dietary, guest.note]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div
      className={`guest-card ${!isValid ? "invalid" : ""}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <div>
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

        {/* Dietary / Note fields */}
        <AnimatePresence>
          {showDietary && (
            <motion.div
              className="form-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                type="text"
                placeholder={t("rsvp:dietaryPlaceholder")}
                value={guest.dietary}
                onChange={(e) => handleChange("dietary", e.target.value)}
              />
              {isDraft && (
                <button
                  type="button"
                  className="remove-guest"
                  onClick={() => setShowDietary(false)}
                >
                  ×
                </button>
              )}
            </motion.div>
          )}

          {showNote && (
            <motion.div
              className="form-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <textarea
                placeholder={t("rsvp:notePlaceholder")}
                value={guest.note || ""}
                onChange={(e) => handleChange("note", e.target.value)}
              />
              {isDraft && (
                <button
                  type="button"
                  className="remove-guest"
                  onClick={() => setShowNote(false)}
                >
                  ×
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="guest-card-actions" >
        {isDraft ? (
          <>
            <motion.button
              type="button"
              className="form-btn add-guest-btn"
              disabled={!isValid}
              onClick={() => {
                if (onConfirm) onConfirm();
                setDropdownOpen(false);
                setShowDietary(false);
                setShowNote(false);
              }}
              whileHover={isValid ? { scale: 1.02 } : {}}
              title={t("rsvp:addGuest")}
            >
              <Icon.Add/>
            </motion.button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  className="dropdown-menu"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowDietary(true);
                      setDropdownOpen(false);
                    }}
                  >
                    {t("rsvp:dietary")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNote(true);
                      setDropdownOpen(false);
                    }}
                  >
                    {t("rsvp:note")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            <button
              type="button"
              className="three-dots-btn"
              onClick={() => setDropdownOpen((s) => !s)}
            >
              <Icon.More/>
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
              <Icon.Close/>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default GuestCard;
