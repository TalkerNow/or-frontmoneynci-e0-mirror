import mock from "../mock";

// ─── Mock data CNAV ──────────────────────────────────────────────────────────
// Basé sur Maurice Smith : SAM 38 420 €, 181 trim., taux plein 50%

const MOCK_CNAV_RESULT = {
  success: true,
  report_id: 1001,
  skill_code: "CNAV",
  status: "success",
  python_output: {
    pension_mensuelle_brute: 1598.33,
    pension_annuelle_brute: 19180.0,
    taux_liquidation: 50,
    coefficient_proratisation: 0.9535,  // 181 trim. / 190 trim. requis
    sam: 38420.0,
    controles: [
      { code: "C01", ok: true,  message: "Durée d'assurance cohérente avec le RIS" },
      { code: "C02", ok: true,  message: "SAM calculé sur les 25 meilleures années" },
      { code: "C03", ok: false, message: "Coefficient de proratisation < 1 — trimestres insuffisants" },
    ],
  },
  alertes: [
    {
      code: "A01",
      niveau: "JAUNE",
      message: "Durée d'assurance inférieure à la durée requise (181/190 trim.). Proratisation appliquée.",
      bloquant: false,
    },
    {
      code: "A02",
      niveau: "JAUNE",
      message: "3 enfants détectés — majoration de 10% applicable (non incluse dans ce calcul).",
      bloquant: false,
    },
  ],
};

// ─── Mock data AGIRC-ARRCO ───────────────────────────────────────────────────
// Basé sur Maurice Smith : 28 330 points, taux plein atteint → pas de coeff solidarité

const MOCK_AGIRC_RESULT = {
  success: true,
  report_id: 1002,
  skill_code: "AGIRC",
  status: "success",
  python_output: {
    pension_mensuelle_brute: 823.40,
    pension_annuelle_brute: 9880.80,
    nb_points_total: 28330,
    coefficient_solidarite: null,   // null = taux plein atteint, pas de malus
    valeur_service: 1.4386,
  },
  alertes: [
    {
      code: "A01",
      niveau: "VERT",
      message: "Taux plein atteint — pas de coefficient de solidarité appliqué.",
      bloquant: false,
    },
  ],
};

// ─── Intercepteurs ───────────────────────────────────────────────────────────

// POST webhook n8n skill-execute → dispatch selon skill_code
mock.onPost(/skill-execute/).reply((config) => {
  let body = {};
  try { body = JSON.parse(config.data); } catch (e) { /* ignore */ }

  if (body.skill_code === "AGIRC") {
    return new Promise((resolve) => {
      setTimeout(() => resolve([200, MOCK_AGIRC_RESULT]), 1800);
    });
  }

  // CNAV par défaut
  return new Promise((resolve) => {
    setTimeout(() => resolve([200, MOCK_CNAV_RESULT]), 1800);
  });
});

// GET /api/v1/analysis-reports/latest/:clientId/CNAV → null (pas de rapport existant)
mock.onGet(/\/v1\/analysis-reports\/latest\/\d+\/CNAV/).reply(404);

// GET /api/v1/skills → liste des skills disponibles
mock.onGet(/\/v1\/skills$/).reply(200, [
  { id: 1,  skill_id: "SKILL_validation_autocontrole_v1", nom: "Autocontrôle Zéro Erreur",                  code: "AUTOCONTROLE",        version: "1.1", type: "skill_validation",    description: "Validation Gate 1 (données obligatoires) + Gate 2 (cohérence). Architecture fail-safe : impossible d'avancer sans validation complète.", priority: 0 },
  { id: 2,  skill_id: "SKILL_validation_continuite_v1",   nom: "Validation Continuité de Carrière",         code: "CONTINUITE",          version: "1.0", type: "skill_validation",    description: "Vérifie la continuité chronologique de la carrière, détecte les trous et incohérences.", priority: 0 },
  { id: 3,  skill_id: "SKILL_normalisation_question_v1",  nom: "Normalisation de Question",                 code: "NORMALISATION",       version: "1.0", type: "skill_preprocessing", description: "Normalise les questions des experts-comptables et clients en requêtes structurées pour le moteur de calcul.", priority: 1 },
  { id: 4,  skill_id: "SKILL_analyse_releve_v2",          nom: "Analyse de Relevé de Carrière Retraite",    code: "ANALYSE_RELEVE",      version: "2.0", type: "skill_analyse",       description: "Analyse complète du relevé de carrière : détection anomalies, périodes manquantes, régimes concernés.", priority: 2 },
  { id: 5,  skill_id: "SKILL_calcul_cnav_v1",             nom: "Calcul Pension CNAV",                       code: "CNAV",                version: "1.0", type: "skill_calcul_regime", description: "Calcul pension BRUTE régime général (Sécurité Sociale). SAM, taux de liquidation, coefficient de proratisation.", priority: 3 },
  { id: 6,  skill_id: "SKILL_complementaires_v1",         nom: "Calcul des Pensions Complémentaires",       code: "COMPLEMENTAIRES",     version: "1.0", type: "skill_calcul_regime", description: "Calcul pensions complémentaires AGIRC-ARRCO, IRCANTEC, RCI. Points, valeur de service, décote/surcote.", priority: 3 },
  { id: 7,  skill_id: "SKILL_racl_v2",                    nom: "RACL - Retraite Anticipée Carrière Longue", code: "RACL",                version: "2.0", type: "skill_dispositif",    description: "Éligibilité RACL : trimestres avant 16/18/20/21 ans, trimestres réputés cotisés, âge de départ anticipé.", priority: 4 },
  { id: 8,  skill_id: "SKILL_vplr_v2",                    nom: "VPLR - Versement Pour La Retraite",         code: "VPLR",                version: "2.0", type: "skill_dispositif",    description: "Simulation rachat de trimestres : éligibilité, coût par trimestre (barème âge/option), impact sur pension.", priority: 4 },
  { id: 9,  skill_id: "SKILL_retraite_progressive_v1",    nom: "Retraite Progressive",                      code: "RETRAITE_PROGRESSIVE",version: "1.0", type: "skill_dispositif",    description: "Éligibilité et simulation retraite progressive : temps partiel, fraction de pension, conditions d'âge et durée.", priority: 4 },
  { id: 10, skill_id: "SKILL_cumul_emploi_retraite_v1",   nom: "Cumul Emploi Retraite",                     code: "CUMUL_EMPLOI_RETRAITE",version: "1.0", type: "skill_dispositif",   description: "Éligibilité cumul emploi-retraite intégral/plafonné, nouvelles cotisations créatrices de droits.", priority: 4 },
  { id: 11, skill_id: "SKILL_trimestres_etranger_v1",     nom: "Trimestres Étranger",                       code: "TRIMESTRES_ETRANGER", version: "1.0", type: "skill_dispositif",    description: "Prise en compte des périodes étrangères : UE, conventions bilatérales, hors convention.", priority: 4 },
  { id: 12, skill_id: "SKILL_reversion_v1",               nom: "Pension de Réversion",                      code: "REVERSION",           version: "1.0", type: "skill_dispositif",    description: "Éligibilité et calcul pension de réversion : conditions d'âge, de ressources, taux de 54%.", priority: 4 },
]);
