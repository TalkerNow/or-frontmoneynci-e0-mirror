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
  Badge,
} from "reactstrap";
import { Calendar, Clock, FileText, CheckCircle } from "react-feather";
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
  const [dateSource, setDateSource] = useState(null); // 'manual' ou 'suggested'

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
    if (!formData.date || formData.date.trim() === "") {
      toast.error("Veuillez sélectionner une date");
      return;
    }
    if (!userId) {
      toast.error("Erreur: Aucun utilisateur sélectionné");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        user_id: userId,
        kanban_id: parseInt(formData.kanban_id),
        description: formData.description || null,
        date: formData.date,
        hour: formData.hour || null,
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

      if (onSuccess) {
        onSuccess();
      }
      onClose();
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
    setDateSource("manual");
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
    if (!formData.date) return "Choisir date et heure";
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

  const isMorning = () => {
    const now = new Date();
    return now.getHours() < 13;
  };

  const setSuggestedTime = (hour) => {
    const now = new Date();
    const tomorrow = new Date(now);

    // Si c'est vendredi (5), ajouter 3 jours pour aller au lundi
    // Sinon, ajouter 1 jour
    const daysToAdd = now.getDay() === 5 ? 3 : 1;

    tomorrow.setDate(tomorrow.getDate() + daysToAdd);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];
    setFormData((prev) => ({
      ...prev,
      date: tomorrowDate,
      hour: hour,
    }));
    setDateSource("suggested");
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
                      ➕ Créer une colonne Kanban
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
                <Label>
                  <Calendar size={16} className="mr-50" />
                  Date & Heure <span className="text-danger">*</span>
                </Label>
                {dateSource && (
                  <div className="text-center mb-50">
                    <Badge
                      color={
                        dateSource === "suggested"
                          ? "light-success"
                          : "light-primary"
                      }
                      className="font-small-2"
                    >
                      {dateSource === "suggested"
                        ? "✓ Suggestion"
                        : "📅 Manuel"}
                    </Badge>
                  </div>
                )}
                <div
                  className="d-flex align-items-stretch"
                  style={{ gap: "12px" }}
                >
                  <div style={{ flex: 1 }}>
                    <Button
                      color="primary"
                      outline
                      type="button"
                      onClick={handleDateTimeClick}
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
                      <span style={{ fontSize: "0.75rem", lineHeight: "1.2" }}>
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
                  <div style={{ flex: 1 }}>
                    {isMorning() ? (
                      <Button
                        color="info"
                        outline
                        type="button"
                        onClick={() => setSuggestedTime("16:30")}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          whiteSpace: "normal",
                          lineHeight: "1.2",
                          padding: "0.5rem",
                        }}
                      >
                        {formatSuggestedDate("16:30")}
                      </Button>
                    ) : (
                      <Button
                        color="info"
                        outline
                        type="button"
                        onClick={() => setSuggestedTime("10:30")}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          whiteSpace: "normal",
                          lineHeight: "1.2",
                          padding: "0.5rem",
                        }}
                      >
                        {formatSuggestedDate("10:30")}
                      </Button>
                    )}
                  </div>
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
              !formData.date ||
              !userId
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
