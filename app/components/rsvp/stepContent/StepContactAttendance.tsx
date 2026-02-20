// steps/StepContactAttendance.tsx
import { use, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RSVPFormData } from "@/types/types";

const EMAIL_REGEX = /^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const VALID_EMAIL_CHARS_TEST = /[^\w\-+.@]/;
const VALID_EMAIL_CHARS_REPLACE = /[^\w\-+.@]/g;

interface Props {
  form: RSVPFormData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}

export const StepContactAttendance = ({ form, onChange }: Props) => {
  const { t } = useTranslation(["rsvp"]);
  const [emailTouched, setEmailTouched] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t("rsvp:errors.required");
    if (!EMAIL_REGEX.test(email)) return t("rsvp:errors.invalidEmail");
    return null;
  };

  const emailError = emailTouched ? validateEmail(form.email) : null;
  const emailIsValid = emailTouched && !emailError && form.email.trim() !== "";

  const handleEmailKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (e.key.length === 1 && VALID_EMAIL_CHARS_TEST.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value
      .replace(VALID_EMAIL_CHARS_REPLACE, "")
      .toLowerCase();
    onChange(e);
  };


  return (
    <>
      <div className="form-group">
        <label htmlFor="email">
          {t("rsvp:email")} <span className="required">*</span>
        </label>
        <input
          autoFocus
          id="email"
          name="email"
          type="email"
          value={form.email}
          onKeyDown={handleEmailKeyDown}
          onChange={handleEmailChange}
          onBlur={() => setEmailTouched(true)}
          className={`form-input ${
            emailError
              ? "form-input-invalid"
              : emailIsValid
                ? "form-input-valid"
                : ""
          }`}
          required
          autoComplete="email"
          tabIndex={0}
        />
        {emailError && <div className="field-error">{emailError}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="attending">
          {t("rsvp:attending")} <span className="required">*</span>
        </label>
        <select
          id="attending"
          name="attending"
          value={form.attending}
          onChange={onChange}
          className={`form-input ${form.attending ? "form-input-valid" : ""}`}
          required
          autoComplete="off"
          tabIndex={0}
        >
          <option value="">{t("rsvp:select")}</option>
          <option value="yes">{t("rsvp:yes")}</option>
          <option value="no">{t("rsvp:no")}</option>
        </select>
      </div>
    </>
  );
};
