import React, { useState } from "react";
import { computeSamCnav, computeArrcoPts, sumTrimestresCapped } from "../../../../../utils/calculators";

// "📊 Données de calcul" block, shared by the Scénarios panel and the bottom of the career
// grid so both stay identical. Pure presentation: every input comes from props.
//   collapsible: render a clickable header that toggles the grid (default static header).
//   defaultOpen: initial open state when collapsible.
export default function CalculDataPanel({
  carriereRows = [],
  trimCotState = {},
  trimAssState = {},
  arState = {},
  revaloValues = {},
  user,
  departureDates,
  collapsible = false,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  // SAM identique à celui du tableau de carrière : même fonction, mêmes entrées
  // (années CNAV + salaires revalorisés du tableau). Évite la divergence avec
  // l'ancien computeSAMB qui recalculait la revalorisation depuis le brut et
  // n'excluait pas les années hors CNAV.
  const samb = computeSamCnav(carriereRows, trimCotState, trimAssState, revaloValues);
  const { total: arrcoPts, projectionAnnuelle } = computeArrcoPts(carriereRows);
  const trimAr = Object.values(arState).reduce((s, v) => s + (Number(v) || 0), 0);
  // Durée d'assurance plafonnée à 4 trim/an (rachetés exclus, cohérent avec
  // computeDateTauxPlein). Sans ce plafond, les parcours mixtes et les assimilés
  // empilés sur-comptent (bug client 1708 : 166 au lieu de 158).
  const trimYearsSet = new Set([...Object.keys(trimCotState), ...Object.keys(trimAssState)]);
  // Split acquired (real) vs projected trimestres so "acquis" never silently swallows the
  // career-end projection (4 trim/yr written onto projected years).
  // A year counts as projected if it's explicitly flagged on carriereRows OR strictly in the
  // future: real validated RIS trimestres can never exist for a year beyond the current one.
  // The future-year fallback is essential because a career reloaded after lock loses the
  // `projected` flag, yet still keeps the projection's future years in trimCotState (a desync
  // with carriereRows, whose grid stops at the current year) — without it those ghost years
  // would silently inflate "acquis".
  const currentYear = new Date().getFullYear();
  const flaggedProjected = new Set(
    (Array.isArray(carriereRows) ? carriereRows : [])
      .filter((r) => r && r.projected)
      .map((r) => String(r.yr))
  );
  const isProjectedYear = (yr) => flaggedProjected.has(String(yr)) || Number(yr) > currentYear;
  const trimCellFor = (yr) => ({
    trimestres_cotises: Number(trimCotState[yr]) || 0,
    trimestres_assimiles: Number(trimAssState[yr]) || 0,
  });
  const trimReal = sumTrimestresCapped(
    Array.from(trimYearsSet).filter((yr) => !isProjectedYear(yr)).map(trimCellFor)
  );
  const trimProjete = sumTrimestresCapped(
    Array.from(trimYearsSet).filter((yr) => isProjectedYear(yr)).map(trimCellFor)
  );
  const trimTotal = trimReal + trimProjete; // total at the projected departure date
  const trimRequis = departureDates?.tauxPlein?.trimRequis ?? null;
  const trimManquants = departureDates?.tauxPlein?.trimManquants ?? null;
  const birthDate = user?.birth_date;
  let age = null;
  if (birthDate) {
    const b = new Date(birthDate);
    if (!isNaN(b.getTime())) {
      const t = new Date();
      age = t.getFullYear() - b.getFullYear();
      const m = t.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    }
  }
  const childrenCount = user?.children_number ?? user?.profil?.children_number ?? null;
  const studyYears = user?.higher_education_years ?? user?.profil?.higher_education_years ?? null;
  const anneesActives = Object.keys(trimCotState).filter(
    (yr) => (Number(trimCotState[yr]) || 0) + (Number(trimAssState[yr]) || 0) + (Number(arState[yr]) || 0) > 0
  ).length;
  const manquantsColor = trimManquants == null ? "#555" : trimManquants === 0 ? "#00B894" : "#C0392B";
  // Bonus maternité CNAV : 8 trim/enfant pour la mère. Information uniquement — ne s'ajoute
  // PAS à trimTotal car appliqué automatiquement par la CNAV au moment du calcul.
  const civ = String(user?.civility || "").toLowerCase().trim();
  const isFemme =
    civ === "madame" || civ === "mme" || civ === "mlle" || civ === "mademoiselle" ||
    String(user?.sexe || "").toUpperCase() === "F";
  const bonusEnfantsCnav = isFemme && childrenCount > 0 ? Number(childrenCount) * 8 : 0;
  // Assess the maternity bonus against REAL acquired trimestres (not the projected total):
  // the question is whether the bonus alone brings her to taux plein today, which the
  // career-end projection would otherwise mask by already reaching the requirement.
  const trimEffectifs = bonusEnfantsCnav > 0 ? trimReal + bonusEnfantsCnav : null;
  const tauxPleinAtteintAvecBonus = trimEffectifs !== null && trimRequis !== null && trimEffectifs >= trimRequis;

  const rows = [
    ["Trimestres acquis (réels)", trimReal > 0 ? `${trimReal} trim.` : "—", "#0984E3"],
    ...(trimProjete > 0
      ? [["+ projetés (poursuite d'activité)", `+${trimProjete} trim. → ${trimTotal} au départ`, "#00B894"]]
      : []),
    ...(trimAr > 0 ? [["dont rachetés", `${trimAr} trim.`, "#1a1a2e"]] : []),
    ...(bonusEnfantsCnav > 0
      ? [[
          `+ bonus maternité (${childrenCount} enfant${childrenCount > 1 ? "s" : ""} × 8)`,
          `+${bonusEnfantsCnav} trim. → ${trimEffectifs} effectifs${tauxPleinAtteintAvecBonus ? " ✓ taux plein atteint" : ""}`,
          tauxPleinAtteintAvecBonus ? "#00B894" : "#FF9F43",
        ]]
      : []),
    ["Trimestres requis (taux plein)", trimRequis != null ? `${trimRequis} trim.` : "—", "#555"],
    ["Trimestres manquants", trimManquants != null ? (trimManquants === 0 ? "✓ atteints" : `${trimManquants} trim.`) : "—", manquantsColor],
    ["Années avec activité", anneesActives > 0 ? `${anneesActives} an${anneesActives > 1 ? "s" : ""}` : "—", "#555"],
    ["Âge actuel", age != null ? `${age} ans` : "—", "#555"],
    ...(childrenCount != null && childrenCount !== "" ? [["Nombre d'enfants", `${childrenCount}`, "#555"]] : []),
    ...(studyYears != null && studyYears !== "" ? [["Années d'études supérieures", `${studyYears} an${Number(studyYears) > 1 ? "s" : ""}`, "#555"]] : []),
    ["SAM CNAV (25 meilleures)", samb > 0 ? `${samb.toLocaleString("fr-FR")} €` : "—", "#1a1a2e"],
    ["Points ARRCO-AGIRC cumulés", arrcoPts > 0 ? `${arrcoPts.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pts` : "—", "#0984E3"],
    ["Projection annuelle (tendance)", projectionAnnuelle > 0 ? `+ ${projectionAnnuelle.toLocaleString("fr-FR")} pts / an` : "—", "#00B894"],
    ["Situation jusqu'au départ", "Poursuite d'activité actuelle", "#555"],
  ];

  const headerStyle = { fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div style={{ background: "#F7F6F3", border: "1px solid #e8e8e8", borderRadius: 9, padding: "10px 14px", marginBottom: 14 }}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ ...headerStyle, marginBottom: open ? 8 : 0, display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%" }}
        >
          <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
          📊 Données de calcul
        </button>
      ) : (
        <div style={headerStyle}>📊 Données de calcul</div>
      )}
      {(!collapsible || open) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 12 }}>
          {rows.map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#555" }}>{label}</span>
              <span style={{ fontWeight: 700, color, fontSize: 12 }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
