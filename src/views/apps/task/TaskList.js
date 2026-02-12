import React from "react";
import { Link } from "react-router-dom";
import { Check, Trash } from "react-feather";
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
import { Table, Button } from "reactstrap";
import { Edit } from "react-feather";
import SweetAlert from "react-bootstrap-sweetalert";
import dateConvert from "../../../helpers/dateConvert";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import Chip from "../../../components/@vuexy/chips/ChipComponent";
import "react-toastify/dist/ReactToastify.css";

const VALID_SERVICES = new Set(["CH", "SIMU", "AR", "TFD", "ACTU", "RAC"]);

const getPrestationColor = (code) => {
  // Normalisation (uppercase et trim)
  const cleanCode = code ? code.toString().toUpperCase().trim() : "";

  if (cleanCode.includes("AR")) return "primary";
  if (cleanCode.includes("TFD")) return "danger";
  if (cleanCode.includes("SIMU")) return "success";
  if (cleanCode.includes("CH")) return "warning";
  if (cleanCode.includes("ACTU")) return "primary";
  if (cleanCode.includes("RAC")) return "warning";
  return "secondary";
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

    // Pour la confirmation de completion
    showCompleteAlert: false,
    taskToComplete: null,
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
    let todosArr = this.props.searchQuery.length
      ? this.props.app.todo.filteredTodos
      : todos;

    // Séparer les tâches urgentes (date dépassée) et les autres
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

    const urgentTodos = todosArr.filter((todo) => {
      if (todo.isCompleted) return false;
      if (!todo.end_date) return false;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate < now;
    });

    const normalTodos = todosArr.filter((todo) => {
      if (todo.isCompleted) return false;
      if (!todo.end_date) return true;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= now;
    });

    const completedTodos = todosArr.filter((todo) => todo.isCompleted);

    // Combine for display: Urgent first, then Normal Pending, then Completed at the bottom
    const displayTodos = [...urgentTodos, ...normalTodos, ...completedTodos];

    return (
      <div className="w-100 h-100 d-flex flex-column">
        <SweetAlert
          warning
          title="Êtes-vous sûr de vouloir supprimer ?"
          show={this.state.Alert}
          showCancel
          reverseButtons
          closeOnClickOutside
          confirmBtnBsStyle="danger"
          cancelBtnBsStyle="secondary"
          confirmBtnText="Confirmer"
          cancelBtnText="Annuler"
          onConfirm={() => {
            this.setState({ Alert: false });
            this.props.trashTask(this.state.delete_id);
          }}
          onCancel={() => {
            this.setState({ Alert: false, delete_id: null });
          }}
        >
          Cette action supprimera la tâche.
        </SweetAlert>

        {this.state.showCompleteAlert &&
          ReactDOM.createPortal(
            <SweetAlert
              title={
                this.state.taskToComplete?.isCompleted
                  ? "Marquer cette tâche comme non complétée ?"
                  : "Marquer cette tâche comme complétée ?"
              }
              warning
              show={true}
              showCancel
              reverseButtons
              confirmBtnBsStyle="success"
              cancelBtnBsStyle="secondary"
              confirmBtnText="Oui, confirmer"
              cancelBtnText="Annuler"
              onConfirm={() => {
                try {
                  this.props.completeTask(this.state.taskToComplete);

                  const message = this.state.taskToComplete?.isCompleted
                    ? "Tâche marquée comme à faire"
                    : "Tâche marquée comme complétée";

                  toast.success(message, {
                    position: "top-right",
                    autoClose: 3000,
                  });
                } catch (error) {
                  toast.error("Erreur lors de la mise à jour de la tâche", {
                    position: "top-right",
                    autoClose: 3000,
                  });
                }

                this.setState({
                  showCompleteAlert: false,
                  taskToComplete: null,
                });
              }}
              onCancel={() => {
                this.setState({
                  showCompleteAlert: false,
                  taskToComplete: null,
                });
              }}
            >
              {this.state.taskToComplete?.isCompleted
                ? "La tâche sera marquée comme à faire."
                : "La tâche sera marquée comme terminée."}
            </SweetAlert>,
            document.body,
          )}

        <PerfectScrollbar
          className="todo-task-list flex-grow-1"
          options={{
            wheelPropagation: true,
            suppressScrollX: false,
          }}
          style={{ height: "100%" }}
        >
          <Table hover className="table-tasks m-0">
            <thead>
              <tr>
                <th style={{ width: "40px" }} className="pl-3">
                  <div className="text-center">#</div>
                </th>
                <th>Client</th>
                <th>Prestation</th>
                <th>Type</th>
                <th>Tâche à effectuer</th>
                <th>Échéance</th>
                <th className="text-right pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayTodos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-3">
                    Pas de tâches trouvées.
                  </td>
                </tr>
              ) : (
                displayTodos.map((todo, i) => (
                  <tr
                    key={todo.id || i}
                    className={`${todo.isCompleted ? "completed-row" : ""} ${new Date() > new Date(todo.end_date) && !todo.isCompleted && todo.end_date ? "bg-light-danger" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleUpdateTask(todo)}
                  >
                    {/* 1. Checkbox */}
                    <td className="pl-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        color="primary"
                        icon={<Check className="vx-icon" size={12} />}
                        label={""}
                        checked={todo.isCompleted}
                        size="sm"
                        onChange={(e) => {
                          e.stopPropagation();
                          this.setState({
                            showCompleteAlert: true,
                            taskToComplete: todo,
                          });
                        }}
                      />
                    </td>

                    {/* 2. Client */}
                    <td
                      className="font-weight-bold"
                      title={todo.task_customer?.name}
                    >
                      {todo.task_customer?.id ? (
                        <Link
                          to={`/app/user/edit/${todo.task_customer.id}/2`}
                          className="font-weight-bold text-dark client-link"
                          style={{ textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {todo.task_customer.name}
                        </Link>
                      ) : (
                        <span className="text-dark client-link">
                          {todo.task_customer?.name || "Client Inconnu"}
                        </span>
                      )}
                    </td>

                    {/* 3. Prestation (Nouveau) */}
                    <td>
                      <div className="d-flex flex-nowrap align-items-center">
                        {todo.task_customer?.subscribe_services &&
                          (() => {
                            const services = this.parseServices(
                              todo.task_customer.subscribe_services,
                            );
                            if (services.length > 0) {
                              return services.map((service, i) => (
                                <Chip
                                  key={i}
                                  color={getPrestationColor(service)}
                                  className="m-0 text-center mr-1"
                                  text={service}
                                />
                              ));
                            }
                            return <span className="text-muted">-</span>;
                          })()}
                      </div>
                    </td>

                    {/* 4. Type (Badge existant) */}
                    <td>
                      {todo.type && (
                        <span
                          className={`badge badge-light-${
                            todo.type === "relance_caisse"
                              ? "primary"
                              : todo.type === "relance_client"
                                ? "warning"
                                : todo.type === "envoi_caisse"
                                  ? "success"
                                  : todo.type === "envoi_client"
                                    ? "danger"
                                    : todo.type === "appel_client"
                                      ? "info"
                                      : "secondary"
                          }`}
                        >
                          {todo.type ? todo.type.replace("_", " ") : ""}
                        </span>
                      )}
                    </td>

                    {/* 5. Tâche (Titre + Note Grise) */}
                    <td>
                      <div className="d-flex flex-column">
                        <span
                          className="text-dark mb-0 font-weight-bold"
                          style={{ fontSize: "0.9rem" }}
                          title={todo.title}
                        >
                          {todo.title}
                        </span>
                        {todo.desc && (
                          <span
                            className="task-desc text-truncate mt-25"
                            style={{
                              maxWidth: "400px",
                              fontSize: "0.8rem",
                              lineHeight: "1.3",
                            }}
                            title={todo.desc}
                          >
                            {todo.desc}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Échéance */}
                    <td
                      className={`${todo.end_date && new Date() > new Date(todo.end_date) && !todo.isCompleted ? "text-danger font-weight-bold" : ""}`}
                    >
                      {todo.end_date ? dateConvert(todo.end_date) : "-"}
                    </td>

                    {/* 7. Actions */}
                    <td className="text-right pr-3">
                      <Button
                        size="sm"
                        color="flat-primary"
                        className="btn-icon rounded-circle mr-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateTask(todo);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        color="flat-danger"
                        className="btn-icon rounded-circle"
                        onClick={(e) => {
                          e.stopPropagation();
                          this.setState({ delete_id: todo.id, Alert: true });
                        }}
                      >
                        <Trash size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
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
