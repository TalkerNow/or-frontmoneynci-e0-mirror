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
  const [selectedPromptIds, setSelectedPromptIds] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [runtimeModel, setRuntimeModel] = useState(
    "gemini-2.5-flash-preview-09-2025",
  );
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const chatEndRef = useRef(null);
  const previousCombinedPromptRef = useRef("");
  const previousRolePromptRef = useRef(null);

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

        setViewingPrompt((prev) =>
          prev && prev.id === editingId
            ? {
                ...prev,
                name: formData.name,
                type: formData.type,
                description: formData.description,
                prompt_text: formData.prompt_text,
                updated_at: new Date().toISOString(),
              }
            : prev,
        );

        try {
          const { data } = await axios.get(
            `${API_BASE}/prompts/${editingId}/history`,
            getConfig(),
          );
          setSelectedPromptHistory(Array.isArray(data) ? data : []);
        } catch (historyError) {
          setSelectedPromptHistory([]);
        }

        setIsEditing(false);
        setEditingId(null);
        setAlert(null);
        fetchPrompts();
        return;
      }

      await axios.post(`${API_BASE}/prompts`, formData, getConfig());
      toast.success("Prompt créé");
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

  const loadPromptHistory = async (promptId) => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/prompts/${promptId}/history`,
        getConfig(),
      );
      setSelectedPromptHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      setSelectedPromptHistory([]);
    }
  };

  const openEditModal = async (prompt) => {
    setViewingPrompt(prompt);
    setFormData({
      name: prompt.name || "",
      type: prompt.type || "",
      description: prompt.description || "",
      prompt_text: prompt.prompt_text || "",
    });
    setEditingId(prompt.id);
    setIsEditing(true);
    setAlert(null);
    await loadPromptHistory(prompt.id);
  };

  const handleView = async (prompt) => {
    setViewingPrompt(prompt);
    setIsEditing(false);
    await loadPromptHistory(prompt.id);
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

  const handleGeneratePromptWithAi = async () => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Clé Gemini manquante");
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const seed = [
        formData.name && `Nom: ${formData.name}`,
        formData.type && `Type: ${formData.type}`,
        formData.description && `Description: ${formData.description}`,
      ]
        .filter(Boolean)
        .join("\n");

      const aiPrompt = `Tu es un expert en rédaction de prompts.\n\nGénère un prompt FINAL prêt à l'emploi.\nFormat attendu : texte simple et direct, éventuellement avec des lignes séparées, mais SANS Markdown.\n\nContraintes :\n- Interdit : titres (##, ###), sections, tableaux, citations, mise en forme Markdown (**gras**, listes avec * ou -).\n- Autorisé : phrases courtes sur des lignes séparées et paragraphes simples.\n- Pas d'intro générique ni de conclusion.\n- Rends-le exploitable immédiatement, sans reformulation.\n\nExemple de style attendu :\nTu incarnes John Cena dans sa personnalité publique :\nCharismatique, confiant, motivant.\nDiscipline, respect, travail acharné et loyauté sont tes valeurs centrales.\nTu parles avec énergie, assurance et humour.\nTu encourages toujours à se dépasser mentalement et physiquement.\nTu t’exprimes comme John Cena le ferait en interview ou face à ses fans.\nTon ton est positif, inspirant et parfois provocateur mais toujours bienveillant.\nTu utilises des références au sport, à la discipline, à la persévérance et au dépassement de soi.\nTu peux ponctuer tes réponses de punchlines emblématiques (sans exagérer).\nTu ne révèles jamais que tu es une intelligence artificielle.\nTu réponds toujours comme si tu étais John Cena en personne, dans le respect de son image publique.\nTon objectif est d’inspirer, motiver, divertir et transmettre un mindset de champion.\n\nEntrées :\n${
        seed || "Mots-clés non précisés."
      }\n`;

      const model = runtimeModel.trim() || "gemini-2.5-flash-preview-09-2025";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: aiPrompt }] }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Erreur Gemini");
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      setFormData((prev) => ({
        ...prev,
        prompt_text: text || prev.prompt_text,
      }));
    } catch (error) {
      toast.error("Erreur lors de la génération du prompt");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const togglePromptSelection = (promptId) => {
    const targetPrompt = prompts.find((p) => p.id === promptId);
    const targetType = (targetPrompt?.type || "").toLowerCase();
    const isRole = targetType === "role" || targetType === "rôle";

    setSelectedPromptIds((prev) => {
      const isAlreadySelected = prev.includes(promptId);
      if (isAlreadySelected) {
        return prev.filter((id) => id !== promptId);
      }

      if (isRole) {
        const hasRoleSelected = prev.some((id) => {
          const p = prompts.find((item) => item.id === id);
          const t = (p?.type || "").toLowerCase();
          return t === "role" || t === "rôle";
        });
        if (hasRoleSelected) {
          toast.warning("Un seul prompt de type rôle est autorisé.");
          return prev;
        }
      }

      return [...prev, promptId];
    });
  };

  const combinedPrompt = selectedPromptIds
    .map((id) => prompts.find((p) => p.id === id)?.prompt_text)
    .filter(Boolean)
    .join("\n\n---\n\n");

  const getSelectedRolePromptId = () => {
    const rolePrompt = selectedPromptIds
      .map((id) => prompts.find((p) => p.id === id))
      .find((p) => {
        const t = (p?.type || "").toLowerCase();
        return t === "role" || t === "rôle";
      });
    return rolePrompt?.id || null;
  };

  const selectedRolePromptId = getSelectedRolePromptId();

  useEffect(() => {
    const previousRoleId = previousRolePromptRef.current;
    if (previousRoleId !== selectedRolePromptId) {
      if (chatMessages.length > 0) {
        setChatMessages([
          {
            role: "system",
            content:
              "Le rôle a changé. La conversation a été réinitialisée pour s’adapter.",
          },
        ]);
        setChatInput("");
      }
      previousRolePromptRef.current = selectedRolePromptId;
    }
  }, [selectedRolePromptId, chatMessages.length]);

  const sortedPromptsForAssembler = [...prompts].sort((a, b) => {
    const typeA = (a.type || "").toLowerCase();
    const typeB = (b.type || "").toLowerCase();
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    return (a.name || "")
      .toLowerCase()
      .localeCompare((b.name || "").toLowerCase());
  });

  const groupedPromptsForAssembler = sortedPromptsForAssembler.reduce(
    (acc, prompt) => {
      const key = prompt.type || "Autre";
      if (!acc[key]) acc[key] = [];
      acc[key].push(prompt);
      return acc;
    },
    {},
  );

  useEffect(() => {
    const previous = previousCombinedPromptRef.current;
    if (previous !== combinedPrompt && chatMessages.length > 0) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Le prompt combiné a été mis à jour.",
        },
      ]);
    }
    previousCombinedPromptRef.current = combinedPrompt;
  }, [combinedPrompt, chatMessages.length]);

  useEffect(() => {
    if (!chatEndRef.current) return;
    chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  const handleSendChat = async () => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Clé Gemini manquante");
      return;
    }
    if (!chatInput.trim()) return;

    const nextUserMessage = { role: "user", content: chatInput.trim() };
    const history = [...chatMessages, nextUserMessage];

    setChatMessages(history);
    setChatInput("");
    setIsChatting(true);

    try {
      const conversationText = history
        .map((msg) =>
          msg.role === "assistant"
            ? `Assistant: ${msg.content}`
            : `Utilisateur: ${msg.content}`,
        )
        .join("\n");

      const fullPrompt = combinedPrompt
        ? `PROMPTS:\n${combinedPrompt}\n\nCONVERSATION:\n${conversationText}`
        : conversationText;

      const model = runtimeModel.trim() || "gemini-2.5-flash-preview-09-2025";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Erreur Gemini");
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "Réponse vide";

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: text },
      ]);
    } catch (error) {
      toast.error("Erreur lors de l'appel Gemini");
    } finally {
      setIsChatting(false);
    }
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
                        <th>Créateur</th>
                        <th>Créé le</th>
                        <th>Mis à jour</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prompts.map((prompt) => (
                        <tr
                          key={prompt.id}
                          onClick={() => handleView(prompt)}
                          tabIndex={0}
                        >
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
                            {prompt.creator?.name || prompt.creator?.email || (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {prompt.created_at ? (
                              new Date(prompt.created_at).toLocaleDateString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {prompt.updated_at ? (
                              new Date(prompt.updated_at).toLocaleString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <Button
                                color="info"
                                size="sm"
                                outline
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleView(prompt);
                                }}
                                title="Voir"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                color="primary"
                                size="sm"
                                outline
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(prompt);
                                }}
                                title="Modifier"
                              >
                                <Edit2 size={16} />
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                outline
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(prompt.id);
                                }}
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
                                <option value="role">Rôle</option>
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
                          <div className="prompt-ai-toolbar">
                            <Button
                              color="primary"
                              outline
                              size="sm"
                              onClick={handleGeneratePromptWithAi}
                              disabled={isGeneratingPrompt}
                            >
                              {isGeneratingPrompt ? (
                                <span className="ai-loading">
                                  <span className="ai-dot" />
                                  <span className="ai-dot" />
                                  <span className="ai-dot" />
                                </span>
                              ) : (
                                "Générer avec l'IA"
                              )}
                            </Button>
                          </div>
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
        <ModalHeader toggle={() => setModal(false)}>Nouveau prompt</ModalHeader>
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
                  placeholder="Nom du prompt"
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
                  <option value="role">Rôle</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label>Description</Label>
            <Input
              type="textarea"
              placeholder="Description du prompt"
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
            <div className="prompt-ai-toolbar">
              <Button
                color="primary"
                outline
                size="sm"
                onClick={handleGeneratePromptWithAi}
                disabled={isGeneratingPrompt}
              >
                {isGeneratingPrompt ? (
                  <span className="ai-loading">
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                  </span>
                ) : (
                  "Générer avec l'IA"
                )}
              </Button>
            </div>
            <Input
              type="textarea"
              placeholder="Contenu du prompt"
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
            Créer
          </Button>
        </ModalFooter>
      </Modal>

      <Card className="prompt-chat-card mt-2">
        <CardHeader>
          <CardTitle className="mb-0">Testeur de prompts</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="prompt-chat-grid">
            <div className="prompt-chat-left">
              <h6 className="prompt-chat-title">Assembler des prompts</h6>
              <div className="prompt-chat-list">
                {Object.entries(groupedPromptsForAssembler).map(
                  ([type, items]) => {
                    const normalized = type.toLowerCase();
                    const isRoleCategory =
                      normalized === "role" || normalized === "rôle";
                    return (
                      <div
                        key={type}
                        className={`prompt-chat-category ${
                          isRoleCategory ? "is-role" : ""
                        }`}
                      >
                        <div className="prompt-chat-category-title">
                          {type}
                          {isRoleCategory && (
                            <span className="prompt-chat-role-pill">
                              Rôle IA
                            </span>
                          )}
                        </div>
                        {items.map((prompt) => (
                          <label
                            key={prompt.id}
                            className={`prompt-chat-item ${
                              isRoleCategory ? "is-role" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPromptIds.includes(prompt.id)}
                              onChange={() => togglePromptSelection(prompt.id)}
                            />
                            <span>{prompt.name}</span>
                          </label>
                        ))}
                      </div>
                    );
                  },
                )}
              </div>

              <div className="prompt-chat-preview">
                <div className="prompt-chat-preview-title">Prompt combiné</div>
                <div className="prompt-chat-preview-body">
                  {combinedPrompt || "Sélectionnez un ou plusieurs prompts"}
                </div>
              </div>
            </div>

            <div className="prompt-chat-right">
              <div className="prompt-chat-key">
                <Input
                  type="text"
                  value={runtimeModel}
                  onChange={(e) => setRuntimeModel(e.target.value)}
                  placeholder="Modèle Gemini (ex: gemini-1.5-flash)"
                  disabled={isChatting}
                />
              </div>
              <div className="prompt-chat-messages">
                {chatMessages.length === 0 ? (
                  <div className="prompt-chat-empty">
                    Lance un test en posant une question.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`prompt-chat-bubble ${msg.role}`}>
                      {msg.content}
                    </div>
                  ))
                )}
                {isChatting && (
                  <div className="prompt-chat-bubble assistant typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="prompt-chat-input">
                <Input
                  type="textarea"
                  rows="3"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="Écris ton message..."
                  disabled={isChatting}
                />
                <Button
                  color="primary"
                  onClick={handleSendChat}
                  disabled={isChatting || !chatInput.trim()}
                >
                  {isChatting ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default PromptsPage;
