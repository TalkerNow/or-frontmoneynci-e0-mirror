import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardBody,
  Button,
  Form,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";
import UploadCard from "./components/UploadCard";
import GeneratedDocumentItem from "./components/GeneratedDocumentItem";
import { AlertTriangle } from "react-feather";
import { saveAs } from "file-saver";
import "../../../../assets/scss/pages/notes-hub.scss";

const DOC_STORAGE_KEY = "career_generated_docs_v1";
const DOC_UPLOAD_META_KEY = "career_doc_meta";
const PUBLIC_URL =
  typeof process !== "undefined" && process.env && process.env.PUBLIC_URL
    ? process.env.PUBLIC_URL
    : "";
const DEFAULT_DOC_URLS = {
  pre: `${PUBLIC_URL}/cnav-simulator.html`,
  consult: `${PUBLIC_URL}/arrco-simulator.html`,
};

const pickNamePart = (value) =>
  typeof value === "string" && value.trim().length ? value.trim() : "";
const stripAccents = (value = "") =>
  value.normalize
    ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : value;
const generateDocId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `doc-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const detectDocTypeFromName = (name = "") => {
  const normalized = stripAccents(name).toLowerCase();
  if (normalized.startsWith("rapport pre-entretien")) return "pre";
  if (normalized.startsWith("rapport consultation")) return "consult";
  return "unknown";
};
const resolveDocType = (doc) => {
  const type = doc?.type || doc?.origin;
  if (type === "consult" || type === "consultation") return "consult";
  if (type === "preanalyse" || type === "pre") return "pre";
  return detectDocTypeFromName(doc?.name);
};
const loadStoredDocs = (docUrls = DEFAULT_DOC_URLS) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined")
    return [];
  try {
    const raw = localStorage.getItem(DOC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const type = resolveDocType(item);
        return {
          id: item.id || generateDocId(),
          name: item.name || "Document carrière",
          type,
          createdAt:
            item.createdAt || item.generatedAt || item.uploadedAt || "",
          url: item.url || docUrls[type] || "",
        };
      });
  } catch {
    return [];
  }
};
const loadUploadedDocs = () => {
  if (typeof window === "undefined" || typeof localStorage === "undefined")
    return [];
  try {
    const raw = localStorage.getItem(DOC_UPLOAD_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: item.id || generateDocId(),
          name: item.name || "",
          uploadedAt:
            item.uploadedAt || item.created_at || new Date().toISOString(),
          url: item.url || "",
        }));
    }
  } catch {
    /* noop */
  }
  return [];
};
const persistDocs = (docs) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined")
    return;
  try {
    const payload = (Array.isArray(docs) ? docs : []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      createdAt: doc.createdAt,
      url: doc.url,
    }));
    localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
};
const persistUploadedDocs = (items) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined")
    return;
  try {
    if (!items || !items.length) {
      localStorage.removeItem(DOC_UPLOAD_META_KEY);
      return;
    }
    localStorage.setItem(DOC_UPLOAD_META_KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
};
const extractClientNames = (perso = {}) => {
  const first = pickNamePart(
    perso.first_name || perso.firstname || perso.firstName || perso.prenom || ""
  );
  const last = pickNamePart(
    perso.last_name || perso.lastname || perso.lastName || perso.nom || ""
  );
  const displayName =
    `${first} ${last}`.replace(/\s+/g, " ").trim() || "ce client";
  return { first, last, displayName };
};

const sanitizeSalaryInput = (val) => {
  if (!val) return "";
  const s = String(val).replace(/[^0-9,.]/g, "");
  let seenSep = false;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "," || ch === ".") {
      if (seenSep) continue;
      seenSep = true;
    }
    out += ch;
  }
  return out;
};

const NotesTab = ({ id, perso = {}, onReportError }) => {
  const [notes, setNotes] = useState(perso?.notes ?? "");
  const [originalNotes, setOriginalNotes] = useState(perso?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState(() => loadUploadedDocs());
  const [generatedDocs, setGeneratedDocs] = useState(() => loadStoredDocs());
  const [reportType, setReportType] = useState("pre");
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [fileToSend, setFileToSend] = useState(null);
  const [manualCareerRows, setManualCareerRows] = useState([
    {
      id: Date.now(),
      annee: "",
      revenu: "",
      trimBase: "",
      trimAR: "",
      cnavPoints: "",
      arrcoPoints: "",
      ircantecPoints: "",
      rciPoints: "",
      perPoints: "",
      ta: "",
      tb: "",
      tc: "",
      errY: false,
      errR: false,
    },
  ]);

  const clientNames = useMemo(() => extractClientNames(perso), [perso]);
  const hasChanged = notes !== originalNotes;

  useEffect(() => {
    const incoming = perso?.notes ?? "";
    setNotes(incoming);
    setOriginalNotes(incoming);
  }, [id, perso?.notes]);

  useEffect(() => {
    persistDocs(generatedDocs);
  }, [generatedDocs]);
  useEffect(() => {
    const handleComplementaryPointsMessage = (event) => {
      const eventType = event?.data?.type;
      if (
        eventType !== "ARRCO_POINTS_SAVE" &&
        eventType !== "IRCANTEC_POINTS_SAVE"
      )
        return;
      const payload = event.data.payload || {};
      const year = Number(payload.year) || 2024;
      const pointsValue =
        Number(
          payload.pointsYear != null ? payload.pointsYear : payload.pointsTotal
        ) || 0;
      setManualCareerRows((prev) => {
        const safeRows = Array.isArray(prev) ? [...prev] : [];
        const idx = safeRows.findIndex((row) => Number(row?.annee) === year);
        if (idx >= 0) {
          safeRows[idx] = { ...safeRows[idx], arrcoPoints: pointsValue };
        } else {
          safeRows.push({
            id: `comp-${year}-${Date.now()}`,
            annee: year,
            revenu: "",
            trimBase: "",
            trimAR: "",
            cnavPoints: "",
            arrcoPoints: pointsValue,
            ircantecPoints: "",
            rciPoints: "",
            perPoints: "",
            ta: "",
            tb: "",
            tc: "",
            errY: false,
            errR: false,
          });
        }
        return safeRows;
      });
      toast.success(
        `Points ${
          eventType === "ARRCO_POINTS_SAVE" ? "ARRCO" : "IRCANTEC"
        } mis à jour`
      );
    };
    window.addEventListener("message", handleComplementaryPointsMessage);
    return () =>
      window.removeEventListener("message", handleComplementaryPointsMessage);
  }, []);

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const saveNotes = useCallback(async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    setIsSaving(true);
    try {
      await axios.put(
        `${global.config.server_url}/personal_information/${id}`,
        { notes },
        Config
      );
      toast.info("Modifications enregistrées");
      setOriginalNotes(notes);
    } catch (error) {
      toast.error("Impossible d’enregistrer les notes");
    } finally {
      setIsSaving(false);
    }
  }, [id, notes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasChanged || isSaving) return;
    saveNotes();
  };

  const handleUpload = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles || !acceptedFiles.length || !id) return;

      // On garde le fichier en mémoire pour l'affichage et l'envoi futur
      setFileToSend(acceptedFiles[0]);

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.set("user_id", id);
        acceptedFiles.forEach((file, index) =>
          formData.append(`photoUpload${index}`, file)
        );

        const Config = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        };

        const response = await axios.post(
          `${global.config.server_url}/uploadFiles`,
          formData,
          Config
        );
        const files = Array.isArray(response?.data?.files)
          ? response.data.files
          : [];
        if (files.length) {
          const mapped = files.map((f) => ({
            id: f.id || generateDocId(),
            name: f.filename || "Document importé",
            uploadedAt: f.created_at || new Date().toISOString(),
            url: f.url || "",
            size: f.size || 0,
            type: f.mimetype || "",
          }));
          setUploadedDocs((prev) => {
            const next = [...(Array.isArray(prev) ? prev : []), ...mapped];
            persistUploadedDocs(next);
            return next;
          });
          toast.success(
            files.length > 1 ? "Documents importés" : "Relevé importé"
          );
        }
      } catch {
        toast.error("Le téléversement a échoué");
      } finally {
        setIsUploading(false);
      }
    },
    [id]
  );
  const handleGenerateDoc = useCallback(
    async (type) => {
      const normalizedType = type === "consult" ? "consult" : "pre";
      setReportType(normalizedType);

      // 1) Cas "consult" : on garde ton comportement actuel (HTML statique)
      if (normalizedType === "consult") {
        const label = "Rapport consultation";
        const doc = {
          id: generateDocId(),
          name: `${label} de ${clientNames.displayName}`,
          type: normalizedType,
          createdAt: new Date().toISOString(),
          url: DEFAULT_DOC_URLS[normalizedType],
        };
        setGeneratedDocs((prev) => [doc, ...(Array.isArray(prev) ? prev : [])]);
        return;
      }

      // 2) Cas "pre" : flux n8n + Laravel
      if (!fileToSend) {
        toast.error("Merci d'importer d'abord un RIS (PDF)");
        return;
      }

      try {
        // ---------- CALL 1 : FRONT → n8n (avec le fichier) ----------
        const n8nFormData = new FormData();
        n8nFormData.append("file", fileToSend);

        toast.info("Analyse du relevé en cours via n8n…");

        // ---------- CALL 1 : FRONT → n8n (avec le fichier) ----------
        // Utilisation de fetch natif pour mieux gérer le FormData/Boundary que cette version d'axios
        const n8nRes = await fetch(
          "https://n8n.srv796541.hstgr.cloud/webhook/f012dfc7-8b2c-479f-af1f-20dcd44cda02",
          {
            method: "POST",
            body: n8nFormData,
          }
        );

        if (!n8nRes.ok) {
          throw new Error(`Erreur n8n: ${n8nRes.status} ${n8nRes.statusText}`);
        }

        let reportData = await n8nRes.json();

        // Si n8n renvoie [{ text: "```json\n{...}\n```" }]
        if (Array.isArray(reportData) && reportData[0]?.text) {
          const text = reportData[0].text || "";
          // On tente de récupérer le JSON entre { ... }
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            reportData = JSON.parse(match[0]);
          } else {
            // fallback : on enlève ```json et ``` et on parse
            const cleaned = text
              .replace(/```json/gi, "")
              .replace(/```/g, "")
              .trim();
            reportData = JSON.parse(cleaned);
          }
        }

        // On ajoute l'id du client et le type de rapport
        reportData.client_id = id;
        reportData.report_type = normalizedType;

        // ---------- CALL 2 : FRONT → LARAVEL (/generate-report) ----------
        const backendConfig = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        };

        const backendRes = await axios.post(
          `${global.config.server_url}/generate-report`,
          reportData,
          backendConfig
        );

        const reportUrl =
          backendRes?.data?.report_urls?.pdf ||
          backendRes?.data?.report_urls?.docx;

        if (!reportUrl) {
          console.warn("Réponse backend:", backendRes?.data);
          toast.error("Le serveur n'a pas renvoyé de lien de rapport");
          return;
        }

        const label =
          normalizedType === "consult"
            ? "Rapport consultation"
            : "Rapport pré-entretien";
        const doc = {
          id: generateDocId(),
          name: `${label} de ${clientNames.displayName}`,
          type: normalizedType,
          createdAt: new Date().toISOString(),
          url: reportUrl, // ✅ URL réelle du PDF ou DOCX généré par Laravel
        };

        setGeneratedDocs((prev) => [doc, ...(Array.isArray(prev) ? prev : [])]);
        toast.success(`${label} généré avec succès`);
      } catch (error) {
        console.error("Generation error:", error);
        let errorMsg = "Erreur lors de la génération du rapport";

        if (error.response) {
          // Erreur HTTP (n8n ou backend)
          errorMsg += ` (Erreur ${error.response.status})`;
          if (error.config && error.config.url) {
            if (error.config.url.includes("n8n")) errorMsg += " - n8n";
            else if (error.config.url.includes("generate-report"))
              errorMsg += " - Backend";
          }
        } else if (error.request) {
          // Pas de réponse reçue
          errorMsg += " (Pas de réponse du serveur)";
        } else {
          // Autre erreur (ex: parsing)
          errorMsg += ` (${error.message})`;
        }

        toast.error(errorMsg);
      }
    },
    [clientNames.displayName, fileToSend, id]
  );

  const handleOpenDoc = useCallback(async (doc) => {
    if (!doc || !doc.url) {
      toast.info("Aucun fichier disponible pour ce document");
      return;
    }

    try {
      // On force le téléchargement en récupérant le blob
      toast.info("Téléchargement en cours...");
      const response = await axios.get(doc.url, { responseType: "blob" });

      // Déduction du nom de fichier
      let filename = doc.name || "document";
      const extension = doc.url.split(".").pop().split("?")[0];
      if (extension && filename.indexOf(extension) === -1) {
        // On évite de doubler l'extension si elle est déjà dans le nom
        // Mais ici doc.name est souvent un libellé ("Rapport ...")
        filename = `${filename}.${extension}`;
      }

      saveAs(response.data, filename);
      toast.success("Téléchargement terminé");
    } catch (error) {
      console.error(error);
      // Fallback : ouverture simple
      window.open(doc.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleDeleteDoc = useCallback((docId) => {
    setGeneratedDocs((prev) =>
      Array.isArray(prev) ? prev.filter((doc) => doc && doc.id !== docId) : []
    );
  }, []);

  const handleReportDoc = useCallback(
    (doc) => {
      if (!doc) return;
      const inferred =
        doc.type && doc.type !== "unknown"
          ? doc.type
          : detectDocTypeFromName(doc.name);
      if (typeof onReportError === "function") {
        onReportError(inferred, doc);
      } else {
        toast.info("Signalement enregistré (intégration à venir)");
      }
    },
    [onReportError]
  );
  const handleDeleteUpload = useCallback((docId) => {
    setUploadedDocs((prev) => {
      const next = (Array.isArray(prev) ? prev : []).filter(
        (doc) => doc && doc.id !== docId
      );
      persistUploadedDocs(next);
      return next;
    });
  }, []);

  const requestDeleteGenerated = useCallback((doc) => {
    if (!doc) return;
    setDeleteConfirmTarget({ type: "generated", doc });
  }, []);

  const requestDeleteUploaded = useCallback((doc) => {
    if (!doc) return;
    setDeleteConfirmTarget({ type: "uploaded", doc });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === "generated" && deleteConfirmTarget.doc) {
      handleDeleteDoc(deleteConfirmTarget.doc.id);
    } else if (
      deleteConfirmTarget.type === "uploaded" &&
      deleteConfirmTarget.doc
    ) {
      handleDeleteUpload(deleteConfirmTarget.doc.id);
    }
    setDeleteConfirmTarget(null);
  }, [deleteConfirmTarget, handleDeleteDoc, handleDeleteUpload]);

  const handleManualAddLine = useCallback(() => {
    setManualCareerRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        annee: "",
        revenu: "",
        trimBase: "",
        trimAR: "",
        cnavPoints: "",
        arrcoPoints: "",
        ircantecPoints: "",
        rciPoints: "",
        perPoints: "",
        ta: "",
        tb: "",
        tc: "",
        errY: false,
        errR: false,
      },
    ]);
  }, []);

  const handleManualImport = useCallback(() => {
    toast.info("Import manuel à venir");
  }, []);

  const handleReportRisBug = useCallback(() => {
    const dummyDoc = {
      id: "ris-report",
      name: "Relevé de carrière (RIS)",
      type: "ris",
      url: "",
    };
    if (typeof onReportError === "function") {
      onReportError("ris", dummyDoc);
    } else {
      toast.info("Signalement enregistré");
    }
  }, [onReportError]);

  return (
    <div className="notes-layout">
      <div className="notes-top-row">
        <Card className="notes-card notes-card--compact">
          <CardBody>
            <Form className="notes-form" onSubmit={handleSubmit}>
              <h5 className="notes-card-title">Notes</h5>
              <Input
                id="notes"
                type="textarea"
                placeholder="Notes"
                className="notes-textarea"
                value={notes}
                onChange={handleNotesChange}
              />
              <div className="notes-form-actions notes-action-row">
                <Button
                  className="notes-action-btn"
                  color={hasChanged ? "primary" : "secondary"}
                  type="submit"
                  disabled={!hasChanged || isSaving}
                >
                  {isSaving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>

        <Card className="notes-card notes-card--compact notes-card--upload">
          <CardBody className="notes-upload-body">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <h5 className="notes-card-title mb-0">
                RIS relevé de carrière du client
              </h5>
              <Button
                color="warning"
                outline
                size="sm"
                onClick={handleReportRisBug}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={14} />
                Signaler un bug
              </Button>
            </div>
            <UploadCard
              title={null}
              description="Glissez et déposez des fichiers ici, ou cliquez pour sélectionner des fichiers à télécharger."
              onDrop={handleUpload}
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

            <div className="notes-upload-actions notes-action-row">
              <Button
                className={`notes-report-btn notes-action-btn ${
                  reportType === "pre" ? "is-active" : ""
                }`}
                color="link"
                onClick={() => handleGenerateDoc("pre")}
              >
                Rapport pré-entretien
              </Button>
              <Button
                className={`notes-report-btn notes-action-btn ${
                  reportType === "consult" ? "is-active" : ""
                }`}
                color="link"
                onClick={() => handleGenerateDoc("consult")}
              >
                Rapport consultation
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="notes-documents-block">
        <h6>Documents générés</h6>
        {generatedDocs.length ? (
          <div className="notes-documents-list">
            {generatedDocs.map((doc) => (
              <GeneratedDocumentItem
                key={doc.id}
                doc={doc}
                onOpen={() => handleOpenDoc(doc)}
                onDelete={() => requestDeleteGenerated(doc)}
                onReport={() => handleReportDoc(doc)}
              />
            ))}
          </div>
        ) : (
          <Card className="notes-empty-doc-card">
            <CardBody className="text-muted">
              Aucun document généré pour le moment.
            </CardBody>
          </Card>
        )}
        {uploadedDocs.length > 0 && (
          <div className="notes-uploaded-block mt-2">
            <h6>Documents importés</h6>
            <div className="notes-documents-list">
              {uploadedDocs.map((doc) => (
                <GeneratedDocumentItem
                  key={doc.id}
                  doc={{
                    id: doc.id,
                    name: doc.name,
                    createdAt: doc.uploadedAt,
                    type: "import",
                    url: doc.url,
                  }}
                  onDelete={() => requestDeleteUploaded(doc)}
                  onOpen={() => (doc.url ? handleOpenDoc(doc) : null)}
                  onReport={null}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Card className="notes-card manual-entry-card mt-2">
        <CardBody>
          <div className="manual-header">
            <h5 className="notes-card-title mb-1">
              Saisie de carrière manuelle
            </h5>
            <div className="manual-header-actions">
              <Button
                color="light"
                className="notes-action-btn manual-add-btn"
                onClick={handleManualAddLine}
                style={{ marginBottom: "8px" }}
              >
                + Ajouter une ligne
              </Button>
            </div>
          </div>
          <div className="bilan-wrap manual-table-wrap">
            <div className="table-responsive">
              <table className="manual-table">
                <thead>
                  <tr>
                    <th className="col-year">Année</th>
                    <th className="col-large">Rémunération annuelle brute</th>
                    <th className="col-micro">TRIM</th>
                    <th className="col-micro">AR</th>
                    <th className="col-micro">TOT</th>
                    <th className="col-medium">CNAV</th>
                    <th className="col-medium">ARRCO</th>
                    <th className="col-ircantec">IRCANTEC</th>
                    <th className="col-medium">RCI</th>
                    <th className="col-medium">PER</th>
                    <th className="col-small">Tranche A</th>
                    <th className="col-small">Tranche B</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manualCareerRows.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td className="col-year">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          className={`manual-input ${row.errY ? "err" : ""}`}
                          value={row.annee ?? ""}
                          onChange={(e) => {
                            const v = e.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, 4);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, annee: v, errY: false }
                                  : r
                              )
                            );
                          }}
                          onBlur={(e) => {
                            const v = (e.target.value || "").trim();
                            const ok = /^\d{4}$/.test(v);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, errY: !ok } : r
                              )
                            );
                          }}
                          placeholder="2020"
                          aria-label="Année"
                        />
                      </td>
                      <td className="col-large">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`manual-input ${row.errR ? "err" : ""}`}
                          value={row.revenu ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, revenu: val, errR: false }
                                  : r
                              )
                            );
                          }}
                          onBlur={() => {
                            const raw = (row.revenu || "")
                              .toString()
                              .replace(/\s/g, "")
                              .replace(",", ".");
                            const num = parseFloat(raw);
                            const ok = !isNaN(num) && num >= 0;
                            const formatted = ok
                              ? new Intl.NumberFormat("fr-FR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(num)
                              : row.revenu;
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, revenu: formatted, errR: !ok }
                                  : r
                              )
                            );
                          }}
                          placeholder="0,00"
                          aria-label="Rémunération annuelle brute"
                        />
                      </td>
                      <td className="col-micro">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="manual-input"
                          value={row.trimBase ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setManualCareerRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, trimBase: "" } : r
                                )
                              );
                              return;
                            }
                            if (/^\d+$/.test(val)) {
                              let n = parseInt(val, 10);
                              if (n > 40) n = 40;
                              setManualCareerRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, trimBase: String(n) }
                                    : r
                                )
                              );
                            }
                          }}
                          placeholder="0"
                          aria-label="Trimestres de base"
                        />
                      </td>
                      <td className="col-micro">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="manual-input"
                          value={row.trimAR ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setManualCareerRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, trimAR: "" } : r
                                )
                              );
                              return;
                            }
                            if (/^\d+$/.test(val)) {
                              let n = parseInt(val, 10);
                              if (n > 40) n = 40;
                              setManualCareerRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, trimAR: String(n) }
                                    : r
                                )
                              );
                            }
                          }}
                          placeholder="0"
                          aria-label="Trimestres assimilés (AR)"
                        />
                      </td>
                      <td className="col-micro">
                        <span>
                          {(() => {
                            const a = parseInt(row.trimBase || "0", 10) || 0;
                            const b = parseInt(row.trimAR || "0", 10) || 0;
                            return a + b;
                          })()}
                        </span>
                      </td>
                      <td className="col-medium">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num"
                          value={row.cnavPoints ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, cnavPoints: val } : r
                              )
                            );
                          }}
                          aria-label="CNAV"
                          placeholder="Points"
                        />
                      </td>
                      <td className="col-medium">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num"
                          value={row.arrcoPoints ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, arrcoPoints: val } : r
                              )
                            );
                          }}
                          aria-label="ARRCO"
                          placeholder="Points"
                        />
                      </td>
                      <td className="col-ircantec">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num-left"
                          value={row.ircantecPoints ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, ircantecPoints: val }
                                  : r
                              )
                            );
                          }}
                          aria-label="IRCANTEC"
                          placeholder="Points"
                        />
                      </td>
                      <td className="col-medium">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num"
                          value={row.rciPoints ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, rciPoints: val } : r
                              )
                            );
                          }}
                          aria-label="RCI"
                          placeholder="Points"
                        />
                      </td>
                      <td className="col-medium">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num"
                          value={row.perPoints ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, perPoints: val } : r
                              )
                            );
                          }}
                          aria-label="PER"
                          placeholder="Points"
                        />
                      </td>
                      <td className="col-small">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num"
                          value={row.ta ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, ta: val } : r
                              )
                            );
                          }}
                          aria-label="Tranche A (TA)"
                        />
                      </td>
                      <td className="col-small">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="manual-num"
                          value={row.tb ?? ""}
                          onChange={(e) => {
                            const val = sanitizeSalaryInput(e.target.value);
                            setManualCareerRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, tb: val } : r
                              )
                            );
                          }}
                          aria-label="Tranche B (TB)"
                        />
                      </td>
                      <td className="actions-col">
                        <div className="manual-actions">
                          {idx > 0 && (
                            <button
                              type="button"
                              className="action-btn danger"
                              title="Supprimer la ligne"
                              onClick={() =>
                                setManualCareerRows((prev) =>
                                  prev.filter((r) => r && r.id !== row.id)
                                )
                              }
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="M10 11v6"></path>
                                <path d="M14 11v6"></path>
                                <path d="M9 6V4h6v2"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="manual-entry-actions mt-1">
            <Button
              color="primary"
              className="notes-action-btn manual-import-btn"
              onClick={handleManualImport}
            >
              Importer les données
            </Button>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={!!deleteConfirmTarget}
        toggle={() => setDeleteConfirmTarget(null)}
        centered
      >
        <ModalHeader toggle={() => setDeleteConfirmTarget(null)}>
          Confirmation
        </ModalHeader>
        <ModalBody>
          Êtes-vous sûr de vouloir supprimer{" "}
          {deleteConfirmTarget?.doc?.name
            ? `« ${deleteConfirmTarget.doc.name} »`
            : "ce document"}{" "}
          ?
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => setDeleteConfirmTarget(null)}
          >
            Annuler
          </Button>
          <Button color="danger" onClick={confirmDelete}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default NotesTab;
