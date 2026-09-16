import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardBody, Collapse, Button } from "reactstrap";
import {
  parseCf7ContactBody,
  formatPhoneNumber,
  getTypeLabel,
  extractSummaryFromMessages,
} from "../../kpi/components/inbox/utils";

/** Display-time: drop Brevo/sendibt tracking + pixel brackets (no DB wipe). */
function stripMailTrackingPollution(text) {
  return String(text || "")
    .replace(
      /\[[^\]]*https?:\/\/[^\]]*(?:sendibt\d*|caiggcc|brevo|tsp1-brevo)[^\]]*\]/gi,
      " ",
    )
    .replace(
      /https?:\/\/[^\s\]]*(?:sendibt\d*|caiggcc|brevo\.net|tsp1-brevo)[^\s\]]*/gi,
      " ",
    )
    .replace(/^\s*EOR\s*$/gim, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cap'tain reading format (reuse Notes.js CF7 pane):
 * title + Nom/Tél/Mail(+extras) lines + blank + message text.
 */
function buildInboundReadingPane(rawBody) {
  const cleaned = stripMailTrackingPollution(rawBody);
  if (!cleaned) return null;

  const parsed = parseCf7ContactBody(cleaned) || {};
  let name = (parsed.name || "").trim();
  if (!name) {
    const m = cleaned.match(
      /Nom\s+et\s+(?:Prénom|Prenom)\s+(.+?)(?=\s*(?:Téléphone|Telephone|Adresse\s*(?:e-?mail|mail)|E-?mail|Date\s*de\s*naissance|Message|Votre\s+message|Page\s+d|Consentement|Formulaire\s+rempli)|$)/i,
    );
    if (m) name = m[1].trim();
  }
  if (!name) {
    const civ = cleaned.match(/^(?:Title|civilite)\s*:\s*(.+)$/im);
    const nm = cleaned.match(/^Name\s*:\s*(.+)$/im);
    if (nm) {
      name = [civ && civ[1].trim(), nm[1].trim()].filter(Boolean).join(" ");
    }
  }

  let phone = (parsed.phone || "").trim();
  if (!phone) {
    const m =
      cleaned.match(/^(?:phone|tel)\s*:\s*(.+)$/im) ||
      cleaned.match(
        /(?:Téléphone|Telephone)\s*[:\s]\s*([+0-9][0-9.\s/-]{6,})/i,
      );
    if (m) phone = m[1].replace(/[.\s/-]/g, "").trim();
  }

  let email = (parsed.email || "").trim();
  if (!email) {
    const m = cleaned.match(/^(?:email|e-?mail)\s*:\s*(\S+@\S+)/im);
    if (m) email = m[1].replace(/[>,;]+$/, "").trim();
  }

  let birthDate = (parsed.birthDate || "").trim();
  if (!birthDate) {
    const m =
      cleaned.match(
        /Date\s*de\s*naissance\s*[:\s]\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})/i,
      ) ||
      cleaned.match(
        /^(?:date|text-542)\s*:\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})/im,
      );
    if (m) birthDate = m[1].trim();
  }

  let message = (parsed.message || "").trim();
  if (!message) {
    const m =
      cleaned.match(
        /(?:Votre\s+message|\bMessage(?!\s+reçu)\b)\s*:?\s+(.+?)(?=\s*Page\s+d|\s*Consentement|\s*Formulaire\s+rempli|\s*$)/is,
      ) ||
      cleaned.match(/^textarea-\d+\s*:\s*(.+)$/ims) ||
      cleaned.match(/^Message\s*:\s*(.+)$/ims);
    if (m) message = m[1].trim();
  }
  message = message
    .replace(/\s*Page\s+d['’]envoi\s+https?:\/\/\S+/gi, "")
    .replace(/\s*Consentement\s*\/\s*Options\s+.*/gi, "")
    .replace(/\s*Formulaire\s+rempli\s+sur[\s\S]*/gi, "")
    .replace(/\s*acceptance-\d+\s*:\s*\S+/gi, "")
    .replace(/\s*checkbox-\d+\s*:[\s\S]*/gi, "")
    .trim();

  let pageUrl = "";
  {
    const mPage = cleaned.match(
      /Page\s+d['’]envoi\s+(https?:\/\/(?:www\.)?eor\.fr\/[^\s]+)/i,
    );
    const mForm = cleaned.match(
      /Formulaire\s+rempli\s+sur\s+le\s+site\s+EOR\s*:\s*(https?:\/\/(?:www\.)?eor\.fr\/?[^\s]*)/i,
    );
    if (mPage) pageUrl = mPage[1].replace(/[.,;)\]]+$/, "").trim();
    else if (mForm) pageUrl = mForm[1].replace(/[.,;)\]]+$/, "").trim();
    else if ((parsed.formUrl || "").trim()) pageUrl = parsed.formUrl.trim();
  }
  if (/sendibt|caiggcc|brevo/i.test(pageUrl)) pageUrl = "";

  let consent = "";
  const cm = cleaned.match(
    /Consentement\s*\/\s*Options\s+(.+?)(?=\s*Formulaire\s+rempli|\s*$)/is,
  );
  if (cm) {
    consent = cm[1].replace(/\s+/g, " ").trim();
  }

  const lines = [];
  if (name) lines.push("Nom et prénom: " + name);
  const phoneFmt = formatPhoneNumber(phone) || phone;
  if (phoneFmt) lines.push("Téléphone: " + phoneFmt);
  if (email) lines.push("Adresse mail: " + email);
  if (birthDate) lines.push("Date de naissance: " + birthDate);
  if (pageUrl) lines.push("Page d'envoi: " + pageUrl);
  if (consent) lines.push("Consentement / Options: " + consent);

  const bodyText = message || "";
  const text =
    lines.length || bodyText
      ? (lines.join("\n") + (bodyText ? "\n\n" + bodyText : "")).trim()
      : cleaned;

  if (/sendibt|caiggcc|tsp1-brevo/i.test(text)) {
    return {
      title: "Message reçu via le formulaire de contact",
      text: stripMailTrackingPollution(text),
    };
  }

  return {
    title: "Message reçu via le formulaire de contact",
    text,
  };
}

