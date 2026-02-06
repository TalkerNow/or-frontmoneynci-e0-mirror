import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import axios from "axios";
import { Button, Input, Card, CardBody } from "reactstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Plus, Check, X } from "react-feather";
import KanbanColumn from "./KanbanColumn";
import UserKanbanModal from "./Modals/UserKanbanModal";
import {
  getKanbans,
  createKanban,
  getUserKanbans,
  createUserKanban,
  moveUserKanban,
  updateKanban,
  updateUserKanban,
  deleteKanban,
  deleteUserKanban,
  reorderKanbans,
} from "../../../../../redux/actions/kanban";
import "./kanban.scss";

class KanbanBoard extends React.Component {
  constructor(props) {
    super(props);
    this.kanbanBoardRef = React.createRef();
    this.autoScrollInterval = null;
    this.state = {
      isCreatingColumn: false,
      newColumnTitle: "",
      newColumnColor: "#60a5fa",
      searchQuery: "",
      selectedCard: null,
      isModalOpen: false,
      userDetails: null,
      loadingUserDetails: false,
      usersData: {}, // Cache des données utilisateur
      loadingUsersData: false, // État de chargement des données utilisateur
    };
  }

  componentDidMount() {
    this.props.getKanbans();
    this.props.getUserKanbans();
    this.fetchAllUsersData();
  }

  componentDidUpdate(prevProps) {
    // Recharger les données utilisateurs si les userKanbans changent
    if (prevProps.userKanbans !== this.props.userKanbans) {
      this.fetchAllUsersData();
    }
  }

  componentWillUnmount() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  fetchAllUsersData = async () => {
    const { userKanbans } = this.props;
    if (!userKanbans || userKanbans.length === 0) return;

    this.setState({ loadingUsersData: true });

    const userIds = [...new Set(userKanbans.map((uk) => uk.user_id))];
    const token = localStorage.getItem("token");
    const usersData = {};

    try {
      const promises = userIds.map((userId) =>
        axios
          .get(
            `${global.config.server_url}/users/${userId}?include=documents,conversationArchives,simulatorDifficultyResults`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          )
          .then((response) => {
            const user = response.data;
            // Calculer le montant total et les services
            const totalAmount = user.documents
              ? user.documents.reduce(
                  (sum, doc) => sum + (doc.advanced_payment || 0),
                  0,
                )
              : 0;
            const allServices = user.documents
              ? user.documents
                  .map((doc) => doc.subscribe_services)
                  .filter(Boolean)
                  .join(" / ")
              : "";

            // Déterminer la source du client
            let channel_origin = null;
            if (
              user.conversation_archives &&
              user.conversation_archives.length > 0
            ) {
              channel_origin = "chatbot";
            } else if (
              user.simulator_difficulty_results &&
              user.simulator_difficulty_results.length > 0
            ) {
              channel_origin = "diagnostic";
            }

            usersData[userId] = {
              totalAmount,
              allServices,
              documents: user.documents || [],
              phone:
                user.mobile_number ||
                user.phone ||
                user.tel ||
                user.phone_number ||
                "",
              channel_origin: channel_origin,
            };
          })
          .catch((error) => {
            console.error(`Error fetching user ${userId}:`, error);
            usersData[userId] = {
              totalAmount: 0,
              allServices: "",
              documents: [],
              channel_origin: null,
            };
          }),
      );

      await Promise.all(promises);
      this.setState({ usersData });
    } catch (error) {
      console.error("Error fetching users data:", error);
    }
  };

