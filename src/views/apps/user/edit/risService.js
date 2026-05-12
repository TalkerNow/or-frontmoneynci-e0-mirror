import axios from "axios";

const RIS_WEBHOOK_URL =
  "https://n8n.srv796541.hstgr.cloud/webhook/parse-pdf-salaire";

const N8N_BASE = "https://n8n.srv796541.hstgr.cloud/webhook";

export const WEBHOOKS = {
  PARSE_RIS: RIS_WEBHOOK_URL,
  DETECT_DOC_TYPE: `${N8N_BASE}/detect-document-type`,
  PARSE_RIS_V6: `${N8N_BASE}/ris-extraction-v6`,
  CALCULATE: `${N8N_BASE}/production-validated-calculate`,
  SKILL_EXECUTE: `${N8N_BASE}/skill-execute`, // ancien v1 — garder pour prod

  // v2.2 test — un webhook par regime
  SCRIPT_CNAV: `${N8N_BASE}/script-execute-cnav-v2-test`,
  SCRIPT_AGIRC_ARRCO: `${N8N_BASE}/script-execute-agirc-arrco-v2-test`,
  SCRIPT_IRCANTEC: `${N8N_BASE}/script-execute-ircantec-v2-test`,
  SCRIPT_RCI: `${N8N_BASE}/script-execute-rci-v2-test`,
  SCRIPT_CIPAV: `${N8N_BASE}/script-execute-cipav-v2-test`,
  SCRIPT_RACL:        `${N8N_BASE}/racl-executor-v1-test`,
  SCRIPT_RP:          `${N8N_BASE}/rp-executor-v1-test`,
  SCRIPT_CER:         `${N8N_BASE}/cer-executor-v1-test`,
  SCRIPT_TNS:         `${N8N_BASE}/tns-executor-v1-test`,
  SCRIPT_CHOMAGE_IND: `${N8N_BASE}/chomage-indemnise-v1-test`,
  SCRIPT_CHOMAGE_NON_IND: `${N8N_BASE}/chomage-non-indemnise-v1-test`,
  SCRIPT_ARRET_ACTIVITE: `${N8N_BASE}/arret-activite-v1-test`,
  SCRIPT_VPLR: `${N8N_BASE}/vplr-v2-test`,
  SCRIPT_VPLR_INCOMPLETE: `${N8N_BASE}/vplr-annee-incomplete-v1-test`,
  SCRIPT_VPLR_ETUDE: `${N8N_BASE}/vplr-annee-etude-v1-test`,
  SCRIPT_CARPIMKO: `${N8N_BASE}/script-execute-carpimko-v1-test`,
  SCRIPT_CARPIMKO_ASV: `${N8N_BASE}/script-execute-carpimko-v1-test`,
  SCRIPT_CARPIMKO_COMPL: `${N8N_BASE}/script-execute-carpimko-v1-test`,
};

/**
 * Envoie un PDF RIS au webhook n8n et retourne les données parsées.
 * @param {File} file - Le fichier PDF RIS
 * @param {string} message - Le message contextuel
 * @param {string|number} [clientId] - L'ID client (optionnel)
 * @returns {Promise<object>} L'objet de réponse normalisé (jamais un array)
 */
