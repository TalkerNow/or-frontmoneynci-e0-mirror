import React, { useState, useEffect } from "react";
import axios from "axios";
import { useHistory, useLocation } from "react-router-dom";
import {
  MessageSquare,
  ClipboardList,
  XCircle,
  ArrowRight,
  User,
  Phone,
  Clock,
  Star,
  Loader,
  CheckCircle,
  Eye,
  X,
  Edit2,
  Trash2,
  Brain,
  Target,
  AlertCircle,
  TrendingUp,
  Mail,
  FileText,
  EyeOff,
  Plus,
  Briefcase,
} from "lucide-react";
import { Badge } from "./SharedComponents";
import "./InboxView.css";
import SweetAlert from "react-bootstrap-sweetalert";

// Disqualification reasons
const DISQUALIFICATION_REASONS = [
  { value: "faux_numero", label: "Faux Numéro / Injoignable" },
  { value: "pas_budget", label: "Pas de budget / Trop cher" },
  { value: "hors_cible", label: "Hors Cible (Trop jeune / Déjà retraité)" },
  { value: "pas_interesse", label: "Pas intéressé / Refus" },
  { value: "doublon", label: "Doublon" },
  { value: "autre", label: "Autre" },
];

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

const EOR_SYSTEM_PROMPT = `
RÔLE : Tu es un Expert Senior en Retraite chez EOR. Tu assistes des commerciaux.

RÈGLES MÉTIER IMPÉRATIVES (A respecter sous peine de sanction) :
1. RÈGLE DE L'ÂGE LÉGAL & DÉCOTE :
   - Si la "Date Départ Souhaitée" est < à l'"Âge Légal", ce n'est PAS une question de décote. Le départ est LÉGALEMENT IMPOSSIBLE au taux plein classique.
   - EXCEPTION CRITIQUE : Si cette condition est remplie, tu dois OBLIGATOIREMENT suspecter une éligibilité "CARRIÈRE LONGUE" (RACL).
   - ACTION : Suggérer au commercial de vérifier les conditions RACL (5 trimestres avant 20 ans).

2. RÈGLE DES ENFANTS :
   - Si Enfants > 2, alerte sur la répartition des trimestres et la majoration 10%.

3. RÈGLE DU RIS (Relevé Individuel de Situation) :
   - Si le prospect n'a pas vérifié son RIS, c'est une "Mine Enterrée" (Risque critique d'erreur administrative).

TON & STYLE :
- Direct, Incisif, Orienté Vente.
- Utilise le vocabulaire technique précis (RACL, LURA, MICO) uniquement si pertinent.
`;

/**
 * Calculates a dynamic complexity score (0-100) based on diagnostic attributes.
 */
function calculateComplexityScore(attrs = {}) {
  let score = 30; // Base score

  // Q1: Number of companies
  const q1 = (attrs.SIMULATEUR_DIFFICULTE_Q1 || "").toString();
  if (q1.includes("9+")) score += 25;
  else if (q1.includes("4-9") || q1.includes("4–9")) score += 15;

  // Q2: Simultaneous companies
  if ((attrs.SIMULATEUR_DIFFICULTE_Q2 || "").toLowerCase() === "oui")
    score += 10;

  // Q3: Abroad career
  if ((attrs.SIMULATEUR_DIFFICULTE_Q3 || "").toLowerCase() === "oui")
    score += 20;

  // Q4: Career gaps (maladie, chomage)
  if ((attrs.SIMULATEUR_DIFFICULTE_Q4 || "").toLowerCase() === "oui")
    score += 10;

  // Q5: Specific regimes (Fonctionnaire/Contractuel)
  const q5 = (attrs.SIMULATEUR_DIFFICULTE_Q5 || "").toLowerCase();
  if (q5.includes("oui")) score += 15;

  // Q6: Independent / Manager
  if ((attrs.SIMULATEUR_DIFFICULTE_Q6 || "").toLowerCase() === "oui")
    score += 15;

  // Q8: RIS not checked
  if ((attrs.SIMULATEUR_DIFFICULTE_Q8 || "").toLowerCase() === "non")
    score += 15;

  return Math.min(100, score);
}

async function generateGeminiContent(userPrompt) {
  const fullPrompt = `${EOR_SYSTEM_PROMPT}\n\nDEMANDE UTILISATEUR : ${userPrompt}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
      }
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Désolé, je n'ai pas pu générer de réponse."
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Une erreur est survenue lors de la communication avec l'IA.";
  }
}

// ========== STRATEGIC ANALYSIS PROMPT ==========
const STRATEGIC_ANALYSIS_PROMPT = `
RÔLE : Tu es le Directeur Commercial d'un cabinet d'expertise retraite (EOR). Tu analyses des diagnostics bruts pour mâcher le travail de tes commerciaux. Ton seul but : donner des munitions pour le CLOSING.

ENTRÉE : Les données du diagnostic prospect (JSON ci-dessous).

TA MISSION : Analyse les données et génère un rapport JSON strict avec ces 4 clés. Sois incisif, direct et vendeur.

1. "profil_psy" (Le ton à adopter) :
   - Déduis la psychologie du prospect selon ses réponses.
   - Si beaucoup de "Je ne sais pas" = Profil "PERDU" (Besoin de pédagogie/Rassurance).
   - Si date départ irréaliste = Profil "RÊVEUR" (Besoin de recadrage expert).
   - Si données précises = Profil "CONTRÔLANT" (Besoin de technique).

2. "douleur_critique" (L'argument choc pour vendre) :
   - Compare la "Date Départ Souhaitée" avec la législation (Age légal 64 ans ou Taux plein 67 ans).
   - RÈGLE D'OR : Si le prospect veut partir AVANT l'âge légal (ex: 60-62 ans) sans être visiblement éligible Carrière Longue, c'est le point de douleur ultime. "Projet impossible en l'état".
   - Si le départ est imminent (< 2 ans) : La douleur est l'URGENCE administrative.

3. "mines_enterrees" (La complexité technique qui justifie nos honoraires) :
   - Liste sous forme de bullet points courts les risques d'erreurs détectés.
   - Mots clés à scanner : Service Militaire (risque oubli RIS), Enfants > 2 (complexité majoration), Carrière à l'étranger, Statut Indépendant/Chef d'entreprise.

4. "leviers_closing" (L'espoir/La solution) :
   - Liste les pistes d'optimisation.
   - Si "Départ souhaité < Age légal" -> Suggérer impérativement : "Vérifier éligibilité Carrière Longue (RACL)".
   - Si trous de carrière -> Suggérer : "Rachat de trimestres" ou "Récupération chômage non indemnisé".

FORMAT DE SORTIE ATTENDU (JSON EXCLUSIVEMENT) :
{
  "profil_psy": "Texte court",
  "douleur_critique": "Phrase choc",
  "mines_enterrees": ["Point 1", "Point 2"],
  "leviers_closing": ["Piste 1", "Piste 2"]
}
`;

async function generateStrategicAnalysis(diagnosticData) {
  const dataJson = JSON.stringify(diagnosticData, null, 2);
  const fullPrompt = `${STRATEGIC_ANALYSIS_PROMPT}\n\nDONNÉES DU PROSPECT :\n${dataJson}\n\nGénère le JSON d'analyse stratégique :`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
      }
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up the response and parse JSON
    const cleanedJson = textResult
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("Strategic Analysis Error:", error);
    return null;
  }
}

// Helper: Extract task text from the 'data' JSON field
function getTaskText(item) {
  // If it has a data field (from API), try to parse it
  if (item.data) {
    try {
      const parsed =
        typeof item.data === "string" ? JSON.parse(item.data) : item.data;
      return parsed.text || parsed.task_text || "";
    } catch {
      // If parsing fails, return data as-is if it's a string
      return typeof item.data === "string" ? item.data : "";
    }
  }
  // Fallback to other possible fields
  return item.task_text || item.text || "";
}

