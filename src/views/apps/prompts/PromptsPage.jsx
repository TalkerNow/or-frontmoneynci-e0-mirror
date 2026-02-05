import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Row,
  Col,
  Button,
  Input,
  Label,
  FormGroup,
  Table,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
} from "reactstrap";
import { Edit2, Trash2, Plus, Eye, Clock, RotateCcw } from "react-feather";
import axios from "axios";
import { toast } from "react-toastify";
import "./PromptsPage.scss";

const PromptsPage = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [viewingPrompt, setViewingPrompt] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    prompt_text: "",
  });
  const [alert, setAlert] = useState(null);
  const [selectedPromptHistory, setSelectedPromptHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [restorePrompt, setRestorePrompt] = useState(null);
  const editContainerRef = useRef(null);

  const API_BASE = (global?.config?.server_url || "").replace(/\/+$/, "");

  const getConfig = () => ({
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/prompts`, getConfig());
      setPrompts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erreur lors du chargement");
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setAlert({ color: "warning", message: "Le nom est obligatoire" });
      return;
    }

    if (!formData.prompt_text.trim()) {
      setAlert({ color: "warning", message: "Le contenu est obligatoire" });
      return;
    }

    try {
      if (editingId) {
        await axios.put(
          `${API_BASE}/prompts/${editingId}`,
          formData,
          getConfig(),
        );
        toast.success("Prompt modifié");
      } else {
        await axios.post(`${API_BASE}/prompts`, formData, getConfig());
        toast.success("Prompt créé");
      }
      setModal(false);
      setFormData({ name: "", type: "", description: "", prompt_text: "" });
      setEditingId(null);
      setAlert(null);
      fetchPrompts();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: "", type: "", description: "", prompt_text: "" });
    setAlert(null);
    setModal(true);
  };

  const openEditModal = (prompt) => {
    setEditingId(prompt.id);
    setFormData({
      name: prompt.name || "",
      type: prompt.type || "",
      description: prompt.description || "",
      prompt_text: prompt.prompt_text || "",
    });
    setAlert(null);
    setModal(true);
  };

  const handleView = async (prompt) => {
    setViewingPrompt(prompt);
    setIsEditing(false);
    try {
      const { data } = await axios.get(
        `${API_BASE}/prompts/${prompt.id}/history`,
        getConfig(),
      );
      setSelectedPromptHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      setSelectedPromptHistory([]);
    }
  };

  const handleRestore = async (promptId, version) => {
    if (!window.confirm(`Restaurer la version ${version} ?`)) return;

    try {
      await axios.post(
        `${API_BASE}/prompts/${promptId}/restore/${version}`,
        {},
        getConfig(),
      );
      toast.success("Version restaurée");
      setRestorePrompt(null);
      setViewingPrompt(null);
      setIsEditing(false);
      fetchPrompts();
    } catch (error) {
      toast.error("Erreur restauration");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce prompt ?")) return;

    try {
      await axios.delete(`${API_BASE}/prompts/${id}`, getConfig());
      toast.success("Supprimé");
      if (viewingPrompt?.id === id) {
        setViewingPrompt(null);
      }
      fetchPrompts();
    } catch (error) {
      toast.error("Erreur suppression");
    }
  };

  const startEditFromViewing = () => {
    if (!viewingPrompt) return;
    setFormData({
      name: viewingPrompt.name || "",
      type: viewingPrompt.type || "",
      description: viewingPrompt.description || "",
      prompt_text: viewingPrompt.prompt_text || "",
    });
    setEditingId(viewingPrompt.id);
    setIsEditing(true);
    setAlert(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setAlert(null);
  };

  const handleCopyPromptText = (promptText) => {
    navigator.clipboard.writeText(promptText);
    toast.success("Texte du prompt copié !");
  };

  return (
    <div className="prompts-page">
      <Row>
        <Col sm="12">
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle className="mb-0">Gestion des Prompts</CardTitle>
              <Button color="primary" onClick={openCreateModal}>
                <Plus size={18} className="mr-2" />
                Nouveau Prompt
              </Button>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="empty-state">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Chargement...</span>
                  </div>
                </div>
              ) : prompts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h5>Aucun prompt</h5>
                  <p className="text-muted">
                    Commencez par créer votre premier prompt
                  </p>
                  <Button
                    color="primary"
                    onClick={openCreateModal}
                    className="mt-3"
                  >
                    <Plus size={18} className="mr-2" />
                    Créer un prompt
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prompts.map((prompt) => (
                        <tr key={prompt.id}>
                          <td>
                            <strong>{prompt.name}</strong>
                          </td>
                          <td>
                            {prompt.type ? (
                              <Badge color="light-primary">{prompt.type}</Badge>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {prompt.description || (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <Button
                                color="info"
                                size="sm"
                                outline
                                onClick={() => handleView(prompt)}
                                title="Voir"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                color="primary"
                                size="sm"
                                outline
                                onClick={() => openEditModal(prompt)}
                                title="Modifier"
                              >
                                <Edit2 size={16} />
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                outline
                                onClick={() => handleDelete(prompt.id)}
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Modal Vue / Édition */}
          {viewingPrompt && (
            <Modal
              isOpen={true}
              toggle={() => {
                setViewingPrompt(null);
                setIsEditing(false);
              }}
              size="lg"
              className="prompt-detail-modal"
            >
              <ModalHeader
                toggle={() => {
                  setViewingPrompt(null);
                  setIsEditing(false);
                }}
              >
                {isEditing ? "Éditer le prompt" : viewingPrompt.name}
              </ModalHeader>
              <ModalBody
                className="prompt-modal-body"
                onMouseDownCapture={(e) => {
                  if (!isEditing) return;
                  if (!editContainerRef.current) return;
                  if (!editContainerRef.current.contains(e.target)) {
                    cancelEdit();
                  }
                }}
              >
                <Row>
                  <Col md="8">
                    {!isEditing ? (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            {viewingPrompt.type && (
                              <Badge
                                color="light-primary"
                                pill
                                className="mr-2"
                              >
                                {viewingPrompt.type}
                              </Badge>
                            )}
                            <small className="text-muted">
                              Mis à jour le{" "}
                              {new Date(
                                viewingPrompt.updated_at,
                              ).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                          </div>
                        </div>

                        {viewingPrompt.description && (
                          <div
                            className="mb-3 editable-trigger"
                            onClick={startEditFromViewing}
                            title="Cliquer pour modifier"
                          >
                            <h6 className="text-description">Description</h6>
                            <p className="text-muted">
                              {viewingPrompt.description}
                            </p>
                          </div>
                        )}

                        <div>
                          <h6 className="text-description">
                            Contenu du Prompt
                          </h6>
                          <div
                            className="prompt-content-box editable-trigger"
                            onClick={startEditFromViewing}
                            title="Cliquer pour modifier"
                          >
                            {viewingPrompt.prompt_text}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div ref={editContainerRef}>
                        <Row>
                          <Col md="6">
                            <FormGroup>
                              <Label>
                                Nom <span className="text-danger">*</span>
                              </Label>
                              <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </FormGroup>
                          </Col>
                          <Col md="6">
                            <FormGroup>
                              <Label>Type</Label>
                              <Input
                                type="select"
                                value={formData.type}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    type: e.target.value,
                                  })
                                }
                              >
                                <option value="">Sélectionner</option>
                                <option value="general">Général</option>
                                <option value="email">Email</option>
                                <option value="rapport">Rapport</option>
                                <option value="analyse">Analyse</option>
                              </Input>
                            </FormGroup>
                          </Col>
                        </Row>

                        <FormGroup>
                          <Label>Description</Label>
                          <Input
                            type="textarea"
                            rows="2"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>
                            Contenu <span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="textarea"
                            rows="10"
                            value={formData.prompt_text}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                prompt_text: e.target.value,
                              })
                            }
                            style={{ fontFamily: "monospace" }}
                          />
                        </FormGroup>

                        {alert && (
                          <Alert color={alert.color} className="mb-3">
                            {alert.message}
                          </Alert>
                        )}
                      </div>
                    )}
                  </Col>

                  <Col md="4">
                    <div className="history-sidebar">
                      <div className="history-header">
                        <h6 className="mb-0 d-flex align-items-center">
                          <Clock size={18} className="mr-2" />
                          Historique
                        </h6>
                        <Badge color="light-secondary" pill>
                          {selectedPromptHistory.length}
                        </Badge>
                      </div>

                      <div className="history-list">
                        {selectedPromptHistory.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-muted small">
                              Aucune version antérieure
                            </p>
                          </div>
                        ) : (
                          selectedPromptHistory.map((version, idx) => (
                            <div
                              key={version.id || idx}
                              className="history-item"
                            >
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <Badge
                                    color="light-secondary"
                                    className="mr-2"
                                  >
                                    V{version.version}
                                  </Badge>
                                  <small className="text-muted">
                                    {new Date(
                                      version.created_at,
                                    ).toLocaleDateString("fr-FR", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </small>
                                </div>
                                {version.creator && (
                                  <small className="text-muted">
                                    {version.creator.name || "Admin"}
                                  </small>
                                )}
                              </div>
                              <div
                                className="history-content-preview"
                                onClick={() =>
                                  handleCopyPromptText(version.prompt_text)
                                }
                                title="Cliquer pour copier"
                              >
                                {version.prompt_text}
                              </div>
                              <Button
                                color="primary"
                                size="sm"
                                outline
                                block
                                className="mt-2"
                                onClick={() =>
                                  setRestorePrompt({
                                    version: version.version,
                                    promptId: viewingPrompt.id,
                                    promptText: version.prompt_text,
                                  })
                                }
                              >
                                <RotateCcw size={12} className="mr-1" />
                                Restaurer
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                {!isEditing ? (
                  <>
                    <Button
                      color="secondary"
                      onClick={() => {
                        setViewingPrompt(null);
                        setIsEditing(false);
                      }}
                    >
                      Fermer
                    </Button>
                  </>
                ) : (
                  <>
                    <Button color="secondary" onClick={cancelEdit}>
                      Annuler
                    </Button>
                    <Button color="primary" onClick={handleSave}>
                      Enregistrer
                    </Button>
                  </>
                )}
              </ModalFooter>
            </Modal>
          )}

          {/* Modale de confirmation restore */}
          {restorePrompt && (
            <Modal
              isOpen={true}
              toggle={() => setRestorePrompt(null)}
              size="lg"
            >
              <ModalHeader toggle={() => setRestorePrompt(null)}>
                Restaurer la version {restorePrompt.version}
              </ModalHeader>
              <ModalBody>
                <div className="mb-3">
                  <h6 className="text-secondary mb-2">Contenu de la version</h6>
                  <div className="restore-preview">
                    {restorePrompt.promptText}
                  </div>
                </div>
                <Alert color="warning">
                  <strong>Attention :</strong> Cette action remplacera le
                  contenu actuel par cette version.
                </Alert>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  onClick={() => setRestorePrompt(null)}
                >
                  Annuler
                </Button>
                <Button
                  color="warning"
                  onClick={() => {
                    handleRestore(
                      restorePrompt.promptId,
                      restorePrompt.version,
                    );
                  }}
                >
                  <RotateCcw size={14} className="mr-1" />
                  Confirmer la restauration
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </Col>
      </Row>

      {/* Modal Créer/Modifier */}
      <Modal isOpen={modal} toggle={() => setModal(false)} size="lg">
        <ModalHeader toggle={() => setModal(false)}>
          {editingId ? "Modifier le prompt" : "Nouveau prompt"}
        </ModalHeader>
        <ModalBody>
          {alert && (
            <Alert color={alert.color} className="mb-3">
              {alert.message}
            </Alert>
          )}

          <Row>
            <Col md="6">
              <FormGroup>
                <Label>
                  Nom <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Email de relance client"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Type</Label>
                <Input
                  type="select"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="">Sélectionner</option>
                  <option value="general">Général</option>
                  <option value="email">Email</option>
                  <option value="rapport">Rapport</option>
                  <option value="analyse">Analyse</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label>Description</Label>
            <Input
              type="textarea"
              placeholder="Brève description"
              rows="2"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </FormGroup>

          <FormGroup>
            <Label>
              Contenu <span className="text-danger">*</span>
            </Label>
            <Input
              type="textarea"
              placeholder="Entrez le contenu du prompt..."
              rows="8"
              value={formData.prompt_text}
              onChange={(e) =>
                setFormData({ ...formData, prompt_text: e.target.value })
              }
              style={{ fontFamily: "monospace" }}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setModal(false)}>
            Annuler
          </Button>
          <Button color="primary" onClick={handleSave}>
            {editingId ? "Enregistrer" : "Créer"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PromptsPage;
