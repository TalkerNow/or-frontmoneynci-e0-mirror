import React from "react";
import { connect } from "react-redux";
import { Button, Input, Card, CardBody } from "reactstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Plus, Check, X } from "react-feather";
import KanbanColumn from "./KanbanColumn";
import {
  getKanbans,
  getUserKanbans,
  createUserKanban,
  moveUserKanban,
  updateKanban,
  reorderKanbans,
} from "../../../../../redux/actions/kanban";
import "./kanban.scss";

class KanbanBoard extends React.Component {
  state = {
    // Données mockées pour le design
    columns: [
      {
        id: 1,
        title: "À TRAVAILLER",
        order: 1,
        color: "#facc15",
      },
      {
        id: 2,
        title: "EN DISCUSSIONS",
        order: 2,
        color: "#60a5fa",
      },
      {
        id: 3,
        title: "PROPOSITION ENVOYÉE",
        order: 3,
        color: "#a78bfa",
      },
    ],
    isCreatingColumn: false,
    newColumnTitle: "",
    newColumnColor: "#60a5fa",
    cards: [
      {
        id: 1,
        kanban_id: 1,
        type: "Autre",
        name: "Paul Gueutal",
        amount: 0,
        isStarred: false,
        date: "2026-01-28",
        hour: "09:30",
      },
      {
        id: 2,
        kanban_id: 1,
        type: "Autre",
        name: "Nicolas Gomart",
        amount: 0,
        isStarred: false,
        date: "2026-01-28",
        hour: "10:15",
      },
      {
        id: 3,
        kanban_id: 1,
        type: "Autre",
        name: "Chetrit",
        amount: 0,
        isStarred: false,
        date: "2026-01-28",
        hour: "11:00",
      },
      {
        id: 4,
        kanban_id: 1,
        type: "Autre",
        name: "Pascal Gilly",
        amount: 0,
        isStarred: false,
        date: "2026-01-28",
        hour: "14:20",
      },
      {
        id: 5,
        kanban_id: 2,
        type: "Bilan",
        name: "M. Martin",
        amount: 2800,
        isStarred: false,
        date: "2026-01-27",
        hour: "16:45",
      },
      {
        id: 6,
        kanban_id: 3,
        type: "Entreprise",
        name: "Sarl Dupuis",
        amount: 4500,
        isStarred: false,
        date: "2026-01-26",
        hour: "13:10",
      },
      {
        id: 7,
        kanban_id: 1,
        type: "Bilan",
        name: "Sophie Laurent",
        amount: 3200,
        isStarred: true,
        date: "2026-03-15",
        hour: "14:00",
      },
      {
        id: 8,
        kanban_id: 2,
        type: "Particulier",
        name: "Jean Dubois",
        amount: 1800,
        isStarred: false,
        date: "2026-03-22",
        hour: "10:30",
      },
      {
        id: 9,
        kanban_id: 2,
        type: "Entreprise",
        name: "EURL Techno",
        amount: 5600,
        isStarred: false,
        date: "2026-04-10",
        hour: "16:00",
      },
      {
        id: 10,
        kanban_id: 3,
        type: "Bilan",
        name: "Marie Fontaine",
        amount: 2100,
        isStarred: true,
        date: "2026-04-18",
        hour: "09:15",
      },
      {
        id: 11,
        kanban_id: 1,
        type: "Particulier",
        name: "Pierre Moreau",
        amount: 950,
        isStarred: false,
        date: "2026-05-05",
        hour: "11:45",
      },
      {
        id: 12,
        kanban_id: 3,
        type: "Entreprise",
        name: "SAS Innovation",
        amount: 7800,
        isStarred: false,
        date: "2026-05-20",
        hour: "15:30",
      },
    ],
  };

  componentDidMount() {
    // Plus tard, on chargera les vraies données depuis Redux
    // this.props.getKanbans();
    // this.props.getUserKanbans();
  }

  getCardsForColumn = (columnId) => {
    return this.state.cards.filter((card) => card.kanban_id === columnId);
  };

  handleAddCard = (columnId) => {
    console.log("Ajouter une carte à la colonne:", columnId);
    // TODO: Implémenter l'ajout de carte
  };

