import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactDOM from "react-dom";
import { Row, Col } from "reactstrap";
import "../../../../assets/scss/pages/notes-hub.scss";
import { useNotesLogic } from "./notes/useNotesLogic";
import NotesForm from "./notes/NotesForm";
import DocumentViewerModal from "./notes/DocumentViewerModal";
import ReportErrorModal from "./notes/ReportErrorModal";
import DeleteConfirmModal from "./notes/DeleteConfirmModal";
import ProspectChatView from "./ProspectChatView";
// UploadSection / GeneratedDocsSection kept on disk; not rendered as Infos hero (JF 2026-09-08)
// import UploadSection from "./notes/UploadSection";
// import GeneratedDocsSection from "./notes/GeneratedDocsSection";

const NotesTab = ({ id, perso = {}, commentsSlot, renderUploadOutside }) => {

  const {
    notes,
    handleNotesChange,
    handleSubmit,
    hasChanged,
    isSaving,
    isEditingNotes,
    setIsEditingNotes,
    handleCancelNotesEdit,
    isUploading,
    handleUpload,
    selectedTags,
    handleTagsChange,
    n8nMessage,
    setN8nMessage,
    reportType,
    handleGenerateDoc,
    isGenerating,
    deleteConfirmTarget,
    setDeleteConfirmTarget,
    confirmDelete,
    viewingDoc,
    setViewingDoc,
    chatMessage,
    setChatMessage,
    handleDownloadPdf,
    handleDownloadHtml,
    handleReportDoc,
    handleModalGenerate,
    reportModalOpen,
    setReportModalOpen,
    reportDoc,
    reportDescription,
    setReportDescription,
    handleConfirmReport,
    handleSaveDoc,
    handleCancelGeneration,
    fileToSend,
    clearFileToSend,
    userDocuments,
    isLoadingDocs,
    fetchUserDocuments,
    selectDocumentFromList,
    notePrompts,
    selectedNotePromptId,
    setSelectedNotePromptId,
    isGeneratingNotes,
    handleGenerateNotesWithPrompt,
    previousNotesSnapshot,
    handleRestorePreviousNotes,
    generatedDocs,
    handleOpenDoc,
    requestDeleteGenerated,
    requestDeleteAllGenerated,
    handleRenameDoc,
  } = useNotesLogic(id, perso);

  const isProspect = String(perso.role).toLowerCase() === "prospect";

  const [portalNode, setPortalNode] = useState(null);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Lot1 JF: inbound CF7 body under the two notes (live fiche — not dumped into notes)
  const [inboundMessage, setInboundMessage] = useState(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const token = localStorage.getItem("token");
    axios
      .get(global.config.server_url + "/inbound-emails", {
        params: { client_id: id, per_page: 5 },
        headers: { Authorization: "Bearer " + token },
      })
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data || res.data || [];
        const list = Array.isArray(rows) ? rows : [];
        const first = list[0];
        if (!first) {
          setInboundMessage(null);
          return;
        }
        const body = (first.body || first.snippet || "").trim();
        setInboundMessage(body || null);
      })
      .catch(() => {
        if (!cancelled) setInboundMessage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);


  useEffect(() => {
    // Attempt to find the portal node. It might be available immediately, or shortly after.
    const node = document.getElementById("ris-upload-portal-target");
    if (node) {
      setPortalNode(node);
    } else {
      // In case it hasn't rendered yet (due to rendering order), check again briefly
      const timeout = setTimeout(() => {
        setPortalNode(document.getElementById("ris-upload-portal-target"));
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Infos hero cleanup (JF 2026-09-08): no GeneratedDocsSection / UploadSection as top chrome.
  // Capability remains in SimulatorIntegration (collapsed docs + assistant + attach) and Documents tab.
  const uploadSectionElement = null;

  const uploadSectionPortal = portalNode && uploadSectionElement
    ? ReactDOM.createPortal(uploadSectionElement, portalNode)
    : null;

  return (
    <>
      <div className="notes-page">
      <ProspectChatView user={perso} />

      <Row className="match-height notes-two-col-row align-items-stretch">
        <Col
          md={commentsSlot && !isNotesExpanded ? "6" : "12"}
          sm="12"
          className={`d-flex notes-main-col ${isNotesExpanded ? "notes-main-col--expanded" : ""}`}
        >
          <NotesForm
            notes={notes}
            handleNotesChange={handleNotesChange}
            handleSubmit={handleSubmit}
            hasChanged={hasChanged}
            isSaving={isSaving}
            isEditingNotes={isEditingNotes}
            setIsEditingNotes={setIsEditingNotes}
            handleCancelNotesEdit={handleCancelNotesEdit}
            notePrompts={notePrompts}
            selectedNotePromptId={selectedNotePromptId}
            setSelectedNotePromptId={setSelectedNotePromptId}
            isGeneratingNotes={isGeneratingNotes}
            handleGenerateNotesWithPrompt={handleGenerateNotesWithPrompt}
            previousNotesSnapshot={previousNotesSnapshot}
            handleRestorePreviousNotes={handleRestorePreviousNotes}
            isExpanded={isNotesExpanded}
            onToggleExpand={
              commentsSlot ? () => setIsNotesExpanded((v) => !v) : null
            }
          />
        </Col>
        {commentsSlot && (
          <Col
            md="6"
            sm="12"
            className={`d-flex notes-comments-col ${isNotesExpanded ? "notes-comments-col--hidden" : ""}`}
            aria-hidden={isNotesExpanded}
          >
            {commentsSlot}
          </Col>
        )}
      </Row>

      {inboundMessage ? (
        <div
          className="inbound-email-under-notes"
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px dashed #c4b5fd",
            borderRadius: 8,
            background: "#faf8ff",
            whiteSpace: "pre-wrap",
            fontSize: 13,
            lineHeight: 1.4,
            color: "#1f2937",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#5b2d91",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Message inbound (CF7 / mail)
          </div>
          {inboundMessage}
        </div>
      ) : null}

      {/* ManualCareerTable masquée
      {!isProspect && (
        <ManualCareerTable
          manualCareerRows={manualCareerRows}
          setManualCareerRows={setManualCareerRows}
          handleSalaryChange={handleSalaryChange}
          handleDeplafonnerChange={handleDeplafonnerChange}
          handleIsCadreChange={handleIsCadreChange}
          isCadre={isCadre}
          handleManualAddLine={handleManualAddLine}
          handleManualImport={handleManualImport}
          isImportingRIS={isImportingRIS}
          handleSaveFrozenData={handleSaveFrozenData}
          isSavingFrozen={isSavingFrozen}
          frozenSaved={frozenSaved}
        />
      )}
      */}

      <DeleteConfirmModal
        target={deleteConfirmTarget}
        onCancel={() => setDeleteConfirmTarget(null)}
        onConfirm={confirmDelete}
      />

      <DocumentViewerModal
        viewingDoc={viewingDoc}
        setViewingDoc={setViewingDoc}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        handleDownloadPdf={handleDownloadPdf}
        handleDownloadHtml={handleDownloadHtml}
        handleReportDoc={handleReportDoc}
        handleModalGenerate={handleModalGenerate}
        isGenerating={isGenerating}
        handleSaveDoc={handleSaveDoc}
      />

      <ReportErrorModal
        isOpen={reportModalOpen}
        toggle={() => setReportModalOpen(!reportModalOpen)}
        reportDoc={reportDoc}
        reportDescription={reportDescription}
        setReportDescription={setReportDescription}
        handleConfirmReport={handleConfirmReport}
      />
      </div>

      {/* Renders UploadSection here or in the portal target in ClientEdit.js for full-width */}
      {!portalNode ? uploadSectionElement : uploadSectionPortal}
    </>
  );
};

export default NotesTab;
