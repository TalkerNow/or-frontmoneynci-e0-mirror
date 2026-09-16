// Builder de contexte PUR pour le chatbot assistant.
// Lit l'état live du simulateur et le mappe en JSON injecté au LLM.
// Ne calcule aucune règle métier : il agrège des valeurs déjà calculées.
//
// HARD (Cap'tain / JF) : never call calculators.js, ScriptCalculateController,
// n8n script-execute/*, production-validated-calculate, or Flux executeScript
// from this path. Orchestration = lecture-consigne only.

/** Consigne d'orchestration embarquée dans le payload chat (marche sans paste n8n). */
export const ORCHESTRATION_CONSIGNE =
  "Mode lecture-consigne (Assistant fiche Infos). " +
  "Avant toute rédaction Consultation/Calcul/Audit : " +
  "(1) lire profil + résumé carrière + champs_manquants / lacunes, " +
  "(2) lister manques dossier, questions consultant, actions caisses, " +
  "(3) rédiger seulement ensuite — pas d'audit aveugle. " +
  "En doute : question consultant (réponse → KB, pas d'apprentissage silencieux). " +
  "INTERDIT : appeler script-execute / production-validated-calculate / calculators / " +
  "executeScript / ScriptCalculateController / admin-chat apply / skill_calcul_py writes. " +
  "Les pastilles Consultation|Calcul|Audit = mode chat seulement (pas le moteur Flux). " +
  "Analyse carrière / OCR = action utilisateur (Documents ou Assistant +), ne pas auto-déclencher.";

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

function rowYear(r) {
  if (!r || typeof r !== "object") return null;
  const y = r.yr != null ? r.yr : r.annee != null ? r.annee : r.year;
  const n = Number(y);
  return Number.isFinite(n) ? n : null;
}

function rowHasActivity(r) {
  if (!r) return false;
  const sal = Number(r.sal) || 0;
  const ss = Number(r.ss) || 0;
  const trim =
    (Number(r.trimestres_cotises) || 0) + (Number(r.trimestres_assimiles) || 0);
  const pts =
    (Number(r.agircPts) || 0) +
    (Number(r.ircPts) || 0) +
    (Number(r.rciPts) || 0);
  return sal > 0 || ss > 0 || trim > 0 || pts > 0;
}

/** Résumé carrière lecture-seule (pas de calcul métier). */
export function buildCarriereResume(carriereRows = [], carriereValidee = false) {
  const rows = Array.isArray(carriereRows) ? carriereRows : [];
  const years = rows.map(rowYear).filter((y) => y != null).sort((a, b) => a - b);
  const activeYears = rows.filter(rowHasActivity).map(rowYear).filter((y) => y != null);
  const annee_debut = years.length ? years[0] : null;
  const annee_fin = years.length ? years[years.length - 1] : null;

  const lacunes_annees = [];
  if (annee_debut != null && annee_fin != null && annee_fin > annee_debut) {
    const activeSet = new Set(activeYears);
    for (let y = annee_debut; y <= annee_fin; y += 1) {
      if (!activeSet.has(y)) lacunes_annees.push(y);
    }
  }

  const trim_cot = sumBy(rows, "trimestres_cotises");
  const trim_ass = sumBy(rows, "trimestres_assimiles");

  return {
    nb_lignes: rows.length,
    annee_debut,
    annee_fin,
    annees_avec_activite: activeYears.length,
    annees_sans_activite_dans_plage: lacunes_annees.length,
    // Cap to keep chat payload light (full list can be long).
    echantillon_annees_sans_activite: lacunes_annees.slice(0, 25),
    trimestres_cotises: trim_cot,
    trimestres_assimiles: trim_ass,
    trimestres_total: trim_cot + trim_ass,
    points_agirc_arrco: round2(sumBy(rows, "agircPts")),
    points_ircantec: round2(sumBy(rows, "ircPts")),
    points_rci: round2(sumBy(rows, "rciPts")),
    carriere_validee: !!carriereValidee,
  };
}

