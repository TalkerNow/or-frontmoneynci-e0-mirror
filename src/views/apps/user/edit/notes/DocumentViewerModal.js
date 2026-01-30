import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalHeader, ModalBody, Button, Input } from "reactstrap";
import { Download, AlertTriangle, Edit2, Save } from "react-feather";
import axios from "axios";
import { toast } from "react-toastify";
import SweetAlert from "react-bootstrap-sweetalert";

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
  const [staticHtmlContent, setStaticHtmlContent] = useState(
    viewingDoc?.htmlContent || "",
  );
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const docId = viewingDoc?.id;
  const docUrl = viewingDoc?.url;
  const docHtmlContent = viewingDoc?.htmlContent;

  useEffect(() => {
    if (viewingDoc) {
      setStaticHtmlContent(docHtmlContent || "");
      setIsEditMode(!!docHtmlContent);
    }
  }, [docId, docUrl, docHtmlContent, viewingDoc]);

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
            htmlContent: doc.documentElement.outerHTML,
          }));
        };

        doc.body.addEventListener("input", updateContent);
        doc.body.addEventListener("blur", updateContent);
      }
    } catch (e) {
      // Check for CORS issues if accessing external URL
    }
  };

  const handleClose = () => {
    if (isEditMode && viewingDoc?.htmlContent) {
      setShowCloseConfirm(true);
    } else {
      setViewingDoc(null);
    }
  };

  const handleCloseWithoutSave = () => {
    setShowCloseConfirm(false);
    setViewingDoc(null);
    setIsEditMode(false);
  };

  const handleCloseWithSave = async () => {
    setShowCloseConfirm(false);
    await handleSaveDoc(viewingDoc);
    setViewingDoc(null);
    setIsEditMode(false);
  };

  const handleEditToggle = async () => {
    // Si déjà en mode édition, on sauvegarde
    if (isEditMode && viewingDoc?.htmlContent) {
      await handleSaveDoc(viewingDoc);
      return;
    }

    // Sinon, on active le mode édition
    if (viewingDoc?.htmlContent) {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
        iframe.contentDocument.body.contentEditable = "true";
        iframe.contentDocument.body.focus();
      }
      setIsEditMode(true);
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
        Config,
      );

      if (response.data && response.data.html) {
        const fetchedHtml = response.data.html;
        setStaticHtmlContent(fetchedHtml);
        setViewingDoc((prev) => ({ ...prev, htmlContent: fetchedHtml }));
        setIsEditMode(true);
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
    <>
      <Modal
        isOpen={!!viewingDoc}
        toggle={handleClose}
        className="modal-dialog-centered modal-xl"
        contentClassName="h-100"
        style={{ maxWidth: "95vw", height: "90vh" }}
      >
        <ModalHeader toggle={handleClose}>
          {viewingDoc?.name || "Document"}
        </ModalHeader>
      <ModalBody className="p-0" style={{ overflow: "hidden", height: "100%" }}>
        <div className="d-flex h-100">
          {/* LEFT PANEL: CHAT / CONTEXT */}
          <div
            className="d-flex flex-column"
            style={{
              flex: "0 0 340px",
              backgroundColor: "#f8f9fa",
              borderRight: "1px solid #dee2e6",
              overflowY: "auto",
            }}
          >
            <div className="p-4">
              <h5 className="mb-3" style={{ color: "#495057", fontWeight: "600" }}>
                Actions
              </h5>

              {/* Boutons de téléchargement */}
              <div className="mb-3">
                <div className="d-flex" style={{ gap: "10px" }}>
                  <Button
                    color="primary"
                    className="flex-fill d-flex align-items-center justify-content-center"
                    onClick={handleDownloadPdf}
                    style={{
                      borderRadius: "8px",
                      padding: "10px 16px",
                      fontWeight: "500",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Download size={16} className="mr-1" /> PDF
                  </Button>
                  {(viewingDoc?.htmlContent || viewingDoc?.url) && (
                    <Button
                      color="info"
                      className="flex-fill d-flex align-items-center justify-content-center"
                      onClick={handleDownloadHtml}
                      style={{
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontWeight: "500",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Download size={16} className="mr-1" /> HTML
                    </Button>
                  )}
                </div>
              </div>

              {/* Bouton Modifier/Enregistrer */}
              {(viewingDoc?.htmlContent || viewingDoc?.url) && (
                <>
                  <Button
                    color={isEditMode ? "success" : "warning"}
                    className="w-100 d-flex align-items-center justify-content-center mb-2"
                    onClick={handleEditToggle}
                    disabled={isLoadingEdit}
                    style={{
                      borderRadius: "8px",
                      padding: "12px 16px",
                      fontWeight: "500",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                    }}
                  >
                    {isLoadingEdit ? (
                      <span className="spinner-border spinner-border-sm mr-2" />
                    ) : isEditMode ? (
                      <Save size={18} className="mr-2" />
                    ) : (
                      <Edit2 size={18} className="mr-2" />
                    )}
                    {isLoadingEdit
                      ? "Chargement..."
                      : isEditMode
                      ? "Enregistrer les modifications"
                      : "Modifier le texte"}
                  </Button>

                  <Button
                    color="danger"
                    outline
                    className="w-100 d-flex align-items-center justify-content-center mb-3"
                    onClick={() => handleReportDoc(viewingDoc)}
                    style={{
                      borderRadius: "8px",
                      padding: "10px 16px",
                      fontWeight: "500",
                    }}
                  >
                    <AlertTriangle size={16} className="mr-1" /> Signaler une erreur
                  </Button>
                </>
              )}

              <hr style={{ borderColor: "#dee2e6", margin: "20px 0" }} />

              {/* Section Assistant */}
              <h5 className="mb-3" style={{ color: "#495057", fontWeight: "600" }}>
                Assistant
              </h5>

              <Input
                type="textarea"
                rows="6"
                placeholder="Ex: Refais le calcul avec un départ à 65 ans..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                style={{
                  resize: "none",
                  marginBottom: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ced4da",
                  padding: "12px",
                  fontSize: "14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
                disabled={isGenerating}
              />
              <Button
                color="primary"
                block
                onClick={handleModalGenerate}
                disabled={isGenerating || !chatMessage.trim()}
                style={{
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontWeight: "500",
                  fontSize: "15px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                }}
              >
                {isGenerating ? "Analyse en cours..." : "Générer un rapport spécifique"}
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

      <SweetAlert
        warning
        showCancel
        confirmBtnText="Enregistrer"
        confirmBtnBsStyle="success"
        cancelBtnText="Ne pas enregistrer"
        cancelBtnBsStyle="danger"
        title="Modifications non enregistrées"
        show={showCloseConfirm}
        onConfirm={handleCloseWithSave}
        onCancel={handleCloseWithoutSave}
        style={{
          '.sa-button-container': {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '20px',
            width: '100%',
            padding: '0 20px'
          }
        }}
      >
        <p className="sweet-alert-text">
          Voulez-vous enregistrer vos modifications avant de fermer ?
        </p>
        <style>{`
          .sweet-alert .sa-button-container,
          .sweet-alert p[style*="display: flex"] {
            display: flex !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            gap: 15px !important;
            width: 100% !important;
            padding: 0 15px !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .sweet-alert .sa-button-container button,
          .sweet-alert p[style*="display: flex"] .btn {
            flex: 0 1 auto !important;
            min-width: 140px !important;
            max-width: 45% !important;
            margin: 0 !important;
            padding: 10px 20px !important;
            font-size: 15px !important;
            white-space: nowrap !important;
          }
        `}</style>
      </SweetAlert>
    </>
  );
};

export default DocumentViewerModal;
