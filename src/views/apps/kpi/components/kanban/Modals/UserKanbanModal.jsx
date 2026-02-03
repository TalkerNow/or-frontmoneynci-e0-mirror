import React from "react";
import { withRouter } from "react-router-dom";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Badge,
  FormGroup,
  Label,
} from "reactstrap";
import {
  Star,
  Edit,
  Trash2,
  User,
  FileText,
  Clock,
  Calendar,
  Check,
  X,
  Target,
  MessageSquare,
  Plus,
  ChevronUp,
  ChevronDown,
} from "react-feather";
import SweetAlert from "react-bootstrap-sweetalert";
import ContractButton from "../Buttons/Contract";
import {
  calculateComplexityScore,
  generateVisualReport,
} from "../../inbox/utils";
import VisualReportModal from "../../inbox/VisualReportModal";
import axios from "axios";
import { toast } from "react-toastify";

// Composant fonctionnel pour le bouton de création de contrat
const CreateContractButton = ({ onClick, disabled }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onClick) onClick();
        }
      }}
      title="Créer un contrat"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        border: isHovered ? "1px solid #7367f0" : "1px dashed #7367f0",
        borderRadius: "8px",
        padding: "8px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        backgroundColor: isHovered && !disabled ? "#7367f0" : "#f8fafc",
        minWidth: "72px",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Plus size={16} color={isHovered && !disabled ? "#ffffff" : "#7367f0"} />
    </div>
  );
};

class UserKanbanModal extends React.Component {
  constructor(props) {
    super(props);
    this.dateTimeInputRef = React.createRef();
    this.state = {
      isEditing: false,
      showDeleteAlert: false,
      showDeleteContractAlert: false,
      contractToDelete: null,
      deletingContract: false,
      deletedContractIds: [],
      createdContracts: [],
      editFormData: {
        kanban_id: "",
        date: "",
        hour: "",
        description: "",
        status: "scheduled",
      },
      dateSource: null, // 'manual' ou 'suggested'
      displayCard: null, // Copie locale de selectedCard pour l'affichage
      showCreateContractForm: false, // Pour afficher/cacher le formulaire de création de contrat
      creatingContract: false, // Flag pour le spinner de chargement
      showVisualReport: false, // Pour afficher/cacher le rapport visuel du diagnostic
      contractTemplateValues: null,
      contractTemplateLoaded: false,
      contractTemplateLoading: false,
      contractFormData: {
        comment: "",
        selectedRows: [], // Array of row ids: 'r1'..'r7'
        advanced_payment: 0,
        pre_payment: 0,
        end_payment: 0,
      },
    };
  }

  componentDidUpdate(prevProps) {
    // Réinitialiser l'état d'édition quand la modale se ferme
    if (prevProps.isOpen && !this.props.isOpen) {
      this.setState({ isEditing: false, dateSource: null, displayCard: null });
    }
    // Initialiser displayCard quand la modale s'ouvre ou quand selectedCard change
    if (
      this.props.selectedCard &&
      this.props.selectedCard !== prevProps.selectedCard
    ) {
      this.setState({ displayCard: { ...this.props.selectedCard } });
    }
  }

  handleStartEdit = () => {
    const { displayCard } = this.state;
    const cardToEdit = displayCard || this.props.selectedCard;
    this.setState({
      isEditing: true,
      editFormData: {
        kanban_id: cardToEdit.kanban_id || "",
        date: cardToEdit.date || "",
        hour: cardToEdit.hour || "",
        description: cardToEdit.description || "",
        status: cardToEdit.status || "scheduled",
      },
    });
  };

  handleCancelEdit = () => {
    this.setState({ isEditing: false, dateSource: null });
  };

  handleEditFormChange = (field, value) => {
    this.setState({
      editFormData: {
        ...this.state.editFormData,
        [field]: value,
      },
    });
  };

  handleSaveEdit = async () => {
    const { editFormData } = this.state;
    const { onSave } = this.props;

    if (!editFormData.kanban_id || !editFormData.date) {
      alert("La colonne Kanban et la date sont obligatoires");
      return;
    }

    try {
      await onSave(editFormData);
      // Mettre à jour displayCard avec les nouvelles valeurs
      this.setState((prevState) => ({
        isEditing: false,
        dateSource: null,
        displayCard: {
          ...prevState.displayCard,
          kanban_id: editFormData.kanban_id,
          date: editFormData.date,
          hour: editFormData.hour,
          description: editFormData.description,
          status: editFormData.status,
        },
      }));
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour du rendez-vous");
    }
  };

  handleMoveToKanban = async (newKanbanId) => {
    const { selectedCard, onSave } = this.props;
    const editFormData = {
      kanban_id: newKanbanId,
      date: selectedCard.date,
      hour: selectedCard.hour,
      description: selectedCard.description,
      status: selectedCard.status,
    };
    try {
      await onSave(editFormData);
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
      alert("Erreur lors du déplacement du rendez-vous");
    }
  };

  // Méthodes pour le sélecteur de date/heure
  handleDateTimeClick = () => {
    const inputEl = this.dateTimeInputRef.current;
    if (!inputEl) return;
    if (inputEl.showPicker) {
      inputEl.showPicker();
    } else {
      inputEl.focus();
      inputEl.click();
    }
  };

  handleDateTimeChange = (e) => {
    const value = e.target.value;
    if (!value) return;
    const [date, time] = value.split("T");
    this.setState((prevState) => ({
      editFormData: {
        ...prevState.editFormData,
        date: date || prevState.editFormData.date,
        hour: time || prevState.editFormData.hour,
      },
      dateSource: "manual",
    }));
  };

  formatDateTimeLabel = () => {
    const { editFormData } = this.state;
    if (!editFormData.date) return "Choisir date et heure";
    const time = editFormData.hour || "00:00";
    const dt = new Date(`${editFormData.date}T${time}`);
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(dt);
    return `${dateLabel}  •  ${time}`;
  };

  isMorning = () => {
    const now = new Date();
    return now.getHours() < 13;
  };

