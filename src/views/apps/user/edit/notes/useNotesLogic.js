import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "./utils";

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
  const [n8nMessage, setN8nMessage] = useState(() => {
    if (id) {
      return localStorage.getItem(`n8n_message_${id}`) || "";
    }
    return "";
  });
  const [messageLoadedId, setMessageLoadedId] = useState(id);

  // Load message from localStorage when id changes
  useEffect(() => {
    if (id && id !== messageLoadedId) {
      const saved = localStorage.getItem(`n8n_message_${id}`);
      setN8nMessage(saved || "");
      setMessageLoadedId(id);
    }
  }, [id, messageLoadedId]);

  // Save message to localStorage when it changes
  useEffect(() => {
    if (id && messageLoadedId === id) {
      localStorage.setItem(`n8n_message_${id}`, n8nMessage);
    }
  }, [n8nMessage, id, messageLoadedId]);

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

  const persoNotes = perso?.notes;

  useEffect(() => {
    const incoming = persoNotes ?? "";
    setNotes(incoming);
    setOriginalNotes(incoming);
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

  const handleTagsChange = (selectedOptions) => {
    setSelectedTags(selectedOptions || []);
  };

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
        } mis à jour`,
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
        Config,
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
            ? `Thématiques d'analyse : ${selectedTags
                .map((t) => t.label)
                .join(", ")}\n\n`
            : "";
        const finalMessage = `${tagsPrefix}${
          currentMessage || ""
        }\n\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDate}`.trim();
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
          `Analyse en cours (${
            normalizedType === "custom" ? "Spécifique" : "Standard"
          })…`,
        );

        const n8nResponse = await axios.post(webhookUrl, n8nFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
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
          if (rootData.output) {
            contentString = rootData.output;
          } else if (rootData.text) {
            contentString = rootData.text;
          } else {
            contentString = JSON.stringify(reportData, null, 2);
          }
        } else {
          contentString = String(reportData);
        }

        // Nettoyage Markdown éventuel, au cas où
        contentString = contentString
          .replace(/^```html/i, "")
          .replace(/^```/i, "")
          .replace(/```$/i, "")
          .trim();

        // 2. On utilise STRICTEMENT le contenu reçu, sans rien ajouter autour.
        // Si c'est du HTML, il sera affiché tel quel. Si c'est du texte, il sera affiché brut.

        // On crée un fichier HTML pour display
        const fileName = `Rapport_${
          normalizedType === "custom" ? "Specifique" : "Standard"
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
            uploadConfig,
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
        console.error(error);
        toast.error("Erreur lors de la génération du rapport");
        return null;
      } finally {
        setIsGenerating(false);
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
          uploadConfig
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
                htmlContent: docToSave.htmlContent
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
              htmlContent: docToSave.htmlContent // Ensure content is synced
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
    [id, viewingDoc]
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

  const handleDeleteDoc = useCallback((docId) => {
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
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 10) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

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
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 10) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

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

    const element = document.createElement("a");
    const file = new Blob([content], {
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

  return {
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
    fileToSend,
    handleSaveDoc,
  };
};
