/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import api from "../../../../../services/api";
import "./SimulatorChatPanel.scss";

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function sessionSnippet(s) {
  const raw = (s && (s.title || s.preview || s.first_message || s.summary)) || "";
  const trimmed = String(raw).trim().replace(/\s+/g, " ");
  if (!trimmed) return "Nouvelle session";
  if (/^nouvelle session$/i.test(trimmed) || /^session$/i.test(trimmed)) return "Nouvelle session";
  return trimmed.length > 52 ? `${trimmed.slice(0, 52)}…` : trimmed;
}

const PASTILLES = [
  { id: "consultation", label: "Consultation retraite" },
  { id: "calcul", label: "Calcul / simulation" },
  { id: "audit", label: "Audit retraite" },
];

const PASTILLE_PLACEHOLDERS = {
  consultation: "Collez la note client / déroulé (droits, trimestres, points d'attention)…",
  calcul: "Collez la note client / demandes de simulation (âge, départ, décote / surcote)…",
  audit: "Collez la note client / arbitrages, écarts caisse, commentaires audit…",
};

const ASSISTANT_GUIDANCE =
  "Avant toute rédaction de document (Consultation / Calcul / Audit) : " +
  "1) lister les manques dossier, 2) questions au consultant, 3) actions caisses / demandes client-consultant. " +
  "Rédiger le livrable seulement ensuite — stop audit aveugle, ne pas sauter au document fini. " +
  "En cas de doute : poser une question au consultant (la réponse pourra alimenter une KB — pas d'apprentissage silencieux). " +
  "Si l'information est insuffisante, ne progresse pas.";

