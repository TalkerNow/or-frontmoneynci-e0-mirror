import api from "../../../services/api"

/**
 * Vérifie l'accès consultant via le gatekeeper n8n.
 * @param {string} lastName
 * @param {string} firstName
 * @param {string} dateOfBirth  format YYYY-MM-DD
 * @returns {Promise<{authorized: boolean, error?: string}>}
 */
export async function verifyConsultantAccess(lastName, firstName, dateOfBirth) {
  const response = await api.post("/v1/consultant-access/verify", {
    last_name: lastName,
    first_name: firstName,
    date_of_birth: dateOfBirth,
  })
  return response.data
}
