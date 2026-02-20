import React from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";

export interface ProgressStep {
  component?: React.ReactNode;
  icon?: React.ReactNode;
  stepName?: string;
  key?: string;
  [key: string]: unknown;
}

type StepsInput = number | React.ReactNode[] | ProgressStep[];

interface ProgressBarProps {
  currentStep: number;
  steps: StepsInput;
  goToStep: (step: number) => void;
  stepDataMap?: Record<string, boolean>;
}

function isProgressStep(step: unknown): step is ProgressStep {
  return (
    step !== null &&
    typeof step === "object" &&
    !Array.isArray(step) &&
    !("$$typeof" in (step as object)) &&
    ("component" in (step as object) ||
      "icon" in (step as object) ||
      "key" in (step as object))
  );
}

function normalizeSteps(
  steps: StepsInput,
): { node: React.ReactNode; meta: ProgressStep | null }[] {
  if (typeof steps === "number") {
    return Array.from({ length: steps }, () => ({ node: null, meta: null }));
  }

  return (steps as Array<unknown>).map((step) => {
    if (isProgressStep(step)) {
      return { node: step.component ?? step.icon ?? null, meta: step };
    }
    return { node: step as React.ReactNode, meta: null };
  });
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  steps,
  goToStep,
  stepDataMap,
}) => {
  const stepsArray = normalizeSteps(steps);

  const total = stepsArray.length;
  const clampedStep = Math.max(0, Math.min(currentStep, total - 1));
  const progressPercent = total > 1 ? (clampedStep / (total - 1)) * 100 : 100;

  return (
    <div
      className="progress-bar-container"
      role="progressbar"
      aria-valuenow={clampedStep}
      aria-valuemin={0}
      aria-valuemax={total - 1}
      aria-label={
        stepsArray[clampedStep]?.meta?.stepName
          ? `Step ${clampedStep + 1}: ${stepsArray[clampedStep].meta!.stepName}`
          : stepsArray[clampedStep]?.meta?.key
            ? `Step ${clampedStep + 1}: ${stepsArray[clampedStep].meta!.key}`
            : `Step ${clampedStep + 1} of ${total}`
      }
    >
      <div className="progress-bar">
        <motion.div
          className="progress-bar__fill"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />

        <div className="progress-bar__steps">
          {stepsArray.map(({ node, meta }, index) => {
            const isCompleted = index < clampedStep;
            const isActive = index === clampedStep;
            const hasData = meta?.key
              ? (stepDataMap?.[meta.key] ?? false)
              : false;

            return (
              <motion.div
                key={index}
                className="progress-step"
                title={meta?.stepName ?? (meta?.key as string | undefined)}
                onClick={() => {
                  if (isCompleted) {
                    goToStep(index);
                  }
                }}
                style={{
                  position: "absolute",
                  left: `${total > 1 ? (index / (total - 1)) * 100 : 50}%`,
                  cursor: isCompleted ? "pointer" : "default",
                }}
                transformTemplate={({ scale }) =>
                  `translate(-50%, -50%) scale(${scale ?? 1})`
                }
                animate={{
                  backgroundColor: isCompleted
                    ? "var(--color-primary)"
                    : "var(--color-white)",
                  color: isCompleted
                    ? "var(--color-white)"
                    : "var(--color-border)",
                  borderColor:
                    isActive || isCompleted
                      ? "var(--color-primary)"
                      : "var(--color-border)",
                  borderStyle: "solid",
                }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {node}

                <div
                  className={`progress-step-status-icon ${isCompleted ? "" : "hidden"}`}
                >
                  {meta.completionIcon && hasData ? (
                    meta.completionIcon
                  ) : hasData ? (
                    <Icon.Tick />
                  ) : (
                    <Icon.Close />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
