import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  Spinner,
} from "reactstrap";
import { Calendar, Clock, FileText } from "react-feather";
import { toast } from "react-toastify";

const CreateUserKanbanModal = ({ isOpen, onClose, onSuccess, userId }) => {
  const history = useHistory();
  const dateTimeInputRef = useRef(null);
  const [kanbans, setKanbans] = useState([]);
  const [loadingKanbans, setLoadingKanbans] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    kanban_id: "",
    description: "",
    date: "",
    hour: "",
    status: "scheduled",
  });
  const [includeDateTime, setIncludeDateTime] = useState(false);

  // Fetch kanbans on mount
  useEffect(() => {
    if (isOpen) {
      fetchKanbans();
    }
  }, [isOpen]);

  const fetchKanbans = async () => {
    setLoadingKanbans(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(global.config.server_url + "/kanbans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const kanbansList = Array.isArray(response.data) ? response.data : [];
      setKanbans(kanbansList);
    } catch (error) {
      console.error("Error fetching kanbans:", error);
      toast.error("Erreur lors du chargement des colonnes Kanban");
    } finally {
      setLoadingKanbans(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Si l'utilisateur sélectionne l'option "Créer une colonne"
    if (name === "kanban_id" && value === "create_new") {
      onClose();
      history.push("/kpi/opportunities");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation stricte des champs requis
    if (
      !formData.kanban_id ||
      formData.kanban_id === "create_new" ||
      formData.kanban_id === ""
    ) {
      toast.error("Veuillez sélectionner une colonne Kanban valide");
      return;
    }
    if (!userId) {
      toast.error("Erreur: Aucun utilisateur sélectionné");
      return;
    }
    if (includeDateTime && (!formData.date || formData.date.trim() === "")) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        user_id: userId,
        kanban_id: parseInt(formData.kanban_id),
        description: formData.description || null,
        date: includeDateTime ? formData.date || null : null,
        hour: includeDateTime ? formData.hour || null : null,
        status: formData.status,
      };

      await axios.post(global.config.server_url + "/user-kanbans", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("✅ Rendez-vous ajouté au Kanban avec succès !");

      // Reset form
      setFormData({
        kanban_id: "",
        description: "",
        date: "",
        hour: "",
        status: "scheduled",
      });
      setIncludeDateTime(false);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
      history.push("/kpi/opportunities");
    } catch (error) {
      console.error("Error creating user kanban:", error);
      toast.error(
        "❌ Erreur lors de la création du rendez-vous : " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateTimeChange = (e) => {
    const value = e.target.value;
    if (!value) return;
    const [date, time] = value.split("T");
    setFormData((prev) => ({
      ...prev,
      date: date || prev.date,
      hour: time || prev.hour,
    }));
  };

  const handleIncludeDateToggle = () => {
    setIncludeDateTime((prev) => {
      const next = !prev;
      if (!next) {
        setFormData((cur) => ({ ...cur, date: "", hour: "" }));
      }
      return next;
    });
  };

  const handleDateTimeClick = () => {
    const inputEl = dateTimeInputRef.current;
    if (!inputEl) return;
    if (inputEl.showPicker) {
      inputEl.showPicker();
    } else {
      inputEl.focus();
      inputEl.click();
    }
  };

  const formatDateTimeLabel = () => {
    if (!formData.date) return "Choisir une date";
    const time = formData.hour || "00:00";
    const dt = new Date(`${formData.date}T${time}`);
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(dt);
    return `${dateLabel}  •  ${time}`;
  };

  const setSuggestedTime = (hour) => {
    const now = new Date();
    const tomorrow = new Date(now);
    const daysToAdd = now.getDay() === 5 ? 3 : 1;
    tomorrow.setDate(tomorrow.getDate() + daysToAdd);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];
    setFormData((prev) => ({
      ...prev,
      date: tomorrowDate,
      hour: hour,
    }));
  };

  const formatSuggestedDate = (hour) => {
    const now = new Date();
    const tomorrow = new Date(now);
    const daysToAdd = now.getDay() === 5 ? 3 : 1;
    tomorrow.setDate(tomorrow.getDate() + daysToAdd);
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(tomorrow);
    return `${dateLabel} ${hour.replace(":", "h")}`;
  };

  const getKanbanColor = (color) => {
    return color || "#60a5fa";
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg">
      <ModalHeader toggle={onClose}>
        <div className="d-flex align-items-center">
          <Calendar size={20} className="mr-50" />
          Ajouter une tâche au Kanban
        </div>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {loadingKanbans ? (
            <div className="text-center py-2">
              <Spinner color="primary" />
              <p className="mt-1">Chargement des colonnes...</p>
            </div>
          ) : (
            <>
              {/* Sélection de la colonne Kanban */}
              <FormGroup>
                <Label for="kanban_id">
                  Colonne Kanban <span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  name="kanban_id"
                  id="kanban_id"
                  value={formData.kanban_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Sélectionnez une colonne...</option>
                  {kanbans.map((kanban) => (
                    <option key={kanban.id} value={kanban.id}>
                      {kanban.title}
                    </option>
                  ))}
                  {kanbans.length === 0 && (
                    <option
                      value="create_new"
                      style={{ color: "#7367f0", fontWeight: "bold" }}
                    >
                      <span role="img" aria-label="plus">
                        ➕
                      </span>{" "}
                      Créer une colonne Kanban
                    </option>
                  )}
                </Input>
                {formData.kanban_id && (
                  <div
                    className="mt-50"
                    style={{
                      height: "4px",
                      backgroundColor: getKanbanColor(
                        kanbans.find(
                          (k) => k.id === parseInt(formData.kanban_id),
                        )?.color,
                      ),
                      borderRadius: "2px",
                    }}
                  />
                )}
              </FormGroup>

              {/* Date + Heure */}
              <FormGroup>
                <div className="d-flex align-items-center justify-content-between">
                  <Label className="mb-0 d-flex align-items-center">
                    <Calendar size={16} className="mr-50" />
                    Date & Heure (optionnel)
                  </Label>
                  <div className="d-flex align-items-center">
                    <Input
                      type="checkbox"
                      id="includeDateTime"
                      checked={includeDateTime}
                      onChange={handleIncludeDateToggle}
                    />
                    <Label for="includeDateTime" className="mb-0 ml-50">
                      Ajouter une date
                    </Label>
                  </div>
                </div>
                <div
                  className={`date-time-section mt-1 ${includeDateTime ? "is-open" : "is-closed"}`}
                >
                  <div
                    className="d-flex align-items-stretch"
                    style={{ gap: "8px", flexWrap: "wrap" }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <Button
                        color="primary"
                        outline
                        type="button"
                        onClick={handleDateTimeClick}
                        disabled={!includeDateTime}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0.5rem",
                        }}
                      >
                        <Clock size={16} className="mr-50" />
                        <span
                          style={{ fontSize: "0.75rem", lineHeight: "1.2" }}
                        >
                          {formatDateTimeLabel()}
                        </span>
                      </Button>
                      <Input
                        innerRef={dateTimeInputRef}
                        type="datetime-local"
                        value={
                          formData.date
                            ? `${formData.date}T${formData.hour || "00:00"}`
                            : ""
                        }
                        onChange={handleDateTimeChange}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          pointerEvents: "none",
                          height: 0,
                          width: 0,
                        }}
                        tabIndex={-1}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setSuggestedTime("10:30")}
                      disabled={!includeDateTime}
                      style={{ minWidth: "160px" }}
                    >
                      {formatSuggestedDate("10:30")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setSuggestedTime("16:00")}
                      disabled={!includeDateTime}
                      style={{ minWidth: "160px" }}
                    >
                      {formatSuggestedDate("16:00")}
                    </button>
                  </div>
                  {includeDateTime && formData.date && (
                    <div
                      className="mt-50 text-muted"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Date sélectionnée :{" "}
                      <strong>{formatDateTimeLabel()}</strong>
                    </div>
                  )}
                </div>
              </FormGroup>

              {/* Description */}
              <FormGroup>
                <Label for="description">
                  <FileText size={16} className="mr-50" />
                  Description
                </Label>
                <Input
                  type="textarea"
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Objet du rendez-vous, notes..."
                />
              </FormGroup>

              {/* Statut */}
              {/* <FormGroup>
                <Label for="status">
                  <CheckCircle size={16} className="mr-50" />
                  Statut
                </Label>
                <Input
                  type="select"
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="scheduled">Planifié</option>
                  <option value="confirmed">Confirmé</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </Input>
              </FormGroup> */}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            color="primary"
            type="submit"
            disabled={
              submitting ||
              loadingKanbans ||
              !formData.kanban_id ||
              formData.kanban_id === "create_new" ||
              !userId ||
              (includeDateTime && !formData.date)
            }
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-50" />
                Création...
              </>
            ) : (
              <>
                <Calendar size={14} className="mr-50" />
                Créer le rendez-vous
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default CreateUserKanbanModal;
