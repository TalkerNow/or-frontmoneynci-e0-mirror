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
} from "react-feather";
import SweetAlert from "react-bootstrap-sweetalert";
import ContractButton from "../Buttons/Contract";
import { calculateComplexityScore } from "../../inbox/utils";

class UserKanbanModal extends React.Component {
  constructor(props) {
    super(props);
    this.dateTimeInputRef = React.createRef();
    this.state = {
      isEditing: false,
      showDeleteAlert: false,
      editFormData: {
        kanban_id: "",
        date: "",
        hour: "",
        description: "",
        status: "scheduled",
      },
      dateSource: null, // 'manual' ou 'suggested'
    };
  }

  componentDidUpdate(prevProps) {
    // Réinitialiser l'état d'édition quand la modale se ferme
    if (prevProps.isOpen && !this.props.isOpen) {
      this.setState({ isEditing: false, dateSource: null });
    }
  }

  handleStartEdit = () => {
    const { selectedCard } = this.props;
    this.setState({
      isEditing: true,
      editFormData: {
        kanban_id: selectedCard.kanban_id || "",
        date: selectedCard.date || "",
        hour: selectedCard.hour || "",
        description: selectedCard.description || "",
        status: selectedCard.status || "scheduled",
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
      this.setState({ isEditing: false, dateSource: null });
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

    const diagnostic = userDetails
      ? this.getLatestDiagnostic(userDetails)
      : null;
    const diagnosticRaw = diagnostic?.raw || diagnostic?.data || diagnostic;
    const diagnosticAttrs = diagnostic
      ? this.getDiagnosticAttributes(diagnosticRaw)
      : {};

    if (!selectedCard) return null;

    return (
      <Modal isOpen={isOpen} toggle={onClose} size="lg">
        <SweetAlert
          warning
          title="Êtes-vous certain ?"
          show={this.state.showDeleteAlert}
          onConfirm={() => {
            this.setState({ showDeleteAlert: false });
            onDelete(selectedCard);
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
            Supprimer le rendez-vous de <strong>{selectedCard.name}</strong> ?
          </p>
          <p style={{ color: "#666", marginTop: "8px" }}>
            Cette action est irréversible.
          </p>
        </SweetAlert>
        <ModalHeader toggle={onClose}>
          <div className="d-flex align-items-center">
            {selectedCard.isStarred && (
              <Star size={20} className="text-warning fill-warning mr-50" />
            )}
            <span
              className="modal-user-name clickable-name"
              onClick={() => this.handleNameClickModal(selectedCard.user_id)}
              title="Cliquer pour voir le profil"
            >
              {selectedCard.name}
            </span>
          </div>
        </ModalHeader>
        <ModalBody>
          {loadingUserDetails ? (
            <div className="text-center py-3">
              <Spinner color="primary" />
              <p className="mt-2">Chargement des informations...</p>
            </div>
          ) : userDetails ? (
            <>
              {/* Colonne Kanban */}
              <div className="mb-3">
                <h6 className="text-muted mb-50">Colonne Kanban</h6>
                {isEditing ? (
                  <div className="pl-1">
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
                ) : (
                  <div className="pl-1">
                    <div className="d-flex align-items-center justify-content-between">
                      <Badge
                        pill
                        style={{
                          fontSize: "0.9rem",
                          padding: "0.5rem 1rem",
                          fontWeight: "600",
                          backgroundColor:
                            kanbans.find(
                              (col) => col.id === selectedCard.kanban_id,
                            )?.color || "#7367f0",
                          color: "#fff",
                        }}
                      >
                        {kanbans.find(
                          (col) => col.id === selectedCard.kanban_id,
                        )?.title || "N/A"}
                      </Badge>
                      {/* <div
                        className="d-flex align-items-center"
                        style={{ gap: "8px" }}
                      >
                        <span className="text-muted font-small-2">
                          <Send size={14} className="mr-25" />
                          Envoyer vers:
                        </span>
                        <Input
                          type="select"
                          style={{
                            width: "auto",
                            minWidth: "150px",
                            fontSize: "0.85rem",
                            padding: "0.25rem 0.5rem",
                          }}
                          onChange={(e) => {
                            if (e.target.value) {
                              this.handleMoveToKanban(parseInt(e.target.value));
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">-- Choisir --</option>
                          {kanbans
                            .filter((col) => col.id !== selectedCard.kanban_id)
                            .map((col) => (
                              <option key={col.id} value={col.id}>
                                {col.title}
                              </option>
                            ))}
                        </Input>
                      </div> */}
                    </div>
                  </div>
                )}
              </div>

              <div className="row">
                {/* Informations de contact */}
                <div className="col-lg-6 mb-3">
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-50">
                      <h6 className="text-muted mb-0 d-flex align-items-center">
                        <User size={16} className="mr-50" />
                        Informations de contact
                      </h6>
                      <Button
                        size="sm"
                        color="primary"
                        outline
                        onClick={() =>
                          this.props.history.push(
                            `/app/user/edit/${userDetails.id}/2`,
                          )
                        }
                        title="Voir fiche client"
                        className="d-flex align-items-center"
                      >
                        <Edit size={14} className="mr-25" />
                        Fiche client
                      </Button>
                    </div>
                    <div className="pl-1">
                      <div className="mb-1">
                        <strong>Email:</strong>{" "}
                        <a href={`mailto:${userDetails.email}`}>
                          {userDetails.email}
                        </a>
                      </div>
                      {userDetails.mobile_number && (
                        <div className="mb-1">
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
                <div className="col-lg-6 mb-3">
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-50">
                      <h6 className="text-muted mb-0 d-flex align-items-center">
                        <FileText size={16} className="mr-50" />
                        Contrat en cours
                      </h6>
                      <Button
                        size="sm"
                        color="primary"
                        outline
                        onClick={() =>
                          this.props.history.push(
                            `/pages/create-contract/${userDetails.id}`,
                          )
                        }
                        className="d-flex align-items-center"
                        title="Créer un contrat"
                      >
                        + Créer contrat
                      </Button>
                    </div>
                    {userDetails.documents &&
                    userDetails.documents.length > 0 ? (
                      (() => {
                        // Calculer le total et les services cumulés
                        const totalAmount = userDetails.documents.reduce(
                          (sum, doc) => sum + (doc.advanced_payment || 0),
                          0,
                        );

                        return (
                          <div
                            className="pl-1"
                            style={{
                              backgroundColor: "#f8f9fa",
                              padding: "12px",
                              borderRadius: "6px",
                              borderLeft: "3px solid #7367f0",
                            }}
                          >
                            <div className="mb-1">
                              <strong>Montant total:</strong>{" "}
                              <span
                                className="text-primary font-weight-bold"
                                style={{ fontSize: "1.1rem" }}
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
                              <strong>Nombre de contrats:</strong>{" "}
                              <span>{userDetails.documents.length}</span>
                            </div>
                            <div className="mb-1">
                              <strong>Services:</strong>
                              <div
                                className="d-flex flex-wrap"
                                style={{ marginTop: "6px", gap: "8px" }}
                              >
                                {userDetails.documents.map((doc) => (
                                  <ContractButton key={doc.id} doc={doc} />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div
                        className="pl-1 text-muted"
                        style={{
                          backgroundColor: "#f8f9fa",
                          padding: "12px",
                          borderRadius: "6px",
                          borderLeft: "3px solid #7367f0",
                        }}
                      >
                        Aucun contrat pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Résultats du Diagnostic */}
              {diagnostic && (
                <div className="mb-3">
                  <div
                    style={{
                      backgroundColor: "#fff7ed",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "16px",
                      border: "1px solid #ffedd5",
                    }}
                  >
                    <div
                      className="header-btn-stack"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "14px",
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
                        <FileText size={18} /> Résultats du Diagnostic
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
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
                          const score = calculateComplexityScore(diagnosticRaw);
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
                                padding: "6px 14px",
                                fontSize: "14px",
                                fontWeight: 700,
                                color: color,
                              }}
                            >
                              Score : {score}/100
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div
                      className="diagnostic-grid"
                      style={{ marginBottom: "16px" }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          padding: "12px",
                          border: "1px solid #fed7aa",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "15px",
                            color: "#ea580c",
                            fontWeight: 600,
                            marginBottom: "4px",
                          }}
                        >
                          Date de naissance
                        </div>
                        <div
                          style={{
                            fontSize: "16px",
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
                              return new Date(d).toLocaleDateString("fr-FR");
                            } catch {
                              return d;
                            }
                          })()}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          padding: "12px",
                          border: "1px solid #fed7aa",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "15px",
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
                              fontSize: "18px",
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
                                return new Date(d).toLocaleDateString("fr-FR");
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
                              let months = depart.getMonth() - birth.getMonth();
                              if (months < 0) {
                                years--;
                                months += 12;
                              }
                              return (
                                <span
                                  style={{
                                    fontSize: "14px",
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

                    {(() => {
                      const children = diagnosticAttrs?.NBR_ENFANTS;
                      const military =
                        diagnosticAttrs?.SIMULATEUR_DIFFICULTE_Q11;
                      if (!children && !military) return null;
                      return (
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "16px",
                            flexWrap: "wrap",
                          }}
                        >
                          {children != null && (
                            <div
                              style={{
                                backgroundColor: "#fff",
                                borderRadius: "8px",
                                padding: "10px 14px",
                                border: "1px solid #fed7aa",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <User size={16} color="#ea580c" />
                              <span
                                style={{ fontSize: "15px", color: "#374151" }}
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
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  border: "1px solid #dcfce7",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <Check size={16} color="#16a34a" />
                                <span
                                  style={{ fontSize: "15px", color: "#374151" }}
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
                              borderRadius: "12px",
                              padding: "16px",
                              marginBottom: "16px",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "12px",
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
                                    gap: "6px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <Clock size={14} color="#ea580c" />
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      color: "#374151",
                                    }}
                                  >
                                    Âge Légal
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#ea580c",
                                  }}
                                >
                                  {legalDate.toLocaleDateString("fr-FR")}
                                </div>
                                <div
                                  style={{
                                    fontSize: "15px",
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
                                    gap: "6px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <Target size={14} color="#16a34a" />
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      color: "#374151",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Taux Plein Auto
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#16a34a",
                                  }}
                                >
                                  {tauxPleinDate.toLocaleDateString("fr-FR")}
                                </div>
                                <div
                                  style={{
                                    fontSize: "15px",
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

              {/* Rendez-vous */}
              {selectedCard.date && selectedCard.hour && (
                <div className="mb-3">
                  <h6 className="text-muted mb-50 d-flex align-items-center">
                    <Clock size={16} className="mr-50" />
                    Rendez-vous programmé
                  </h6>
                  {isEditing ? (
                    <div className="pl-1">
                      <div className="mb-2">
                        <label className="font-weight-bold mb-75">
                          Date & Heure
                        </label>
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
                              onClick={this.handleDateTimeClick}
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
                                style={{
                                  fontSize: "0.75rem",
                                  lineHeight: "1.2",
                                }}
                              >
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
                          <div style={{ flex: 1 }}>
                            {this.isMorning() ? (
                              <Button
                                color="info"
                                outline
                                type="button"
                                onClick={() => this.setSuggestedTime("16:30")}
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
                                {this.formatSuggestedDate("16:30")}
                              </Button>
                            ) : (
                              <Button
                                color="info"
                                outline
                                type="button"
                                onClick={() => this.setSuggestedTime("10:30")}
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
                                {this.formatSuggestedDate("10:30")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="font-weight-bold">Description</label>
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
                        />
                      </div>
                      {/* <div className="mb-2">
                        <label className="font-weight-bold">Statut</label>
                        <Input
                          type="select"
                          value={editFormData.status}
                          onChange={(e) =>
                            this.handleEditFormChange("status", e.target.value)
                          }
                        >
                          <option value="scheduled">Planifié</option>
                          <option value="confirmed">Confirmé</option>
                          <option value="completed">Terminé</option>
                          <option value="cancelled">Annulé</option>
                        </Input>
                      </div> */}
                    </div>
                  ) : (
                    <div className="pl-1">
                      <div className="d-flex align-items-center">
                        <Calendar size={16} className="mr-50" />
                        {(() => {
                          const badge = this.getRelativeDateBadge(
                            selectedCard.date,
                          );
                          const formattedDate = new Date(
                            `${selectedCard.date}T${selectedCard.hour}:00`,
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
                              {badge.label} • {selectedCard.hour}
                            </Badge>
                          ) : (
                            <span>
                              {formattedDate} {" à "} {selectedCard.hour}
                            </span>
                          );
                        })()}
                      </div>
                      {selectedCard.description && (
                        <div className="mt-2">
                          <strong>Description:</strong>
                          <p className="mt-1 mb-0">
                            {selectedCard.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Résumé conversation (si disponible) */}
              {userDetails.conversation_archives &&
                userDetails.conversation_archives.length > 0 && (
                  <div className="mb-2">
                    <h6 className="text-muted mb-50">
                      Résumé de la conversation
                    </h6>
                    <div
                      className="pl-1"
                      style={{
                        backgroundColor: "#f8f9fa",
                        padding: "10px",
                        borderRadius: "6px",
                        fontSize: "0.9rem",
                        maxHeight: "150px",
                        overflowY: "auto",
                      }}
                    >
                      {userDetails.conversation_archives[0].summary}
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
    );
  }
}

export default withRouter(UserKanbanModal);
