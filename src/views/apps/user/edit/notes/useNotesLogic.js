import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  DEFAULT_DOC_URLS,
  generateDocId,
  loadStoredDocs,
  loadUploadedDocs,
  persistDocs,
  persistUploadedDocs,
  extractClientNames,
  convertRISToManualRows,
  wrapPlainTextAsHtml,
} from "./utils";
import { fetchRISAnalysis } from "../risService";

export const useNotesLogic = (id, perso) => {
  const [notes, setNotes] = useState(perso?.notes ?? "");
  const [originalNotes, setOriginalNotes] = useState(perso?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [uploadedDocs, setUploadedDocs] = useState(() => loadUploadedDocs(id));
  const [generatedDocs, setGeneratedDocs] = useState(() => loadStoredDocs(id));
  const [reportType, setReportType] = useState("pre");
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [fileToSend, setFileToSend] = useState(null);
  const [notePrompts, setNotePrompts] = useState([]);
  const [selectedNotePromptId, setSelectedNotePromptId] = useState("");
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [previousNotesSnapshot, setPreviousNotesSnapshot] = useState("");
  // Load n8nMessage from sessionStorage on mount (specific to client id)
  const [n8nMessage, setN8nMessage] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`notes_n8n_message_${id}`);
      return stored || "";
    } catch {
      return "";
    }
  });

  // Load selected tags from localStorage on mount
  const [selectedTags, setSelectedTags] = useState(() => {
    try {
      const stored = localStorage.getItem("notes_selected_analysis_tags");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // n8nCustomMessage is now local to the modal or passed directly
  const [viewingDoc, setViewingDoc] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportDoc, setReportDoc] = useState(null);
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
      cipavPoints: "",
      ta: "",
      tb: "",
      tc: "",
      errY: false,
      errR: false,
    },
  ]);

  const [isImportingRIS, setIsImportingRIS] = useState(false);
  const [userDocuments, setUserDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const cancelRef = useRef(null);

  const handleCancelGeneration = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current.cancel("Opération annulée par l'utilisateur");
      cancelRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // Fetch user documents from the server (for inline document picker)
  const fetchUserDocuments = useCallback(async () => {
    if (!id) return;
    setIsLoadingDocs(true);
    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };
      const response = await axios.get(
        `${global.config.server_url}/files?user_id=${id}`,
        Config,
      );
      const files = Array.isArray(response.data) ? response.data : [];
      setUserDocuments(files);
    } catch (err) {
      console.error("Erreur chargement documents utilisateur:", err);
      setUserDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [id]);

  // Select a document from the documents list (inline picker)
  const selectDocumentFromList = useCallback(
    async (file) => {
      if (!file || !file.id) return;
      try {
        toast.info("Chargement du document...");
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
          responseType: "blob",
        };
        const response = await axios.get(
          `${global.config.server_url}/downloadFile?file_id=${file.id}`,
          Config,
        );
        const blob = response.data;
        const fileObj = new File([blob], file.filename, {
          type: blob.type || "application/pdf",
        });
        setFileToSend(fileObj);

        // Persist to sessionStorage
        const reader = new FileReader();
        reader.onload = () => {
          const fileData = {
            name: fileObj.name,
            type: fileObj.type,
            dataUrl: reader.result,
          };
          sessionStorage.setItem(
            `notes_file_to_send_${id}`,
            JSON.stringify(fileData),
          );
        };
        reader.readAsDataURL(blob);

        toast.success(`"${file.filename}" chargé avec succès`);
      } catch (err) {
        console.error("Erreur sélection document:", err);
        toast.error("Impossible de charger le document sélectionné");
      }
    },
    [id],
  );

  const clientNames = useMemo(() => extractClientNames(perso), [perso]);
  const hasChanged = notes !== originalNotes;

  const persoNotes = perso?.notes;

  useEffect(() => {
    const incoming = persoNotes ?? "";
    setNotes(incoming);
    setOriginalNotes(incoming);
    setIsEditingNotes(false);
    setPreviousNotesSnapshot("");
  }, [id, persoNotes]);

  // Persist selected tags to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "notes_selected_analysis_tags",
        JSON.stringify(selectedTags),
      );
    } catch (e) {
      console.error("Failed to save selected tags:", e);
    }
  }, [selectedTags]);

  useEffect(() => {
    if (!id) return;
    try {
      const stored = sessionStorage.getItem(`notes_selected_prompt_${id}`);
      setSelectedNotePromptId(stored || "");
    } catch (e) {
      console.error("Failed to load selected note prompt:", e);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    try {
      sessionStorage.setItem(
        `notes_selected_prompt_${id}`,
        selectedNotePromptId,
      );
    } catch (e) {
      console.error("Failed to save selected note prompt:", e);
    }
  }, [selectedNotePromptId, id]);

  useEffect(() => {
    let isMounted = true;
    const fetchPrompts = async () => {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const response = await axios.get(
          `${global.config.server_url}/prompts`,
          Config,
        );
        const list = Array.isArray(response.data) ? response.data : [];
        if (isMounted) setNotePrompts(list);
      } catch (e) {
        console.error("Erreur chargement prompts notes:", e);
        if (isMounted) setNotePrompts([]);
      }
    };
    fetchPrompts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist n8nMessage to sessionStorage (specific to client id)
  useEffect(() => {
    if (!id) return;
    try {
      sessionStorage.setItem(`notes_n8n_message_${id}`, n8nMessage);
    } catch (e) {
      console.error("Failed to save n8nMessage:", e);
    }
  }, [n8nMessage, id]);

  // Restore fileToSend from sessionStorage on mount
  useEffect(() => {
    if (!id) return;
    const restoreFile = async () => {
      try {
        const storedFileData = sessionStorage.getItem(
          `notes_file_to_send_${id}`,
        );
        if (storedFileData) {
          const { name, type, dataUrl } = JSON.parse(storedFileData);
          // Convert base64 data URL back to File object
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], name, { type });
          setFileToSend(file);
        }
      } catch (e) {
        console.error("Failed to restore fileToSend:", e);
      }
    };
    restoreFile();
  }, [id]);

  // Listen for careerAnalysisFileReady event (from Documents component)
  useEffect(() => {
    if (!id) return;

    const handleCareerAnalysisFile = async (event) => {
      const { clientId, fileData } = event.detail || {};
      // Only process if the event is for this client
      if (clientId !== id || !fileData) return;

      try {
        const { name, type, dataUrl } = fileData;
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], name, { type });
        setFileToSend(file);
      } catch (e) {
        console.error(
          "Failed to load file from careerAnalysisFileReady event:",
          e,
        );
      }
    };

    window.addEventListener(
      "careerAnalysisFileReady",
      handleCareerAnalysisFile,
    );
    return () => {
      window.removeEventListener(
        "careerAnalysisFileReady",
        handleCareerAnalysisFile,
      );
    };
  }, [id]);

  const handleTagsChange = (selectedOptions) => {
    setSelectedTags(selectedOptions || []);
  };

  const handleGenerateNotesWithPrompt = useCallback(async () => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Clé Gemini manquante");
      return;
    }

    const selectedPrompt = notePrompts.find(
      (p) => String(p.id) === String(selectedNotePromptId),
    );
    if (!selectedPrompt?.prompt_text) {
      toast.error("Sélectionnez un prompt pour générer les notes");
      return;
    }

    setPreviousNotesSnapshot(notes || "");
    setIsGeneratingNotes(true);
    try {
      const model = "gemini-2.5-flash-preview-09-2025";
      const userSeed = notes?.trim()
        ? `Contexte (notes existantes) :\n${notes.trim()}`
        : "Génère des notes client exploitables et concises.";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userSeed }] }],
            systemInstruction: {
              parts: [{ text: selectedPrompt.prompt_text }],
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Erreur Gemini");
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (text) {
        setNotes(text);
        setIsEditingNotes(true);
      } else {
        toast.error("Réponse vide");
      }
    } catch (error) {
      toast.error("Erreur lors de la génération des notes");
    } finally {
      setIsGeneratingNotes(false);
    }
  }, [notePrompts, notes, selectedNotePromptId]);

  const handleRestorePreviousNotes = useCallback(() => {
    if (!previousNotesSnapshot) return;
    setNotes(previousNotesSnapshot);
    setIsEditingNotes(true);
  }, [previousNotesSnapshot]);

  // Charger les documents générés depuis l'API (au lieu du localStorage)
  useEffect(() => {
    const fetchGeneratedDocs = async () => {
      if (!id) return;

      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };

        const response = await axios.get(
          `${global.config.server_url}/files?user_id=${id}`,
          Config,
        );

        const files = Array.isArray(response.data) ? response.data : [];

        // Filtrer les rapports HTML (fichiers .html générés)
        const htmlReports = files
          .filter((f) => f.filename && f.filename.endsWith(".html"))
          .map((f) => ({
            id: f.id || generateDocId(),
            name: f.filename.replace(".html", "").replace(/_/g, " "),
            type: f.filename.toLowerCase().includes("specifique")
              ? "custom"
              : "pre",
            createdAt: f.created_at || new Date().toISOString(),
            url: f.url || "",
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setGeneratedDocs(htmlReports);
      } catch (err) {
        console.error("Erreur chargement documents:", err);
        // Fallback sur localStorage si l'API échoue
        setGeneratedDocs(loadStoredDocs(id));
      }
    };

    fetchGeneratedDocs();
    setUploadedDocs(loadUploadedDocs(id));
  }, [id]);

  // Persister en localStorage comme backup (optionnel)
  useEffect(() => {
    if (id && generatedDocs.length > 0) {
      persistDocs(id, generatedDocs);
    }
  }, [generatedDocs, id]);

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
          payload.pointsYear != null ? payload.pointsYear : payload.pointsTotal,
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
            cipavPoints: "",
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
        `Points ${eventType === "ARRCO_POINTS_SAVE" ? "ARRCO" : "IRCANTEC"} mis à jour`,
      );
    };
    window.addEventListener("message", handleComplementaryPointsMessage);
    return () =>
      window.removeEventListener("message", handleComplementaryPointsMessage);
  }, []);

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    if (!isEditingNotes) setIsEditingNotes(true);
  };

  const handleCancelNotesEdit = useCallback(() => {
    setNotes(originalNotes);
    setIsEditingNotes(false);
  }, [originalNotes]);

  const saveNotes = useCallback(async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    setIsSaving(true);
    try {
      await axios.put(
        `${global.config.server_url}/personal_information/${id}`,
        { notes },
        Config,
      );
      toast.info("Modifications enregistrées");
      setOriginalNotes(notes);
      setIsEditingNotes(false);
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

      const file = acceptedFiles[0];

      // On garde le fichier en mémoire pour l'affichage et l'envoi futur
      setFileToSend(file);

      // Persist file to sessionStorage as base64 for restoration later
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const fileData = {
            name: file.name,
            type: file.type,
            dataUrl: reader.result,
          };
          sessionStorage.setItem(
            `notes_file_to_send_${id}`,
            JSON.stringify(fileData),
          );
        };
        reader.readAsDataURL(file);
      } catch (e) {
        console.error("Failed to persist file to sessionStorage:", e);
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.set("user_id", id);
        acceptedFiles.forEach((file, index) =>
          formData.append(`photoUpload${index}`, file),
        );

        const Config = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "multipart/form-data",
          },
        };

        const response = await axios.post(
          `${global.config.server_url}/uploadFiles`,
          formData,
          Config,
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
            persistUploadedDocs(id, next);
            return next;
          });
          toast.success(
            files.length > 1 ? "Documents importés" : "Relevé importé",
          );
        }
      } catch {
        toast.error("Le téléversement a échoué");
      } finally {
        setIsUploading(false);
      }
    },
    [id],
  );

  // Clear fileToSend from state and sessionStorage
  const clearFileToSend = useCallback(() => {
    setFileToSend(null);
    try {
      sessionStorage.removeItem(`notes_file_to_send_${id}`);
    } catch (e) {
      console.error("Failed to clear fileToSend from sessionStorage:", e);
    }
  }, [id]);

  const handleGenerateDoc = useCallback(
    async (type, customMessage = "", previousHtml = "") => {
      const normalizedType =
        type === "consult" || type === "custom" ? type : "pre";
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
        return doc;
      }

      // 2) Cas "pre" ou "custom" : flux n8n + Laravel
      // Pour "pre", le fichier est obligatoire. Pour "custom", c'est juste du texte (optionnel ou non)
      // SI on est dans le modal (customMessage présent), on n'a pas forcément besoin de re-vérifier le fichier si c'est un flux 'custom' pur textuel.
      if (normalizedType !== "custom" && !fileToSend) {
        toast.error("Merci d'importer d'abord un RIS (PDF)");
        return null;
      }

      // Validation : nombre d'enfants
      const childrenCountVal = perso?.children_number;
      if (
        childrenCountVal === undefined ||
        childrenCountVal === null ||
        String(childrenCountVal).trim() === ""
      ) {
        toast.error(
          "Le nombre d'enfants est manquant. Veuillez le renseigner dans les informations du client.",
        );
        return;
      }

      // Validation : date de naissance
      const birthDateVal = perso?.birth_date;
      if (
        birthDateVal === undefined ||
        birthDateVal === null ||
        String(birthDateVal).trim() === ""
      ) {
        toast.error(
          "La date de naissance est manquante. Veuillez la renseigner dans les informations du client.",
        );
        return;
      }

      setIsGenerating(true);
      if (cancelRef.current) {
        cancelRef.current.cancel();
      }
      cancelRef.current = axios.CancelToken.source();

      try {
        // ---------- CALL 1 : FRONT → n8n (avec ou sans fichier) ----------
        const n8nFormData = new FormData();

        // On n'envoie le fichier QUE si on n'est PAS en "custom" (message spécifique)
        // et qu'il y a bien un fichier (requis pour le Standard)
        if (normalizedType !== "custom" && fileToSend) {
          n8nFormData.append("file", fileToSend);
        }

        let currentMessage = n8nMessage;
        let webhookUrl =
          "https://n8n.srv796541.hstgr.cloud/webhook/f012dfc7-8b2c-479f-af1f-20dcd44cda02";
        let docLabel = "Rapport pré-entretien";

        if (normalizedType === "custom") {
          currentMessage = customMessage;
          webhookUrl =
            "https://n8n.srv796541.hstgr.cloud/webhook/99dffa05-bf5f-44f3-884f-e748a968584d";
          docLabel = "Rapport spécifique";
        }

        // Ajout du nombre d'enfants et date de naissance au message n8n
        const childrenCount = perso?.children_number ?? "Non renseigné";
        const birthDate = perso?.birth_date ?? "Non renseignée";

        // Build the message with Quick Tags if selected
        const tagsPrefix =
          selectedTags.length > 0
            ? `Thématiques d'analyse : ${selectedTags.map((t) => t.label).join(", ")}\n\n`
            : "";
        const finalMessage =
          `${tagsPrefix}${currentMessage || ""}\n\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDate}`.trim();
        n8nFormData.append("message", finalMessage);

        // Ajout du contenu HTML précédent si disponible (pour les rapports spécifiques)
        if (previousHtml) {
          n8nFormData.append("previous_html", previousHtml);
        }

        // Ajout de l'ID client pour identification côté webhook
        if (id) {
          n8nFormData.append("client_id", id);
        }

        toast.info(
          `Analyse en cours (${normalizedType === "custom" ? "Spécifique" : "Standard"})…`,
        );

        const n8nResponse = await axios.post(webhookUrl, n8nFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          cancelToken: cancelRef.current.token,
        });

        let reportData = n8nResponse.data;

        let reportUrl = null;

        // On considère que TOUT ce qui revient du webhook est du contenu (HTML ou Texte)
        let contentString = "";

        // 1. Extraction du contenu (supporte Array ou Object)
        const rootData = Array.isArray(reportData) ? reportData[0] : reportData;

        if (typeof rootData === "string") {
          contentString = rootData;
        } else if (typeof rootData === "object" && rootData !== null) {
          if (rootData.html_report) {
            contentString = rootData.html_report;
          } else if (rootData.output) {
            contentString = rootData.output;
          } else if (rootData.html_report) {
            contentString = rootData.html_report;
          } else if (rootData.text) {
            contentString = rootData.text;
          } else if (rootData.response && typeof rootData.response === "object" && rootData.response.text) {
            contentString = rootData.response.text;
          } else if (rootData.response && typeof rootData.response === "string") {
            contentString = rootData.response;
          } else {
            contentString = JSON.stringify(reportData, null, 2);
          }
        } else {
          contentString = String(reportData);
        }

        // Fix n8n 2.x : dé-échapper si le contenu est une string JSON wrappée
        if (contentString && contentString.length > 2) {
          var trimmedContent = contentString.trim();
          if (trimmedContent.charAt(0) === '"' && trimmedContent.charAt(trimmedContent.length - 1) === '"') {
            try {
              contentString = JSON.parse(trimmedContent);
            } catch(e) {
              // pas une string JSON valide, on garde tel quel
            }
          }
          // Nettoyer les échappements résiduels (\n littéraux, \" etc.)
          if (typeof contentString === "string" && contentString.indexOf("\\n") !== -1) {
            contentString = contentString.split("\\n").join("\n");
            contentString = contentString.split("\\t").join("\t");
            contentString = contentString.split('\\"').join('"');
          }
        }

        // Nettoyage Markdown éventuel, au cas où
        contentString = contentString
          .replace(/^```html/i, "")
          .replace(/^```/i, "")
          .replace(/```$/i, "")
          .trim();

        // Si le contenu n'est pas du HTML, on l'encapsule dans un document HTML lisible et stylisé
        contentString = wrapPlainTextAsHtml(contentString);

        // 2. On utilise STRICTEMENT le contenu reçu, sans rien ajouter autour.
        // Si c'est du HTML, il sera affiché tel quel. Si c'est du texte brut, il est converti.

        // On crée un fichier HTML pour display
        const fileName = `Rapport_${normalizedType === "custom" ? "Specifique" : "Standard"
          }_${new Date().getTime()}.html`;
        const fileBlob = new Blob([contentString], {
          type: "text/html;charset=utf-8",
        });

        // On prépare l'upload vers /uploadFiles
        const uploadForm = new FormData();
        uploadForm.append("user_id", id);
        uploadForm.append("photoUpload0", fileBlob, fileName);

        const uploadConfig = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "multipart/form-data",
          },
        };

        try {
          const uploadRes = await axios.post(
            `${global.config.server_url}/uploadFiles`,
            uploadForm,
            { ...uploadConfig, cancelToken: cancelRef.current.token },
          );
          if (uploadRes?.data?.files?.[0]?.url) {
            reportUrl = uploadRes.data.files[0].url;
          } else {
            throw new Error(
              "Pas d'URL de fichier renvoyée lors de la sauvegarde",
            );
          }
        } catch (err) {
          console.error(err);
          toast.error("Impossible de sauvegarder le fichier du rapport");
          return;
        }

        const doc = {
          id: generateDocId(),
          name: `${docLabel} de ${clientNames.displayName}`,
          type: normalizedType,
          createdAt: new Date().toISOString(),
          url: reportUrl,
          htmlContent: contentString, // Stockage du contenu pour contourner CORS
        };

        setGeneratedDocs((prev) => [doc, ...(Array.isArray(prev) ? prev : [])]);
        toast.success(`${docLabel} généré avec succès`);
        return doc;
      } catch (error) {
        if (axios.isCancel(error)) {
          return null;
        }
        console.error(error);
        toast.error("Erreur lors de la génération du rapport");
        return null;
      } finally {
        setIsGenerating(false);
        cancelRef.current = null;
      }
    },
    [clientNames.displayName, fileToSend, id, n8nMessage, perso, selectedTags],
  );

  const handleSaveDoc = useCallback(
    async (docToSave) => {
      if (!docToSave || !docToSave.htmlContent) {
        toast.error("Aucun contenu à sauvegarder");
        return;
      }

      const fileName = `Rapport_Modifie_${new Date().getTime()}.html`;
      const fileBlob = new Blob([docToSave.htmlContent], {
        type: "text/html;charset=utf-8",
      });

      const uploadForm = new FormData();
      uploadForm.append("user_id", id);
      uploadForm.append("photoUpload0", fileBlob, fileName);

      const uploadConfig = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      };

      try {
        const uploadRes = await axios.post(
          `${global.config.server_url}/uploadFiles`,
          uploadForm,
          uploadConfig,
        );

        if (uploadRes?.data?.files?.[0]?.url) {
          const newUrl = uploadRes.data.files[0].url;

          // Update local state
          setGeneratedDocs((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const idx = safePrev.findIndex((d) => d.id === docToSave.id);
            if (idx !== -1) {
              const next = [...safePrev];
              next[idx] = {
                ...next[idx],
                url: newUrl,
                htmlContent: docToSave.htmlContent,
              };
              return next;
            }
            return safePrev;
          });

          // Update viewing doc if it matches
          if (viewingDoc && viewingDoc.id === docToSave.id) {
            setViewingDoc((prev) => ({
              ...prev,
              url: newUrl,
              htmlContent: docToSave.htmlContent,
            }));
          }

          toast.success("Modifications enregistrées avec succès");
        } else {
          throw new Error("Pas d'URL renvoyée");
        }
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors de l'enregistrement");
      }
    },
    [id, viewingDoc],
  );

  const handleOpenDoc = useCallback((doc) => {
    if (!doc || !doc.url) {
      toast.info("Aucun fichier disponible pour ce document");
      return;
    }
    // New behavior: Open modal
    setViewingDoc(doc);
    setChatMessage(""); // Reset Chat input
  }, []);

  const handleModalGenerate = async () => {
    if (!chatMessage.trim()) return;

    let htmlToSend = viewingDoc?.htmlContent || "";

    // Si pas de contenu local mais une URL, on tente de récupérer le HTML via le proxy
    if (!htmlToSend && viewingDoc?.url) {
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
          htmlToSend = response.data.html;
        }
      } catch (err) {
        console.warn("Impossible de récupérer le HTML contextuel:", err);
        // On continue sans le HTML, ou on pourrait bloquer/avertir l'utilisateur
      }
    }

    const newDoc = await handleGenerateDoc("custom", chatMessage, htmlToSend);
    if (newDoc) {
      setViewingDoc(newDoc);
      setChatMessage(""); // Clear input on success
    }
  };

  const handleDeleteDoc = useCallback(async (docId) => {
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      await axios.delete(`${global.config.server_url}/files/${docId}`, Config);
    } catch (e) {
      console.error("Erreur suppression document:", e);
      toast.error("Erreur lors de la suppression du document");
      return;
    }
    setGeneratedDocs((prev) =>
      Array.isArray(prev) ? prev.filter((doc) => doc && doc.id !== docId) : [],
    );
  }, []);

  const handleDeleteUpload = useCallback(
    (docId) => {
      setUploadedDocs((prev) => {
        const next = (Array.isArray(prev) ? prev : []).filter(
          (doc) => doc && doc.id !== docId,
        );
        persistUploadedDocs(id, next);
        return next;
      });
    },
    [id],
  );

  const handleRenameDoc = useCallback(
    (docId, newName) => {
      // Update generated docs
      setGeneratedDocs((prev) => {
        const idx = prev.findIndex((d) => d.id === docId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], name: newName };
          return next;
        }
        return prev;
      });

      // Update uploaded docs
      setUploadedDocs((prev) => {
        const idx = prev.findIndex((d) => d.id === docId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], name: newName };
          persistUploadedDocs(id, next);
          return next;
        }
        return prev;
      });
    },
    [id],
  );

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

  const handleDownloadPdf = useCallback(async () => {
    if (!viewingDoc) {
      toast.error("Aucun document sélectionné");
      return;
    }

    // CAS 1 : Le document a du htmlContent en mémoire (session courante) → génération locale
    if (viewingDoc.htmlContent) {
      try {
        toast.info("Génération du PDF en cours...");

        const htmlContent = viewingDoc.htmlContent;

        // Création d'un conteneur temporaire pour le rendu
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = "794px";
        container.style.backgroundColor = "white";
        container.style.color = "black";
        container.style.boxSizing = "border-box";
        container.style.padding = "0";
        container.style.margin = "0";

        const resetStyle = `
          <style>
            html, body { margin: 0; padding: 0; background: white; }
            * { box-sizing: border-box; }
          </style>
        `;

        const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*)<\/head>/i);
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);

        const headContent = headMatch ? headMatch[1] : "";
        const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

        container.innerHTML = resetStyle + headContent + bodyContent;

        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
          scale: 5,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProps = pdf.getImageProperties(imgData);
        let imgWidth = pdfWidth;
        let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Si l'image dépasse la hauteur de la page, on la redimensionne
        if (imgHeight > pdfHeight) {
          imgHeight = pdfHeight;
          imgWidth = (imgProps.width * pdfHeight) / imgProps.height;
        }

        // Centrer l'image si elle est plus petite que la largeur
        const xOffset = (pdfWidth - imgWidth) / 2;

        pdf.addImage(imgData, "PNG", xOffset, 0, imgWidth, imgHeight);

        const safeName = (viewingDoc.name || "document")
          .replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, "")
          .trim();
        pdf.save(`${safeName}.pdf`);

        document.body.removeChild(container);
        toast.success("PDF téléchargé avec succès !");
        return;
      } catch (error) {
        console.error("Erreur génération PDF locale:", error);
        toast.error("Erreur lors de la génération du PDF");
        return;
      }
    }

    // CAS 2 : Pas de htmlContent en mémoire mais on a une URL → proxy backend + génération PDF locale
    if (viewingDoc.url) {
      try {
        toast.info("Récupération du document...");

        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };

        // Appel au proxy backend pour récupérer le HTML (contourne CORS)
        const response = await axios.post(
          `${global.config.server_url}/fetch-html`,
          { url: viewingDoc.url },
          Config,
        );

        if (!response.data?.html) {
          throw new Error("Contenu HTML vide");
        }

        const htmlContent = response.data.html;

        toast.info("Génération du PDF...");

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = "794px";
        container.style.backgroundColor = "white";
        container.style.color = "black";
        container.style.boxSizing = "border-box";
        container.style.padding = "0";
        container.style.margin = "0";

        const resetStyle = `
          <style>
            html, body { margin: 0; padding: 0; background: white; }
            * { box-sizing: border-box; }
          </style>
        `;

        const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*)<\/head>/i);
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);

        const headContent = headMatch ? headMatch[1] : "";
        const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

        container.innerHTML = resetStyle + headContent + bodyContent;

        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
          scale: 3,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProps = pdf.getImageProperties(imgData);
        let imgWidth = pdfWidth;
        let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Si l'image dépasse la hauteur de la page, on la redimensionne
        if (imgHeight > pdfHeight) {
          imgHeight = pdfHeight;
          imgWidth = (imgProps.width * pdfHeight) / imgProps.height;
        }

        // Centrer l'image si elle est plus petite que la largeur
        const xOffset = (pdfWidth - imgWidth) / 2;

        pdf.addImage(imgData, "PNG", xOffset, 0, imgWidth, imgHeight);

        const safeName = (viewingDoc.name || "document")
          .replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, "")
          .trim();
        pdf.save(`${safeName}.pdf`);

        document.body.removeChild(container);
        toast.success("PDF téléchargé avec succès !");
        return;
      } catch (error) {
        console.error("Erreur téléchargement PDF backend:", error);
        toast.error(
          "Erreur lors du téléchargement du PDF. Veuillez régénérer le document.",
        );
        return;
      }
    }

    // CAS 3 : Ni htmlContent ni URL
    toast.error(
      "Ce document ne peut pas être téléchargé. Veuillez le régénérer.",
    );
  }, [viewingDoc]);

  const handleDownloadHtml = useCallback(async () => {
    if (!viewingDoc) return;

    let content = viewingDoc.htmlContent;

    if (!content && viewingDoc.url) {
      try {
        toast.info("Récupération du contenu HTML...");
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const response = await axios.post(
          `${global.config.server_url}/fetch-html`,
          { url: viewingDoc.url },
          Config,
        );
        if (response.data && response.data.html) {
          content = response.data.html;
        }
      } catch (e) {
        console.error(e);
        toast.error("Impossible de récupérer le contenu HTML");
        return;
      }
    }

    if (!content) {
      toast.error("Contenu vide ou introuvable");
      return;
    }

    // Rendre le HTML non-modifiable
    let nonEditableContent = content;

    // Ajouter contenteditable="false" sur le body s'il existe
    nonEditableContent = nonEditableContent.replace(
      /<body([^>]*)>/i,
      '<body$1 contenteditable="false">',
    );

    // Ajouter des styles et scripts pour bloquer l'édition
    const protectionCode = `
      <style>
        * {
          -webkit-user-modify: read-only !important;
          -moz-user-modify: read-only !important;
          user-select: text !important;
        }
        body, body * {
          cursor: default !important;
        }
      </style>
      <script>
        (function() {
          // Bloquer l'édition au chargement
          document.addEventListener('DOMContentLoaded', function() {
            document.body.contentEditable = 'false';
            document.designMode = 'off';

            // Empêcher toute modification
            document.body.addEventListener('input', function(e) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }, true);

            document.body.addEventListener('keydown', function(e) {
              if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                return;
              }
              if (e.ctrlKey || e.metaKey) {
                return;
              }
              if (e.target !== document.body && e.target.isContentEditable) {
                e.preventDefault();
                return false;
              }
            });
          });

          // Application immédiate
          if (document.body) {
            document.body.contentEditable = 'false';
            document.designMode = 'off';
          }
        })();
      </script>
    `;

    // Insérer avant la fermeture du head, ou au début du body si pas de head
    if (nonEditableContent.includes("</head>")) {
      nonEditableContent = nonEditableContent.replace(
        "</head>",
        protectionCode + "</head>",
      );
    } else if (nonEditableContent.includes("<body")) {
      nonEditableContent = nonEditableContent.replace(
        /<body([^>]*)>/,
        "<body$1>" + protectionCode,
      );
    } else {
      nonEditableContent = protectionCode + nonEditableContent;
    }

    const element = document.createElement("a");
    const file = new Blob([nonEditableContent], {
      type: "text/html",
    });
    element.href = URL.createObjectURL(file);
    element.download = (viewingDoc.name || "document") + ".html";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [viewingDoc]);

  const handleReportDoc = useCallback((doc) => {
    if (!doc) return;
    setReportDoc(doc);
    setReportDescription("");
    setReportModalOpen(true);
  }, []);

  const handleConfirmReport = useCallback(async () => {
    if (!reportDoc) return;

    // 1. Récupération de l'ID de l'admin (utilisateur connecté)
    let adminId = "unknown";
    try {
      const storedId = localStorage.getItem("userid");
      if (storedId) {
        adminId = storedId;
      } else {
        const userData = localStorage.getItem("userData");
        if (userData) {
          const parsed = JSON.parse(userData);
          if (parsed.id) adminId = parsed.id;
        }
      }
    } catch (e) {
      console.error("Erreur lecture admin ID", e);
    }

    // 2. Récupération du HTML (en mémoire ou via fetch)
    let htmlContent = reportDoc.htmlContent || "";

    if (!htmlContent && reportDoc.url) {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const response = await axios.post(
          `${global.config.server_url}/fetch-html`,
          { url: reportDoc.url },
          Config,
        );
        if (response.data && response.data.html) {
          htmlContent = response.data.html;
        }
      } catch (err) {
        console.warn(
          "Impossible de récupérer le HTML pour le signalement:",
          err,
        );
      }
    }

    // 3. Envoi au Webhook N8N
    const webhookUrl =
      "https://n8n.srv796541.hstgr.cloud/webhook/c55dcaca-466c-471c-bc3e-4df26c4b66ce";

    const toastId = toast.info("Envoi du signalement...", { autoClose: false });

    try {
      const formData = new FormData();
      formData.append("admin_id", adminId);
      formData.append("html_content", htmlContent);
      formData.append("error_message", reportDescription);
      formData.append("doc_name", reportDoc.name || "");
      formData.append("doc_id", reportDoc.id || "");
      formData.append("doc_type", reportDoc.type || "");
      formData.append("client_id", id);

      await axios.post(webhookUrl, formData);

      if (toast.dismiss) toast.dismiss(toastId);
      toast.success("Signalement envoyé avec succès");
    } catch (error) {
      console.error("Erreur envoi webhook signalement", error);
      if (toast.dismiss) toast.dismiss(toastId);
      toast.error(
        "Erreur technique lors de l'envoi (vérifiez la console pour CORS)",
      );
    }

    // Cleanup
    setReportModalOpen(false);
    setReportDoc(null);
    setReportDescription("");
  }, [reportDoc, reportDescription, id]);

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
        cipavPoints: "",
        ta: "",
        tb: "",
        tc: "",
        errY: false,
        errR: false,
      },
    ]);
  }, []);

  const handleManualImport = useCallback(async (options = {}) => {
    const { isCadre = false } = options;

    if (!fileToSend) {
      toast.error("Merci d'importer d'abord un RIS (PDF)");
      return;
    }

    const childrenCount = perso?.children_number;
    if (childrenCount === undefined || childrenCount === null || String(childrenCount).trim() === "") {
      toast.error("Le nombre d'enfants est manquant. Veuillez le renseigner dans les informations du client.");
      return;
    }

    const birthDate = perso?.birth_date;
    if (!birthDate || String(birthDate).trim() === "") {
      toast.error("La date de naissance est manquante. Veuillez la renseigner dans les informations du client.");
      return;
    }

    setIsImportingRIS(true);
    try {
      const tagsPrefix =
        selectedTags.length > 0
          ? `Thématiques d'analyse : ${selectedTags.map((t) => t.label).join(", ")}\n\n`
          : "";
      const finalMessage =
        `${tagsPrefix}${n8nMessage || ""}\n\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDate}`.trim();

      toast.info("Import des données RIS en cours…");

      const risData = await fetchRISAnalysis(fileToSend, finalMessage, id);
      const rows = convertRISToManualRows(risData, { isCadre });

      if (!rows.length) {
        toast.warn("Aucune donnée de carrière trouvée dans la réponse");
        return;
      }

      setManualCareerRows(rows);

      // Stocker les données RIS pour auto-remplir les simulateurs
      try {
        sessionStorage.setItem(
          `ris_import_data_${id}`,
          JSON.stringify({ risData, isCadre, timestamp: Date.now() })
        );
      } catch (e) {
        console.warn("Failed to store RIS data in sessionStorage:", e);
      }

      // Notifier les simulateurs déjà montés
      window.dispatchEvent(
        new CustomEvent("risImportComplete", {
          detail: { clientId: id, risData, isCadre },
        })
      );

      toast.success(`${rows.length} année(s) importée(s) depuis le RIS`);
    } catch (err) {
      console.error("Erreur import RIS:", err);
      toast.error("Erreur lors de l'import RIS");
    } finally {
      setIsImportingRIS(false);
    }
  }, [fileToSend, perso, selectedTags, n8nMessage, id]);

  return {
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
    generatedDocs,
    handleOpenDoc,
    requestDeleteGenerated,
    requestDeleteUploaded,
    handleRenameDoc,
    deleteConfirmTarget,
    setDeleteConfirmTarget, // Needed for modal toggle in UI
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
    isImportingRIS,
    fileToSend,
    clearFileToSend,
    handleSaveDoc,
    handleCancelGeneration,
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
  };
};
