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
mock.onGet(/\/v1\/skills/).reply(200, [
  {
    skill_id: 1,
    code: "CNAV",
    nom: "CNAV",
    type: "skill_calcul_regime",
    description: "Calcul pension de base CNAV via Python",
    version: "1.0.0",
    priority: 1,
  },
  {
    skill_id: 2,
    code: "AGIRC",
    nom: "AGIRC-ARRCO",
    type: "skill_calcul_regime",
    description: "Calcul pension complémentaire AGIRC-ARRCO",
    version: "1.0.0",
    priority: 2,
  },
  {
    skill_id: 3,
    code: "RACL",
    nom: "RACL",
    type: "skill_dispositif",
    description: "Carrière longue — éligibilité et date de départ anticipé",
    version: "0.1.0",
    priority: 3,
  },
  {
    skill_id: 4,
    code: "VPLR",
    nom: "VPLR",
    type: "skill_dispositif",
    description: "Rachat de trimestres — simulation coût et impact",
    version: "0.1.0",
    priority: 4,
  },
]);
