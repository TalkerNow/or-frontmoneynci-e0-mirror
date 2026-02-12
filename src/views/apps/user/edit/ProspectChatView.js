import React, { useState } from "react";
import {
  MessageSquare,
  FileText,
  User,
  Check,
  Clock,
  Target,
} from "react-feather";
import { Button } from "reactstrap";
import {
  generateVisualReport,
  calculateComplexityScore,
} from "../../kpi/components/inbox/utils";
import VisualReportModal from "../../kpi/components/inbox/VisualReportModal";
import {
  getLatestDiagnostic,
  getDiagnosticAttributes,
} from "../../kpi/components/kanban/Modals/utils/diagnosticHelpers";

// Import CSS for reperes-grid and app fonts
import "../../../../assets/scss/pages/inbox-responsive.scss";

const ProspectChatView = ({ user }) => {
  const [showVisualReport, setShowVisualReport] = useState(false);

  // Data Extraction matching CRM logic
  const diagnostic = getLatestDiagnostic(user);
  const diagnosticRaw = diagnostic?.raw || diagnostic?.data || diagnostic;
  const diagnosticAttrs = diagnostic
    ? getDiagnosticAttributes(diagnosticRaw)
    : {};

  const conversation = user?.conversation_archives?.[0];
  const hasChatbot =
    conversation && (conversation.messages?.length > 0 || conversation.summary);
  const hasDiagnostic = !!diagnostic;

  const appFont = "'Montserrat', Helvetica, Arial, serif";

  if (!hasChatbot && !hasDiagnostic) {
    return (
      <div
        className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-5"
        style={{ fontFamily: appFont }}
      >
        <MessageSquare size={48} className="mb-3 opacity-25" />
        <p className="font-weight-bold">Aucune donnée trouvée.</p>
        <p className="small text-muted">
          L'historique des échanges ou les résultats de diagnostic apparaîtront
          ici.
        </p>
      </div>
    );
  }

  // Score calculation for Diagnostic
  const score = hasDiagnostic ? calculateComplexityScore(diagnosticRaw) : 0;

  return (
    <div
      className="prospect-chat-view h-100 px-1 mt-1 mb-2"
      style={{ fontFamily: appFont }}
    >
      {/* 1. Diagnostic Section - EXACT SCREENSHOT MATCH */}
      {hasDiagnostic && (
        <div
          className="mb-3"
          style={{
            backgroundColor: "#fff7ed",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid #ffedd5",
            position: "relative",
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3
              style={{
                fontSize: "13px",
                fontWeight: "800",
                color: "#9a3412",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
                fontFamily: appFont,
              }}
            >
              <FileText size={16} /> RÉSULTATS DU DIAGNOSTIC
            </h3>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                color="primary"
                outline
                onClick={() => setShowVisualReport(true)}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  marginRight: "10px",
                  border: "1px solid #7367f0",
                  fontFamily: appFont,
                }}
              >
                <FileText size={12} className="mr-25" />
                <span>Rapport Visuel</span>
              </Button>
              <span
                style={{
                  backgroundColor: "#fff1e2",
                  borderRadius: "12px",
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#ea580c",
                  fontFamily: appFont,
                }}
              >
                Score : {score}/100
              </span>
            </div>
          </div>

          {/* Date Boxes */}
          <div className="row mb-2">
            <div className="col-md-6 mb-2 mb-md-0">
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  padding: "16px",
                  border: "1px solid #fed7aa",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#ea580c",
                    fontWeight: 700,
                    marginBottom: "4px",
                    fontFamily: appFont,
                  }}
                >
                  Date de naissance
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#1f2937",
                    fontFamily: appFont,
                  }}
                >
                  {(() => {
                    const d =
                      diagnosticRaw?.birth_date ||
                      diagnosticRaw?.date_naissance ||
                      diagnosticAttrs?.DATE_NAISSANCE ||
                      diagnosticRaw?.attributes?.DATE_NAISSANCE;
                    return d ? new Date(d).toLocaleDateString("fr-FR") : "-";
                  })()}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  padding: "16px",
                  border: "1px solid #fed7aa",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#ea580c",
                    fontWeight: 700,
                    marginBottom: "4px",
                    fontFamily: appFont,
                  }}
                >
                  Départ souhaité
                </div>
                <div
                  className="d-flex align-items-center gap-2 flex-wrap"
                  style={{ fontFamily: appFont }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#1f2937",
                    }}
                  >
                    {(() => {
                      const d =
                        diagnosticRaw?.departure_date ||
                        diagnosticRaw?.date_depart ||
                        diagnosticAttrs?.SIMULATEUR_DIFFICULTE_DATE_DEPART ||
                        diagnosticRaw?.attributes
                          ?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                      return d ? new Date(d).toLocaleDateString("fr-FR") : "-";
                    })()}
                  </span>
                  {(() => {
                    const birthDate =
                      diagnosticRaw?.birth_date ||
                      diagnosticRaw?.date_naissance ||
                      diagnosticAttrs?.DATE_NAISSANCE ||
                      diagnosticRaw?.attributes?.DATE_NAISSANCE;
                    const departDate =
                      diagnosticRaw?.departure_date ||
                      diagnosticRaw?.date_depart ||
                      diagnosticAttrs?.SIMULATEUR_DIFFICULTE_DATE_DEPART ||
                      diagnosticRaw?.attributes
                        ?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                    if (!birthDate || !departDate) return null;
                    const birth = new Date(birthDate);
                    const depart = new Date(departDate);
                    let years = depart.getFullYear() - birth.getFullYear();
                    let months = depart.getMonth() - birth.getMonth();
                    if (months < 0) {
                      years--;
                      months += 12;
                    }
                    return (
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#ea580c",
                          marginLeft: "15px",
                        }}
                      >
                        ({years} ans{months > 0 ? ` et ${months} mois` : ""})
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Repères clés calculés - GREY BOX MATCH */}
          {(() => {
            const birthDate =
              diagnosticRaw?.birth_date ||
              diagnosticRaw?.date_naissance ||
              diagnosticAttrs?.DATE_NAISSANCE ||
              diagnosticRaw?.attributes?.DATE_NAISSANCE;
            if (!birthDate) return null;
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
                  backgroundColor: "#f3f6f9",
                  borderRadius: "10px",
                  padding: "16px",
                  border: "1px solid #e5e9ef",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#475569",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textTransform: "uppercase",
                    fontFamily: appFont,
                  }}
                >
                  <Clock size={15} /> REPÈRES CLÉS (CALCULÉS)
                </div>
                <div className="row">
                  <div className="col-6">
                    <div
                      className="d-flex align-items-center gap-2 mb-1"
                      style={{ fontFamily: appFont }}
                    >
                      <Clock size={14} color="#ea580c" />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: "600",
                        }}
                      >
                        Âge Légal
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "900",
                        color: "#ea580c",
                        marginBottom: "2px",
                        fontFamily: appFont,
                      }}
                    >
                      {legalDate.toLocaleDateString("fr-FR")}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#1f2937",
                        fontWeight: "700",
                        fontFamily: appFont,
                      }}
                    >
                      {legalAge} ans
                    </div>
                  </div>
                  <div className="col-6">
                    <div
                      className="d-flex align-items-center gap-2 mb-1"
                      style={{ fontFamily: appFont }}
                    >
                      <Target size={14} color="#16a34a" />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: "600",
                        }}
                      >
                        Taux Plein Auto
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "900",
                        color: "#16a34a",
                        marginBottom: "2px",
                        fontFamily: appFont,
                      }}
                    >
                      {tauxPleinDate.toLocaleDateString("fr-FR")}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#1f2937",
                        fontWeight: "700",
                        fontFamily: appFont,
                      }}
                    >
                      Automatique à {tauxPleinAge} ans
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Indicators if present */}
          {(diagnosticAttrs?.NBR_ENFANTS ||
            diagnosticAttrs?.SIMULATEUR_DIFFICULTE_Q11) && (
            <div className="d-flex gap-2 mt-2 flex-wrap">
              {diagnosticAttrs?.NBR_ENFANTS != null && (
                <div
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    border: "1px solid #fed7aa",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: appFont,
                  }}
                >
                  <User size={12} color="#ea580c" />
                  <span style={{ fontSize: "11px", color: "#374151" }}>
                    <strong>{diagnosticAttrs.NBR_ENFANTS}</strong> enfant
                    {parseInt(diagnosticAttrs.NBR_ENFANTS, 10) > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {diagnosticAttrs?.SIMULATEUR_DIFFICULTE_Q11?.toLowerCase() ===
                "oui" && (
                <div
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    border: "1px solid #dcfce7",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: appFont,
                  }}
                >
                  <Check size={12} color="#16a34a" />
                  <span style={{ fontSize: "11px", color: "#374151" }}>
                    Service militaire effectué
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Chatbot Section - BALANCED STYLE */}
      {hasChatbot && (
        <div className="mb-2 pt-2 border-top mt-3">
          <h3
            className="mb-2 d-flex align-items-center mt-2"
            style={{
              fontSize: "13px",
              fontWeight: "800",
              color: "#1e40af",
              textTransform: "uppercase",
              fontFamily: appFont,
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
                  fontFamily: appFont,
                }}
              >
                <div
                  className="font-weight-bold mb-1"
                  style={{
                    color: "#1e40af",
                    fontSize: "14px",
                    fontFamily: appFont,
                  }}
                >
                  📝 Synthèse IA
                </div>
                <div
                  style={{
                    color: "#374151",
                    lineHeight: "1.6",
                    fontFamily: appFont,
                  }}
                >
                  {conversation.summary}
                </div>
              </div>
            </div>

            {/* Historique (Right) */}
            <div className="col-lg-7 mb-2">
              <div
                className="font-weight-bold mb-1"
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: appFont,
                }}
              >
                <span>💬 Historique des échanges</span>
                <span className="small text-muted font-weight-normal">
                  {conversation.messages?.length || 0} messages
                </span>
              </div>
              <div
                style={{
                  maxHeight: "450px",
                  overflowY: "auto",
                  backgroundColor: "#f8fafc",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {conversation.messages && conversation.messages.length > 0 ? (
                  conversation.messages
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
                            marginBottom: "16px",
                            fontFamily: appFont,
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "85%",
                              padding: "10px 16px",
                              borderRadius: isBot
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                              backgroundColor: isBot ? "#3b82f6" : "#fff",
                              color: isBot ? "#fff" : "#1f2937",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                              border: isBot ? "none" : "1px solid #e2e8f0",
                              fontFamily: appFont,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {msg.content}
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              marginTop: "6px",
                              paddingLeft: isBot ? "0" : "8px",
                              paddingRight: isBot ? "8px" : "0",
                            }}
                          >
                            {isBot ? "Assistant EOR" : "Prospect"}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <div
                    className="text-center text-muted py-4"
                    style={{ fontFamily: appFont }}
                  >
                    <p>Aucun message dans l'historique.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Report Modal */}
      {hasDiagnostic && (
        <VisualReportModal
          isOpen={showVisualReport}
          onClose={() => setShowVisualReport(false)}
          htmlContent={generateVisualReport({
            ...diagnosticRaw,
            raw: diagnosticRaw,
            name: `${user.first_name} ${user.last_name}`,
            phone: user.phone_number,
            email: user.email,
          })}
          fileName={`Rapport visuel diagnostic - ${user.first_name} ${user.last_name}.html`}
          isLoading={false}
          prospectName={`${user.first_name} ${user.last_name}`}
        />
      )}
    </div>
  );
};

export default ProspectChatView;