  // Rafraîchir les données d'un utilisateur spécifique
  refreshUserData = async (userId) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(
        `${global.config.server_url}/users/${userId}?include=documents,conversationArchives,simulatorDifficultyResults`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const user = response.data;
      const totalAmount = user.documents
        ? user.documents.reduce(
            (sum, doc) => sum + (doc.advanced_payment || 0),
            0,
          )
        : 0;
      const allServices = user.documents
        ? user.documents
            .map((doc) => doc.subscribe_services)
            .filter(Boolean)
            .join(" / ")
        : "";

      let channel_origin = null;
      if (user.conversation_archives && user.conversation_archives.length > 0) {
        channel_origin = "chatbot";
      } else if (
        user.simulator_difficulty_results &&
        user.simulator_difficulty_results.length > 0
      ) {
        channel_origin = "diagnostic";
      }

      this.setState((prevState) => ({
        usersData: {
          ...prevState.usersData,
          [userId]: {
            totalAmount,
            allServices,
            documents: user.documents || [],
            phone:
              user.mobile_number ||
              user.phone ||
              user.tel ||
              user.phone_number ||
              "",
            channel_origin: channel_origin,
          },
        },
        userDetails: user, // Mettre à jour aussi les détails affichés dans le modal
      }));
    } catch (error) {
      console.error(`Error refreshing user ${userId}:`, error);
    }
  };

  getCardsForColumn = (columnId) => {
    const { userKanbans } = this.props;
    const { searchQuery } = this.state;
    const { usersData } = this.state;

    if (!userKanbans || userKanbans.length === 0) return [];

    // Filtrer les userKanbans par kanban_id et mapper au format attendu par KanbanCard
    const normalizedQuery = (searchQuery || "").trim().toLowerCase();

    return userKanbans
      .filter((userKanban) => userKanban.kanban_id === columnId)
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.created_at || a.date || 0).getTime();
        const bDate = new Date(b.created_at || b.date || 0).getTime();
        return aDate - bDate;
      })
      .map((userKanban) => {
        // Extraire la date au format YYYY-MM-DD depuis l'ISO string
        let formattedDate = userKanban.date;
        if (userKanban.date && userKanban.date.includes("T")) {
          formattedDate = userKanban.date.split("T")[0];
        }

        // Extraire l'heure au format HH:MM (sans les secondes)
        let formattedHour = userKanban.hour;
        if (userKanban.hour && userKanban.hour.length > 5) {
          formattedHour = userKanban.hour.substring(0, 5);
        }

        // Récupérer les données de l'utilisateur depuis le cache
        const userData = usersData[userKanban.user_id] || {
          totalAmount: 0,
          allServices: "",
          phone: "",
          channel_origin: null,
        };

        return {
          id: userKanban.id,
          type: userData.allServices || "Autre",
          name: userKanban.user?.name || "Utilisateur inconnu",
          amount: userData.totalAmount,
          isStarred: false,
          date: formattedDate,
          hour: formattedHour,
          description: userKanban.description,
          status: userKanban.status,
          user_id: userKanban.user_id,
          kanban_id: userKanban.kanban_id,
          channel_origin: userData.channel_origin,
          phone: userData.phone,
        };
      })
      .filter((card) => {
        if (!normalizedQuery) return true;
        const haystack = [
          card.name,
          card.type,
          card.description,
          card.phone,
          card.channel_origin,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      });
  };

  getDefaultColor = (color) => {
    // Si pas de couleur, retourner bleu par défaut
    return color || "#60a5fa";
  };

  getRandomColor = () => {
    // Palette de couleurs
    const colorPalette = [
      "#facc15", // Jaune
      "#60a5fa", // Bleu
      "#a78bfa", // Violet
      "#4ade80", // Vert
      "#f472b6", // Rose
      "#fb923c", // Orange
      "#f87171", // Rouge
      "#22d3ee", // Cyan
    ];
    // Retourner une couleur aléatoire
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  handleAddCard = (columnId) => {
    console.log("Ajouter une carte à la colonne:", columnId);
    // TODO: Implémenter l'ajout de carte
  };

  handleStarClick = (card) => {
    const updatedCard = { ...card, isStarred: !card.isStarred };
    this.props.updateUserKanban(card.id, updatedCard);
  };

  handleDeleteCard = (card) => {
    this.props.deleteUserKanban(card.id);
  };

  handleCardClick = async (card) => {
    this.setState({
      selectedCard: card,
      isModalOpen: true,
      loadingUserDetails: true,
      userDetails: null,
    });

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${global.config.server_url}/users/${card.user_id}?include=documents,conversationArchives,simulatorDifficultyResults`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      this.setState({
        userDetails: response.data,
        loadingUserDetails: false,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      this.setState({ loadingUserDetails: false });
    }
  };

  handleCloseModal = () => {
    this.setState({
      isModalOpen: false,
      selectedCard: null,
      userDetails: null,
    });
  };

  handleSaveEdit = async (editFormData) => {
    const { selectedCard } = this.state;
    await this.props.updateUserKanban(selectedCard.id, editFormData);
    // Recharger les données
    this.props.getUserKanbans();
  };

  handleDragStart = () => {
    // Ajouter l'event listener pour le mouvement de la souris
    document.addEventListener("mousemove", this.handleAutoScroll);
  };

  handleAutoScroll = (e) => {
    const kanbanBoard = this.kanbanBoardRef.current;
    if (!kanbanBoard) return;

    const scrollThreshold = 150; // Zone de déclenchement en pixels
    const scrollSpeed = 15; // Vitesse de scroll
    const rect = kanbanBoard.getBoundingClientRect();
    const mouseX = e.clientX;

    // Clear any existing interval
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }

    // Scroll vers la gauche
    if (mouseX < rect.left + scrollThreshold) {
      this.autoScrollInterval = setInterval(() => {
        if (kanbanBoard.scrollLeft > 0) {
          kanbanBoard.scrollLeft -= scrollSpeed;
        }
      }, 20);
    }
    // Scroll vers la droite
    else if (mouseX > rect.right - scrollThreshold) {
      this.autoScrollInterval = setInterval(() => {
        const maxScroll = kanbanBoard.scrollWidth - kanbanBoard.clientWidth;
        if (kanbanBoard.scrollLeft < maxScroll) {
          kanbanBoard.scrollLeft += scrollSpeed;
        }
      }, 20);
    }
  };

  handleDragEnd = (result) => {
    // Nettoyer l'auto-scroll
    document.removeEventListener("mousemove", this.handleAutoScroll);
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }

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

  handleDeleteColumn = (columnId) => {
    this.props.deleteKanban(columnId);
  };

  handleStartCreateColumn = () => {
    this.setState({
      isCreatingColumn: true,
      newColumnColor: this.getRandomColor(),
    });
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
    const { isCreatingColumn, newColumnTitle, newColumnColor, searchQuery } =
      this.state;

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
      <DragDropContext
        onDragStart={this.handleDragStart}
        onDragEnd={this.handleDragEnd}
      >
        <div className="kanban-board-wrapper">
          <div className="mb-1">
            <Input
              type="text"
              placeholder="Rechercher une carte (nom, téléphone, source, description...)"
              value={searchQuery}
              onChange={(e) => this.setState({ searchQuery: e.target.value })}
            />
          </div>
          <Droppable
            droppableId="all-columns"
            direction="horizontal"
            type="column"
          >
            {(provided, snapshot) => (
              <div
                className="kanban-board"
                ref={(el) => {
                  provided.innerRef(el);
                  this.kanbanBoardRef.current = el;
                }}
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
                          onDeleteClick={this.handleDeleteCard}
                          onCardClick={this.handleCardClick}
                          onEditTitle={(newTitle) =>
                            this.handleEditColumnTitle(column.id, newTitle)
                          }
                          onEditColor={(newColor) =>
                            this.handleEditColumnColor(column.id, newColor)
                          }
                          onDelete={(columnId) =>
                            this.handleDeleteColumn(columnId)
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
        <UserKanbanModal
          isOpen={this.state.isModalOpen}
          onClose={this.handleCloseModal}
          selectedCard={this.state.selectedCard}
          userDetails={this.state.userDetails}
          loadingUserDetails={this.state.loadingUserDetails}
          kanbans={this.props.kanbans}
          onSave={this.handleSaveEdit}
          onDelete={this.handleDeleteCard}
          onContractChange={this.refreshUserData}
        />
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
  updateUserKanban,
  deleteKanban,
  deleteUserKanban,
  reorderKanbans,
})(withRouter(KanbanBoard));
