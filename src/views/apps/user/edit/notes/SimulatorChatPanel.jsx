/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import axios from "axios";
import {
  Modal, ModalHeader, ModalBody, ModalFooter, Button,
  UncontrolledButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem,
  FormGroup, Label, Input,
} from "reactstrap";
import api from "../../../../../services/api";
import { waiterHide, waiterShow } from "../../../../../helpers/waiter";
import "./SimulatorChatPanel.scss";

/** reactstrap 8 has no container="body" — portal DropdownMenu to document.body
 *  so + docs list escapes overflow on panel/body/thread/input/sessions. */
function PortalDropdownMenu({ children }) {
  if (typeof document === "undefined") return children;
  return ReactDOM.createPortal(children, document.body);
}

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
  "Mode lecture-consigne. Avant toute rédaction (Consultation / Calcul / Audit) : " +
  "1) lire le context (profil, résumé carrière, champs_manquants), " +
  "2) lister manques dossier, questions consultant, actions caisses, " +
  "3) rédiger le livrable seulement ensuite — stop audit aveugle. " +
  "En doute : question consultant (réponse → KB, pas d'apprentissage silencieux). " +
  "Si l'information est insuffisante, ne progresse pas. " +
  "INTERDIT: script-execute, production-validated-calculate, calculators, executeScript, admin-chat apply. " +
  "Pastilles = mode chat only. Ne pas auto-lancer Analyse carrière / OCR (action utilisateur via Documents ou +).";

/** Same folder list / labels as Documents.js ⋮ menu (prod parity). */
const DOC_FOLDERS = [
  { id: 1, name: "Contrat / Procuration" },
  { id: 2, name: "Documents familiaux" },
  { id: 3, name: "Documents carrières" },
  { id: 4, name: "Échanges avec les organismes" },
  { id: 5, name: "Notifications retraite" },
  { id: 6, name: "Autre" },
];

function authConfig(extra = {}) {
  return {
    headers: { Authorization: "Bearer " + localStorage.getItem("token"), ...(extra.headers || {}) },
    ...extra,
  };
}

function PaperPlaneIcon() {
  return (
    <svg
      className="simulator-chat-panel__send-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
      />
    </svg>
  );
}

function pickActiveDoc(files, profileDocs) {
  const list = Array.isArray(files) ? files : [];
  if (!list.length) return null;
  const profileIds = new Set((profileDocs || []).map((d) => d && d.id).filter(Boolean));
  const fromProfile = list.find((f) => profileIds.has(f.id));
  if (fromProfile) return fromProfile;
  const career = list.find((f) => Number(f.dossier) === 3);
  if (career) return career;
  return list[0];
}

