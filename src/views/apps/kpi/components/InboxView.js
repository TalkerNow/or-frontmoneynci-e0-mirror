import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  PhoneIncoming,
  ClipboardList,
  XCircle,
  ArrowRight,
  User,
  Phone,
  Clock,
  Sparkles,
  Loader,
  CheckCircle,
  Eye,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { Badge } from "./SharedComponents";

const apiKey = "AIzaSyC6soRFcRFCXV65lJmSZPv5wfpbKsmFDZg";

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

// ========== ACTIONS SECTION COMPONENT ==========
const ActionsSection = () => {
  const [activeView, setActiveView] = useState("HOME");
  const [newCallReport, setNewCallReport] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [taskDateTime, setTaskDateTime] = useState("");

  // Load from localStorage on mount
  const [callReports, setCallReports] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_call_reports");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_tasks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const logs = []; // Logs can be added later if needed

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem("inbox_call_reports", JSON.stringify(callReports));
  }, [callReports]);

  useEffect(() => {
    localStorage.setItem("inbox_tasks", JSON.stringify(tasks));
  }, [tasks]);

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
  const handleAddCallReport = () => {
    if (!newCallReport.trim()) return;
    const newReport = {
      id: Date.now(),
      report: newCallReport.trim(),
      date: new Date().toISOString(),
    };
    setCallReports((prev) => [newReport, ...prev]);
    setNewCallReport("");
    setActiveView("HOME"); // Switch to history after adding
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now(),
      text: newTaskText.trim(),
      date: taskDateTime || new Date().toISOString(),
      done: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskText("");
    setTaskDateTime("");
    setActiveView("HOME"); // Switch to history after adding
  };

  // ===== EDIT STATE =====
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditText(item.report || item.text || "");
  };

  const handleSaveEdit = () => {
    if (!editText.trim() || !editingItem) return;

    if (editingItem.type === "CALLREPORT") {
      setCallReports((prev) =>
        prev.map((r) =>
          r.id === editingItem.id ? { ...r, report: editText.trim() } : r
        )
      );
    } else if (editingItem.type === "TASK") {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingItem.id ? { ...t, text: editText.trim() } : t
        )
      );
    }

    setEditingItem(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditText("");
  };

  const handleDeleteItem = (item) => {
    if (item.type === "CALLREPORT") {
      setCallReports((prev) => prev.filter((r) => r.id !== item.id));
    } else if (item.type === "TASK") {
      setTasks((prev) => prev.filter((t) => t.id !== item.id));
    }
  };

  // ===== MIXED LIST VIEW =====
  const renderMixedList = () => {
    const allItems = [
      ...callReports.map((r) => ({ ...r, type: "CALLREPORT" })),
      ...tasks.map((t) => ({ ...t, type: "TASK" })),
      ...logs.slice(0, 1).map((l) => ({ ...l, type: "LOG" })),
    ].slice(0, 5);

    if (allItems.length === 0) {
      return (
        <div style={emptyStateStyle}>
          <MessageSquare
            size={32}
            style={{ marginBottom: "8px", opacity: 0.5 }}
          />
          <p style={{ margin: 0, fontWeight: 500 }}>Aucune activité</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
            Les call reports et tâches apparaîtront ici
          </p>
        </div>
      );
    }

    return (
      <div>
        {allItems.map((item, index) => (
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
                    {item.report || item.text || item.message || "Élément"}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    {new Date(item.date).toLocaleDateString("fr-FR", {
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
    );
  };

  return (
    <div>
      {/* Icon Navigation Bar */}
      <div style={iconBarStyle}>
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
  const diffHours = (now - date) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return `Auj. ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (diffHours < 48) {
    return `Hier ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return date.toLocaleDateString("fr-FR");
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

// Helper: Extract contact info (email/phone) from messages content
function extractContactFromMessages(messages) {
  if (!messages || !Array.isArray(messages)) return { email: "", phone: "" };

  let email = "";
  let phone = "";

  // Simple regex for email and phone (FR format)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;

  // Look through user messages
  for (const m of messages) {
    if (m.role === "user" && m.content) {
      if (!email && emailRegex.test(m.content)) {
        const match = m.content.match(emailRegex);
        if (match) email = match[0];
      }
      if (!phone && phoneRegex.test(m.content)) {
        const match = m.content.match(phoneRegex);
        if (match) phone = match[0];
      }
    }
  }

  return { email, phone };
}

// Helper: Map conversation from backend to inbox item
function mapConversationToInboxItem(conv) {
  console.log("=== MAPPING CONVERSATION ===", conv);
  // Try to find user info in various places
  const user =
    conv.user ||
    conv.client ||
    conv.user_data ||
    conv.contact ||
    conv.visitor ||
    {};

  // Aggressively search for name fields
  const firstname =
    user.firstname ||
    user.first_name ||
    user.prenom ||
    conv.firstname ||
    conv.first_name ||
    conv.prenom ||
    conv.visitor_firstname ||
    conv.contact_firstname ||
    "";

  const lastname =
    user.lastname ||
    user.last_name ||
    user.nom ||
    conv.lastname ||
    conv.last_name ||
    conv.nom ||
    conv.visitor_lastname ||
    conv.contact_lastname ||
    "";

  let fullName = `${firstname} ${lastname}`.trim();

  // If we couldn't build a name, try combined name fields
  if (!fullName) {
    fullName =
      user.name ||
      user.full_name ||
      user.contact_name ||
      conv.name ||
      conv.full_name ||
      conv.contact_name ||
      conv.client_name ||
      conv.visitor_name ||
      conv.nom_prenom ||
      "";
  }

  // Extract from messages if metadata is missing
  const extracted = extractContactFromMessages(conv.messages);

  const phone =
    user.telephone ||
    user.phone ||
    conv.telephone ||
    conv.phone ||
    conv.client_phone ||
    extracted.phone ||
    "";

  const email =
    user.email || conv.email || conv.client_email || extracted.email || "";

  // Final fallback for display name
  const displayName = fullName || phone || email || "Prospect inconnu";

  return {
    id: conv.id,
    type:
      conv._source ||
      conv.type ||
      (conv.messages && conv.messages.length > 0 ? "chatbot" : "diagnostic"),
    name: displayName,
    email: email,
    phone: phone,
    date: formatRelativeDate(
      conv.created_at || conv.kpi_date || new Date().toISOString()
    ),
    score: conv.diagnostic_score || 0,
    summary: extractSummaryFromMessages(conv.messages),
    status: conv.status || conv.action || "new", // Fallback to action for KPIs
    priority: conv.priority || "medium",
    raw: conv,
  };
}

const InboxView = ({ items = [], loading, error, onSelect }) => {
  // Use provided items (no mock fallback), sorted by date (most recent first)
  const inboxItems =
    items && items.length > 0
      ? items.map(mapConversationToInboxItem).sort((a, b) => {
          const dateA = new Date(a.raw?.created_at || 0);
          const dateB = new Date(b.raw?.created_at || 0);
          return dateB - dateA; // Most recent first
        })
      : [];

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

  const [aiDraft, setAiDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Persist readIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("inbox_read_ids", JSON.stringify([...readIds]));
    } catch (e) {
      console.error("Failed to save read IDs:", e);
    }
  }, [readIds]);

  // Calculate unread count
  const unreadCount = inboxItems.filter(
    (item) => item.status === "new" && !readIds.has(item.id)
  ).length;

  // Modal state for conversation view
  const [showConversationModal, setShowConversationModal] = useState(false);

  // Update selectedItem when inboxItems change
  useEffect(() => {
    if (inboxItems.length > 0) {
      const currentInList = inboxItems.find((i) => i.id === selectedItem.id);
      if (!currentInList) {
        setSelectedItem(inboxItems[0]);
      }
    }
  }, [items, selectedItem.id]);

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
        selectedItem.type === "diagnostic" ? "Diagnostic en ligne" : "Chatbot"
      }
      - Points clés : ${selectedItem.summary?.join(", ")}
      ${
        selectedItem.type === "diagnostic"
          ? `- Score complexité : ${selectedItem.score}/100`
          : ""
      }
     
      TÂCHE : Rédige un email de premier contact.
    `;

    const result = await generateGeminiContent(prompt);
    setAiDraft(result);
    setIsGenerating(false);
  };

  const handleFeedbackSubmit = () => {
    setFeedbackSent(true);
    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackSent(false);
    }, 2000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "chatbot":
        return <MessageSquare size={14} className="text-blue-500" />;
      case "call":
        return <PhoneIncoming size={14} className="text-green-500" />;
      case "diagnostic":
        return <ClipboardList size={14} className="text-orange-500" />;
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
      case "diagnostic":
        return "orange";
      default:
        return "gray";
    }
  };

  // Inline styles for layout since Tailwind might not be fully available
  const containerStyle = {
    display: "flex",
    height: "calc(100vh - 180px)", // Adjust based on header/footer
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      {/* Left List */}
      <div
        style={{
          width: "33%",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
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
          ) : inboxItems.length === 0 ? (
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
            inboxItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  // Mark as read
                  setReadIds((prev) => new Set(prev).add(item.id));
                  if (onSelect) onSelect(item.id);
                }}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                  backgroundColor:
                    selectedItem.id === item.id ? "#eef2ff" : "transparent",
                  borderLeft: `4px solid ${
                    item.type === "diagnostic" ? "#f97316" : "#3b82f6"
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
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                      marginLeft: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.date.split(" ")[1]}
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
                  {item.status === "new" && !readIds.has(item.id) && (
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
                      Score: {item.score}
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
        style={{
          width: "67%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px", borderBottom: "1px solid #f3f4f6" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Badge color={getTypeColor(selectedItem.type)}>
                {getTypeLabel(selectedItem.type)}
              </Badge>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Reçu le {selectedItem.date} • Source: Site Web
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className=""
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
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <ArrowRight size={16} /> Convertir
              </button>
            </div>
          </div>

          <div>
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
              {selectedItem.type === "diagnostic" ? (
                <>
                  <User size={12} /> Nom du prospect
                </>
              ) : (
                <>
                  <Phone size={12} /> Téléphone du prospect
                </>
              )}
            </label>
            <div
              className="form-control"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9fafb",
              }}
            >
              <span style={{ fontWeight: 600, color: "#1f2937" }}>
                {selectedItem.type === "diagnostic"
                  ? selectedItem.name || "-"
                  : formatPhoneNumber(selectedItem.phone) || "-"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
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
                      {selectedItem.raw?.score || selectedItem.score || 0}/100
                    </span>
                  </div>
                </div>

                {/* Dates Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
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
                        fontSize: "11px",
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
                      {selectedItem.raw?.birth_date ||
                        selectedItem.raw?.date_naissance ||
                        "-"}
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
                        fontSize: "11px",
                        color: "#ea580c",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Départ souhaité
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#1f2937",
                      }}
                    >
                      {selectedItem.raw?.departure_date ||
                        selectedItem.raw?.date_depart ||
                        "-"}
                    </div>
                    {selectedItem.raw?.age_at_departure && (
                      <span
                        style={{
                          backgroundColor: "#fed7aa",
                          borderRadius: "999px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#9a3412",
                          marginLeft: "8px",
                        }}
                      >
                        ({selectedItem.raw.age_at_departure})
                      </span>
                    )}
                  </div>
                </div>

                {/* Repères Clés */}
                {(selectedItem.raw?.age_legal ||
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
                              fontSize: "11px",
                              color: "#6b7280",
                              marginBottom: "2px",
                            }}
                          >
                            🚩 Âge Légal
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
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {selectedItem.raw.age_legal_details || ""}
                          </div>
                        </div>
                      )}
                      {selectedItem.raw?.taux_plein_auto && (
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              marginBottom: "2px",
                            }}
                          >
                            🎯 Taux Plein Auto
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
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {selectedItem.raw.taux_plein_details || ""}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Analyse Stratégique (IA) */}
              {selectedItem.raw?.expert_analysis && (
                <div
                  style={{
                    backgroundColor: "#faf5ff",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                    border: "1px solid #e9d5ff",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#7c3aed",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Sparkles size={16} /> Analyse Stratégique (IA)
                  </h4>

                  {/* Profil Psychologique */}
                  {selectedItem.raw.expert_analysis.profile && (
                    <div
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "12px",
                        border: "1px solid #e9d5ff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#7c3aed",
                          fontWeight: 600,
                          marginBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        🧠 Profil Psychologique
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#1f2937",
                          marginBottom: "4px",
                        }}
                      >
                        Profil :{" "}
                        {selectedItem.raw.expert_analysis.profile.label}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          fontStyle: "italic",
                        }}
                      >
                        {selectedItem.raw.expert_analysis.profile.advice}
                      </div>
                    </div>
                  )}

                  {/* Pain Points, Mines, Leviers */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    {/* Point de Douleur */}
                    {selectedItem.raw.expert_analysis.pain_point && (
                      <div
                        style={{
                          backgroundColor: "#fef2f2",
                          borderRadius: "8px",
                          padding: "10px",
                          border: "1px solid #fecaca",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#dc2626",
                            marginBottom: "6px",
                            textTransform: "uppercase",
                          }}
                        >
                          🎯 Point de Douleur
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#1f2937",
                            marginBottom: "4px",
                          }}
                        >
                          {selectedItem.raw.expert_analysis.pain_point.title ||
                            "Écart Critique"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          {
                            selectedItem.raw.expert_analysis.pain_point
                              .description
                          }
                        </div>
                      </div>
                    )}

                    {/* Mines Enterrées */}
                    {selectedItem.raw.expert_analysis.hidden_mines && (
                      <div
                        style={{
                          backgroundColor: "#fefce8",
                          borderRadius: "8px",
                          padding: "10px",
                          border: "1px solid #fef08a",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#ca8a04",
                            marginBottom: "6px",
                            textTransform: "uppercase",
                          }}
                        >
                          💣 Mines Enterrées
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "14px",
                            fontSize: "11px",
                            color: "#6b7280",
                          }}
                        >
                          {(Array.isArray(
                            selectedItem.raw.expert_analysis.hidden_mines
                          )
                            ? selectedItem.raw.expert_analysis.hidden_mines
                            : [selectedItem.raw.expert_analysis.hidden_mines]
                          ).map((mine, i) => (
                            <li key={i} style={{ marginBottom: "4px" }}>
                              {mine}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Leviers */}
                    {selectedItem.raw.expert_analysis.levers && (
                      <div
                        style={{
                          backgroundColor: "#f0fdf4",
                          borderRadius: "8px",
                          padding: "10px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#16a34a",
                            marginBottom: "6px",
                            textTransform: "uppercase",
                          }}
                        >
                          🔧 Leviers
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "14px",
                            fontSize: "11px",
                            color: "#6b7280",
                          }}
                        >
                          {(Array.isArray(
                            selectedItem.raw.expert_analysis.levers
                          )
                            ? selectedItem.raw.expert_analysis.levers
                            : [selectedItem.raw.expert_analysis.levers]
                          ).map((lever, i) => (
                            <li key={i} style={{ marginBottom: "4px" }}>
                              {lever}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#eff6ff",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                border: "1px solid #dbeafe",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#1e40af",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <MessageSquare size={16} /> Résumé IA (Synthèse)
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
                        backgroundColor: "#60a5fa",
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    ></span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {/* View Full Conversation Button */}
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
                      color: "#6b7280",
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
                                msg.role === "user" ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "80%",
                                padding: "12px 16px",
                                borderRadius:
                                  msg.role === "user"
                                    ? "16px 16px 4px 16px"
                                    : "16px 16px 16px 4px",
                                backgroundColor:
                                  msg.role === "user" ? "#4f46e5" : "#f3f4f6",
                                color: msg.role === "user" ? "#fff" : "#374151",
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
                                fontSize: "11px",
                                color: "#9ca3af",
                                marginTop: "4px",
                                paddingLeft: msg.role === "user" ? "0" : "4px",
                                paddingRight: msg.role === "user" ? "4px" : "0",
                              }}
                            >
                              {msg.role === "user" ? "Visiteur" : "Chatbot"}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#9ca3af",
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

          {/* AI REPLY */}
          <div style={{ marginTop: "24px", marginBottom: "24px" }}>
            <div
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
                  🌠 Brouillon IA
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
            <ActionsSection />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxView;
