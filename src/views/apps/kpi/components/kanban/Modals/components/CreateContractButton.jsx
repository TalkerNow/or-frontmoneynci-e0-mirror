import React from "react";
import { Plus } from "react-feather";

const CreateContractButton = ({ onClick, disabled }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onClick) onClick();
        }
      }}
      title="Créer un contrat"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        border: isHovered ? "1px solid #7367f0" : "1px dashed #7367f0",
        borderRadius: "8px",
        padding: "8px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        backgroundColor: isHovered && !disabled ? "#7367f0" : "#f8fafc",
        minWidth: "72px",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Plus size={16} color={isHovered && !disabled ? "#ffffff" : "#7367f0"} />
    </div>
  );
};

export default CreateContractButton;
