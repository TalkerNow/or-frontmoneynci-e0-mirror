import React, { useState } from "react";
import { Button } from "reactstrap";
import { FileText, User, Check, Clock, Target } from "react-feather";
import { calculateComplexityScore } from "../../../inbox/utils";

const API_BASE = process.env.REACT_APP_API_URL || "https://api.optionretraite.net/api";

const DiagnosticSection = ({
  diagnostic,
  diagnosticRaw,
  diagnosticAttrs,
  clientId,
  onShowVisualReport,
}) => {
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);
  const [simHtml, setSimHtml] = useState(null);
  const [simOpen, setSimOpen] = useState(false);

  if (!diagnostic) return null;

  const score = calculateComplexityScore(diagnosticRaw);
  const scoreNum = parseInt(score, 10);

  let bg, color;
  if (!Number.isNaN(scoreNum)) {
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
    bg = "#f3f4f6";
    color = "#6b7280";
  }

  const handleGenerateSimulation = async () => {
    // clientId comes from the parent via prop (userDetails.id)
    console.log("[SIM] bouton cliqué — clientId:", clientId, "diagnosticAttrs:", diagnosticAttrs);
    const resolvedClientId =
      clientId ||
      diagnosticAttrs?.userId ||
      diagnosticAttrs?.clientId ||
      diagnosticAttrs?.id ||
      diagnosticAttrs?.user_id;
    console.log("[SIM] resolvedClientId:", resolvedClientId);
    if (!resolvedClientId) {
      setSimError("ID client non trouvé");
      return;
    }
    setSimLoading(true);
    setSimError(null);
    try {
      const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        "";

      // Le backend charge frozen_data depuis la DB et forward à n8n
      const resp = await fetch(`${API_BASE}/v1/simulation-retraite/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ client_id: resolvedClientId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erreur serveur (${resp.status})`);
      }
      const result = await resp.json();
      if (!result.html_report) throw new Error("Rapport vide reçu");
      setSimHtml(result.html_report);
      setSimOpen(true);
    } catch (err) {
      setSimError(err.message);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#fff7ed",
        borderRadius: "8px",
        padding: "12px",
        border: "1px solid #ffedd5",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontSize: "0.8rem",
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
          <FileText size={14} /> Diagnostic
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Button
            size="sm"
            color="primary"
            outline
            onClick={onShowVisualReport}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <FileText size={14} className="mr-25" />
            <span>Rapport Visuel</span>
          </Button>
          <Button
            size="sm"
            color="success"
            outline
            onClick={handleGenerateSimulation}
            disabled={simLoading}
            style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "4px" }}
          >
            {simLoading ? "Génération..." : "Simulation Retraite"}
          </Button>
          {simError && (
            <div style={{ color: "#d93025", fontSize: "11px", marginTop: "4px" }}>
              Erreur : {simError}
            </div>
          )}
          {(diagnosticRaw?.profile_type || diagnosticAttrs?.PROFILE_TYPE) && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              {diagnosticRaw?.profile_type || diagnosticAttrs?.PROFILE_TYPE}
            </span>
          )}
          <span
            style={{
              backgroundColor: bg,
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: color,
            }}
          >
            {score}/100
          </span>
        </div>
      </div>

      <div className="row" style={{ marginBottom: "8px" }}>
        <div className="col-6">
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              padding: "8px",
              border: "1px solid #fed7aa",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#ea580c",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              Date de naissance
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#1f2937",
              }}
            >
              {(() => {
                const d =
                  diagnosticRaw?.birth_date ||
                  diagnosticRaw?.date_naissance ||
                  diagnosticAttrs?.DATE_NAISSANCE ||
                  diagnosticRaw?.attributes?.DATE_NAISSANCE;
                if (!d) return "-";
                try {
                  return new Date(d).toLocaleDateString("fr-FR");
                } catch {
                  return d;
                }
              })()}
            </div>
          </div>
        </div>

        <div className="col-6">
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              padding: "8px",
              border: "1px solid #fed7aa",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
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
                  fontSize: "0.85rem",
                  fontWeight: 700,
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
                  diagnosticRaw?.birth_date ||
                  diagnosticRaw?.date_naissance ||
                  diagnosticAttrs?.DATE_NAISSANCE ||
                  diagnosticRaw?.attributes?.DATE_NAISSANCE;
                const departDate =
                  diagnosticRaw?.departure_date ||
                  diagnosticRaw?.date_depart ||
                  diagnosticAttrs?.SIMULATEUR_DIFFICULTE_DATE_DEPART ||
                  diagnosticRaw?.attributes?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                if (!birthDate || !departDate) return null;
                try {
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
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: "#ea580c",
                      }}
                    >
                      ({years} ans{months > 0 ? ` et ${months} mois` : ""})
                    </span>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {(() => {
        const children = diagnosticAttrs?.NBR_ENFANTS;
        const military = diagnosticAttrs?.SIMULATEUR_DIFFICULTE_Q11;
        if (!children && !military) return null;
        return (
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "8px",
              flexWrap: "wrap",
            }}
          >
            {children != null && (
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  border: "1px solid #fed7aa",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <User size={14} color="#ea580c" />
                <span style={{ fontSize: "0.75rem", color: "#374151" }}>
                  <strong>{children}</strong> enfant
                  {parseInt(children, 10) > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {military &&
              typeof military === "string" &&
              military.toLowerCase() === "oui" && (
                <div
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    border: "1px solid #dcfce7",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Check size={14} color="#16a34a" />
                  <span style={{ fontSize: "0.75rem", color: "#374151" }}>
                    Service militaire effectué
                  </span>
                </div>
              )}
          </div>
        );
      })()}

      {/* Repères clés calculés */}
      {(() => {
        const birthDate =
          diagnosticRaw?.birth_date ||
          diagnosticRaw?.date_naissance ||
          diagnosticAttrs?.DATE_NAISSANCE ||
          diagnosticRaw?.attributes?.DATE_NAISSANCE;
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
                borderRadius: "6px",
                padding: "10px",
                marginBottom: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
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
              <div className="reperes-grid">
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: "2px",
                    }}
                  >
                    <Clock size={12} color="#ea580c" />
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#374151",
                      }}
                    >
                      Âge Légal
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#ea580c",
                    }}
                  >
                    {legalDate.toLocaleDateString("fr-FR")}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
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
                      gap: "4px",
                      marginBottom: "2px",
                    }}
                  >
                    <Target size={12} color="#16a34a" />
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      Taux Plein Auto
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#16a34a",
                    }}
                  >
                    {tauxPleinDate.toLocaleDateString("fr-FR")}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
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

      {simOpen && simHtml && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.65)", zIndex: 9999,
            display: "flex", flexDirection: "column",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSimOpen(false); }}
        >
          <div style={{
            background: "white", margin: "16px", borderRadius: "8px",
            flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
            maxWidth: "900px", width: "100%", alignSelf: "center",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#021b61", color: "white", borderRadius: "8px 8px 0 0",
            }}>
              <strong>Simulation Retraite</strong>
              <button
                onClick={() => setSimOpen(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "white", fontSize: "20px", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <iframe
              srcDoc={simHtml}
              title="Simulation Retraite"
              style={{ flex: 1, border: "none", width: "100%" }}
              sandbox=""
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticSection;