  setSuggestedTime = (hour) => {
    const now = new Date();
    const tomorrow = new Date(now);
    const daysToAdd = now.getDay() === 5 ? 3 : 1;
    tomorrow.setDate(tomorrow.getDate() + daysToAdd);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];
    this.setState((prevState) => ({
      editFormData: {
        ...prevState.editFormData,
        date: tomorrowDate,
        hour: hour,
      },
      dateSource: "suggested",
    }));
  };

  formatSuggestedDate = (hour) => {
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

  getRelativeDateBadge = (dateString) => {
    if (!dateString) return null;
    const datePart = dateString.split("T")[0];
    const date = new Date(`${datePart}T00:00:00`);
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const toKey = (d) => d.toISOString().split("T")[0];
    const dateKey = toKey(date);

    if (dateKey === toKey(startOfToday)) {
      return { label: "Aujourd'hui", color: "light-success" };
    }
    if (dateKey === toKey(tomorrow)) {
      return { label: "Demain", color: "light-warning" };
    }
    if (dateKey === toKey(yesterday)) {
      return { label: "Hier", color: "light-danger" };
    }

    return null;
  };

  getLatestDiagnostic = (userDetails) => {
    const list =
      userDetails?.simulator_difficulty_results ||
      userDetails?.simulatorDifficultyResults ||
      [];
    if (!Array.isArray(list) || list.length === 0) return null;

    const sorted = [...list].sort((a, b) => {
      const aDate = new Date(
        a?.created_at || a?.createdAt || a?.date || 0,
      ).getTime();
      const bDate = new Date(
        b?.created_at || b?.createdAt || b?.date || 0,
      ).getTime();
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return bDate - aDate;
      }
      return (b?.id || 0) - (a?.id || 0);
    });

    return sorted[0] || list[list.length - 1];
  };

  getDiagnosticAttributes = (raw) => {
    let attrs = raw?.attributes || raw;
    if (typeof attrs === "string") {
      try {
        attrs = JSON.parse(attrs);
      } catch (e) {
        attrs = {};
      }
    }
    return attrs || {};
  };

  handleNameClickModal = (userId) => {
    // Déclencher l'animation
    const nameElement = document.querySelector(".modal-user-name");
    if (nameElement) {
      nameElement.style.animation = "none";
      setTimeout(() => {
        nameElement.style.animation = "bubbleLift 0.6s ease-out";
      }, 10);
    }
    // Rediriger après l'animation
    setTimeout(() => {
      this.props.onClose();
      this.props.history.push(`/app/user/edit/${userId}/2`);
    }, 300);
  };

  // Chargement du template (mêmes prestations/prix que /pages/contract)
  loadContractTemplate = async () => {
    if (this.state.contractTemplateLoaded || this.state.contractTemplateLoading)
      return;

    this.setState({ contractTemplateLoading: true });

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };
      const response = await axios.get(
        global.config.server_url + "/get_template/1",
        Config,
      );
      if (response?.data?.values) {
        const rawValues = JSON.parse(response.data.values);
        const normalized = this.normalizeTemplateValues(rawValues);
        this.setState({
          contractTemplateValues: normalized,
          contractTemplateLoaded: true,
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du template:", error);
      toast.error("Impossible de charger le template de contrat");
    } finally {
      this.setState({ contractTemplateLoading: false });
    }
  };

  normalizeTemplateValues = (values) => {
    const toStrictBool = (v) => {
      if (typeof v === "boolean") return v;
      if (v === 1 || v === "1") return true;
      if (v === 0 || v === "0") return false;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (["true", "on", "yes", "oui", "vrai"].includes(s)) return true;
        if (["false", "off", "no", "non", "faux"].includes(s)) return false;
      }
      return !!v;
    };

    const boolKeys = [
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
      "c7",
      "cnb2",
      "cnb4",
      "cnb5",
      "cc5",
      "credit_impot_50",
    ];

    const normalized = { ...values };
    boolKeys.forEach((k) => {
      if (k in normalized) normalized[k] = toStrictBool(normalized[k]);
    });
    if (!("credit_impot_50" in normalized)) normalized.credit_impot_50 = false;
    normalized.c4 = false;

    return normalized;
  };

  getRowLabel = (id, values = {}) => {
    switch (id) {
      case "r1":
        return values.title1 || "Minutes + PU (min / €/h)";
      case "r2":
        return values.title2 || "Forfait + Option rachat/chômage";
      case "r3":
        return values.title3 || "Ligne 3 (forfait)";
      case "r4":
        return values.title4 || "Forfait + 1ère période à l’étranger";
      case "r5":
        return values.title5 || "Forfait + 2ème période à l’étranger";
      case "r6":
        return values.title6 || "Ligne 6 (forfait)";
      case "r7":
        return values.title7 || "Ligne 7 (forfait)";
      default:
        return id;
    }
  };

  buildValuesForSelection = (selectedRows) => {
    if (!this.state.contractTemplateValues) return null;
    const values = { ...this.state.contractTemplateValues };
    values.c1 = selectedRows.includes("r1");
    values.c2 = selectedRows.includes("r2");
    values.c3 = selectedRows.includes("r3");
    values.c4 = selectedRows.includes("r4");
    values.c5 = selectedRows.includes("r5");
    values.c6 = selectedRows.includes("r6");
    values.c7 = selectedRows.includes("r7");
    return values;
  };

  buildSubscribeServicesString = (values) => {
    if (!values) return "";
    let subscribe_services = "";
    if (values.c1) subscribe_services += "CH";
    if (values.c2) subscribe_services += " / SIMU";
    if (values.c3) subscribe_services += " / AR";
    if (values.c4) subscribe_services += " / AR";
    if (values.c5) subscribe_services += " / TFD";
    if (values.c6) subscribe_services += " / ACTU";
    if (values.c7) subscribe_services += " / RAC";
    return subscribe_services.trim();
  };

  computeTotalsFromValues = (values) => {
    if (!values) return { totalTTC: 0, final75: 0, final25: 0 };
    const num = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const int = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    };

    const tvap = num(values.TVAP) || 20;
    const VTA = 1 + tvap / 100;

    const nb1Price = num(values["nb1-price"] || values.nb1_price);
    const nb1 = int(values.nb1);
    const p2 = num(values.p2);
    const p3 = num(values.p3);
    const p4 = num(values.p4);
    const p5 = num(values.p5);
    const p6 = num(values.p6);
    const p7 = num(values.p7);
    const nb2Price = num(values["nb2-price"] || values.nb2_price);
    const nb2 = int(values.nb2);
    const nb4Price = num(values["nb4-price"] || values.nb4_price);
    const nb4 = int(values.nb4);
    const nb5Price = num(values["nb5-price"] || values.nb5_price);
    const nb5 = int(values.nb5);

    const nbHT1 = values.c1 ? Math.trunc((nb1Price / 60) * nb1) : 0;

    const HT2 = values.c2 ? p2 : 0;
    const nbHT2 = values.c2 && values.cnb2 ? nb2Price * nb2 : 0;

    const HT3 = values.c3 ? p3 : 0;
    const HT4 = values.c4 ? p4 : 0;

    const nbHT4 = values.cnb4 ? nb4Price * nb4 : 0;

    const HT5 = values.c5 && !values.cc5 ? p5 : 0;
    const nbHT5 = values.c5 && values.cnb5 ? nb5Price * nb5 : 0;

    const HT6 = values.c6 ? p6 : 0;
    const HT7 = values.c7 ? p7 : 0;

    const totalHT =
      int(nbHT1) +
      int(HT2) +
      int(nbHT2) +
      int(HT3) +
      int(HT4) +
      int(nbHT4) +
      int(HT5) +
      int(nbHT5) +
      int(HT6) +
      int(HT7);

    const totalTTC = Math.trunc(totalHT * VTA);
    const fp1 = num(values.fp1) || 75;
    const final75 = Math.trunc(totalTTC * (fp1 / 100));
    const final25 = Math.trunc(totalTTC * (1 - fp1 / 100));

    return { totalTTC, final75, final25 };
  };

  // Générer un libellé intelligent pour le contrat
  generateContractLabel = (userDetails, selectedRows, values) => {
    if (!userDetails) return "Contrat";
    const firstName = userDetails.first_name || "Client";
    const lastName = userDetails.last_name || "";
    if (!selectedRows || selectedRows.length === 0) {
      return `Contrat de ${firstName} ${lastName}`;
    }
    const serviceNames = selectedRows
      .map((id) => this.getRowLabel(id, values))
      .join(" + ");
    return `${serviceNames} - ${firstName} ${lastName}`;
  };

  // Méthodes pour la création rapide de contrat
  toggleCreateContractForm = () => {
    this.setState((prevState) => {
      if (!prevState.showCreateContractForm) {
        this.loadContractTemplate();
        // En train d'ouvrir le formulaire
        return {
          showCreateContractForm: true,
          contractFormData: {
            comment: this.generateContractLabel(
              this.props.userDetails,
              [],
              this.state.contractTemplateValues,
            ),
            selectedRows: [],
            advanced_payment: 0,
            pre_payment: 0,
            end_payment: 0,
          },
        };
      } else {
        // En train de fermer le formulaire
        return {
          showCreateContractForm: false,
          contractFormData: {
            comment: "",
            selectedRows: [],
            advanced_payment: 0,
            pre_payment: 0,
            end_payment: 0,
          },
        };
      }
    });
  };

  handleContractServiceToggle = (service) => {
    this.setState((prevState) => {
      const selectedRows = prevState.contractFormData.selectedRows || [];
      const updated = selectedRows.includes(service)
        ? selectedRows.filter((s) => s !== service)
        : [...selectedRows, service];

      const values = this.buildValuesForSelection(updated);
      const { totalTTC, final75, final25 } =
        this.computeTotalsFromValues(values);

      const comment = this.generateContractLabel(
        this.props.userDetails,
        updated,
        values,
      );

      return {
        contractFormData: {
          ...prevState.contractFormData,
          selectedRows: updated,
          comment,
          advanced_payment: totalTTC,
          pre_payment: final75,
          end_payment: final25,
        },
      };
    });
  };

  handleContractFormChange = (field, value) => {
    this.setState((prevState) => {
      let newState = {
        ...prevState.contractFormData,
        [field]: value,
      };

      // Si on modifie le montant total, recalculer acompte et solde
      if (field === "advanced_payment") {
        const totalTTC = parseFloat(value || 0);
        if (totalTTC > 0) {
          newState.pre_payment = Math.trunc(totalTTC * 0.75);
          newState.end_payment = Math.trunc(totalTTC * 0.25);
        }
      }

      return {
        contractFormData: newState,
      };
    });
  };

  createQuickContract = async () => {
    const { contractFormData } = this.state;
    const { userDetails } = this.props;

    if (!this.state.contractTemplateValues) {
      await this.loadContractTemplate();
    }

    const selectedRows = contractFormData.selectedRows || [];

    if (selectedRows.length === 0) {
      toast.error("Sélectionnez au moins une prestation");
      return;
    }

    const values = this.buildValuesForSelection(selectedRows);
    const { totalTTC, final75, final25 } = this.computeTotalsFromValues(values);

    if (totalTTC <= 0) {
      toast.error("Le montant total doit être supérieur à 0");
      return;
    }

    this.setState({ creatingContract: true });

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };

      const servicesString = this.buildSubscribeServicesString(values);
      const comment = this.generateContractLabel(
        userDetails,
        selectedRows,
        values,
      );

      const parameters = {
        link_to_documents: "N/a",
        type: "contract",
        document_state: "En attente",
        date: "N/a",
        status_payment: 0,
        subscribe_services: servicesString,
        pre_payment: parseFloat(final75 || 0),
        end_payment: parseFloat(final25 || 0),
        comment,
        advanced_payment: parseFloat(totalTTC),
        user_id: userDetails.id,
        creator_id: localStorage.getItem("user_id"),
        values: JSON.stringify(values || {}),
        unipro: 0,
      };

      const response = await axios.post(
        global.config.server_url + "/documents",
        parameters,
        Config,
      );

      const createdDoc = response?.data?.data || response?.data;
      if (createdDoc?.id) {
        this.setState((prevState) => ({
          createdContracts: [
            createdDoc,
            ...prevState.createdContracts.filter(
              (doc) => doc.id !== createdDoc.id,
            ),
          ],
        }));
      }

      toast.success(
        "Contrat créé avec succès ! Vous pouvez le personnaliser complètement dans la page dédiée.",
      );

      // Réinitialiser le formulaire
      this.setState({
        showCreateContractForm: false,
        contractFormData: {
          comment: "",
          selectedRows: [],
          advanced_payment: 0,
          pre_payment: 0,
          end_payment: 0,
        },
      });

      // Rafraîchir les données de l'utilisateur dans le KanbanBoard
      if (this.props.onContractChange && userDetails?.id) {
        this.props.onContractChange(userDetails.id);
      }
    } catch (error) {
      console.error("Erreur lors de la création du contrat:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Erreur inconnue";
      toast.error("Erreur: " + errorMsg);
    } finally {
      this.setState({ creatingContract: false });
    }
  };

  handleRequestDeleteContract = (doc) => {
    if (!doc) return;
    this.setState({ showDeleteContractAlert: true, contractToDelete: doc });
  };

  handleConfirmDeleteContract = async () => {
    const { contractToDelete } = this.state;
    if (!contractToDelete?.id) {
      this.setState({ showDeleteContractAlert: false, contractToDelete: null });
      return;
    }

    this.setState({ deletingContract: true });
    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };
      await axios.delete(
        global.config.server_url + "/documents/" + contractToDelete.id,
        Config,
      );
      this.setState((prevState) => ({
        deletedContractIds: [
          ...prevState.deletedContractIds,
          contractToDelete.id,
        ],
        showDeleteContractAlert: false,
        contractToDelete: null,
      }));

      toast.success("Contrat supprimé avec succès");

      // Rafraîchir les données de l'utilisateur dans le KanbanBoard
      if (this.props.onContractChange && this.props.userDetails?.id) {
        this.props.onContractChange(this.props.userDetails.id);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du contrat:", error);
      toast.error("Erreur lors de la suppression du contrat");
      this.setState({ showDeleteContractAlert: false, contractToDelete: null });
    } finally {
      this.setState({ deletingContract: false });
    }
  };

  render() {
    const {
      isOpen,
      onClose,
      selectedCard,
      userDetails,
      loadingUserDetails,
      kanbans,
      onDelete,
    } = this.props;

    const { isEditing, editFormData, dateSource } = this.state;

    // Utiliser displayCard si disponible, sinon selectedCard
    const currentCard = this.state.displayCard || selectedCard;

    const diagnostic = userDetails
      ? this.getLatestDiagnostic(userDetails)
      : null;
    const diagnosticRaw = diagnostic?.raw || diagnostic?.data || diagnostic;
    const diagnosticAttrs = diagnostic
      ? this.getDiagnosticAttributes(diagnosticRaw)
      : {};
    const mergedDocuments = [
      ...(this.state.createdContracts || []),
      ...(userDetails?.documents || []),
    ];
    const seenDocIds = new Set();
    const visibleDocuments = mergedDocuments.filter((doc) => {
      if (!doc?.id || seenDocIds.has(doc.id)) return false;
      seenDocIds.add(doc.id);
      return !this.state.deletedContractIds.includes(doc.id);
    });

    if (!selectedCard) return null;

    return (
      <>
        <Modal isOpen={isOpen} toggle={onClose} size="lg">
          <SweetAlert
            warning
            title="Êtes-vous certain ?"
            show={this.state.showDeleteAlert}
            onConfirm={() => {
              this.setState({ showDeleteAlert: false });
              onDelete(currentCard);
              onClose();
            }}
            onCancel={() => {
              this.setState({ showDeleteAlert: false });
            }}
            showCancel
            confirmBtnText="Oui, supprimer"
            cancelBtnText="Annuler"
          >
            <p className="sweet-alert-text">
              Supprimer le rendez-vous de <strong>{currentCard.name}</strong> ?
            </p>
            <p style={{ color: "#666", marginTop: "8px" }}>
              Cette action est irréversible.
            </p>
          </SweetAlert>
          <SweetAlert
            warning
            title="Êtes-vous certain ?"
            show={this.state.showDeleteContractAlert}
            onConfirm={this.handleConfirmDeleteContract}
            onCancel={() =>
              this.setState({
                showDeleteContractAlert: false,
                contractToDelete: null,
              })
            }
            showCancel
            confirmBtnText="Oui, supprimer"
            cancelBtnText="Annuler"
          >
            <p className="sweet-alert-text">Supprimer ce contrat ?</p>
            <p style={{ color: "#666", marginTop: "8px" }}>
              Cette action est irréversible.
            </p>
          </SweetAlert>
          <ModalHeader toggle={onClose}>
            <div className="d-flex align-items-center">
              {currentCard.isStarred && (
                <Star size={20} className="text-warning fill-warning mr-50" />
              )}
              <span
                className="modal-user-name clickable-name"
                onClick={() => this.handleNameClickModal(currentCard.user_id)}
                title="Cliquer pour voir le profil"
              >
                {currentCard.name}
              </span>
            </div>
          </ModalHeader>
          <ModalBody
            style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
          >
            {loadingUserDetails ? (
              <div className="text-center py-3">
                <Spinner color="primary" />
                <p className="mt-2">Chargement des informations...</p>
              </div>
            ) : userDetails ? (
              <>
                {/* Ligne 1: Colonne Kanban + Rendez-vous - Mode édition en colonnes */}
                {isEditing ? (
                  <div
                    style={{
                      backgroundColor: "#f0f4ff",
                      borderRadius: "8px",
                      padding: "16px",
                      marginBottom: "16px",
                      border: "2px solid #7367f0",
                    }}
                  >
                    <div
                      className="mb-75"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Badge color="primary" style={{ fontSize: "0.7rem" }}>
                        MODE ÉDITION
                      </Badge>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        Modifiez les informations ci-dessous
                      </span>
                    </div>
                    <div className="row">
                      <div className="col-12 mb-2">
                        <h6
                          className="mb-50"
                          style={{ fontSize: "0.85rem", fontWeight: 700 }}
                        >
                          Colonne Kanban
                        </h6>
                        <Input
                          type="select"
                          value={editFormData.kanban_id}
                          onChange={(e) =>
                            this.handleEditFormChange(
                              "kanban_id",
                              parseInt(e.target.value),
                            )
                          }
                        >
                          <option value="">Sélectionnez une colonne...</option>
                          {kanbans.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title}
                            </option>
                          ))}
                        </Input>
                      </div>
                      <div className="col-12 mb-2">
                        {currentCard.date && currentCard.hour && (
                          <div>
                            <h6
                              className="mb-50 d-flex align-items-center"
                              style={{ fontSize: "0.85rem", fontWeight: 700 }}
                            >
                              <Clock size={14} className="mr-50" />
                              Rendez-vous
                            </h6>
                            <div className="mb-2">
                              <label
                                className="font-weight-bold mb-75"
                                style={{ fontSize: "0.75rem" }}
                              >
                                Date & Heure
                              </label>

                              {/* Afficher la date/heure actuelle avec une flèche vers la nouvelle */}
                              {currentCard.date && currentCard.hour && (
                                <div
                                  style={{
                                    backgroundColor: "#f9fafb",
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: "1px solid #e5e7eb",
                                    marginBottom: "12px",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                      <div
                                        style={{
                                          color: "#6b7280",
                                          marginBottom: "4px",
                                        }}
                                      >
                                        Actuellement :
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "0.85rem",
                                          fontWeight: 600,
                                          color: "#1f2937",
                                        }}
                                      >
                                        {new Date(
                                          `${currentCard.date}T${currentCard.hour}:00`,
                                        ).toLocaleDateString("fr-FR", {
                                          weekday: "short",
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}{" "}
                                        à {currentCard.hour}
                                      </div>
                                    </div>
                                    {(editFormData.date !== currentCard.date ||
                                      editFormData.hour !==
                                        currentCard.hour) && (
                                      <>
                                        <div
                                          style={{
                                            color: "#7367f0",
                                            fontSize: "1.2rem",
                                          }}
                                        >
                                          →
                                        </div>
                                        <div>
                                          <div
                                            style={{
                                              color: "#6b7280",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            Nouveau :
                                          </div>
                                          <div
                                            style={{
                                              fontSize: "0.85rem",
                                              fontWeight: 600,
                                              color: "#16a34a",
                                            }}
                                          >
                                            {new Date(
                                              `${editFormData.date}T${editFormData.hour}:00`,
                                            ).toLocaleDateString("fr-FR", {
                                              weekday: "short",
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            })}{" "}
                                            à {editFormData.hour}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Date et Heure pickers avec suggestion à droite */}
                              <div
                                className="d-flex align-items-stretch"
                                style={{ gap: "12px", marginBottom: "12px" }}
                              >
                                <div style={{ flex: 2 }}>
                                  <label
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#6b7280",
                                      display: "block",
                                      marginBottom: "4px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Sélectionner date et heure
                                  </label>
                                  <Button
                                    color="primary"
                                    outline
                                    type="button"
                                    onClick={this.handleDateTimeClick}
                                    style={{
                                      width: "100%",
                                      height: "44px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0.5rem",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    <Calendar size={16} className="mr-50" />
                                    <span style={{ lineHeight: "1.2" }}>
                                      {this.formatDateTimeLabel()}
                                    </span>
                                  </Button>
                                  <Input
                                    innerRef={this.dateTimeInputRef}
                                    type="datetime-local"
                                    value={
                                      editFormData.date
                                        ? `${editFormData.date}T${
                                            editFormData.hour || "00:00"
                                          }`
                                        : ""
                                    }
                                    onChange={this.handleDateTimeChange}
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
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    flex: 1,
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <label
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#6b7280",
                                        display: "block",
                                        marginBottom: "4px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      Suggestions
                                    </label>
                                    <Button
                                      color="info"
                                      outline
                                      type="button"
                                      onClick={() =>
                                        this.setSuggestedTime("10:30")
                                      }
                                      style={{
                                        width: "100%",
                                        height: "44px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.7rem",
                                        whiteSpace: "normal",
                                        lineHeight: "1.2",
                                        padding: "0.5rem",
                                      }}
                                    >
                                      {this.formatSuggestedDate("10:30")}
                                    </Button>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#6b7280",
                                        display: "block",
                                        marginBottom: "4px",
                                        fontWeight: 700,
                                        visibility: "hidden",
                                      }}
                                    >
                                      .
                                    </label>
                                    <Button
                                      color="info"
                                      outline
                                      type="button"
                                      onClick={() =>
                                        this.setSuggestedTime("16:30")
                                      }
                                      style={{
                                        width: "100%",
                                        height: "44px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.7rem",
                                        whiteSpace: "normal",
                                        lineHeight: "1.2",
                                        padding: "0.5rem",
                                      }}
                                    >
                                      {this.formatSuggestedDate("16:30")}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-12">
                        <label
                          className="font-weight-bold"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Description
                        </label>
                        <Input
                          type="textarea"
                          rows="3"
                          value={editFormData.description}
                          onChange={(e) =>
                            this.handleEditFormChange(
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Description du rendez-vous..."
                          style={{ fontSize: "0.75rem" }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="row mb-2">
                    <div className="col-lg-6 mb-2">
                      <h6
                        className="mb-50"
                        style={{ fontSize: "0.85rem", fontWeight: 700 }}
                      >
                        Colonne Kanban
                      </h6>
                      <div className="pl-1">
                        <Badge
                          pill
                          style={{
                            fontSize: "0.9rem",
                            padding: "0.5rem 1rem",
                            fontWeight: "600",
                            backgroundColor:
                              kanbans.find(
                                (col) => col.id === currentCard.kanban_id,
                              )?.color || "#7367f0",
                            color: "#fff",
                          }}
                        >
                          {(
                            kanbans.find(
                              (col) => col.id === currentCard.kanban_id,
                            )?.title || "N/A"
                          ).toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="col-lg-6 mb-2">
                      {currentCard.date && currentCard.hour && (
                        <div className="mb-2">
                          <h6
                            className="mb-50 d-flex align-items-center"
                            style={{ fontSize: "0.85rem", fontWeight: 700 }}
                          >
                            <Clock size={14} className="mr-50" />
                            Rendez-vous
                          </h6>
                          <div style={{ fontSize: "0.75rem" }}>
                            <div className="d-flex align-items-center mb-50">
                              <Calendar size={14} className="mr-50" />
                              {(() => {
                                const badge = this.getRelativeDateBadge(
                                  currentCard.date,
                                );
                                const formattedDate = new Date(
                                  `${currentCard.date}T${currentCard.hour}:00`,
                                ).toLocaleDateString("fr-FR", {
                                  weekday: "long",
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                });

                                return badge ? (
                                  <Badge
                                    color={badge.color}
                                    className="font-small-2"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    {badge.label} • {currentCard.hour}
                                  </Badge>
                                ) : (
                                  <span>
                                    {formattedDate} {" à "} {currentCard.hour}
                                  </span>
                                );
                              })()}
                            </div>
                            {currentCard.description && (
                              <div>
                                <strong>Description :</strong>
                                <p
                                  className="mt-50 mb-0"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  {currentCard.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ligne 2: Contact + Contrats */}
                <div
                  className="row mb-2"
                  style={{
                    opacity: isEditing ? 0.4 : 1,
                    pointerEvents: isEditing ? "none" : "auto",
                    position: "relative",
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {isEditing && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "16px",
                        zIndex: 10,
                        pointerEvents: "none",
                      }}
                    >
                      <Badge
                        color="secondary"
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.25rem 0.5rem",
                        }}
                      >
                        🔒 Non éditable
                      </Badge>
                    </div>
                  )}
                  {/* Informations de contact */}
                  <div className="col-lg-6 mb-2">
                    <div className="mb-2">
                      <div className="d-flex align-items-center justify-content-between mb-50">
                        <h6
                          className="mb-0 d-flex align-items-center"
                          style={{ fontSize: "0.85rem", fontWeight: 700 }}
                        >
                          <User size={14} className="mr-50" />
                          Contact
                        </h6>
                        <a
                          href={`/app/user/edit/${userDetails.id}/2`}
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey || e.button === 1) {
                              return;
                            }
                            e.preventDefault();
                            this.props.history.push(
                              `/app/user/edit/${userDetails.id}/2`,
                            );
                          }}
                          title="Voir fiche client"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center"
                          style={{ textDecoration: "none" }}
                        >
                          <Edit size={14} className="mr-25" />
                          Fiche client
                        </a>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div className="mb-50">
                          <strong>Email :</strong>{" "}
                          <a href={`mailto:${userDetails.email}`}>
                            {userDetails.email}
                          </a>
                        </div>
                        {userDetails.mobile_number && (
                          <div className="mb-50">
                            <strong>Téléphone:</strong>{" "}
                            <a href={`tel:${userDetails.mobile_number}`}>
                              {userDetails.mobile_number}
                            </a>
                          </div>
                        )}
                        {/* {userDetails.status && (
                        <div className="mb-1">
                          <strong>Statut:</strong>{" "}
                          <Badge color="light-info" pill>
                            {userDetails.status}
                          </Badge>
                        </div>
                      )} */}
                      </div>
                    </div>
                  </div>

                  {/* Contrat en cours */}
                  <div className="col-lg-6 mb-2">
                    <div className="mb-2">
                      <div className="d-flex align-items-center justify-content-between mb-50">
                        <h6
                          className="mb-0 d-flex align-items-center"
                          style={{ fontSize: "0.85rem", fontWeight: 700 }}
                        >
                          <FileText size={14} className="mr-50" />
                          Contrats
                        </h6>
                        <Button
                          size="sm"
                          color={
                            this.state.showCreateContractForm
                              ? "danger"
                              : "primary"
                          }
                          outline
                          onClick={this.toggleCreateContractForm}
                          className="d-flex align-items-center"
                          title={
                            this.state.showCreateContractForm
                              ? "Annuler"
                              : "Créer un contrat rapide"
                          }
                        >
                          {this.state.showCreateContractForm ? (
                            <>
                              <X size={14} className="mr-25" />
                              Annuler
                            </>
                          ) : (
                            <>
                              <Plus size={14} className="mr-25" />
                              Créer contrat
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Formulaire de création rapide de contrat */}
                      {this.state.showCreateContractForm && (
                        <div
                          style={{
                            backgroundColor: "#f0f4ff",
                            borderRadius: "8px",
                            padding: "12px",
                            marginBottom: "12px",
                            border: "1px solid #d8d6de",
                          }}
                        >
                          <h6
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              marginBottom: "12px",
                              color: "#7367f0",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            ⚡ Création express
                          </h6>

                          {/* Sélection des prestations - Seule interaction requise */}
                          <FormGroup className="mb-2">
                            <Label
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                color: "#5e5873",
                                marginBottom: "8px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              Sélectionnez les prestations 🎯
                            </Label>
                            {this.state.contractTemplateLoading ? (
                              <div
                                className="text-muted"
                                style={{ fontSize: "0.75rem" }}
                              >
                                Chargement des prestations...
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "6px",
                                }}
                              >
                                {["r1", "r2", "r3", "r4", "r5", "r6", "r7"].map(
                                  (rowId) => {
                                    const isSelected =
                                      this.state.contractFormData.selectedRows.includes(
                                        rowId,
                                      );
                                    const label = this.getRowLabel(
                                      rowId,
                                      this.state.contractTemplateValues || {},
                                    );
                                    return (
                                      <div
                                        key={rowId}
                                        onClick={() =>
                                          this.handleContractServiceToggle(
                                            rowId,
                                          )
                                        }
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          fontSize: "0.8rem",
                                          cursor: "pointer",
                                          padding: "8px 10px",
                                          backgroundColor: isSelected
                                            ? "#7367f0"
                                            : "#fff",
                                          color: isSelected
                                            ? "#fff"
                                            : "#5e5873",
                                          border: `2px solid ${
                                            isSelected ? "#7367f0" : "#d8d6de"
                                          }`,
                                          borderRadius: "6px",
                                          fontWeight: isSelected
                                            ? "600"
                                            : "500",
                                          transition: "all 0.2s ease",
                                        }}
                                      >
                                        <span>{label}</span>
                                        {isSelected && (
                                          <Check
                                            size={14}
                                            style={{ marginLeft: "4px" }}
                                          />
                                        )}
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </FormGroup>

                          {/* Affichage du résumé auto-calculé */}
                          {this.state.contractFormData.selectedRows.length >
                            0 && (
                            <div
                              style={{
                                backgroundColor: "#fff",
                                borderRadius: "6px",
                                padding: "10px",
                                marginBottom: "12px",
                                border: "1px solid #e0e0e0",
                                fontSize: "0.75rem",
                              }}
                            >
                              <div
                                style={{
                                  marginBottom: "6px",
                                  color: "#5e5873",
                                }}
                              >
                                <strong>Libellé :</strong>{" "}
                                {this.state.contractFormData.comment}
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "8px",
                                  fontSize: "0.8rem",
                                  fontWeight: "600",
                                }}
                              >
                                <div>
                                  <span style={{ color: "#6b7280" }}>
                                    Total TTC :
                                  </span>{" "}
                                  {new Intl.NumberFormat("fr-FR", {
                                    style: "currency",
                                    currency: "EUR",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(
                                    this.state.contractFormData
                                      .advanced_payment,
                                  )}
                                </div>
                                <div>
                                  <span style={{ color: "#6b7280" }}>
                                    Acompte 75% :
                                  </span>{" "}
                                  {new Intl.NumberFormat("fr-FR", {
                                    style: "currency",
                                    currency: "EUR",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(
                                    this.state.contractFormData.pre_payment,
                                  )}
                                </div>
                                <div>
                                  <span style={{ color: "#6b7280" }}>
                                    Solde 25% :
                                  </span>{" "}
                                  {new Intl.NumberFormat("fr-FR", {
                                    style: "currency",
                                    currency: "EUR",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(
                                    this.state.contractFormData.end_payment,
                                  )}
                                </div>
                                <div style={{ color: "#999" }}>
                                  Prestations :{" "}
                                  {this.state.contractFormData.selectedRows
                                    .map((rowId) =>
                                      this.getRowLabel(
                                        rowId,
                                        this.state.contractTemplateValues || {},
                                      ),
                                    )
                                    .join(" / ")}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Boutons d'action */}
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              size="sm"
                              color="secondary"
                              outline
                              onClick={this.toggleCreateContractForm}
                              disabled={this.state.creatingContract}
                            >
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              color="success"
                              onClick={this.createQuickContract}
                              disabled={
                                this.state.creatingContract ||
                                this.state.contractFormData.selectedRows
                                  .length === 0
                              }
                            >
                              {this.state.creatingContract ? (
                                <>
                                  <Spinner
                                    size="sm"
                                    color="light"
                                    className="mr-50"
                                  />
                                  Création...
                                </>
                              ) : (
                                <>
                                  <Check size={14} className="mr-50" />
                                  Créer contrat
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {visibleDocuments.length > 0 ? (
                        (() => {
                          // Calculer le total et les services cumulés
                          const totalAmount = visibleDocuments.reduce(
                            (sum, doc) => sum + (doc.advanced_payment || 0),
                            0,
                          );

                          return (
                            <div
                              style={{
                                backgroundColor: "#f8f9fa",
                                padding: "8px",
                                borderRadius: "6px",
                                borderLeft: "3px solid #7367f0",
                                fontSize: "0.85rem",
                              }}
                            >
                              <div className="mb-50">
                                <strong>Montant total:</strong>{" "}
                                <span
                                  className="text-primary font-weight-bold"
                                  style={{ fontSize: "0.95rem" }}
                                >
                                  {new Intl.NumberFormat("fr-FR", {
                                    style: "currency",
                                    currency: "EUR",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(totalAmount)}
                                </span>
                              </div>
                              <div className="mb-1">
                                {/* <strong>Nombre de contrats:</strong>{" "}
                              <span>{userDetails.documents.length}</span> */}
                              </div>
                              <div className="mb-50">
                                <div
                                  className="d-flex flex-wrap"
                                  style={{ marginTop: "4px", gap: "6px" }}
                                >
                                  {visibleDocuments.map((doc) => (
                                    <ContractButton
                                      key={doc.id}
                                      doc={doc}
                                      onDelete={
                                        this.handleRequestDeleteContract
                                      }
                                    />
                                  ))}
                                  <CreateContractButton
                                    onClick={() => {
                                      if (!this.state.showCreateContractForm) {
                                        this.toggleCreateContractForm();
                                      }
                                    }}
                                    disabled={this.state.showCreateContractForm}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div
                          className="text-muted"
                          style={{
                            backgroundColor: "#f8f9fa",
                            padding: "8px",
                            borderRadius: "6px",
                            borderLeft: "3px solid #7367f0",
                            fontSize: "0.85rem",
                          }}
                        >
                          Aucun contrat pour le moment.
                          <div
                            className="d-flex flex-wrap"
                            style={{ marginTop: "8px", gap: "6px" }}
                          >
                            <CreateContractButton
                              onClick={() => {
                                if (!this.state.showCreateContractForm) {
                                  this.toggleCreateContractForm();
                                }
                              }}
                              disabled={this.state.showCreateContractForm}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Résultats du Diagnostic */}
                {diagnostic && (
                  <div
                    className="mb-2"
                    style={{
                      opacity: isEditing ? 0.4 : 1,
                      pointerEvents: isEditing ? "none" : "auto",
                      position: "relative",
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {isEditing && (
                      <div
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "16px",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      >
                        <Badge
                          color="secondary"
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.25rem 0.5rem",
                          }}
                        >
                          🔒 Non éditable
                        </Badge>
                      </div>
                    )}
                    <div
                      style={{
                        backgroundColor: "#fff7ed",
                        borderRadius: "8px",
                        padding: "12px",
                        border: "1px solid #ffedd5",
                      }}
                    >
                      <div
                        className="header-btn-stack"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            color: "#9a3412",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            margin: 0,
                          }}
                        >
                          <FileText size={14} /> Diagnostic
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() =>
                              this.setState({ showVisualReport: true })
                            }
                            style={{
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#1e3a8a",
                              backgroundColor: "#eff6ff",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              border: "none",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = "#dbeafe";
                              e.currentTarget.style.color = "#172554";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = "#eff6ff";
                              e.currentTarget.style.color = "#1e3a8a";
                            }}
                            title="Voir le rapport visuel"
                          >
                            <FileText size={14} strokeWidth={2} />
                            <span>Rapport Visuel</span>
                          </button>
                          {(diagnosticRaw?.profile_type ||
                            diagnosticAttrs?.PROFILE_TYPE) && (
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                              }}
                            >
                              {diagnosticRaw?.profile_type ||
                                diagnosticAttrs?.PROFILE_TYPE}
                            </span>
                          )}
                          {(() => {
                            const score =
                              calculateComplexityScore(diagnosticRaw);
                            const scoreNum = parseInt(score, 10);

                            let bg;
                            let color;
                            if (!Number.isNaN(scoreNum)) {
                              if (scoreNum < 30) {
                                bg = "#ffe5e5";
                                color = "#d93025";
                              } else if (scoreNum < 70) {
                                bg = "#fff4e5";
                                color = "#ff9800";
                              } else {
                                bg = "#e6f4ea";
                                color = "#1e8e3e";
                              }
                            } else {
                              bg = "#f3f4f6";
                              color = "#6b7280";
                            }

                            return (
                              <span
                                style={{
                                  backgroundColor: bg,
                                  borderRadius: "999px",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: color,
                                }}
                              >
                                {score}/100
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="row" style={{ marginBottom: "8px" }}>
                        <div className="col-6">
                          <div
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: "6px",
                              padding: "8px",
                              border: "1px solid #fed7aa",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#ea580c",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              Date de naissance
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: "#1f2937",
                              }}
                            >
                              {(() => {
                                const d =
                                  diagnosticRaw?.birth_date ||
                                  diagnosticRaw?.date_naissance ||
                                  diagnosticAttrs?.DATE_NAISSANCE ||
                                  diagnosticRaw?.attributes?.DATE_NAISSANCE;
                                if (!d) return "-";
                                try {
                                  return new Date(d).toLocaleDateString(
                                    "fr-FR",
                                  );
                                } catch {
                                  return d;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div
                            style={{
                              backgroundColor: "#fff",
                              borderRadius: "6px",
                              padding: "8px",
                              border: "1px solid #fed7aa",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#ea580c",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              Départ souhaité
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  color: "#1f2937",
                                }}
                              >
                                {(() => {
                                  const d =
                                    diagnosticRaw?.departure_date ||
                                    diagnosticRaw?.date_depart ||
                                    diagnosticAttrs?.SIMULATEUR_DIFFICULTE_DATE_DEPART ||
                                    diagnosticRaw?.attributes
                                      ?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                                  if (!d) return "-";
                                  try {
                                    return new Date(d).toLocaleDateString(
                                      "fr-FR",
                                    );
                                  } catch {
                                    return d;
                                  }
                                })()}
                              </span>
                              {(() => {
                                const birthDate =
                                  diagnosticRaw?.birth_date ||
                                  diagnosticRaw?.date_naissance ||
                                  diagnosticAttrs?.DATE_NAISSANCE ||
                                  diagnosticRaw?.attributes?.DATE_NAISSANCE;
                                const departDate =
                                  diagnosticRaw?.departure_date ||
                                  diagnosticRaw?.date_depart ||
                                  diagnosticAttrs?.SIMULATEUR_DIFFICULTE_DATE_DEPART ||
                                  diagnosticRaw?.attributes
                                    ?.SIMULATEUR_DIFFICULTE_DATE_DEPART;
                                if (!birthDate || !departDate) return null;
                                try {
                                  const birth = new Date(birthDate);
                                  const depart = new Date(departDate);
                                  let years =
                                    depart.getFullYear() - birth.getFullYear();
                                  let months =
                                    depart.getMonth() - birth.getMonth();
                                  if (months < 0) {
                                    years--;
                                    months += 12;
                                  }
                                  return (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        color: "#ea580c",
                                      }}
                                    >
                                      ({years} ans
                                      {months > 0 ? ` et ${months} mois` : ""})
                                    </span>
                                  );
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const children = diagnosticAttrs?.NBR_ENFANTS;
                        const military =
                          diagnosticAttrs?.SIMULATEUR_DIFFICULTE_Q11;
                        if (!children && !military) return null;
                        return (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              marginBottom: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            {children != null && (
                              <div
                                style={{
                                  backgroundColor: "#fff",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  border: "1px solid #fed7aa",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <User size={14} color="#ea580c" />
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#374151",
                                  }}
                                >
                                  <strong>{children}</strong> enfant
                                  {parseInt(children, 10) > 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                            {military &&
                              typeof military === "string" &&
                              military.toLowerCase() === "oui" && (
                                <div
                                  style={{
                                    backgroundColor: "#fff",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    border: "1px solid #dcfce7",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <Check size={14} color="#16a34a" />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#374151",
                                    }}
                                  >
                                    Service militaire effectué
                                  </span>
                                </div>
                              )}
                          </div>
                        );
                      })()}

                      {(() => {
                        const birthDate =
                          diagnosticRaw?.birth_date ||
                          diagnosticRaw?.date_naissance ||
                          diagnosticAttrs?.DATE_NAISSANCE ||
                          diagnosticRaw?.attributes?.DATE_NAISSANCE;
                        if (!birthDate) return null;
                        try {
                          const birth = new Date(birthDate);
                          const birthYear = birth.getFullYear();
                          const legalAge = 64;
                          const legalDate = new Date(birth);
                          legalDate.setFullYear(birthYear + legalAge);
                          const tauxPleinAge = 67;
                          const tauxPleinDate = new Date(birth);
                          tauxPleinDate.setFullYear(birthYear + tauxPleinAge);
                          return (
                            <div
                              style={{
                                backgroundColor: "#f9fafb",
                                borderRadius: "6px",
                                padding: "10px",
                                marginBottom: "8px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  color: "#374151",
                                  marginBottom: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <Clock size={14} /> REPÈRES CLÉS (CALCULÉS)
                              </div>
                              <div className="reperes-grid">
                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    <Clock size={12} color="#ea580c" />
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#374151",
                                      }}
                                    >
                                      Âge Légal
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      fontWeight: 700,
                                      color: "#ea580c",
                                    }}
                                  >
                                    {legalDate.toLocaleDateString("fr-FR")}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#374151",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {legalAge} ans
                                  </div>
                                </div>
                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    <Target size={12} color="#16a34a" />
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#374151",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Taux Plein Auto
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      fontWeight: 700,
                                      color: "#16a34a",
                                    }}
                                  >
                                    {tauxPleinDate.toLocaleDateString("fr-FR")}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#374151",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Automatique à {tauxPleinAge} ans
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Résumé et Historique conversation (si disponible) */}
                {userDetails.conversation_archives &&
                  userDetails.conversation_archives.length > 0 && (
                    <div
                      className="mb-2"
                      style={{
                        opacity: isEditing ? 0.4 : 1,
                        pointerEvents: isEditing ? "none" : "auto",
                        position: "relative",
                        transition: "opacity 0.2s ease",
                      }}
                    >
                      {isEditing && (
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "16px",
                            zIndex: 10,
                            pointerEvents: "none",
                          }}
                        >
                          <Badge
                            color="secondary"
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.25rem 0.5rem",
                            }}
                          >
                            🔒 Non éditable
                          </Badge>
                        </div>
                      )}
                      <h6
                        className="mb-50 d-flex align-items-center"
                        style={{ fontSize: "0.85rem", fontWeight: 700 }}
                      >
                        <MessageSquare size={14} className="mr-50" />
                        Conversation
                      </h6>

                      {/* Résumé et Historique côte à côte */}
                      <div className="row">
                        {/* Résumé */}
                        <div className="col-lg-6 mb-2">
                          <div
                            style={{
                              backgroundColor: "#f0f9ff",
                              padding: "8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              borderLeft: "3px solid #3b82f6",
                              height: "100%",
                            }}
                          >
                            <div
                              className="font-weight-bold mb-50"
                              style={{ color: "#1e40af", fontSize: "0.75rem" }}
                            >
                              📝 Résumé
                            </div>
                            <div style={{ color: "#374151" }}>
                              {userDetails.conversation_archives[0].summary}
                            </div>
                          </div>
                        </div>

                        {/* Historique des messages */}
                        {userDetails.conversation_archives[0].messages &&
                          userDetails.conversation_archives[0].messages.length >
                            0 && (
                            <div className="col-lg-6 mb-2">
                              <div
                                className="font-weight-bold mb-50"
                                style={{
                                  color: "#6b7280",
                                  fontSize: "0.75rem",
                                }}
                              >
                                💬 Historique
                              </div>
                              <div
                                style={{
                                  maxHeight: "250px",
                                  overflowY: "auto",
                                  backgroundColor: "#f9fafb",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {userDetails.conversation_archives[0].messages
                                  .filter((msg) => msg.role !== "system")
                                  .map((msg, idx) => {
                                    const isUser = msg.role === "user";
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: isUser
                                            ? "flex-end"
                                            : "flex-start",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            maxWidth: "85%",
                                            padding: "6px 10px",
                                            borderRadius: isUser
                                              ? "12px 12px 2px 12px"
                                              : "12px 12px 12px 2px",
                                            backgroundColor: isUser
                                              ? "#3b82f6"
                                              : "#fff",
                                            color: isUser ? "#fff" : "#374151",
                                            boxShadow:
                                              "0 1px 2px rgba(0,0,0,0.05)",
                                            border: isUser
                                              ? "none"
                                              : "1px solid #e5e7eb",
                                          }}
                                        >
                                          <p
                                            style={{
                                              margin: 0,
                                              fontSize: "0.75rem",
                                              lineHeight: 1.5,
                                              whiteSpace: "pre-wrap",
                                            }}
                                          >
                                            {msg.content}
                                          </p>
                                        </div>
                                        <span
                                          style={{
                                            fontSize: "0.65rem",
                                            color: "#9ca3af",
                                            marginTop: "2px",
                                            paddingLeft: isUser ? "0" : "4px",
                                            paddingRight: isUser ? "4px" : "0",
                                          }}
                                        >
                                          {isUser ? "👤" : "🤖"}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center text-muted py-3">
                Impossible de charger les détails
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {isEditing ? (
              <>
                <Button
                  color="success"
                  onClick={this.handleSaveEdit}
                  className="d-flex align-items-center"
                  disabled={
                    editFormData.kanban_id === currentCard.kanban_id &&
                    editFormData.date === currentCard.date &&
                    editFormData.hour === currentCard.hour &&
                    editFormData.description === currentCard.description
                  }
                >
                  <Check size={14} className="mr-50" />
                  Enregistrer
                </Button>
                <Button
                  color="secondary"
                  outline
                  onClick={this.handleCancelEdit}
                  className="d-flex align-items-center"
                >
                  <X size={14} className="mr-50" />
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="primary"
                  outline
                  onClick={this.handleStartEdit}
                  className="d-flex align-items-center"
                >
                  <Edit size={14} className="mr-50" />
                  Éditer
                </Button>
                <Button
                  color="danger"
                  outline
                  onClick={() => this.setState({ showDeleteAlert: true })}
                  className="d-flex align-items-center"
                >
                  <Trash2 size={14} className="mr-50" />
                  Supprimer
                </Button>
              </>
            )}
          </ModalFooter>
        </Modal>

        {/* Modale du rapport visuel */}
        <VisualReportModal
          isOpen={this.state.showVisualReport}
          onClose={() => this.setState({ showVisualReport: false })}
          htmlContent={generateVisualReport({
            id: diagnostic?.id,
            type: "diagnostic",
            name:
              currentCard?.name ||
              `${userDetails?.first_name || ""} ${userDetails?.last_name || ""}`.trim(),
            email: userDetails?.email,
            raw: diagnosticRaw,
          })}
          fileName={`Rapport visuel diagnostic retraite ${
            userDetails?.first_name || userDetails?.prenom || ""
          } ${userDetails?.last_name || userDetails?.nom || ""}.html`}
          prospectName={currentCard?.name || ""}
        />
      </>
    );
  }
}

export default withRouter(UserKanbanModal);
