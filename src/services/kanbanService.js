import api from "./api";

/**
 * Service pour gérer les colonnes Kanban
 */
export const kanbanService = {
  /**
   * Récupérer toutes les colonnes kanban
   * GET /api/kanbans
   */
  getAll: () => {
    return api.get("/kanbans");
  },

  /**
   * Récupérer une colonne kanban par ID
   * GET /api/kanbans/{id}
   */
  getById: (id) => {
    return api.get(`/kanbans/${id}`);
  },

  /**
   * Créer une nouvelle colonne kanban
   * POST /api/kanbans
   * @param {Object} data - { title: string, order: number }
   */
  create: (data) => {
    return api.post("/kanbans", data);
  },

  /**
   * Mettre à jour une colonne kanban
   * PUT /api/kanbans/{id}
   * @param {number} id
   * @param {Object} data - { title: string, order: number }
   */
  update: (id, data) => {
    return api.put(`/kanbans/${id}`, data);
  },

  /**
   * Supprimer une colonne kanban
   * DELETE /api/kanbans/{id}
   */
  delete: (id) => {
    return api.delete(`/kanbans/${id}`);
  },

  /**
   * Réorganiser les colonnes kanban
   * POST /api/kanbans/reorder
   * @param {Array} columns - [{ id: number, order: number }, ...]
   */
  reorder: (columns) => {
    return api.post("/kanbans/reorder", { columns });
  },
};
