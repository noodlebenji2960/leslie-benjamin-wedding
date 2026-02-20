import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import GuestCard from "@/components/rsvp/GuestCard";

interface Guest {
  firstName: string;
  lastName: string;
  dietary: string;
  note?: string;
}

interface GuestManagerProps {
  guests: Guest[];
  onGuestsChange: (guests: Guest[]) => void;
  required?: boolean;
}

const emptyGuest: Guest = {
  firstName: "",
  lastName: "",
  dietary: "",
  note: "",
};

const GuestManager = ({ guests, onGuestsChange }: GuestManagerProps) => {
  const { t } = useTranslation(["rsvp"]);

  const [draftGuest, setDraftGuest] = useState<Guest>(emptyGuest);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const removeGuest = useCallback(
    (index: number) => {
      onGuestsChange(guests.filter((_, i) => i !== index));
      setEditingIndex(null);
    },
    [guests, onGuestsChange],
  );

  const isDuplicateName = useCallback(
    (firstName: string, lastName: string, excludeIndex?: number) => {
      return guests.some(
        (g, i) =>
          i !== excludeIndex &&
          g.firstName.trim().toLowerCase() === firstName.trim().toLowerCase() &&
          g.lastName.trim().toLowerCase() === lastName.trim().toLowerCase(),
      );
    },
    [guests],
  );

  const addGuestToRoster = useCallback(() => {
    if (!draftGuest.firstName.trim() || !draftGuest.lastName.trim()) return;
    if (isDuplicateName(draftGuest.firstName, draftGuest.lastName)) return;
    onGuestsChange([...guests, draftGuest]);
    setDraftGuest(emptyGuest);
  }, [draftGuest, guests, isDuplicateName, onGuestsChange]);

  const updateGuest = useCallback(
    (index: number, field: keyof Guest, value: string) => {
      const updated = { ...guests[index], [field]: value };
      if (
        (field === "firstName" || field === "lastName") &&
        isDuplicateName(updated.firstName, updated.lastName, index)
      )
        return;
      onGuestsChange(guests.map((g, i) => (i === index ? updated : g)));
    },
    [guests, isDuplicateName, onGuestsChange],
  );

  const updateDraft = useCallback((field: keyof Guest, value: string) => {
    setDraftGuest((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEditToggle = useCallback((index: number | null) => {
    setEditingIndex(index);
  }, []);

  return (
    <div className="guests-section" aria-label={t("rsvp:guestsTitle.plural")}>
      <div className="add-guest-section">
        <motion.label
          className="add-another-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {guests.length === 0 ? t("rsvp:addGuest") : t("rsvp:addAnother")}
        </motion.label>

        <GuestCard
          key="draft"
          index={guests.length}
          guest={draftGuest}
          onUpdate={(_, field, value) => updateDraft(field, value)}
          onConfirm={addGuestToRoster}
          isDraft
        />
      </div>
      <AnimatePresence>
        {guests.length > 0 && (
          <div className="guests-count">
            {guests.length}{" "}
            {t(
              guests.length === 1
                ? "rsvp:guestsTitle.singular"
                : "rsvp:guestsTitle.plural",
            )}
          </div>
        )}

        {guests.map((guest, index) => (
          <GuestCard
            key={`roster-${index}`}
            index={index}
            guest={guest}
            onUpdate={updateGuest}
            onRemove={removeGuest}
            onEditToggle={handleEditToggle}
            isEditing={editingIndex === index}
            isRostered
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GuestManager;
