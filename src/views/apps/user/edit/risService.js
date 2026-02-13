import axios from "axios";

const RIS_WEBHOOK_URL =
  "https://n8n.srv796541.hstgr.cloud/webhook/d4655d2d-133e-48d3-9595-558bdc431952";

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
