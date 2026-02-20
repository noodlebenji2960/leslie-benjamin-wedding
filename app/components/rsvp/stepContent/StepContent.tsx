// StepContent.tsx
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

export const StepContent = (props: StepContentProps) => {
  const { currentStep, form, isClient, currentStepObj } = props;

  return (
    <>
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div
            key="step0"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="form-content"
            tabIndex={-1}
          >
            <StepContactAttendance {...props} />
          </motion.div>
        )}

        {currentStepObj.key === "guestsOrName" && (
          <motion.div
            key="guestsOrName"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="form-content"
            tabIndex={-1}
          >
            <StepGuestsOrName
              attending={form.attending}
              guests={form.guests}
              nonAttendingName={form.nonAttendingName ?? ""}
              onChange={props.onChange}
              onGuestsChange={props.onGuestsChange}
            />
          </motion.div>
        )}

        {currentStepObj.key === "musicRequest" && form.attending === "yes" && (
          <motion.div
            key="musicRequest"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="form-content"
            tabIndex={-1}
          >
            <StepMusic
              musicRequest={form.musicRequest || []}
              onChange={props.onChange}
            />
          </motion.div>
        )}

        {currentStepObj.key === "notes" && (
          <motion.div
            key="notes"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="form-content"
            tabIndex={-1}
          >
            <StepMessage
              attending={form.attending}
              notes={form.notes}
              onChange={props.onChange}
            />
          </motion.div>
        )}

        {currentStepObj.key === "review" && isClient && (
          <motion.div
            key="review"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="form-content"
            tabIndex={-1}
          >
            <StepReview
              form={form}
              onChange={props.onChange}
              captchaToken={props.captchaToken}
              error={props.error}
              recaptchaRef={props.recaptchaRef}
              setCaptchaToken={props.setCaptchaToken}
              isDev={isDev}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
