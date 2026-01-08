import React from "react";
import { Modal, ModalHeader, ModalBody, Button, Input } from "reactstrap";
import { Download, AlertTriangle } from "react-feather";

const DocumentViewerModal = ({
    viewingDoc,
    setViewingDoc,
    chatMessage,
    setChatMessage,
    handleDownloadPdf,
    handleReportDoc,
    handleModalGenerate,
    isGenerating,
}) => {
    return (
        <Modal
            isOpen={!!viewingDoc}
            toggle={() => setViewingDoc(null)}
            className="modal-dialog-centered modal-xl"
            contentClassName="h-100"
            style={{ maxWidth: "95vw", height: "90vh" }}
        >
            <ModalHeader toggle={() => setViewingDoc(null)}>
                {viewingDoc?.name || "Document"}
            </ModalHeader>
            <ModalBody
                className="p-0"
                style={{ overflow: "hidden", height: "100%" }}
            >
                <div className="d-flex h-100">
                    {/* LEFT PANEL: CHAT / CONTEXT */}
                    <div
                        className="d-flex flex-column p-3 border-right"
                        style={{
                            flex: "0 0 320px",
                            backgroundColor: "#f9f9f9",
                            overflowY: "auto",
                        }}
                    >
                        <h5 className="mb-2 text-primary">Assistant</h5>
                        <p className="font-small-3 text-muted mb-2">
                            Vous pouvez envoyer une instruction spécifique pour générer un
                            nouveau rapport basé sur ce dossier. Le nouveau rapport
                            remplacera celui-ci.
                        </p>
                        <Button
                            color="primary"
                            outline
                            className="mb-3 d-flex align-items-center justify-content-center"
                            onClick={handleDownloadPdf}
                        >
                            <Download size={16} className="mr-1" /> Télécharger en PDF
                        </Button>

                        <Button
                            color="danger"
                            outline
                            className="mb-3 d-flex align-items-center justify-content-center"
                            onClick={() => handleReportDoc(viewingDoc)}
                        >
                            <AlertTriangle size={16} className="mr-1" /> Signaler une erreur
                        </Button>

                        <div style={{ flex: 1 }}></div>

                        <div className="mt-3">
                            <label className="font-small-3 font-weight-bold">
                                Votre instruction
                            </label>
                            <Input
                                type="textarea"
                                rows="6"
                                placeholder="Ex: Refais le calcul avec un départ à 65 ans..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                style={{ resize: "none", marginBottom: "10px" }}
                                disabled={isGenerating}
                            />
                            <Button
                                color="primary"
                                block
                                onClick={handleModalGenerate}
                                disabled={isGenerating || !chatMessage.trim()}
                            >
                                {isGenerating
                                    ? "Analyse en cours..."
                                    : "Générer un rapport spécifique"}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: PREVIEW */}
                    <div className="flex-grow-1 bg-white position-relative">
                        {viewingDoc?.htmlContent ? (
                            <iframe
                                id="preview-iframe"
                                srcDoc={viewingDoc.htmlContent}
                                title="Document Preview"
                                style={{ width: "100%", height: "100%", border: "none" }}
                            />
                        ) : viewingDoc?.url ? (
                            <iframe
                                id="preview-iframe"
                                src={viewingDoc.url}
                                title="Document Preview"
                                style={{ width: "100%", height: "100%", border: "none" }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                Aucun aperçu disponible
                            </div>
                        )}
                        {isGenerating && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                                    zIndex: 10,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backdropFilter: "blur(1px)",
                                }}
                            >
                                <div
                                    className="spinner-border text-primary"
                                    style={{ width: "2.5rem", height: "2.5rem" }}
                                    role="status"
                                >
                                    <span className="sr-only">Chargement...</span>
                                </div>
                                <p className="mt-2 text-primary font-weight-bold">
                                    Nouvelle analyse en cours...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </ModalBody>
        </Modal>
    );
};

export default DocumentViewerModal;
