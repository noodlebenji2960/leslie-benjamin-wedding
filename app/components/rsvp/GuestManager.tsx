import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence } from "framer-motion";
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

  // Controlled draft guest state
  const [draftGuest, setDraftGuest] = useState<Guest>(emptyGuest);

  /* -------------------- Handlers -------------------- */

  const addGuestToRoster = useCallback(() => {
    if (!draftGuest.firstName.trim() || !draftGuest.lastName.trim()) return;

    onGuestsChange([...guests, draftGuest]);
    setDraftGuest(emptyGuest); // reset draft
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

  /* -------------------- Render -------------------- */

  return (
    <div className="guests-section">
      <AnimatePresence>
        {/* Existing guests */}
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

        {/* Draft guest */}
        <GuestCard
          key="draft"
          index={guests.length}
          guest={draftGuest}
          onUpdate={(_, field, value) => updateDraft(field, value)}
          onConfirm={addGuestToRoster}
          isDraft
        />
      </AnimatePresence>
    </div>
  );
};

export default GuestManager;
