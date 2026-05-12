import React, { useEffect, useRef, useState, useCallback } from "react";
import { Send, Eye, X, Plus } from "react-feather";
import { toast } from "react-toastify";
import {
  fetchLatestReport,
  fetchReportChat,
  sendReportChatMessage,
  applyReportChatMessage,
  fetchReportChatContext,
  fetchSkillsList,
} from "../risService";

/**
 * Panneau de chat IA pour éditer un livrable.
 *
 * Props:
 *   - clientId: number               — id du client (user_id du AnalysisReport)
 *   - skillCode: string              — ex: "simulation_retraite"
 *   - onProposedHtml: (html, msgId) => void
 *       appelé quand l'IA renvoie un HTML proposé. Le parent affiche le diff.
 *   - onApplied: (newHtml) => void
 *       appelé après application d'un message → le parent recharge l'iframe principal.
 *   - applyingMessageId: number|null — id du message en cours d'application (verrou UI)
 *   - clearProposedSignal: number    — incrémenté par le parent pour effacer l'aperçu
 */
const ReportChatPanel = ({
  clientId,
  skillCode,
  onProposedHtml,
  onApplied,
  applyingMessageId,
  clearProposedSignal,
}) => {
  const [reportId, setReportId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [contextData, setContextData] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  // Skills additionnels attachés au contexte IA pour ce chat.
  // - extraSkills : codes sélectionnés, envoyés au backend à chaque message
  // - availableSkills : liste catalogue (chargée à la demande quand on ouvre le picker)
  const [extraSkillCodes, setExtraSkillCodes] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const scrollRef = useRef(null);

  const userRole = (
    (typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem("role")
      : "") || ""
  ).toLowerCase();
  const canSeeContext = userRole === "admin" || userRole === "consultant";

  const handleOpenContext = async () => {
    if (!reportId) return;
    setShowContext(true);
    // Toujours refetch : la sélection de skills additionnels modifie le contexte affiché.
    setContextLoading(true);
    try {
      const data = await fetchReportChatContext(reportId, extraSkillCodes);
      setContextData(data);
    } catch (err) {
      console.error("fetchReportChatContext error:", err);
      toast.error(
        err?.response?.data?.message || "Impossible de charger le contexte IA."
      );
      setShowContext(false);
    } finally {
      setContextLoading(false);
    }
  };

  const ensureSkillsLoaded = useCallback(async () => {
    if (availableSkills.length || skillsLoading) return;
    setSkillsLoading(true);
    try {
      const list = await fetchSkillsList();
      setAvailableSkills(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("fetchSkillsList error:", err);
      toast.error("Impossible de charger la liste des skills.");
    } finally {
      setSkillsLoading(false);
    }
  }, [availableSkills.length, skillsLoading]);

  const toggleSkillPicker = async () => {
    const next = !showSkillPicker;
    setShowSkillPicker(next);
    if (next) await ensureSkillsLoaded();
  };

  const toggleSkillCode = (code) => {
    setExtraSkillCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // 1. Résoudre l'AnalysisReport id depuis (clientId, skillCode), puis charger l'historique
  useEffect(() => {
    let cancelled = false;
    if (!clientId || !skillCode) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const report = await fetchLatestReport(clientId, skillCode);
        if (cancelled) return;
        if (!report?.id) {
          setError("Aucun livrable trouvé pour ce client. Générez-le d'abord.");
          setLoading(false);
          return;
        }
        setReportId(report.id);
        const data = await fetchReportChat(report.id);
        if (cancelled) return;
        setMessages(data.messages || []);
      } catch (err) {
        if (cancelled) return;
        console.error("ReportChatPanel load error:", err);
        setError("Impossible de charger la conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, skillCode]);

  // Scroll au bas quand un nouveau message arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !reportId || sending) return;

    setSending(true);
    setInput("");
    // Optimistic UI : afficher le message user immédiatement
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await sendReportChatMessage(reportId, content, extraSkillCodes);
      // Remplacer le message temporaire par les vrais (user + assistant)
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId);
        return [...filtered, res.user_message, res.assistant_message];
      });
      if (res.assistant_message?.proposed_html) {
        onProposedHtml(res.assistant_message.proposed_html, res.assistant_message.id);
      }
    } catch (err) {
      console.error("sendReportChatMessage error:", err);
      const msg = err?.response?.data?.message || "Erreur lors de l'appel à l'IA";
      toast.error(msg);
      // Retirer le message temporaire en cas d'échec
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleApply = async (messageId) => {
    if (!reportId) return;
    try {
      const res = await applyReportChatMessage(reportId, messageId);
      // Marquer le message comme appliqué localement
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, applied_version_id: res.version?.id } : m
        )
      );
      const newHtml =
        (res.analysis_report?.result_json &&
          (typeof res.analysis_report.result_json === "string"
            ? res.analysis_report.result_json
            : res.analysis_report.result_json.htmlContent)) || "";
      onApplied(newHtml);
      toast.success("Modification appliquée — nouvelle version créée.");
    } catch (err) {
      console.error("applyReportChatMessage error:", err);
      toast.error(err?.response?.data?.message || "Erreur lors de l'application");
    }
  };

  // Quand le parent demande à effacer l'aperçu (rejet du diff)
  // le panel n'a rien à faire en interne, mais on garde le hook pour cohérence future.
  // eslint-disable-next-line no-unused-vars
  const _clearAck = clearProposedSignal;

  return (
    <div
      className="d-flex flex-column h-100"
      style={{ backgroundColor: "#fff" }}
    >
      <div
        className="px-3 py-2 d-flex justify-content-between align-items-center"
        style={{ borderBottom: "1px solid #dee2e6", backgroundColor: "#f8f9fa", gap: "8px" }}
      >
        <div style={{ minWidth: 0 }}>
          <strong style={{ color: "#495057" }}>Assistant IA</strong>
          <div style={{ fontSize: "11px", color: "#868e96" }}>
            Demandez une modification, l'IA propose un nouveau livrable. Vous validez avant que ça ne s'applique.
          </div>
        </div>
        <div className="d-flex align-items-center flex-shrink-0" style={{ gap: 6 }}>
          {reportId && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-flex align-items-center"
                onClick={toggleSkillPicker}
                title="Ajouter des skills au contexte IA"
                style={{ gap: "4px", fontSize: "11px", whiteSpace: "nowrap" }}
              >
                <Plus size={14} /> Skill{extraSkillCodes.length > 0 ? `s (${extraSkillCodes.length})` : ""}
              </button>
              {showSkillPicker && (
                <SkillPickerDropdown
                  skills={availableSkills}
                  loading={skillsLoading}
                  selected={extraSkillCodes}
                  onToggle={toggleSkillCode}
                  onClear={() => setExtraSkillCodes([])}
                  onClose={() => setShowSkillPicker(false)}
                />
              )}
            </div>
          )}
          {canSeeContext && reportId && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center"
              onClick={handleOpenContext}
              title="Voir le contexte exact envoyé à l'IA"
              style={{ gap: "4px", fontSize: "11px", whiteSpace: "nowrap" }}
            >
              <Eye size={14} /> Contexte IA
            </button>
          )}
        </div>
      </div>

      {extraSkillCodes.length > 0 && (
        <div className="px-3 py-1 d-flex flex-wrap" style={{ gap: 4, borderBottom: "1px solid #dee2e6", backgroundColor: "#f1f3f5" }}>
          <span style={{ fontSize: 10, color: "#555", marginRight: 4, alignSelf: "center" }}>Skills attachés :</span>
          {extraSkillCodes.map((code) => {
            const meta = availableSkills.find((s) => (s.code || "").toUpperCase() === code.toUpperCase());
            return (
              <span
                key={code}
                title={meta?.nom || code}
                style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "#fff", border: "1px solid #6C5CE7", color: "#6C5CE7", display: "inline-flex", alignItems: "center", gap: 3 }}
              >
                {code}
                <button
                  type="button"
                  onClick={() => toggleSkillCode(code)}
                  style={{ background: "transparent", border: "none", color: "#6C5CE7", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 12 }}
                  title="Détacher ce skill"
                >×</button>
              </span>
            );
          })}
        </div>
      )}

      {showContext && (
        <ContextModal
          loading={contextLoading}
          data={contextData}
          onClose={() => setShowContext(false)}
        />
      )}

      <div
        ref={scrollRef}
        className="flex-grow-1 px-3 py-2"
        style={{ overflowY: "auto", minHeight: 0 }}
      >
        {loading && <div className="text-muted small">Chargement de la conversation…</div>}
        {error && <div className="text-danger small">{error}</div>}
        {!loading && !error && messages.length === 0 && (
          <div className="text-muted small">
            Aucun échange pour l'instant. Tapez un prompt ci-dessous pour démarrer.
          </div>
        )}

        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            onApply={() => handleApply(m.id)}
            applying={applyingMessageId === m.id}
          />
        ))}

        {sending && (
          <div className="text-muted small mt-2">
            <span className="spinner-border spinner-border-sm mr-2" /> Réponse de l'IA en cours…
          </div>
        )}
      </div>

      <div
        className="p-2 d-flex"
        style={{ borderTop: "1px solid #dee2e6", gap: "6px", backgroundColor: "#f8f9fa" }}
      >
        <textarea
          className="form-control"
          rows={2}
          placeholder="Ex: Reformule l'introduction de manière plus formelle…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending || loading || !reportId}
          style={{ resize: "none", fontSize: "13px" }}
        />
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center"
          onClick={handleSend}
          disabled={sending || loading || !reportId || !input.trim()}
          title="Envoyer (Ctrl/⌘+Entrée)"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