// ========== ACTIONS SECTION COMPONENT ==========
const ActionsSection = ({
  clientId,
  adminId,
  prospectId,
  type,
  prospectData = {},
}) => {
  const routerHistory = useHistory();
  const [activeView, setActiveView] = useState("HOME");
  const [newCallReport, setNewCallReport] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [taskDateTime, setTaskDateTime] = useState("");

  // Create Prospect Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingProspect, setIsCreatingProspect] = useState(false);
  const [prospectForm, setProspectForm] = useState({
    firstName: prospectData.firstName || "",
    lastName: prospectData.lastName || "",
    email: prospectData.email || "",
    phone: prospectData.phone || "",
  });

  // Update form if props change
  useEffect(() => {
    setProspectForm((prev) => ({
      ...prev,
      firstName: prospectData.firstName || "",
      lastName: prospectData.lastName || "",
      email: prospectData.email || "",
      phone: prospectData.phone || "",
    }));
  }, [prospectData]);
  const [localClientId, setLocalClientId] = useState(null);

  // Effective Client ID (prop or locally created)
  const effectiveClientId = clientId || localClientId;

  const isBlocked =
    !effectiveClientId &&
    (type === "chatbot" ||
      type === "diagnostic" ||
      type === "conversations-archives" ||
      type === "simulator-difficulty-result");

  // Determine the effective owner ID (Client or Prospect)
  const ownerId = effectiveClientId || prospectId;

  // API State for Call Reports
  const [callReports, setCallReports] = useState([]);
  const [, setIsLoadingReports] = useState(false);

  // API State for Tasks (no more localStorage)
  const [tasks, setTasks] = useState([]);
  const [, setIsLoadingTasks] = useState(false);

  const logs = []; // Logs can be added later if needed

  // Fetch Call Reports from API
  useEffect(() => {
    const fetchCallReports = async () => {
      // Allow fetching if we have either clientId or prospectId
      if (!ownerId) {
        setCallReports([]);
        return;
      }
      setIsLoadingReports(true);
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        // Attempt to fetch using the ownerId (whether client or prospect)
        const response = await axios.get(
          global.config.server_url + `/v1/call-reports/client/${ownerId}`,
          Config
        );
        // Ensure we handle array or wrapped object
        const reports = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        // Sort descending by date
        setCallReports(
          reports.sort(
            (a, b) =>
              new Date(b.created_at || b.date) -
              new Date(a.created_at || a.date)
          )
        );
      } catch (error) {
        console.error("Failed to fetch call reports", error);
        // Fallback to empty or toast error
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchCallReports();
  }, [ownerId]);

  // Fetch Tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      if (!ownerId) {
        setTasks([]);
        return;
      }
      setIsLoadingTasks(true);
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        // TEMPORARY TEST: Remove filter to see if base route works
        const response = await axios.get(
          global.config.server_url + `/v1/inbox-tasks`,
          Config
        );

        // Handle paginated response (Laravel standards)
        const tasksData = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];

        setTasks(
          tasksData.sort(
            (a, b) =>
              new Date(b.created_at || b.date) -
              new Date(a.created_at || a.date)
          )
        );
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [ownerId]);

  // ===== STYLES =====
  const iconButtonStyle = (isActive) => ({
    background: isActive ? "#eef2ff" : "none",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    color: isActive ? "#4f46e5" : "#6b7280",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const iconBarStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "8px 0",
    marginBottom: "16px",
    borderBottom: "1px solid #e5e7eb",
  };

  const viewContainerStyle = {
    padding: "8px 0",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginBottom: "12px",
    outline: "none",
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#4f46e5",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#f3f4f6",
    color: "#374151",
  };

  const emptyStateStyle = {
    textAlign: "center",
    padding: "24px 16px",
    color: "#9ca3af",
  };

  const listItemStyle = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
  };

  // ===== HANDLERS =====
  const handleAddCallReport = async () => {
    if (!newCallReport.trim()) return;

    if (!ownerId) {
      window.alert(
        "Erreur: Impossible d'identifier le client ou le prospect pour sauvegarder le rapport."
      );
      return;
    }

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };

      const payload = {
        client_id: ownerId,
        admin_id: adminId || localStorage.getItem("userid"),
        call_report: newCallReport.trim(),
      };
      // If we are strictly a prospect (no clientId but have prospectId), we might want to send prospect_id as well/instead
      // But based on plan, we try sending as client_id first.

      const response = await axios.post(
        global.config.server_url + "/v1/call-reports",
        payload,
        Config
      );

      // Add new report to state (use server response)
      const savedReport = response.data.data || response.data;
      setCallReports((prev) => [savedReport, ...prev]);

      setNewCallReport("");
      setActiveView("HOME"); // Switch to history after adding
    } catch (error) {
      console.error("Failed to add call report", error);
      window.alert("Erreur lors de la sauvegarde du rapport.");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    if (!ownerId) {
      window.alert(
        "Erreur: Impossible d'identifier le client ou le prospect pour sauvegarder la tâche."
      );
      return;
    }

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };

      const payload = {
        user_id: ownerId,
        admin_id: adminId || localStorage.getItem("userid"),
        data: JSON.stringify({ text: newTaskText.trim() }),
        date: taskDateTime
          ? taskDateTime.split("T")[0]
          : new Date().toISOString().split("T")[0],
      };

      const response = await axios.post(
        global.config.server_url + "/v1/inbox-tasks",
        payload,
        Config
      );

      // Add new task to state (use server response)
      const savedTask = response.data.data || response.data;
      setTasks((prev) => [savedTask, ...prev]);

      setNewTaskText("");
      setTaskDateTime("");
      setActiveView("HOME"); // Switch to history after adding
    } catch (error) {
      console.error("Failed to add task", error);
      window.alert("Erreur lors de la sauvegarde de la tâche.");
    }
  };

  const handleCreateProspect = async () => {
    const { firstName, lastName, email, phone } = prospectForm;

    if (!firstName || !lastName) {
      alert("Nom et prénom sont obligatoires");
      return;
    }

    setIsCreatingProspect(true);
    try {
      const token = localStorage.getItem("token");
      const currentUserId = localStorage.getItem("userid");
      const roleStr = (localStorage.getItem("role") || "").toLowerCase();
      const isConsultant = roleStr.includes("consultant");

      const parentId = isConsultant ? currentUserId : null;
      const businessIntroducerId = isConsultant ? null : currentUserId;

      // 1. Register User
      const registerPayload = {
        name: `${firstName} ${lastName}`,
        email: email || `prospect_${Date.now()}@placeholder.com`, // Fallback if email missing
        password: Math.random().toString(36).slice(-10) + "1!", // Random password
        role: "Prospect", // Keeping Prospect as requested initially.
        parent_id: parentId,
        business_introducer_id: businessIntroducerId,
      };

      const registerResponse = await axios.post(
        global.config.server_url + "/register",
        registerPayload,
        { headers: { Authorization: "Bearer " + token } }
      );

      if (registerResponse.data && registerResponse.data.user) {
        const newUserId = registerResponse.data.user.id;

        // 2. Add Personal Info
        const infoPayload = {
          id: newUserId,
          user_id: 10, // Legacy/Default
          first_name: firstName,
          last_name: lastName,
          email: email,
          mobile_number: phone,
          parent_id: parentId,
          business_introducer_id: businessIntroducerId,
          civility: "Monsieur", // Default
          martial_status: "Célibataire", // Default
        };

        await axios.post(
          global.config.server_url + "/personal_information",
          infoPayload,
          { headers: { Authorization: "Bearer " + token } }
        );

        // Success
        setLocalClientId(newUserId);
        setShowCreateModal(false);
        setActiveView("CALLREPORT"); // Switch to actions immediately

        // 3. Link User ID to Source Item (Chatbot or Simulator)
        try {
          if (type === "chatbot" || type === "conversations-archives") {
            await axios.put(
              global.config.server_url + `/conversation-archives/${prospectId}`,
              { user_id: newUserId },
              { headers: { Authorization: "Bearer " + token } }
            );
          } else if (
            type === "diagnostic" ||
            type === "simulator-difficulty-result"
          ) {
            await axios.put(
              global.config.server_url +
                `/v1/simulator-difficulty-results/${prospectId}`,
              { user_id: newUserId },
              { headers: { Authorization: "Bearer " + token } }
            );
          }
        } catch (linkError) {
          console.error("Failed to link user to source item:", linkError);
          // Non-blocking error, user is created anyway - show warning instead of success
          setWarningAlertMessage(
            "Prospect créé, mais la liaison avec la conversation a échoué. " +
              (linkError.response?.data?.message || linkError.message)
          );
          setWarningAlertVisible(true);
          return; // Don't show success if there was a link error
        }

        // Show success popup
        setSuccessAlertMessage(
          "Prospect créé avec succès ! Vous pouvez maintenant ajouter des actions."
        );
        setSuccessAlertVisible(true);
      }
    } catch (error) {
      console.error("Create Prospect Error:", error);
      setErrorAlertMessage(
        "Erreur lors de la création du prospect. " +
          (error.response?.data?.message || error.message)
      );
      setErrorAlertVisible(true);
    } finally {
      setIsCreatingProspect(false);
    }
  };

  // ===== EDIT STATE =====
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");

  const handleEditItem = (item) => {
    setEditingItem(item);
    if (item.type === "TASK") {
      setEditText(getTaskText(item));
    } else {
      setEditText(item.report || item.content || item.call_report || "");
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingItem) return;

    if (editingItem.type === "CALLREPORT") {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        // Ensure we send only allowed fields for update
        const updatePayload = {
          call_report: editText.trim(),
          // client_id & admin_id could be sent if they changed, strictly speaking only need to send what changed
        };

        await axios.put(
          global.config.server_url + `/v1/call-reports/${editingItem.id}`,
          updatePayload,
          Config
        );

        // Update local state
        setCallReports((prev) =>
          prev.map((r) =>
            r.id === editingItem.id
              ? {
                  ...r,
                  content: editText.trim(),
                  report: editText.trim(),
                  call_report: editText.trim(),
                }
              : r
          )
        );
      } catch (error) {
        console.error("Failed to update call report", error);
        window.alert("Erreur lors de la mise à jour du rapport.");
        return;
      }
    } else if (editingItem.type === "TASK") {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const updatePayload = {
          data: JSON.stringify({ text: editText.trim() }),
        };

        await axios.put(
          global.config.server_url + `/v1/inbox-tasks/${editingItem.id}`,
          updatePayload,
          Config
        );

        // Update local state
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingItem.id
              ? {
                  ...t,
                  data: JSON.stringify({ text: editText.trim() }),
                }
              : t
          )
        );
      } catch (error) {
        console.error("Failed to update task", error);
        window.alert("Erreur lors de la mise à jour de la tâche.");
        return;
      }
    }

    setEditingItem(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditText("");
  };

  // ===== DELETE STATE =====
  const [alertVisible, setAlertVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Success alert state for prospect creation
  const [successAlertVisible, setSuccessAlertVisible] = useState(false);
  const [successAlertMessage, setSuccessAlertMessage] = useState("");

  // Warning alert state for prospect creation with link error
  const [warningAlertVisible, setWarningAlertVisible] = useState(false);
  const [warningAlertMessage, setWarningAlertMessage] = useState("");

  // Error alert state for prospect creation failure
  const [errorAlertVisible, setErrorAlertVisible] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setAlertVisible(true);
  };

  const confirmDelete = async () => {
    setAlertVisible(false);
    if (!itemToDelete) return;

    const item = itemToDelete;

    if (item.type === "CALLREPORT") {
      try {
        const Config = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        };
        await axios.delete(
          global.config.server_url + `/v1/call-reports/${item.id}`,
          Config
        );
        setCallReports((prev) => prev.filter((r) => r.id !== item.id));
      } catch (error) {
        console.error("Failed to delete call report", error);
        window.alert("Erreur lors de la suppression du rapport.");
      }
    } else if (item.type === "TASK") {
      try {
        const Config = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        };
        await axios.delete(
          global.config.server_url + `/v1/inbox-tasks/${item.id}`,
          Config
        );
        setTasks((prev) => prev.filter((t) => t.id !== item.id));
      } catch (error) {
        console.error("Failed to delete task", error);
        window.alert("Erreur lors de la suppression de la tâche.");
      }
    }

    setItemToDelete(null);
  };

  // ===== FILTER STATE =====
  const [historyFilter, setHistoryFilter] = useState("ALL"); // ALL, CALLREPORT, TASK

  // ===== MIXED LIST VIEW =====
  const renderMixedList = () => {
    // Filter tasks by ownerId
    const visibleTasks = tasks.filter(
      (t) =>
        // Show task if it matches current owner
        t.ownerId === ownerId ||
        // legacy support: if strict isolation is desired, maybe DON'T show legacy tasks?
        // User said "chacun doit avoir un unique historique", so we should HIDE tasks that don't match.
        // But we must handle tasks created before this fix which have no ownerId.
        // If we hide them, they disappear forever for everyone.
        // Strategy: Only show if matches ownerId. Legacy tasks (undefined ownerId) will be hidden from specific views
        // effectively isolating the history.
        (t.ownerId === undefined && false) // Intentionally false to hide legacy mixed history
    );

    const allItems = [
      ...callReports.map((r) => ({ ...r, type: "CALLREPORT" })),
      ...visibleTasks.map((t) => ({ ...t, type: "TASK" })),
      ...logs.slice(0, 1).map((l) => ({ ...l, type: "LOG" })),
    ].sort(
      (a, b) =>
        new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
    );

    // Filter items based on active tab
    const filteredItems = allItems.filter((item) => {
      if (historyFilter === "ALL") return true;
      if (historyFilter === "CALLREPORT") return item.type === "CALLREPORT";
      if (historyFilter === "TASK") return item.type === "TASK";
      return true;
    });

    const callReportCount = allItems.filter(
      (i) => i.type === "CALLREPORT"
    ).length;
    const taskCount = allItems.filter((i) => i.type === "TASK").length;

    if (false) {
      // Skip empty check for now to allow showing tabs even if empty? Or showTabs then empty state.
      // Better: Render Tabs, then check if filteredItems is empty.
    }

    // Check if filtered items are empty but only AFTER rendering tabs
    const isEmpty = filteredItems.length === 0;

    return (
      <div>
        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "16px",
            gap: "24px",
          }}
        >
          <button
            onClick={() =>
              setHistoryFilter(
                historyFilter === "CALLREPORT" ? "ALL" : "CALLREPORT"
              )
            }
            style={{
              padding: "8px 0",
              background: "none",
              border: "none",
              borderBottom:
                historyFilter === "CALLREPORT"
                  ? "2px solid #7367f0"
                  : "2px solid transparent",
              color: historyFilter === "CALLREPORT" ? "#7367f0" : "#6b7280",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Call Reports{" "}
            <span style={{ opacity: 0.7 }}>({callReportCount})</span>
          </button>
          <button
            onClick={() =>
              setHistoryFilter(historyFilter === "TASK" ? "ALL" : "TASK")
            }
            style={{
              padding: "8px 0",
              background: "none",
              border: "none",
              borderBottom:
                historyFilter === "TASK"
                  ? "2px solid #7367f0"
                  : "2px solid transparent",
              color: historyFilter === "TASK" ? "#7367f0" : "#6b7280",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Tâches <span style={{ opacity: 0.7 }}>({taskCount})</span>
          </button>
        </div>

        {isEmpty ? (
          <div style={emptyStateStyle}>
            <MessageSquare
              size={32}
              style={{ marginBottom: "8px", opacity: 0.5 }}
            />
            <p style={{ margin: 0, fontWeight: 500 }}>Aucune activité</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
              Aucun élément dans cette catégorie
            </p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item, index) => (
              <div key={item.id || index} style={listItemStyle}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor:
                      item.type === "CALLREPORT"
                        ? "#3b82f615"
                        : item.type === "TASK"
                        ? "#f9731615"
                        : "#6b728015",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.type === "CALLREPORT" && (
                    <Phone size={16} color="#3b82f6" />
                  )}
                  {item.type === "TASK" && (
                    <CheckCircle size={16} color="#f97316" />
                  )}
                  {item.type === "LOG" && <Clock size={16} color="#6b7280" />}
                </div>

                {/* Edit Mode */}
                {editingItem?.id === item.id ? (
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{ ...inputStyle, marginBottom: "8px" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          ...buttonStyle,
                          padding: "6px 12px",
                          fontSize: "12px",
                        }}
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          ...secondaryButtonStyle,
                          padding: "6px 12px",
                          fontSize: "12px",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#374151",
                          fontWeight: 500,
                        }}
                      >
                        {item.type === "TASK"
                          ? getTaskText(item)
                          : item.call_report ||
                            item.content ||
                            item.report ||
                            item.message ||
                            "Élément"}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "12px",
                          color: "#9ca3af",
                        }}
                      >
                        {new Date(
                          item.created_at || item.date || Date.now()
                        ).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {/* Action Buttons */}
                    {item.type !== "LOG" && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={() => handleEditItem(item)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#6b7280",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#ef4444",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isBlocked) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          backgroundColor: "#f0f9ff", // Light blue
          borderRadius: "12px",
          border: "1px dashed #bae6fd", // Dashed blue border
          color: "#0369a1",
        }}
      >
        <User size={32} style={{ marginBottom: "12px", opacity: 0.8 }} />
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: "15px" }}>
          Créer un prospect pour pouvoir ajouter une action
        </p>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: "#7367f0", // Primary violet
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 4px rgba(115, 103, 240, 0.3)",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#5e50ee")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#7367f0")
          }
        >
          <Plus size={16} />
          Créer le prospect
        </button>

        {/* Modal Création Prospect */}
        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                width: "90%",
                maxWidth: "500px",
                padding: "24px",
                textAlign: "left",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "20px",
                  color: "#1f2937",
                }}
              >
                Créer un compte Prospect
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#374151",
                        marginBottom: "4px",
                      }}
                    >
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={prospectForm.firstName}
                      onChange={(e) =>
                        setProspectForm({
                          ...prospectForm,
                          firstName: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Prénom"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#374151",
                        marginBottom: "4px",
                      }}
                    >
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={prospectForm.lastName}
                      onChange={(e) =>
                        setProspectForm({
                          ...prospectForm,
                          lastName: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "4px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={prospectForm.email}
                    onChange={(e) =>
                      setProspectForm({
                        ...prospectForm,
                        email: e.target.value,
                      })
                    }
                    style={inputStyle}
                    placeholder="email@exemple.com"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "4px",
                    }}
                  >
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={prospectForm.phone}
                    onChange={(e) =>
                      setProspectForm({
                        ...prospectForm,
                        phone: e.target.value,
                      })
                    }
                    style={inputStyle}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    backgroundColor: "#dc3545",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateProspect}
                  disabled={isCreatingProspect}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    backgroundColor: "#7367f0",
                    border: "none",
                    color: "white",
                    fontWeight: 500,
                    cursor: "pointer",
                    opacity: isCreatingProspect ? 0.7 : 1,
                  }}
                >
                  {isCreatingProspect ? "Création..." : "Créer le prospect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Icon Navigation Bar */}
      <div className="header-flex-wrap" style={iconBarStyle}>
        <button
          style={iconButtonStyle(activeView === "HOME")}
          onClick={() => setActiveView("HOME")}
          title="Historique"
        >
          <MessageSquare size={20} />
        </button>
        <button
          style={iconButtonStyle(activeView === "CALLREPORT")}
          onClick={() => setActiveView("CALLREPORT")}
          title="Call Report"
        >
          <Phone size={20} />
        </button>
        <button
          style={iconButtonStyle(activeView === "TASK")}
          onClick={() => setActiveView("TASK")}
          title="Tâche"
        >
          <CheckCircle size={20} />
        </button>

        <button
          style={iconButtonStyle(false)}
          onClick={() =>
            routerHistory.push({
              pathname: "/kpi/opportunities",
              state: { fromInbox: true, conversationId: prospectId },
            })
          }
          title="Opportunités"
        >
          <Briefcase size={20} />
        </button>

        {ownerId && (
          <button
            style={{
              ...iconButtonStyle(false),
              color: "#059669",
              backgroundColor: "#d1fae5",
            }}
            onClick={() => routerHistory.push(`/app/user/edit/${ownerId}/2`)}
            title="Voir le profil complet"
          >
            <User size={20} />
          </button>
        )}
      </div>

      {/* Views */}
      <div style={viewContainerStyle}>
        {/* HOME View - Mixed List */}
        {activeView === "HOME" && renderMixedList()}

        {/* CALLREPORT View - Form */}
        {activeView === "CALLREPORT" && (
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Créer un Call Report
            </h4>
            <textarea
              placeholder="Saisissez votre call report..."
              value={newCallReport}
              onChange={(e) => setNewCallReport(e.target.value)}
              style={textareaStyle}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={buttonStyle} onClick={handleAddCallReport}>
                Ajouter
              </button>
              <button
                style={secondaryButtonStyle}
                onClick={() => setActiveView("HOME")}
              >
                Voir historique
              </button>
            </div>
          </div>
        )}

        {/* TASK View - Form */}
        {activeView === "TASK" && (
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Créer une tâche
            </h4>
            <textarea
              placeholder="Description de la tâche..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              style={textareaStyle}
            />
            <input
              type="date"
              value={taskDateTime}
              onChange={(e) => setTaskDateTime(e.target.value)}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
              style={{ ...inputStyle, width: "180px", cursor: "pointer" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={buttonStyle} onClick={handleAddTask}>
                Ajouter
              </button>
              <button
                style={secondaryButtonStyle}
                onClick={() => setActiveView("HOME")}
              >
                Voir historique
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert */}
      <SweetAlert
        warning
        title="Êtes-vous sûr ?"
        show={alertVisible}
        showCancel
        confirmBtnText="Oui, supprimer"
        cancelBtnText="Annuler"
        confirmBtnBsStyle="danger"
        cancelBtnBsStyle="primary"
        onConfirm={confirmDelete}
        onCancel={() => {
          setAlertVisible(false);
          setItemToDelete(null);
        }}
      >
        <p className="sweet-alert-text">
          Êtes-vous sûr de vouloir supprimer cet élément ?
        </p>
      </SweetAlert>

      {/* Success Alert for Prospect Creation */}
      <SweetAlert
        success
        title="Succès !"
        show={successAlertVisible}
        confirmBtnText="OK"
        confirmBtnBsStyle="success"
        onConfirm={() => setSuccessAlertVisible(false)}
      >
        <p className="sweet-alert-text">{successAlertMessage}</p>
      </SweetAlert>

      {/* Warning Alert for Prospect Creation with Link Error */}
      <SweetAlert
        warning
        title="Attention"
        show={warningAlertVisible}
        confirmBtnText="OK"
        confirmBtnBsStyle="warning"
        onConfirm={() => setWarningAlertVisible(false)}
      >
        <p className="sweet-alert-text">{warningAlertMessage}</p>
      </SweetAlert>

      {/* Error Alert for Prospect Creation Failure */}
      <SweetAlert
        error
        title="Erreur"
        show={errorAlertVisible}
        confirmBtnText="OK"
        confirmBtnBsStyle="danger"
        onConfirm={() => setErrorAlertVisible(false)}
      >
        <p className="sweet-alert-text">{errorAlertMessage}</p>
      </SweetAlert>
    </div>
  );
};

// Mock Data (can be replaced by props later)
// No mock data - using real API data passed via props

// Helper: Format phone number to French format (06 12 34 56 78)
function formatPhoneNumber(input) {
  if (!input) return "";
  // Remove all non-digit characters
  let digits = String(input).replace(/\D/g, "");

  // Handle international formats (+33, 0033, 33)
  if (digits.startsWith("33") && digits.length > 9) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 9 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }

  // Limit to 10 digits
  digits = digits.slice(0, 10);

  // Format as XX XX XX XX XX
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

// Helper: Format date to relative time
function formatRelativeDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();

  // Check if same day
  const isToday = date.toDateString() === now.toDateString();

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    // Today: show only time (HH:MM)
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (isYesterday) {
    // Yesterday: show "Hier" + time
    return `Hier ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  // Older: show date (DD/MM/YYYY)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Helper: Extract summary from messages
function extractSummaryFromMessages(messages) {
  if (!messages || messages.length === 0) return [];
  const userMessages = messages.filter((m) => m.role === "user");
  return userMessages
    .slice(0, 3)
    .map(
      (m) => m.content.substring(0, 50) + (m.content.length > 50 ? "..." : "")
    );
}

// Helper: Map conversation from backend to inbox item
function mapConversationToInboxItem(conv) {
  const type =
    conv._source ||
    conv.type ||
    (conv.messages && conv.messages.length > 0 ? "chatbot" : "diagnostic");

  let firstName = "";
  let lastName = "";
  let email = "";
  let phone = "";
  let attributes = conv.attributes || {};

  if (type === "diagnostic") {
    // DIAGNOSTIC MAPPING
    // We look for specific attributes keys known in the simulator
    firstName = attributes.PRENOM || attributes.prenom || "";
    lastName = attributes.NOM || attributes.nom || "";
    email = attributes.EMAIL || attributes.email || "";
    phone =
      attributes.TELEPHONE ||
      attributes.telephone ||
      attributes.TELEPHONE_MOBILE ||
      "";

    // Additional attributes specific fields if needed
    // Additional attributes specific fields if needed
    if (!phone) phone = conv.phone || conv.telephone || "";
    if (!email) email = conv.email || "";

    // Fallback: try to guess name from email if name is missing
    if ((!firstName || !lastName) && email) {
      const localPart = email.split("@")[0];
      // If it has a separator like dot or hyphen, might be First.Last
      const splitName = localPart.split(/[.-]/);
      if (splitName.length > 1) {
        firstName = firstName || splitName[0];
        lastName = lastName || splitName.slice(1).join(" ");
      } else if (!firstName && !lastName) {
        firstName = localPart;
      }
    }
  } else if (type === "chatbot") {
    // CHATBOT MAPPING
    const user = conv.user || conv.visitor || conv.contact || {};

    firstName =
      user.first_name || user.firstname || user.prenom || conv.firstname || "";
    lastName =
      user.last_name || user.lastname || user.nom || conv.lastname || "";
    email = user.email || conv.email || "";
    phone = user.phone || user.telephone || conv.phone || conv.telephone || "";

    // If structured data is missing, we must extract from messages (as seen in user logs)
    if (!email || !phone) {
      const messages = conv.messages || [];
      // Scan user messages one by one
      messages.forEach((msg) => {
        if (msg.role === "user" && msg.content) {
          const text = msg.content.trim();

          // EMAIL EXTRACTION
          if (!email) {
            const emailMatch = text.match(
              /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
            );
            if (emailMatch) {
              email = emailMatch[0];
            }
          }

          // PHONE EXTRACTION (0603263227 type pattern)
          if (!phone) {
            // Clean non-digits to check length
            const digits = text.replace(/\D/g, "");
            // Check if it looks like a standalone phone number (10 digits starting with 0, or international)
            // We check if the whole message is roughly just a phone number or contains one clearly
            const phoneMatch = text.match(
              /(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}/
            );
            if (phoneMatch) {
              phone = phoneMatch[0];
            } else if (digits.length === 10 && digits.startsWith("0")) {
              // Fallback for raw digits "0603263227"
              phone = digits;
            }
          }
        }
      });
    }

    // If name is not split, try user.name
    if (!firstName && !lastName) {
      const full = user.name || conv.name || "";
      if (full) {
        const parts = full.trim().split(" ");
        if (parts.length > 1) {
          lastName = parts.pop();
          firstName = parts.join(" ");
        } else {
          firstName = full;
        }
      } else if (email) {
        // Last resort: try to guess name from email (d-h@wanadoo.fr -> d-h)
        const localPart = email.split("@")[0];
        // If it has a separator like dot or hyphen, might be First.Last
        const splitName = localPart.split(/[.-]/);
        if (splitName.length > 1) {
          firstName = splitName[0];
          lastName = splitName.slice(1).join(" ");
        } else {
          firstName = localPart;
        }
      }
    }
  } else {
    // OTHER (Call, Email, etc.)
    const user = conv.user || conv.client || {};
    firstName = user.first_name || conv.client_first_name || "";
    lastName = user.last_name || conv.client_last_name || "";
    email = user.email || conv.email || conv.client_email || "";
    phone = user.phone || conv.phone || conv.client_phone || "";
  }

  // Construct Display Name
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = fullName || phone || email || "Prospect inconnu";

  const clientId =
    conv.user_id ||
    conv.user?.id ||
    conv.contact?.id ||
    conv.attributes?.user_id ||
    null;

  return {
    id: conv.id,
    clientId: clientId,
    type: type,
    name: displayName,
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    date: formatRelativeDate(
      conv.created_at || conv.kpi_date || new Date().toISOString()
    ),
    score: conv.diagnostic_score || 0,
    summary:
      conv.messages && conv.messages.length > 0
        ? extractSummaryFromMessages(conv.messages)
        : conv.note
        ? [conv.note]
        : conv.objet
        ? [conv.objet]
        : [],
    status: conv.status || conv.action || "new",
    priority: conv.priority || "medium",
    hasMultipleChannels: conv._hasMultipleChannels || false,
    raw: conv,
  };
}

const InboxView = ({
  items = [],
  filter = "all",
  loading,
  error,
  onSelect,
}) => {
  const routerHistory = useHistory();
  // Use provided items (no mock fallback), sorted by date (most recent first)
  // Memoize to ensure recalculation when items change
  const allInboxItems = React.useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.map(mapConversationToInboxItem).sort((a, b) => {
      const dateA = new Date(a.raw?.created_at || a.raw?.kpi_date || 0);
      const dateB = new Date(b.raw?.created_at || b.raw?.kpi_date || 0);
      return dateB - dateA; // Most recent first
    });
  }, [items]);

  // Filter by type if filter is specified
  // Memoize to ensure recalculation when filter or allInboxItems change
  const inboxItems = React.useMemo(() => {
    if (filter === "all") return allInboxItems;
    return allInboxItems.filter((item) => item.type === filter);
  }, [allInboxItems, filter]);

  const [selectedItem, setSelectedItem] = useState(inboxItems[0] || {});

  // Track read conversation IDs with localStorage persistence
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_read_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Track manually marked unread IDs to force blue dot
  const [manualUnreadIds, setManualUnreadIds] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_manual_unread_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [aiDraft, setAiDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showFeedback, setShowFeedback] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Persist readIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("inbox_read_ids", JSON.stringify([...readIds]));
    } catch (e) {
      console.error("Failed to save read IDs:", e);
    }
  }, [readIds]);

  // Persist manualUnreadIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "inbox_manual_unread_ids",
        JSON.stringify([...manualUnreadIds])
      );
    } catch (e) {
      console.error("Failed to save manual unread IDs:", e);
    }
  }, [manualUnreadIds]);

  // Calculate unread count
  const unreadCount = inboxItems.filter(
    (item) =>
      (item.status === "new" || manualUnreadIds.has(item.id)) &&
      !readIds.has(item.id)
  ).length;

  // Modal state for conversation view
  const [showConversationModal, setShowConversationModal] = useState(false);

  // Strategic Analysis state with localStorage persistence
  const [strategicAnalysisCache, setStrategicAnalysisCache] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_strategic_analyses");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Disqualify Modal state
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [disqualifyComment, setDisqualifyComment] = useState("");
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  // Track disqualified IDs to filter them out locally (Optimistic UI only, not persisted)
  const [disqualifiedIds, setDisqualifiedIds] = useState(new Set());

  // Filter out disqualified items from the visible list
  // We check both the local "disqualifiedIds" (optimistic) and the backend "invisible" flag (source of truth)
  const visibleInboxItems = inboxItems.filter(
    (item) =>
      !disqualifiedIds.has(item.id) &&
      !item.raw?.invisible && // Standard boolean
      item.raw?.invisible !== 1 && // Laravel/SQL integer boolean
      item.raw?.status !== "DISQUALIFIED" // Additional status check if needed
  );

  // Get current strategic analysis for selected item
  const strategicAnalysis = selectedItem?.id
    ? strategicAnalysisCache[selectedItem.id]
    : null;

  // Persist analyses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "inbox_strategic_analyses",
        JSON.stringify(strategicAnalysisCache)
      );
    } catch (e) {
      console.error("Failed to save analyses:", e);
    }
  }, [strategicAnalysisCache]);

  // Handler to generate strategic analysis
  const handleGenerateStrategicAnalysis = async () => {
    if (!selectedItem?.raw || !selectedItem?.id) return;
    setIsAnalyzing(true);

    const result = await generateStrategicAnalysis(selectedItem.raw);
    if (result) {
      setStrategicAnalysisCache((prev) => ({
        ...prev,
        [selectedItem.id]: result,
      }));
    } else {
      window.alert(
        "Erreur lors de la génération de l'analyse. Veuillez réessayer."
      );
    }
    setIsAnalyzing(false);
  };

  const handleDeleteStrategicAnalysis = () => {
    if (!selectedItem?.id) return;
    setStrategicAnalysisCache((prev) => {
      const newCache = { ...prev };
      delete newCache[selectedItem.id];
      return newCache;
    });
  };

  // Update selectedItem when visibleInboxItems change or filter changes
  const location = useLocation();

  useEffect(() => {
    if (location.state?.fromInbox && location.state?.conversationId) {
      const targetItem = allInboxItems.find(
        (item) => item.id === location.state.conversationId
      );
      console.log(
        "Restoring conversation:",
        location.state.conversationId,
        "Found:",
        !!targetItem
      );
      if (targetItem) {
        setSelectedItem(targetItem);
        // Clear state to avoid persistent redirect effect
        routerHistory.replace({ pathname: "/kpi/inbox", state: {} });
        return;
      }
    }

    if (visibleInboxItems.length > 0) {
      const currentInList = visibleInboxItems.find(
        (i) => i.id === selectedItem.id
      );
      if (!currentInList) {
        setSelectedItem(visibleInboxItems[0]);
      }
    }
  }, [
    items,
    selectedItem.id,
    disqualifiedIds,
    filter,
    visibleInboxItems,
    location.state,
    allInboxItems,
    routerHistory,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  useEffect(() => {
    setAiDraft(null);
    setIsGenerating(false);
    setShowFeedback(false);
    setFeedbackSent(false);
  }, [selectedItem]);

  const handleGenerateReply = async () => {
    setIsGenerating(true);
    setAiDraft(null);

    const prompt = `
      CONTEXTE DU PROSPECT :
      - Nom: ${selectedItem.name}
      - Type : ${
        selectedItem.type === "diagnostic"
          ? "Diagnostic en ligne"
          : selectedItem.type === "call"
          ? "Appel téléphonique"
          : selectedItem.type === "email"
          ? "Email de contact"
          : "Chatbot"
      }
      - Points clés : ${selectedItem.summary?.join(", ")}
      ${
        selectedItem.type === "diagnostic"
          ? `- Score complexité : ${calculateComplexityScore(
              selectedItem.raw?.attributes
            )}/100`
          : ""
      }
     
      TÂCHE : Rédige un email de premier contact.
    `;

    const result = await generateGeminiContent(prompt);
    setAiDraft(result);
    setIsGenerating(false);
  };

  // eslint-disable-next-line no-unused-vars
  const handleFeedbackSubmit = () => {
    setFeedbackSent(true);
    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackSent(false);
    }, 2000);
  };

  // Disqualify handlers
  const handleOpenDisqualifyModal = () => {
    setDisqualifyReason("");
    setDisqualifyComment("");
    setShowDisqualifyModal(true);
  };

  const handleCloseDisqualifyModal = () => {
    setShowDisqualifyModal(false);
    setDisqualifyReason("");
    setDisqualifyComment("");
  };

  const handleConfirmDisqualify = async () => {
    if (!disqualifyReason) {
      window.alert("Veuillez sélectionner un motif de disqualification.");
      return;
    }

    if (!selectedItem?.id) return;

    setIsDisqualifying(true);

    try {
      // API call to update status (soft delete / invisible)
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (
        selectedItem.type === "chatbot" ||
        selectedItem.type === "conversations-archives"
      ) {
        await axios.put(
          global.config.server_url +
            `/conversation-archives/${selectedItem.id}`,
          { invisible: true },
          config
        );
      } else if (
        selectedItem.type === "diagnostic" ||
        selectedItem.type === "simulator-difficulty-result"
      ) {
        await axios.put(
          global.config.server_url +
            `/v1/simulator-difficulty-results/${selectedItem.id}`,
          { invisible: true },
          config
        );
      } else {
        // Fallback for other types
        await fetch(
          `${
            process.env.REACT_APP_API_URL || window.location.origin
          }/api/prospects/${selectedItem.id}/disqualify`,
          {
            method: "PATCH",
            headers: config.headers,
            body: JSON.stringify({
              status: "DISQUALIFIED",
              disqualification_reason: disqualifyReason,
              disqualification_comment: disqualifyComment,
            }),
          }
        );
      }

      // Add to disqualified IDs to filter out from list
      setDisqualifiedIds((prev) => new Set([...prev, selectedItem.id]));

      // Close modal
      handleCloseDisqualifyModal();

      // Move to next item
      const currentIndex = visibleInboxItems.findIndex(
        (item) => item.id === selectedItem.id
      );
      const nextItem =
        visibleInboxItems[currentIndex + 1] || visibleInboxItems[0];
      if (nextItem && nextItem.id !== selectedItem.id) {
        setSelectedItem(nextItem);
      }

      // Show success toast (simple alert for now, can be replaced with toast library)
      // Using a custom toast-like notification
      const toast = document.createElement("div");
      toast.innerHTML = `
        <div style="
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          animation: slideIn 0.3s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Prospect disqualifié
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error("Disqualify error:", error);
      window.alert(
        "Une erreur est survenue. Le prospect a été marqué localement comme disqualifié."
      );

      // Still apply local update
      setDisqualifiedIds((prev) => new Set([...prev, selectedItem.id]));
      handleCloseDisqualifyModal();
    } finally {
      setIsDisqualifying(false);
    }
  };

  const handleMarkAsUnread = (e) => {
    e.stopPropagation();
    if (!selectedItem?.id) return;
    setReadIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(selectedItem.id);
      return newSet;
    });
    setManualUnreadIds((prev) => new Set(prev).add(selectedItem.id));

    // Optional: Feedback toast
    const toast = document.createElement("div");
    toast.innerHTML = `
        <div style="
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #3b82f6;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          animation: slideIn 0.3s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          Marqué comme non lu
        </div>
      `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "chatbot":
        return <MessageSquare size={14} className="text-blue-500" />;
      case "call":
        return <Phone size={14} className="text-green-500" />;
      case "email":
        return <Mail size={14} className="text-indigo-500" />;
      case "diagnostic":
        return <FileText size={14} className="text-orange-500" />;
      default:
        return <MessageSquare size={14} />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "chatbot":
        return "Chatbot";
      case "call":
        return "Appel";
      case "email":
        return "Email";
      case "diagnostic":
        return "Diagnostic";
      default:
        return "Autre";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "chatbot":
        return "blue";
      case "call":
        return "green";
      case "email":
        return "indigo";
      case "diagnostic":
        return "orange";
      default:
        return "gray";
    }
  };

  const handleConvert = () => {
    if (!selectedItem) return;

    // Helper to split name roughly
    const fullName = selectedItem.name || "";
    const nameParts = fullName.trim().split(" ");
    let firstName = "";
    let lastName = "";
    if (nameParts.length > 0) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    // Extract attributes
    const attrs = selectedItem.raw?.attributes || {};

    // Civility
    let civility = "";
    if (attrs.CIVILITE === "M") civility = "Monsieur";
    else if (attrs.CIVILITE === "Mme") civility = "Madame";

    // Date formatting
    const birthDateRaw =
      selectedItem.raw?.birth_date ||
      selectedItem.raw?.date_naissance ||
      attrs.DATE_NAISSANCE;
    let birth_date = null;
    if (birthDateRaw) {
      try {
        birth_date = new Date(birthDateRaw).toISOString().split("T")[0];
      } catch (e) {}
    }

    const prefillData = {
      first_name: firstName,
      last_name: lastName,
      email: selectedItem.email || attrs.EMAIL,
      mobile_number: selectedItem.phone || attrs.TELEPHONE,
      children_number: attrs.NBR_ENFANTS,
      birth_date: birth_date,
      military_service:
        attrs.SIMULATEUR_DIFFICULTE_Q11?.toLowerCase() === "oui"
          ? "oui"
          : "non",
      civility: civility,
    };

    routerHistory.push("/app/user/createUser", prefillData);
  };

  // Inline styles for layout since Tailwind might not be fully available
  const containerStyle = {
    display: "flex",
    height: "calc(100vh - 180px)",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  };

  return (
    <div className="inbox-container" style={containerStyle}>
      {/* Left List */}
      <div
        className="inbox-left-panel"
        style={{
          width: "380px",
          flexShrink: 0,
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #f3f4f6",
            backgroundColor: "#f9fafb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontWeight: 600, color: "#374151", margin: 0 }}>
            Non lus ({unreadCount})
          </h3>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#9ca3af",
                gap: "12px",
              }}
            >
              <Loader size={32} className="animate-spin" />
              <p>Chargement des conversations...</p>
            </div>
          ) : visibleInboxItems.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#9ca3af",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <MessageSquare
                size={48}
                style={{ marginBottom: "16px", color: "#d1d5db" }}
              />
              <p
                style={{
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Aucune conversation
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  maxWidth: "250px",
                }}
              >
                Les conversations avec vos clients apparaîtront ici
                automatiquement.
              </p>
            </div>
          ) : (
            visibleInboxItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                onClick={() => {
                  setSelectedItem(item);
                  // Mark as read
                  setReadIds((prev) => new Set(prev).add(item.id));
                  setManualUnreadIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                  });
                  if (onSelect) onSelect(item.id);
                }}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                  backgroundColor:
                    selectedItem.id === item.id ? "#eef2ff" : "transparent",
                  borderLeft: `4px solid ${
                    item.type === "diagnostic"
                      ? "#f97316"
                      : item.type === "call"
                      ? "#22c55e"
                      : item.type === "email"
                      ? "#6366f1"
                      : "#3b82f6"
                  }`,
                  transition: "background-color 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      color: item.status === "new" ? "#111827" : "#4b5563",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatPhoneNumber(item.name) || item.name}
                    {item.hasMultipleChannels && (
                      <span title="Multi-Canal" style={{ marginLeft: "6px" }}>
                        <span role="img" aria-label="fire">
                          🔥
                        </span>
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                      marginLeft: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.date}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  {getTypeIcon(item.type)}
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.summary[0]}
                  </span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {(item.status === "new" || manualUnreadIds.has(item.id)) &&
                    !readIds.has(item.id) && (
                      <span
                        style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          backgroundColor: "#3b82f6",
                          borderRadius: "50%",
                        }}
                      ></span>
                    )}
                  {item.type === "diagnostic" && (
                    <span
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#ffedd5",
                        color: "#c2410c",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 500,
                      }}
                    >
                      Score: {calculateComplexityScore(item.raw?.attributes)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Detail */}
      <div
        className="inbox-right-panel"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="responsive-padding"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div
            className="inbox-detail-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Badge color={getTypeColor(selectedItem.type)}>
                {getTypeLabel(selectedItem.type)}
              </Badge>
              {selectedItem.hasMultipleChannels && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background:
                      "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <span role="img" aria-label="fire">
                    🔥
                  </span>{" "}
                  Multi-Canal
                </span>
              )}
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Reçu le {selectedItem.date} • Source: EOR Consultant
              </span>
            </div>
            <div
              className="header-btn-stack"
              style={{ display: "flex", gap: "8px" }}
            >
              <button
                onClick={handleMarkAsUnread}
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  color: "#4b5563",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                title="Marquer comme non lu"
              >
                <EyeOff size={16} /> Non lu
              </button>
              <button
                onClick={handleOpenDisqualifyModal}
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  color: "#dc2626",
                  backgroundColor: "#fef2f2",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#fee2e2";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#fef2f2";
                }}
              >
                <XCircle size={16} /> Disqualifier
              </button>
              <button
                className=""
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  color: "white",
                  backgroundColor: "#4f46e5",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
                onClick={handleConvert}
              >
                <ArrowRight size={16} /> Convertir
              </button>
            </div>
          </div>

          {/* Header Prospect - 3 champs horizontaux */}
          <div
            className="inbox-header-fields"
            style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {/* Nom du prospect */}
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                <User size={12} /> Nom du prospect
              </label>
              <div
                className="form-control"
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#f9fafb",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#1f2937",
                  }}
                >
                  {selectedItem.name || "--"}
                </span>
              </div>
            </div>

            {/* Téléphone */}
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                <Phone size={12} /> Téléphone
              </label>
              <div
                className="form-control"
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#f9fafb",
                }}
              >
                <span style={{ fontWeight: 600, color: "#1f2937" }}>
                  {formatPhoneNumber(selectedItem.phone) || "--"}
                </span>
              </div>
            </div>

            {/* Email */}
            <div style={{ flex: 1, minWidth: "180px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                <Mail size={12} /> Email
              </label>
              <div
                className="form-control"
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#f9fafb",
                }}
              >
                <span style={{ fontWeight: 600, color: "#1f2937" }}>
                  {selectedItem.email || "--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="responsive-padding"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {selectedItem.type === "diagnostic" ? (
            <div>
              {/* Header with Score */}
              <div
                style={{
                  backgroundColor: "#fff7ed",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                  border: "1px solid #ffedd5",
                }}
              >
                <div
                  className="header-btn-stack"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#9a3412",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      margin: 0,
                    }}
                  >
                    <ClipboardList size={18} /> Résultats du Diagnostic
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {selectedItem.raw?.profile_type && (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                        }}
                      >
                        {selectedItem.raw.profile_type}
                      </span>
                    )}
                    <span
                      style={{
                        backgroundColor: "#fff",
                        border: "1px solid #fed7aa",
                        borderRadius: "999px",
                        padding: "6px 14px",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#ea580c",
                      }}
                    >
                      Score:{" "}
                      {calculateComplexityScore(selectedItem.raw?.attributes)}
                      /100
                    </span>
                  </div>
                </div>

                {/* Dates Row */}
                <div
                  className="diagnostic-grid"
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      padding: "12px",
                      border: "1px solid #fed7aa",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "15px",
                        color: "#ea580c",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Date de naissance
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#1f2937",
                      }}
                    >
                      {(() => {
                        const d =
                          selectedItem.raw?.birth_date ||
                          selectedItem.raw?.date_naissance ||
                          selectedItem.raw?.attributes?.DATE_NAISSANCE;
                        if (!d) return "-";
                        try {
                          return new Date(d).toLocaleDateString("fr-FR");
                        } catch {
                          return d;
                        }
                      })()}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      padding: "12px",
                      border: "1px solid #fed7aa",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "15px",
                        color: "#ea580c",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Départ souhaité
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#1f2937",
                        }}
                      >
                        {(() => {
                          const d =
                            selectedItem.raw?.departure_date ||
                            selectedItem.raw?.date_depart ||
                            selectedItem.raw?.attributes
                              ?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                          if (!d) return "-";
                          try {
                            return new Date(d).toLocaleDateString("fr-FR");
                          } catch {
                            return d;
                          }
                        })()}
                      </span>
                      {(() => {
                        const birthDate =
                          selectedItem.raw?.birth_date ||
                          selectedItem.raw?.date_naissance ||
                          selectedItem.raw?.attributes?.DATE_NAISSANCE;
                        const departDate =
                          selectedItem.raw?.departure_date ||
                          selectedItem.raw?.date_depart ||
                          selectedItem.raw?.attributes
                            ?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                        if (!birthDate || !departDate) return null;
                        try {
                          const birth = new Date(birthDate);
                          const depart = new Date(departDate);
                          let years =
                            depart.getFullYear() - birth.getFullYear();
                          let months = depart.getMonth() - birth.getMonth();
                          if (months < 0) {
                            years--;
                            months += 12;
                          }
                          return (
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#ea580c",
                              }}
                            >
                              ({years} ans
                              {months > 0 ? ` et ${months} mois` : ""})
                            </span>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* User Info Section */}
                {(() => {
                  const attrs = selectedItem.raw?.attributes || {};
                  const children = attrs.NBR_ENFANTS;
                  const military = attrs.SIMULATEUR_DIFFICULTE_Q11;
                  if (!children && !military) return null;
                  return (
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginBottom: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      {children != null && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            border: "1px solid #fed7aa",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <User size={16} color="#ea580c" />
                          <span style={{ fontSize: "15px", color: "#374151" }}>
                            <strong>{children}</strong> enfant
                            {parseInt(children) > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {military && military.toLowerCase() === "oui" && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            border: "1px solid #dcfce7",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <CheckCircle size={16} color="#16a34a" />
                          <span style={{ fontSize: "15px", color: "#374151" }}>
                            Service militaire effectué
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Repères Clés - Calculés */}
                {(() => {
                  const birthDate =
                    selectedItem.raw?.birth_date ||
                    selectedItem.raw?.date_naissance ||
                    selectedItem.raw?.attributes?.DATE_NAISSANCE;
                  if (!birthDate) return null;
                  try {
                    const birth = new Date(birthDate);
                    const birthYear = birth.getFullYear();
                    const legalAge = 64;
                    const legalDate = new Date(birth);
                    legalDate.setFullYear(birthYear + legalAge);
                    const tauxPleinAge = 67;
                    const tauxPleinDate = new Date(birth);
                    tauxPleinDate.setFullYear(birthYear + tauxPleinAge);
                    return (
                      <div
                        style={{
                          backgroundColor: "#f9fafb",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "16px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#374151",
                            marginBottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Clock size={14} /> REPÈRES CLÉS (CALCULÉS)
                        </div>
                        <div className="reperes-grid" style={{}}>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "4px",
                              }}
                            >
                              <Clock size={14} color="#ea580c" />
                              <span
                                style={{ fontSize: "12px", color: "#374151" }}
                              >
                                Âge Légal
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "#ea580c",
                              }}
                            >
                              {legalDate.toLocaleDateString("fr-FR")}
                            </div>
                            <div
                              style={{
                                fontSize: "15px",
                                color: "#374151",
                                fontWeight: 500,
                              }}
                            >
                              {legalAge} ans
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "4px",
                              }}
                            >
                              <Target size={14} color="#16a34a" />
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#374151",
                                  fontWeight: 600,
                                }}
                              >
                                Taux Plein Auto
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "#16a34a",
                              }}
                            >
                              {tauxPleinDate.toLocaleDateString("fr-FR")}
                            </div>
                            <div
                              style={{
                                fontSize: "15px",
                                color: "#374151",
                                fontWeight: 500,
                              }}
                            >
                              Automatique à {tauxPleinAge} ans
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })()}

                {/* Old API-based Repères (hidden if we calculated) */}
                {!(
                  selectedItem.raw?.birth_date ||
                  selectedItem.raw?.date_naissance ||
                  selectedItem.raw?.attributes?.DATE_NAISSANCE
                ) &&
                  (selectedItem.raw?.age_legal ||
                    selectedItem.raw?.taux_plein_auto) && (
                    <div
                      style={{
                        borderTop: "1px solid #fed7aa",
                        paddingTop: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#9a3412",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Clock size={14} /> Repères clés (calculés)
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                        }}
                      >
                        {selectedItem.raw?.age_legal && (
                          <div>
                            <div
                              style={{
                                fontSize: "15px",
                                color: "#374151",
                                marginBottom: "2px",
                              }}
                            >
                              <Clock
                                size={12}
                                style={{ marginRight: "4px", color: "#ea580c" }}
                              />{" "}
                              Âge Légal
                            </div>
                            <div
                              style={{
                                fontSize: "15px",
                                fontWeight: 700,
                                color: "#ea580c",
                              }}
                            >
                              {selectedItem.raw.age_legal}
                            </div>
                            <div style={{ fontSize: "15px", color: "#374151" }}>
                              {selectedItem.raw.age_legal_details || ""}
                            </div>
                          </div>
                        )}
                        {selectedItem.raw?.taux_plein_auto && (
                          <div>
                            <div
                              style={{
                                fontSize: "15px",
                                color: "#374151",
                                marginBottom: "2px",
                              }}
                            >
                              <Target
                                size={12}
                                style={{ marginRight: "4px", color: "#ea580c" }}
                              />{" "}
                              Taux Plein Auto
                            </div>
                            <div
                              style={{
                                fontSize: "15px",
                                fontWeight: 700,
                                color: "#ea580c",
                              }}
                            >
                              {selectedItem.raw.taux_plein_auto}
                            </div>
                            <div style={{ fontSize: "15px", color: "#374151" }}>
                              {selectedItem.raw.taux_plein_details || ""}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Questionnaire Responses */}
              {selectedItem.raw?.attributes && (
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "16px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <ClipboardList size={14} style={{ marginRight: "4px" }} />{" "}
                    Réponses au Questionnaire
                  </h3>

                  <div className="table-responsive">
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <tbody>
                        {/* Q1 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              width: "60%",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Combien d'entreprises durant votre carrière ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor: ["9+", "4-9", "4–9"].some((v) =>
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q1 || ""
                                )
                                  .toString()
                                  .includes(v)
                              )
                                ? "#dcfce7"
                                : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q1 || "—"}
                          </td>
                        </tr>

                        {/* Q2 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Travaillé dans plusieurs entreprises à la fois ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor:
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q2 || ""
                                ).toLowerCase() === "oui"
                                  ? "#dcfce7"
                                  : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q2 || "—"}
                          </td>
                        </tr>

                        {/* Q3 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Travaillé à l'étranger ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor:
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q3 || ""
                                ).toLowerCase() === "oui"
                                  ? "#dcfce7"
                                  : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q3 || "—"}
                          </td>
                        </tr>

                        {/* Q4 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Arrêt maladie, accident du travail ou chômage ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor:
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q4 || ""
                                ).toLowerCase() === "oui"
                                  ? "#dcfce7"
                                  : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q4 || "—"}
                          </td>
                        </tr>

                        {/* Q5 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Fonctionnaire, assimilé ou régimes spéciaux ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor: [
                                "oui_contractuel",
                                "oui_fonctionnaire",
                              ].includes(
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q5 || ""
                                ).toLowerCase()
                              )
                                ? "#dcfce7"
                                : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q5 || "—"}
                          </td>
                        </tr>

                        {/* Q6 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Profession libérale / gérant / chef d'entreprise ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor:
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q6 || ""
                                ).toLowerCase() === "oui"
                                  ? "#dcfce7"
                                  : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q6 || "—"}
                          </td>
                        </tr>

                        {/* Q7 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Sources de revenus complémentaires ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q7
                              ? selectedItem.raw.attributes.SIMULATEUR_DIFFICULTE_Q7.split(
                                  ","
                                ).map((v, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: "inline-block",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "999px",
                                      padding: "2px 8px",
                                      margin: "2px 4px 2px 0",
                                      fontSize: "15px",
                                      background: "#f8fafc",
                                    }}
                                  >
                                    {v.replace(/_/g, " ")}
                                  </span>
                                ))
                              : "—"}
                          </td>
                        </tr>

                        {/* Q8 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Consulté relevés de carrière (Assurance Retraite) ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor:
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q8 || ""
                                ).toLowerCase() === "non"
                                  ? "#dcfce7"
                                  : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q8 || "—"}
                          </td>
                        </tr>

                        {/* Q9 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Connaissance du rachat de trimestres ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q9 || "—"}
                          </td>
                        </tr>

                        {/* Q10 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Cumul emploi-retraite / cessation progressive ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q10
                              ? selectedItem.raw.attributes.SIMULATEUR_DIFFICULTE_Q10.split(
                                  ","
                                ).map((v, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: "inline-block",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "999px",
                                      padding: "2px 8px",
                                      margin: "2px 4px 2px 0",
                                      fontSize: "15px",
                                      background: "#f8fafc",
                                    }}
                                  >
                                    {v.replace(/_/g, " ")}
                                  </span>
                                ))
                              : "—"}
                          </td>
                        </tr>

                        {/* Q11 */}
                        <tr>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              fontSize: "15px",
                            }}
                          >
                            Service militaire ?
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor:
                                (
                                  selectedItem.raw.attributes
                                    .SIMULATEUR_DIFFICULTE_Q11 || ""
                                ).toLowerCase() === "oui"
                                  ? "#dcfce7"
                                  : "transparent",
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {selectedItem.raw.attributes
                              .SIMULATEUR_DIFFICULTE_Q11 || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Analyse Stratégique (IA) - Dynamic */}
              {selectedItem.type === "diagnostic" && (
                <div
                  style={{
                    backgroundColor: "#faf5ff",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                    border: "1px solid #e9d5ff",
                  }}
                >
                  <div
                    className="header-btn-stack"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#7c3aed",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        margin: 0,
                      }}
                    >
                      <Star size={16} /> Analyse Stratégique (IA)
                    </h4>
                    {!strategicAnalysis && !isAnalyzing && (
                      <button
                        onClick={handleGenerateStrategicAnalysis}
                        style={{
                          padding: "8px 16px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#7c3aed",
                          backgroundColor: "#fff",
                          border: "1px solid #c4b5fd",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Star size={14} /> Générer l'analyse
                      </button>
                    )}
                    {strategicAnalysis && !isAnalyzing && (
                      <button
                        onClick={handleDeleteStrategicAnalysis}
                        style={{
                          padding: "8px 16px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#dc2626",
                          backgroundColor: "#fff",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    )}
                  </div>

                  {/* Loading State */}
                  {isAnalyzing && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#7c3aed",
                      }}
                    >
                      <Loader
                        size={24}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      <p style={{ marginTop: "12px", fontSize: "13px" }}>
                        Analyse en cours...
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {strategicAnalysis && (
                    <>
                      {/* Profil Psychologique - Full Width Card */}
                      {strategicAnalysis.profil_psy && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            padding: "20px",
                            marginBottom: "16px",
                            border: "1px solid #f3f4f6",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "16px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#f5f3ff",
                              color: "#7c3aed",
                              borderRadius: "50%",
                              width: "44px",
                              height: "44px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Brain size={24} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#7c3aed",
                                marginBottom: "6px",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              Profil Psychologique
                            </div>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                color: "#1f2937",
                                marginBottom: "4px",
                              }}
                            >
                              Profil :{" "}
                              {strategicAnalysis.profil_psy.label ||
                                strategicAnalysis.profil_psy}
                            </div>
                            {strategicAnalysis.profil_psy.description && (
                              <div
                                style={{
                                  fontSize: "14px",
                                  color: "#6b7280",
                                  lineHeight: "1.5",
                                }}
                              >
                                {strategicAnalysis.profil_psy.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3-Column Grid for Pain/Mines/Levers */}
                      <div className="analysis-grid" style={{}}>
                        {/* Point de Douleur */}
                        {strategicAnalysis.douleur_critique && (
                          <div
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid #fee2e2",
                              borderLeft: "4px solid #dc2626",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#991b1b",
                                marginBottom: "12px",
                                textTransform: "uppercase",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                letterSpacing: "0.05em",
                              }}
                            >
                              <AlertCircle size={16} /> Point de Douleur
                            </div>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                color: "#1f2937",
                                marginBottom: "8px",
                              }}
                            >
                              {strategicAnalysis.douleur_critique.titre ||
                                "Argument Choc"}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                color: "#4b5563",
                                lineHeight: "1.5",
                              }}
                            >
                              {strategicAnalysis.douleur_critique.description ||
                                strategicAnalysis.douleur_critique}
                            </div>
                          </div>
                        )}

                        {/* Mines Enterrées */}
                        {strategicAnalysis.mines_enterrees && (
                          <div
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid #fef3c7",
                              borderLeft: "4px solid #d97706",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#92400e",
                                marginBottom: "12px",
                                textTransform: "uppercase",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                letterSpacing: "0.05em",
                              }}
                            >
                              <Target size={16} /> Mines Enterrées
                            </div>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: "18px",
                                fontSize: "14px",
                                color: "#4b5563",
                                lineHeight: "1.6",
                              }}
                            >
                              {strategicAnalysis.mines_enterrees.map(
                                (mine, i) => (
                                  <li key={i} style={{ marginBottom: "4px" }}>
                                    {mine.point || mine}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Leviers Closing */}
                        {strategicAnalysis.leviers_closing && (
                          <div
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid #d1fae5",
                              borderLeft: "4px solid #059669",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#065f46",
                                marginBottom: "12px",
                                textTransform: "uppercase",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                letterSpacing: "0.05em",
                              }}
                            >
                              <TrendingUp size={16} /> Leviers
                            </div>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: "18px",
                                fontSize: "14px",
                                color: "#4b5563",
                                lineHeight: "1.6",
                              }}
                            >
                              {strategicAnalysis.leviers_closing.map(
                                (levier, i) => (
                                  <li key={i} style={{ marginBottom: "4px" }}>
                                    {levier.piste || levier}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Empty State */}
                  {!strategicAnalysis && !isAnalyzing && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "16px",
                        color: "#374151",
                        fontSize: "15px",
                      }}
                    >
                      Cliquez sur "Générer l'analyse" pour obtenir un diagnostic
                      commercial personnalisé.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor:
                  selectedItem.type === "call" || selectedItem.type === "email"
                    ? "#f9fafb"
                    : "#eff6ff",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                border:
                  selectedItem.type === "call" || selectedItem.type === "email"
                    ? "1px solid #e5e7eb"
                    : "1px solid #dbeafe",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color:
                    selectedItem.type === "call" ||
                    selectedItem.type === "email"
                      ? "#374151"
                      : "#1e40af",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {selectedItem.type === "call" ||
                selectedItem.type === "email" ? (
                  <>
                    <ClipboardList size={16} /> Détails de l'échange
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} /> Résumé (Synthèse)
                  </>
                )}
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {selectedItem.summary?.map((point, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        marginTop: "6px",
                        width: "6px",
                        height: "6px",
                        backgroundColor:
                          selectedItem.type === "call" ||
                          selectedItem.type === "email"
                            ? "#9ca3af"
                            : "#60a5fa",
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    ></span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {/* View Full Conversation Button - Only for chatbot sessions */}
              {selectedItem.type === "chatbot" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "12px",
                  }}
                >
                  <button
                    onClick={() => setShowConversationModal(true)}
                    style={{
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      color: "#0369a1",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Eye size={14} /> Voir la conversation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Conversation Modal */}
          {showConversationModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
              onClick={() => setShowConversationModal(false)}
            >
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  width: "90%",
                  maxWidth: "600px",
                  maxHeight: "80vh",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Conversation complète
                  </h3>
                  <button
                    onClick={() => setShowConversationModal(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: "#374151",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body - Conversation */}
                <div
                  style={{
                    padding: "24px",
                    overflowY: "auto",
                    maxHeight: "calc(80vh - 80px)",
                  }}
                >
                  {selectedItem.raw?.messages?.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      {selectedItem.raw.messages
                        .filter((msg) => msg.role !== "system")
                        .map((msg, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems:
                                msg.role === "user" ? "flex-start" : "flex-end",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "80%",
                                padding: "12px 16px",
                                borderRadius:
                                  msg.role === "user"
                                    ? "16px 16px 16px 4px"
                                    : "16px 16px 4px 16px",
                                backgroundColor:
                                  msg.role === "user" ? "#f3f4f6" : "#4f46e5",
                                color: msg.role === "user" ? "#374151" : "#fff",
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "14px",
                                  lineHeight: 1.5,
                                }}
                              >
                                {msg.content}
                              </p>
                            </div>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#9ca3af",
                                marginTop: "4px",
                                paddingLeft: msg.role === "user" ? "4px" : "0",
                                paddingRight: msg.role === "user" ? "0" : "4px",
                              }}
                            >
                              {msg.role === "user" ? "Client" : "Chatbot"}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#374151",
                        padding: "32px",
                      }}
                    >
                      <MessageSquare
                        size={32}
                        style={{ marginBottom: "8px", opacity: 0.5 }}
                      />
                      <p>Aucun message dans cette conversation</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI REPLY - Hidden for call/email manually listed */}
          {selectedItem.type !== "call" && selectedItem.type !== "email" && (
            <div style={{ marginTop: "24px", marginBottom: "24px" }}>
              <div
                className="header-btn-stack"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    fontWeight: 600,
                    color: "#374151",
                    fontSize: "16px",
                    margin: 0,
                  }}
                >
                  Réponse Rapide
                </h3>
                {!aiDraft && !isGenerating && (
                  <button
                    onClick={handleGenerateReply}
                    className="btn-sm btn-light-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      borderRadius: "999px",
                    }}
                  >
                    <Star size={14} style={{ marginRight: "4px" }} /> Brouillon
                    IA
                  </button>
                )}
              </div>

              {isGenerating && (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  Génération...
                </div>
              )}

              {aiDraft && (
                <div
                  style={{
                    border: "1px solid #e9d5ff",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f3e8ff",
                      padding: "8px 16px",
                      borderBottom: "1px solid #e9d5ff",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#6b21a8",
                      }}
                    >
                      Suggestion IA
                    </span>
                    <XCircle
                      size={14}
                      style={{ cursor: "pointer", color: "#9333ea" }}
                      onClick={() => setAiDraft(null)}
                    />
                  </div>
                  <textarea
                    className="form-control"
                    style={{ border: "none", minHeight: "150px" }}
                    defaultValue={aiDraft}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions Section with Tabs */}
          <div
            style={{
              marginTop: "0",
              paddingTop: "24px",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            <h3
              style={{
                fontWeight: 600,
                color: "#374151",
                marginBottom: "16px",
                fontSize: "16px",
              }}
            >
              Actions standards
            </h3>

            {/* Tabs */}
            <ActionsSection
              clientId={selectedItem.clientId}
              prospectId={selectedItem.id} // Pass prospectId as fallback
              adminId={localStorage.getItem("userid")}
              type={selectedItem.type}
              prospectData={{
                firstName: selectedItem.firstName,
                lastName: selectedItem.lastName,
                email: selectedItem.email,
                phone: selectedItem.phone,
              }}
            />
          </div>
        </div>
      </div>

      {/* Disqualify Modal */}
      {showDisqualifyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            backdropFilter: "blur(2px)",
          }}
          onClick={handleCloseDisqualifyModal}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: "480px",
              margin: "16px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: "#fef2f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XCircle size={20} color="#dc2626" />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Disqualifier le prospect
                </h3>
              </div>
              <button
                onClick={handleCloseDisqualifyModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "6px",
                  color: "#6b7280",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                  e.currentTarget.style.color = "#111827";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: "1.6",
                }}
              >
                Vous êtes sur le point de disqualifier{" "}
                <strong style={{ color: "#111827" }}>
                  {selectedItem?.name}
                </strong>
                . Cette action ne supprimera pas le prospect mais le retirera de
                votre flux actif.
              </p>

              {/* Reason Select */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  Motif de disqualification{" "}
                  <span style={{ color: "#7367f0" }}>*</span>
                </label>
                <select
                  value={disqualifyReason}
                  onChange={(e) => setDisqualifyReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    color: disqualifyReason ? "#111827" : "#6b7280",
                    cursor: "pointer",
                    outline: "none",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#7367f0";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(115, 103, 240, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="" style={{ color: "#6b7280" }}>
                    Sélectionnez un motif...
                  </option>
                  {DISQUALIFICATION_REASONS.map((reason) => (
                    <option
                      key={reason.value}
                      value={reason.value}
                      style={{ color: "#111827" }}
                    >
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comment Textarea */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  Commentaire{" "}
                  <span style={{ color: "#6b7280", fontWeight: 400 }}>
                    (optionnel)
                  </span>
                </label>
                <textarea
                  value={disqualifyComment}
                  onChange={(e) => setDisqualifyComment(e.target.value)}
                  placeholder="Ajoutez un commentaire pour préciser le contexte..."
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    minHeight: "100px",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#7367f0";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(115, 103, 240, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer-responsive"
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: "12px",
                backgroundColor: "#f9fafb",
              }}
            >
              <button
                onClick={handleCloseDisqualifyModal}
                disabled={isDisqualifying}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#fff",
                  backgroundColor: isDisqualifying ? "#a5b4fc" : "#7367f0",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isDisqualifying ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isDisqualifying ? 0.5 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isDisqualifying) {
                    e.currentTarget.style.backgroundColor = "#5a4ed1";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDisqualifying) {
                    e.currentTarget.style.backgroundColor = "#7367f0";
                  }
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDisqualify}
                disabled={isDisqualifying || !disqualifyReason}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#fff",
                  backgroundColor:
                    isDisqualifying || !disqualifyReason
                      ? "#fca5a5"
                      : "#dc2626",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    isDisqualifying || !disqualifyReason
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseOver={(e) => {
                  if (!isDisqualifying && disqualifyReason) {
                    e.currentTarget.style.backgroundColor = "#b91c1c";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDisqualifying && disqualifyReason) {
                    e.currentTarget.style.backgroundColor = "#dc2626";
                  }
                }}
              >
                {isDisqualifying ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Disqualification...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Confirmer la disqualification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxView;
