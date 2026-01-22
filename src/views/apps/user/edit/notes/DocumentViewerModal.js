import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalHeader, ModalBody, Button, Input } from "reactstrap";
import { Download, AlertTriangle, FileText, Edit2, Save } from "react-feather";
import axios from "axios";
import { toast } from "react-toastify";

const DocumentViewerModal = ({
    viewingDoc,
    setViewingDoc,
    chatMessage,
    setChatMessage,
    handleDownloadPdf,
    handleReportDoc,
    handleDownloadHtml,
    handleModalGenerate,
    isGenerating,
    handleSaveDoc,
}) => {
    const iframeRef = useRef(null);
    const [staticHtmlContent, setStaticHtmlContent] = useState(viewingDoc?.htmlContent || "");
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);

    useEffect(() => {
        if (viewingDoc) {
            setStaticHtmlContent(viewingDoc.htmlContent || "");
        }
    }, [viewingDoc?.id, viewingDoc?.url]); // Update only when document ID/URL changes

    const handleIframeLoad = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument;
            if (doc && doc.body) {
                doc.body.contentEditable = "true";
                doc.body.style.cursor = "text";

                const updateContent = () => {
                    setViewingDoc((prev) => ({
                        ...prev,
                        htmlContent: doc.documentElement.outerHTML
                    }));
                };

                doc.body.addEventListener("input", updateContent);
                doc.body.addEventListener("blur", updateContent);
            }
        } catch (e) {
            // Check for CORS issues if accessing external URL
        }
    };

    const handleEnableEdit = async () => {
        if (viewingDoc?.htmlContent) {
            toast.info("Le document est déjà modifiable.");
            const iframe = iframeRef.current;
            if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
                iframe.contentDocument.body.contentEditable = "true";
                iframe.contentDocument.body.focus();
            }
            return;
        }

        if (!viewingDoc?.url) {
            toast.error("Aucune source disponible pour l'édition.");
            return;
        }

        setIsLoadingEdit(true);
        try {
            const Config = {
                headers: { Authorization: "Bearer " + localStorage.getItem("token") },
            };
            const response = await axios.post(
                `${global.config.server_url}/fetch-html`,
                { url: viewingDoc.url },
                Config
            );

            if (response.data && response.data.html) {
                const fetchedHtml = response.data.html;
                setStaticHtmlContent(fetchedHtml);
                setViewingDoc((prev) => ({ ...prev, htmlContent: fetchedHtml }));
                toast.success("Mode édition activé");
            } else {
                toast.error("Impossible de récupérer le contenu modifiable.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'activation du mode édition.");
        } finally {
            setIsLoadingEdit(false);
        }
    };

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

                        {(viewingDoc?.htmlContent || viewingDoc?.url) && (
                            <>
                                <Button
                                    color="info"
                                    outline
                                    className="mb-3 d-flex align-items-center justify-content-center"
                                    onClick={handleEnableEdit}
                                    disabled={isLoadingEdit}
                                >
                                    {isLoadingEdit ? (
                                        <span className="spinner-border spinner-border-sm mr-1" />
                                    ) : (
                                        <Edit2 size={16} className="mr-1" />
                                    )}
                                    Modifier le texte
                                </Button>

                                <Button
                                    color="success"
                                    outline
                                    className="mb-3 d-flex align-items-center justify-content-center"
                                    onClick={() => handleSaveDoc(viewingDoc)}
                                    disabled={!viewingDoc?.htmlContent}
                                >
                                    <Save size={16} className="mr-1" /> Enregistrer
                                </Button>

                                <Button
                                    color="secondary"
                                    outline
                                    className="mb-3 d-flex align-items-center justify-content-center"
                                    onClick={handleDownloadHtml}
                                >
                                    <FileText size={16} className="mr-1" /> Télécharger en HTML
                                </Button>
                            </>
                        )}

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
                                ref={iframeRef}
                                id="preview-iframe"
                                srcDoc={staticHtmlContent}
                                onLoad={handleIframeLoad}
                                title="Document Preview"
                                style={{ width: "100%", height: "100%", border: "none" }}
                            />
                        ) : viewingDoc?.url ? (
                            <iframe
                                ref={iframeRef}
                                id="preview-iframe"
                                src={viewingDoc.url}
                                onLoad={handleIframeLoad}
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
