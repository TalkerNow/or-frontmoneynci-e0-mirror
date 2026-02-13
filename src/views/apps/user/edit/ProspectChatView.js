import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Phone,
  Mail,
  ClipboardList,
  Loader,
  FileText,
  XCircle,
  MessageSquare,
  Star,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";
import {
  generateVisualReport,
  calculateComplexityScore,
  getTypeLabel,
  extractSummaryFromMessages,
} from "../../kpi/components/inbox/utils";
import VisualReportModal from "../../kpi/components/inbox/VisualReportModal";
import {
  getLatestDiagnostic,
  getDiagnosticAttributes,
} from "../../kpi/components/kanban/Modals/utils/diagnosticHelpers";
import {
  generateStrategicAnalysis,
  generateGeminiContent,
} from "../../kpi/components/inbox/api";
import DisqualifyModal from "../../kpi/components/inbox/DisqualifyModal";

// Import CSS for reperes-grid and app fonts
import "../../../../assets/scss/pages/inbox-responsive.scss";

const ProspectChatView = ({ user }) => {
  const [showVisualReport, setShowVisualReport] = useState(false);
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [disqualifyComment, setDisqualifyComment] = useState("");
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  const [strategicAnalysisCache, setStrategicAnalysisCache] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_strategic_analyses");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        "inbox_strategic_analyses",
        JSON.stringify(strategicAnalysisCache),
      );
    } catch (e) {
      console.error("Failed to save analyses:", e);
    }
  }, [strategicAnalysisCache]);

  const diagnostic = getLatestDiagnostic(user);
  const diagnosticRaw = diagnostic?.raw || diagnostic?.data || diagnostic;
  const diagnosticAttrs = diagnostic
    ? getDiagnosticAttributes(diagnosticRaw)
    : {};

  const hasDiagnostic = !!diagnostic;
  const chatbotArchive = user.conversation_archives?.[0] || null;
  const hasChatbot = !!chatbotArchive;
  const chatbotSummaryPoints = hasChatbot
    ? chatbotArchive.messages && chatbotArchive.messages.length > 0
      ? extractSummaryFromMessages(chatbotArchive.messages)
      : chatbotArchive.summary
        ? [chatbotArchive.summary]
        : []
    : [];
  const appFont = "'Montserrat', Helvetica, Arial, serif";
  const itemId = hasDiagnostic
    ? diagnostic.id
    : user.conversation_archives?.[0]?.id;
  const strategicAnalysis = itemId ? strategicAnalysisCache[itemId] : null;

  const onGenerateStrategicAnalysis = async () => {
    if (!diagnosticRaw || !itemId) return;
    setIsAnalyzing(true);
    const result = await generateStrategicAnalysis(diagnosticRaw);
    if (result) {
      setStrategicAnalysisCache((prev) => ({
        ...prev,
        [itemId]: result,
      }));
    }
    setIsAnalyzing(false);
  };

  const onDeleteStrategicAnalysis = () => {
    if (!itemId) return;
    setStrategicAnalysisCache((prev) => {
      const newCache = { ...prev };
      delete newCache[itemId];
      return newCache;
    });
  };

  const [aiDraft, setAiDraft] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const onGenerateAiReply = async () => {
    setIsGeneratingAi(true);
    const prompt = `Génère une réponse courte, empathique et professionnelle pour ce client qui a effectué un diagnostic retraite. Utilise son prénom ${user.first_name || ""} pour personnaliser. Propose un rendez-vous pour faire le point. Voici ses données de diagnostic: ${JSON.stringify(diagnosticAttrs)}`;
    const result = await generateGeminiContent(prompt);
    setAiDraft(result);
    setIsGeneratingAi(false);
  };

  const handleConfirmDisqualify = async () => {
    if (!disqualifyReason) return;
    setIsDisqualifying(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        global.config.server_url +
          `/v1/simulator-difficulty-results/${diagnostic.id}`,
        { invisible: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setShowDisqualifyModal(false);
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDisqualifying(false);
    }
  };

  const calculateAgeAtDate = (birth, target) => {
    if (!birth || !target) return "";
    const b = new Date(birth);
    const t = new Date(target);
    let years = t.getFullYear() - b.getFullYear();
    let months = t.getMonth() - b.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `(${years} ans${months > 0 ? ` et ${months} mois` : ""})`;
  };

  if (!hasDiagnostic && !hasChatbot) return null;

  const scoreNum = hasDiagnostic
    ? parseInt(calculateComplexityScore(diagnosticRaw), 10)
    : 0;
  const scoreColors =
    scoreNum < 30
      ? { bg: "#ffe5e5", color: "#d93025" }
      : scoreNum < 70
        ? { bg: "#fff4e5", color: "#ff9800" }
        : { bg: "#dcfce7", color: "#16a34a" };

  return (
    <div
      className="prospect-chat-view px-1"
      style={{ fontFamily: appFont, backgroundColor: "#fff", color: "#1f2937" }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 0",
          borderBottom: "1px solid #f3f4f6",
          marginBottom: "12px",
        }}
      >
        {/* Type badge + date */}
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {hasDiagnostic ? (
            <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "#fff7ed",
                  color: "#9a3412",
                  textTransform: "capitalize",
                }}
              >
                {getTypeLabel("diagnostic")}
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                Reçu le{" "}
                {(() => {
                  const d =
                    diagnosticRaw?.created_at ||
                    diagnosticRaw?.kpi_date ||
                    user?.created_at;
                  return d ? new Date(d).toLocaleDateString("fr-FR") : "-";
                })()}{" "}
                · Source: EOR Consultant
              </div>
            </>
          ) : hasChatbot ? (
            <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "#eff6ff",
                  color: "#1e40af",
                  textTransform: "capitalize",
                }}
              >
                {getTypeLabel("chatbot")}
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                Reçu le{" "}
                {(() => {
                  const d = chatbotArchive?.created_at || user?.created_at;
                  return d ? new Date(d).toLocaleDateString("fr-FR") : "-";
                })()}{" "}
                · Source: Chatbot EOR
              </div>
            </>
          ) : null}
        </div>

        {/* Contact fields - always visible */}
        <div className="row" style={{ margin: "0 -4px" }}>
          {[
            {
              label: "Nom du prospect",
              value:
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                "--",
              icon: <User size={12} />,
            },
            {
              label: "Téléphone",
              value: user.phone_number || "--",
              icon: <Phone size={12} />,
            },
            {
              label: "Email",
              value: user.email || "--",
              icon: <Mail size={12} />,
            },
          ].map((field, i) => (
            <div key={i} className="col-12 col-md-4 px-1 mb-1">
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
                {field.icon} {field.label}
              </label>
              <div
                className="form-control"
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  height: "auto",
                  padding: "8px 12px",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: i === 0 ? "16px" : "14px",
                    color: "#1f2937",
                  }}
                >
                  {field.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Card */}
      {hasDiagnostic && (
        <div
          style={{
            backgroundColor: "#fff7ed",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "16px",
            border: "1px solid #ffedd5",
            position: "relative",
          }}
        >
          {/* Top bar with buttons and score */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#9a3412",
                textTransform: "uppercase",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ClipboardList size={18} /> RÉSULTATS DU DIAGNOSTIC
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setShowVisualReport(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1e3a8a",
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  border: "1px solid #bfdbfe",
                  cursor: "pointer",
                }}
              >
                <FileText size={14} /> Rapport Visuel
              </button>
              <span
                style={{
                  backgroundColor: scoreColors.bg,
                  borderRadius: "999px",
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: scoreColors.color,
                }}
              >
                Score : {scoreNum}/100
              </span>
            </div>
          </div>

          <div
            className="diagnostic-grid"
            style={{
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {[
              {
                label: "Date de naissance",
                value:
                  diagnosticRaw?.birth_date ||
                  diagnosticRaw?.date_naissance ||
                  diagnosticAttrs?.DATE_NAISSANCE,
              },
              {
                label: "Départ souhaité",
                value:
                  diagnosticRaw?.departure_date ||
                  diagnosticRaw?.date_depart ||
                  diagnosticAttrs?.SIMULATEUR_DIFFICULTE_DATE_DEPART,
                showAge: true,
              },
            ].map((d, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #fed7aa",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#ea580c",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  {d.label}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#1f2937",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                  }}
                >
                  {d.value
                    ? new Date(d.value).toLocaleDateString("fr-FR")
                    : "-"}
                  {d.showAge && d.value && (
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#ea580c",
                      }}
                    >
                      {calculateAgeAtDate(
                        diagnosticRaw?.birth_date ||
                          diagnosticRaw?.date_naissance ||
                          diagnosticAttrs?.DATE_NAISSANCE,
                        d.value,
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(() => {
            const children =
              diagnosticAttrs.NBR_ENFANTS ||
              diagnosticRaw?.attributes?.NBR_ENFANTS;
            const military =
              (
                diagnosticAttrs.SIMULATEUR_DIFFICULTE_Q11 ||
                diagnosticRaw?.attributes?.SIMULATEUR_DIFFICULTE_Q11
              )?.toLowerCase() === "oui";
            if (!children && !military) return null;
            return (
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
              >
                {children != null && (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #fed7aa",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <User size={16} color="#ea580c" />{" "}
                    <span>
                      <strong>{children}</strong> enfant
                      {parseInt(children) > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {military && (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #dcfce7",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <CheckCircle size={16} color="#16a34a" />{" "}
                    <span>Service militaire effectué</span>
                  </div>
                )}
              </div>
            );
          })()}

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
              {[
                {
                  label: "Âge Légal",
                  age: 64,
                  color: "#ea580c",
                  icon: <Clock size={14} color="#ea580c" />,
                },
                {
                  label: "Taux Plein Auto",
                  age: 67,
                  color: "#16a34a",
                  icon: <Target size={14} color="#16a34a" />,
                },
              ].map((item, i) => {
                const birthDate =
                  diagnosticRaw?.birth_date ||
                  diagnosticRaw?.date_naissance ||
                  diagnosticAttrs?.DATE_NAISSANCE;
                if (!birthDate) return null;
                const d = new Date(birthDate);
                d.setFullYear(d.getFullYear() + item.age);
                return (
                  <div key={i}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                      }}
                    >
                      {item.icon}
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#374151",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: item.color,
                      }}
                    >
                      {d.toLocaleDateString("fr-FR")}
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        color: "#374151",
                        fontWeight: 500,
                      }}
                    >
                      {item.label === "Taux Plein Auto"
                        ? "Automatique à 67 ans"
                        : "64 ans"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Conversation Section - same as CRM InboxDetail */}
      {hasChatbot && (
        <div style={{ marginBottom: "16px" }}>
          <h3
            className="mb-2 d-flex align-items-center"
            style={{
              fontSize: "13px",
              fontWeight: "800",
              color: "#1e40af",
              textTransform: "uppercase",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            <MessageSquare size={16} className="mr-50" />
            SYNTHÈSE DE LA CONVERSATION
          </h3>

          <div className="row">
            {/* Résumé (Left) */}
            <div className="col-lg-5 mb-2">
              <div
                style={{
                  backgroundColor: "#f0f9ff",
                  padding: "16px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  borderLeft: "4px solid #3b82f6",
                  height: "100%",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                <div
                  className="font-weight-bold mb-1"
                  style={{
                    color: "#1e40af",
                    fontSize: "14px",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  📝 Synthèse IA
                </div>
                <div
                  style={{
                    color: "#374151",
                    lineHeight: "1.6",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {chatbotSummaryPoints.map((point, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
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
              </div>
            </div>

            {/* Historique (Right) */}
            {chatbotArchive.messages && chatbotArchive.messages.length > 0 && (
              <div className="col-lg-7 mb-2">
                <div
                  className="font-weight-bold mb-1"
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  <span>💬 Historique des échanges</span>
                  <span className="small text-muted font-weight-normal">
                    {chatbotArchive.messages.length} messages
                  </span>
                </div>
                <div
                  style={{
                    maxHeight: "350px",
                    overflowY: "auto",
                    backgroundColor: "#f8fafc",
                    padding: "15px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {chatbotArchive.messages
                    .filter((msg) => msg.role !== "system")
                    .map((msg, idx) => {
                      const isBot = msg.role !== "user";
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isBot ? "flex-end" : "flex-start",
                            marginBottom: "12px",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "85%",
                              padding: "8px 12px",
                              borderRadius: isBot
                                ? "14px 14px 4px 14px"
                                : "14px 14px 14px 4px",
                              backgroundColor: isBot ? "#3b82f6" : "#fff",
                              color: isBot ? "#fff" : "#1f2937",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              border: isBot ? "none" : "1px solid #e2e8f0",
                              fontSize: "12.5px",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {msg.content}
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#94a3b8",
                              marginTop: "4px",
                            }}
                          >
                            {isBot ? "Assistant EOR" : "Prospect"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Strategic Analysis */}
      {hasDiagnostic && (
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
              <Star size={18} /> Analyse Stratégique (IA)
            </h4>
            <button
              onClick={
                strategicAnalysis
                  ? onDeleteStrategicAnalysis
                  : onGenerateStrategicAnalysis
              }
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 600,
                color: strategicAnalysis ? "#dc2626" : "#7c3aed",
                backgroundColor: "#fff",
                border: strategicAnalysis
                  ? "1px solid #fecaca"
                  : "1px solid #c4b5fd",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <Star size={14} />{" "}
              {strategicAnalysis ? "Supprimer" : "Générer l'analyse"}
            </button>
          </div>
          {isAnalyzing ? (
            <div className="text-center p-2">
              <Loader size={24} className="spin" />
            </div>
          ) : (
            strategicAnalysis && (
              <div>
                {strategicAnalysis.profil_psy && (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      border: "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        color: "#7c3aed",
                        fontSize: "14px",
                      }}
                    >
                      Profil:{" "}
                      {strategicAnalysis.profil_psy.label ||
                        strategicAnalysis.profil_psy}
                    </div>
                  </div>
                )}
                <div className="diagnostic-grid">
                  <div>
                    {strategicAnalysis.douleur_critique && (
                      <div
                        style={{
                          backgroundColor: "#fff",
                          borderLeft: "4px solid #dc2626",
                          padding: "12px",
                          borderRadius: "8px",
                          height: "100%",
                        }}
                      >
                        <strong>Point de Douleur:</strong>{" "}
                        {strategicAnalysis.douleur_critique.titre ||
                          strategicAnalysis.douleur_critique}
                      </div>
                    )}
                  </div>
                  <div>
                    {strategicAnalysis.leviers_closing && (
                      <div
                        style={{
                          backgroundColor: "#fff",
                          borderLeft: "4px solid #059669",
                          padding: "12px",
                          borderRadius: "8px",
                          height: "100%",
                        }}
                      >
                        <strong>Leviers:</strong>{" "}
                        <ul className="mb-0">
                          {strategicAnalysis.leviers_closing.map((l, i) => (
                            <li key={i}>{l.piste || l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* AI Reply */}
      {hasDiagnostic && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
              Réponse Rapide
            </h3>
            {!aiDraft && !isGeneratingAi && (
              <button
                onClick={onGenerateAiReply}
                style={{
                  padding: "6px 20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
              >
                <Star size={14} /> Brouillon IA
              </button>
            )}
          </div>
          {isGeneratingAi ? (
            <div className="text-center p-2">
              <Loader size={24} className="spin" />
            </div>
          ) : (
            aiDraft && (
              <div
                style={{
                  border: "1px solid #ddd6fe",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#faf5ff",
                    padding: "10px 20px",
                    borderBottom: "1px solid #ddd6fe",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#7c3aed",
                    }}
                  >
                    SUGGESTION IA
                  </span>
                  <XCircle
                    size={16}
                    onClick={() => setAiDraft(null)}
                    style={{ cursor: "pointer" }}
                  />
                </div>
                <textarea
                  className="form-control"
                  style={{
                    border: "none",
                    minHeight: "150px",
                    padding: "20px",
                  }}
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                />
              </div>
            )
          )}
        </div>
      )}

      {hasDiagnostic && (
        <VisualReportModal
          isOpen={showVisualReport}
          onClose={() => setShowVisualReport(false)}
          htmlContent={generateVisualReport({
            raw: {
              ...diagnosticRaw,
              name: `${user.first_name} ${user.last_name}`,
              phone: user.phone_number,
              email: user.email,
            },
          })}
          fileName={`Rapport-${user.last_name}.html`}
          prospectName={`${user.first_name} ${user.last_name}`}
        />
      )}
      <DisqualifyModal
        isOpen={showDisqualifyModal}
        onClose={() => setShowDisqualifyModal(false)}
        onConfirm={handleConfirmDisqualify}
        isDisqualifying={isDisqualifying}
        reason={disqualifyReason}
        setReason={setDisqualifyReason}
        comment={disqualifyComment}
        setComment={setDisqualifyComment}
        prospectName={`${user.first_name} ${user.last_name}`}
      />
    </div>
  );
};

export default ProspectChatView;
