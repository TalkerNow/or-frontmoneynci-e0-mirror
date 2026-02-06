import React from "react";
import { Check } from "react-feather";
// We assume the styles are loaded globally from contract.scss,
// but usually components might import their own CSS.
// Since the project structure seems to rely on global SCSS imports in views,
// we'll rely on global `salesforce-path` classes or ensure we import it if needed.
// However, the user instruction implies we just "Create a new component".

const ContractStatusPath = ({
  status,
  readOnly = false,
  compact = false,
  onStatusChange,
}) => {
  const steps = ["En attente", "En cours", "Terminé"];
  const currentStatus = status;
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <ul className={`salesforce-path ${compact ? "path-compact" : ""}`}>
      {steps.map((step, idx) => {
        let className = "";
        const isFinishedStep = step === "Terminé";

        if (idx < currentIndex) {
          className = "completed";
        } else if (idx === currentIndex) {
          className = "active";
          // SPECIFIC : If active step is "Terminé", add success class
          if (isFinishedStep) {
            className += " bg-success text-white";
          }
        }

        // Add clickable class if not readOnly
        if (!readOnly) {
          className += " cursor-pointer";
        }

        return (
          <li
            key={step}
            className={className}
            onClick={() => {
              if (!readOnly && onStatusChange) {
                onStatusChange(step);
              }
            }}
          >
            {(idx < currentIndex ||
              (isFinishedStep && idx === currentIndex)) && (
              <Check size={compact ? 12 : 14} className="mr-1" />
            )}
            {step}
          </li>
        );
      })}
    </ul>
  );
};

export default ContractStatusPath;
