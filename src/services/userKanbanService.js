import api from "./api";

/**
 * Service pour gérer les cartes Kanban (rendez-vous utilisateurs)
 */
export const userKanbanService = {
  /**
   * Récupérer toutes les cartes kanban
   * GET /api/user-kanbans
   */
  getAll: () => {
    return api.get("/user-kanbans");
  },

  /**
   * Récupérer une carte kanban par ID
   * GET /api/user-kanbans/{id}
   */
  getById: (id) => {
    return api.get(`/user-kanbans/${id}`);
  },

  /**
   * Récupérer les cartes kanban d'un utilisateur
   * GET /api/user-kanbans/user/{userId}
   */
  getByUser: (userId) => {
    return api.get(`/user-kanbans/user/${userId}`);
  },

  /**
   * Créer une nouvelle carte kanban
   * POST /api/user-kanbans
   * @param {Object} data - { user_id: number, kanban_id: number, title: string, ... }
   */
  create: (data) => {
    return api.post("/user-kanbans", data);
  },

  /**
   * Mettre à jour une carte kanban
   * PUT /api/user-kanbans/{id}
   */
  update: (id, data) => {
    return api.put(`/user-kanbans/${id}`, data);
  },

  /**
   * Supprimer une carte kanban
   * DELETE /api/user-kanbans/{id}
   */
  delete: (id) => {
    return api.delete(`/user-kanbans/${id}`);
  },

  /**
   * Déplacer une carte vers une autre colonne
   * POST /api/user-kanbans/{id}/move
   * @param {number} id - ID de la carte
   * @param {Object} data - { kanban_id: number, order: number }
   */
  move: (id, data) => {
    return api.post(`/user-kanbans/${id}/move`, data);
  },
};