function formatDateFr(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch (e) {
    return String(value);
  }
}

function ChannelHeader({ type, label, date }) {
  const colors = {
    email: { bg: "#eef2ff", color: "#3730a3" },
    chatbot: { bg: "#eff6ff", color: "#1e40af" },
    diagnostic: { bg: "#fff7ed", color: "#9a3412" },
  };
  const c = colors[type] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: c.bg,
          color: c.color,
          textTransform: "capitalize",
        }}
      >
        {label || getTypeLabel(type)}
      </div>
      {date ? (
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{date}</div>
      ) : null}
    </div>
  );
}

function EmptyCanal({ canal }) {
  return (
    <div
      className="text-muted"
      style={{ fontSize: 13, fontStyle: "italic", padding: "4px 0" }}
      data-testid={`source-empty-${canal}`}
    >
      Aucune source {canal}
    </div>
  );
}

function Cf7Section({ id }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const token = localStorage.getItem("token");
    axios
      .get(global.config.server_url + "/inbound-emails", {
        params: { client_id: id, source: "cf7", per_page: 20 },
        headers: { Authorization: "Bearer " + token },
      })
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data || res.data || [];
        const list = (Array.isArray(rows) ? rows : []).filter(
          (r) => String(r.source || "").toLowerCase() === "cf7" || !r.source,
        );
        setItems(list);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Card className="mb-1" style={{ borderRadius: 12 }} data-testid="source-cf7">
      <CardBody>
        <ChannelHeader type="email" label="Contact Form 7" />
        {items === null ? (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Chargement…
          </div>
        ) : error && items.length === 0 ? (
          <EmptyCanal canal="Contact Form 7" />
        ) : items.length === 0 ? (
          <EmptyCanal canal="Contact Form 7" />
        ) : (
          items.map((row) => {
            const body = (row.body || row.snippet || "").trim();
            const pane = body ? buildInboundReadingPane(body) : null;
            const when = formatDateFr(row.received_at || row.created_at);
            return (
              <div
                key={row.id}
                className="inbound-email-under-notes mb-1"
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {when ? (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                    Reçu le {when}
                    {row.subject ? ` · ${row.subject}` : ""}
                  </div>
                ) : null}
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {(pane && pane.title) ||
                    "Message reçu via le formulaire de contact"}
                </div>
                <div>{(pane && pane.text) || body || "(corps vide)"}</div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

function ChatbotSection({ archives }) {
  const list = Array.isArray(archives) ? archives : [];
  return (
    <Card
      className="mb-1"
      style={{ borderRadius: 12 }}
      data-testid="source-chatbot"
    >
      <CardBody>
        <ChannelHeader type="chatbot" label={getTypeLabel("chatbot")} />
        {list.length === 0 ? (
          <EmptyCanal canal="Chatbot" />
        ) : (
          list.map((archive) => {
            const messages = Array.isArray(archive.messages)
              ? archive.messages
              : [];
            const summaryPoints =
              messages.length > 0
                ? extractSummaryFromMessages(messages)
                : archive.summary
                  ? [archive.summary]
                  : [];
            const when = formatDateFr(archive.created_at);
            return (
              <div
                key={archive.id || archive.created_at}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                  {when ? `Reçu le ${when}` : ""}
                  {archive.source ? ` · source: ${archive.source}` : ""}
                </div>
                {summaryPoints && summaryPoints.length > 0 ? (
                  <div style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      Résumé
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                      {summaryPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    (aucun message brut)
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.map((m, i) => {
                      const role = String(m.role || m.sender || "").toLowerCase();
                      const isUser =
                        role === "user" || role === "human" || role === "client";
                      return (
                        <div
                          key={i}
                          style={{
                            alignSelf: isUser ? "flex-end" : "flex-start",
                            maxWidth: "92%",
                            background: isUser ? "#dbeafe" : "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: "8px 10px",
                            fontSize: 13,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#6b7280",
                              marginBottom: 2,
                              textTransform: "uppercase",
                            }}
                          >
                            {isUser ? "User" : role || "Assistant"}
                          </div>
                          {m.content || m.text || m.message || ""}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

function DiagnosticSection({ results }) {
  const list = Array.isArray(results) ? results : [];
  const [openRaw, setOpenRaw] = useState({});

  return (
    <Card
      className="mb-1"
      style={{ borderRadius: 12 }}
      data-testid="source-diagnostic"
    >
      <CardBody>
        <ChannelHeader
          type="diagnostic"
          label="Diagnostic Retraite"
        />
        {list.length === 0 ? (
          <EmptyCanal canal="Diagnostic Retraite" />
        ) : (
          list.map((row) => {
            const when = formatDateFr(row.created_at || row.createdAt);
            const qEntries = [];
            for (let i = 1; i <= 10; i++) {
              const key = `q${i}`;
              if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
                qEntries.push([key, row[key]]);
              }
            }
            const raw =
              row.raw_payload || row.rawPayload || row.attributes || null;
            let rawText = "";
            if (raw != null) {
              try {
                rawText =
                  typeof raw === "string"
                    ? raw
                    : JSON.stringify(raw, null, 2);
              } catch (e) {
                rawText = String(raw);
              }
            }
            const idKey = row.id || when || Math.random();
            return (
              <div
                key={idKey}
                style={{
                  background: "#fff7ed",
                  border: "1px solid #ffedd5",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                  {when ? `Reçu le ${when}` : ""}
                  {row.score != null && row.score !== ""
                    ? ` · score: ${row.score}`
                    : ""}
                  {row.email ? ` · ${row.email}` : ""}
                </div>
                {qEntries.length > 0 ? (
                  <table
                    style={{
                      width: "100%",
                      fontSize: 13,
                      borderCollapse: "collapse",
                      marginBottom: 8,
                    }}
                  >
                    <tbody>
                      {qEntries.map(([k, v]) => (
                        <tr key={k}>
                          <td
                            style={{
                              fontWeight: 700,
                              color: "#9a3412",
                              padding: "2px 8px 2px 0",
                              width: 48,
                              verticalAlign: "top",
                            }}
                          >
                            {k}
                          </td>
                          <td style={{ padding: "2px 0", whiteSpace: "pre-wrap" }}>
                            {String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    (pas de réponses q1–q10)
                  </div>
                )}
                {rawText ? (
                  <div>
                    <Button
                      color="link"
                      size="sm"
                      className="p-0"
                      onClick={() =>
                        setOpenRaw((prev) => ({
                          ...prev,
                          [idKey]: !prev[idKey],
                        }))
                      }
                    >
                      {openRaw[idKey]
                        ? "Masquer raw_payload"
                        : "Afficher raw_payload"}
                    </Button>
                    <Collapse isOpen={!!openRaw[idKey]}>
                      <pre
                        style={{
                          marginTop: 8,
                          marginBottom: 0,
                          fontSize: 11,
                          background: "#fff",
                          border: "1px solid #fed7aa",
                          borderRadius: 6,
                          padding: 8,
                          maxHeight: 280,
                          overflow: "auto",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {rawText}
                      </pre>
                    </Collapse>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Onglet Source — origine CF7 / Chatbot / Diagnostic + historique brut.
 * Empty canal per user → « Aucune source {canal} » (not invent).
 */
const SourceTab = ({ id, data }) => {
  const archives =
    data?.conversation_archives || data?.conversationArchives || [];
  const results =
    data?.simulator_difficulty_results ||
    data?.simulatorDifficultyResults ||
    [];

  return (
    <div className="source-tab px-0" data-testid="source-tab">
      <Cf7Section id={id} />
      <ChatbotSection archives={archives} />
      <DiagnosticSection results={results} />
    </div>
  );
};

export default SourceTab;
