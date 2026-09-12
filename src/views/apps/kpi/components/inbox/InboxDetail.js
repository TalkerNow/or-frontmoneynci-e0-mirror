import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Phone,
  Mail,
  ArrowRight,
  XCircle,
  ClipboardList,
  CheckCircle,
  Clock,
  Target,
  AlertCircle,
  TrendingUp,
  Star,
  Loader,
  // Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  FileText,
} from "lucide-react";

import { Badge } from "../SharedComponents";
import ActionsSection from "./ActionsSection";

import ConversationModal from "./ConversationModal";
import VisualReportModal from "./VisualReportModal";
import {
  getTypeColor,
  getTypeLabel,
  formatPhoneNumber,
  calculateComplexityScore,
  generateVisualReport,
} from "./utils";

const InboxDetail = ({
  selectedItem,
  onDisqualify,
  onConvert,
  strategicAnalysis,
  isAnalyzing,
  onGenerateStrategicAnalysis,
  onDeleteStrategicAnalysis,
  aiDraft,
  isGeneratingAi,
  onGenerateAiReply,
  setAiDraft,
  onMarkAsUnread,
  onProspectCreated, // Nouveau callback
}) => {
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showVisualReport, setShowVisualReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    if (!showVisualReport) {
      setReportData(null);
      return;
    }

    if (
      showVisualReport &&
      selectedItem?.id &&
      (selectedItem.type === "diagnostic" ||
        selectedItem.type === "simulator-difficulty-result")
    ) {
      setIsLoadingReport(true);
      const token = localStorage.getItem("token");
      axios
        .get(
          `${global.config.server_url}/v1/simulator-difficulty-results/${selectedItem.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )
        .then((res) => {
          if (res.data) setReportData(res.data);
        })
        .catch((err) => console.error("Failed to fetch report data", err))
        .finally(() => setIsLoadingReport(false));
    }
  }, [showVisualReport, selectedItem]);

  // If no item selected (shouldn't happen given logic), return null
  if (!selectedItem) return null;

  const rawData = reportData || {};
  const firstName =
    rawData.prenom ||
    rawData.PRENOM ||
    rawData.first_name ||
    selectedItem.firstName ||
    "";
  const lastName =
    rawData.nom ||
    rawData.NOM ||
    rawData.last_name ||
    selectedItem.lastName ||
    "";
  const finalItem = reportData
    ? { ...selectedItem, raw: reportData }
    : selectedItem;

  return (
    <>
      <VisualReportModal
        isOpen={showVisualReport}
        onClose={() => setShowVisualReport(false)}
        htmlContent={generateVisualReport(finalItem)}
        fileName={`Rapport visuel diagnostic retraite ${
          firstName
            ? firstName.charAt(0).toUpperCase() +
              firstName.slice(1).toLowerCase()
            : ""
        } ${
          lastName
            ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()
            : ""
        } - EOR Consultants.html`}
        isLoading={isLoadingReport}
        prospectName={`${firstName} ${lastName}`}
      />
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
          className="responsive-padding pb-0"
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
              <Badge
                color={
                  selectedItem.raw?.source === "expert-retraite"
                    ? "fluo"
                    : getTypeColor(selectedItem.type)
                }
              >
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
                {selectedItem.type === "email" ? (
                  <>Reçu le {selectedItem.date}</>
                ) : (
                  <>
                    Reçu le {selectedItem.date} • Source:{" "}
                    {selectedItem.raw?.source === "expert-retraite"
                      ? "Expert Retraite"
                      : "EOR Consultant"}
                  </>
                )}
              </span>
            </div>
            <div
              className="header-btn-stack"
              style={{ display: "flex", gap: "8px" }}
            >
              <button
                onClick={onMarkAsUnread}
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
                title="Marquer comme non lu"
              >
                <EyeOff size={16} /> Marquer comme non lu
              </button>
              <button
                onClick={onDisqualify}
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
              >
                <XCircle size={16} /> Disqualifier
              </button>
              {selectedItem.type === "diagnostic" && (
                <button
                  onClick={() => setShowVisualReport(true)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#1e3a8a", // Dark blue text
                    backgroundColor: "#eff6ff", // Very light blue background
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#dbeafe";
                    e.currentTarget.style.color = "#172554";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#eff6ff";
                    e.currentTarget.style.color = "#1e3a8a";
                  }}
                  title="Générer le rapport visuel"
                >
                  <FileText size={16} strokeWidth={2} />
                  <span className="hide-on-mobile">Rapport Visuel</span>
                </button>
              )}
              <button
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
                  border: "none",
                }}
                onClick={onConvert}
              >
                <ArrowRight size={16} /> Convertir
              </button>
            </div>
          </div>

          {selectedItem.type !== "email" && (
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
          )}
        </div>

        <div
          className="responsive-padding pt-0"
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
                    {(() => {
                      const score = calculateComplexityScore(selectedItem.raw);
                      const scoreNum = parseInt(score, 10);

                      let bg, color;
                      if (!isNaN(scoreNum)) {
                        if (scoreNum < 30) {
                          bg = "#ffe5e5";
                          color = "#d93025";
                        } else if (scoreNum < 70) {
                          bg = "#fff4e5";
                          color = "#ff9800";
                        } else {
                          bg = "#e6f4ea";
                          color = "#1e8e3e";
                        }
                      } else {
                        // Fallback default
                        bg = "#f3f4f6";
                        color = "#6b7280";
                      }

                      return (
                        <span
                          style={{
                            backgroundColor: bg,
                            borderRadius: "999px",
                            padding: "6px 14px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: color,
                          }}
                        >
                          Score : {score}/100
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* ... (Diagnostic content omitted for brevity, adding essential parts) ... */}
                {/* To keep it precise as requested "no content loss", I will implement the full diagnostic view logic */}
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

                {/* User Info Section (Children / Military) */}
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

                {/* Repères Clés */}
                {/* ... (Logic from calculate benchmarks) ... */}
                {/* Simplification: Just copy the block from original file logic here */}
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
              </div>

              {/* Strategic Analysis */}
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
                      onClick={onGenerateStrategicAnalysis}
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
                      onClick={onDeleteStrategicAnalysis}
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
                    {/* Simplified render of strategicAnalysis - referring to original file */}
                    {/* Profil Psy */}
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
                        <div style={{ fontWeight: "bold", color: "#7c3aed" }}>
                          Profil:{" "}
                          {strategicAnalysis.profil_psy.label ||
                            strategicAnalysis.profil_psy}
                        </div>
                        {strategicAnalysis.profil_psy.description && (
                          <div style={{ fontSize: "13px", color: "#666" }}>
                            {strategicAnalysis.profil_psy.description}
                          </div>
                        )}
                      </div>
                    )}
                    {/* ... other parts (Douleur, Mines, Leviers) ... */}
                    {/* I'll use a simplified generic render for brevity in this split file if appropriate, OR copy full code. 
                           User asked for "NO LOSS OF CONTENT". I MUST COPY FULL CODE.
                       */}
                    <div className="analysis-grid">
                      {/* Douleur */}
                      {strategicAnalysis.douleur_critique && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #fee2e2",
                            borderLeft: "4px solid #dc2626",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "800",
                              color: "#991b1b",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <AlertCircle size={14} /> Point de Douleur
                          </div>
                          <div style={{ fontWeight: "700" }}>
                            {strategicAnalysis.douleur_critique.titre ||
                              strategicAnalysis.douleur_critique}
                          </div>
                        </div>
                      )}
                      {/* Mines */}
                      {strategicAnalysis.mines_enterrees && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #fef3c7",
                            borderLeft: "4px solid #d97706",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "800",
                              color: "#92400e",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Target size={14} /> Mines Enterrées
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "18px",
                              fontSize: "13px",
                            }}
                          >
                            {strategicAnalysis.mines_enterrees.map((m, i) => (
                              <li key={i}>{m.point || m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Leviers */}
                      {strategicAnalysis.leviers_closing && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #d1fae5",
                            borderLeft: "4px solid #059669",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "800",
                              color: "#065f46",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <TrendingUp size={14} /> Leviers
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "18px",
                              fontSize: "13px",
                            }}
                          >
                            {strategicAnalysis.leviers_closing.map((l, i) => (
                              <li key={i}>{l.piste || l}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : selectedItem.type === "email" ? (
            <div style={{ paddingTop: "8px" }}>
              {/* CF7 reading pane — Gmail mirror, label then value */}
              {selectedItem.channel ? (
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: "20px",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedItem.channel}
                </div>
              ) : null}

              {[
                { label: "Nom, prénom", value: selectedItem.name },
                {
                  label: "Téléphone",
                  value: formatPhoneNumber(selectedItem.phone) || selectedItem.phone,
                },
                { label: "Adresse mail", value: selectedItem.email },
                { label: "Date de naissance", value: selectedItem.birthDate },
                {
                  label: "Vous êtes intéressé·e par",
                  value: selectedItem.interest,
                },
                {
                  label: "Message",
                  value: selectedItem.cf7Message,
                },
              ]
                .filter((row) => row.value && String(row.value).trim())
                .map((row) => (
                  <div
                    key={row.label}
                    style={{
                      marginBottom: "16px",
                      paddingBottom: "14px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#6b7280",
                        marginBottom: "4px",
                        lineHeight: 1.4,
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#111827",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}

              {selectedItem.formUrl ? (
                <div
                  style={{
                    marginBottom: "16px",
                    paddingBottom: "14px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#6b7280",
                      marginBottom: "4px",
                      lineHeight: 1.4,
                    }}
                  >
                    Formulaire rempli sur le site EOR
                  </div>
                  <a
                    href={selectedItem.formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "14px",
                      color: "#4f46e5",
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedItem.formUrl}
                  </a>
                </div>
              ) : null}

              {/* Fallback if CF7 parse empty: quiet body, no subject noise */}
              {!selectedItem.channel &&
              !selectedItem.name &&
              !selectedItem.phone &&
              !selectedItem.email &&
              !selectedItem.cf7Message ? (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {selectedItem.body || selectedItem.snippet || ""}
                </div>
              ) : null}

              {selectedItem.gmailPermalink ? (
                <div style={{ marginTop: "8px", paddingTop: "8px" }}>
                  <a
                    href={selectedItem.gmailPermalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      fontSize: "13px",
                      color: "#4f46e5",
                      fontWeight: 500,
                    }}
                  >
                    Ouvrir dans Gmail →
                  </a>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
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
                {selectedItem.type === "call"
                  ? "DÉTAILS DE L'ÉCHANGE"
                  : "SYNTHÈSE DE LA CONVERSATION"}
              </h3>

              <div className="row">
                {/* Résumé (Left) */}
                <div
                  className={
                    selectedItem.type === "chatbot" ? "col-lg-5 mb-2" : "col-12"
                  }
                >
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
                      {selectedItem.type === "call"
                        ? "📞 Détails de l'appel"
                        : "📝 Synthèse IA"}
                    </div>
                    <div
                      style={{
                        color: "#374151",
                        lineHeight: "1.6",
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {selectedItem.summary?.map((point, idx) => (
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

                {/* Historique (Right) - Only for Chatbot */}
                {selectedItem.type === "chatbot" && (
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
                      <span>
                        <span role="img" aria-label="speech balloon">
                          💬
                        </span>{" "}
                        Historique des échanges
                      </span>
                      <span className="small text-muted font-weight-normal">
                        {selectedItem.raw?.messages?.length || 0} messages
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
                      {selectedItem.raw?.messages &&
                      selectedItem.raw.messages.length > 0 ? (
                        selectedItem.raw.messages
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
                                    border: isBot
                                      ? "none"
                                      : "1px solid #e2e8f0",
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
                          })
                      ) : (
                        <div className="text-center text-muted py-2 small">
                          Aucun message dans l'historique.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversation Modal */}
          <ConversationModal
            isOpen={showConversationModal}
            onClose={() => setShowConversationModal(false)}
            messages={selectedItem.raw?.messages}
          />

          {/* AI REPLY */}
          {selectedItem.type !== "call" &&
            selectedItem.type !== "email" &&
            selectedItem.type !== "chatbot" && (
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
                  {!aiDraft && !isGeneratingAi && (
                    <button
                      onClick={onGenerateAiReply}
                      className="btn-sm btn-light-primary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderRadius: "999px",
                      }}
                    >
                      <Star size={14} style={{ marginRight: "4px" }} />{" "}
                      Brouillon IA
                    </button>
                  )}
                </div>

                {isGeneratingAi && (
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

          {/* Actions Section */}
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
            <ActionsSection
              clientId={selectedItem.clientId}
              prospectId={selectedItem.id}
              adminId={localStorage.getItem("userid")}
              type={selectedItem.type}
              prospectData={{
                firstName: selectedItem.firstName,
                lastName: selectedItem.lastName,
                email: selectedItem.email,
                phone: selectedItem.phone,
              }}
              onProspectCreated={onProspectCreated}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default InboxDetail;
