import axios from "axios"
import { history } from "../../../history"

export const getTodos = (routeParams) => {
  return async dispatch => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.get(global.config.server_url + "/customer_tasks?filter="+routeParams.filter + "&user_id="+routeParams.id, Config).then(response => {
      dispatch({
        type: "GET_TODOS",
        todos: response.data,
        routeParams
      })
    });
  }
}

export const completeTask = todo => {
  return async dispatch => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.put(global.config.server_url + "/tasks/"+todo.id, {
      isCompleted: !todo.isCompleted,
    }, Config).then(response => {
      dispatch({ type: "COMPLETE_TASK", id: todo.id, value: todo.isCompleted })
    });
  }
}

export const readTask = todo => {
  return async dispatch => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.put(global.config.server_url + "/tasks/"+todo.id, {
      isRead: !todo.isRead,
    }, Config).then(response => {
      Promise.all([
        dispatch({ type: "READ_TASK", id: todo.id, value: todo.isRead })
      ])
    });
  }
}

export const importantTask = todo => {
  return async dispatch => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.put(global.config.server_url + "/tasks/"+todo.id, {
      isRead: !todo.isImportant,
    }, Config).then(response => {
      Promise.all([
        dispatch({ type: "IMPORTANT_TASK", id: todo.id, value: todo.isImportant })
      ])
    });
  }
}

export const trashTask = id => {
  return async (dispatch, getState) => {
    const params = getState().todoApp.todo.routeParam;

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }

    await axios.delete(global.config.server_url + "/tasks/"+ id, Config).then(response => {
      dispatch(getTodos(params))
    });
  }
}

export const updateTask = (id, updatedTask) => {
  return async dispatch => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.put(global.config.server_url + "/tasks/"+id, {

      title:updatedTask.title,
      desc: updatedTask.desc,
      isCompleted: updatedTask.isCompleted,
      isImportant:updatedTask.isImportant,
      isRead: updatedTask.isRead,
      type: updatedTask.type,
      end_date: updatedTask.end_date,
      customer_id: updatedTask.receiver,

    }, Config).then(response => {
      dispatch({ type: "UPDATE_TASK", id: id, task: updatedTask })
    });
  }
}

export const updateLabel = (id, label) => {
  return (dispatch, getState) => {
    dispatch({ type: "UPDATE_LABEL", label, id })
  }
}

export const addNewTask = task => {
  return async (dispatch, getState) => {
    const params = getState().todoApp.todo.routeParam;

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }

    await axios.post(global.config.server_url + "/tasks", {
        title:task.title,
        desc: task.desc,
        isCompleted: task.isCompleted,
        isImportant:task.isImportant,
        isRead: task.isRead,
        type: task.type,
        end_date: task.end_date,
        customer_id: task.receiver,
        creator_id: localStorage.getItem("userid")
    }, Config).then(response => {
        dispatch({ type: "ADD_TASK", task })
        dispatch(getTodos(params))
    });
  }
}

export const searchTask = val => {
  return dispatch => {
    dispatch({
      type: "SEARCH_TASK",
      val
    })
  }
}

export const changeFilter = (id, filter) => {
  return dispatch => {
    dispatch({ type: "CHANGE_FILTER", filter })
    history.push(`/app/member/memberTask/${id}/${filter}`)
    dispatch(getTodos({'id':id, 'filter': filter }))
  }
}
