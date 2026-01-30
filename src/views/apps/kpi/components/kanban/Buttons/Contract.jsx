import React from "react";
import { withRouter } from "react-router-dom";
import getBadgeColor from "../../../../../../helpers/getBadgeColor";

const ContractButton = ({ doc, history }) => {
  const serviceLabel = (doc.subscribe_services || "")
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  const serviceColor = getBadgeColor(serviceLabel || "autre");

  return (
    <div
      className={`badge badge-${serviceColor}`}
      role="button"
      tabIndex={0}
      onClick={() => history.push(`/pages/contract/${doc.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          history.push(`/pages/contract/${doc.id}`);
        }
      }}
      title="Ouvrir le contrat"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        border: "1px solid rgba(0,0,0,0.05)",
        borderRadius: "8px",
        padding: "8px 10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#7367f0";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.05)";
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          backgroundColor: "rgba(255,255,255,0.6)",
          color: "#1f1f1f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {(serviceLabel || "N/A").slice(0, 3)}
      </div>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: "0.75rem" }}>{serviceLabel || "Service"}</div>
        <div className="text-muted" style={{ fontSize: "0.8rem" }}>
          {new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(doc.advanced_payment || 0)}
        </div>
      </div>
    </div>
  );
};

export default withRouter(ContractButton);
