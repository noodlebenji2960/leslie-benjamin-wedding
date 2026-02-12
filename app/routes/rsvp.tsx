import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import emailjs from "@emailjs/browser";
import ReCAPTCHA from "react-google-recaptcha";
import { motion, AnimatePresence } from "framer-motion";
import "@/styles/rsvp.scss";
import GuestManager from "@/components/GuestManager";
import { Icon } from "@/components/Icon";

interface Guest {
  firstName: string;
  lastName: string;
  dietary: string;
  note?: string;
}

interface RSVPFormData {
  email: string;
  attending: string;
  guests: Guest[];
  nonAttendingName?: string;
  notes?: string;
  website?: string;
  captchaAnswer?: string;
}

const RECAPTCHA_SITE_KEY = "6Lcy_mcsAAAAADoT-ibwy1RvePEHG4xJ87D0fdse";

const steps = ["contactAndAttendance", "guestsOrName", "captcha", "review"];
const stepDescriptions: Record<number, string> = {
  0: "contactAndAttendance",
  1: "guestsOrName",
  2: "captcha",
  3: "review",
};

const fadeVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const RSVP = () => {
  const { t, ready } = useTranslation(["home", "common", "rsvp"]);
  const { locale } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  const [form, setForm] = useState<RSVPFormData>({
    email: "",
    attending: "",
    guests: [],
    nonAttendingName: "",
    notes: "",
    website: "",
    captchaAnswer: "",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formStartTime] = useState(Date.now());

  const errorRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<any>(null);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
    if (submitted && submittedRef.current) submittedRef.current.focus();
  }, [error, submitted]);

  if (!ready) return <div className="loading">{t("common:loading")}</div>;

  /* -------------------- Validation -------------------- */

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t("rsvp:errors.required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t("rsvp:errors.invalidEmail");
    return null;
  };

  const hasInvalidGuests = form.guests.some(
    (g) => !g.firstName.trim() || !g.lastName.trim(),
  );

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !validateEmail(form.email) && !!form.attending;
      case 1:
        if (form.attending === "yes") {
          // At least one guest, all names filled
          return form.guests.length > 0 && !hasInvalidGuests;
        } else {
          // Non-attending name + notes required
          return !!form.nonAttendingName?.trim() && !!form.notes?.trim();
        }
      case 2:
        return form.captchaAnswer?.trim() === "7" && !!captchaToken;
      default:
        return true;
    }
  };

  /* -------------------- Handlers -------------------- */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleNext = () => {
    if (!isStepValid()) {
      if (
        currentStep === 1 &&
        form.attending === "yes" &&
        form.guests.length === 0
      ) {
        setError(t("rsvp:errors.addAtLeastOneGuest"));
      } else {
        setError(t("rsvp:errors.required"));
      }
      return;
    }
    setError(null);
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setError(null);
    if (form.website) return setError("Bot detected.");
    if (Date.now() - formStartTime < 2000)
      return setError("Submission too fast.");
    if (!captchaToken) return setError("Please complete reCAPTCHA.");

    setSending(true);

    try {
      const guestsText =
        form.attending === "yes"
          ? form.guests
              .map(
                (g, i) =>
                  `${i + 1}. ${g.firstName} ${g.lastName}` +
                  (g.dietary ? ` - Dietary: ${g.dietary}` : "") +
                  (g.note ? ` - Note: ${g.note}` : ""),
              )
              .join("\n")
          : `Not attending: ${form.nonAttendingName}`;

      await emailjs.send(
        "service_vvuhisc",
        "template_4m25aki",
        {
          email: form.email,
          attending: form.attending,
          guestsCount: form.attending === "yes" ? form.guests.length : 1,
          guests: guestsText,
          notes: form.notes || "None",
          recaptchaToken: captchaToken,
        },
        "gVksEDEDoKBjB0TJU",
      );

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(t("rsvp:errors.failed"));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setSending(false);
    }
  };

  /* -------------------- Submitted -------------------- */

  if (submitted) {
    return (
      <div className="rsvp-page container" ref={submittedRef} tabIndex={-1}>
        <h1>{t("rsvp:thankYou")}</h1>
        <p>{t("rsvp:confirmation")}</p>
      </div>
    );
  }

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  /* -------------------- Render -------------------- */

  return (
    <div className="rsvp-page container">
      <h1>{t("rsvp:title")}</h1>

      <p className="step-description">
        {t(`rsvp:steps.${stepDescriptions[currentStep]}`)}
      </p>

      <form className="rsvp-form" onSubmit={(e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          {/* Step 0: Email + Attendance */}
          {currentStep === 0 && (
            <motion.div
              key="step0"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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

          {/* Step 1: Guests if attending, or Name + Message if not */}
          {currentStep === 1 && (
            <motion.div
              key="guestsOrName"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {form.attending === "yes" ? (
                <GuestManager
                  guests={form.guests}
                  onGuestsChange={(guests) =>
                    setForm((prev) => ({ ...prev, guests }))
                  }
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
                      onChange={handleChange}
                      className="form-input"
                      required
                      autoComplete="name"
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
                      onChange={handleChange}
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

          {/* Step 2: CAPTCHA + optional notes for attending */}
          {currentStep === 2 && isClient && (
            <motion.div
              key="step3"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {form.attending === "yes" && (
                <div className="form-group">
                  <label htmlFor="notes">{t("rsvp:messageToBrideGroom")}</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={t("rsvp:messagePlaceholder")}
                    rows={5}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="captchaAnswer">
                  What is 3 + 4? <span className="required">*</span>
                </label>
                <input
                  id="captchaAnswer"
                  name="captchaAnswer"
                  type="text"
                  value={form.captchaAnswer}
                  onChange={handleChange}
                  className={`form-input ${
                    form.captchaAnswer?.trim() === "7"
                      ? "form-input-valid"
                      : form.captchaAnswer?.trim()
                        ? "form-input-invalid"
                        : ""
                  }`}
                  required
                />
                {form.captchaAnswer?.trim() &&
                  form.captchaAnswer?.trim() !== "7" && (
                    <div className="field-error">Answer must be 7</div>
                  )}
              </div>

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

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <motion.div
              key="step4"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
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
                          {guest.note &&
                            ` - ${t("rsvp:guestNote")}: ${guest.note}`}
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
                    <strong>{t("rsvp:messageToBrideGroom")}:</strong>{" "}
                    {form.notes}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="rsvp-error" ref={errorRef} tabIndex={-1} role="alert">
            {error}
          </div>
        )}

        <div>
          <div className="form-navigation">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {currentStep + 1}/{steps.length - 1}
          </div>
          <div>
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              title={t("rsvp:back")}
            >
              <Icon.Back />
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                disabled={!isStepValid()}
                onClick={handleNext}
                title={t("rsvp:next")}
              >
                <Icon.Next />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={sending}>
                {sending ? t("rsvp:sending") : t("rsvp:submit")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default RSVP;
