/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import api from "../../../../../services/api";
import "./SimulatorChatPanel.scss";

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SimulatorChatPanel({ clientId, getContext, pinnedNote, onPin, onUnpin, onAttach }) {
  const [open, setOpen]               = useState(false);
  const [sessions, setSessions]       = useState([]);
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadSessions = useCallback(() => {
    if (!clientId) return;
    api.get(`/v1/simulator-chat/sessions?customer_id=${clientId}`)
      .then((res) => setSessions(res.data))
      .catch(() => toast.error("Impossible de charger les sessions."));
  }, [clientId]);

  useEffect(() => { if (open) loadSessions(); }, [open, loadSessions]);
  useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const createSession = () => {
    api.post("/v1/simulator-chat/sessions", { customer_id: clientId })
      .then((res) => { setSessions((prev) => [res.data, ...prev]); setSessionId(res.data.id); setMessages([]); })
      .catch(() => toast.error("Erreur lors de la création de la session."));
  };

  const openSession = (id) => {
    setSessionId(id);
    api.get(`/v1/simulator-chat/sessions/${id}`)
      .then((res) => setMessages(res.data.messages))
      .catch(() => toast.error("Impossible de charger la session."));
  };

  const confirmDelete = () => {
    api.delete(`/v1/simulator-chat/sessions/${deleteConfirmId}`)
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== deleteConfirmId));
        if (sessionId === deleteConfirmId) { setSessionId(null); setMessages([]); }
        toast.success("Session supprimée.");
      })
      .catch(() => toast.error("Erreur lors de la suppression."))
      .finally(() => setDeleteConfirmId(null));
  };

  const sendMessage = () => {
    if (!sessionId || !input.trim() || sending) return;
    const text = input.trim();
    const context = typeof getContext === "function" ? getContext() : null;
    setSending(true);
    api.post(`/v1/simulator-chat/sessions/${sessionId}/message`, { content: text, context })
      .then((r) => { setMessages((prev) => [...prev, r.data.user_message, r.data.assistant_message]); setInput(""); })
      .catch(() => toast.error("Erreur lors de l'envoi du message."))
      .finally(() => setSending(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

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

      <div className="simulator-chat-panel">
        <button className="simulator-chat-panel__bar" onClick={() => setOpen((v) => !v)}>
          <span>💬 Assistant retraite</span>
          <span className="simulator-chat-panel__bar-hint">
            {open ? "▲ replier" : "▼ Poser une question sur le dossier retraite du client"}
          </span>
        </button>

        {open && (
          <div className="simulator-chat-panel__body">
            <div className="simulator-chat-panel__sessions">
              <button className="simulator-chat-panel__new" onClick={createSession}>+ Nouvelle session</button>
              <div className="simulator-chat-panel__sessions-list">
                {sessions.length === 0 && <div className="simulator-chat-panel__sessions-empty">Aucune session</div>}
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`simulator-chat-panel__session-item${sessionId === s.id ? " active" : ""}`}
                    onClick={() => openSession(s.id)}
                  >
                    <div className="simulator-chat-panel__session-title">{s.title}</div>
                    <div className="simulator-chat-panel__session-date">{formatDate(s.updated_at)}</div>
                    <button
                      className="simulator-chat-panel__session-delete"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(s.id); }}
                      title="Supprimer"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="simulator-chat-panel__thread">
              {!sessionId ? (
                <div className="simulator-chat-panel__empty">Sélectionnez ou créez une session pour discuter.</div>
              ) : (
                <>
                  <div className="simulator-chat-panel__messages">
                    {messages.length === 0 && (
                      <div className="simulator-chat-panel__messages-hint">Posez une question sur la retraite de ce client (trimestres, points, scénarios, dates de départ…).</div>
                    )}
                    {messages.map((msg) => {
                      const isAssistant = msg.role === "assistant";
                      const isPinned = isAssistant && pinnedNote && pinnedNote === msg.content;
                      return (
                        <div key={msg.id} className={`simulator-chat-panel__bubble simulator-chat-panel__bubble--${msg.role}`}>
                          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                          {isAssistant && (
                            <div className="simulator-chat-panel__bubble-actions">
                              {isPinned ? (
                                <button className="pinned" onClick={onUnpin} title="Retirer du rapport">📌 Épinglé — retirer</button>
                              ) : (
                                <button className="pin" onClick={() => onPin(msg.content)} title="Transmettre au rapport">📌 Épingler au rapport</button>
                              )}
                            </div>
                          )}
                          <div className="simulator-chat-panel__bubble-meta">{formatDate(msg.created_at)}</div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="simulator-chat-panel__input">
                    {typeof onAttach === "function" && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.html,.htm"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const files = e.target.files ? Array.from(e.target.files) : [];
                            if (files.length) onAttach(files);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          className="simulator-chat-panel__attach"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          title="Joindre un document (RIS, bulletin…)"
                          disabled={sending}
                        >
                          +
                        </button>
                      </>
                    )}
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ex : Combien de trimestres a ce client ?"
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
      </div>
    </>
  );
}