export default function SimulatorChatPanel({
  clientId,
  getContext,
  pinnedNote,
  onPin,
  onUnpin,
  onAttach: _onAttach,
  onSelectProfileDoc: _onSelectProfileDoc,
  profileDocs = [],
}) {
  const [open, setOpen]               = useState(true);
  const [sessions, setSessions]       = useState([]);
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [creating, setCreating]       = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [pastille, setPastille] = useState(null);
  const [clientFiles, setClientFiles] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [renameModal, setRenameModal] = useState(false);
  const [fileToRenameId, setFileToRenameId] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [deleteFileModal, setDeleteFileModal] = useState(false);
  const [fileToDeleteId, setFileToDeleteId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const loadClientFiles = useCallback(() => {
    if (!clientId) {
      setClientFiles([]);
      return;
    }
    axios
      .get(global.config.server_url + "/files?user_id=" + clientId, authConfig())
      .then((response) => {
        const files = Array.isArray(response.data) ? response.data : [];
        setClientFiles(files);
      })
      .catch(() => setClientFiles([]));
  }, [clientId]);

  useEffect(() => { loadClientFiles(); }, [loadClientFiles]);

  useEffect(() => {
    if (!clientFiles.length) {
      setActiveDocId(null);
      return;
    }
    setActiveDocId((prev) => {
      if (prev && clientFiles.some((f) => f.id === prev)) return prev;
      const picked = pickActiveDoc(clientFiles, profileDocs);
      return picked ? picked.id : null;
    });
  }, [clientFiles, profileDocs]);

  const activeDoc = clientFiles.find((f) => f.id === activeDocId) || null;

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
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 120)}px`;
  }, [input, open, sessionId]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const createSessionRequest = useCallback(() => {
    if (!clientId) {
      return Promise.reject(new Error("Client manquant."));
    }
    return api.post("/v1/simulator-chat/sessions", { customer_id: clientId })
      .then((res) => {
        const created = res.data && (res.data.id ? res.data : res.data.data);
        if (!created || !created.id) {
          throw new Error("Session créée sans identifiant.");
        }
        const row = {
          ...created,
          title: created.title || "Nouvelle session",
          updated_at: created.updated_at || created.created_at || new Date().toISOString(),
        };
        setSessions((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
        setSessionId(row.id);
        sessionIdRef.current = row.id;
        return row.id;
      });
  }, [clientId]);

  const createSession = () => {
    if (!clientId || creating || sending) return;
    setCreating(true);
    createSessionRequest()
      .then(() => {
        setMessages([]);
        setInput("");
        setTimeout(() => textareaRef.current && textareaRef.current.focus(), 0);
      })
      .catch((err) => toast.error((err && err.message) || "Erreur lors de la création de la session."))
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
    if (!input.trim() || sending || !clientId) return;
    const text = input.trim();
    const baseContext = typeof getContext === "function" ? getContext() : null;
    const context = {
      ...(baseContext && typeof baseContext === "object" ? baseContext : { raw: baseContext }),
      assistant_mode: pastille || null,
      guidance: ASSISTANT_GUIDANCE,
    };
    setSending(true);

    const postToSession = (sid) =>
      api.post(`/v1/simulator-chat/sessions/${sid}/message`, { content: text, context })
        .then((r) => {
          const data = r.data || {};
          setMessages((prev) => [...prev, data.user_message, data.assistant_message].filter(Boolean));
          setInput("");
          setSessions((prev) => prev.map((s) => {
            if (s.id !== sid) return s;
            const generic = !s.title || /^nouvelle session$/i.test(String(s.title).trim()) || /^session$/i.test(String(s.title).trim());
            return {
              ...s,
              title: generic ? text.slice(0, 80) : s.title,
              preview: text.slice(0, 120),
              updated_at: new Date().toISOString(),
            };
          }));
        });

    const ensureThenSend = sessionIdRef.current
      ? Promise.resolve(sessionIdRef.current)
      : createSessionRequest().then((sid) => {
          setMessages([]);
          return sid;
        });

    ensureThenSend
      .then((sid) => postToSession(sid))
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

  // ── Documents ⋮ parity handlers (same endpoints / events as Documents.js) ──
  const moveFile = (fileId, newFolder) => {
    axios
      .put(global.config.server_url + "/files/" + fileId, { dossier: newFolder }, authConfig())
      .then(() => {
        loadClientFiles();
        toast.success("Document déplacé.");
      })
      .catch(() => toast.error("Impossible de déplacer le document."));
  };

  const downloadFile = (fileId, fileUrl) => {
    waiterShow();
    axios
      .get(global.config.server_url + "/downloadFile?file_id=" + fileId, authConfig({ responseType: "blob" }))
      .then((response) => {
        waiterHide();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        const parts = String(fileUrl || "").split("/");
        link.setAttribute("download", parts[parts.length - 1] || "document");
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => {
        waiterHide();
        toast.error("Téléchargement impossible.");
      });
  };

  const sendToCareerAnalysis = async (fileId, fileName, fileUrl) => {
    try {
      toast.info("Préparation du fichier pour l'analyse...");
      const response = await axios.get(
        global.config.server_url + "/downloadFile?file_id=" + fileId,
        authConfig({ responseType: "blob" })
      );
      const blob = response.data;
      const file = new File([blob], fileName, { type: blob.type || "application/pdf" });
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          name: file.name,
          type: file.type,
          dataUrl: reader.result,
        };
        sessionStorage.setItem(
          `notes_file_to_send_${clientId}`,
          JSON.stringify(fileData)
        );
        window.dispatchEvent(
          new CustomEvent("careerAnalysisFileReady", {
            detail: { clientId, fileId, fileData },
          })
        );
        toast.success(`"${fileName}" envoyé au simulateur — analyse en cours…`);
      };
      reader.onerror = () => toast.error("Erreur lors de la préparation du fichier.");
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erreur sendToCareerAnalysis:", err);
      toast.error("Impossible de préparer le fichier pour l'analyse.");
    }
  };

  const openRenameModal = (fileId, currentName) => {
    setFileToRenameId(fileId);
    setNewFileName(currentName || "");
    setRenameModal(true);
  };

  const handleRenameSubmit = () => {
    if (!newFileName || !String(newFileName).trim()) return;
    axios
      .put(
        global.config.server_url + "/files/" + fileToRenameId,
        { filename: newFileName },
        authConfig()
      )
      .then(() => {
        loadClientFiles();
        setRenameModal(false);
        toast.success("Document renommé.");
      })
      .catch(() => toast.error("Impossible de renommer le fichier."));
  };

  const openDeleteFileModal = (fileId) => {
    setFileToDeleteId(fileId);
    setDeleteFileModal(true);
  };

  const handleDeleteFileSubmit = () => {
    if (!fileToDeleteId) return;
    axios
      .delete(global.config.server_url + "/files/" + fileToDeleteId, authConfig())
      .then(() => {
        loadClientFiles();
        setDeleteFileModal(false);
        setFileToDeleteId(null);
        toast.success("Document supprimé.");
      })
      .catch(() => toast.error("Impossible de supprimer le fichier."));
  };

  const renderDocsMenu = () => {
    const file = activeDoc;
    return (
      <UncontrolledButtonDropdown direction="up" className="simulator-chat-panel__plus-dd">
        <DropdownToggle
          color="light"
          caret={false}
          className="simulator-chat-panel__attach"
          title={file ? `Actions document — ${file.filename}` : "Actions document"}
          disabled={sending}
          aria-label="Menu document (comme Documents ⋮)"
        >
          +
        </DropdownToggle>
        <PortalDropdownMenu>
        <DropdownMenu
          className="simulator-chat-panel__plus-menu"
          modifiers={{
            preventOverflow: { enabled: true, boundariesElement: "viewport", padding: 8 },
            hide: { enabled: false },
            // body portal: fixed to viewport so no ancestor overflow/transform clips
            setFixed: {
              enabled: true,
              order: 850,
              fn: (data) => {
                data.styles = Object.assign({}, data.styles, { position: "fixed" });
                return data;
              },
            },
          }}
        >
          {!file ? (
            <DropdownItem disabled className="simulator-chat-panel__plus-item">
              Aucun document
            </DropdownItem>
          ) : (
            <>
              <DropdownItem
                tag="a"
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="simulator-chat-panel__plus-item"
              >
                Ouvrir
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem
                className="simulator-chat-panel__plus-item"
                onClick={() => sendToCareerAnalysis(file.id, file.filename, file.url)}
              >
                Analyse carrière
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem header className="simulator-chat-panel__plus-header" style={{ color: "black" }}>
                Déplacer vers
              </DropdownItem>
              {DOC_FOLDERS.map((folder) => (
                <DropdownItem
                  key={folder.id}
                  className="simulator-chat-panel__plus-item"
                  onClick={() => moveFile(file.id, folder.id)}
                >
                  {folder.name}
                </DropdownItem>
              ))}
              <DropdownItem divider />
              <DropdownItem
                className="simulator-chat-panel__plus-item"
                onClick={() => downloadFile(file.id, file.url)}
              >
                Télécharger
              </DropdownItem>
              <DropdownItem
                className="simulator-chat-panel__plus-item"
                onClick={() => openRenameModal(file.id, file.filename)}
              >
                Renommer
              </DropdownItem>
              <DropdownItem
                className="simulator-chat-panel__plus-item text-danger"
                onClick={() => openDeleteFileModal(file.id)}
              >
                Supprimer
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
        </PortalDropdownMenu>
      </UncontrolledButtonDropdown>
    );
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

      <Modal isOpen={renameModal} toggle={() => setRenameModal(false)} centered>
        <ModalHeader toggle={() => setRenameModal(false)}>Renommer le fichier</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="assistant-rename-filename">Nouveau nom</Label>
            <Input
              id="assistant-rename-filename"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleRenameSubmit}>Enregistrer</Button>
          <Button color="secondary" onClick={() => setRenameModal(false)}>Annuler</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={deleteFileModal} toggle={() => setDeleteFileModal(false)} centered>
        <ModalHeader toggle={() => setDeleteFileModal(false)}>Supprimer le fichier</ModalHeader>
        <ModalBody>Ce document sera supprimé définitivement.</ModalBody>
        <ModalFooter>
          <Button color="danger" onClick={handleDeleteFileSubmit}>Supprimer</Button>
          <Button color="secondary" onClick={() => setDeleteFileModal(false)}>Annuler</Button>
        </ModalFooter>
      </Modal>

      <div className={`simulator-chat-panel${messages.length === 0 ? " simulator-chat-panel--composer-fill" : ""}`}>
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
                disabled={creating || sending || !clientId}
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
              <div className={`simulator-chat-panel__messages${messages.length === 0 ? " simulator-chat-panel__messages--empty" : ""}`}>
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
                {renderDocsMenu()}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    pastille
                      ? PASTILLE_PLACEHOLDERS[pastille]
                      : sessionId
                        ? "Collez la note client ou posez une question…"
                        : "Collez une note ou posez une question — session créée à l'envoi…"
                  }
                  disabled={sending || !clientId}
                  rows={2}
                />
                <button
                  type="button"
                  className="simulator-chat-panel__send"
                  onClick={sendMessage}
                  disabled={sending || !input.trim() || !clientId}
                  title="Envoyer"
                  aria-label="Envoyer"
                >
                  {sending ? "…" : <PaperPlaneIcon />}
                </button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
}
