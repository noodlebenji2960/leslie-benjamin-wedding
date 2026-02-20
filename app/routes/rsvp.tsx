import { useState, useEffect, useRef, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { StepContent } from "@/components/rsvp/stepContent/StepContent";
import SuccessScreen from "@/components/rsvp/SuccessScreen";
import { useRSVPForm } from "@/hooks/rsvp/useRSVPForm";
import { useRSVPSubmit } from "@/hooks/rsvp/useRSVPSubmit";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Icon } from "@/components/Icon";
import { ProgressBar } from "@/components/ProgressBar";
import { useWeddingData } from "@/hooks/useWeddingData";

const isDev = import.meta.env.DEV;

let hasTrackedRSVPStart = false;
let hasTrackedAbandonment = false;

export default function RSVP() {
  const { t, ready } = useTranslation(["home", "common", "rsvp"]);
  const analytics = useAnalytics();
  const [isClient, setIsClient] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const weddingData = useWeddingData();

  const {
    form,
    currentStep,
    currentStepObj,
    steps,
    error: formError,
    handleChange,
    handleGuestsChange,
    nextStep,
    prevStep,
    goToStep,
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

  const error = formError || submitError;

  useEffect(() => {
    if (!hasTrackedRSVPStart) {
      analytics.event("rsvp_start", { event_label: "User started RSVP form" });
      hasTrackedRSVPStart = true;
    }

    hasTrackedAbandonment = false;

    const handleBeforeUnload = () => {
      if (!submitted && !hasTrackedAbandonment) {
        analytics.event("rsvp_abandonment", {
          event_label: `Abandoned at ${currentStepObj.key}`, // ← .key
          step_number: currentStep + 1,
          step_name: currentStepObj.key, // ← .key
        });
        hasTrackedAbandonment = true;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);

      cleanupTimeoutRef.current = setTimeout(() => {
        const isLeavingRSVP = !window.location.pathname.includes("/rsvp");

        if (isLeavingRSVP) {
          if (!submitted && !hasTrackedAbandonment) {
            analytics.event("rsvp_abandonment", {
              event_label: `Abandoned at ${currentStepObj.key}`, // ← .key
              step_number: currentStep + 1,
              step_name: currentStepObj.key, // ← .key
            });
            hasTrackedAbandonment = true;
          }
          hasTrackedRSVPStart = false;
        }

        cleanupTimeoutRef.current = null;
      }, 100);
    };
  }, [currentStep, currentStepObj, steps, submitted, analytics]);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
    if (submitted && submittedRef.current) submittedRef.current.focus();
  }, [error, submitted]);

  if (!ready) return <div className="loading">{t("common:loading")}</div>;

  if (submitted) {
    return (
      <SuccessScreen
        onReset={() => setSubmitted(false)}
        submittedRef={submittedRef}
        guestEmail={form.email}
      />
    );
  }

  const isNextDisabled = () => {
    if (currentStep === 0) return !form.attending || !form.email;
    if (currentStep === 1)
      return form.attending === "yes"
        ? !hasValidGuests
        : !form.nonAttendingName;
    if (currentStep === 2) return false;
    if (currentStep === 3) return false;
    if (currentStep === 4)
      return isDev ? !form.termsAccepted : !captchaToken || !form.termsAccepted;
    return false;
  };

  const stepTitle = t(`rsvp:steps.${currentStepObj.key}.stepTitle`);
  const stepText = (
    <Trans
      i18nKey={`rsvp:steps.${currentStepObj.key}.stepText`}
      values={{
        bride: weddingData.bride.firstName,
        groom: weddingData.groom.firstName,
      }}
    />
  );

  const stepHasData = (stepKey: string): boolean => {
    if (stepKey === "contactAndAttendance") {
      return !!form.email || !!form.attending;
    }
    if (stepKey === "guestsOrName") {
      if (form.attending === "yes") {
        return (
          Array.isArray(form.guests) &&
          form.guests.some((g) => g.firstName.trim() && g.lastName.trim())
        );
      } else {
        return !!form.nonAttendingName?.trim();
      }
    }
    if (stepKey === "musicRequest") {
      return Array.isArray(form.musicRequest) && form.musicRequest.length > 0;
    }
    if (stepKey === "notes") {
      return !!form.notes?.trim();
    }
    return false;
  };

  const stepDataMap = useMemo(() => {
    return Object.fromEntries(
      (steps as Array<{ key: string }>).map((step) => [
        step.key,
        stepHasData(step.key),
      ]),
    );
  }, [form]);

  return (
    <div className="rsvp-page container">
      <h1>Rsvp</h1>
      <ProgressBar
        currentStep={currentStep}
        steps={steps}
        goToStep={goToStep}
        stepDataMap={stepDataMap}
      />
      <form className="rsvp-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-header">
          <h2 className="step-description">{stepTitle}</h2>
          <p className="step-description">{stepText}</p>
        </div>
        <StepContent
          currentStep={currentStep}
          currentStepObj={currentStepObj}
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
        <div className="form-navigation">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            title={t("common:back") || "Back"}
          >
            <Icon.Back />
            {t("common:previous")}
          </button>
          <span>
            {currentStep + 1}/{steps.length}
          </span>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isNextDisabled()}
              title={
                currentStepObj.required || stepHasData(currentStepObj.key)
                  ? t("common:next")
                  : t("rsvp:skip")
              }
            >
              {currentStepObj.required || stepHasData(currentStepObj.key) ? (
                <>
                  {t("common:next")}
                  <Icon.Next />
                </>
              ) : (
                <>
                  {t("rsvp:skip")}
                  <Icon.Next />
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              onClick={submit}
              disabled={sending || isNextDisabled()}
            >
              {sending ? t("rsvp:sending") : t("rsvp:submit")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
