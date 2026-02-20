import { use, useState } from "react";
import type { RSVPFormData, Guest } from "@/types/types";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Icon } from "@/components/Icon";
import { useTranslation } from "react-i18next";
import { useLenis } from "lenis/react";

export type RSVPStep = {
  key: string;
  required: boolean;
  icon: React.ReactNode;
  stepName: string;
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
  const lenis = useLenis(() => {});
  const { t } = useTranslation(["rsvp"]);

  const steps: RSVPStep[] = [
    {
      key: "contactAndAttendance",
      required: true,
      icon: <Icon.Contact />,
      stepName: t("rsvp:steps.contactAndAttendance.stepTitle"),
    },
    {
      key: "guestsOrName",
      required: true,
      icon: <Icon.People />,
      completionIcon: <p>{form.guests.length}</p>,
      stepName: t("rsvp:steps.guestsOrName.stepTitle"),
    },
    {
      key: "musicRequest",
      required: false,
      icon: <Icon.Music.default />,
      completionIcon: <p>{form.musicRequest?.length}</p>,
      stepName: t("rsvp:steps.musicRequest.stepTitle"),
    },
    {
      key: "notes",
      required: false,
      icon: <Icon.LoveLetter />,
      completionIcon: <Icon.Tick />,
      stepName: t("rsvp:steps.notes.stepTitle"),
    },
    {
      key: "review",
      required: true,
      icon: <Icon.Checklist />,
      completionIcon: <Icon.Tick />,
      stepName: t("rsvp:steps.review.stepTitle"),
    },
  ];
  const isAttending = form.attending === "yes";

  if(isAttending==false){
    steps.splice(2,1);
  }

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
    lenis?.scrollTo(0);
  };

  /** Go back a step with analytics */
  const prevStep = () => {
    analytics.event("rsvp_step_back", {
      event_label: currentStepObj.key,
      step_number: currentStep + 1,
      step_name: currentStepObj.key,
    });
    setCurrentStep((s) => s - 1);
    lenis?.scrollTo(0);
  };

  /** Jump to a specific step */
  const goToStep = (step: number) => {
    setCurrentStep(step)
    lenis?.scrollTo(0);
  };

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
