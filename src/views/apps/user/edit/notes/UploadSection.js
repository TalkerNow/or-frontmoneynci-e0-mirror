import React from "react";
import { Card, CardBody, Button, Input } from "reactstrap";
import Select from "react-select";
import UploadCard from "../components/UploadCard";
import { QUICK_TAGS_OPTIONS } from "./utils";

const UploadSection = ({
    fileToSend,
    isUploading,
    onUpload, // handleUpload
    selectedTags,
    handleTagsChange,
    n8nMessage,
    setN8nMessage,
    reportType,
    handleGenerateDoc,
    isGenerating,
}) => {
    return (
        <Card className="notes-card notes-card--compact notes-card--upload">
            <CardBody
                className="notes-upload-body"
                style={{ position: "relative" }}
            >
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
                            }}
                        >
                            <span
                                role="img"
                                aria-label="check"
                                style={{ marginRight: "6px" }}
                            >
                                ✅
                            </span>
                            Fichier chargé : {fileToSend.name}
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

                {/* Quick Tags pour le prompt IA - Multi-select dropdown */}
                <div style={{ marginTop: "1rem", marginBottom: "0.75rem" }}>
                    <label
                        htmlFor="quickTagsSelect"
                        style={{
                            display: "block",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: "0.5rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                        }}
                    >
                        Thématiques d'analyse
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
                                minHeight: "42px",
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
                                "&:hover": {
                                    borderColor: "#7367f0",
                                },
                            }),
                            valueContainer: (base) => ({
                                ...base,
                                padding: "4px 8px",
                                gap: "4px",
                                flexWrap: "wrap",
                            }),
                            placeholder: (base) => ({
                                ...base,
                                color: "#a0aec0",
                                fontSize: "0.875rem",
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
                            menuList: (base) => ({
                                ...base,
                                padding: "4px",
                            }),
                            multiValue: (base) => ({
                                ...base,
                                backgroundColor: "#f0f0ff",
                                borderRadius: "6px",
                                border: "1px solid #e0e0ff",
                                margin: "2px",
                                maxWidth: "calc(50% - 4px)",
                            }),
                            multiValueLabel: (base) => ({
                                ...base,
                                color: "#5a52cc",
                                fontSize: "0.85rem",
                                fontWeight: 500,
                                padding: "4px 6px 4px 8px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }),
                            multiValueRemove: (base) => ({
                                ...base,
                                color: "#7367f0",
                                paddingLeft: "4px",
                                paddingRight: "6px",
                                borderRadius: "0 6px 6px 0",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                "&:hover": {
                                    backgroundColor: "#7367f0",
                                    color: "#fff",
                                },
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
                                "&:active": {
                                    backgroundColor: "#7367f0",
                                    color: "#fff",
                                },
                            }),
                            dropdownIndicator: (base) => ({
                                ...base,
                                color: "#94a3b8",
                                padding: "6px 10px",
                                "&:hover": {
                                    color: "#7367f0",
                                },
                            }),
                            clearIndicator: (base) => ({
                                ...base,
                                color: "#94a3b8",
                                padding: "6px",
                                "&:hover": {
                                    color: "#ef4444",
                                },
                            }),
                            indicatorSeparator: () => ({
                                display: "none",
                            }),
                        }}
                    />
                </div>

                <div className="mt-2 mb-1">
                    <label className="mb-0 font-small-3" htmlFor="n8nMessage">
                        Message d'accompagnement (optionnel)
                    </label>
                    <Input
                        type="textarea"
                        id="n8nMessage"
                        rows="3"
                        placeholder="Ajouter une instruction ou un commentaire pour l'analyse..."
                        value={n8nMessage}
                        onChange={(e) => setN8nMessage(e.target.value)}
                        style={{ resize: "none" }}
                        disabled={isGenerating}
                    />
                </div>

                <div className="notes-upload-actions notes-action-row">
                    <Button
                        className={`notes-report-btn notes-action-btn ${reportType === "pre" ? "is-active" : ""
                            }`}
                        color="link"
                        onClick={() => handleGenerateDoc("pre")}
                        disabled={isGenerating && reportType === "pre"}
                    >
                        Rapport consultation
                    </Button>
                    {/* <Button
                        className={`notes-report-btn notes-action-btn ${reportType === "consult" ? "is-active" : ""
                            }`}
                        color="link"
                        onClick={() => handleGenerateDoc("consult")}
                        disabled={isGenerating}
                    >
                        Rapport consultation
                    </Button> */}
                </div>

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
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default UploadSection;