function displayName(user = {}) {
  const composed = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (composed) return composed;
  if (user.name) return user.name;
  return null;
}

/**
 * @param {object} state
 * @param {object} [state.user]
 * @param {array}  [state.carriereRows]
 * @param {boolean}[state.carriereValidee]
 * @param {array}  [state.chosenScenarios]
 * @param {array}  [state.chosenDates]
 * @param {object|null} [state.scenarioSkillResults]
 * @param {object|null} [state.systemPromptMeta] — GET /v1/system-prompt/latest (meta/extrait)
 * @param {array|null}  [state.promptsCatalogue] — GET /prompts (id+name only)
 * @param {object|null} [state.departureRules] — résumé barème (déjà chargé via initBareme)
 * @param {object|null} [state.registryMeta] — GET /v1/admin-chat/registry (résumé, admin)
 */
export function buildSimulatorContext(state = {}) {
  const {
    user = {},
    carriereRows = [],
    carriereValidee = false,
    chosenScenarios = [],
    chosenDates = [],
    scenarioSkillResults = null,
    systemPromptMeta = null,
    promptsCatalogue = null,
    departureRules = null,
    registryMeta = null,
  } = state;

  const profil = {
    nom: displayName(user),
    prenom: user.first_name || null,
    nom_famille: user.last_name || null,
    date_naissance: user.birth_date || null,
    age: computeAge(user.birth_date || null),
    sexe: user.sexe || user.gender || null,
    nir: user.secu_social || user.nir || null,
  };

  const resume = buildCarriereResume(carriereRows, carriereValidee);

  // Backward-compatible carriere block (tests + consumers) + résumé approfondi.
  const carriere = {
    trimestres_cotises: resume.trimestres_cotises,
    trimestres_assimiles: resume.trimestres_assimiles,
    points_agirc_arrco: resume.points_agirc_arrco,
    carriere_validee: resume.carriere_validee,
    resume,
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
  if (!profil.nir) champs_manquants.push("NIR / numéro de sécurité sociale");
  if (!profil.prenom && !profil.nom_famille && !profil.nom) {
    champs_manquants.push("identité (prénom / nom)");
  }
  if (!Array.isArray(carriereRows) || carriereRows.length === 0) {
    champs_manquants.push("données de carrière");
  } else if (resume.annees_avec_activite === 0) {
    champs_manquants.push("années de carrière avec activité (grille vide / sans salaires)");
  }
  if (Array.isArray(carriereRows) && carriereRows.length > 0 && !carriereValidee) {
    champs_manquants.push("validation carrière (non validée)");
  }
  if (scenarios.scenarios_choisis.length === 0) {
    champs_manquants.push("au moins un scénario à activer");
  }
  if (scenarios.dates_cles.length === 0) {
    champs_manquants.push("une date de départ");
  }

  const admin_lecture = {
    system_prompt: systemPromptMeta || null,
    prompts_catalogue: Array.isArray(promptsCatalogue) ? promptsCatalogue : null,
    departure_rules: departureRules || null,
    registry: registryMeta || null,
  };

  return {
    profil,
    carriere,
    scenarios,
    regimes,
    champs_manquants,
    admin_lecture,
    // Hint for backend LLM: start from dossier completeness; do not skip gaps.
    priorite_reponse: "profil_dossier",
    consigne: ORCHESTRATION_CONSIGNE,
    orchestration: {
      mode: "lecture-consigne",
      priorite: "profil_dossier",
      interdits: [
        "script-execute",
        "production-validated-calculate",
        "calculators.js",
        "executeScript",
        "ScriptCalculateController",
        "admin-chat/apply",
        "skill_calcul_py writes",
      ],
      actions_utilisateur_ok: [
        "careerAnalysisFileReady (menu Documents / Assistant + Analyse carrière)",
        "pastilles chat consultation|calcul|audit (mode only)",
      ],
    },
  };
}
