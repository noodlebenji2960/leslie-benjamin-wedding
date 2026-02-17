import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Guest, RSVPFormData } from "@/types/types";
import ReCAPTCHA from "react-google-recaptcha";
import GuestManager from "./GuestManager";
import MusicRequestManager, {
  type MusicRequestItem,
} from "./MusicRequestManager";
import type { RSVPStep } from "@/hooks/rsvp/useRSVPForm";
import { useLanguage } from "@/contexts/LanguageContext";

const isDev = import.meta.env.DEV;

// For validateEmail — no g flag
const EMAIL_REGEX = /^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/;

// For handleEmailKeyDown — no g flag, stateless .test()
const VALID_EMAIL_CHARS_TEST = /[^\w\-+.@]/;

// For handleEmailChange — g flag for .replace() to strip all occurrences
const VALID_EMAIL_CHARS_REPLACE = /[^\w\-+.@]/g;

interface StepContentProps {
  currentStep: number;
  currentStepObj: RSVPStep;
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
  currentStepObj,
  form,
  isClient,
  onChange,
  onGuestsChange,
  captchaToken,
  error,
  recaptchaRef,
  setCaptchaToken,
}: StepContentProps) => {
  const { locale: lang } = useLanguage();
  const { t } = useTranslation(["home", "common", "rsvp"]);

  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t("rsvp:errors.required");
    if (!EMAIL_REGEX.test(email)) return t("rsvp:errors.invalidEmail");
    return null;
  };

  const emailError = emailTouched ? validateEmail(form.email) : null;
  const emailIsValid = emailTouched && !emailError && form.email.trim() !== "";

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    <AnimatePresence mode="wait">
      {/* ---------- Step 0: Contact & Attendance ---------- */}
      {currentStep === 0 && (
        <motion.div
          key="step0"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          <div className="form-group">
            <label htmlFor="email">
              {t("rsvp:email")} <span className="required">*</span>
            </label>
            <input
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
            >
              <option value="">{t("rsvp:select")}</option>
              <option value="yes">{t("rsvp:yes")}</option>
              <option value="no">{t("rsvp:no")}</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* ---------- Step 1: Guests / Non-Attending Name ---------- */}
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
          )}
        </motion.div>
      )}

      {/* ---------- Step 2: Music Requests ---------- */}
      {currentStep === 2 && form.attending === "yes" && (
        <motion.div
          key="musicRequest"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          <MusicRequestManager
            musicRequests={form.musicRequest || []}
            onChange={(updatedList: MusicRequestItem[]) =>
              onChange({
                target: { name: "musicRequest", value: updatedList },
              } as any)
            }
          />
        </motion.div>
      )}

      {/* ---------- Step 3: Message to Bride & Groom ---------- */}
      {currentStep === 3 && (
        <motion.div
          key="notes"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          {form.attending === "yes" && (
            <div className="form-group">
              <label htmlFor="notes">
                {t("rsvp:messageToBrideGroom")} ({t("rsvp:optional")})
              </label>
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
        </motion.div>
      )}

      {/* ---------- Step 4: Review + Consent + CAPTCHA ---------- */}
      {currentStep === 4 && isClient && (
        <motion.div
          key="review"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="form-content"
        >
          <div className="review-card">
            <div className="review-card__inner">
              <p className="review-card__reply-line">
                <em>
                  {form.attending === "yes"
                    ? t("rsvp:review.acceptsWithPleasure")
                    : t("rsvp:review.declinesWithRegrets")}
                </em>
              </p>

              <div className="review-card__field">
                <span className="review-card__field-label">
                  {t("rsvp:email")}
                </span>
                <span className="review-card__field-value">{form.email}</span>
              </div>

              {form.attending === "yes" && form.guests.length > 0 && (
                <div className="review-card__field">
                  <span className="review-card__field-label">
                    {t("rsvp:review.numberAttending")}
                  </span>
                  <span className="review-card__field-value">
                    {form.guests.length}
                  </span>
                  <ul className="review-card__guests">
                    {form.guests.map((guest, i) => (
                      <li key={i} className="review-card__field-value">
                        {guest.firstName} {guest.lastName}
                        {guest.dietary && (
                          <span className="review-card__dietary">
                            {" "}
                            ({guest.dietary})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {form.attending === "no" && (
                <div className="review-card__field">
                  <span className="review-card__field-label">
                    {t("rsvp:name")}
                  </span>
                  <span className="review-card__field-value">
                    {form.nonAttendingName}
                  </span>
                </div>
              )}

              {form.attending === "yes" &&
                form.musicRequest &&
                (form.musicRequest as MusicRequestItem[]).length > 0 && (
                  <div className="review-card__field">
                    <span className="review-card__field-label">
                      {t("rsvp:musicRequest")}
                    </span>
                    <ul className="review-card__songs">
                      {(form.musicRequest as MusicRequestItem[]).map(
                        (song, i) => (
                          <li key={i} className="review-card__song">
                            <img
                              src={song.artworkUrl100}
                              alt={song.trackName}
                              className="review-card__song-art"
                            />
                            <span className="review-card__field-value">
                              {song.trackName} — {song.artistName}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

              {form.notes && (
                <div className="review-card__field">
                  <span className="review-card__field-label">
                    {t("rsvp:messageToBrideGroom")}
                  </span>
                  <p className="review-card__note review-card__field-value">
                    "{form.notes}"
                  </p>
                </div>
              )}

              <p className="review-card__footer">
                {t("rsvp:review.pleasureOfYourCompany")}
              </p>
            </div>
          </div>

          {/* ---------- Consent checkbox ---------- */}
          <div className="form-group form-group--consent">
            <label className="consent-label">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={!!form.termsAccepted}
                onChange={onChange}
                className="consent-checkbox"
              />
              <span className="consent-text">
                {t("rsvp:terms.iAgree")}{" "}
                <a
                  href={`/${lang}/legal/terms`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("rsvp:terms.termsLinkText")}
                </a>{" "}
                {t("rsvp:terms.and")}{" "}
                <a
                  href={`/${lang}/legal/privacy`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("rsvp:terms.privacyLinkText")}
                </a>
                .
              </span>
            </label>
          </div>

          {!isDev && (
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
              ref={recaptchaRef}
              style={{
                display: "inline-block",
                width: "100%",
                marginTop: "1rem",
              }}
            />
          )}
          {!isDev && !captchaToken && error && (
            <div className="field-error">
              {t("rsvp:errors.captchaRequired")}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
