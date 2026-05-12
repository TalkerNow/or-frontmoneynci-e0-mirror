import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import api from "../../../../../services/api";
import "./AdminEngineChat.scss";

const TAB_CHAT   = "chat";
const TAB_MEMORY = "memory";

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminEngineChat() {
  const [tab, setTab]                         = useState(TAB_CHAT);
  const [sessions, setSessions]               = useState([]);
  const [sessionId, setSessionId]             = useState(null);
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState("");
  const [sending, setSending]                 = useState(false);
  const [memory, setMemory]                   = useState("");
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState(null);
  const [savingMemory, setSavingMemory]       = useState(false);
  const [applying, setApplying]               = useState(null);
  const [reverting, setReverting]             = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  // ── Sessions ──────────────────────────────────────────────────────────────

  const loadSessions = useCallback(() => {
    api.get("/v1/admin-chat/sessions")
      .then((res) => setSessions(res.data))
      .catch(() => toast.error("Impossible de charger les sessions."));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const createSession = () => {
    api.post("/v1/admin-chat/sessions", { context_page: "admin_moteur" })
      .then((res) => {
        setSessions((prev) => [res.data, ...prev]);
        setSessionId(res.data.id);
        setMessages([]);
      })
      .catch(() => toast.error("Erreur lors de la création de la session."));
  };

  const openSession = (id) => {
    setSessionId(id);
    api.get(`/v1/admin-chat/sessions/${id}`)
      .then((res) => setMessages(res.data.messages))
      .catch(() => toast.error("Impossible de charger la session."));
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    api.delete(`/v1/admin-chat/sessions/${deleteConfirmId}`)
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== deleteConfirmId));
        if (sessionId === deleteConfirmId) { setSessionId(null); setMessages([]); }
        toast.success("Session supprimée.");
      })
      .catch(() => toast.error("Erreur lors de la suppression."))
      .finally(() => setDeleteConfirmId(null));
  };

  // ── Messages ──────────────────────────────────────────────────────────────

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = () => {
    if (!sessionId || !input.trim() || sending) return;
    setSending(true);
    api.post(`/v1/admin-chat/sessions/${sessionId}/message`, { content: input.trim() })
      .then((res) => {
        setMessages((prev) => [...prev, res.data.user_message, res.data.assistant_message]);
        setInput("");
      })
      .catch(() => toast.error("Erreur lors de l'envoi du message."))
      .finally(() => setSending(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Apply / Revert ────────────────────────────────────────────────────────

  const applyModification = (msg, entityType, entityId, newContent) => {
    if (!sessionId) return;
    setApplying(msg.id);
    api.post(`/v1/admin-chat/sessions/${sessionId}/apply`, {
      message_id: msg.id, entity_type: entityType, entity_id: entityId, new_content: newContent,
    })
      .then((res) => {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, applied_modification_id: res.data.id } : m));
        toast.success("Modification appliquée.");
      })
      .catch((err) => toast.error(err.response?.data?.error || "Erreur lors de l'application."))
      .finally(() => setApplying(null));
  };

  const revertModification = (snapshotId) => {
    setReverting(snapshotId);
    api.post(`/v1/admin-chat/snapshots/${snapshotId}/revert`)
      .then(() => toast.success("Modification annulée."))
      .catch(() => toast.error("Erreur lors du retour arrière."))
      .finally(() => setReverting(null));
  };

  // ── Memory ────────────────────────────────────────────────────────────────

  const loadMemory = useCallback(() => {
    api.get("/v1/admin-chat/memory")
      .then((res) => { setMemory(res.data.content || ""); setMemoryUpdatedAt(res.data.updated_at); })
      .catch(() => {});
  }, []);

  useEffect(() => { if (tab === TAB_MEMORY) loadMemory(); }, [tab, loadMemory]);

  const saveMemory = () => {
    setSavingMemory(true);
    api.put("/v1/admin-chat/memory", { content: memory })
      .then((res) => { setMemoryUpdatedAt(res.data.updated_at); toast.success("Mémoire sauvegardée."); })
      .catch(() => toast.error("Erreur lors de la sauvegarde."))
      .finally(() => setSavingMemory(false));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <Modal isOpen={!!deleteConfirmId} toggle={() => setDeleteConfirmId(null)} centered>
      <ModalHeader toggle={() => setDeleteConfirmId(null)}>Supprimer la session</ModalHeader>
      <ModalBody>Cette session et tous ses messages seront supprimés définitivement.</ModalBody>
      <ModalFooter>
        <Button color="danger" onClick={confirmDelete}>Supprimer</Button>
        <Button color="primary" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
      </ModalFooter>
    </Modal>
    <div className="admin-chat-panel">
      <div className="admin-chat-panel__header">
        <span>🤖 Assistant Moteur IA</span>
        <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>Admin uniquement</span>
      </div>

      <div className="admin-chat-panel__tabs">
        <button className={tab === TAB_CHAT ? "active" : ""} onClick={() => setTab(TAB_CHAT)}>
          💬 Chat
        </button>
        <button className={tab === TAB_MEMORY ? "active" : ""} onClick={() => setTab(TAB_MEMORY)}>
          🧠 Mémoire
        </button>
      </div>

      {/* ── CHAT TAB ── */}
      {tab === TAB_CHAT && (
        <div className="admin-chat-panel__chat-layout">

          {/* Sessions sidebar */}
          <div className="admin-chat-panel__sessions-sidebar">
            <div className="admin-chat-panel__sessions-sidebar-header">
              <button onClick={createSession}>+ Nouvelle session</button>
            </div>
            <div className="admin-chat-panel__sessions-sidebar-list">
              {sessions.length === 0 && (
                <div className="admin-chat-panel__sessions-sidebar-empty">
                  Aucune session
                </div>
              )}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`admin-chat-panel__sessions-sidebar-item${sessionId === s.id ? " active" : ""}`}
                  onClick={() => openSession(s.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="admin-chat-panel__sessions-sidebar-item-title">{s.title}</div>
                    <div className="admin-chat-panel__sessions-sidebar-item-date">{formatDate(s.updated_at)}</div>
                  </div>
                  <button className="delete-btn" onClick={(e) => deleteSession(e, s.id)} title="Supprimer">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Thread area */}
          <div className="admin-chat-panel__thread">
            {!sessionId ? (
              <div className="admin-chat-panel__empty-thread">
                Sélectionnez ou créez une session
              </div>
            ) : (
              <>
                <div className="admin-chat-panel__messages">
                  {messages.length === 0 && (
                    <div style={{ textAlign: "center", color: "#bbb", fontSize: 12, marginTop: 24 }}>
                      Envoyez un message pour commencer.
                    </div>
                  )}
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      applying={applying}
                      reverting={reverting}
                      onApply={applyModification}
                      onRevert={revertModification}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="admin-chat-panel__input-area">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Votre message…"
                    disabled={sending}
                  />
                  <button onClick={sendMessage} disabled={sending || !input.trim()}>
                    {sending ? "…" : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MEMORY TAB ── */}
      {tab === TAB_MEMORY && (
        <div className="admin-chat-panel__memory">
          {memoryUpdatedAt && (
            <div className="admin-chat-panel__memory-meta">
              Dernière sauvegarde : {formatDate(memoryUpdatedAt)}
            </div>
          )}
          <textarea
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="Notez ici ce que l'assistant doit retenir sur vous et vos préférences…"
          />
          <div className="admin-chat-panel__memory-actions">
            <button onClick={saveMemory} disabled={savingMemory}>
              {savingMemory ? "Sauvegarde…" : "💾 Sauvegarder"}
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, applying, reverting, onApply, onRevert }) {
  const isAssistant = msg.role === "assistant";

  let proposed = null;
  if (isAssistant) {
    const match = msg.content.match(/```json\s*(\{[\s\S]*?"proposed_modification"[\s\S]*?\})\s*```/);
    if (match) {
      try { proposed = JSON.parse(match[1]).proposed_modification || null; } catch (_) {}
    }
  }

  const displayContent = proposed
    ? msg.content.replace(/```json[\s\S]*?```/, "").trim()
    : msg.content;

  return (
    <div className={`admin-chat-panel__bubble admin-chat-panel__bubble--${msg.role}`}>
      <div style={{ whiteSpace: "pre-wrap" }}>{displayContent}</div>

      {proposed && !msg.applied_modification_id && (
        <div className="admin-chat-panel__bubble__diff">
          <div className="admin-chat-panel__bubble__diff-label">Avant</div>
          <pre className="admin-chat-panel__bubble__diff-before">{proposed.content_before}</pre>
          <div className="admin-chat-panel__bubble__diff-label">Après</div>
          <pre className="admin-chat-panel__bubble__diff-after">{proposed.content_after}</pre>
          <div className="admin-chat-panel__bubble__actions">
            <button
              className="apply"
              disabled={applying === msg.id}
              onClick={() => onApply(msg, proposed.entity_type, proposed.entity_id, proposed.content_after)}
            >
              {applying === msg.id ? "…" : "✓ Appliquer"}
            </button>
            <button className="reject" onClick={() => {}}>✕ Ignorer</button>
          </div>
        </div>
      )}

      {msg.applied_modification_id && isAssistant && (
        <div className="admin-chat-panel__bubble__actions">
          <button
            className="revert"
            disabled={reverting === msg.applied_modification_id}
            onClick={() => onRevert(msg.applied_modification_id)}
          >
            {reverting === msg.applied_modification_id ? "…" : "↩ Annuler"}
          </button>
        </div>
      )}

      <div className="admin-chat-panel__bubble__meta">{formatDate(msg.created_at)}</div>
    </div>
  );
}
