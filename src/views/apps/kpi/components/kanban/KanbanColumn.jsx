import React from "react";
import { Card, CardHeader, CardBody, Button, Input } from "reactstrap";
import { Plus, Edit2, Check, X, Droplet, Move, Trash2 } from "react-feather";
import { Droppable, Draggable } from "react-beautiful-dnd";
import SweetAlert from "react-bootstrap-sweetalert";
import KanbanCard from "./KanbanCard";
import "./kanban.scss";

class KanbanColumn extends React.Component {
  state = {
    isEditingTitle: false,
    editedTitle: this.props.title,
    showColorPicker: false,
    Alert: false,
    delete_id: null,
  };

  colorPalette = [
    { name: "Jaune", hex: "#facc15" },
    { name: "Bleu", hex: "#60a5fa" },
    { name: "Violet", hex: "#a78bfa" },
    { name: "Vert", hex: "#4ade80" },
    { name: "Rose", hex: "#f472b6" },
    { name: "Orange", hex: "#fb923c" },
    { name: "Rouge", hex: "#f87171" },
    { name: "Cyan", hex: "#22d3ee" },
  ];

  handleStartEdit = (e) => {
    e.stopPropagation();
    this.setState({
      isEditingTitle: true,
      editedTitle: this.props.title,
    });
  };

  handleSaveTitle = () => {
    const { editedTitle } = this.state;
    if (editedTitle.trim() !== "" && editedTitle !== this.props.title) {
      this.props.onEditTitle(editedTitle.trim());
    }
    this.setState({ isEditingTitle: false });
  };

  handleCancelEdit = () => {
    this.setState({
      isEditingTitle: false,
      editedTitle: this.props.title,
    });
  };

  handleKeyPress = (e) => {
    if (e.key === "Enter") {
      this.handleSaveTitle();
    } else if (e.key === "Escape") {
      this.handleCancelEdit();
    }
  };

  toggleColorPicker = (e) => {
    e.stopPropagation();
    this.setState({ showColorPicker: !this.state.showColorPicker });
  };

  handleColorSelect = (color) => {
    if (this.props.onEditColor) {
      this.props.onEditColor(color);
    }
    this.setState({ showColorPicker: false });
  };

  handleDeleteColumn = (e) => {
    e.stopPropagation();
    this.setState({ delete_id: this.props.column.id, Alert: true });
  };

  getColumnColor = () => {
    // Utilise la couleur passée en prop, avec fallback sur bleu
    return this.props.color || "#60a5fa";
  };

  getColumnBadgeColor = (title) => {
    const colors = {
      "À TRAVAILLER": "warning",
      "EN DISCUSSIONS": "primary",
      "PROPOSITION ENVOYÉE": "secondary",
    };
    return colors[title] || "primary";
  };

