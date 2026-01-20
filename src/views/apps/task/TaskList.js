import React from "react";
import { Button, FormGroup, Input } from "reactstrap";
import { Menu, Search, Check, Star, Trash } from "react-feather";
import PerfectScrollbar from "react-perfect-scrollbar";
import { connect } from "react-redux";
import {
  getTodos,
  completeTask,
  readTask,
  trashTask,
  searchTask,
} from "../../../redux/actions/todo/index";
import Checkbox from "../../../components/@vuexy/checkbox/CheckboxesVuexy";
import SweetAlert from "react-bootstrap-sweetalert";
import dateConvert from "../../../helpers/dateConvert";

const VALID_SERVICES = new Set(["CH", "SIMU", "AR", "TFD", "ACTU", "RAC"]);

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

class TaskList extends React.Component {
  static getDerivedStateFromProps(props, state) {
    if (props.app.todo.routeParam !== state.currentLocation) {
      return {
        todos: props.app.todo.todos,
      };
    }
    // Return null if the state hasn't changed
    return null;
  }
  state = {
    Alert: false,
    delete_id: null,
    todos: [],

    handleUpdateTask: null,
    currentLocation: this.props.routerProps.location.pathname,
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

  parseServices = (raw) => {
    if (raw === null || raw === undefined) return [];
    let s = String(raw).toUpperCase();

    // enlever guillemets et antislashs, unifier séparateurs
    s = s.replace(/["\\]/g, "");
    s = s.replace(/[|,]/g, "/");

    // couper, trim, garder uniquement codes connus (CH, SIMU, AR, TFD, ACTU, RAC)
    const parts = s
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);

    const seen = new Set();
    const out = [];
    for (const p of parts) {
      if (VALID_SERVICES.has(p) && !seen.has(p)) {
        out.push(p);
        seen.add(p);
      }
    }
    return out;
  };

  render() {
    const { todos, handleUpdateTask } = this.state;
    let routerFilter = this.props.routerProps.match.params.filter;
    let todosArr = this.props.searchQuery.length ? this.props.app.todo.filteredTodos : todos;

    // Séparer les tâches urgentes (date dépassée) et les autres
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

    const urgentTodos = todosArr.filter(todo => {
      if (!todo.end_date) return false;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate < now && !todo.isCompleted;
    });

    const normalTodos = todosArr.filter(todo => {
      if (!todo.end_date) return true;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= now || todo.isCompleted;
    });

    const renderTodoItem = (todo, i) => {
      return (
        <li
          className={`todo-item ${todo.isCompleted ? "completed" : ""} py-2 px-3 border-bottom`}
          key={i}
          onClick={() => {
            handleUpdateTask(todo);
          }}
          style={{ transition: "background-color 0.2s" }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center flex-grow-1" style={{ maxWidth: "70%" }}>
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
                <div className="d-flex align-items-center">
                  <span className="font-weight-bold text-primary mr-1">{todo.task_customer?.name || "Client Inconnu"}</span>
                  {todo.task_customer?.subscribe_services && (() => {
                    const services = this.parseServices(todo.task_customer.subscribe_services);
                    return services.map((service) => (
                      <span
                        key={service}
                        className={`badge badge-${chipColors[service]} mr-50`}
                        style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
                      >
                        {service}
                      </span>
                    ));
                  })()}
                  {todo.type && (
                    <span className={`badge badge-light-${todo.type === "relance_caisse" ? "primary" :
                      todo.type === "relance_client" ? "warning" :
                        todo.type === "envoi_caisse" ? "success" :
                          todo.type === "envoi_client" ? "danger" :
                            todo.type === "appel_client" ? "info" : "secondary"
                      } badge-pill font-small-1`}>
                      {todo.type ? todo.type.replace("_", " ") : ""}
                    </span>
                  )}
                </div>
                <span className="text-secondary mt-1">{todo.title}</span>
                {todo.desc && <small className="text-muted mt-50 d-inline-block text-truncate" style={{ maxWidth: "400px" }}>{todo.desc}</small>}
              </div>
            </div>

            <div className="d-flex align-items-center">
              {todo.end_date && (
                <div className={`mr-2 font-small-3 ${new Date() > new Date(todo.end_date) ? "text-danger font-weight-bold" : "text-muted"}`}>
                  {dateConvert(todo.end_date)}
                </div>
              )}
              <div className="d-flex actions">
                <Star
                  size={18}
                  className={`mr-1 cursor-pointer ${todo.isRead ? "text-warning" : "text-muted"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    this.props.readTask(todo);
                  }}
                />
                {routerFilter !== "trashed" && (
                  <Trash
                    size={18}
                    className="text-muted cursor-pointer hover-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      this.setState({ delete_id: todo.id, Alert: true });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </li>
      );
    };

    return (
      <div className="w-100 h-100 d-flex flex-column">
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

        <PerfectScrollbar
          className="todo-task-list flex-grow-1"
          options={{
            wheelPropagation: true,
          }}
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
                {urgentTodos.map((todo, i) => renderTodoItem(todo, `urgent-${i}`))}
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
                {normalTodos.map((todo, i) => renderTodoItem(todo, `normal-${i}`))}
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
  trashTask,
  searchTask,
})(TaskList);
