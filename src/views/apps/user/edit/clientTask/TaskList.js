import React from "react";
import { Button } from "reactstrap";
import { Check, Info, Star, Trash, Plus } from "react-feather";
import PerfectScrollbar from "react-perfect-scrollbar";
import { connect } from "react-redux";
import {
  getTodos,
  completeTask,
  readTask,
  importantTask,
  trashTask,
  searchTask,
} from "../../../../../redux/actions/client-todo/index";
import Checkbox from "../../../../../components/@vuexy/checkbox/CheckboxesVuexy";
import SweetAlert from "react-bootstrap-sweetalert";
import dateConvert from "../../../../../helpers/dateConvert";

class TaskList extends React.Component {
  static getDerivedStateFromProps(props, state) {
    if (props.app.todo.routeParam !== state.currentLocation) {
      return {
        todos: props.app.todo.todos,
      };
    }
    return null;
  }

  state = {
    Alert: false,
    delete_id: null,
    todos: [],
    handleUpdateTask: null,
    currentLocation: this.props.routerProps.location.pathname,
    value: "",
  };

  _isMounted = false;

  async componentDidMount() {
    this._isMounted = true;
    await this.props.getTodos(this.props.routerProps.match.params);
    if (this._isMounted) {
      this.setState({
        todos: this.props.app.todo.todos,
        handleUpdateTask: this.props.handleUpdateTask,
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleOnChange = (e) => {
    this.setState({ value: e.target.value });
    this.props.searchTask(e.target.value);
  };

  // Calcule le style de fond selon le retard (pour mode embedded)
  getOverdueStyle = (todo) => {
    if (todo.isCompleted || !todo.end_date) return {};
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = new Date(todo.end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (endDate >= now) return {};
    
    // Calcul du nombre de jours de retard
    const diffDays = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
    
    // Plus le retard est grand, plus c'est rouge
    if (diffDays >= 14) {
      return { backgroundColor: '#fee2e2', borderLeft: '3px solid #dc2626' }; // Rouge foncé
    } else if (diffDays >= 7) {
      return { backgroundColor: '#fef2f2', borderLeft: '3px solid #ef4444' }; // Rouge moyen
    } else {
      return { backgroundColor: '#fef9f9', borderLeft: '3px solid #f87171' }; // Rouge léger
    }
  };

  render() {
    const { todos, handleUpdateTask } = this.state;
    const { embedded, addTask } = this.props;

    let todosArr = (this.props.searchQuery && this.props.searchQuery.length) 
      ? this.props.app.todo.filteredTodos 
      : todos;

    // Séparer les tâches urgentes (date dépassée) et les autres
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const urgentTodos = todosArr.filter((todo) => {
      if (!todo.end_date) return false;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate < now && !todo.isCompleted;
    });

    const normalTodos = todosArr.filter((todo) => {
      if (!todo.end_date) return true;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= now || todo.isCompleted;
    });

    const renderTodoItem = (todo, i, useColorCode = false) => {
      const overdueStyle = useColorCode ? this.getOverdueStyle(todo) : {};
      
      return (
        <li
          className={`todo-item ${todo.isCompleted ? "completed" : ""} py-2 px-3 border-bottom`}
          key={i}
          onClick={() => {
            handleUpdateTask(todo);
          }}
          style={{ transition: "background-color 0.2s", ...overdueStyle }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center flex-grow-1" style={{ maxWidth: "80%" }}>
              <Checkbox
                color="primary"
                className="user-checkbox mr-1"
                icon={<Check className="vx-icon" size={12} />}
                label={""}
                checked={todo.isCompleted}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  this.props.completeTask(todo);
                }}
                onChange={(e) => e.stopPropagation()}
              />

              <div className="d-flex flex-column">
                <div className="d-flex align-items-center mb-50">
                  <h6 className="todo-title mb-0 mr-1">{todo.title}</h6>
                  {todo.type && (
                    <span className={`badge badge-light-${
                      todo.type === "relance_caisse" ? "primary" :
                      todo.type === "relance_client" ? "warning" :
                      todo.type === "envoi_caisse" ? "success" :
                      todo.type === "envoi_client" ? "danger" :
                      todo.type === "appel_client" ? "info" : "secondary"
                    } badge-pill font-small-1`}>
                      {todo.type.replace("_", " ")}
                    </span>
                  )}
                </div>
                {todo.desc && (
                  <small className="text-muted d-inline-block text-truncate" style={{ maxWidth: "500px" }}>
                    {todo.desc}
                  </small>
                )}
              </div>
            </div>

            <div className="d-flex align-items-center">
              {todo.end_date && (
                <div className={`mr-2 font-small-3 ${
                  new Date() > new Date(todo.end_date) && !todo.isCompleted 
                    ? "text-danger font-weight-bold" 
                    : "text-muted"
                }`}>
                  {dateConvert(todo.end_date)}
                </div>
              )}
              <div className="d-flex actions">
                <div
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.props.importantTask(todo);
                  }}
                >
                  <Info
                    size={18}
                    className={`${todo.isImportant ? "text-success" : "text-muted"}`}
                  />
                </div>
                <Star
                  size={18}
                  className={`mr-1 cursor-pointer ${todo.isRead ? "text-warning" : "text-muted"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    this.props.readTask(todo);
                  }}
                />
                <Trash
                  size={18}
                  className="text-muted cursor-pointer hover-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.setState({ delete_id: todo.id, Alert: true });
                  }}
                />
              </div>
            </div>
          </div>
        </li>
      );
    };

    // MODE EMBEDDED : liste simple avec code couleur
    if (embedded) {
      // Trier par date (les plus urgentes en premier)
      const sortedTodos = [...todosArr].sort((a, b) => {
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return new Date(a.end_date) - new Date(b.end_date);
      });

      return (
        <div className="content-right w-100 h-100 d-flex flex-column" style={{ width: "100%" }}>
          <SweetAlert
            warning
            title="Attention"
            show={this.state.Alert}
            onConfirm={() => {
              this.setState({ Alert: false });
              this.props.trashTask(this.state.delete_id);
            }}
          >
            <p className="sweet-alert-text"> Êtes-vous certain ? </p>
          </SweetAlert>

          <div className="todo-app-area w-100 h-100">
            <div className="todo-app-list-wrapper w-100 h-100">
              <div className="todo-app-list w-100 h-100">
                <PerfectScrollbar
                  className="todo-task-list w-100"
                  options={{ wheelPropagation: true }}
                  style={{ height: "100%" }}
                >
                  <ul className="todo-task-list-wrapper list-unstyled p-0 m-0 w-100">
                    {/* Header avec bouton Nouvelle */}
                    <li 
                      className="px-3 py-2 bg-white border-bottom d-flex justify-content-between align-items-center"
                      style={{ position: 'sticky', top: 0, zIndex: 2 }}
                    >
                      <span className="font-weight-bold text-dark">
                        {sortedTodos.length} tâche{sortedTodos.length > 1 ? 's' : ''}
                      </span>
                      <Button
                        color="primary"
                        size="sm"
                        onClick={() => addTask("open")}
                        title="Ajouter une nouvelle tâche"
                      >
                        <Plus size={14} className="mr-50" />
                        Nouvelle
                      </Button>
                    </li>

                    {/* Liste des tâches avec code couleur */}
                    {sortedTodos.length > 0 ? (
                      sortedTodos.map((todo, i) => renderTodoItem(todo, i, true))
                    ) : (
                      <p className="p-1 text-center mt-2 font-medium-3 text-bold-500">
                        Pas de tâches trouvées.
                      </p>
                    )}
                  </ul>
                </PerfectScrollbar>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // MODE NORMAL : avec sections urgentes / autres
    return (
      <div className="content-right w-100 h-100 d-flex flex-column" style={{ width: "100%" }}>
        <SweetAlert
          warning
          title="Warning"
          show={this.state.Alert}
          onConfirm={() => {
            this.setState({ Alert: false });
            this.props.trashTask(this.state.delete_id);
          }}
        >
          <p className="sweet-alert-text"> Êtes-vous certain? </p>
        </SweetAlert>

        <div className="todo-app-area w-100 h-100">
          <div className="todo-app-list-wrapper w-100 h-100">
            <div className="todo-app-list w-100 h-100">
              <PerfectScrollbar
                className="todo-task-list w-100"
                options={{ wheelPropagation: true }}
                style={{ height: "100%" }}
              >
                <ul className="todo-task-list-wrapper list-unstyled p-0 m-0 w-100">
                  {/* Section Urgent */}
                  {urgentTodos.length > 0 && (
                    <>
                      <li
                        className="px-3 py-2 bg-white border-bottom"
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          borderLeft: '3px solid #ea5455'
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center mr-1"
                            style={{
                              width: '24px',
                              height: '24px',
                              background: '#fff5f5',
                              border: '1px solid #ea5455'
                            }}
                          >
                            <span style={{ fontSize: '12px', color: '#ea5455', fontWeight: 'bold' }}>!</span>
                          </div>
                          <span className="font-weight-bold text-dark" style={{ fontSize: '0.9rem' }}>
                            Tâches urgentes
                          </span>
                          <span className="badge badge-light-danger ml-1" style={{ fontSize: '0.7rem' }}>
                            {urgentTodos.length}
                          </span>
                        </div>
                      </li>
                      {urgentTodos.map((todo, i) => renderTodoItem(todo, `urgent-${i}`, false))}
                    </>
                  )}

                  {/* Section Tâches normales */}
                  {normalTodos.length > 0 && (
                    <>
                      {urgentTodos.length > 0 && (
                        <li
                          className="px-3 py-2 bg-white border-bottom"
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                            borderLeft: '3px solid #7367f0',
                            marginTop: '0.5rem'
                          }}
                        >
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center mr-1"
                              style={{
                                width: '24px',
                                height: '24px',
                                background: '#f3f2ff',
                                border: '1px solid #7367f0'
                              }}
                            >
                              <Check size={12} color="#7367f0" />
                            </div>
                            <span className="font-weight-bold text-dark" style={{ fontSize: '0.9rem' }}>
                              Autres tâches
                            </span>
                            <span className="badge badge-light-primary ml-1" style={{ fontSize: '0.7rem' }}>
                              {normalTodos.length}
                            </span>
                          </div>
                        </li>
                      )}
                      {normalTodos.map((todo, i) => renderTodoItem(todo, `normal-${i}`, false))}
                    </>
                  )}

                  {/* Message si aucune tâche */}
                  {urgentTodos.length === 0 && normalTodos.length === 0 && (
                    <p className="p-1 text-center mt-2 font-medium-3 text-bold-500">
                      Pas de tâches trouvées.
                    </p>
                  )}
                </ul>
              </PerfectScrollbar>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    app: state.todoApp,
  };
};

export default connect(mapStateToProps, {
  getTodos,
  completeTask,
  readTask,
  importantTask,
  trashTask,
  searchTask,
})(TaskList);