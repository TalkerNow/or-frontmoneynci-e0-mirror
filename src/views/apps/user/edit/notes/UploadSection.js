import React, { useState, useRef, useEffect } from "react";
import { Card, CardBody, Button, Input } from "reactstrap";
import { Folder, FileText, ChevronDown, X } from "react-feather";
import Select from "react-select";
import { QUICK_TAGS_OPTIONS } from "./utils";
import UploadCard from "../components/UploadCard";

const FOLDERS = [
  { id: 1, name: "Contrat / Procuration", color: "#007bff" },
  { id: 2, name: "Documents familiaux", color: "#28a745" },
  { id: 3, name: "Documents carrières", color: "#17a2b8" },
  { id: 4, name: "Échanges avec les organismes", color: "#ffc107" },
  { id: 5, name: "Notifications retraite", color: "#dc3545" },
  { id: 6, name: "Autre", color: "#6f42c1" },
];

const UploadSection = ({
  fileToSend,
  clearFileToSend,
  isUploading,
  onUpload, // handleUpload
  isGenerating,
  onCancelGeneration,
  userDocuments,
  isLoadingDocs,
  onFetchDocuments,
  onSelectDocument,
  // Analysis props
  selectedTags,
  handleTagsChange,
  n8nMessage,
  setN8nMessage,
  reportType,
  handleGenerateDoc,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const pickerRef = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
        setSelectedFolder(null);
      }
    };
    if (pickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const handleTogglePicker = () => {
    if (!pickerOpen) {
      onFetchDocuments();
      setSelectedFolder(null);
    }
    setPickerOpen(!pickerOpen);
  };

  const handleSelectFile = (file) => {
    onSelectDocument(file);
    setPickerOpen(false);
    setSelectedFolder(null);
  };

  const filesInFolder = (folderId) => {
    if (folderId === 0) {
      return userDocuments.filter((f) => !f.dossier || f.dossier === 0);
    }
    return userDocuments.filter((f) => f.dossier === folderId);
  };

  return (
    <Card className="notes-card notes-card--compact notes-card--upload">
      <CardBody className="notes-upload-body" style={{ position: "relative" }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h5 className="notes-card-title mb-0">
            RIS relev&eacute; de carri&egrave;re du client
          </h5>
        </div>

        {/* Upload zone + Document picker side by side */}
        <div className="upload-section-row">
          <div className="upload-section-dropzone">
            <UploadCard
              title={null}
              description="Glissez et déposez des fichiers ici, ou cliquez pour sélectionner des fichiers."
              onDrop={onUpload}
              isUploading={isUploading}
            />
          </div>

          {/* Inline document picker */}
          <div className="upload-section-picker" ref={pickerRef}>
            <button
              type="button"
              className="doc-picker-btn"
              onClick={handleTogglePicker}
              disabled={isGenerating}
            >
              <Folder size={16} />
              <span>Mes documents</span>
              <ChevronDown
                size={14}
                style={{
                  transform: pickerOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>

            {pickerOpen && (
              <div className="doc-picker-dropdown">
                <div className="doc-picker-header">
                  {selectedFolder !== null ? (
                    <button
                      type="button"
                      className="doc-picker-back"
                      onClick={() => setSelectedFolder(null)}
                    >
                      &larr;{" "}
                      {selectedFolder === 0
                        ? "Non classés"
                        : FOLDERS.find((f) => f.id === selectedFolder)?.name}
                    </button>
                  ) : (
                    <span className="doc-picker-title">
                      S&eacute;lectionner un document
                    </span>
                  )}
                  <button
                    type="button"
                    className="doc-picker-close"
                    onClick={() => {
                      setPickerOpen(false);
                      setSelectedFolder(null);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {isLoadingDocs ? (
                  <div className="doc-picker-loading">
                    <div
                      className="spinner-border spinner-border-sm text-primary"
                      role="status"
                    />
                    <span>Chargement...</span>
                  </div>
                ) : selectedFolder === null ? (
                  /* Folder list */
                  <div className="doc-picker-folders">
                    {FOLDERS.map((folder) => {
                      const count = filesInFolder(folder.id).length;
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          className="doc-picker-folder-item"
                          onClick={() => setSelectedFolder(folder.id)}
                        >
                          <Folder
                            size={15}
                            style={{ color: folder.color }}
                          />
                          <span className="doc-picker-folder-name">
                            {folder.name}
                          </span>
                          <span className="doc-picker-folder-count">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {/* Non classés */}
                    {filesInFolder(0).length > 0 && (
                      <button
                        type="button"
                        className="doc-picker-folder-item"
                        onClick={() => setSelectedFolder(0)}
                      >
                        <Folder size={15} style={{ color: "#9ca3af" }} />
                        <span className="doc-picker-folder-name">
                          Non class&eacute;s
                        </span>
                        <span className="doc-picker-folder-count">
                          {filesInFolder(0).length}
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* File list inside selected folder */
                  <div className="doc-picker-files">
                    {filesInFolder(selectedFolder).length === 0 ? (
                      <div className="doc-picker-empty">
                        Aucun document dans ce dossier
                      </div>
                    ) : (
                      filesInFolder(selectedFolder).map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          className="doc-picker-file-item"
                          onClick={() => handleSelectFile(file)}
                          title={file.filename}
                        >
                          <FileText size={14} />
                          <span className="doc-picker-file-name">
                            {file.filename}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
                Fichier charg&eacute; : {fileToSend.name}
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
              Pr&ecirc;t pour l'analyse
            </div>
          </div>
        )}
        {/* ------------------------------------- */}

        {/* --- ANALYSIS SECTION --- */}
        <div className="upload-analysis-divider" />

        <div className="mb-75">
          <label
            htmlFor="quickTagsSelect"
            style={{
              display: "block",
              fontSize: window.innerWidth < 576 ? "0.7rem" : "0.8rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: "0.4rem",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Th&eacute;matiques d'analyse
          </label>
          <Select
            id="quickTagsSelect"
            className="React"
            classNamePrefix="select"
            isMulti
            options={QUICK_TAGS_OPTIONS}
            value={selectedTags}
            onChange={handleTagsChange}
            placeholder="Cliquez pour sélectionner..."
            noOptionsMessage={() => "Toutes les thématiques sont sélectionnées"}
            isDisabled={isGenerating}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: window.innerWidth < 576 ? "34px" : "38px",
                borderRadius: "8px",
                border: state.isFocused
                  ? "2px solid #7367f0"
                  : "1px solid #e2e8f0",
                boxShadow: state.isFocused
                  ? "0 0 0 3px rgba(115, 103, 240, 0.1)"
                  : "none",
                backgroundColor: "#fff",
                transition: "all 0.2s ease",
                flexWrap: "wrap",
                "&:hover": { borderColor: "#7367f0" },
              }),
              valueContainer: (base) => ({
                ...base,
                padding: window.innerWidth < 576 ? "2px 4px" : "4px 8px",
                gap: "4px",
                flexWrap: "wrap",
              }),
              placeholder: (base) => ({
                ...base,
                color: "#a0aec0",
                fontSize: window.innerWidth < 576 ? "0.8rem" : "0.875rem",
              }),
              menu: (base) => ({
                ...base,
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                marginTop: "4px",
                zIndex: 9999,
              }),
              menuList: (base) => ({ ...base, padding: "4px" }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: "#f3f0ff",
                borderRadius: "20px",
                border: "1px solid #e0d7ff",
                margin: "2px",
                maxWidth: "100%",
                display: "flex",
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: "#7367f0",
                fontSize: window.innerWidth < 576 ? "0.7rem" : "0.85rem",
                fontWeight: 600,
                padding: "2px 8px",
                whiteSpace: "nowrap",
                maxWidth: "150px",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }),
              multiValueRemove: (base) => ({
                ...base,
                color: "#7367f0",
                paddingLeft: "4px",
                paddingRight: "6px",
                borderRadius: "0 6px 6px 0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { backgroundColor: "#7367f0", color: "#fff" },
              }),
              option: (base, state) => ({
                ...base,
                borderRadius: "4px",
                margin: "2px 0",
                padding: "8px 10px",
                fontSize: "0.875rem",
                fontWeight: state.isSelected ? 500 : 400,
                backgroundColor: state.isSelected
                  ? "#7367f0"
                  : state.isFocused
                    ? "#f5f5ff"
                    : "transparent",
                color: state.isSelected ? "#fff" : "#374151",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:active": { backgroundColor: "#7367f0", color: "#fff" },
              }),
              dropdownIndicator: (base) => ({
                ...base,
                color: "#94a3b8",
                padding: "6px 10px",
                "&:hover": { color: "#7367f0" },
              }),
              clearIndicator: (base) => ({
                ...base,
                color: "#94a3b8",
                padding: "6px",
                "&:hover": { color: "#ef4444" },
              }),
              indicatorSeparator: () => ({ display: "none" }),
            }}
          />
        </div>

        <div className="mb-75">
          <label
            className="mb-0 font-small-3"
            htmlFor="n8nMessage"
            style={{ fontWeight: 600, color: "#64748b" }}
          >
            Message d'accompagnement (optionnel)
          </label>
          <Input
            type="textarea"
            id="n8nMessage"
            rows="8"
            placeholder="Ajouter une instruction ou un commentaire pour l'analyse..."
            value={n8nMessage}
            onChange={(e) => setN8nMessage(e.target.value)}
            style={{
              minHeight: window.innerWidth < 576 ? "120px" : "200px",
              fontSize: window.innerWidth < 576 ? "0.85rem" : "1rem",
              backgroundColor: isGenerating ? "#fff" : undefined,
              color: isGenerating ? "#334155" : undefined,
              opacity: isGenerating ? 0.9 : 1,
            }}
            disabled={isGenerating}
          />
        </div>

        <div className="notes-action-row mt-1">
          <Button
            className={`notes-report-btn notes-action-btn ${
              reportType === "pre" ? "is-active" : ""
            }`}
            color="link"
            onClick={() => handleGenerateDoc("pre")}
            disabled={isGenerating && reportType === "pre"}
          >
            Rapport consultation
          </Button>
        </div>
        {/* --- END ANALYSIS SECTION --- */}

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
