// src/pages/RSVP.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { StepContent } from "@/components/rsvp/StepContent";
import SuccessScreen from "@/components/rsvp/SuccessScreen";
import { useRSVPForm } from "@/hooks/rsvp/useRSVPForm";
import { useRSVPSubmit } from "@/hooks/rsvp/useRSVPSubmit";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Icon } from "@/components/Icon";
import { ProgressBar } from "@/components/ProgressBar";

// Module-level tracking - persists across Strict Mode remounts
let hasTrackedRSVPStart = false;
let hasTrackedAbandonment = false;

export default function RSVP() {
  const { t, ready } = useTranslation(["home", "common", "rsvp"]);
  const analytics = useAnalytics();
  const location = useLocation();
  const [isClient, setIsClient] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    form,
    currentStep,
    steps,
    error: formError,
    handleChange,
    handleGuestsChange,
    nextStep,
    prevStep,
    setError: setFormError,
    hasValidGuests,
  } = useRSVPForm({
    email: "",
    attending: "",
    guests: [],
    nonAttendingName: "",
    notes: "",
    website: "",
  });

  const {
    submit,
    sending,
    submitted,
    error: submitError,
    setSubmitted,
  } = useRSVPSubmit(form, captchaToken, currentStep);

  const errorRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<any>(null);

  // Combine errors from both hooks
  const error = formError || submitError;

  // Combined tracking - start and abandonment
  useEffect(() => {
    // Track RSVP start on mount
    if (!hasTrackedRSVPStart) {
      analytics.event("rsvp_start", {
        event_label: "User started RSVP form",
      });
      hasTrackedRSVPStart = true;
    }

    // Reset abandonment flag on mount
    hasTrackedAbandonment = false;

    // Track abandonment on tab close/refresh
    const handleBeforeUnload = () => {
      if (!submitted && !hasTrackedAbandonment) {
        analytics.event("rsvp_abandonment", {
          event_label: `Abandoned at ${steps[currentStep]}`,
          step_number: currentStep + 1,
          step_name: steps[currentStep],
        });
        hasTrackedAbandonment = true;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Single cleanup handler
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Clear any pending cleanup
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Schedule single cleanup check
      cleanupTimeoutRef.current = setTimeout(() => {
        const isLeavingRSVP = !window.location.pathname.includes("/rsvp");

        if (isLeavingRSVP) {
          // Track abandonment if not submitted and not already tracked
          if (!submitted && !hasTrackedAbandonment) {
            analytics.event("rsvp_abandonment", {
              event_label: `Abandoned at ${steps[currentStep]}`,
              step_number: currentStep + 1,
              step_name: steps[currentStep],
            });
            hasTrackedAbandonment = true;
          }

          // Reset start tracking for next visit
          hasTrackedRSVPStart = false;
        }

        cleanupTimeoutRef.current = null;
      }, 100);
    };
  }, [currentStep, steps, submitted, analytics]);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
    if (submitted && submittedRef.current) {
      submittedRef.current.focus();
    }
  }, [error, submitted]);

  if (!ready) return <div className="loading">{t("common:loading")}</div>;

  if (submitted) {
    return (
      <SuccessScreen
        onReset={() => setSubmitted(false)}
        submittedRef={submittedRef}
      />
    );
  }

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  const isNextDisabled = () => {
    if (currentStep === 0) return !form.attending || !form.email;
    if (currentStep === 1)
      return form.attending === "yes"
        ? !hasValidGuests
        : !form.nonAttendingName;
    if (currentStep === 2) return false; // music request is optional
    if (currentStep === 3) return !captchaToken;
    return false;
  };

  const stepTexts = t("rsvp:steps", { returnObjects: true });
  const stepTextsArray = steps.map((key) => stepTexts[key]);
  const stepText = stepTextsArray[currentStep];

  return (
    <div className="rsvp-page container">
      <h1>Rsvp</h1>
      <p className="step-description">{stepText}</p>
      <ProgressBar currentStep={currentStep} totalSteps={steps.length} />

      <form className="rsvp-form" onSubmit={(e) => e.preventDefault()}>
        
        <div className="form-navigation">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            title={t("common:back") || "Back"}
          >
            <Icon.Back />
          </button>
          <span>
            {currentStep + 1}/{steps.length}
          </span>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isNextDisabled()}
              title={t("common:next") || "Next"}
            >
              <Icon.Next />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={sending || isNextDisabled()}
            >
              {sending ? t("rsvp:sending") : t("rsvp:submit")}
            </button>
          )}
        </div>
        <StepContent
          currentStep={currentStep}
          form={form}
          isClient={isClient}
          onChange={handleChange}
          onGuestsChange={handleGuestsChange}
          captchaToken={captchaToken}
          setCaptchaToken={setCaptchaToken}
          recaptchaRef={recaptchaRef}
          error={error}
        />
        {error && (
          <div className="rsvp-error" ref={errorRef} role="alert" tabIndex={-1}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