export async function fetchRISAnalysis(file, message, clientId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("message", message);
  if (clientId) formData.append("client_id", clientId);

  const response = await axios.post(RIS_WEBHOOK_URL, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Envoie un PDF RIS au webhook n8n v6 (SimulatorV6 compatible).
 * Retourne : { profil, carriere_synthese, droits_synthese, debug_carriere_detaillee_regex, detail_annuel, alertes_detection }
 * @param {File} file - Le fichier PDF RIS
 * @returns {Promise<object>}
 */
export async function fetchRISAnalysisV6(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(WEBHOOKS.PARSE_RIS, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 min — Gemini + extraction PDF peut prendre du temps
  });

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Détecte si un PDF est un RIS et extrait les données de carrière disponibles.
 * @param {File} file - Le fichier PDF
 * @param {string|number} [clientId] - L'ID client (optionnel)
 * @returns {Promise<{ is_ris: boolean, doc_type: string, carriere: Array, profil: object, synthese: object, meta: object }>}
 */
export async function detectDocumentType(file, clientId) {
  const formData = new FormData();
  formData.append("file", file);
  if (clientId) formData.append("client_id", clientId);

  const response = await axios.post(WEBHOOKS.DETECT_DOC_TYPE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000, // 2 min
  });

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Exécute un calcul de régime via le proxy Laravel (évite CORS).
 * @param {string} regimeCode - "CNAV" | "AGIRC_ARRCO" | "IRCANTEC" | "RCI" | "CIPAV"
 * @param {number} clientId
 * @param {string} [userContext]
 * @param {object} [scenarioParams]
 * @returns {Promise<object>} { python_output, alertes, arret_critique? }
 */
export async function executeScript(regimeCode, clientId, userContext, scenarioParams) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: regimeCode,
      client_id: clientId,
      token,
      user_id: userId,
      user_context: userContext || "Analyse standard",
      scenario_params: scenarioParams || {},
      frozen_data_id: null,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 180000 }
  );

  const data = response.data;
  const result = Array.isArray(data) ? data[0] : data;
  // Handle workflows that return {auditBody, response, token} wrapper
  return result.response || result;
}

/**
 * Exécute un skill via le workflow n8n.
 * @param {string} skillCode - ex: "CNAV"
 * @param {number} clientId
 * @param {string} userContext - Contexte libre du consultant
 * @returns {Promise<object>} { success, report_id, python_output, alertes, status, arret_critique? }
 */
export async function executeSkill(skillCode, clientId, userContext) {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    WEBHOOKS.SKILL_EXECUTE,
    { skill_code: skillCode, client_id: clientId, user_context: userContext || "", token },
    { headers: { "Content-Type": "application/json" }, timeout: 180000 }
  );

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Exécute un calcul AGIRC-ARRCO spécifique via le webhook n8n v2.
 * @param {number} clientId
 * @param {object} payload - Les données de carrière et infos utilisateur requises
 * @returns {Promise<object>} { success, python_output, alertes, ... }
 */
export async function executeAgircArrcoWebhook(clientId, payload) {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    "https://n8n.srv796541.hstgr.cloud/webhook/script-execute-agirc-arrco-v2-test",
    { skill_code: "AGIRC", client_id: clientId, ...payload, token },
    { headers: { "Content-Type": "application/json" }, timeout: 180000 }
  );

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
}


/**
 * Récupère le dernier rapport d'analyse pour un client et un skill donné.
 * @param {number} clientId
 * @param {string} skillCode - ex: "CNAV"
 * @returns {Promise<object|null>}
 */
