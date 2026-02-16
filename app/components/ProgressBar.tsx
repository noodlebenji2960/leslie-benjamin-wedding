// src/components/rsvp/ProgressBar.tsx
import React from "react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  // Generate step dots
  const stepsArray = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div
          className="progress-bar__fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
