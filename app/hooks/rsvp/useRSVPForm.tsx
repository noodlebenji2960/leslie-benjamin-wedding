import { useState } from "react";
import type { RSVPFormData, Guest } from "@/types/types";
import { useAnalytics } from "@/contexts/AnalyticsContext";

export type RSVPStep = {
  key: string;
  required: boolean;
};

export function useRSVPForm(initial: RSVPFormData) {
  const analytics = useAnalytics();

  const [form, setForm] = useState<RSVPFormData>({
    ...initial,
    musicRequest: initial.musicRequest || "",
    termsAccepted: false,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasValidGuests, setHasValidGuests] = useState(false);

  const steps: RSVPStep[] = [
    { key: "contactAndAttendance", required: true },
    { key: "guestsOrName", required: true },
    { key: "musicRequest", required: false },
    { key: "notes", required: false },
    { key: "review", required: true },
  ];

  const currentStepObj = steps[currentStep];

  /** Generic input change handler — supports text, select, textarea, and checkboxes */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name } = e.target;
    const value =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  /** Update guest list and validate */
  const handleGuestsChange = (guests: Guest[]) => {
    setForm((prev) => ({ ...prev, guests }));
    setHasValidGuests(
      guests.some((g) => g.firstName.trim() && g.lastName.trim()),
    );
  };

  /** Proceed to next step with analytics */
  const nextStep = () => {
    analytics.event("rsvp_step_complete", {
      event_label: currentStepObj.key,
      step_number: currentStep + 1,
      step_name: currentStepObj.key,
    });
    setCurrentStep((s) => s + 1);
  };

  /** Go back a step with analytics */
  const prevStep = () => {
    analytics.event("rsvp_step_back", {
      event_label: currentStepObj.key,
      step_number: currentStep + 1,
      step_name: currentStepObj.key,
    });
    setCurrentStep((s) => s - 1);
  };

  /** Jump to a specific step */
  const goToStep = (step: number) => setCurrentStep(step);

  return {
    form,
    setForm,
    currentStep,
    currentStepObj,
    steps,
    error,
    setError,
    hasValidGuests,
    handleChange,
    handleGuestsChange,
    nextStep,
    prevStep,
    goToStep,
  };
}
