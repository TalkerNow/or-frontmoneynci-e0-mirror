import React from "react";
import { Card, CardBody, Button } from "reactstrap";
import UploadCard from "../components/UploadCard";

const UploadSection = ({
  fileToSend,
  clearFileToSend,
  isUploading,
  onUpload, // handleUpload
  isGenerating,
  onCancelGeneration,
}) => {
  return (
    <Card className="notes-card notes-card--compact notes-card--upload">
      <CardBody className="notes-upload-body" style={{ position: "relative" }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h5 className="notes-card-title mb-0">
            RIS relevé de carrière du client
          </h5>
        </div>
        <UploadCard
          title={null}
          description="Glissez et déposez des fichiers ici, ou cliquez pour sélectionner des fichiers à télécharger."
          onDrop={onUpload}
          isUploading={isUploading}
        />

        {/* --- VISUAL FEEDBACK POUR L'UPLOAD --- */}
        {fileToSend && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#166534",
                fontWeight: "bold",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span role="img" aria-label="check">
                ✅
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Fichier chargé : {fileToSend.name}
              </span>
              <button
                type="button"
                onClick={clearFileToSend}
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: "4px",
                  color: "#dc2626",
                  cursor: "pointer",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  marginLeft: "4px",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#fecaca";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#fee2e2";
                }}
                title="Retirer le fichier"
              >
                ✕
              </button>
            </div>
            <div
              style={{
                color: "#15803d",
                fontSize: "0.75rem",
                marginTop: "2px",
              }}
            >
              Prêt pour l'analyse
            </div>
          </div>
        )}
        {/* ------------------------------------- */}

        {/* Content moved to AnalysisSection */}

        {isGenerating && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
              borderRadius: "inherit",
            }}
          >
            <div
              className="spinner-border text-primary"
              style={{ width: "3rem", height: "3rem" }}
              role="status"
            >
              <span className="sr-only">Chargement...</span>
            </div>
            <h4 className="mt-2 text-primary font-weight-bold">
              Analyse en cours...
            </h4>
            <p className="text-dark font-weight-bold">
              Merci de ne pas fermer cette page.
            </p>
            <button
              type="button"
              onClick={onCancelGeneration}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "50%",
                color: "#dc2626",
                cursor: "pointer",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                zIndex: 11,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#fecaca";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.transform = "scale(1)";
              }}
              title="Interrompre l'analyse"
            >
              ✕
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default UploadSection;
