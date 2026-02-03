import React from "react";
import { Badge } from "reactstrap";
import { Clock, Calendar, Target } from "react-feather";

const DisplayModeSection = ({
  currentCard,
  kanbans,
  getRelativeDateBadge,
  onMoveToKanban,
}) => {
  return (
    <div className="row mb-2">
      <div className="col-lg-6 mb-2">
        {currentCard.kanban_id && (
          <div className="mb-2">
            <h6
              className="mb-50 d-flex align-items-center"
              style={{ fontSize: "0.85rem", fontWeight: 700 }}
            >
              <Target size={14} className="mr-50" />
              Colonne actuelle
            </h6>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {kanbans.map((kanban) => (
                <Badge
                  key={kanban.id}
                  color={
                    kanban.id === currentCard.kanban_id
                      ? "primary"
                      : "light-secondary"
                  }
                  style={{
                    cursor: "pointer",
                    opacity: kanban.id === currentCard.kanban_id ? 1 : 0.6,
                  }}
                  onClick={() => {
                    if (kanban.id !== currentCard.kanban_id) {
                      onMoveToKanban(kanban.id);
                    }
                  }}
                >
                  {kanban.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
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
                  const badge = getRelativeDateBadge(currentCard.date);
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
                  <p className="mt-50 mb-0" style={{ fontSize: "0.75rem" }}>
                    {currentCard.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayModeSection;
