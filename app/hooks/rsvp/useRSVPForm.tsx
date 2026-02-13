import { useState } from "react";
import type { RSVPFormData, Guest } from "@/types/types";
import { useAnalytics } from "@/contexts/AnalyticsContext";

export function useRSVPForm(initial: RSVPFormData) {
  const analytics = useAnalytics();
  const [form, setForm] = useState(initial);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasValidGuests, setHasValidGuests] = useState(false);

  const steps = ["contactAndAttendance", "guestsOrName", "captcha", "review"];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleGuestsChange = (guests: Guest[]) => {
    setForm((prev) => ({ ...prev, guests }));
    setHasValidGuests(
      guests.some((g) => g.firstName.trim() && g.lastName.trim()),
    );
  };

  const nextStep = () => {
    // Track analytics before moving to next step
    analytics.event("rsvp_step_complete", {
      event_label: steps[currentStep],
      step_number: currentStep + 1,
      step_name: steps[currentStep],
    });
    setCurrentStep((s) => s + 1);
  };

  const prevStep = () => {
    // Track when user goes back
    analytics.event("rsvp_step_back", {
      event_label: steps[currentStep],
      step_number: currentStep + 1,
      step_name: steps[currentStep],
    });
    setCurrentStep((s) => s - 1);
  };

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