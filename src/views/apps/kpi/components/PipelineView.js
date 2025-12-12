import React, { useState } from "react";
import { Sparkles, MoreVertical, Calendar, Loader } from "lucide-react";
import { Badge } from "./SharedComponents";

// --- API Gemini Configuration --- (Reused or imported if moved to utility)
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

const pipelineColumns = [
  { id: "contact", title: "À contacter", color: "border-yellow-400" },
  { id: "rdv", title: "RDV Planifié", color: "border-blue-400" },
  { id: "prop", title: "Proposition envoyée", color: "border-purple-400" },
  { id: "nego", title: "Négociation", color: "border-orange-400" },
  { id: "won", title: "GAGNÉ (À traiter)", color: "border-green-500" },
];

const pipelineDealsMock = [
  {
    id: 101,
    name: "Mme. Durand",
    amount: "1 500 €",
    stage: "contact",
    owner: "JM",
    tag: "Retraite",
  },
  {
    id: 102,
    name: "M. Martin",
    amount: "2 800 €",
    stage: "rdv",
    date: "Demain 14h",
    owner: "AL",
    tag: "Bilan",
  },
  {
    id: 103,
    name: "Sarl Dupuis",
    amount: "4 500 €",
    stage: "prop",
    owner: "JM",
    tag: "Entreprise",
  },
  {
    id: 104,
    name: "Mme. Lefebvre",
    amount: "1 200 €",
    stage: "nego",
    owner: "AL",
    tag: "Retraite",
  },
  {
    id: 105,
    name: "Dr. House",
    amount: "3 000 €",
    stage: "won",
    owner: "JM",
    tag: "Expertise",
  },
];

// Helper: Map opportunity from backend to pipeline deal
function mapOpportunityToDeal(opp) {
  const stageMap = {
    contact: "contact",
    rdv: "rdv",
    proposition: "prop",
    proposal: "prop",
    negotiation: "nego",
    won: "won",
    lost: "lost",
  };

  return {
    id: opp.id,
    name: opp.client_name || opp.contact_name || "Client",
    amount: opp.amount ? `${opp.amount} €` : "0 €",
    stage: stageMap[opp.pipeline_stage] || "contact",
    owner: opp.assigned_user_initials || "??",
    tag: opp.product_type || "Autre",
    date: opp.next_action_date || null,
  };
}

const PipelineView = ({ deals = [], loading, error }) => {
  // Use provided deals or fallback to mock data
  const pipelineDeals =
    deals.length > 0 ? deals.map(mapOpportunityToDeal) : pipelineDealsMock;
  const [analyzingDealId, setAnalyzingDealId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleAnalyzeDeal = async (e, deal) => {
    e.stopPropagation();
    if (analyzingDealId === deal.id) {
      setAnalyzingDealId(null);
      setAnalysisResult(null);
      return;
    }

    setAnalyzingDealId(deal.id);
    setAnalysisResult(null);

    const prompt = `
            Tu es un coach de vente senior.
            Analyse cette opportunité et donne-moi 3 conseils stratégiques courts (bullet points).
            Client : ${deal.name}, Sujet : ${deal.tag}, Montant : ${deal.amount}, Étape : ${deal.stage}
        `;

    const result = await generateGeminiContent(prompt);
    setAnalysisResult(result);
  };

  return (
    <div
      style={{
        height: "calc(100vh - 180px)",
        overflowX: "auto",
        position: "relative",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "16px",
          minWidth: "max-content",
          paddingBottom: "16px",
          height: "100%",
        }}
      >
        {pipelineColumns.map((col) => (
          <div
            key={col.id}
            style={{
              width: "288px",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                padding: "12px",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                backgroundColor: "#f9fafb",
                borderTop: `4px solid`,
                borderLeft: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
                borderBottom: "1px solid #e5e7eb",
                borderColor:
                  col.color.replace("border-", "") === "yellow-400"
                    ? "#facc15"
                    : col.color.replace("border-", "") === "blue-400"
                    ? "#60a5fa"
                    : col.color.replace("border-", "") === "purple-400"
                    ? "#c084fc"
                    : col.color.replace("border-", "") === "orange-400"
                    ? "#fb923c"
                    : "#22c55e",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontWeight: 600,
                  color: "#374151",
                  fontSize: "14px",
                  textTransform: "uppercase",
                }}
              >
                {col.title}
              </h3>
              <span
                style={{
                  backgroundColor: "#fff",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#6b7280",
                  fontWeight: "bold",
                }}
              >
                {pipelineDeals.filter((d) => d.stage === col.id).length}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#f3f4f6",
                flex: 1,
                padding: "8px",
                borderLeft: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
                borderBottom: "1px solid #e5e7eb",
                borderBottomLeftRadius: "8px",
                borderBottomRightRadius: "8px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {pipelineDeals
                .filter((d) => d.stage === col.id)
                .map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      position: "relative",
                      backgroundColor: "#fff",
                      padding: "12px",
                      borderRadius: "8px",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      border: "1px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <Badge
                        color={deal.tag === "Retraite" ? "purple" : "blue"}
                      >
                        {deal.tag}
                      </Badge>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={(e) => handleAnalyzeDeal(e, deal)}
                          style={{
                            padding: "4px",
                            borderRadius: "4px",
                            backgroundColor:
                              analyzingDealId === deal.id
                                ? "#f3e8ff"
                                : "transparent",
                            color:
                              analyzingDealId === deal.id
                                ? "#7e22ce"
                                : "#d1d5db",
                            border: "none",
                            cursor: "pointer",
                          }}
                          title="Coach IA"
                        >
                          <Sparkles size={14} />
                        </button>
                        <MoreVertical size={16} color="#d1d5db" />
                      </div>
                    </div>
                    <h4
                      style={{
                        fontWeight: 600,
                        color: "#1f2937",
                        marginBottom: "4px",
                      }}
                    >
                      {deal.name}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{ fontWeight: "bold", color: "#4b5563" }}>
                        {deal.amount}
                      </span>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: "#e0e7ff",
                          color: "#4338ca",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                          border: "1px solid #c7d2fe",
                        }}
                      >
                        {deal.owner}
                      </div>
                    </div>

                    {analyzingDealId === deal.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 10,
                          marginTop: "8px",
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                          border: "1px solid #e9d5ff",
                          padding: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "8px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#7e22ce",
                            textTransform: "uppercase",
                          }}
                        >
                          <Sparkles size={12} /> Coach de Vente
                        </div>
                        {analysisResult ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#374151",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            {analysisResult
                              .split("\n")
                              .filter((line) => line.trim())
                              .map((line, i) => (
                                <p
                                  key={i}
                                  style={{
                                    display: "flex",
                                    gap: "4px",
                                    margin: 0,
                                  }}
                                >
                                  <span>•</span>
                                  <span>{line.replace(/^[-*•]\s*/, "")}</span>
                                </p>
                              ))}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnalyzingDealId(null);
                              }}
                              style={{
                                width: "100%",
                                marginTop: "8px",
                                textAlign: "center",
                                fontSize: "12px",
                                color: "#9ca3af",
                                backgroundColor: "#f9fafb",
                                padding: "4px",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Fermer
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              padding: "8px",
                            }}
                          >
                            <Loader
                              size={16}
                              className="text-purple-500 animate-spin"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {deal.date && (
                      <div
                        style={{
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid #f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          color: "#ea580c",
                          fontWeight: 500,
                        }}
                      >
                        <Calendar size={12} /> {deal.date}
                      </div>
                    )}
                  </div>
                ))}
              <button
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "12px",
                  color: "#9ca3af",
                  border: "1px dashed #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                + Ajouter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineView;
