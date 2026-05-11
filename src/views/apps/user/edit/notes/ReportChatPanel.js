import React, { useEffect, useRef, useState } from "react";
import { Send } from "react-feather";
import { toast } from "react-toastify";
import {
  fetchLatestReport,
  fetchReportChat,
  sendReportChatMessage,
  applyReportChatMessage,
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
  const scrollRef = useRef(null);

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
      const res = await sendReportChatMessage(reportId, content);
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
        className="px-3 py-2"
        style={{ borderBottom: "1px solid #dee2e6", backgroundColor: "#f8f9fa" }}
      >
        <strong style={{ color: "#495057" }}>Assistant IA</strong>
        <div style={{ fontSize: "11px", color: "#868e96" }}>
          Demandez une modification, l'IA propose un nouveau livrable. Vous validez avant que ça ne s'applique.
        </div>
      </div>

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

export default ReportChatPanel;
