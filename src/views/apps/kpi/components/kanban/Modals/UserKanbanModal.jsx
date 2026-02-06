import React from "react";
import { withRouter } from "react-router-dom";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Badge,
} from "reactstrap";
import {
  Star,
  Edit,
  Trash2,
  Check,
  X,
  MessageSquare,
} from "react-feather";
import SweetAlert from "react-bootstrap-sweetalert";
import {
  generateVisualReport,
} from "../../inbox/utils";
import VisualReportModal from "../../inbox/VisualReportModal";
import EditModeSection from "./sections/EditModeSection";
import DisplayModeSection from "./sections/DisplayModeSection";
import ContactSection from "./sections/ContactSection";
import ContractsSection from "./sections/ContractsSection";
import DiagnosticSection from "./sections/DiagnosticSection";
import {
  formatDateTimeLabel,
  formatSuggestedDate,
  getRelativeDateBadge,
  getNextEligibleDate,
  getLatestDiagnostic,
  getDiagnosticAttributes,
} from "./utils";
import axios from "axios";
import { toast } from "react-toastify";

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
      includeDateTime: false,
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
    const hasDate = Boolean(cardToEdit?.date);
    this.setState({
      isEditing: true,
      editFormData: {
        kanban_id: cardToEdit.kanban_id || "",
        date: cardToEdit.date || "",
        hour: cardToEdit.hour || "",
        description: cardToEdit.description || "",
        status: cardToEdit.status || "scheduled",
      },
      includeDateTime: hasDate,
    });
  };

  handleCancelEdit = () => {
    this.setState({
      isEditing: false,
      dateSource: null,
      includeDateTime: false,
    });
  };

  handleToggleIncludeDateTime = () => {
    this.setState((prevState) => {
      const next = !prevState.includeDateTime;
      return {
        includeDateTime: next,
        dateSource: next ? prevState.dateSource : null,
        editFormData: next
          ? prevState.editFormData
          : {
              ...prevState.editFormData,
              date: "",
              hour: "",
            },
      };
    });
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
    const { editFormData, includeDateTime } = this.state;
    const { onSave } = this.props;

    if (!editFormData.kanban_id) {
      alert("La colonne Kanban est obligatoire");
      return;
    }

    if (includeDateTime && (!editFormData.date || !editFormData.date.trim())) {
      alert("Veuillez sélectionner une date");
      return;
    }

    const normalizedEditFormData = {
      ...editFormData,
      date: includeDateTime ? editFormData.date || null : null,
      hour: includeDateTime ? editFormData.hour || null : null,
    };

    try {
      await onSave(normalizedEditFormData);
      // Mettre à jour displayCard avec les nouvelles valeurs
      this.setState((prevState) => ({
        isEditing: false,
        dateSource: null,
        displayCard: {
          ...prevState.displayCard,
          kanban_id: editFormData.kanban_id,
          date: normalizedEditFormData.date,
          hour: normalizedEditFormData.hour,
          description: editFormData.description,
          status: editFormData.status,
        },
        includeDateTime: Boolean(normalizedEditFormData.date),
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
    return formatDateTimeLabel(editFormData.date, editFormData.hour);
  };

  setSuggestedTime = (hour) => {
    const tomorrowDate = getNextEligibleDate();
    this.setState((prevState) => ({
      editFormData: {
        ...prevState.editFormData,
        date: tomorrowDate,
        hour: hour,
      },
    }));
  };

  formatSuggestedDate = (hour) => {
    return formatSuggestedDate(hour);
  };

  getRelativeDateBadge = (dateString) => {
    return getRelativeDateBadge(dateString);
  };

  getLatestDiagnostic = (userDetails) => {
    return getLatestDiagnostic(userDetails);
  };

  getDiagnosticAttributes = (raw) => {
    return getDiagnosticAttributes(raw);
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
      return `${firstName} ${lastName}`;
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

    const { isEditing, editFormData, includeDateTime } = this.state;

    // Utiliser displayCard si disponible, sinon selectedCard
    const currentCard = this.state.displayCard || selectedCard;
    const currentKanbanId = String(currentCard?.kanban_id ?? "");
    const editKanbanId = String(editFormData.kanban_id ?? "");
    const currentDescription = currentCard?.description || "";
    const editDescription = editFormData.description || "";
    const currentDate = currentCard?.date || "";
    const currentHour = currentCard?.hour || "";
    const editDate = includeDateTime ? editFormData.date || "" : "";
    const editHour = includeDateTime ? editFormData.hour || "" : "";
    const hasChanges =
      editKanbanId !== currentKanbanId ||
      editDescription !== currentDescription ||
      editDate !== currentDate ||
      editHour !== currentHour;

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
                  <EditModeSection
                    editFormData={editFormData}
                    kanbans={kanbans}
                    currentCard={currentCard}
                    onFormChange={this.handleEditFormChange}
                    onDateTimeClick={this.handleDateTimeClick}
                    formatDateTimeLabel={this.formatDateTimeLabel}
                    onSetSuggestedTime={this.setSuggestedTime}
                    formatSuggestedDate={this.formatSuggestedDate}
                    dateTimeInputRef={this.dateTimeInputRef}
                    onDateTimeChange={this.handleDateTimeChange}
                    includeDateTime={this.state.includeDateTime}
                    onToggleIncludeDateTime={this.handleToggleIncludeDateTime}
                  />
                ) : (
                  <DisplayModeSection
                    currentCard={currentCard}
                    kanbans={kanbans}
                    getRelativeDateBadge={this.getRelativeDateBadge}
                  />
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
                    <ContactSection
                      userDetails={userDetails}
                      history={this.props.history}
                    />
                  </div>

                  {/* Contrat en cours */}
                  <div className="col-lg-6 mb-2">
                    <ContractsSection
                      userDetails={userDetails}
                      visibleDocuments={visibleDocuments}
                      showCreateContractForm={this.state.showCreateContractForm}
                      creatingContract={this.state.creatingContract}
                      contractTemplateLoading={
                        this.state.contractTemplateLoading
                      }
                      contractFormData={this.state.contractFormData}
                      contractTemplateValues={this.state.contractTemplateValues}
                      onToggleCreateForm={this.toggleCreateContractForm}
                      onRequestDeleteContract={this.handleRequestDeleteContract}
                      onServiceToggle={this.handleContractServiceToggle}
                      onCreateContract={this.createQuickContract}
                      getRowLabel={this.getRowLabel}
                    />
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
                    <DiagnosticSection
                      diagnostic={diagnostic}
                      diagnosticRaw={diagnosticRaw}
                      diagnosticAttrs={diagnosticAttrs}
                      onShowVisualReport={() =>
                        this.setState({ showVisualReport: true })
                      }
                    />
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
                                    const isBot = msg.role !== "user";
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: isBot
                                            ? "flex-end"
                                            : "flex-start",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            maxWidth: "85%",
                                            padding: "6px 10px",
                                            borderRadius: isBot
                                              ? "12px 12px 2px 12px"
                                              : "12px 12px 12px 2px",
                                            backgroundColor: isBot
                                              ? "#3b82f6"
                                              : "#fff",
                                            color: isBot ? "#fff" : "#374151",
                                            boxShadow:
                                              "0 1px 2px rgba(0,0,0,0.05)",
                                            border: isBot
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
                                            paddingLeft: isBot ? "0" : "4px",
                                            paddingRight: isBot ? "4px" : "0",
                                          }}
                                        >
                                          {isBot ? "🤖" : "👤"}
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
                    !hasChanges || (includeDateTime && !editFormData.date)
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
