import { useState } from "react";
import type { RSVPFormData, Guest } from "@/types/types";
import { useAnalytics } from "@/contexts/AnalyticsContext";

export function useRSVPForm(initial: RSVPFormData) {
  const analytics = useAnalytics();

  const [form, setForm] = useState<RSVPFormData>({
    ...initial,
    musicRequest: initial.musicRequest || "", // Initialize music request
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasValidGuests, setHasValidGuests] = useState(false);

  // Steps: contact, guests/non-attending, music request, captcha, review
  const steps = [
    "contactAndAttendance",
    "guestsOrName",
    "musicRequest",
    "captcha",
    "review",
  ];

  /** Generic input change handler */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
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
      event_label: steps[currentStep],
      step_number: currentStep + 1,
      step_name: steps[currentStep],
    });
    setCurrentStep((s) => s + 1);
  };

  /** Go back a step with analytics */
  const prevStep = () => {
    analytics.event("rsvp_step_back", {
      event_label: steps[currentStep],
      step_number: currentStep + 1,
      step_name: steps[currentStep],
    });
    setCurrentStep((s) => s - 1);
  };

  /** Jump to a specific step */
  const goToStep = (step: number) => setCurrentStep(step);

  return {
    form,
    setForm,
    currentStep,
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
