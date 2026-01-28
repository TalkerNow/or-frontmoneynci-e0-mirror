import React from "react";
import { Card, CardBody, Badge } from "reactstrap";
import { Star, MoreVertical, Calendar } from "react-feather";
import "./kanban.scss";

class KanbanCard extends React.Component {
  getBadgeColor = (type) => {
    const colors = {
      autre: "light-secondary",
      bilan: "light-primary",
      entreprise: "light-success",
      particulier: "light-warning",
    };
    return colors[type?.toLowerCase()] || "light-secondary";
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

  formatAmount = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  render() {
    const { card, onStarClick, onMenuClick } = this.props;
    const { type, name, amount, deadline, isStarred } = card;

    return (
      <Card className="kanban-card mb-1">
        <CardBody className="p-75">
          <div className="d-flex justify-content-between align-items-start mb-50">
            <Badge
              color={this.getBadgeColor(type)}
              pill
              className="text-capitalize font-small-2"
            >
              {type || "Autre"}
            </Badge>
            <div className="d-flex align-items-center">
              <Star
                size={16}
                className={`cursor-pointer mr-50 ${isStarred ? "text-warning fill-warning" : "text-muted"}`}
                onClick={() => onStarClick && onStarClick(card)}
              />
              <MoreVertical
                size={16}
                className="cursor-pointer text-muted"
                onClick={() => onMenuClick && onMenuClick(card)}
              />
            </div>
          </div>

          <h5 className="mb-50 font-weight-bold text-dark">{name}</h5>

          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 font-weight-bold text-primary">
              {this.formatAmount(amount || 0)}
            </h4>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: this.getInitialsBgColor(name),
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: "600",
              }}
            >
              {this.getInitials(name)}
            </div>
          </div>

          {deadline && (
            <div className="mt-75 d-flex align-items-center">
              <Calendar size={14} className="text-danger mr-50" />
              <span className="text-danger font-small-2 font-weight-bold">
                {deadline}
              </span>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }
}

export default KanbanCard;
