import axios from "axios";

const RIS_WEBHOOK_URL =
  "https://n8n.srv796541.hstgr.cloud/webhook/parse-pdf-salaire";

const N8N_BASE = "https://n8n.srv796541.hstgr.cloud/webhook";

export const WEBHOOKS = {
  PARSE_RIS: RIS_WEBHOOK_URL,
  PARSE_RIS_V6: `${N8N_BASE}/ris-extraction-v6`,
  CALCULATE: `${N8N_BASE}/production-validated-calculate`,
  SKILL_EXECUTE: `${N8N_BASE}/skill-execute`,
  SKILL_EXECUTE_CNAV_V2: `${N8N_BASE}/skill-execute-cnav-v2-1-test`,
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
export async function executeScript(regimeCode, clientId, userContext, scenarioParams = {}) {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${global.config.server_url}/script/calculate`,
    {
      regime_code: regimeCode,
      client_id: clientId,
      token,
      user_context: userContext || "",
      scenario_params: scenarioParams,
      frozen_data_id: null,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 120000 }
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
 * Exécute le calcul CNAV v2 via le workflow dédié.
 * @param {number} clientId
 * @returns {Promise<object>} { python_output, alertes, arret_critique? }
 */
export async function executeCnavV2(clientId) {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${global.config.server_url}/cnav/calculate`,
    { client_id: clientId, token },
    { headers: { "Content-Type": "application/json" }, timeout: 120000 }
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
