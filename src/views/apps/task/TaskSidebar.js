/* eslint-disable */

import React from "react";
import {
  Input,
  Button,
  FormGroup,
  Modal,
  ModalHeader,
  ModalBody,
  Col,
  Row,
} from "reactstrap";
import { Check } from "react-feather";
import { connect } from "react-redux";
import {
  readTask,
  completeTask,
  updateTask,
  updateLabel,
  addNewTask,
} from "../../../redux/actions/todo/index";
import Select from "react-select";
import "flatpickr/dist/themes/light.css";
import "../../../../src/assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import Flatpickr from "react-flatpickr";
import convertDateForFlatpickr from "../../../helpers/convertDateForFlatpickr";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

var senders = [];

const VALID_SERVICES = new Set(["CH", "SIMU", "AR", "TFD", "ACTU", "RAC"]);

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

class FilterSidebar extends React.Component {
  state = {
    basicPicker: new Date(),
    role: localStorage.getItem("role"),
    taskReceiver: "",
    taskToUpdate: null,
    taskTitle: "",
    taskDesc: "",
    taskStatus: false,
    taskRead: false,
    taskType: "",
    taskEndDate: "",
    newTask: {
      receiver: "",
      title: "",
      desc: "",
      type: "",
      isCompleted: false,
      isRead: false,
      end_date: "",
    },
  };