  formatTotal = (total) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(total);
  };

  calculateTotal = () => {
    const { cards } = this.props;
    return cards.reduce((sum, card) => sum + (card.amount || 0), 0);
  };

  render() {
    const {
      column,
      title,
      cards,
      onAddCard,
      onStarClick,
      onDeleteClick,
      onCardClick,
      dragHandleProps,
      isDragging,
    } = this.props;
    const { isEditingTitle, editedTitle, showColorPicker, Alert, delete_id } =
      this.state;
    const color = this.getColumnColor();
    const badgeColor = this.getColumnBadgeColor(title);
    const total = this.calculateTotal();
    const count = cards.length;

    return (
      <div className="kanban-column" style={{ position: "relative" }}>
        <SweetAlert
          warning
          title="Êtes-vous certain ?"
          show={Alert}
          onConfirm={() => {
            this.setState({ Alert: false });
            if (this.props.onDelete) {
              this.props.onDelete(delete_id);
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
            Supprimer la colonne: <strong>{title}</strong>
          </p>
          <p
            style={{ color: "#dc3545", fontWeight: "bold", marginTop: "15px" }}
          >
            ⚠️ Attention:
          </p>
          <p style={{ color: "#666", marginTop: "8px" }}>
            Cette action supprimera aussi les{" "}
            <strong>{count} rendez-vous</strong> associés à cette colonne.
          </p>
          <p style={{ color: "#666", marginTop: "8px" }}>
            Cette action est irréversible.
          </p>
        </SweetAlert>
        <Card
          className="mb-0 shadow-sm"
          style={{
            overflow: "visible",
            transform: isDragging ? "rotate(3deg) scale(1.02)" : "none",
            transition: isDragging ? "none" : "transform 0.2s ease",
          }}
        >
          <CardHeader
            className="pb-1 border-bottom"
            style={{
              borderTop: `4px solid ${color}`,
              borderTopLeftRadius: "0.5rem",
              borderTopRightRadius: "0.5rem",
              backgroundColor: "#fff",
              padding: "1rem",
            }}
          >
            <div className="d-flex justify-content-between align-items-center w-100">
              <div className="d-flex align-items-center flex-grow-1">
                <div
                  {...dragHandleProps}
                  className="kanban-drag-handle"
                  style={{
                    cursor: "grab",
                    marginRight: "8px",
                    display: "flex",
                    alignItems: "center",
                    padding: "4px",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  title="⇄ Glisser pour déplacer la colonne"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Move
                    size={18}
                    className="text-secondary"
                    style={{ strokeWidth: 2.5 }}
                  />
                </div>
                {isEditingTitle ? (
                  <div className="d-flex align-items-center flex-grow-1">
                    <Input
                      type="text"
                      value={editedTitle}
                      onChange={(e) =>
                        this.setState({ editedTitle: e.target.value })
                      }
                      onKeyDown={this.handleKeyPress}
                      autoFocus
                      className="mr-50"
                      style={{
                        maxWidth: "200px",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Check
                      size={18}
                      className="text-success cursor-pointer mr-50"
                      onClick={this.handleSaveTitle}
                    />
                    <X
                      size={18}
                      className="text-danger cursor-pointer"
                      onClick={this.handleCancelEdit}
                    />
                  </div>
                ) : (
                  <>
                    <h5
                      className="font-weight-bold mb-0 text-uppercase mr-50 text-dark"
                      style={{ fontSize: "0.9rem" }}
                    >
                      {title}
                    </h5>
                    <Edit2
                      size={14}
                      className="text-muted cursor-pointer mr-50"
                      onClick={this.handleStartEdit}
                      title="Éditer le titre"
                    />
                    <Droplet
                      size={14}
                      className="text-muted cursor-pointer mr-50"
                      onClick={this.toggleColorPicker}
                      title="Changer la couleur"
                      style={{ fill: color, color: color }}
                    />
                    <Trash2
                      size={14}
                      className="text-danger cursor-pointer mr-50"
                      onClick={this.handleDeleteColumn}
                      title="Supprimer la colonne"
                    />
                    <span
                      className={`badge badge-light-${badgeColor} badge-pill font-small-3`}
                    >
                      {count}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="mt-50">
              <span className="text-muted font-small-3">
                Total:{" "}
                <strong className="text-dark">{this.formatTotal(total)}</strong>
              </span>
            </div>
          </CardHeader>
          {showColorPicker && (
            <div
              className="color-picker-popup"
              style={{
                position: "absolute",
                top: "60px",
                left: "10px",
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1000,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
              }}
            >
              {this.colorPalette.map((c) => (
                <div
                  key={c.hex}
                  onClick={() => this.handleColorSelect(c.hex)}
                  title={c.name}
                  style={{
                    width: "32px",
                    height: "32px",
                    backgroundColor: c.hex,
                    borderRadius: "6px",
                    cursor: "pointer",
                    border:
                      color === c.hex ? "3px solid #000" : "2px solid #fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                />
              ))}
            </div>
          )}
          <CardBody className="p-75">
            {/* <Button
              color="light"
              block
              className="mb-75 d-flex align-items-center justify-content-center"
              onClick={onAddCard}
            >
              <Plus size={16} className="mr-50" />
              Nouvelle carte
            </Button> */}

            <Droppable droppableId={`column-${column.id}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`kanban-cards-container ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
                  style={{
                    minHeight: "200px",
                    backgroundColor: snapshot.isDraggingOver
                      ? "rgba(115, 103, 240, 0.05)"
                      : "transparent",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  {cards.map((card, index) => (
                    <Draggable
                      key={card.id}
                      draggableId={`card-${card.id}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          <KanbanCard
                            card={card}
                            onStarClick={onStarClick}
                            onDeleteClick={onDeleteClick}
                            onCardClick={onCardClick}
                            isLoadingData={this.props.isLoadingData}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </CardBody>
        </Card>
      </div>
    );
  }
}

export default KanbanColumn;
