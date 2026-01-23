import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  FormGroup,
  Input,
  Row,
  Col,
} from "reactstrap";
import { Plus, Check, Star, Trash } from "react-feather";
import PerfectScrollbar from "react-perfect-scrollbar";
import { connect } from "react-redux";
import {
  getTodos,
  completeTask,
  readTask,
  trashTask,
  addNewTask,
  updateTask,
} from "../../../../redux/actions/client-todo/index";
import Checkbox from "../../../../components/@vuexy/checkbox/CheckboxesVuexy";
import SweetAlert from "react-bootstrap-sweetalert";
import dateConvert from "../../../../helpers/dateConvert";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/light.css";
import "../../../../assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import "../../../../assets/scss/pages/app-todo.scss";

const VALID_SERVICES = new Set(["CH", "SIMU", "AR", "TFD", "ACTU", "RAC"]);

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

const TASK_TYPES = [
  { value: "relance_caisse", label: "Relance caisse", color: "primary" },
  { value: "relance_client", label: "Relance client", color: "warning" },
  { value: "envoi_caisse", label: "Envoi caisse", color: "success" },
  { value: "envoi_client", label: "Envoi client", color: "danger" },
  { value: "appel_client", label: "Appel client", color: "info" },
  { value: "appel_caisse", label: "Appel caisse", color: "primary" },
];

class ClientTasksTab extends React.Component {
  state = {
    Alert: false,
    delete_id: null,
    todos: [],
    modalOpen: false,
    taskToUpdate: null,
    // Form fields
    taskTitle: "",
    taskDesc: "",
    taskType: "relance_caisse",
    taskEndDate: "",
    taskStatus: false,
    taskRead: false,
  };

  _isMounted = false;

