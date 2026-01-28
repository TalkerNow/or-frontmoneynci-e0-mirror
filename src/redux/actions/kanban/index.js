import { kanbanService } from "../../../services/kanbanService";
import { userKanbanService } from "../../../services/userKanbanService";
import { toast } from "react-toastify";

// ========== ACTIONS COLONNES KANBAN ==========

export const getKanbans = () => {
  return async (dispatch) => {
    try {
      const response = await kanbanService.getAll();
      dispatch({
        type: "GET_KANBANS",
        payload: response.data,
      });
    } catch (error) {
      toast.error("Erreur lors du chargement des colonnes");
      dispatch({
        type: "GET_KANBANS_ERROR",
        error: error.message,
      });
    }
  };
};

export const createKanban = (data) => {
  return async (dispatch) => {
    try {
      const response = await kanbanService.create(data);
      dispatch({
        type: "CREATE_KANBAN",
        payload: response.data,
      });
      toast.success("Colonne créée avec succès");
      dispatch(getKanbans());
    } catch (error) {
      toast.error("Erreur lors de la création de la colonne");
      dispatch({
        type: "CREATE_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};

export const updateKanban = (id, data) => {
  return async (dispatch) => {
    try {
      const response = await kanbanService.update(id, data);
      dispatch({
        type: "UPDATE_KANBAN",
        payload: response.data,
      });
      toast.success("Colonne mise à jour");
      dispatch(getKanbans());
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      dispatch({
        type: "UPDATE_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};

export const deleteKanban = (id) => {
  return async (dispatch) => {
    try {
      await kanbanService.delete(id);
      dispatch({
        type: "DELETE_KANBAN",
        id,
      });
      toast.success("Colonne supprimée");
      dispatch(getKanbans());
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      dispatch({
        type: "DELETE_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};

export const reorderKanbans = (columns) => {
  return async (dispatch) => {
    try {
      await kanbanService.reorder(columns);
      dispatch({
        type: "REORDER_KANBANS",
        payload: columns,
      });
      dispatch(getKanbans());
    } catch (error) {
      toast.error("Erreur lors de la réorganisation");
      dispatch({
        type: "REORDER_KANBANS_ERROR",
        error: error.message,
      });
    }
  };
};

// ========== ACTIONS CARTES KANBAN ==========

export const getUserKanbans = (userId = null) => {
  return async (dispatch) => {
    try {
      const response = userId
        ? await userKanbanService.getByUser(userId)
        : await userKanbanService.getAll();
      dispatch({
        type: "GET_USER_KANBANS",
        payload: response.data,
      });
    } catch (error) {
      toast.error("Erreur lors du chargement des cartes");
      dispatch({
        type: "GET_USER_KANBANS_ERROR",
        error: error.message,
      });
    }
  };
};

export const createUserKanban = (data) => {
  return async (dispatch) => {
    try {
      const response = await userKanbanService.create(data);
      dispatch({
        type: "CREATE_USER_KANBAN",
        payload: response.data,
      });
      toast.success("Carte créée avec succès");
      dispatch(getUserKanbans());
    } catch (error) {
      toast.error("Erreur lors de la création de la carte");
      dispatch({
        type: "CREATE_USER_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};

export const updateUserKanban = (id, data) => {
  return async (dispatch) => {
    try {
      const response = await userKanbanService.update(id, data);
      dispatch({
        type: "UPDATE_USER_KANBAN",
        payload: response.data,
      });
      toast.success("Carte mise à jour");
      dispatch(getUserKanbans());
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      dispatch({
        type: "UPDATE_USER_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};

export const deleteUserKanban = (id) => {
  return async (dispatch) => {
    try {
      await userKanbanService.delete(id);
      dispatch({
        type: "DELETE_USER_KANBAN",
        id,
      });
      toast.success("Carte supprimée");
      dispatch(getUserKanbans());
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      dispatch({
        type: "DELETE_USER_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};

export const moveUserKanban = (id, data) => {
  return async (dispatch) => {
    try {
      await userKanbanService.move(id, data);
      dispatch({
        type: "MOVE_USER_KANBAN",
        id,
        data,
      });
      dispatch(getUserKanbans());
    } catch (error) {
      toast.error("Erreur lors du déplacement");
      dispatch({
        type: "MOVE_USER_KANBAN_ERROR",
        error: error.message,
      });
    }
  };
};
