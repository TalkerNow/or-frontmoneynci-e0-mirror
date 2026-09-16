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
import {
  parseCf7ContactBody,
  formatPhoneNumber,
} from "../../kpi/components/inbox/utils";

/** Display-time: drop Brevo/sendibt tracking + pixel brackets (no DB wipe). */
function stripMailTrackingPollution(text) {
  return String(text || "")
    .replace(
      /\[[^\]]*https?:\/\/[^\]]*(?:sendibt\d*|caiggcc|brevo|tsp1-brevo)[^\]]*\]/gi,
      " ",
    )
    .replace(
      /https?:\/\/[^\s\]]*(?:sendibt\d*|caiggcc|brevo\.net|tsp1-brevo)[^\s\]]*/gi,
      " ",
    )
    .replace(/^\s*EOR\s*$/gim, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cap'tain reading format (fiche MESSAGE panel):
 * title + Nom/Tél/Mail(+extras) lines + blank + message text.
 * Zero tracking URLs / raw markup.
 */
function buildInboundReadingPane(rawBody) {
  const cleaned = stripMailTrackingPollution(rawBody);
  if (!cleaned) return null;

  const parsed = parseCf7ContactBody(cleaned) || {};
  let name = (parsed.name || "").trim();
  if (!name) {
    const m = cleaned.match(
      /Nom\s+et\s+(?:Prénom|Prenom)\s+(.+?)(?=\s*(?:Téléphone|Telephone|Adresse\s*(?:e-?mail|mail)|E-?mail|Date\s*de\s*naissance|Message|Votre\s+message|Page\s+d|Consentement|Formulaire\s+rempli)|$)/i,
    );
    if (m) name = m[1].trim();
  }
  // Webhook KV fallback (civilite/Name/…)
  if (!name) {
    const civ = cleaned.match(/^(?:Title|civilite)\s*:\s*(.+)$/im);
    const nm = cleaned.match(/^Name\s*:\s*(.+)$/im);
    if (nm) {
      name = [civ && civ[1].trim(), nm[1].trim()].filter(Boolean).join(" ");
    }
  }

  let phone = (parsed.phone || "").trim();
  if (!phone) {
    const m =
      cleaned.match(/^(?:phone|tel)\s*:\s*(.+)$/im) ||
      cleaned.match(
        /(?:Téléphone|Telephone)\s*[:\s]\s*([+0-9][0-9.\s/-]{6,})/i,
      );
    if (m) phone = m[1].replace(/[.\s/-]/g, "").trim();
  }

  let email = (parsed.email || "").trim();
  if (!email) {
    const m = cleaned.match(/^(?:email|e-?mail)\s*:\s*(\S+@\S+)/im);
    if (m) email = m[1].replace(/[>,;]+$/, "").trim();
  }

  let birthDate = (parsed.birthDate || "").trim();
  if (!birthDate) {
    const m =
      cleaned.match(
        /Date\s*de\s*naissance\s*[:\s]\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})/i,
      ) || cleaned.match(/^(?:date|text-542)\s*:\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})/im);
    if (m) birthDate = m[1].trim();
  }

  let message = (parsed.message || "").trim();
  if (!message) {
    const m =
      cleaned.match(
        /(?:Votre\s+message|\bMessage(?!\s+reçu)\b)\s*:?\s+(.+?)(?=\s*Page\s+d|\s*Consentement|\s*Formulaire\s+rempli|\s*$)/is,
      ) ||
      cleaned.match(/^textarea-\d+\s*:\s*(.+)$/ims) ||
      cleaned.match(/^Message\s*:\s*(.+)$/ims);
    if (m) message = m[1].trim();
  }
  // Drop trailing page/consent crumbs glued into message
  message = message
    .replace(/\s*Page\s+d['’]envoi\s+https?:\/\/\S+/gi, "")
    .replace(/\s*Consentement\s*\/\s*Options\s+.*/gi, "")
    .replace(/\s*Formulaire\s+rempli\s+sur[\s\S]*/gi, "")
    .replace(/\s*acceptance-\d+\s*:\s*\S+/gi, "")
    .replace(/\s*checkbox-\d+\s*:[\s\S]*/gi, "")
    .trim();

  let pageUrl = "";
  {
    const mPage = cleaned.match(
      /Page\s+d['’]envoi\s+(https?:\/\/(?:www\.)?eor\.fr\/[^\s]+)/i,
    );
    const mForm = cleaned.match(
      /Formulaire\s+rempli\s+sur\s+le\s+site\s+EOR\s*:\s*(https?:\/\/(?:www\.)?eor\.fr\/?[^\s]*)/i,
    );
    if (mPage) pageUrl = mPage[1].replace(/[.,;)\]]+$/, "").trim();
    else if (mForm) pageUrl = mForm[1].replace(/[.,;)\]]+$/, "").trim();
    else if ((parsed.formUrl || "").trim()) pageUrl = parsed.formUrl.trim();
  }
  // Never keep tracking hosts as page
  if (/sendibt|caiggcc|brevo/i.test(pageUrl)) pageUrl = "";

  let consent = "";
  const cm = cleaned.match(
    /Consentement\s*\/\s*Options\s+(.+?)(?=\s*Formulaire\s+rempli|\s*$)/is,
  );
  if (cm) {
    consent = cm[1].replace(/\s+/g, " ").trim();
  }

  const lines = [];
  if (name) lines.push("Nom et prénom: " + name);
  const phoneFmt = formatPhoneNumber(phone) || phone;
  if (phoneFmt) lines.push("Téléphone: " + phoneFmt);
  if (email) lines.push("Adresse mail: " + email);
  if (birthDate) lines.push("Date de naissance: " + birthDate);
  if (pageUrl) lines.push("Page d'envoi: " + pageUrl);
  if (consent) lines.push("Consentement / Options: " + consent);

  const bodyText = message || "";
  // If parse yielded nothing useful, last-resort cleaned text without URLs already stripped
  const text =
    lines.length || bodyText
      ? (lines.join("\n") + (bodyText ? "\n\n" + bodyText : "")).trim()
      : cleaned;

  // Safety: never surface tracking hosts
  if (/sendibt|caiggcc|tsp1-brevo/i.test(text)) {
    const safer = stripMailTrackingPollution(text);
    return {
      title: "Message reçu via le formulaire de contact",
      text: safer,
    };
  }

  return {
    title: "Message reçu via le formulaire de contact",
    text,
  };
}

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

  // Lot1 JF: inbound CF7 under notes — Cap'tain readable format (strip Brevo tracking)
  const [inboundReading, setInboundReading] = useState(null);
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
          setInboundReading(null);
          return;
        }
        const body = (first.body || first.snippet || "").trim();
        setInboundReading(body ? buildInboundReadingPane(body) : null);
      })
      .catch(() => {
        if (!cancelled) setInboundReading(null);
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

      {inboundReading && inboundReading.text ? (
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
              fontSize: 13,
              fontWeight: 700,
              color: "#5b2d91",
              marginBottom: 8,
              letterSpacing: "0.01em",
            }}
          >
            {inboundReading.title}
          </div>
          {inboundReading.text}
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