export default function SimulatorChatPanel({
  clientId,
  getContext,
  pinnedNote,
  onPin,
  onUnpin,
  onAttach,
  onSelectProfileDoc,
  profileDocs = [],
}) {
  const [open, setOpen]               = useState(false);
  const [sessions, setSessions]       = useState([]);
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [creating, setCreating]       = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [pastille, setPastille] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const loadSessions = useCallback(() => {
    if (!clientId) return;
    api.get(`/v1/simulator-chat/sessions?customer_id=${clientId}`)
      .then((res) => setSessions(Array.isArray(res.data) ? res.data : (res.data && res.data.data) || []))
      .catch(() => toast.error("Impossible de charger les sessions."));
  }, [clientId]);

  useEffect(() => { if (open) loadSessions(); }, [open, loadSessions]);
  useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 160)}px`;
  }, [input, sessionId]);

  const createSession = () => {
    if (!clientId || creating) return;
    setCreating(true);
    api.post("/v1/simulator-chat/sessions", { customer_id: clientId })
      .then((res) => {
        const created = res.data && (res.data.id ? res.data : res.data.data);
        if (!created || !created.id) {
          toast.error("Session créée sans identifiant.");
          return;
        }
        const row = {
          ...created,
          title: created.title || "Nouvelle session",
          updated_at: created.updated_at || created.created_at || new Date().toISOString(),
        };
        setSessions((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
        setSessionId(row.id);
        setMessages([]);
        setInput("");
        setTimeout(() => textareaRef.current && textareaRef.current.focus(), 0);
      })
      .catch(() => toast.error("Erreur lors de la création de la session."))
      .finally(() => setCreating(false));
  };

  const openSession = (id) => {
    setSessionId(id);
    api.get(`/v1/simulator-chat/sessions/${id}`)
      .then((res) => {
        const payload = res.data && (Array.isArray(res.data.messages) ? res.data : res.data.data);
        setMessages((payload && payload.messages) || []);
      })
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
    const baseContext = typeof getContext === "function" ? getContext() : null;
    const context = {
      ...(baseContext && typeof baseContext === "object" ? baseContext : { raw: baseContext }),
      assistant_mode: pastille || null,
      guidance: ASSISTANT_GUIDANCE,
    };
    setSending(true);
    api.post(`/v1/simulator-chat/sessions/${sessionId}/message`, { content: text, context })
      .then((r) => {
        const data = r.data || {};
        setMessages((prev) => [...prev, data.user_message, data.assistant_message].filter(Boolean));
        setInput("");
        setSessions((prev) => prev.map((s) => {
          if (s.id !== sessionId) return s;
          const generic = !s.title || /^nouvelle session$/i.test(String(s.title).trim()) || /^session$/i.test(String(s.title).trim());
          return {
            ...s,
            title: generic ? text.slice(0, 80) : s.title,
            preview: text.slice(0, 120),
            updated_at: new Date().toISOString(),
          };
        }));
      })
      .catch(() => toast.error("Erreur lors de l'envoi du message."))
      .finally(() => setSending(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handlePastilleClick = (p) => {
    // Mode chat ONLY — ne déclenche jamais Flux Livrables / generate.
    setPastille((prev) => (prev === p.id ? null : p.id));
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
          <>
          <div className="simulator-chat-panel__pastilles" role="group" aria-label="Type de prestation">
            {PASTILLES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`simulator-chat-panel__pastille${pastille === p.id ? " active" : ""}`}
                onClick={() => handlePastilleClick(p)}
                aria-pressed={pastille === p.id}
                title={`${p.label} — mode Assistant uniquement`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="simulator-chat-panel__body">
            <div className="simulator-chat-panel__sessions">
              <button
                type="button"
                className="simulator-chat-panel__new"
                onClick={createSession}
                disabled={creating || !clientId}
              >
                {creating ? "Création…" : "+ Nouvelle session"}
              </button>
              <div className="simulator-chat-panel__sessions-list">
                {sessions.length === 0 && <div className="simulator-chat-panel__sessions-empty">Aucune session</div>}
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`simulator-chat-panel__session-item${sessionId === s.id ? " active" : ""}`}
                    onClick={() => openSession(s.id)}
                  >
                    <div className="simulator-chat-panel__session-date">{formatDate(s.updated_at || s.created_at)}</div>
                    <div className="simulator-chat-panel__session-title" title={sessionSnippet(s)}>
                      {sessionSnippet(s)}
                    </div>
                    <button
                      type="button"
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
                      <div className="simulator-chat-panel__messages-hint">
                        Collez la note client ou posez une question sur la retraite de ce client (trimestres, points, scénarios, dates de départ…).
                      </div>
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
                                <button type="button" className="pinned" onClick={onUnpin} title="Retirer du rapport">📌 Épinglé — retirer</button>
                              ) : (
                                <button type="button" className="pin" onClick={() => onPin(msg.content)} title="Transmettre au rapport">📌 Épingler au rapport</button>
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
                    {(typeof onAttach === "function" || typeof onSelectProfileDoc === "function") && (
                      <>
                        {typeof onAttach === "function" && (
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
                        )}
                        <UncontrolledDropdown direction="up" className="simulator-chat-panel__plus-dd">
                          <DropdownToggle
                            tag="button"
                            type="button"
                            className="simulator-chat-panel__attach"
                            title="Joindre un fichier / docs profil"
                            disabled={sending}
                            caret={false}
                          >
                            +
                          </DropdownToggle>
                          <DropdownMenu className="simulator-chat-panel__plus-menu">
                            {typeof onAttach === "function" && (
                              <DropdownItem
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                              >
                                Joindre un fichier
                              </DropdownItem>
                            )}
                            {typeof onSelectProfileDoc === "function" && (
                              <>
                                {typeof onAttach === "function" && <DropdownItem divider />}
                                <DropdownItem header>Docs profil</DropdownItem>
                                {(!profileDocs || profileDocs.length === 0) ? (
                                  <DropdownItem disabled>Aucun document</DropdownItem>
                                ) : (
                                  profileDocs.map((doc) => (
                                    <DropdownItem
                                      key={doc.id || doc.filename}
                                      onClick={() => onSelectProfileDoc(doc)}
                                      title={doc.filename}
                                    >
                                      {doc.filename || `Document #${doc.id}`}
                                    </DropdownItem>
                                  ))
                                )}
                              </>
                            )}
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={pastille ? PASTILLE_PLACEHOLDERS[pastille] : "Collez la note client ou posez une question…"}
                      disabled={sending}
                      rows={2}
                    />
                    <button
                      type="button"
                      className="simulator-chat-panel__send"
                      onClick={sendMessage}
                      disabled={sending || !input.trim()}
                      title="Envoyer"
                      aria-label="Envoyer"
                    >
                      {sending ? "…" : "→"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
}
