import React, { useState } from "react";
import ReportErrorModal from "./ReportErrorModal.jsx";

export default function ReportErrorButton({ section, clientId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          border: "1px solid #D63031",
          borderRadius: 6,
          background: "transparent",
          color: "#D63031",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ⚠ Signaler une erreur
      </button>
      <ReportErrorModal
        isOpen={open}
        toggle={() => setOpen(false)}
        defaultSection={section}
        clientId={clientId}
      />
    </>
  );
}
