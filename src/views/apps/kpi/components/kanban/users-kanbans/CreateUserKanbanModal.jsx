import React, { useState, useEffect } from "react";
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
import { Calendar, Clock, FileText, CheckCircle } from "react-feather";
import { toast } from "react-toastify";

const CreateUserKanbanModal = ({ isOpen, onClose, onSuccess, userId }) => {
  const history = useHistory();
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

  // Fetch kanbans on mount
  useEffect(() => {
    if (isOpen) {
      fetchKanbans();
      // Set default date to today
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, date: today }));
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

  const getKanbanColor = (color) => {
    return color || "#60a5fa";
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg">
      <ModalHeader toggle={onClose}>
        <div className="d-flex align-items-center">
          <Calendar size={20} className="mr-50" />
          Ajouter un rendez-vous au Kanban
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

              {/* Date */}
              <FormGroup>
                <Label for="date">
                  <Calendar size={16} className="mr-50" />
                  Date <span className="text-danger">*</span>
                </Label>
                <Input
                  type="date"
                  name="date"
                  id="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              {/* Heure */}
              <FormGroup>
                <Label for="hour">
                  <Clock size={16} className="mr-50" />
                  Heure
                </Label>
                <Input
                  type="time"
                  name="hour"
                  id="hour"
                  value={formData.hour}
                  onChange={handleInputChange}
                />
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
              <FormGroup>
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
              </FormGroup>
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
