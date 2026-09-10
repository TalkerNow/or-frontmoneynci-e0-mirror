// Builder de contexte PUR pour le chatbot assistant.
// Lit l'état live du simulateur et le mappe en JSON injecté au LLM.
// Ne calcule aucune règle métier : il agrège des valeurs déjà calculées.

export function computeAge(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function sumBy(rows, key) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((s, r) => s + (Number(r && r[key]) || 0), 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function buildSimulatorContext(state = {}) {
  const {
    user = {},
    carriereRows = [],
    carriereValidee = false,
    chosenScenarios = [],
    chosenDates = [],
    scenarioSkillResults = null,
  } = state;

  const profil = {
    nom: user.name || null,
    date_naissance: user.birth_date || null,
    age: computeAge(user.birth_date || null),
  };

  const carriere = {
    trimestres_cotises: sumBy(carriereRows, "trimestres_cotises"),
    trimestres_assimiles: sumBy(carriereRows, "trimestres_assimiles"),
    points_agirc_arrco: round2(sumBy(carriereRows, "agircPts")),
    carriere_validee: !!carriereValidee,
  };

  const scenarios = {
    scenarios_choisis: Array.isArray(chosenScenarios) ? chosenScenarios : [],
    dates_cles: Array.isArray(chosenDates) ? chosenDates : [],
  };

  const regimes =
    scenarioSkillResults && Object.keys(scenarioSkillResults).length > 0
      ? scenarioSkillResults
      : null;

  const champs_manquants = [];
  if (!profil.date_naissance) champs_manquants.push("date de naissance");
  if (!Array.isArray(carriereRows) || carriereRows.length === 0)
    champs_manquants.push("données de carrière");
  if (scenarios.scenarios_choisis.length === 0)
    champs_manquants.push("au moins un scénario à activer");
  if (scenarios.dates_cles.length === 0)
    champs_manquants.push("une date de départ");

  return {
    profil,
    carriere,
    scenarios,
    regimes,
    champs_manquants,
    // Hint for backend LLM: start from dossier completeness; do not skip gaps.
    priorite_reponse: "profil_dossier",
    consigne:
      "Commencer par le profil dossier (champs manquants / pièces à documenter). " +
      "Ne pas avancer ni conclure tant que les informations indispensables manquent.",
  };
}