  handleStarClick = (card) => {
    console.log("Toggle star pour:", card);
    // TODO: Implémenter toggle étoile
    this.setState({
      cards: this.state.cards.map((c) =>
        c.id === card.id ? { ...c, isStarred: !c.isStarred } : c,
      ),
    });
  };

  handleMenuClick = (card) => {
    console.log("Menu pour:", card);
    // TODO: Implémenter le menu d'actions
  };

  handleDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Handle column reordering
    if (type === "column") {
      const newColumns = Array.from(this.state.columns);
      const [movedColumn] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, movedColumn);

      // Update order property
      const updatedColumns = newColumns.map((col, idx) => ({
        ...col,
        order: idx + 1,
      }));

      this.setState({ columns: updatedColumns });
      // TODO: Appeler l'API pour sauvegarder l'ordre
      return;
    }

    // Handle card movement
    const cardId = parseInt(draggableId.replace("card-", ""), 10);
    const sourceColumnId = parseInt(
      source.droppableId.replace("column-", ""),
      10,
    );
    const destColumnId = parseInt(
      destination.droppableId.replace("column-", ""),
      10,
    );

    // Get source and destination cards
    const sourceCards = this.state.cards.filter(
      (card) => card.kanban_id === sourceColumnId,
    );
    const destCards =
      sourceColumnId === destColumnId
        ? sourceCards
        : this.state.cards.filter((card) => card.kanban_id === destColumnId);

    // Remove card from source
    const [movedCard] = sourceCards.splice(source.index, 1);

    // Update kanban_id if moved to different column
    if (sourceColumnId !== destColumnId) {
      movedCard.kanban_id = destColumnId;
    }

    // Insert into destination
    destCards.splice(destination.index, 0, movedCard);

    // Rebuild the full cards array
    const otherCards = this.state.cards.filter(
      (card) =>
        card.kanban_id !== sourceColumnId && card.kanban_id !== destColumnId,
    );

    const updatedCards = [...otherCards, ...sourceCards, ...destCards];

    this.setState({ cards: updatedCards });

    // TODO: Appeler l'API via Redux
    // this.props.moveUserKanban(cardId, { kanban_id: destColumnId, order: destination.index });
  };

  handleEditColumnTitle = (columnId, newTitle) => {
    const updatedColumns = this.state.columns.map((col) =>
      col.id === columnId ? { ...col, title: newTitle } : col,
    );
    this.setState({ columns: updatedColumns });
    // TODO: Appeler l'API pour sauvegarder le nouveau titre
    // this.props.updateKanban(columnId, { title: newTitle });
  };

  handleEditColumnColor = (columnId, newColor) => {
    const updatedColumns = this.state.columns.map((col) =>
      col.id === columnId ? { ...col, color: newColor } : col,
    );
    this.setState({ columns: updatedColumns });
    // TODO: Appeler l'API pour sauvegarder la nouvelle couleur
    // this.props.updateKanban(columnId, { color: newColor });
  };

  handleStartCreateColumn = () => {
    this.setState({ isCreatingColumn: true });
  };

  handleCancelCreateColumn = () => {
    this.setState({
      isCreatingColumn: false,
      newColumnTitle: "",
      newColumnColor: "#60a5fa",
    });
  };

  handleCreateColumn = () => {
    const { newColumnTitle, newColumnColor, columns } = this.state;
    if (newColumnTitle.trim() === "") return;

    const newColumn = {
      id: Math.max(...columns.map((c) => c.id), 0) + 1,
      title: newColumnTitle.trim(),
      order: columns.length + 1,
      color: newColumnColor,
    };

    this.setState({
      columns: [...columns, newColumn],
      isCreatingColumn: false,
      newColumnTitle: "",
      newColumnColor: "#60a5fa",
    });

    // TODO: Appeler l'API pour créer la colonne
    // this.props.createKanban(newColumn);
  };

  render() {
    const { columns } = this.state;
    const { isCreatingColumn, newColumnTitle, newColumnColor } = this.state;

    const colorPalette = [
      { name: "Jaune", hex: "#facc15" },
      { name: "Bleu", hex: "#60a5fa" },
      { name: "Violet", hex: "#a78bfa" },
      { name: "Vert", hex: "#4ade80" },
      { name: "Rose", hex: "#f472b6" },
      { name: "Orange", hex: "#fb923c" },
      { name: "Rouge", hex: "#f87171" },
      { name: "Cyan", hex: "#22d3ee" },
    ];

    return (
      <DragDropContext onDragEnd={this.handleDragEnd}>
        <div className="kanban-board-wrapper">
          <Droppable
            droppableId="all-columns"
            direction="horizontal"
            type="column"
          >
            {(provided, snapshot) => (
              <div
                className="kanban-board"
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  backgroundColor: snapshot.isDraggingOver
                    ? "rgba(0,0,0,0.02)"
                    : "transparent",
                }}
              >
                {columns.map((column, index) => (
                  <Draggable
                    key={column.id}
                    draggableId={`column-drag-${column.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="kanban-column-wrapper"
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.9 : 1,
                        }}
                      >
                        <KanbanColumn
                          column={column}
                          title={column.title}
                          color={column.color}
                          cards={this.getCardsForColumn(column.id)}
                          onAddCard={() => this.handleAddCard(column.id)}
                          onStarClick={this.handleStarClick}
                          onMenuClick={this.handleMenuClick}
                          onEditTitle={(newTitle) =>
                            this.handleEditColumnTitle(column.id, newTitle)
                          }
                          onEditColor={(newColor) =>
                            this.handleEditColumnColor(column.id, newColor)
                          }
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Bouton pour créer une nouvelle colonne */}
                <div className="kanban-column-wrapper">
                  {!isCreatingColumn ? (
                    <Button
                      color="light"
                      className="w-100 d-flex align-items-center justify-content-center"
                      style={{
                        height: "50px",
                        border: "2px dashed #d0d0d0",
                        backgroundColor: "transparent",
                      }}
                      onClick={this.handleStartCreateColumn}
                    >
                      <Plus size={18} className="mr-50" />
                      Nouvelle colonne
                    </Button>
                  ) : (
                    <Card className="shadow-sm">
                      <CardBody className="p-1">
                        <Input
                          type="text"
                          placeholder="Titre de la colonne"
                          value={newColumnTitle}
                          onChange={(e) =>
                            this.setState({ newColumnTitle: e.target.value })
                          }
                          onKeyPress={(e) => {
                            if (e.key === "Enter") this.handleCreateColumn();
                            if (e.key === "Escape")
                              this.handleCancelCreateColumn();
                          }}
                          autoFocus
                          className="mb-75"
                        />

                        <div
                          className="d-flex flex-wrap mb-75"
                          style={{ gap: "6px" }}
                        >
                          {colorPalette.map((c) => (
                            <div
                              key={c.hex}
                              onClick={() =>
                                this.setState({ newColumnColor: c.hex })
                              }
                              title={c.name}
                              style={{
                                width: "28px",
                                height: "28px",
                                backgroundColor: c.hex,
                                borderRadius: "50%",
                                cursor: "pointer",
                                border:
                                  newColumnColor === c.hex
                                    ? "3px solid #000"
                                    : "2px solid #fff",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                              }}
                            />
                          ))}
                        </div>

                        <div className="d-flex" style={{ gap: "8px" }}>
                          <Button
                            color="primary"
                            size="sm"
                            onClick={this.handleCreateColumn}
                            disabled={!newColumnTitle.trim()}
                            className="d-flex align-items-center"
                          >
                            <Check size={14} className="mr-25" />
                            Créer
                          </Button>
                          <Button
                            color="secondary"
                            size="sm"
                            outline
                            onClick={this.handleCancelCreateColumn}
                            className="d-flex align-items-center"
                          >
                            <X size={14} className="mr-25" />
                            Annuler
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    // kanbans: state.kanbanApp.kanban.kanbans,
    // userKanbans: state.kanbanApp.kanban.userKanbans,
    // loading: state.kanbanApp.kanban.loading,
  };
};

export default connect(mapStateToProps, {
  getKanbans,
  getUserKanbans,
  createUserKanban,
  moveUserKanban,
  updateKanban,
  reorderKanbans,
})(KanbanBoard);
