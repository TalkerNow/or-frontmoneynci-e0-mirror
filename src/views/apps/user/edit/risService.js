import axios from "axios";

const RIS_WEBHOOK_URL =
  "https://n8n.srv796541.hstgr.cloud/webhook/parse-pdf-salaire";

const N8N_BASE = "https://n8n.srv796541.hstgr.cloud/webhook";

export const WEBHOOKS = {
  PARSE_RIS: RIS_WEBHOOK_URL,
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
  SCRIPT_TNS:         `${N8N_BASE}/tns-executor-v1-test`,
  SCRIPT_CHOMAGE_IND: `${N8N_BASE}/chomage-indemnise-v1-test`,
  SCRIPT_CHOMAGE_NON_IND: `${N8N_BASE}/chomage-non-indemnise-v1-test`,
  SCRIPT_ARRET_ACTIVITE: `${N8N_BASE}/arret-activite-v1-test`,
  SCRIPT_VPLR_INCOMPLETE: `${N8N_BASE}/vplr-annee-incomplete-v1-test`,
  SCRIPT_VPLR_ETUDE: `${N8N_BASE}/vplr-annee-etude-v1-test`,
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
 * Exécute un calcul de régime via le proxy Laravel (évite CORS).
 * @param {string} regimeCode - "CNAV" | "AGIRC_ARRCO" | "IRCANTEC" | "RCI" | "CIPAV"
 * @param {number} clientId
 * @param {string} [userContext]
 * @param {object} [scenarioParams]
 * @returns {Promise<object>} { python_output, alertes, arret_critique? }
 */
export async function executeScript(regimeCode, clientId, userContext) {
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
      scenario_params: {},
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
export async function executeRaclScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "RACL",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse Carrière Longue RACL",
      scenario_params: scenarioParams,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return {
    ...data,
    eligible: data.racl_eligible ?? data.eligible,
    raison_eligibilite: data.racl_result?.message || data.message || data.raison_eligibilite,
  };
}

/**
 * Exécute le calcul Retraite Progressive via le proxy Laravel.
 * @param {number} clientId
 * @param {object} [scenarioParams] - { input: "60" } → quotite_travail=0.60 (optionnel)
 */
export async function executeRpScenario(clientId, scenarioParams = {}) {
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
      user_context: "Analyse Retraite Progressive",
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
 * Exécute l'analyse chômage indemnisé directement via n8n.
 * @param {number} clientId
 * @param {object} [scenarioParams] - { periodes: [{ annee, nb_jours }] }
 * @returns {Promise<object>}
 */
export async function executeChomageIndScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));
  const Config = { headers: { Authorization: "Bearer " + token } };

  const frozenRes = await axios.get(`${global.config.server_url}/frozen_data/${clientId}`, Config);
  const frozenData = frozenRes.data;

  const response = await axios.post(
    WEBHOOKS.SCRIPT_CHOMAGE_IND,
    {
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse chômage indemnisé",
      scenario_params: scenarioParams,
      frozen_data: frozenData,
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
export async function executeArretActiviteScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));
  const Config = { headers: { Authorization: "Bearer " + token } };

  const frozenRes = await axios.get(`${global.config.server_url}/frozen_data/${clientId}`, Config);
  const frozenData = frozenRes.data;

  const response = await axios.post(
    WEBHOOKS.SCRIPT_ARRET_ACTIVITE,
    {
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse arrêt d'activité",
      scenario_params: scenarioParams,
      frozen_data: frozenData,
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
export async function executeChomageNonIndScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));
  const Config = { headers: { Authorization: "Bearer " + token } };

  const frozenRes = await axios.get(`${global.config.server_url}/frozen_data/${clientId}`, Config);
  const frozenData = frozenRes.data;

  const response = await axios.post(
    WEBHOOKS.SCRIPT_CHOMAGE_NON_IND,
    {
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse chômage non indemnisé",
      scenario_params: scenarioParams,
      frozen_data: frozenData,
    },
    { timeout: 90000, headers: { "Content-Type": "application/json" } }
  );

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return data;
}

/**
 * Exécute l'analyse VPLR année incomplète directement via n8n.
 * @param {number} clientId
 * @param {object} [scenarioParams]
 * @returns {Promise<object>}
 */
export async function executeVplrIncompleteScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));
  const Config = { headers: { Authorization: "Bearer " + token } };

  const frozenRes = await axios.get(`${global.config.server_url}/frozen_data/${clientId}`, Config);
  const frozenData = frozenRes.data;

  const response = await axios.post(
    WEBHOOKS.SCRIPT_VPLR_INCOMPLETE,
    {
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse rachat VPLR année incomplète",
      scenario_params: scenarioParams,
      frozen_data: frozenData,
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
  const Config = { headers: { Authorization: "Bearer " + token } };

  const frozenRes = await axios.get(`${global.config.server_url}/frozen_data/${clientId}`, Config);
  const frozenData = frozenRes.data;

  const response = await axios.post(
    WEBHOOKS.SCRIPT_VPLR_ETUDE,
    {
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse rachat VPLR année d'étude",
      scenario_params: scenarioParams,
      frozen_data: frozenData,
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
export async function executeTnsScenario(clientId, scenarioParams = {}) {
  const token = localStorage.getItem("token");
  const userId = parseInt(localStorage.getItem("userid"));

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: "COTISATIONS_MIN",
      client_id: clientId,
      token,
      user_id: userId,
      user_context: "Analyse cotisations minimales TI/TNS",
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
