const initialState = {
  kanbans: [],
  userKanbans: [],
  loading: false,
  error: null,
};

const kanban = (state = initialState, action) => {
  switch (action.type) {
    // ========== COLONNES KANBAN ==========
    case "GET_KANBANS":
      return {
        ...state,
        kanbans: action.payload,
        loading: false,
        error: null,
      };

    case "CREATE_KANBAN":
      return {
        ...state,
        kanbans: [...state.kanbans, action.payload],
        loading: false,
      };

    case "UPDATE_KANBAN":
      return {
        ...state,
        kanbans: state.kanbans.map((kanban) =>
          kanban.id === action.payload.id ? action.payload : kanban,
        ),
        loading: false,
      };

    case "DELETE_KANBAN":
      return {
        ...state,
        kanbans: state.kanbans.filter((kanban) => kanban.id !== action.id),
        loading: false,
      };

    case "REORDER_KANBANS":
      return {
        ...state,
        kanbans: action.payload,
        loading: false,
      };

    case "GET_KANBANS_ERROR":
    case "CREATE_KANBAN_ERROR":
    case "UPDATE_KANBAN_ERROR":
    case "DELETE_KANBAN_ERROR":
    case "REORDER_KANBANS_ERROR":
      return {
        ...state,
        error: action.error,
        loading: false,
      };

    // ========== CARTES KANBAN ==========
    case "GET_USER_KANBANS":
      return {
        ...state,
        userKanbans: action.payload,
        loading: false,
        error: null,
      };

    case "CREATE_USER_KANBAN":
      return {
        ...state,
        userKanbans: [...state.userKanbans, action.payload],
        loading: false,
      };

    case "UPDATE_USER_KANBAN":
      return {
        ...state,
        userKanbans: state.userKanbans.map((card) =>
          card.id === action.payload.id ? action.payload : card,
        ),
        loading: false,
      };

    case "DELETE_USER_KANBAN":
      return {
        ...state,
        userKanbans: state.userKanbans.filter((card) => card.id !== action.id),
        loading: false,
      };

    case "MOVE_USER_KANBAN":
      return {
        ...state,
        userKanbans: state.userKanbans.map((card) =>
          card.id === action.id ? { ...card, ...action.data } : card,
        ),
        loading: false,
      };

    case "GET_USER_KANBANS_ERROR":
    case "CREATE_USER_KANBAN_ERROR":
    case "UPDATE_USER_KANBAN_ERROR":
    case "DELETE_USER_KANBAN_ERROR":
    case "MOVE_USER_KANBAN_ERROR":
      return {
        ...state,
        error: action.error,
        loading: false,
      };

    default:
      return state;
  }
};

export default kanban;
