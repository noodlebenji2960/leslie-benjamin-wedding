// steps/StepMessage.tsx
import { useRef } from "react";

interface Props {
  attending: string;
  notes: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}

export const StepMessage = ({ attending, notes, onChange }: Props) => {

  return (
    <div className="form-group">
      <textarea
        id="notes"
        name="notes"
        value={notes}
        onChange={onChange}
        className="form-input"
        autoFocus
        tabIndex={0}
      />
    </div>
  );
};
