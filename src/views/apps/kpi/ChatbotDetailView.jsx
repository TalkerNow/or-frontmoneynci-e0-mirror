import React, { useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Badge,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
} from "reactstrap";
import {
  MessageSquare,
  User,
  Cpu,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
  Calendar,
  Flag,
} from "react-feather";
import PropTypes from "prop-types";

const ChatbotDetailView = ({ conversation }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const toggleModal = () => setModalOpen(!modalOpen);

  // --- Mock Data fallback ---
  const clientName =
    conversation?.user?.firstname && conversation?.user?.lastname
      ? `${conversation.user.firstname} ${conversation.user.lastname}`
      : conversation?.user?.firstname || "Marcos RUBIO";

  const clientPhone =
    conversation?.user?.telephone ||
    (conversation?.id && conversation.id.toString().startsWith("suivi")
      ? "06 82 28 94 59"
      : "06 12 34 56 78"); // Mock phone for suivis fallback

  const clientEmail = conversation?.user?.email || "marc.rubio.mr@gmail.com";

  // Mock AI summary
  const aiSummary =
    "Souhaite racheter des trimestres manquants (3 ans). Carrière mixte : 15 ans salarié, 10 ans indépendant. Disponible mardi après-midi pour un RDV.";

  // Mock messages
  const messages = conversation?.messages || [
    {
      id: 1,
      sender: "assistant",
      text: "Bonjour ! Je suis l'assistant virtuel EOR. Comment puis-je vous aider aujourd'hui concernant votre retraite ?",
      time: "10:00",
    },
    {
      id: 2,
      sender: "user",
      text: "Bonjour, je voudrais savoir comment racheter des trimestres.",
      time: "10:01",
    },
  ];

  // Mock Diagnostic Data
  const diagnostic = {
    score: 45,
    birthDate: "24/09/1964",
    departSouhaite: "01/07/2026",
    departSouhaiteLabel: "(61 ans et 9 mois)",
    ageLegal: "24/09/2027",
    tauxPlein: "24/09/2031",
    profile: "Explorateur Pragmatique",
    profileDesc:
      "Le prospect est perdu dans les dates. Il a besoin de clarté immédiate, pas de jargon. Adoptez une posture pédagogique mais directive.",
    painPoint: "Écart Critique : -14 mois",
    painPointDesc:
      "Il veut partir 14 mois AVANT son âge légal (63 ans). Projet irréaliste sans décote massive.",
    minedField:
      "Service Militaire : Risque d'oubli sur le RIS. Carrière non auditée : Jamais vérifiée (danger).",
    levers:
      "Rachat Trimestres : Fiscalité à explorer. Chômage : Vérifier l'indemnisation passée.",
  };

  return (
    <div className="chatbot-detail-view h-100 font-small-3">
      <Card className="h-100 shadow-sm border-0 mb-0">
        <CardBody className="p-2">
          {/* --- TOP BAR: STATUS & ACTIONS --- */}
          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-light">
            <div className="d-flex align-items-center">
              <Badge
                color="warning"
                className="mr-2 px-2 py-1"
                pill
                style={{ fontSize: "0.75rem" }}
              >
                Diagnostic
              </Badge>
              <small className="text-muted font-small-2">
                Reçu le{" "}
                {conversation?.created_at
                  ? new Date(conversation.created_at).toLocaleDateString()
                  : "Auj. 08:00"}{" "}
                • Web
              </small>
            </div>
            <div className="d-flex">
              <Button
                color="flat-danger"
                size="sm"
                className="mr-1 d-flex align-items-center px-2"
                style={{ paddingTop: "0.4rem", paddingBottom: "0.4rem" }}
              >
                <AlertCircle size={13} className="mr-1" />
                <span className="font-small-2 font-weight-bold">
                  Disqualifier
                </span>
              </Button>
              <Button
                color="primary"
                size="sm"
                className="d-flex align-items-center px-3 shadow-sm"
                style={{
                  borderRadius: "20px",
                  paddingTop: "0.4rem",
                  paddingBottom: "0.4rem",
                }}
              >
                <TrendingUp size={13} className="mr-1" />
                <span className="font-small-2 font-weight-bold">Convertir</span>
              </Button>
            </div>
          </div>

          {/* --- CLIENT INFO --- */}
          <div className="mb-3 px-1">
            <Row>
              <Col md="4" className="mb-1 mb-md-0">
                <label
                  className="text-muted text-uppercase font-small-1 mb-1 d-block"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Nom du Prospect
                </label>
                <div className="font-weight-bold text-dark font-small-3">
                  {clientName}
                </div>
              </Col>
              <Col md="4" className="mb-1 mb-md-0">
                <label
                  className="text-muted text-uppercase font-small-1 mb-1 d-block"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Téléphone
                </label>
                <div className="font-weight-medium text-dark font-small-3">
                  {clientPhone}
                </div>
              </Col>
              <Col md="4">
                <label
                  className="text-muted text-uppercase font-small-1 mb-1 d-block"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Email
                </label>
                <div className="text-dark font-small-3 text-truncate">
                  {clientEmail}
                </div>
              </Col>
            </Row>
          </div>

          {/* --- DIAGNOSTIC RESULTS --- */}
          <div
            className="p-3 mb-3 rounded-lg"
            style={{ backgroundColor: "#fff9f2", border: "1px solid #ffeebb" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-dark font-weight-bolder font-small-3 d-flex align-items-center">
                <Flag size={14} className="mr-2 text-warning" />
                Synthèse Diagnostic
              </h6>
              <div className="d-flex align-items-center">
                <Badge
                  color="light-secondary"
                  className="mr-2 font-small-1 text-muted"
                >
                  Salarié Privé
                </Badge>
                {/* Score Circle Mini */}
                <div className="d-flex align-items-center text-warning font-weight-bold font-small-3">
                  <span className="mr-1">Score:</span>
                  <span>{diagnostic.score}/100</span>
                </div>
              </div>
            </div>

            <Row className="mb-3">
              <Col xs="6" md="3" className="mb-2 mb-md-0">
                <div className="text-muted font-small-1 text-uppercase mb-1">
                  Naissance
                </div>
                <div className="font-weight-bold text-dark font-small-2">
                  {diagnostic.birthDate}
                </div>
              </Col>
              <Col xs="6" md="3" className="mb-2 mb-md-0">
                <div className="text-muted font-small-1 text-uppercase mb-1">
                  Départ Souhaité
                </div>
                <div className="font-weight-bold text-dark font-small-2">
                  {diagnostic.departSouhaite}
                </div>
                <small className="text-muted font-small-1">
                  {diagnostic.departSouhaiteLabel}
                </small>
              </Col>
              <Col xs="6" md="3">
                <div className="text-primary font-small-1 text-uppercase mb-1 font-weight-bold">
                  Âge Légal
                </div>
                <div className="font-weight-bold text-primary font-small-2">
                  {diagnostic.ageLegal}
                </div>
              </Col>
              <Col xs="6" md="3">
                <div className="text-success font-small-1 text-uppercase mb-1 font-weight-bold">
                  Taux Plein Auto
                </div>
                <div className="font-weight-bold text-success font-small-2">
                  {diagnostic.tauxPlein}
                </div>
              </Col>
            </Row>

            <div className="p-2 bg-white rounded border border-light">
              {/* Profile */}
              <div className="mb-2 pb-2 border-bottom border-light">
                <div className="d-flex align-items-center mb-1">
                  <Cpu size={14} className="text-primary mr-2" />
                  <span className="font-small-2 font-weight-bold text-dark">
                    Profil: {diagnostic.profile}
                  </span>
                </div>
                <p className="mb-0 font-small-2 text-muted pl-4 ml-1 font-italic">
                  "{diagnostic.profileDesc}"
                </p>
              </div>

              <Row className="pt-1">
                <Col md="6" className="border-right border-light">
                  <div className="d-flex align-items-start">
                    <AlertCircle
                      size={14}
                      className="text-danger mr-2 mt-1 flex-shrink-0"
                    />
                    <div>
                      <div className="font-small-2 font-weight-bold text-danger mb-0">
                        Point de Douleur
                      </div>
                      <div className="font-small-2 text-dark font-weight-medium mb-1">
                        {diagnostic.painPoint}
                      </div>
                      <p className="font-small-1 text-muted mb-0 line-height-1">
                        {diagnostic.painPointDesc}
                      </p>
                    </div>
                  </div>
                </Col>
                <Col md="6">
                  <div className="d-flex align-items-start">
                    <TrendingUp
                      size={14}
                      className="text-success mr-2 mt-1 flex-shrink-0"
                    />
                    <div>
                      <div className="font-small-2 font-weight-bold text-success mb-1">
                        Leviers Identifiés
                      </div>
                      <ul className="pl-3 mb-0 font-small-1 text-muted">
                        {diagnostic.levers
                          .split(". ")
                          .map((l, i) => l && <li key={i}>{l}</li>)}
                      </ul>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          {/* --- AI SUMMARY BLOCK --- */}
          <div className="p-3 rounded-lg bg-light-primary border-0">
            <div className="d-flex align-items-center mb-2">
              <div
                className="avatar bg-white p-1 shadow-sm mr-2 rounded-circle d-flex justify-content-center align-items-center"
                style={{ width: 24, height: 24 }}
              >
                <Cpu size={12} className="text-primary" />
              </div>
              <h6 className="mb-0 font-weight-bold text-primary font-small-2 text-uppercase">
                Résumé de la conversation
              </h6>
            </div>
            <div
              className="font-small-2 text-dark"
              style={{ lineHeight: "1.5" }}
            >
              {aiSummary}
            </div>

            <div className="text-center mt-3">
              <Button
                color="white"
                size="sm"
                onClick={toggleModal}
                className="font-weight-medium text-primary shadow-sm font-small-2 px-3 rounded-pill"
              >
                Lire la transcription complète
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* --- FULL CONVERSATION MODAL --- */}
      <Modal
        isOpen={modalOpen}
        toggle={toggleModal}
        className="modal-dialog-centered modal-lg"
        scrollable
        fade={true}
      >
        <ModalHeader
          toggle={toggleModal}
          className="bg-white border-bottom-0 pb-0"
        >
          <div className="d-flex align-items-center">
            <div className="avatar bg-light-primary rounded-circle mr-2 p-1">
              <MessageSquare size={18} className="text-primary" />
            </div>
            <div>
              <h5 className="mb-0 font-weight-bold">Historique des échanges</h5>
              <small className="text-muted">Avec {clientName}</small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody
          className="p-0 bg-light-secondary"
          style={{ minHeight: "500px" }}
        >
          <div className="p-4">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === "user" || msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`d-flex mb-3 ${
                    isUser ? "justify-content-end" : "justify-content-start"
                  }`}
                >
                  {!isUser && (
                    <div className="mr-2 mt-auto">
                      <div
                        className="avatar bg-white shadow-sm rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32 }}
                      >
                        <img
                          src={require("../../../assets/img/portrait/small/avatar-s-1.jpg")}
                          alt="bot"
                          width="32"
                          height="32"
                          className="rounded-circle"
                        />
                      </div>
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 shadow-sm ${
                      isUser ? "bg-primary text-white" : "bg-white text-dark"
                    }`}
                    style={{
                      maxWidth: "70%",
                      borderRadius: "18px",
                      borderBottomLeftRadius: !isUser ? "4px" : "18px",
                      borderBottomRightRadius: isUser ? "4px" : "18px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div>{msg.text || msg.content}</div>
                    <div
                      className={`text-right font-small-1 mt-1 ${
                        isUser ? "text-white-50" : "text-muted"
                      }`}
                    >
                      {msg.time || "10:xx"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
};

ChatbotDetailView.propTypes = {
  conversation: PropTypes.object,
};

export default ChatbotDetailView;