  async componentDidUpdate(prevProps, prevState) {
    if (
      this.props.taskToUpdate !== null &&
      this.state.taskToUpdate !== this.props.taskToUpdate
    ) {
      this.setState({
        taskToUpdate: this.props.taskToUpdate,
        taskTitle: this.props.taskToUpdate.title,
        taskDesc: this.props.taskToUpdate.desc,
        taskStatus: this.props.taskToUpdate.isCompleted,
        taskRead: this.props.taskToUpdate.isRead,
        taskType: this.props.taskToUpdate.type,
        taskEndDate: this.props.taskToUpdate.end_date,
        taskReceiver: this.props.taskToUpdate.customer_id,
      });
    } else if (
      (this.props.taskToUpdate !== null &&
        this.state.taskStatus !== this.props.taskToUpdate.isCompleted) ||
      (this.props.taskToUpdate !== null &&
        this.state.taskRead !== this.props.taskToUpdate.isRead)
    ) {
      this.setState({
        taskStatus: this.props.taskToUpdate.isCompleted,
        taskRead: this.props.taskToUpdate.isRead,
      });
    } else {
      return;
    }
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

  handleEndDate = (date) => {
    var str_date = new Date(date[0]);
    var MyDateString =
      str_date.getFullYear() +
      "-" +
      ("0" + (str_date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + str_date.getDate()).slice(-2);

    if (this.props.taskToUpdate !== null) {
      this.setState({ taskEndDate: MyDateString });
    } else {
      this.setState({
        newTask: { ...this.state.newTask, end_date: MyDateString },
      });
    }
  };

  render() {
    const {
      taskToUpdate,
      taskTitle,
      taskDesc,
      newTask,
      taskStatus,
      taskType,
      taskEndDate,
      taskReceiver,
      taskRead,
    } = this.state;

    const isEditing = this.props.taskToUpdate && this.props.taskToUpdate.id;

    // Vérifier si des changements ont été effectués
    const hasChanges = isEditing
      ? taskTitle !== this.props.taskToUpdate.title ||
        taskDesc !== this.props.taskToUpdate.desc ||
        taskType !== this.props.taskToUpdate.type ||
        taskEndDate !== this.props.taskToUpdate.end_date ||
        taskReceiver !== this.props.taskToUpdate.customer_id
      : true;

    return (
      <Modal
        isOpen={this.props.addTaskState}
        toggle={() => this.props.addTask("close")}
        className="modal-dialog-centered modal-lg"
        style={{ maxWidth: "700px" }}
      >
        <ModalHeader toggle={() => this.props.addTask("close")}>
          <div className="d-flex align-items-center justify-content-between w-100 pr-3">
            <h4 className="mb-0 font-weight-bold">
              {isEditing ? "Modifier la tâche" : "Nouvelle tâche"}
            </h4>

            {/* Actions rapides - icônes seulement */}
            {isEditing && (
              <div className="d-flex ml-3" style={{ gap: "0.5rem" }}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    this.props.completeTask(this.props.taskToUpdate);
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
                {this.props.receivers.length > 0 && (
                  <>
                    <Select
                      className="React"
                      classNamePrefix="select"
                      defaultValue={
                        isEditing
                          ? {
                              value: this.props.taskToUpdate.customer_id,
                              label: this.props.receivers.find(
                                (obj) =>
                                  obj.value ==
                                  this.props.taskToUpdate.customer_id,
                              )?.label,
                            }
                          : null
                      }
                      name="client"
                      options={this.props.receivers}
                      placeholder="Sélectionner un client..."
                      onChange={(option) => {
                        if (isEditing) {
                          this.setState({ taskReceiver: option.value });
                        } else {
                          this.setState({
                            newTask: {
                              ...this.state.newTask,
                              receiver: option.value,
                            },
                          });
                        }
                      }}
                    />

                    {/* Chips services colorés */}
                    {(() => {
                      const selected = this.props.receivers.find(
                        (obj) =>
                          obj.value ==
                          (isEditing ? taskReceiver : newTask.receiver),
                      );
                      if (selected && selected.subscribe_services) {
                        const services = this.parseServices(
                          selected.subscribe_services,
                        );
                        if (services.length > 0) {
                          return (
                            <div
                              className="d-flex flex-wrap mt-50"
                              style={{ gap: "0.25rem" }}
                            >
                              {services.map((service) => (
                                <span
                                  key={service}
                                  className={`badge badge-${chipColors[service]}`}
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  {service}
                                </span>
                              ))}
                            </div>
                          );
                        }
                      }
                    })()}
                  </>
                )}
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
                  value={isEditing ? taskTitle : newTask.title}
                  onChange={(e) => {
                    if (isEditing) {
                      this.setState({ taskTitle: e.target.value });
                    } else {
                      this.setState({
                        newTask: {
                          ...this.state.newTask,
                          title: e.target.value,
                        },
                      });
                    }
                  }}
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
                  value={isEditing ? taskDesc : newTask.desc}
                  onChange={(e) => {
                    if (isEditing) {
                      this.setState({ taskDesc: e.target.value });
                    } else {
                      this.setState({
                        newTask: {
                          ...this.state.newTask,
                          desc: e.target.value,
                        },
                      });
                    }
                  }}
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
                  key={
                    isEditing
                      ? `date-${this.props.taskToUpdate.id}`
                      : "date-new"
                  }
                  id="end_date"
                  className="form-control"
                  options={{ dateFormat: "d/m/Y" }}
                  value={
                    isEditing
                      ? convertDateForFlatpickr(
                          taskEndDate || this.props.taskToUpdate.end_date,
                        )
                      : convertDateForFlatpickr(newTask.end_date)
                  }
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
                <div className="task-type-grid">
                  {[
                    {
                      value: "relance_caisse",
                      label: "Relance caisse",
                      color: "primary",
                    },
                    {
                      value: "relance_client",
                      label: "Relance client",
                      color: "warning",
                    },
                    {
                      value: "envoi_caisse",
                      label: "Envoi caisse",
                      color: "success",
                    },
                    {
                      value: "envoi_client",
                      label: "Envoi client",
                      color: "danger",
                    },
                    {
                      value: "appel_client",
                      label: "Appel client",
                      color: "info",
                    },
                    {
                      value: "appel_caisse",
                      label: "Appel caisse",
                      color: "primary",
                    },
                  ].map((type) => {
                    const isSelected = isEditing
                      ? (taskType || this.props.taskToUpdate.type) == type.value
                      : (newTask.type || "relance_caisse") == type.value;

                    return (
                      <div
                        key={type.value}
                        onClick={() => {
                          if (isEditing) {
                            this.setState({ taskType: type.value });
                          } else {
                            this.setState({
                              newTask: {
                                ...this.state.newTask,
                                type: type.value,
                              },
                            });
                          }
                        }}
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

          {/* Boutons d'action */}
          {(this.state.role == "admin" || this.state.role == "Expert") && (
            <Row className="mt-2">
              <Col md="6">
                <Button
                  color="light"
                  outline
                  block
                  onClick={() => {
                    this.props.addTask("close");
                    this.setState({
                      newTask: {
                        receiver: "",
                        title: "",
                        desc: "",
                        type: "",
                        isCompleted: false,
                        isRead: false,
                        end_date: "",
                      },
                    });
                  }}
                >
                  Annuler
                </Button>
              </Col>
              <Col md="6">
                <Button
                  color="primary"
                  block
                  disabled={
                    (taskTitle.length == 0 && newTask.title.length == 0) ||
                    (isEditing && !hasChanges)
                  }
                  title={
                    isEditing && !hasChanges
                      ? "Aucune modification à enregistrer"
                      : taskTitle.length == 0 && newTask.title.length == 0
                        ? "Le titre est obligatoire"
                        : ""
                  }
                  style={{
                    cursor:
                      (taskTitle.length == 0 && newTask.title.length == 0) ||
                      (isEditing && !hasChanges)
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (isEditing) {
                      const updateTask = {
                        receiver: taskReceiver,
                        title: taskTitle,
                        desc: taskDesc,
                        type: taskType,
                        isCompleted: taskStatus,
                        isRead: taskRead,
                        end_date: taskEndDate,
                      };

                      try {
                        this.props.updateTask(taskToUpdate.id, updateTask);
                        toast.success("Tâche mise à jour avec succès !", {
                          position: "top-right",
                          autoClose: 3000,
                        });
                      } catch (error) {
                        toast.error(
                          "Erreur lors de la mise à jour de la tâche",
                          {
                            position: "top-right",
                            autoClose: 3000,
                          },
                        );
                      }
                    } else {
                      const newTaskObject = this.state.newTask;
                      if (
                        newTaskObject.receiver == "" &&
                        this.props.receivers.length > 0
                      ) {
                        newTaskObject.receiver = this.props.receivers[0].value;
                      }

                      try {
                        this.props.addNewTask(this.state.newTask);
                        toast.success("Tâche créée avec succès !", {
                          position: "top-right",
                          autoClose: 3000,
                        });
                      } catch (error) {
                        toast.error("Erreur lors de la création de la tâche", {
                          position: "top-right",
                          autoClose: 3000,
                        });
                      }
                    }
                    this.props.addTask("close");
                    this.setState({
                      newTask: {
                        receiver: "",
                        title: "",
                        desc: "",
                        type: "",
                        isCompleted: false,
                        isRead: false,
                        end_date: "",
                      },
                    });
                  }}
                >
                  {isEditing ? "Mettre à jour" : "Créer la tâche"}
                </Button>
              </Col>
            </Row>
          )}
        </ModalBody>
      </Modal>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    app: state.todoApp,
  };
};

export default connect(mapStateToProps, {
  completeTask,
  readTask,
  updateTask,
  updateLabel,
  addNewTask,
})(FilterSidebar);
/* eslint-disable */
