import React from "react";
import { Input, Badge } from "reactstrap";
import { Calendar } from "react-feather";

const EditModeSection = ({
  editFormData,
  kanbans,
  onFormChange,
  onDateTimeClick,
  formatDateTimeLabel,
  dateTimeInputRef,
  onDateTimeChange,
  includeDateTime,
  onToggleIncludeDateTime,
  currentCard,
  onSetSuggestedTime,
  formatSuggestedDate,
}) => {
  const formatDisplay = (date, hour) => {
    if (!date) return "Aucune";
    const time = hour || "00:00";
    const dt = new Date(`${date}T${time}`);
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(dt);
    return `${dateLabel}  •  ${time}`;
  };

  const currentDateLabel = formatDisplay(currentCard?.date, currentCard?.hour);
  const newDateLabel = includeDateTime
    ? formatDisplay(editFormData.date, editFormData.hour)
    : "Aucune";
  const showDateChange = currentDateLabel !== newDateLabel;

  return (
    <div
      style={{
        backgroundColor: "#f0f4ff",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        border: "2px solid #7367f0",
      }}
    >
      <Badge color="primary" className="mb-2">
        MODE ÉDITION
      </Badge>

      <div className="row">
        <div className="col-12 mb-2">
          <h6 style={{ fontSize: "0.85rem", fontWeight: 700 }}>
            Colonne Kanban
          </h6>
          <Input
            type="select"
            value={editFormData.kanban_id}
            onChange={(e) => onFormChange("kanban_id", e.target.value)}
          >
            <option value="">Sélectionner une colonne</option>
            {kanbans.map((kanban) => (
              <option key={kanban.id} value={kanban.id}>
                {kanban.title}
              </option>
            ))}
          </Input>
        </div>

        <div className="col-12 mb-2">
          <div className="d-flex align-items-center justify-content-between">
            <h6 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>
              Rendez-vous (optionnel)
            </h6>
            <div className="d-flex align-items-center">
              <Input
                type="checkbox"
                id="editIncludeDateTime"
                checked={includeDateTime}
                onChange={onToggleIncludeDateTime}
              />
              <label htmlFor="editIncludeDateTime" className="mb-0 ml-50">
                Ajouter une date
              </label>
            </div>
          </div>

          <div
            className={`date-time-section mt-1 ${
              includeDateTime ? "is-open" : "is-closed"
            }`}
          >
            <div
              className="d-flex align-items-stretch"
              style={{ gap: "8px", flexWrap: "wrap" }}
            >
              <div
                onClick={includeDateTime ? onDateTimeClick : undefined}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d8d6de",
                  borderRadius: "4px",
                  cursor: includeDateTime ? "pointer" : "not-allowed",
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: includeDateTime ? 1 : 0.6,
                  flex: 1,
                  minWidth: "200px",
                }}
              >
                <Calendar size={16} />
                <span>{formatDateTimeLabel()}</span>
              </div>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onSetSuggestedTime("10:30")}
                disabled={!includeDateTime}
                style={{ minWidth: "160px" }}
              >
                {formatSuggestedDate("10:30")}
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onSetSuggestedTime("16:00")}
                disabled={!includeDateTime}
                style={{ minWidth: "160px" }}
              >
                {formatSuggestedDate("16:00")}
              </button>
            </div>

            <input
              ref={dateTimeInputRef}
              type="datetime-local"
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
              }}
              onChange={onDateTimeChange}
              value={
                editFormData.date && editFormData.hour
                  ? `${editFormData.date}T${editFormData.hour}`
                  : ""
              }
            />

            {showDateChange && (
              <div className="mt-50" style={{ fontSize: "0.75rem" }}>
                <span className="text-muted">Date actuelle :</span>{" "}
                <strong>{currentDateLabel}</strong>
                <span className="mx-50">→</span>
                <span className="text-muted">Nouvelle date :</span>{" "}
                <strong>{newDateLabel}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <h6
            style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "8px" }}
          >
            Description
          </h6>
          <Input
            type="textarea"
            rows={3}
            value={editFormData.description || ""}
            onChange={(e) => onFormChange("description", e.target.value)}
            placeholder="Description du rendez-vous..."
          />
        </div>
      </div>
    </div>
  );
};

export default EditModeSection;
