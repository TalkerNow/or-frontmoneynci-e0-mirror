import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Row, Col } from "reactstrap";
import "../../../../assets/scss/pages/notes-hub.scss";
import { useNotesLogic } from "./notes/useNotesLogic";
import NotesForm from "./notes/NotesForm";
import DocumentViewerModal from "./notes/DocumentViewerModal";
import ReportErrorModal from "./notes/ReportErrorModal";
import DeleteConfirmModal from "./notes/DeleteConfirmModal";
import ProspectChatView from "./ProspectChatView";
import UploadSection from "./notes/UploadSection";
import GeneratedDocsSection from "./notes/GeneratedDocsSection";

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

  const uploadSectionElement = !isProspect ? (
    <>
      {/* <UploadSection
        fileToSend={fileToSend}
        clearFileToSend={clearFileToSend}
        isUploading={isUploading}
        onUpload={handleUpload}
        isGenerating={isGenerating}
        onCancelGeneration={handleCancelGeneration}
        userDocuments={userDocuments}
        isLoadingDocs={isLoadingDocs}
        onFetchDocuments={fetchUserDocuments}
        onSelectDocument={selectDocumentFromList}
        selectedTags={selectedTags}
        handleTagsChange={handleTagsChange}
        n8nMessage={n8nMessage}
        setN8nMessage={setN8nMessage}
        reportType={reportType}
        handleGenerateDoc={handleGenerateDoc}
      /> */}
      <GeneratedDocsSection
        generatedDocs={generatedDocs}
        handleOpenDoc={handleOpenDoc}
        requestDeleteGenerated={requestDeleteGenerated}
        requestDeleteAllGenerated={requestDeleteAllGenerated}
        handleRenameDoc={handleRenameDoc}
      />
    </>
  ) : null;

  const uploadSectionPortal = portalNode && uploadSectionElement
    ? ReactDOM.createPortal(uploadSectionElement, portalNode)
    : null;

  return (
    <>
      <div className="notes-page h-100">
      <ProspectChatView user={perso} />

      <Row className="match-height flex-grow-1 notes-two-col-row">
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
