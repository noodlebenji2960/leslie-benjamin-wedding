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

  const addGuestToRoster = useCallback(() => {
    if (!draftGuest.firstName.trim() || !draftGuest.lastName.trim()) return;
    onGuestsChange([...guests, draftGuest]);
    setDraftGuest(emptyGuest);
  }, [draftGuest, guests, onGuestsChange]);

  const removeGuest = useCallback(
    (index: number) => {
      onGuestsChange(guests.filter((_, i) => i !== index));
    },
    [guests, onGuestsChange],
  );

  const updateGuest = useCallback(
    (index: number, field: keyof Guest, value: string) => {
      onGuestsChange(
        guests.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
      );
    },
    [guests, onGuestsChange],
  );

  const updateDraft = useCallback((field: keyof Guest, value: string) => {
    setDraftGuest((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="guests-section" aria-label={t("rsvp:guestsTitle")}>
      <AnimatePresence>
        {guests.map((guest, index) => (
          <GuestCard
            key={`roster-${index}`}
            index={index}
            guest={guest}
            onUpdate={updateGuest}
            onRemove={removeGuest}
            isRostered
          />
        ))}
      </AnimatePresence>

      {guests.length > 0 && (
        <motion.p
          className="add-another-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {t("rsvp:addAnotherGuest")}
        </motion.p>
      )}

      <GuestCard
        key="draft"
        index={guests.length}
        guest={draftGuest}
        onUpdate={(_, field, value) => updateDraft(field, value)}
        onConfirm={addGuestToRoster}
        isDraft
      />
    </div>
  );
};

export default GuestManager;
