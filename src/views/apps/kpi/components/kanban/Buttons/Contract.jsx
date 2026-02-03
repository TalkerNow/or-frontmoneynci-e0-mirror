import React from "react";
import { withRouter } from "react-router-dom";
import getBadgeColor from "../../../../../../helpers/getBadgeColor";

const ContractButton = ({ doc, history, onDelete }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const serviceLabel = (doc.subscribe_services || "")
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  const services = (doc.subscribe_services || "")
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceColor = getBadgeColor(serviceLabel || "autre");
  const colorMap = {
    "light-primary": "#7367f0",
    "light-success": "#28c76f",
    "light-warning": "#ff9f43",
    "light-danger": "#ea5455",
    "light-info": "#00cfe8",
    "light-secondary": "#82868b",
  };
  const initialsColor = colorMap[serviceColor] || "#7367f0";

  return (
    <a
      href={`/pages/contract/${doc.id}`}
      className={`badge badge-${serviceColor}`}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) {
          return; // Allow browser's default new tab behavior
        }
        e.preventDefault();
        history.push(`/pages/contract/${doc.id}`);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Ouvrir le contrat (Ctrl+clic pour nouvel onglet)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        border: isHovered ? "1px solid #7367f0" : "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "8px 10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        backgroundColor: "#f8fafc",
        textDecoration: "none",
      }}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(doc);
          }}
          title="Supprimer le contrat"
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: "1px solid #ef4444",
            backgroundColor: "#ef4444",
            color: "#fff",
            fontSize: "12px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
          aria-label="Supprimer le contrat"
        >
          ×
        </button>
      )}
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignItems: "center",
        }}
      >
        {(services.length ? services : [serviceLabel || "N/A"])
          .slice(0, 3)
          .map((service, idx) => {
            const colorKey = getBadgeColor(service || "autre");
            const bgColor = colorMap[colorKey] || initialsColor;
            return (
              <div
                key={`${service}-${idx}`}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: bgColor,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {String(service || "N/A").slice(0, 3)}
              </div>
            );
          })}
        {services.length > 3 && (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              fontWeight: 700,
            }}
          >
            +{services.length - 3}
          </div>
        )}
      </div>
      <div style={{ lineHeight: 1.1 }}>
        {/* <div style={{ fontSize: "0.75rem" }}>{serviceLabel || "Service"}</div> */}
        <div className="text-muted" style={{ fontSize: "0.8rem" }}>
          {new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(doc.advanced_payment || 0)}
        </div>
      </div>
    </a>
  );
};

export default withRouter(ContractButton);
