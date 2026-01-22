import React, { useEffect } from "react";
import { X, FileText, Download, Loader } from "lucide-react";

/**
 * Modern, professional modal for displaying HTML reports.
 * Features:
 * - Backdrop blur
 * - Smooth enter animation (fade + scale)
 * - Iframe sandbox for isolated content rendering
 * - Header with actions (Close)
 */
const VisualReportModal = ({
  isOpen,
  onClose,
  htmlContent,
  fileName = "rapport.html",
  isLoading = false,
  prospectName = "",
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Backdrop with blur and fade */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          transition: "opacity 0.3s ease",
          animation: "fadeIn 0.3s ease-out forwards",
        }}
      />

      {/* Modal Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1000px",
          height: "90vh",
          backgroundColor: "#fff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fff",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#002060",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Rapport visuel diagnostic retraite de {prospectName}
              </h3>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                {isLoading
                  ? "Chargement des données..."
                  : "Aperçu du document généré"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleDownload}
              title="Télécharger HTML"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.color = "#0f172a";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = "#475569";
              }}
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "#f1f5f9",
                color: "#64748b",
                cursor: "pointer",
                marginLeft: "8px",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#e2e8f0";
                e.currentTarget.style.color = "#0f172a";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.color = "#64748b";
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body - Iframe */}
        <div
          style={{ flex: 1, position: "relative", backgroundColor: "#f8fafc" }}
        >
          {isLoading ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
              }}
            >
              <Loader
                className="animate-spin"
                size={32}
                color="#002060"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <span
                style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}
              >
                Récupération des données...
              </span>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <iframe
              title="Rapport Visuel"
              srcDoc={htmlContent}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          )}
        </div>
      </div>

      {/* Animations styles */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalSlideUp {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default VisualReportModal;
