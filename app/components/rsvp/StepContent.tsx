import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import GuestManager from "@/components/GuestManager";
import ReCAPTCHA from "react-google-recaptcha";
import type { Guest, RSVPFormData } from "@/types/types";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

interface StepContentProps {
  currentStep: number;
  form: RSVPFormData;
  isClient: boolean;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onGuestsChange: (guests: Guest[]) => void;
  captchaToken: string | null;
  error: string | null;
  recaptchaRef: React.RefObject<any>;
  setCaptchaToken: (token: string | null) => void;
}

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const StepContent = ({
  currentStep,
  form,
  isClient,
  onChange,
  onGuestsChange,
  captchaToken,
  error,
  recaptchaRef,
  setCaptchaToken,
}: StepContentProps) => {
  const { t } = useTranslation(["home", "common", "rsvp"]);

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t("rsvp:errors.required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t("rsvp:errors.invalidEmail");
    return null;
  };

  return (
    <AnimatePresence mode="wait">
      {currentStep === 0 && (
        <motion.div
          key="step0"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          {/* Email + Attendance step */}
          <div className="form-group">
            <label htmlFor="email">
              {t("rsvp:email")} <span className="required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              spellCheck={false}
              onKeyDown={(e) => e.key === " " && e.preventDefault()}
              onPaste={(e) =>
                /\s/.test(e.clipboardData.getData("text")) && e.preventDefault()
              }
              onChange={onChange}
              className={`form-input ${
                form.email.trim()
                  ? validateEmail(form.email)
                    ? "form-input-invalid"
                    : "form-input-valid"
                  : ""
              }`}
              required
              autoComplete="email"
            />
            {form.email && validateEmail(form.email) && (
              <div className="field-error">{validateEmail(form.email)}</div>
            )}
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
            >
              <option value="">{t("rsvp:select")}</option>
              <option value="yes">{t("rsvp:yes")}</option>
              <option value="no">{t("rsvp:no")}</option>
            </select>
          </div>
        </motion.div>
      )}

      {currentStep === 1 && (
        <motion.div
          key="guestsOrName"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          {form.attending === "yes" ? (
            <GuestManager
              guests={form.guests}
              onGuestsChange={onGuestsChange}
              required
            />
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="nonAttendingName">
                  {t("rsvp:yourName")} <span className="required">*</span>
                </label>
                <input
                  id="nonAttendingName"
                  name="nonAttendingName"
                  type="text"
                  value={form.nonAttendingName}
                  onChange={onChange}
                  className="form-input"
                  required
                  autoComplete="name"
                  spellCheck={false}
                />
              </div>
              <div className="form-group">
                <label htmlFor="notes">
                  {t("rsvp:messageToBrideGroom")}{" "}
                  <span className="required">*</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                  className="form-input"
                  placeholder={t("rsvp:messagePlaceholder")}
                  rows={5}
                  required
                />
              </div>
            </>
          )}
        </motion.div>
      )}

      {currentStep === 2 && isClient && (
        <motion.div
          key="step3"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          {form.attending === "yes" && (
            <div className="form-group">
              <label htmlFor="notes">{t("rsvp:messageToBrideGroom")}</label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={onChange}
                className="form-input"
                placeholder={t("rsvp:messagePlaceholder")}
                rows={5}
              />
            </div>
          )}

          <ReCAPTCHA
            sitekey={RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptchaToken(token)}
            ref={recaptchaRef}
            style={{
              display: "inline-block",
              width: "100%",
              marginTop: "1rem",
            }}
          />
          {!captchaToken && error && (
            <div className="field-error">Please complete reCAPTCHA</div>
          )}
        </motion.div>
      )}

      {currentStep === 3 && (
        <motion.div
          key="step4"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          <div className="review">
            <p>
              <strong>{t("rsvp:email")}:</strong> {form.email}
            </p>
            <p>
              <strong>{t("rsvp:attending")}:</strong>{" "}
              {t(`rsvp:${form.attending}`)}
            </p>

            {form.attending === "yes" && form.guests.length > 0 && (
              <div>
                <strong>{t("rsvp:guestsTitle")}:</strong>
                <ul>
                  {form.guests.map((guest, index) => (
                    <li key={index}>
                      {guest.firstName} {guest.lastName}
                      {guest.dietary &&
                        ` - ${t("rsvp:dietary")}: ${guest.dietary}`}
                      {guest.note && ` - ${t("rsvp:guestNote")}: ${guest.note}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {form.attending === "no" && (
              <p>
                <strong>{t("rsvp:name")}:</strong> {form.nonAttendingName}
              </p>
            )}
            {form.notes && (
              <p>
                <strong>{t("rsvp:messageToBrideGroom")}:</strong> {form.notes}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
