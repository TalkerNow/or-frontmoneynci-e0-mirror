import React from "react";
import { Card, CardBody, Badge } from "reactstrap";
import { Star, MoreVertical, Calendar, Clock, Trash2 } from "react-feather";
import { withRouter } from "react-router-dom";
import SweetAlert from "react-bootstrap-sweetalert";
import "./kanban.scss";
import getBadgeColor from "../../../../../helpers/getBadgeColor";

class KanbanCard extends React.Component {
  state = {
    Alert: false,
  };

  handleDeleteClick = (e) => {
    e.stopPropagation();
    this.setState({ Alert: true });
  };

  getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  getInitialsBgColor = (name) => {
    const colors = [
      "#7367f0",
      "#28c76f",
      "#ea5455",
      "#ff9f43",
      "#00cfe8",
      "#1e1e1e",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  getChannelBadge = (channel_origin) => {
    const channelConfig = {
      chatbot: {
        label: "Chatbot",
        color: "primary",
      },
      diagnostic: {
        label: "Diag",
        color: "warning",
      },
      simulator: {
        label: "Simu",
        color: "info",
      },
      email: {
        label: "Email",
        color: "success",
      },
      phone: {
        label: "Tel",
        color: "danger",
      },
      default: {
        label: "Direct",
        color: "secondary",
      },
    };

    const config =
      channelConfig[channel_origin?.toLowerCase()] || channelConfig.default;

    return (
      <Badge
        color={`light-${config.color}`}
        className="font-weight-bold"
        style={{
          fontSize: "0.65rem",
          padding: "0.35rem 0.5rem",
          borderRadius: "8px",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <span>{config.label}</span>
      </Badge>
    );
  };

  formatAmount = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  formatDateTime = (dateString, hourString) => {
    if (!dateString || !hourString) return "";

    // Extraire la date au format YYYY-MM-DD depuis le format ISO
    const datePart = dateString.split("T")[0];

    // Extraire l'heure au format HH:MM depuis le format HH:MM:SS
    const timePart = hourString.split(":").slice(0, 2).join(":");

    // Combine date and hour to create a Date object
    const date = new Date(`${datePart}T${timePart}:00`);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Si c'est aujourd'hui
    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui ${timePart}`;
    }
    // Si c'est hier
    if (date.toDateString() === yesterday.toDateString()) {
      return `Hier ${timePart}`;
    }
    // Sinon afficher la date complète
    const dateStr = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    }).format(date);
    return `${dateStr} ${timePart}`;
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

  isOverdue = (dateString, hourString) => {
    if (!dateString || !hourString) return false;

    // Extraire la date au format YYYY-MM-DD depuis le format ISO
    const datePart = dateString.split("T")[0];

    // Extraire l'heure au format HH:MM depuis le format HH:MM:SS
    const timePart = hourString.split(":").slice(0, 2).join(":");

    const date = new Date(`${datePart}T${timePart}:00`);
    const now = new Date();
    return date < now;
  };

  handleNameClick = (userId) => {
    // Déclencher l'animation
    const nameElement = document.querySelector(".clickable-name");
    if (nameElement) {
      nameElement.style.animation = "none";
      setTimeout(() => {
        nameElement.style.animation = "bubbleLift 0.6s ease-out";
      }, 10);
    }
    // Rediriger après l'animation
    setTimeout(() => {
      this.props.history.push(`/app/user/edit/${userId}/2`);
    }, 300);
  };

  render() {
    const { card, onStarClick, onDeleteClick, onCardClick, isLoadingData } =
      this.props;
    const {
      type,
      name,
      amount,
      deadline,
      isStarred,
      date,
      hour,
      channel_origin,
      description,
      phone,
    } = card;
    const overdue = this.isOverdue(date, hour);
    const { Alert } = this.state;

    return (
      <>
        <SweetAlert
          warning
          title="Êtes-vous certain ?"
          show={Alert}
          onConfirm={() => {
            this.setState({ Alert: false });
            if (onDeleteClick) {
              onDeleteClick(card);
            }
          }}
          onCancel={() => {
            this.setState({ Alert: false });
          }}
          showCancel
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
        >
          <p className="sweet-alert-text">
            Supprimer le rendez-vous de <strong>{name}</strong> ?
          </p>
          <p style={{ color: "#666", marginTop: "8px" }}>
            Cette action est irréversible.
          </p>
        </SweetAlert>
        <Card
          className="kanban-card mb-1"
          onClick={(e) => {
            // Ne pas ouvrir la modale si on clique sur l'étoile ou le menu
            if (
              e.target.closest(".cursor-pointer") &&
              (e.target.closest("svg") || e.target.tagName === "svg")
            ) {
              return;
            }
            onCardClick && onCardClick(card);
          }}
        >
          <CardBody className="p-75">
            <div className="d-flex justify-content-between align-items-start mb-50">
              {isLoadingData ? (
                <div
                  style={{
                    width: "80px",
                    height: "22px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "12px",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ) : (
                <div
                  className="d-flex flex-wrap"
                  style={{ gap: "4px", maxWidth: "70%" }}
                >
                  {type && type !== "Autre" ? (
                    type
                      .split(/\s*\/\s*/) // Split par / avec ou sans espaces
                      .map((s) => s.trim())
                      .filter(Boolean) // Enlever les éléments vides
                      .map((service, idx) => (
                        <Badge
                          key={idx}
                          color={getBadgeColor(service)}
                          className="font-weight-bold"
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                          }}
                        >
                          {service}
                        </Badge>
                      ))
                  ) : (
                    <Badge
                      color="light-secondary"
                      className="font-weight-bold"
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                      }}
                    >
                      Autre
                    </Badge>
                  )}
                </div>
              )}
              <div className="d-flex align-items-center">
                {/* <Star
                  size={16}
                  className={`cursor-pointer mr-50 ${isStarred ? "text-warning fill-warning" : "text-muted"}`}
                  onClick={() => onStarClick && onStarClick(card)}
                /> */}
                <Trash2
                  size={14}
                  className="cursor-pointer text-danger"
                  onClick={this.handleDeleteClick}
                />
              </div>
            </div>

            <h5
              className="mb-50 font-weight-bold text-dark clickable-name"
              onClick={(e) => {
                e.stopPropagation();
                this.handleNameClick(card.user_id);
              }}
              title="Cliquer pour voir le profil"
            >
              {name}
            </h5>

            {description && description.trim() && (
              <div
                className="text-muted"
                style={{ fontSize: "0.75rem", marginBottom: "6px" }}
              >
                {description.trim().slice(0, 60)}...
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center">
              {isLoadingData ? (
                <div
                  style={{
                    width: "100px",
                    height: "24px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "4px",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ) : (
                <h4 className="mb-0 font-weight-bold text-primary">
                  {this.formatAmount(amount || 0)}
                </h4>
              )}
            </div>

            {phone && (
              <div
                className="text-muted"
                style={{ fontSize: "0.75rem", marginTop: "4px" }}
              >
                {phone}
              </div>
            )}

            {(date && hour) || channel_origin ? (
              <div className="mt-75 d-flex align-items-center justify-content-between">
                {date && hour ? (
                  <div className="d-flex align-items-center">
                    <Clock
                      size={13}
                      className={`mr-50 ${overdue ? "text-danger" : "text-muted"}`}
                    />
                    {(() => {
                      const badge = this.getRelativeDateBadge(date);
                      return badge ? (
                        <Badge
                          color={badge.color}
                          className="font-small-2"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.7rem",
                            padding: "0.2rem 0.4rem",
                          }}
                        >
                          {overdue && "⚠️ "}
                          {badge.label} • {hour}
                        </Badge>
                      ) : (
                        <span
                          className={`font-small-2 ${overdue ? "text-danger font-weight-bold" : "text-muted"}`}
                          style={{ fontSize: "0.7rem" }}
                        >
                          {overdue && "⚠️ "}
                          {this.formatDateTime(date, hour)}
                        </span>
                      );
                    })()}
                  </div>
                ) : (
                  <span />
                )}
                {channel_origin && (
                  <div className="d-flex justify-content-end">
                    {this.getChannelBadge(channel_origin)}
                  </div>
                )}
              </div>
            ) : null}

            {deadline && (
              <div className="mt-50 d-flex align-items-center">
                <Calendar size={14} className="text-danger mr-50" />
                <span className="text-danger font-small-2 font-weight-bold">
                  {deadline}
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </>
    );
  }
}

export default withRouter(KanbanCard);