  async componentDidMount() {
    this._isMounted = true;
    await this.fetchTasks();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.clientId !== this.props.clientId) {
      this.fetchTasks();
    }
    if (prevProps.app?.todo?.todos !== this.props.app?.todo?.todos) {
      if (this._isMounted) {
        this.setState({ todos: this.props.app.todo.todos || [] });
      }
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchTasks = async () => {
    const routeParams = {
      id: this.props.clientId,
      filter: "all",
    };
    await this.props.getTodos(routeParams);
    if (this._isMounted) {
      this.setState({ todos: this.props.app?.todo?.todos || [] });
    }
  };

  parseServices = (raw) => {
    if (raw === null || raw === undefined) return [];
    let s = String(raw).toUpperCase();
    s = s.replace(/["\\]/g, "");
    s = s.replace(/[|,]/g, "/");
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

  openCreateModal = () => {
    this.setState({
      modalOpen: true,
      taskToUpdate: null,
      taskTitle: "",
      taskDesc: "",
      taskType: "relance_caisse",
      taskEndDate: "",
      taskStatus: false,
      taskRead: false,
    });
  };

  openEditModal = (todo) => {
    this.setState({
      modalOpen: true,
      taskToUpdate: todo,
      taskTitle: todo.title || "",
      taskDesc: todo.desc || "",
      taskType: todo.type || "relance_caisse",
      taskEndDate: todo.end_date || "",
      taskStatus: todo.isCompleted || false,
      taskRead: todo.isRead || false,
    });
  };

  closeModal = () => {
    this.setState({
      modalOpen: false,
      taskToUpdate: null,
      taskTitle: "",
      taskDesc: "",
      taskType: "relance_caisse",
      taskEndDate: "",
      taskStatus: false,
      taskRead: false,
    });
    this.fetchTasks();
  };

  handleEndDate = (date) => {
    if (!date || !date[0]) return;
    const str_date = new Date(date[0]);
    const MyDateString =
      str_date.getFullYear() +
      "-" +
      ("0" + (str_date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + str_date.getDate()).slice(-2);
    this.setState({ taskEndDate: MyDateString });
  };

  handleSubmit = () => {
    const {
      taskToUpdate,
      taskTitle,
      taskDesc,
      taskType,
      taskEndDate,
      taskStatus,
      taskRead,
    } = this.state;
    const { clientId } = this.props;

    if (taskToUpdate) {
      // Update existing task
      const updateData = {
        receiver: clientId,
        title: taskTitle,
        desc: taskDesc,
        type: taskType,
        isCompleted: taskStatus,
        isRead: taskRead,
        end_date: taskEndDate,
      };
      this.props.updateTask(taskToUpdate.id, updateData);
    } else {
      // Create new task
      const newTask = {
        receiver: clientId,
        title: taskTitle,
        desc: taskDesc,
        type: taskType || "relance_caisse",
        isCompleted: false,
        isRead: false,
        end_date: taskEndDate,
      };
      this.props.addNewTask(newTask);
    }
    this.closeModal();
  };

  render() {
    const {
      todos,
      modalOpen,
      taskToUpdate,
      taskTitle,
      taskDesc,
      taskType,
      taskEndDate,
      taskStatus,
      taskRead,
    } = this.state;
    const { clientId, clientName } = this.props;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const urgentTodos = todos.filter((todo) => {
      if (!todo.end_date) return false;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate < now && !todo.isCompleted;
    });

    const normalTodos = todos.filter((todo) => {
      if (!todo.end_date) return true;
      const endDate = new Date(todo.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= now || todo.isCompleted;
    });

    const renderTodoItem = (todo, i) => (
      <li
        className={`todo-item ${todo.isCompleted ? "completed" : ""} py-3 px-3 border-bottom`}
        key={i}
        onClick={() => this.openEditModal(todo)}
        style={{ transition: "all 0.2s", cursor: "pointer" }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div
            className="d-flex align-items-start flex-grow-1"
            style={{ maxWidth: "80%" }}
          >
            <Checkbox
              color="primary"
              className="user-checkbox mr-3 mt-1"
              icon={<Check className="vx-icon" size={12} />}
              label={""}
              checked={todo.isCompleted}
              size="md"
              onClick={(e) => {
                e.stopPropagation();
                this.props.completeTask(todo);
              }}
              onChange={(e) => e.stopPropagation()}
            />

            <div className="d-flex flex-column w-100">
              <div className="d-flex align-items-center flex-wrap mb-50">
                <span className="text-bold-600 text-dark font-medium-2 mr-2">
                  {todo.title}
                </span>

                <div className="d-flex flex-wrap">
                  {todo.task_customer?.subscribe_services &&
                    (() => {
                      const services = this.parseServices(
                        todo.task_customer.subscribe_services,
                      );
                      return services.map((service) => (
                        <span
                          key={service}
                          className={`badge badge-light-${chipColors[service]} badge-pill mr-50 mb-50`}
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.3rem 0.6rem",
                          }}
                        >
                          {service}
                        </span>
                      ));
                    })()}
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
                      } badge-pill mr-50 mb-50`}
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.3rem 0.6rem",
                      }}
                    >
                      {todo.type.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>

              {todo.desc && (
                <p
                  className="text-muted font-small-3 mb-0 text-truncate"
                  style={{ maxWidth: "90%", lineHeight: "1.5" }}
                >
                  {todo.desc}
                </p>
              )}
            </div>
          </div>

          <div
            className="d-flex flex-column align-items-end"
            style={{ minWidth: "100px" }}
          >
            {todo.end_date && (
              <div
                className={`mb-50 font-small-3 ${
                  new Date() > new Date(todo.end_date) && !todo.isCompleted
                    ? "text-danger font-weight-bold"
                    : "text-muted"
                }`}
              >
                {dateConvert(todo.end_date)}
              </div>
            )}
            <div className="d-flex actions">
              <Star
                size={18}
                className={`mr-1 cursor-pointer ${
                  todo.isRead ? "text-warning" : "text-muted"
                }`}
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

    const isEmpty = urgentTodos.length === 0 && normalTodos.length === 0;
    const isEditing = !!taskToUpdate;
    const role = localStorage.getItem("role");

    return (
      <Card className="mb-1 todo-application">
        <CardHeader className="d-flex justify-content-between align-items-center py-1">
          <h5 className="mb-0">Tâches</h5>
          <Button.Ripple
            color="primary"
            size="sm"
            onClick={this.openCreateModal}
          >
            <Plus size={14} className="mr-50" />
            Nouvelle
          </Button.Ripple>
        </CardHeader>
        <CardBody className="p-0">
          <SweetAlert
            warning
            title="Confirmation"
            show={this.state.Alert}
            showCancel
            confirmBtnText="Supprimer"
            cancelBtnText="Annuler"
            onConfirm={() => {
              this.setState({ Alert: false });
              this.props.trashTask(this.state.delete_id);
            }}
            onCancel={() => this.setState({ Alert: false })}
          >
            <p className="sweet-alert-text">
              Êtes-vous certain de vouloir supprimer cette tâche ?
            </p>
          </SweetAlert>

          {isEmpty ? (
            <div className="text-center py-4">
              <p className="text-muted mb-2">Aucune tâche pour ce client</p>
              <Button.Ripple
                color="primary"
                outline
                onClick={this.openCreateModal}
              >
                <Plus size={14} className="mr-50" />
                Créer une tâche
              </Button.Ripple>
            </div>
          ) : (
            <PerfectScrollbar
              className="todo-task-list"
              options={{ wheelPropagation: true }}
              style={{ maxHeight: "400px" }}
            >
              <ul className="todo-task-list-wrapper list-unstyled p-0 m-0 w-100">
                {urgentTodos.length > 0 && (
                  <>
                    <li
                      className="px-3 py-2 bg-white border-bottom"
                      style={{ borderLeft: "3px solid #ea5455" }}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center mr-1"
                          style={{
                            width: "24px",
                            height: "24px",
                            background: "#fff5f5",
                            border: "1px solid #ea5455",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#ea5455",
                              fontWeight: "bold",
                            }}
                          >
                            !
                          </span>
                        </div>
                        <span
                          className="font-weight-bold text-dark"
                          style={{ fontSize: "0.9rem" }}
                        >
                          Tâches urgentes
                        </span>
                        <span
                          className="badge badge-light-danger ml-1"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {urgentTodos.length}
                        </span>
                      </div>
                    </li>
                    {urgentTodos.map((todo, i) =>
                      renderTodoItem(todo, `urgent-${i}`),
                    )}
                  </>
                )}

                {normalTodos.length > 0 && (
                  <>
                    {urgentTodos.length > 0 && (
                      <li
                        className="px-3 py-2 bg-white border-bottom"
                        style={{
                          borderLeft: "3px solid #7367f0",
                          marginTop: "0.5rem",
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center mr-1"
                            style={{
                              width: "24px",
                              height: "24px",
                              background: "#f3f2ff",
                              border: "1px solid #7367f0",
                            }}
                          >
                            <Check size={12} color="#7367f0" />
                          </div>
                          <span
                            className="font-weight-bold text-dark"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Autres tâches
                          </span>
                          <span
                            className="badge badge-light-primary ml-1"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {normalTodos.length}
                          </span>
                        </div>
                      </li>
                    )}
                    {normalTodos.map((todo, i) =>
                      renderTodoItem(todo, `normal-${i}`),
                    )}
                  </>
                )}
              </ul>
            </PerfectScrollbar>
          )}
        </CardBody>

        {/* Task Modal */}
        <Modal
          isOpen={modalOpen}
          toggle={this.closeModal}
          className="modal-dialog-centered modal-lg"
          style={{ maxWidth: "700px" }}
        >
          <ModalHeader toggle={this.closeModal}>
            <div className="d-flex align-items-center justify-content-between w-100 pr-3">
              <h4 className="mb-0 font-weight-bold">
                {isEditing ? "Modifier la tâche" : "Nouvelle tâche"}
              </h4>
              {isEditing && (
                <div className="d-flex ml-3" style={{ gap: "0.5rem" }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      this.props.completeTask(taskToUpdate);
                      this.setState({ taskStatus: !taskStatus });
                    }}
                    title={
                      taskStatus
                        ? "Marquer comme non complétée"
                        : "Marquer comme complétée"
                    }
                    style={{
                      width: "32px",
                      height: "32px",
                      border: `1.5px solid ${taskStatus ? "#28a745" : "#d0d0d0"}`,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: taskStatus ? "#28a745" : "white",
                      transition: "all 0.2s",
                    }}
                  >
                    <Check size={16} color={taskStatus ? "white" : "#999"} />
                  </div>
                  <div
                    onClick={() => {
                      this.props.readTask(taskToUpdate);
                      this.setState({ taskRead: !taskRead });
                    }}
                    title={
                      taskRead ? "Retirer des favoris" : "Ajouter aux favoris"
                    }
                    style={{
                      width: "32px",
                      height: "32px",
                      border: `1.5px solid ${taskRead ? "#ffc107" : "#d0d0d0"}`,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: taskRead ? "#ffc107" : "white",
                      transition: "all 0.2s",
                    }}
                  >
                    <Star
                      size={14}
                      color={taskRead ? "white" : "#999"}
                      fill={taskRead ? "white" : "none"}
                    />
                  </div>
                </div>
              )}
            </div>
          </ModalHeader>

          <ModalBody className="pb-2">
            <Row>
              <Col md="12">
                <FormGroup className="mb-2">
                  <label className="text-bold-600 font-small-3 mb-50">
                    Client
                  </label>
                  <Input
                    type="text"
                    value={clientName || `Client #${clientId}`}
                    disabled
                  />
                  <small className="text-muted">
                    Le client est pré-sélectionné car vous êtes sur sa fiche.
                  </small>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md="12">
                <FormGroup className="mb-2">
                  <label className="text-bold-600 font-small-3 mb-50">
                    Titre *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Relancer le client..."
                    value={taskTitle}
                    onChange={(e) =>
                      this.setState({ taskTitle: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md="12">
                <FormGroup className="mb-2">
                  <label className="text-bold-600 font-small-3 mb-50">
                    Description
                  </label>
                  <Input
                    type="textarea"
                    placeholder="Ajouter des détails..."
                    rows="2"
                    value={taskDesc}
                    onChange={(e) =>
                      this.setState({ taskDesc: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md="12">
                <FormGroup className="mb-2">
                  <label className="text-bold-600 font-small-3 mb-50">
                    Date d'échéance
                  </label>
                  <Flatpickr
                    id="end_date"
                    className="form-control"
                    options={{ dateFormat: "d/m/Y" }}
                    value={taskEndDate}
                    placeholder="Sélectionner une date..."
                    onChange={(date) => this.handleEndDate(date)}
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md="12">
                <FormGroup className="mb-2">
                  <label className="text-bold-600 font-small-3 mb-50">
                    Type de tâche
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "0.5rem",
                    }}
                  >
                    {TASK_TYPES.map((type) => {
                      const isSelected = taskType === type.value;
                      return (
                        <div
                          key={type.value}
                          onClick={() =>
                            this.setState({ taskType: type.value })
                          }
                          className={`badge ${isSelected ? `badge-${type.color}` : "badge-light"}`}
                          style={{
                            padding: "0.45rem 0.3rem",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: isSelected ? "600" : "400",
                            textAlign: "center",
                            transition: "all 0.2s",
                          }}
                        >
                          {type.label}
                        </div>
                      );
                    })}
                  </div>
                </FormGroup>
              </Col>
            </Row>

            {(role === "admin" || role === "Expert") && (
              <Row className="mt-2">
                <Col md="6">
                  <Button color="light" outline block onClick={this.closeModal}>
                    Annuler
                  </Button>
                </Col>
                <Col md="6">
                  <Button
                    color="primary"
                    block
                    disabled={!taskTitle}
                    onClick={this.handleSubmit}
                  >
                    {isEditing ? "Mettre à jour" : "Créer la tâche"}
                  </Button>
                </Col>
              </Row>
            )}
          </ModalBody>
        </Modal>
      </Card>
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
  addNewTask,
  updateTask,
})(ClientTasksTab);
