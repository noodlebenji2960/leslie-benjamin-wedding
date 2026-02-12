import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import emailjs from "@emailjs/browser";
import "@/styles/rsvp.scss";
import { Icon } from "@/components/Icon";
import { StepContent } from "@/components/rsvp/StepContent";
import SuccessScreen from "@/components/rsvp/SuccessScreen";
import type { Guest, RSVPFormData } from "@/types/types";

const RECAPTCHA_SITE_KEY = "6Lcy_mcsAAAAADoT-ibwy1RvePEHG4xJ87D0fdse";

const steps = ["contactAndAttendance", "guestsOrName", "captcha", "review"];
const stepDescriptions: Record<number, string> = {
  0: "contactAndAttendance",
  1: "guestsOrName",
  2: "captcha",
  3: "review",
};

export default function RSVP() {
  const { t, ready } = useTranslation(["home", "common", "rsvp"]);
  const [isClient, setIsClient] = useState(false);
  const [form, setForm] = useState<RSVPFormData>({
    email: "",
    attending: "",
    guests: [],
    nonAttendingName: "",
    notes: "",
    website: "",
  });
  const [hasValidGuests, setHasValidGuests] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formStartTime] = useState(Date.now());

  const errorRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<any>(null);

  useEffect(() => setIsClient(true), []);
  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
    if (submitted && submittedRef.current) submittedRef.current.focus();
  }, [error, submitted]);

  if (!ready) return <div className="loading">{t("common:loading")}</div>;

  const hasCompleteGuests = form.guests.some(
    (g) => g.firstName.trim() && g.lastName.trim(),
  );

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t("rsvp:errors.required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t("rsvp:errors.invalidEmail");
    return null;
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !validateEmail(form.email) && !!form.attending;
      case 1:
        return form.attending === "yes"
          ? hasCompleteGuests
          : !!form.nonAttendingName?.trim() && !!form.notes?.trim();
      case 2:
        return !!captchaToken;
      default:
        return true;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleGuestsChange = (guests: Guest[]) => {
    setForm((prev) => ({ ...prev, guests }));
    setHasValidGuests(
      guests.some((g) => g.firstName.trim() && g.lastName.trim()),
    );
  };

  const handleNext = () => {
    if (!isStepValid()) {
      if (currentStep === 1 && form.attending === "yes" && !hasCompleteGuests) {
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
      console.error("Submission error:", err);
      setError(t("rsvp:errors.failed"));
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setCurrentStep(0);
    setForm({
      email: "",
      attending: "",
      guests: [],
      nonAttendingName: "",
      notes: "",
      website: "",
    });
    setCaptchaToken(null);
    setHasValidGuests(false);
  };

  if (submitted) {
    return <SuccessScreen onReset={handleReset} submittedRef={submittedRef} />;
  }

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="rsvp-page container">
      <h1>Rsvp</h1>

      <p className="step-description">
        {t(`rsvp:steps.${stepDescriptions[currentStep]}`)}
      </p>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <form
        autoComplete="on"
        className="rsvp-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <StepContent
          currentStep={currentStep}
          form={form}
          isClient={isClient}
          onChange={handleChange}
          onGuestsChange={handleGuestsChange}
          captchaToken={captchaToken}
          error={error}
          recaptchaRef={recaptchaRef}
          setCaptchaToken={setCaptchaToken}
          recaptchaSiteKey={RECAPTCHA_SITE_KEY}
        />

        {error && (
          <div className="rsvp-error" ref={errorRef} tabIndex={-1} role="alert">
            {error}
          </div>
        )}

        <div className="form-navigation">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            title={t("rsvp:back")}
          >
            <Icon.Back />
          </button>
          <span>
            {currentStep + 1}/{steps.length}
          </span>
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
      </form>
    </div>
  );
}
