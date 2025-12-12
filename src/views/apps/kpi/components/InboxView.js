import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  PhoneIncoming,
  ClipboardList,
  XCircle,
  ArrowRight,
  User,
  Phone,
  Mail,
  Clock,
  Flag,
  Award,
  Sparkles,
  BrainCircuit,
  AlertOctagon,
  Bomb,
  TrendingUp,
  ThumbsDown,
  MessageCircleWarning,
  Send,
  Loader,
  Copy,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { Badge } from "./SharedComponents";
import ChatbotDetailView from "../ChatbotDetailView"; // Reusing the detail view if possible, or adapting the code provided
// Actually, the new code provides its own Detail View logic.
// I will adapt the PROVIDED code for InboxView, but integration with the *existing* ChatbotDetailView might be cleaner if they are similar.
// Looking at the provided code, it's quite specific. I will implement the PROVIDED InboxView logic fully here to be safe and match the "v2" request exactly.

const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";

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

// Mock Data (can be replaced by props later)
// No mock data - using real API data passed via props

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
      (m) => m.content.substring(0, 100) + (m.content.length > 100 ? "..." : "")
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
  // Try to find user info in various places
  const user = conv.user || conv.client || conv.user_data || {};

  // Aggressively search for name fields
  const firstname =
    user.firstname ||
    user.first_name ||
    user.prenom ||
    conv.firstname ||
    conv.first_name ||
    conv.prenom ||
    conv.nom_prenom || // Added from KPI JSON structure
    "";

  const lastname =
    user.lastname ||
    user.last_name ||
    user.nom ||
    conv.lastname ||
    conv.last_name ||
    conv.nom ||
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
      conv.nom_prenom || // Added from KPI JSON structure
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

const InboxView = ({ items = [], loading, error }) => {
  // Use provided items (no mock fallback)
  const inboxItems =
    items && items.length > 0 ? items.map(mapConversationToInboxItem) : [];

  // Initialize with first item to avoid empty object issues
  const [selectedItem, setSelectedItem] = useState(inboxItems[0] || {});
  const [aiDraft, setAiDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

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
            Conversations ({inboxItems.length})
          </h3>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>
            Trier par date
          </span>
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
                onClick={() => setSelectedItem(item)}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                  backgroundColor:
                    selectedItem.id === item.id ? "#eef2ff" : "transparent",
                  borderLeft:
                    selectedItem.id === item.id
                      ? "4px solid #4f46e5"
                      : "4px solid transparent",
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
                    {item.name}
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
                  {item.status === "new" && (
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
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
                <User size={12} /> Nom du prospect
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
                  {selectedItem.name}
                </span>
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
                <Phone size={12} /> Téléphone
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
                <span style={{ fontWeight: 500, color: "#374151" }}>
                  {selectedItem.phone || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
          {selectedItem.type === "diagnostic" ? (
            <div
              style={{
                backgroundColor: "#fff7ed",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                border: "1px solid #ffedd5",
              }}
            >
              {/* Diagnostic Content - simplified usage or full html */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-orange-800 uppercase tracking-wide flex items-center gap-2">
                  <ClipboardList size={18} /> Résultats du Diagnostic
                </h3>
                <span className="bg-white text-orange-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-orange-200">
                  Score: {selectedItem.score}/100
                </span>
              </div>
              {/* ... More details ... */}
              {selectedItem.expert_analysis && (
                <div className="mt-4 pt-4 border-t border-orange-200/50">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-purple-600" />
                    Analyse Stratégique (IA)
                  </h4>
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #f3e8ff",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#1f2937",
                      }}
                    >
                      {selectedItem.expert_analysis.profile.label}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#4b5563",
                        fontStyle: "italic",
                      }}
                    >
                      {selectedItem.expert_analysis.profile.advice}
                    </div>
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
            </div>
          )}

          {/* AI REPLY */}
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ fontWeight: 600, color: "#374151" }}>
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
                  <Sparkles size={14} /> ✨ Brouillon IA
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
                Generating...
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

          <div style={{ marginTop: "auto" }}>
            <h3
              style={{
                fontWeight: 600,
                color: "#374151",
                marginBottom: "12px",
              }}
            >
              Actions standards
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxView;
