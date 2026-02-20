// steps/StepGuestsOrName.tsx
import GuestManager from "../GuestManager";
import { useTranslation } from "react-i18next";
import type { Guest } from "@/types/types";

interface Props {
  attending: string;
  guests: Guest[];
  nonAttendingName: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onGuestsChange: (guests: Guest[]) => void;
}

export const StepGuestsOrName = ({
  attending,
  guests,
  nonAttendingName,
  onChange,
  onGuestsChange,
}: Props) => {
  const { t } = useTranslation(["rsvp"]);

  if (attending === "yes") {
    return (
      <GuestManager guests={guests} onGuestsChange={onGuestsChange} required />
    );
  }

  return (
    <div className="form-group">
      <label htmlFor="nonAttendingName">
        {t("rsvp:yourName")} <span className="required">*</span>
      </label>
      <input
        id="nonAttendingName"
        name="nonAttendingName"
        type="text"
        value={nonAttendingName}
        onChange={onChange}
        className="form-input"
        required
        autoComplete="name"
        spellCheck={false}
        tabIndex={0}
      />
    </div>
  );
};