const ChatBubble = ({ message, onApply, applying }) => {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const hasProposedHtml = isAssistant && !!message.proposed_html;
  const isApplied = !!message.applied_version_id;

  return (
    <div
      className={`mb-2 d-flex ${isUser ? "justify-content-end" : "justify-content-start"}`}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "8px 10px",
          borderRadius: "10px",
          fontSize: "13px",
          backgroundColor: isUser ? "#0d6efd" : "#f1f3f5",
          color: isUser ? "#fff" : "#212529",
          border: isAssistant ? "1px solid #dee2e6" : "none",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {message.content || (hasProposedHtml ? "(modification proposée)" : "")}
        </div>
        {hasProposedHtml && (
          <div className="mt-2 d-flex align-items-center" style={{ gap: "6px" }}>
            {isApplied ? (
              <span className="badge badge-success">Appliqué</span>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={onApply}
                disabled={applying}
              >
                {applying ? "Application…" : "Appliquer cette version"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ContextModal = ({ loading, data, onClose }) => {
  const ctx = data?.context || {};
  const htmlLen = (ctx.current_html || "").length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          width: "min(1100px, 95vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="d-flex justify-content-between align-items-center px-3 py-2"
          style={{ borderBottom: "1px solid #dee2e6" }}
        >
          <div>
            <strong>Contexte IA — vue debug</strong>
            <div style={{ fontSize: "11px", color: "#868e96" }}>
              Données exactes passées à Gemini lors d'un message du chat.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-light d-flex align-items-center"
            onClick={onClose}
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-3 py-2" style={{ overflowY: "auto", flex: 1 }}>
          {loading && <div className="text-muted small">Chargement…</div>}
          {!loading && data && (
            <>
              <ContextSection title="Client (passé au prompt)" value={ctx.client} />
              <ContextSection title="FrozenData" value={ctx.frozen_data} />
              <ContextSection title="calcul_json" value={ctx.calcul_json} />
              <ContextSection
                title={`HTML courant — ${htmlLen} caractères`}
                value={ctx.current_html}
                isText
              />
              <ContextSection
                title="System prompt résolu"
                value={data.system_prompt}
                isText
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ContextSection = ({ title, value, isText }) => {
  const display = isText
    ? value == null
      ? ""
      : String(value)
    : JSON.stringify(value, null, 2);
  return (
    <details open style={{ marginBottom: "12px" }}>
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 600,
          padding: "4px 0",
          fontSize: "13px",
        }}
      >
        {title}
      </summary>
      <pre
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          padding: "8px",
          fontSize: "11px",
          maxHeight: "400px",
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          marginTop: "4px",
        }}
      >
        {display}
      </pre>
    </details>
  );
};

/**
 * Mini dropdown listant les skills disponibles avec cases à cocher.
 * Positionné en absolute sous le bouton "+ Skill".
 */
const SkillPickerDropdown = ({ skills, loading, selected, onToggle, onClear, onClose }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Regroupement léger par type pour aider à scanner la liste
  const grouped = skills.reduce((acc, s) => {
    const k = s.type || "autre";
    (acc[k] = acc[k] || []).push(s);
    return acc;
  }, {});

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        width: 320,
        maxHeight: 360,
        backgroundColor: "#fff",
        border: "1px solid #dee2e6",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="d-flex justify-content-between align-items-center px-2 py-1" style={{ borderBottom: "1px solid #eee", fontSize: 11, fontWeight: 600, color: "#495057" }}>
        <span>Ajouter des skills au contexte IA</span>
        <div style={{ display: "flex", gap: 6 }}>
          {selected.length > 0 && (
            <button type="button" onClick={onClear} style={{ background: "none", border: "none", color: "#D63031", fontSize: 10, cursor: "pointer", padding: 0 }}>
              Tout retirer
            </button>
          )}
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#868e96", cursor: "pointer", padding: 0 }} title="Fermer">
            <X size={12} />
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && <div style={{ padding: 8, fontSize: 11, color: "#868e96" }}>Chargement…</div>}
        {!loading && skills.length === 0 && (
          <div style={{ padding: 8, fontSize: 11, color: "#868e96" }}>Aucun skill disponible dans le catalogue.</div>
        )}
        {!loading && Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            <div style={{ padding: "4px 8px", fontSize: 9, fontWeight: 700, color: "#868e96", textTransform: "uppercase", letterSpacing: "0.05em", background: "#f8f9fa" }}>
              {type}
            </div>
            {items.map((s) => {
              const isChecked = selected.includes(s.code);
              return (
                <label
                  key={s.id || s.code}
                  style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "5px 8px", cursor: "pointer", fontSize: 11, borderTop: "1px solid #f1f3f5", backgroundColor: isChecked ? "#f3f0ff" : "transparent", margin: 0 }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(s.code)}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "#495057" }}>{s.code}</span>
                    <span style={{ color: "#868e96", marginLeft: 4 }}>· {s.nom}</span>
                    {s.description && (
                      <div style={{ color: "#868e96", fontSize: 10, marginTop: 1, lineHeight: 1.3 }}>{s.description}</div>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportChatPanel;
