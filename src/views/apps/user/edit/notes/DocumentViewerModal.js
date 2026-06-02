import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalHeader, ModalBody, Button, Input, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import { Download, AlertTriangle, Edit2, Save, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List } from "react-feather";
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
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
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

  // Aperçu des docs chargés depuis la DB (url /downloadFile sans htmlContent en mémoire).
  // /downloadFile est sous auth : un iframe src=url brut prend un 401 → aperçu blanc.
  // On récupère le HTML via le proxy /fetch-html (POST avec token) et on l'injecte en srcDoc.
  // Les urls statiques (simulateurs, même origine) restent en src plus bas.
  useEffect(() => {
    const needsProxy = docUrl && /\/downloadFile/.test(docUrl);
    if (!needsProxy || docHtmlContent) return;

    let cancelled = false;
    setIsLoadingPreview(true);
    (async () => {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const response = await axios.post(
          `${global.config.server_url}/fetch-html`,
          { url: docUrl },
          Config,
        );
        if (!cancelled && response.data && response.data.html) {
          setStaticHtmlContent(response.data.html);
        }
      } catch (e) {
        if (!cancelled) console.error("Aperçu indisponible:", e);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, docUrl, docHtmlContent]);

  // Fonction pour exécuter des commandes d'édition sur l'iframe
  const execCommand = (e, command, value = null) => {
    // Empêcher la perte de focus/sélection
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    try {
      iframe.contentDocument.execCommand(command, false, value);
      iframe.contentWindow.focus();
    } catch (e) {
      console.error("Erreur execCommand:", e);
    }
  };

  // Commandes d'édition spécifiques
  const formatBold = (e) => execCommand(e, "bold");
  const formatItalic = (e) => execCommand(e, "italic");
  const formatUnderline = (e) => execCommand(e, "underline");
  const formatAlignLeft = (e) => execCommand(e, "justifyLeft");
  const formatAlignCenter = (e) => execCommand(e, "justifyCenter");
  const formatAlignRight = (e) => execCommand(e, "justifyRight");
  const formatUnorderedList = (e) => execCommand(e, "insertUnorderedList");
  const formatOrderedList = (e) => execCommand(e, "insertOrderedList");

  const formatFontSize = (e, size) => execCommand(e, "fontSize", size);
  const formatFontColor = (e, color) => execCommand(e, "foreColor", color);
  const formatBackColor = (e, color) => execCommand(e, "backColor", color);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body) {
        doc.body.contentEditable = "true";
        doc.body.style.cursor = "text";

        const updateContent = () => {
          const newContent = doc.documentElement.outerHTML;
          setStaticHtmlContent(newContent);
          setViewingDoc((prev) => ({
            ...prev,
            htmlContent: newContent,
          }));
        };

        // Ne mettre à jour que lors du blur pour éviter la perte de focus
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
          <div className="flex-grow-1 bg-white position-relative d-flex flex-column">
            {/* Barre d'outils d'édition */}
            {isEditMode && (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#ffffff",
                  borderBottom: "2px solid #e9ecef",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Format texte de base */}
                <div style={{ display: "flex", gap: "4px", padding: "4px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <Button
                    color="light"
                    onMouseDown={formatBold}
                    title="Gras (Ctrl+B)"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <Bold size={18} />
                  </Button>
                  <Button
                    color="light"
                    onMouseDown={formatItalic}
                    title="Italique (Ctrl+I)"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <Italic size={18} />
                  </Button>
                  <Button
                    color="light"
                    onMouseDown={formatUnderline}
                    title="Souligné (Ctrl+U)"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <Underline size={18} />
                  </Button>
                </div>

                {/* Séparateur */}
                <div style={{ width: "1px", height: "30px", backgroundColor: "#dee2e6" }} />

                {/* Taille de police */}
                <UncontrolledDropdown>
                  <DropdownToggle
                    color="light"
                    caret
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Taille
                  </DropdownToggle>
                  <DropdownMenu style={{ borderRadius: "6px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
                    <DropdownItem onMouseDown={(e) => formatFontSize(e, "1")} style={{ padding: "8px 16px" }}>
                      <span style={{ fontSize: "12px" }}>Petit</span>
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontSize(e, "3")} style={{ padding: "8px 16px" }}>
                      <span style={{ fontSize: "14px" }}>Normal</span>
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontSize(e, "5")} style={{ padding: "8px 16px" }}>
                      <span style={{ fontSize: "18px" }}>Grand</span>
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontSize(e, "7")} style={{ padding: "8px 16px" }}>
                      <span style={{ fontSize: "24px" }}>Très grand</span>
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>

                {/* Couleur du texte */}
                <UncontrolledDropdown>
                  <DropdownToggle
                    color="light"
                    caret
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      fontWeight: "500",
                    }}
                  >
                    Couleur
                  </DropdownToggle>
                  <DropdownMenu style={{ borderRadius: "6px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
                    <DropdownItem onMouseDown={(e) => formatFontColor(e, "#000000")} style={{ padding: "8px 16px" }}>
                      <span style={{ color: "#000000", fontWeight: "600" }}>⬤</span> Noir
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontColor(e, "#FF0000")} style={{ padding: "8px 16px" }}>
                      <span style={{ color: "#FF0000", fontWeight: "600" }}>⬤</span> Rouge
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontColor(e, "#0000FF")} style={{ padding: "8px 16px" }}>
                      <span style={{ color: "#0000FF", fontWeight: "600" }}>⬤</span> Bleu
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontColor(e, "#008000")} style={{ padding: "8px 16px" }}>
                      <span style={{ color: "#008000", fontWeight: "600" }}>⬤</span> Vert
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontColor(e, "#FFA500")} style={{ padding: "8px 16px" }}>
                      <span style={{ color: "#FFA500", fontWeight: "600" }}>⬤</span> Orange
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatFontColor(e, "#800080")} style={{ padding: "8px 16px" }}>
                      <span style={{ color: "#800080", fontWeight: "600" }}>⬤</span> Violet
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>

                {/* Couleur de fond */}
                <UncontrolledDropdown>
                  <DropdownToggle
                    color="light"
                    caret
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      fontWeight: "500",
                    }}
                  >
                    Surlignage
                  </DropdownToggle>
                  <DropdownMenu style={{ borderRadius: "6px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
                    <DropdownItem onMouseDown={(e) => formatBackColor(e, "transparent")} style={{ padding: "8px 16px" }}>
                      Aucun
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatBackColor(e, "#FFFF00")} style={{ padding: "8px 16px" }}>
                      <span style={{ backgroundColor: "#FFFF00", padding: "2px 8px", borderRadius: "3px" }}>Jaune</span>
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatBackColor(e, "#00FF00")} style={{ padding: "8px 16px" }}>
                      <span style={{ backgroundColor: "#00FF00", padding: "2px 8px", borderRadius: "3px" }}>Vert</span>
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatBackColor(e, "#00FFFF")} style={{ padding: "8px 16px" }}>
                      <span style={{ backgroundColor: "#00FFFF", padding: "2px 8px", borderRadius: "3px" }}>Cyan</span>
                    </DropdownItem>
                    <DropdownItem onMouseDown={(e) => formatBackColor(e, "#FFB6C1")} style={{ padding: "8px 16px" }}>
                      <span style={{ backgroundColor: "#FFB6C1", padding: "2px 8px", borderRadius: "3px" }}>Rose</span>
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>

                {/* Séparateur */}
                <div style={{ width: "1px", height: "30px", backgroundColor: "#dee2e6" }} />

                {/* Alignement */}
                <div style={{ display: "flex", gap: "4px", padding: "4px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <Button
                    color="light"
                    onMouseDown={formatAlignLeft}
                    title="Aligner à gauche"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <AlignLeft size={18} />
                  </Button>
                  <Button
                    color="light"
                    onMouseDown={formatAlignCenter}
                    title="Centrer"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <AlignCenter size={18} />
                  </Button>
                  <Button
                    color="light"
                    onMouseDown={formatAlignRight}
                    title="Aligner à droite"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <AlignRight size={18} />
                  </Button>
                </div>

                {/* Listes */}
                <div style={{ display: "flex", gap: "4px", padding: "4px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <Button
                    color="light"
                    onMouseDown={formatUnorderedList}
                    title="Liste à puces"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                    }}
                    className="hover-shadow"
                  >
                    <List size={18} />
                  </Button>
                  <Button
                    color="light"
                    onMouseDown={formatOrderedList}
                    title="Liste numérotée"
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    className="hover-shadow"
                  >
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>1.</span>
                    <List size={16} />
                  </Button>
                </div>

                <style>{`
                  .hover-shadow:hover {
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
                    transform: translateY(-1px);
                  }
                `}</style>
              </div>
            )}

            {/* Preview */}
            <div className="flex-grow-1 position-relative">
            {staticHtmlContent ? (
              <iframe
                ref={iframeRef}
                id="preview-iframe"
                srcDoc={staticHtmlContent}
                onLoad={handleIframeLoad}
                title="Document Preview"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : isLoadingPreview ? (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                <span className="spinner-border spinner-border-sm mr-2" />
                Chargement de l'aperçu...
              </div>
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
        </div>
      </ModalBody>
      </Modal>

      <SweetAlert
        warning
        showCancel
        confirmBtnText="Enregistrer"
        confirmBtnBsStyle="primary"
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
