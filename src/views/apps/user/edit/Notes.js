import React from "react";
import { Row, Col } from "reactstrap";
import "../../../../assets/scss/pages/notes-hub.scss";
import { useNotesLogic } from "./notes/useNotesLogic";
import NotesForm from "./notes/NotesForm";
// import UploadSection from "./notes/UploadSection";
// import SimulatorIntegration from "./notes/SimulatorIntegration";
import DocumentViewerModal from "./notes/DocumentViewerModal";
import ReportErrorModal from "./notes/ReportErrorModal";
import DeleteConfirmModal from "./notes/DeleteConfirmModal";
import ProspectChatView from "./ProspectChatView";

const NotesTab = ({ id, perso = {}, onReportError, commentsSlot }) => {

  const {
    notes,
    handleNotesChange,
    handleSubmit,
    hasChanged,
    isSaving,
    isEditingNotes,
    setIsEditingNotes,
    handleCancelNotesEdit,
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
    notePrompts,
    selectedNotePromptId,
    setSelectedNotePromptId,
    isGeneratingNotes,
    handleGenerateNotesWithPrompt,
    previousNotesSnapshot,
    handleRestorePreviousNotes,
  } = useNotesLogic(id, perso);

  return (
    <div className="notes-page">
      <ProspectChatView user={perso} />

      <Row className="match-height">
        <Col md={commentsSlot ? "6" : "12"} sm="12" className="d-flex">
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
          />
        </Col>
        {commentsSlot && (
          <Col md="6" sm="12" className="d-flex">
            {commentsSlot}
          </Col>
        )}
      </Row>


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
  );
};

export default NotesTab;
