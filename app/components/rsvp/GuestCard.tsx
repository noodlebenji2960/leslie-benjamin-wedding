import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";

interface Guest {
  firstName: string;
  lastName: string;
  dietary: string;
  note?: string;
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
  const [attempted, setAttempted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);

  const isValid = guest.firstName.trim() && guest.lastName.trim();

  const sanitizeName = (value: string) =>
    value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");
  const truncate = (value: string, max: number) => value.slice(0, max);
  const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  const handleNameChange = (field: "firstName" | "lastName", value: string) => {
    const sanitized = truncate(sanitizeName(capitalize(value)), 30);
    onUpdate?.(index, field, sanitized);
  };

  const handleChange = (field: keyof Guest, value: any, maxLength?: number) => {
    const truncated = maxLength ? truncate(value, maxLength) : value;
    onUpdate?.(index, field, truncated);
  };

  const handleConfirm = () => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    if (onConfirm) onConfirm();
    setAttempted(false);
    setShowDietary(false);
    setShowNote(false);
    setTimeout(() => firstNameRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDraft) return;
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      handleConfirm();
    }
  };

  useEffect(() => {
    if (guest.dietary) setShowDietary(true);
    if (guest.note) setShowNote(true);
  }, [guest.dietary, guest.note]);

  return (
    <>
      <motion.div
        className={`guest-card ${attempted && !isValid ? "invalid" : ""}`}
        onKeyDown={handleKeyDown}
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
          <div className="form-row">
            <input
              ref={firstNameRef}
              type="text"
              name="firstName"
              placeholder={t("rsvp:firstName")}
              value={guest.firstName}
              onChange={(e) => handleNameChange("firstName", e.target.value)}
              maxLength={30}
            />
            <input
              type="text"
              name="lastName"
              placeholder={t("rsvp:lastName")}
              value={guest.lastName}
              onChange={(e) => handleNameChange("lastName", e.target.value)}
              maxLength={30}
            />
          </div>

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
                exit={{
                  opacity: 0,
                  scaleY: 0.8,
                  transition: { duration: 0.15 },
                }}
              >
                <input
                  type="text"
                  placeholder={t("rsvp:dietaryPlaceholder")}
                  value={guest.dietary}
                  onChange={(e) => handleChange("dietary", e.target.value, 100)}
                  maxLength={100}
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
                exit={{
                  opacity: 0,
                  scaleY: 0.8,
                  transition: { duration: 0.15 },
                }}
              >
                <textarea
                  placeholder={t("rsvp:notePlaceholder")}
                  value={guest.note || ""}
                  onChange={(e) => handleChange("note", e.target.value, 200)}
                  maxLength={200}
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
        </div>

        <div className="guest-card-actions">
          {isDraft ? (
            <motion.button
              type="button"
              className="form-btn add-guest-btn"
              onClick={handleConfirm}
              whileHover={{ scale: 1.02 }}
              title={t("rsvp:addGuest")}
              aria-label={t("rsvp:addGuest")}
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
                  aria-label={t("rsvp:addDietary")}
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
                  aria-label={t("rsvp:addNote")}
                >
                  <Icon.Note />
                </button>
              )}
              <button
                type="button"
                className="remove-guest"
                onClick={() => setConfirmOpen(true)}
                aria-label={t("rsvp:removeGuestConfirm", {
                  name: `${guest.firstName} ${guest.lastName}`,
                })}
              >
                <Icon.Close />
              </button>
            </>
          )}
        </div>
      </motion.div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        closeOnBackdropClick
        showCloseButton={false}
      >
        <div className="confirm-modal">
          <p>
            {t("rsvp:removeGuestConfirm", {
              name: `${guest.firstName} ${guest.lastName}`,
            })}
          </p>
          <div className="confirm-modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setConfirmOpen(false)}
            >
              {t("rsvp:cancel")}
            </button>
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                onRemove?.(index);
                setConfirmOpen(false);
              }}
            >
              {t("rsvp:remove")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GuestCard;
