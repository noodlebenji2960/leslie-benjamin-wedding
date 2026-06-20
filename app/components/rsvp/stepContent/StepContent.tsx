// StepContent.tsx
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Guest, RSVPFormData } from "@/types/types";
import type { RSVPStep } from "@/hooks/rsvp/useRSVPForm";
import { StepContactAttendance } from "@/components/rsvp/stepContent/StepContactAttendance";
import { StepGuestsOrName } from "@/components/rsvp/stepContent/StepGuestsOrName";
import { StepMusic } from "@/components/rsvp/stepContent/StepMusic";
import { StepMessage } from "@/components/rsvp/stepContent/StepMessage";
import { StepReview } from "@/components/rsvp/stepContent/StepReview";

const isDev = import.meta.env.DEV;

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a, [tabindex]:not([tabindex="-1"])';

interface StepWrapperProps {
  stepKey: string;
  children: React.ReactNode;
}

const StepWrapper = ({ stepKey, children }: StepWrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      key={stepKey}
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="form-content"
      tabIndex={-1}
      ref={ref}
      onAnimationComplete={(def) => {
        if (def === "animate" && ref.current) {
          setTimeout(()=>ref.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus(), 50);
        }
      }}
    >
      {children}
    </motion.div>
  );
};

interface StepContentProps {
  currentStep: number;
  currentStepObj: RSVPStep;
  form: RSVPFormData;
  isClient: boolean;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    isSubmit?: boolean,
  ) => void;
  onGuestsChange: (guests: Guest[]) => void;
  captchaToken: string | null;
  error: string | null;
  recaptchaRef: React.RefObject<any>;
  setCaptchaToken: (token: string | null) => void;
}

export const StepContent = (props: StepContentProps) => {
  const { currentStep, form, isClient, currentStepObj } = props;

  return (
    <AnimatePresence mode="wait">
      {currentStep === 0 && (
        <StepWrapper stepKey="step0">
          <StepContactAttendance {...props} />
        </StepWrapper>
      )}

      {currentStepObj.key === "guestsOrName" && (
        <StepWrapper stepKey="guestsOrName">
          <StepGuestsOrName
            attending={form.attending}
            guests={form.guests}
            nonAttendingName={form.nonAttendingName ?? ""}
            onChange={props.onChange}
            onGuestsChange={props.onGuestsChange}
          />
        </StepWrapper>
      )}

      {currentStepObj.key === "musicRequest" && form.attending === "yes" && (
        <StepWrapper stepKey="musicRequest">
          <StepMusic
            musicRequest={form.musicRequest || []}
            onChange={props.onChange}
          />
        </StepWrapper>
      )}

      {currentStepObj.key === "notes" && (
        <StepWrapper stepKey="notes">
          <StepMessage
            attending={form.attending}
            notes={form.notes}
            onChange={props.onChange}
          />
        </StepWrapper>
      )}

      {currentStepObj.key === "review" && isClient && (
        <StepWrapper stepKey="review">
          <StepReview
            form={form}
            onChange={props.onChange}
            captchaToken={props.captchaToken}
            error={props.error}
            recaptchaRef={props.recaptchaRef}
            setCaptchaToken={props.setCaptchaToken}
            isDev={isDev}
          />
        </StepWrapper>
      )}
    </AnimatePresence>
  );
};
