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
  const userId = localStorage.getItem("userid");

  const WEBHOOK_MAP = {
    CNAV: WEBHOOKS.SCRIPT_CNAV,
    AGIRC_ARRCO: WEBHOOKS.SCRIPT_AGIRC_ARRCO,
    IRCANTEC: WEBHOOKS.SCRIPT_IRCANTEC,
    RCI: WEBHOOKS.SCRIPT_RCI,
    CIPAV: WEBHOOKS.SCRIPT_CIPAV,
  };

  const url = WEBHOOK_MAP[regimeCode];
  if (!url) throw new Error(`Regime inconnu: ${regimeCode}`);

  const response = await axios.post(
    url,
    {
      client_id: clientId,
      token,
      user_id: parseInt(userId),
      user_context: userContext || "Analyse standard",
      scenario_params: {},
      frozen_data_id: null,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 60000 }
  );

  const data = response.data;
  return Array.isArray(data) ? data[0] : data;
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
    { headers: { "Content-Type": "application/json" }, timeout: 60000 }
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
    { headers: { "Content-Type": "application/json" }, timeout: 60000 }
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
  try {
    await axios.post(
      `${global.config.server_url}/v1/analysis-reports`,
      {
        user_id: parseInt(clientId),
        skill_id: skillCode.toLowerCase(),
        result_json: result,
        alertes_json: result.alertes || null,
        arret_critique_json: result.arret_critique || null,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    const detail = err?.response?.data || err.message;
    console.error(`saveSkillResult(${skillCode}) FAILED:`, detail);
    throw err; // re-throw so callers can see it
  }
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
