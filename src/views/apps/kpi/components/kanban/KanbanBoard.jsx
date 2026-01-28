import React from "react";
import { connect } from "react-redux";
import { Row, Col } from "reactstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
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
    cards: [
      {
        id: 1,
        kanban_id: 1,
        type: "Autre",
        name: "Paul Gueutal",
        amount: 0,
        isStarred: false,
      },
      {
        id: 2,
        kanban_id: 1,
        type: "Autre",
        name: "Nicolas Gomart",
        amount: 0,
        isStarred: false,
      },
      {
        id: 3,
        kanban_id: 1,
        type: "Autre",
        name: "Chetrit",
        amount: 0,
        isStarred: false,
      },
      {
        id: 4,
        kanban_id: 1,
        type: "Autre",
        name: "Pascal Gilly",
        amount: 0,
        isStarred: false,
      },
      {
        id: 5,
        kanban_id: 2,
        type: "Bilan",
        name: "M. Martin",
        amount: 2800,
        deadline: "Demain 14h",
        isStarred: false,
      },
      {
        id: 6,
        kanban_id: 3,
        type: "Entreprise",
        name: "Sarl Dupuis",
        amount: 4500,
        isStarred: false,
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

  render() {
    const { columns } = this.state;

    return (
      <DragDropContext onDragEnd={this.handleDragEnd}>
        <div className="kanban-board-wrapper">
          <Droppable
            droppableId="all-columns"
            direction="horizontal"
            type="column"
          >
            {(provided) => (
              <Row
                className="kanban-board"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {columns.map((column, index) => (
                  <Draggable
                    key={column.id}
                    draggableId={`column-drag-${column.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Col
                        lg="4"
                        md="6"
                        sm="12"
                        className="mb-2"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
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
                        />
                      </Col>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Row>
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