export async function fetchLatestReport(clientId, skillCode) {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get(
      `${global.config.server_url}/v1/analysis-reports/latest/${clientId}/${skillCode}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

/**
 * Sauvegarde un résultat de calcul en base (analysis_reports).
 * Silencieux — n'interrompt pas l'UI en cas d'erreur.
 * @param {number|string} clientId
 * @param {string} skillCode - ex: "CNAV", "AGIRC_ARRCO"
 * @param {object} result - L'objet retourné par executeScript
 */
export async function saveSkillResult(clientId, skillCode, result) {
  const token = localStorage.getItem("token");
  const normalizedResult = Array.isArray(result) ? result[0] : result;
  if (!normalizedResult || typeof normalizedResult !== "object") return;
  try {
    await axios.post(
      `${global.config.server_url}/v1/analysis-reports`,
      {
        user_id: parseInt(clientId),
        skill_id: skillCode.toLowerCase(),
        result_json: normalizedResult,
        alertes_json: normalizedResult.alertes || null,
        arret_critique_json: normalizedResult.arret_critique || null,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // Nouvelle analyse sauvegardée — lever le flag de reset
    localStorage.removeItem(`simulator_reset_${clientId}`);
  } catch (err) {
    console.warn(`saveSkillResult(${skillCode}) failed:`, err?.response?.data || err.message);
  }
}

// ============================================================
// SKILL EXECUTOR GENERIC — exécute n'importe quel skill de la DB
// Un seul webhook pour les 12 skills (code passé en paramètre)
// ============================================================
const SKILL_EXECUTE_GENERIC_URL =
  "https://n8n.srv796541.hstgr.cloud/webhook/skill-execute-generic-v1-test";

/**
 * Exécute un skill via le workflow n8n générique.
 * @param {string} skillCode - Code du skill : RACL, VPLR, RETRAITE_PROGRESSIVE, etc.
 * @param {Object} opts
 * @param {number} opts.clientId - ID du client
 * @param {string} opts.userContext - Contexte libre du consultant
 * @param {Object} opts.scenarioParams - Params spécifiques au skill
 * @returns {Promise<Object>}
 */
export async function executeSkillGeneric(skillCode, { clientId, userContext, scenarioParams }) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    SKILL_EXECUTE_GENERIC_URL,
    {
      client_id: clientId,
      token,
      user_id: userId,
      skill_code: skillCode,
      user_context: userContext || `Execution skill ${skillCode}`,
      scenario_params: scenarioParams || {},
    },
    { timeout: 180000, headers: { "Content-Type": "application/json" } }
  );

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Exécute le calcul RACL (Retraite Anticipée Carrière Longue).
 * Normalise le résultat : eligible = racl_eligible, raison_eligibilite = message
 * @param {number} clientId
 * @param {object} [scenarioParams]
 * @returns {Promise<object>}
 */
/**
 * Exécute le calcul RACL via le proxy Laravel.
 * Le backend charge frozen_data depuis la DB et l'injecte dans le payload n8n
 * — n8n n'a donc pas besoin de rappeler le serveur (fonctionne en local).
 */
function withConsultantComment(base, extra) {
  const t = (extra || "").trim();
  return t ? `${base}\n\nCommentaire consultant : ${t}` : base;
}

export async function executeRaclScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "RACL",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse Carrière Longue RACL", extraContext),
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  const raclResult = data.racl_result || {};
  const manquants = raclResult.duree_requise != null && raclResult.trim_cotises_actuels != null
    ? Math.max(0, raclResult.duree_requise - raclResult.trim_cotises_actuels)
    : data.manquants ?? null;
  return {
    ...data,
    eligible: data.racl_eligible ?? data.eligible,
    raison_eligibilite: raclResult.raison || raclResult.message || data.message || data.raison_eligibilite || null,
    manquants,
    palier: raclResult.palier ?? data.palier ?? null,
  };
}

/**
 * Exécute le calcul Retraite Progressive via le proxy Laravel.
 * @param {number} clientId
 * @param {object} [scenarioParams] - { input: "60" } → quotite_travail=0.60 (optionnel)
 */
export async function executeRpScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  // Convertit l'input UI (ex: "60") en quotité décimale (0.60)
  const quotiteTravail = scenarioParams.input
    ? parseFloat(scenarioParams.input) / 100
    : null;

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "RP",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse Retraite Progressive", extraContext),
      scenario_params: scenarioParams,
      ...(quotiteTravail !== null && { quotite_travail: quotiteTravail }),
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return {
    ...data,
    eligible: data.rp_eligible ?? data.eligible,
    raison_eligibilite: data.rp_result?.message || data.message || data.raison_eligibilite,
  };
}

/**
 * Exécute le calcul Cumul Emploi-Retraite via le proxy Laravel.
 * @param {number} clientId
 * @param {object} [scenarioParams]
 */
export async function executeCerScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "CER",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse Cumul Emploi-Retraite", extraContext),
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return {
    ...data,
    eligible: data.cer_eligible ?? data.eligible,
    raison_eligibilite: data.cer_result?.message || data.message || data.raison_eligibilite,
  };
}

/**
 * Exécute l'analyse chômage indemnisé directement via n8n.
 * @param {number} clientId
 * @param {object} [scenarioParams] - { periodes: [{ annee, nb_jours }] }
 * @returns {Promise<object>}
 */
export async function executeChomageIndScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "CHOMAGE_INDEMNISE",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse chômage indemnisé", extraContext),
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse arrêt d'activité directement via n8n.
 * @param {number} clientId
 * @param {object} [scenarioParams] - { age_arret: number, ... }
 * @returns {Promise<object>}
 */
export async function executeArretActiviteScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "ARRET_ACTIVITE",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse arrêt d'activité", extraContext),
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse chômage non indemnisé directement via n8n.
 * @param {number} clientId
 * @param {object} [scenarioParams] - { periodes: [{ annee, nb_jours }] }
 * @returns {Promise<object>}
 */
export async function executeChomageNonIndScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "CHOMAGE_NON_INDEMNISE",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse chômage non indemnisé", extraContext),
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse VPLR unifiée (incomplete + études en un appel) via le proxy Laravel.
 * Le workflow n8n unifié calcule les deux dispositifs et gère le plafond légal partagé 12 trim.
 * @param {number} clientId
 * @param {object} [scenarioParams] — accepte trimestres_a_racheter (etudes) et tout autre param
 * @returns {Promise<object>}
 */
export async function executeVplrScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  // Le workflow n8n vplr-v2-test exige frozen_data dans le payload
  // (le proxy Laravel le faisait avant — on appelle direct, donc on doit le fournir)
  let frozen_data = null;
  try {
    const fd = await axios.get(
      `${global.config.server_url}/frozen_data/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    frozen_data = fd.data;
  } catch (e) {
    if (e.response?.status !== 404) throw e;
    // 404 : pas encore de frozen_data — on laisse n8n renvoyer son erreur métier
  }

  // scenario_params doit être un OBJET sérialisé (pas un tableau vide)
  const params = scenarioParams && Object.keys(scenarioParams).length > 0
    ? scenarioParams
    : {};

  const response = await axios.post(
    WEBHOOKS.SCRIPT_VPLR,
    {
      skill_code: "VPLR",
      regime_code: "VPLR",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse rachat VPLR (incomplete + études)", extraContext),
      scenario_params: params,
      frozen_data,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse VPLR année incomplète directement via n8n.
 * @deprecated Utiliser executeVplrScenario qui fusionne incomplete + études.
 * @param {number} clientId
 * @param {object} [scenarioParams]
 * @returns {Promise<object>}
 */
export async function executeVplrIncompleteScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "VPLR_INCOMPLETE",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse rachat VPLR année incomplète",
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse VPLR année d'étude directement via n8n.
 * @param {number} clientId
 * @param {object} [scenarioParams]
 * @returns {Promise<object>}
 */
export async function executeVplrEtudeScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "VPLR_ETUDE",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse rachat VPLR année d'étude",
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse TI/TNS (cotisations minimales) via le proxy Laravel.
 * @param {number} clientId
 * @param {object} [scenarioParams]
 * @returns {Promise<object>}
 */
export async function executeTnsScenario(clientId, scenarioParams = {}, extraContext = "") {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "COTISATIONS_MIN",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: withConsultantComment("Analyse cotisations minimales TI/TNS", extraContext),
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return {
    ...data,
    eligible: data.has_tns ?? data.eligible,
    raison_eligibilite: data.tns_result?.message || data.raison_eligibilite,
  };
}

/**
 * Met à jour le HTML du dernier rapport de simulation retraite d'un client
 * (utilisé après édition consultant via ReportViewerModal — EOR-61).
 * @param {number} clientId
 * @param {string} htmlReport
 * @returns {Promise<object>}
 */
export async function updateSimulationHtml(clientId, htmlReport) {
  const token = localStorage.getItem("token");
  const response = await axios.patch(
    `${global.config.server_url}/v1/simulation-retraite/${clientId}/html`,
    { html_report: htmlReport },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return response.data;
}

/**
 * Récupère la date de départ retenue pour un client (lit frozen_data.date_retenue).
 * @param {number} clientId
 * @returns {Promise<object|null>}
 */
export async function fetchChosenDate(clientId) {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get(
      `${global.config.server_url}/frozen_data/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data?.date_retenue ?? null;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

/**
 * Sauvegarde la date de départ retenue par le consultant.
 * Passer null pour effacer le choix. Autorisé même si la carrière est gelée.
 * @param {number} clientId
 * @param {object|null} date
 * @returns {Promise<object>}
 */
export async function saveChosenDate(clientId, date) {
  const token = localStorage.getItem("token");
  const response = await axios.post(
    `${global.config.server_url}/frozen_data/${clientId}/date`,
    { date },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return response.data;
}

/**
 * Récupère le scénario retenu pour un client (lit frozen_data.scenario_choisi).
 * @param {number} clientId
 * @returns {Promise<object|null>}
 */
export async function fetchChosenScenario(clientId) {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get(
      `${global.config.server_url}/frozen_data/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data?.scenario_choisi ?? null;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

/**
 * Sauvegarde le scénario retenu par le consultant pour un client.
 * Passe `null` pour effacer le choix.
 * Autorisé même si la carrière est gelée.
 * @param {number} clientId
 * @param {object|null} scenario
 * @returns {Promise<object>} le frozen_data mis à jour
 */
export async function saveChosenScenario(clientId, scenario) {
  const token = localStorage.getItem("token");
  const response = await axios.post(
    `${global.config.server_url}/frozen_data/${clientId}/scenario`,
    { scenario },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return response.data;
}

/**
 * Multi-select : récupère le tableau des scénarios retenus.
 * Si la colonne plurielle est vide mais la singulière non, on rebascule
 * pour garder une rétrocompatibilité de lecture.
 * @param {number} clientId
 * @returns {Promise<Array>}
 */
export async function fetchChosenScenarios(clientId) {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get(
      `${global.config.server_url}/frozen_data/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const arr = response.data?.scenarios_choisis;
    if (Array.isArray(arr) && arr.length > 0) return arr;
    const singular = response.data?.scenario_choisi;
    return singular && typeof singular === "object" ? [singular] : [];
  } catch (err) {
    if (err.response && err.response.status === 404) return [];
    throw err;
  }
}

/**
 * Multi-select : sauvegarde le tableau complet des scénarios retenus
 * (sémantique replace). Le backend déduplique par dispositif_id et
 * normalise chosen_at / chosen_by.
 * @param {number} clientId
 * @param {Array} scenarios
 * @returns {Promise<object>} le frozen_data mis à jour
 */
export async function saveChosenScenarios(clientId, scenarios) {
  const token = localStorage.getItem("token");
  const response = await axios.post(
    `${global.config.server_url}/frozen_data/${clientId}/scenarios`,
    { scenarios: Array.isArray(scenarios) ? scenarios : [] },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return response.data;
}

/**
 * Multi-select : récupère le tableau des dates retenues, avec fallback
 * vers la colonne singulière pour rétrocompatibilité.
 * @param {number} clientId
 * @returns {Promise<Array>}
 */
export async function fetchChosenDates(clientId) {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get(
      `${global.config.server_url}/frozen_data/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const arr = response.data?.dates_retenues;
    if (Array.isArray(arr) && arr.length > 0) return arr;
    const singular = response.data?.date_retenue;
    return singular && typeof singular === "object" ? [singular] : [];
  } catch (err) {
    if (err.response && err.response.status === 404) return [];
    throw err;
  }
}

/**
 * Multi-select : sauvegarde le tableau complet des dates retenues.
 * Identité backend : (type, date) — plusieurs `date_libre` distinctes
 * sont autorisées.
 * @param {number} clientId
 * @param {Array} dates
 * @returns {Promise<object>}
 */
export async function saveChosenDates(clientId, dates) {
  const token = localStorage.getItem("token");
  const response = await axios.post(
    `${global.config.server_url}/frozen_data/${clientId}/dates`,
    { dates: Array.isArray(dates) ? dates : [] },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return response.data;
}

/**
 * Récupère la liste des skills disponibles.
 * @param {string} [type] - Filtre optionnel par type
 * @returns {Promise<Array>}
 */
export async function fetchSkillsList(type = null) {
  const token = localStorage.getItem("token");
  let url = `${global.config.server_url}/v1/skills`;
  if (type) url += `?type=${type}`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============================================================
// REPORT CHAT — édition IA d'un livrable AnalysisReport via prompt
// ============================================================

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

/**
 * Récupère la session de chat (et l'historique) pour un AnalysisReport donné.
 * Crée la session côté backend si elle n'existe pas encore.
 * @param {number|string} reportId
 * @returns {Promise<{ session_id: number, messages: Array }>}
 */
export async function fetchReportChat(reportId) {
  const response = await axios.get(
    `${global.config.server_url}/v1/analysis-reports/${reportId}/chat`,
    { headers: authHeaders() }
  );
  return response.data;
}

/**
 * Récupère le contexte exact (frozen_data, calcul_json, current_html, client, system_prompt)
 * qui sera passé à l'IA pour ce livrable. Utilisé par la vue debug "Contexte IA".
 * @param {number|string} reportId
 * @returns {Promise<{ context: { client: object, frozen_data: any, calcul_json: any, current_html: string }, system_prompt: string }>}
 */
export async function fetchReportChatContext(reportId, extraSkillCodes = []) {
  const params = {};
  if (Array.isArray(extraSkillCodes) && extraSkillCodes.length) {
    params.extra_skill_codes = extraSkillCodes;
  }
  const response = await axios.get(
    `${global.config.server_url}/v1/analysis-reports/${reportId}/chat/context`,
    { headers: authHeaders(), params }
  );
  return response.data;
}

/**
 * Envoie un message utilisateur au chat. Le backend appelle Gemini et renvoie
 * la réponse assistant (avec proposed_html éventuel — pas encore appliqué).
 * @param {number|string} reportId
 * @param {string} content
 * @returns {Promise<{ user_message: object, assistant_message: object }>}
 */
export async function sendReportChatMessage(reportId, content, extraSkillCodes = []) {
  const body = { content };
  if (Array.isArray(extraSkillCodes) && extraSkillCodes.length) {
    body.extra_skill_codes = extraSkillCodes;
  }
  const response = await axios.post(
    `${global.config.server_url}/v1/analysis-reports/${reportId}/chat/message`,
    body,
    { headers: authHeaders(), timeout: 180000 }
  );
  return response.data;
}

/**
 * Applique le proposed_html d'un message assistant : crée une nouvelle ReportVersion
 * et met à jour le HTML courant du livrable.
 * @param {number|string} reportId
 * @param {number|string} messageId
 * @returns {Promise<{ version: object, analysis_report: object }>}
 */
export async function applyReportChatMessage(reportId, messageId) {
  const response = await axios.post(
    `${global.config.server_url}/v1/analysis-reports/${reportId}/chat/messages/${messageId}/apply`,
    {},
    { headers: authHeaders() }
  );
  return response.data;
}

/**
 * Liste les versions du HTML d'un livrable (les plus récentes d'abord).
 * @param {number|string} reportId
 * @returns {Promise<Array>}
 */
export async function fetchReportVersions(reportId) {
  const response = await axios.get(
    `${global.config.server_url}/v1/analysis-reports/${reportId}/versions`,
    { headers: authHeaders() }
  );
  return response.data;
}

/**
 * Restaure une ancienne version (en crée une nouvelle pour traçabilité).
 * @param {number|string} reportId
 * @param {number|string} versionId
 * @returns {Promise<{ version: object, analysis_report: object }>}
 */
export async function restoreReportVersion(reportId, versionId) {
  const response = await axios.post(
    `${global.config.server_url}/v1/analysis-reports/${reportId}/versions/${versionId}/restore`,
    {},
    { headers: authHeaders() }
  );
  return response.data;
}

/**
 * Liste les notes IA précédentes du consultant courant pour ce client (20 dernières).
 * @param {number|string} clientId
 * @returns {Promise<{ notes: Array<{id:number, content:string, created_at:string}> }>}
 */
export async function fetchPromptNotes(clientId) {
  const response = await axios.get(
    `${global.config.server_url}/v1/clients/${clientId}/prompt-notes`,
    { headers: authHeaders() }
  );
  return response.data;
}

/**
 * Sauvegarde une note IA pour ce client (déduplique si même contenu existe déjà).
 * @param {number|string} clientId
 * @param {string} content
 * @returns {Promise<{ note: object }>}
 */
export async function savePromptNote(clientId, content) {
  const response = await axios.post(
    `${global.config.server_url}/v1/clients/${clientId}/prompt-notes`,
    { content },
    { headers: authHeaders() }
  );
  return response.data;
}

/**
 * Supprime une note IA par son id (seulement si appartient au consultant courant).
 * @param {number|string} noteId
 * @returns {Promise<{ message: string }>}
 */
export async function deletePromptNote(noteId) {
  const response = await axios.delete(
    `${global.config.server_url}/v1/prompt-notes/${noteId}`,
    { headers: authHeaders() }
  );
  return response.data;
}
