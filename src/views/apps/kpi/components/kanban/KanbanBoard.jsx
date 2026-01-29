import React from "react";
import { connect } from "react-redux";
import {
  Button,
  Input,
  Card,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  Plus,
  Check,
  X,
  Clock,
  Calendar,
  Star,
  Edit,
  Trash2,
} from "react-feather";
import KanbanColumn from "./KanbanColumn";
import {
  getKanbans,
  createKanban,
  getUserKanbans,
  createUserKanban,
  moveUserKanban,
  updateKanban,
  reorderKanbans,
} from "../../../../../redux/actions/kanban";
import "./kanban.scss";

class KanbanBoard extends React.Component {
  state = {
    isCreatingColumn: false,
    newColumnTitle: "",
    newColumnColor: "#60a5fa",
    selectedCard: null,
    isModalOpen: false,
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
    this.props.getKanbans();
    this.props.getUserKanbans();
  }

  getCardsForColumn = (columnId) => {
    const { kanbans } = this.props;
    const { cards } = this.state;
    
    // Trouver l'index de la colonne actuelle dans les vrais kanbans
    const columnIndex = kanbans.findIndex(k => k.id === columnId);
    if (columnIndex === -1) return [];
    
    // Mapper les cartes mock (qui utilisent kanban_id 1,2,3) aux vrais kanbans par ordre
    // kanban_id 1 -> première colonne, kanban_id 2 -> deuxième colonne, etc.
    return cards.filter((card) => {
      const mockKanbanIndex = card.kanban_id - 1; // Convertir l'ID mock en index (1->0, 2->1, 3->2)
      return mockKanbanIndex === columnIndex;
    });
  };

  getDefaultColor = (color) => {
    // Si pas de couleur, retourner bleu par défaut
    return color || "#60a5fa";
  };

  handleAddCard = (columnId) => {
    console.log("Ajouter une carte à la colonne:", columnId);
    // TODO: Implémenter l'ajout de carte
  };

  handleStarClick = (card) => {
    const updatedCard = { ...card, isStarred: !card.isStarred };
    this.props.updateUserKanban(card.id, updatedCard);
  };

  handleMenuClick = (card) => {
    console.log("Menu pour:", card);
    // TODO: Implémenter le menu d'actions
  };

  handleCardClick = (card) => {
    this.setState({
      selectedCard: card,
      isModalOpen: true,
    });
  };

  handleCloseModal = () => {
    this.setState({
      isModalOpen: false,
      selectedCard: null,
    });
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
      const newColumns = Array.from(this.props.kanbans);
      const [movedColumn] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, movedColumn);

      // Update order property
      const updatedColumns = newColumns.map((col, idx) => ({
        ...col,
        order: idx + 1,
      }));

      this.props.reorderKanbans(updatedColumns);
      return;
    }

    // Handle card movement
    const cardId = parseInt(draggableId.replace("card-", ""), 10);
    const destColumnId = parseInt(
      destination.droppableId.replace("column-", ""),
      10,
    );

    this.props.moveUserKanban(cardId, {
      kanban_id: destColumnId,
      order: destination.index,
    });
  };

  handleEditColumnTitle = (columnId, newTitle) => {
    this.props.updateKanban(columnId, { title: newTitle });
  };

  handleEditColumnColor = (columnId, newColor) => {
    this.props.updateKanban(columnId, { color: newColor });
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
    const { newColumnTitle, newColumnColor } = this.state;
    const { kanbans } = this.props;
    if (newColumnTitle.trim() === "") return;

    const newColumn = {
      title: newColumnTitle.trim(),
      order: kanbans.length + 1,
      color: newColumnColor,
    };

    this.props.createKanban(newColumn);

    this.setState({
      isCreatingColumn: false,
      newColumnTitle: "",
      newColumnColor: "#60a5fa",
    });
  };

  render() {
    const { kanbans, loading } = this.props;
    const { isCreatingColumn, newColumnTitle, newColumnColor } = this.state;

    if (loading) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "400px" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
        </div>
      );
    }

    const columns = kanbans || [];

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
                          color={this.getDefaultColor(column.color)}
                          cards={this.getCardsForColumn(column.id)}
                          onAddCard={() => this.handleAddCard(column.id)}
                          onStarClick={this.handleStarClick}
                          onMenuClick={this.handleMenuClick}
                          onCardClick={this.handleCardClick}
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

        {/* Modale de détail client */}
        <Modal
          isOpen={this.state.isModalOpen}
          toggle={this.handleCloseModal}
          size="lg"
        >
          {this.state.selectedCard && (
            <>
              <ModalHeader toggle={this.handleCloseModal}>
                <div className="d-flex align-items-center">
                  {this.state.selectedCard.isStarred && (
                    <Star
                      size={20}
                      className="text-warning fill-warning mr-50"
                    />
                  )}
                  <span>{this.state.selectedCard.name}</span>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="mb-2">
                  <h6 className="text-muted mb-50">Type de prospect</h6>
                  <h5 className="text-capitalize">
                    {this.state.selectedCard.type || "Autre"}
                  </h5>
                </div>

                <div className="mb-2">
                  <h6 className="text-muted mb-50">Montant</h6>
                  <h4 className="text-primary font-weight-bold">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(this.state.selectedCard.amount || 0)}
                  </h4>
                </div>

                {this.state.selectedCard.date &&
                  this.state.selectedCard.hour && (
                    <div className="mb-2">
                      <h6 className="text-muted mb-50">Date et heure</h6>
                      <div className="d-flex align-items-center">
                        <Clock size={16} className="mr-50" />
                        <span>
                          {new Date(
                            `${this.state.selectedCard.date}T${this.state.selectedCard.hour}:00`,
                          ).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                          {" à "}
                          {this.state.selectedCard.hour}
                        </span>
                      </div>
                    </div>
                  )}

                {this.state.selectedCard.deadline && (
                  <div className="mb-2">
                    <h6 className="text-muted mb-50">Échéance</h6>
                    <div className="d-flex align-items-center text-danger">
                      <Calendar size={16} className="mr-50" />
                      <span className="font-weight-bold">
                        {this.state.selectedCard.deadline}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  <h6 className="text-muted mb-50">Statut</h6>
                  <span>
                    Colonne:{" "}
                    <strong>
                      {this.props.kanbans.find(
                        (col) => col.id === this.state.selectedCard.kanban_id,
                      )?.title || "N/A"}
                    </strong>
                  </span>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  outline
                  onClick={() => {
                    console.log("Éditer:", this.state.selectedCard);
                    // TODO: Implémenter l'édition
                  }}
                  className="d-flex align-items-center"
                >
                  <Edit size={14} className="mr-50" />
                  Éditer
                </Button>
                <Button
                  color="danger"
                  outline
                  onClick={() => {
                    console.log("Supprimer:", this.state.selectedCard);
                    // TODO: Implémenter la suppression
                    this.handleCloseModal();
                  }}
                  className="d-flex align-items-center"
                >
                  <Trash2 size={14} className="mr-50" />
                  Supprimer
                </Button>
                <Button color="secondary" onClick={this.handleCloseModal}>
                  Fermer
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      </DragDropContext>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    kanbans: state.kanbanApp.kanban.kanbans,
    userKanbans: state.kanbanApp.kanban.userKanbans,
    loading: state.kanbanApp.kanban.loading,
  };
};

export default connect(mapStateToProps, {
  getKanbans,
  createKanban,
  getUserKanbans,
  createUserKanban,
  moveUserKanban,
  updateKanban,
  reorderKanbans,
})(KanbanBoard);
