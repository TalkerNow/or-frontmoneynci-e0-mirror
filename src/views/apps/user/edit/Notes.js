import React from "react";
import "../../../../assets/scss/pages/notes-hub.scss";
import { useNotesLogic } from "./notes/useNotesLogic";
import NotesForm from "./notes/NotesForm";
import UploadSection from "./notes/UploadSection";
import AnalysisSection from "./notes/AnalysisSection";
import GeneratedDocsSection from "./notes/GeneratedDocsSection";
import ManualCareerTable from "./notes/ManualCareerTable";
import DocumentViewerModal from "./notes/DocumentViewerModal";
import ReportErrorModal from "./notes/ReportErrorModal";
import DeleteConfirmModal from "./notes/DeleteConfirmModal";

const NotesTab = ({ id, perso = {}, onReportError }) => {
  const {
    notes,
    handleNotesChange,
    handleSubmit,
    hasChanged,
    isSaving,
    isUploading,
    handleUpload,
    selectedTags,
    handleTagsChange,
    n8nMessage,
    setN8nMessage,
    reportType,
    handleGenerateDoc,
    isGenerating,
    generatedDocs,
    handleOpenDoc,
    requestDeleteGenerated,
    handleRenameDoc,
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
    manualCareerRows,
    setManualCareerRows,
    handleManualAddLine,
    handleManualImport,
    fileToSend,
    clearFileToSend,
    handleSaveDoc,
    handleCancelGeneration,
  } = useNotesLogic(id, perso);

  return (
    <div className="notes-layout">
      <div className="notes-top-row">
        <NotesForm
          notes={notes}
          handleNotesChange={handleNotesChange}
          handleSubmit={handleSubmit}
          hasChanged={hasChanged}
          isSaving={isSaving}
        />

        <UploadSection
          fileToSend={fileToSend}
          clearFileToSend={clearFileToSend}
          isUploading={isUploading}
          onUpload={handleUpload}
          isGenerating={isGenerating}
          onCancelGeneration={handleCancelGeneration}
        />
      </div>

      <AnalysisSection
        selectedTags={selectedTags}
        handleTagsChange={handleTagsChange}
        n8nMessage={n8nMessage}
        setN8nMessage={setN8nMessage}
        reportType={reportType}
        handleGenerateDoc={handleGenerateDoc}
        isGenerating={isGenerating}
        onCancelGeneration={handleCancelGeneration}
      />

      <GeneratedDocsSection
        generatedDocs={generatedDocs}
        handleOpenDoc={handleOpenDoc}
        requestDeleteGenerated={requestDeleteGenerated}
        handleRenameDoc={handleRenameDoc}
      />

      <ManualCareerTable
        manualCareerRows={manualCareerRows}
        setManualCareerRows={setManualCareerRows}
        handleManualAddLine={handleManualAddLine}
        handleManualImport={handleManualImport}
      />

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
