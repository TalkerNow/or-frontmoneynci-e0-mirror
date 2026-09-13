import React from "react";
import { MessageSquare, Phone, Mail, FileText } from "lucide-react";

/**
 * Calculates a dynamic complexity score (0-100) based on diagnostic attributes.
 */
export function calculateComplexityScore(input = {}) {
  // 1. Determine attributes object
  let attrs = input;
  // If input appears to be the main object with an 'attributes' key
  if (input && typeof input === "object" && input.attributes) {
    attrs = input.attributes;
  }

  // Safe check if attributes is a string (rare but possible)
  if (typeof attrs === "string") {
    try {
      attrs = JSON.parse(attrs);
    } catch (e) {
      attrs = {};
    }
  }
  if (!attrs) attrs = {};

  // 2. Priority: use backend provided score (handle casing)
  const directScore =
    attrs.SCORE ?? attrs.Score ?? attrs.score ?? attrs.diagnostic_score;
  if (directScore !== undefined && directScore !== null) {
    const parsed = parseInt(directScore, 10);
    if (!isNaN(parsed)) return parsed;
  }

  // 3. Fallback: Calculate from answers
  let score = 30; // Base score

  // Q1: Number of companies
  const q1 = (attrs.SIMULATEUR_DIFFICULTE_Q1 || "").toString();
  if (q1.includes("9+")) score += 25;
  else if (q1.includes("4-9") || q1.includes("4–9")) score += 15;

  // Q2: Simultaneous companies
  if ((attrs.SIMULATEUR_DIFFICULTE_Q2 || "").toLowerCase() === "oui")
    score += 10;

  // Q3: Abroad career
  if ((attrs.SIMULATEUR_DIFFICULTE_Q3 || "").toLowerCase() === "oui")
    score += 20;

  // Q4: Career gaps (maladie, chomage)
  if ((attrs.SIMULATEUR_DIFFICULTE_Q4 || "").toLowerCase() === "oui")
    score += 10;

  // Q5: Specific regimes (Fonctionnaire/Contractuel)
  const q5 = (attrs.SIMULATEUR_DIFFICULTE_Q5 || "").toLowerCase();
  if (q5.includes("oui")) score += 15;

  // Q6: Independent / Manager
  if ((attrs.SIMULATEUR_DIFFICULTE_Q6 || "").toLowerCase() === "oui")
    score += 15;

  // Q8: RIS not checked
  if ((attrs.SIMULATEUR_DIFFICULTE_Q8 || "").toLowerCase() === "non")
    score += 15;

  return Math.min(100, score);
}

// Helper: Extract task text from the 'data' JSON field
export function getTaskText(item) {
  if (!item) return "";

  if (item.text) return item.text;
  if (item.task_text) return item.task_text;

  if (item.data) {
    try {
      const parsed =
        typeof item.data === "string" ? JSON.parse(item.data) : item.data;
      return (
        parsed.text ||
        parsed.task_text ||
        (typeof item.data === "string" ? item.data : "")
      );
    } catch {
      return typeof item.data === "string" ? item.data : "";
    }
  }

  return item.content || item.message || "Tâche sans titre";
}

// Helper: Format phone number to French format (06 12 34 56 78)
export function formatPhoneNumber(input) {
  if (!input) return "";
  // Remove all non-digit characters
  let digits = String(input).replace(/\D/g, "");

  // Handle international formats (+33, 0033, 33)
  if (digits.startsWith("33") && digits.length > 9) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 9 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }

  // Limit to 10 digits
  digits = digits.slice(0, 10);

  // Format as XX XX XX XX XX
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

// Helper: Format date to relative time
export function formatRelativeDate(isoDate) {
  if (!isoDate) return "";
  let raw = isoDate;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:/.test(raw)) {
    raw = raw.replace(" ", "T");
  }
  const date = new Date(raw);
  const now = new Date();

  // Check if same day
  const isToday = date.toDateString() === now.toDateString();

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    // Today: show only time (HH:MM)
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (isYesterday) {
    // Yesterday: show "Hier" + time
    return `Hier ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  // Older: show date (DD/MM/YYYY)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Helper: Extract summary from messages
export function extractSummaryFromMessages(messages) {
  if (!messages || messages.length === 0) return [];
  const userMessages = messages.filter((m) => m.role === "user");
  return userMessages
    .slice(0, 3)
    .map(
      (m) => m.content.substring(0, 50) + (m.content.length > 50 ? "..." : ""),
    );
}

// Helper: Map conversation from backend to inbox item

/**
 * Parse CF7 contact-form body/snippet (Gmail ingest).
 * Official layout (label then value):
 *   Message reçu via le formulaire de contact
 *   Nom, prénom / Téléphone / Adresse mail / Date de naissance /
 *   Vous êtes intéressé·e par / Message /
 *   Formulaire rempli sur le site EOR : https://www.eor.fr/…
 * Snippet often holds the full CF7 text (no body column yet).
 */
export function parseCf7ContactBody(text) {
  const empty = {
    firstName: "",
    lastName: "",
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    interest: "",
    message: "",
    channel: "",
    formUrl: "",
  };
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return empty;

  const nextLabel =
    "(?=\\s*(?:Téléphone|Telephone|Adresse\\s*(?:e-?mail|mail)|E-?mail|Date\\s*de\\s*naissance|Statut|Vous\\s*êtes|Besoin|Message|Votre\\s*message|Formulaire\\s+rempli)\\b|$)";

  let channel = "";
  if (/(?:Nouveau\s+)?[Mm]essage\s+reçu\s+via\s+le\s+formulaire\s+de\s+contact/i.test(raw)) {
    channel = "Message reçu via le formulaire de contact";
  }

  let firstName = "";
  let lastName = "";
  let name = "";

  // "Prénom, Nom VALUE" → first token = prénom, rest = nom
  let m = raw.match(
    new RegExp("(?:Prénom|Prenom)\\s*,\\s*Nom\\s+(.+?)" + nextLabel, "i"),
  );
  if (m) {
    name = m[1].trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const nameParts = [...parts];
    if (
      nameParts.length &&
      /^(m\.?|mr\.?|mme\.?|mlle\.?|monsieur|madame)$/i.test(nameParts[0])
    ) {
      nameParts.shift();
    }
    if (nameParts.length === 1) {
      firstName = nameParts[0];
    } else if (nameParts.length > 1) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }
  } else {
    // "Nom, prénom VALUE" — keep civility in display name (Mr Serge RICHARD)
    m = raw.match(
      new RegExp("Nom\\s*,\\s*(?:Prénom|Prenom)\\s+(.+?)" + nextLabel, "i"),
    );
    if (m) {
      name = m[1].trim();
      const parts = name.split(/\s+/).filter(Boolean);
      const nameParts = [...parts];
      if (
        nameParts.length &&
        /^(m\.?|mr\.?|mme\.?|mlle\.?|monsieur|madame)$/i.test(nameParts[0])
      ) {
        nameParts.shift();
      }
      if (nameParts.length === 1) {
        lastName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        lastName = nameParts[1];
      } else if (nameParts.length > 2) {
        firstName = nameParts.slice(0, -1).join(" ");
        lastName = nameParts[nameParts.length - 1];
      }
    }
  }

  let phone = "";
  m = raw.match(
    new RegExp(
      "(?:Téléphone|Telephone)\\s*[:\\s]\\s*([+0-9][0-9.\\s/-]{6,})" + nextLabel,
      "i",
    ),
  );
  if (m) {
    phone = m[1].replace(/[.\s/-]/g, "").trim();
  }

  let email = "";
  m = raw.match(
    /(?:Adresse\s*(?:e-?mail|mail)|E-?mail)\s*[:\s]\s*([^\s]+@[^\s]+)/i,
  );
  if (m) {
    email = m[1].replace(/[>,;]+$/, "").trim();
  }

  let birthDate = "";
  m = raw.match(
    new RegExp(
      "Date\\s*de\\s*naissance\\s*[:\\s]\\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})" +
        nextLabel,
      "i",
    ),
  );
  if (m) {
    birthDate = m[1].trim();
  }

  let interest = "";
  m = raw.match(
    new RegExp(
      "Vous\\s*êtes\\s*intéressé[·.•\\s]*e?\\s*par\\s+(.+?)" + nextLabel,
      "i",
    ),
  );
  if (m) {
    interest = m[1].trim();
  }

  let message = "";
  // Avoid matching intro « Message reçu via le formulaire… »
  m = raw.match(
    /(?:Votre\s+message|\bMessage(?!\s+reçu)\b)\s+(.+?)(?=\s*Formulaire\s+rempli\s+sur|\s*$)/i,
  );
  if (m) {
    message = m[1].trim();
  }
  // Nouveau CF7 layout: "Besoin …" often holds the question when Message absent / snippet truncated
  let besoin = "";
  m = raw.match(
    new RegExp("Besoin\\s+(.+?)" + nextLabel, "i"),
  );
  if (m) {
    besoin = m[1].trim();
  }
  if (!interest && besoin) {
    interest = besoin;
  }
  if (!message && besoin) {
    message = besoin;
  }
  // Statut professionnel (Nouveau layout)
  m = raw.match(
    new RegExp("Statut\\s+professionnel\\s+(.+?)" + nextLabel, "i"),
  );
  // keep in message trail only if still empty and we have leftover after birth
  if (!message) {
    m = raw.match(
      /Date\s*de\s*naissance\s*[:\s]\s*[0-9/. -]{8,12}\s*(.+)$/i,
    );
    if (m) {
      const rest = m[1].trim();
      if (rest && !/^Formulaire\s+rempli/i.test(rest)) {
        message = rest;
      }
    }
  }

  let formUrl = "";
  m = raw.match(
    /Formulaire\s+rempli\s+sur\s+le\s+site\s+EOR\s*:\s*(https?:\/\/[^\s]+)/i,
  );
  if (m) {
    formUrl = m[1].replace(/[.,;)\]]+$/, "").trim();
  } else {
    m = raw.match(/(https?:\/\/(?:www\.)?eor\.fr\/[^\s]+)/i);
    if (m) {
      formUrl = m[1].replace(/[.,;)\]]+$/, "").trim();
    }
  }

  return {
    firstName,
    lastName,
    name,
    phone,
    email,
    birthDate,
    interest,
    message,
    channel,
    formUrl,
  };
}

/**
 * Map inbound_emails row (source=cf7 only) → inbox item.
 * CF7: parse Prénom/Nom + téléphone + email from snippet/body;
 * detail pane = FULL body/snippet (not truncated); keep gmail_permalink.
 */
export function mapInboundEmailToInboxItem(row) {
  if (!row) return null;
  const fromName = (row.from_name || "").trim();
  const fromEmail = (row.from_email || "").trim();
  const subject = (row.subject || "").trim();
  const snippet = (row.snippet || "").trim();
  // No body column yet — snippet is the body content for detail (show FULL text)
  const body = (row.body || row.snippet || "").trim();
  const src = String(row.source || "").toLowerCase();
  const cf7 =
    src === "cf7" ? parseCf7ContactBody(body || snippet) : null;

  const firstName = (cf7 && cf7.firstName) || fromName || "";
  const lastName = (cf7 && cf7.lastName) || "";
  const email = (cf7 && cf7.email) || fromEmail || "";
  const phone = (cf7 && cf7.phone) || "";
  const birthDate = (cf7 && cf7.birthDate) || "";
  const interest = (cf7 && cf7.interest) || "";
  const cf7Message = (cf7 && cf7.message) || "";
  const channel = (cf7 && cf7.channel) || "";
  const formUrl = (cf7 && cf7.formUrl) || "";
  const displayName =
    (cf7 && cf7.name) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    fromName ||
    fromEmail ||
    email ||
    subject ||
    "Mail entrant";

  const when = row.received_at || row.created_at || null;
  let whenIso = when;
  if (typeof whenIso === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:/.test(whenIso)) {
    whenIso = whenIso.replace(" ", "T");
  }
  const isRead = row.is_read === true || row.is_read === 1 || row.is_read === "1";
  return {
    id: row.id,
    clientId: null,
    type: "email",
    name: displayName,
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    interest,
    cf7Message,
    channel,
    formUrl,
    subject,
    snippet,
    body,
    date: formatRelativeDate(whenIso),
    receivedAt: when,
    score: 0,
    summary: [subject, snippet].filter(Boolean),
    status: isRead ? "read" : "new",
    priority: "medium",
    hasMultipleChannels: false,
    gmailPermalink: row.gmail_permalink || null,
    gmailMessageId: row.gmail_message_id || null,
    raw: { ...row, _source: "email", source: row.source },
  };
}


/**
 * Short CF7 quote for Gmail compose (Répondre) — Nom, Tél, Email, Message/intérêt.
 */
export function buildCf7QuotedBody(item) {
  if (!item) return "";
  const lines = [];
  const name = (item.name || "").trim();
  const phone = (item.phone || "").trim();
  const email = (item.email || "").trim();
  const msg = (item.cf7Message || "").trim();
  const interest = (item.interest || "").trim();
  if (name) lines.push(`Nom: ${name}`);
  if (phone) lines.push(`Tél: ${phone}`);
  if (email) lines.push(`Email: ${email}`);
  if (msg) lines.push(`Message: ${msg}`);
  if (interest) lines.push(`Intérêt: ${interest}`);
  return lines.join("\n");
}

/**
 * Gmail compose URL for CF7 reply (client-side only — no SMTP/outbox).
 * If no prospect email: mailto: fallback with same subject/body.
 */
/** Deep-link Gmail to the ingested message on contact@ (not jfc@ u/0 inbox). */
export function buildGmailOpenHref(item) {
  if (!item) return null;
  const mid = (item.gmailMessageId || item.gmail_message_id || "").trim();
  const auth = "contact@eor.fr";
  if (mid) {
    // Search by id works across mailboxes; authuser forces contact@ session
    return (
      "https://mail.google.com/mail/?authuser=" +
      encodeURIComponent(auth) +
      "#search/" +
      encodeURIComponent(mid)
    );
  }
  const permalink = (item.gmailPermalink || item.gmail_permalink || "").trim();
  if (permalink) {
    // Rewrite u/0 → authuser=contact@ when possible
    try {
      const u = new URL(permalink);
      u.searchParams.set("authuser", auth);
      return u.toString().replace("/mail/u/0/", "/mail/").replace("/mail/u/1/", "/mail/");
    } catch (e) {
      return permalink;
    }
  }
  return null;
}

export function buildCf7ReplyHref(item) {
  if (!item) return { href: null, disabled: true };
  const email = (item.email || "").trim();
  const subjectOrName = (item.subject || item.name || "Contact site").trim();
  const su = `Re: ${subjectOrName}`;
  const quoted = buildCf7QuotedBody(item);
  const body = quoted
    ? `Bonjour,\n\n\n\n---\nDemande reçue via le site :\n${quoted}`
    : "";
  if (email) {
    const href =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(email)}` +
      `&su=${encodeURIComponent(su)}` +
      `&body=${encodeURIComponent(body)}`;
    return { href, disabled: false };
  }
  const mailto =
    `mailto:?subject=${encodeURIComponent(su)}` +
    `&body=${encodeURIComponent(body)}`;
  return { href: mailto, disabled: !body, fallbackMailto: true };
}

export function mapConversationToInboxItem(conv) {
  const type =
    conv._source ||
    conv.type ||
    (conv.messages && conv.messages.length > 0 ? "chatbot" : "diagnostic");

  let firstName = "";
  let lastName = "";
  let email = "";
  let phone = "";
  let attributes = conv.attributes || {};

  if (type === "diagnostic") {
    // DIAGNOSTIC MAPPING
    // We look for specific attributes keys known in the simulator
    firstName = attributes.PRENOM || attributes.prenom || "";
    lastName = attributes.NOM || attributes.nom || "";
    email = attributes.EMAIL || attributes.email || "";
    phone =
      attributes.TELEPHONE ||
      attributes.telephone ||
      attributes.TELEPHONE_MOBILE ||
      "";

    // Additional attributes specific fields if needed
    if (!phone) phone = conv.phone || conv.telephone || "";
    if (!email) email = conv.email || "";

    // Fallback: try to guess name from email if name is missing
    if ((!firstName || !lastName) && email) {
      const localPart = email.split("@")[0];
      // If it has a separator like dot or hyphen, might be First.Last
      const splitName = localPart.split(/[.-]/);
      if (splitName.length > 1) {
        firstName = firstName || splitName[0];
        lastName = lastName || splitName.slice(1).join(" ");
      } else if (!firstName && !lastName) {
        firstName = localPart;
      }
    }
  } else if (type === "chatbot") {
    // CHATBOT MAPPING
    const user = conv.user || conv.visitor || conv.contact || {};

    firstName =
      user.first_name || user.firstname || user.prenom || conv.firstname || "";
    lastName =
      user.last_name || user.lastname || user.nom || conv.lastname || "";
    email = user.email || conv.email || "";
    phone = user.phone || user.telephone || conv.phone || conv.telephone || "";

    // If structured data is missing, we must extract from messages (as seen in user logs)
    if (!email || !phone) {
      const messages = conv.messages || [];
      // Scan user messages one by one
      messages.forEach((msg) => {
        if (msg.role === "user" && msg.content) {
          const text = msg.content.trim();

          // EMAIL EXTRACTION
          if (!email) {
            const emailMatch = text.match(
              /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
            );
            if (emailMatch) {
              email = emailMatch[0];
            }
          }

          // PHONE EXTRACTION (0603263227 type pattern)
          if (!phone) {
            // Clean non-digits to check length
            const digits = text.replace(/\D/g, "");
            // Check if it looks like a standalone phone number (10 digits starting with 0, or international)
            // We check if the whole message is roughly just a phone number or contains one clearly
            const phoneMatch = text.match(
              /(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}/,
            );
            if (phoneMatch) {
              phone = phoneMatch[0];
            } else if (digits.length === 10 && digits.startsWith("0")) {
              // Fallback for raw digits "0603263227"
              phone = digits;
            }
          }
        }
      });
    }

    // If name is not split, try user.name
    if (!firstName && !lastName) {
      const full = user.name || conv.name || "";
      if (full) {
        const parts = full.trim().split(" ");
        if (parts.length > 1) {
          lastName = parts.pop();
          firstName = parts.join(" ");
        } else {
          firstName = full;
        }
      } else if (email) {
        // Last resort: try to guess name from email (d-h@wanadoo.fr -> d-h)
        const localPart = email.split("@")[0];
        // If it has a separator like dot or hyphen, might be First.Last
        const splitName = localPart.split(/[.-]/);
        if (splitName.length > 1) {
          firstName = splitName[0];
          lastName = splitName.slice(1).join(" ");
        } else {
          firstName = localPart;
        }
      }
    }
  } else {
    // OTHER (Call, Email, etc.)
    const user = conv.user || conv.client || {};
    firstName = user.first_name || conv.client_first_name || "";
    lastName = user.last_name || conv.client_last_name || "";
    email = user.email || conv.email || conv.client_email || "";
    phone = user.phone || conv.phone || conv.client_phone || "";
  }

  // Construct Display Name
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = fullName || phone || email || "Prospect inconnu";

  const clientId =
    conv.user_id ||
    conv.user?.id ||
    conv.contact?.id ||
    conv.attributes?.user_id ||
    null;

  return {
    id: conv.id,
    clientId: clientId,
    type: type,
    name: displayName,
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    date: formatRelativeDate(
      conv.created_at || conv.kpi_date || new Date().toISOString(),
    ),
    score: conv.diagnostic_score || 0,
    summary:
      conv.messages && conv.messages.length > 0
        ? extractSummaryFromMessages(conv.messages)
        : conv.note
          ? [conv.note]
          : conv.objet
            ? [conv.objet]
            : [],
    status: (() => {
      // Chatbot: real unread from conversation_archives.is_read (tip 2026-09-12)
      if (type === "chatbot") {
        const isRead =
          conv.is_read === true ||
          conv.is_read === 1 ||
          conv.is_read === "1";
        return isRead ? "read" : "new";
      }
      return conv.status || conv.action || "new";
    })(),
    priority: conv.priority || "medium",
    hasMultipleChannels: conv._hasMultipleChannels || false,
    raw: conv,
  };
}

/**
 * True if we recovered an email OR a phone from the conversation
 * (same extract as mapConversationToInboxItem). Used for Leads > Chatbot pastille.
 * Does NOT use is_read / unread stock.
 */
export function conversationHasContact(conv) {
  if (!conv) return false;
  let messages = conv.messages;
  if (typeof messages === "string") {
    try {
      messages = JSON.parse(messages);
    } catch (e) {
      messages = [];
    }
  }
  const item = mapConversationToInboxItem({
    ...conv,
    messages: Array.isArray(messages) ? messages : conv.messages,
    _source: conv._source || "chatbot",
  });
  const email = String(item.email || "").trim();
  const phoneDigits = String(item.phone || "").replace(/\D/g, "");
  return Boolean(email) || phoneDigits.length >= 9;
}

export const getTypeIcon = (type) => {
  switch (type) {
    case "chatbot":
      return <MessageSquare size={14} className="text-blue-500" />;
    case "call":
      return <Phone size={14} className="text-green-500" />;
    case "email":
      return <Mail size={14} className="text-indigo-500" />;
    case "diagnostic":
      return <FileText size={14} className="text-orange-500" />;
    default:
      return <MessageSquare size={14} />;
  }
};

export const getTypeLabel = (type) => {
  switch (type) {
    case "chatbot":
      return "Chatbot";
    case "call":
      return "Appel";
    case "email":
      return "Email";
    case "diagnostic":
      return "Diagnostic";
    default:
      return "Autre";
  }
};

export const getTypeColor = (type) => {
  switch (type) {
    case "chatbot":
      return "blue";
    case "call":
      return "green";
    case "email":
      return "indigo";
    case "diagnostic":
      return "orange";
    default:
      return "gray";
  }
};

/**
 * Generates a complete HTML visual report for a prospect/diagnostic item.
 * @param {Object} item - The inbox item object (with item.raw containing attributes)
 * @returns {string} - Complete HTML document string
 */
export function generateVisualReport(item) {
  let attrs = item?.raw?.attributes;

  if (!attrs) {
    // Fallback for Strapi v4 response structure { data: { attributes: ... } }
    if (item?.raw?.data?.attributes) {
      attrs = item.raw.data.attributes;
    }
    // Fallback if item IS the attribs object or has direct attributes
    else if (item?.attributes) {
      attrs = item.attributes;
    }
    // Fallback if raw object IS the attributes (flat structure)
    else if (
      item?.raw?.SIMULATEUR_DIFFICULTE_Q1 ||
      item?.raw?.PRENOM ||
      item?.raw?.q1 ||
      item?.raw?.prenom
    ) {
      attrs = item.raw;
    } else {
      attrs = item?.raw || {};
    }
  }

  // Normalize attributes (handle lowercase / missing prefix / new API format)
  const getKey = (...keys) => {
    for (const key of keys) {
      if (attrs[key] !== undefined && attrs[key] !== null) return attrs[key];
    }
    return undefined;
  };

  const nAttrs = {
    PRENOM: getKey("PRENOM", "prenom", "first_name"),
    NOM: getKey("NOM", "nom", "last_name"),
    EMAIL: getKey("EMAIL", "email"),
    CIVILITE: getKey("CIVILITE", "civilite"),
    STATUT: getKey("STATUT", "statut"),
    SCORE: getKey("SCORE", "score", "diagnostic_score"),
    SMS: getKey("SMS", "sms", "TELEPHONE", "telephone", "phone", "mobile"),
    DATE_NAISSANCE: getKey("DATE_NAISSANCE", "date_naissance", "birth_date"),
    CODE_POSTAL: getKey("CODE_POSTAL", "code_postal", "zip"),
    NBR_ENFANTS: getKey("NBR_ENFANTS", "nbr_enfants"),

    // Dates
    SIMULATEUR_DIFFICULTE_DATE_DEPART: getKey(
      "SIMULATEUR_DIFFICULTE_DATE_DEPART",
      "date_depart",
      "departure_date",
    ),

    // Questions (Map q1 -> SIMULATEUR_DIFFICULTE_Q1)
    SIMULATEUR_DIFFICULTE_Q1: getKey("SIMULATEUR_DIFFICULTE_Q1", "q1"),
    SIMULATEUR_DIFFICULTE_Q2: getKey("SIMULATEUR_DIFFICULTE_Q2", "q2"),
    SIMULATEUR_DIFFICULTE_Q3: getKey("SIMULATEUR_DIFFICULTE_Q3", "q3"),
    SIMULATEUR_DIFFICULTE_Q4: getKey("SIMULATEUR_DIFFICULTE_Q4", "q4"),
    SIMULATEUR_DIFFICULTE_Q5: getKey("SIMULATEUR_DIFFICULTE_Q5", "q5"),
    SIMULATEUR_DIFFICULTE_Q6: getKey("SIMULATEUR_DIFFICULTE_Q6", "q6"),
    SIMULATEUR_DIFFICULTE_Q7: getKey("SIMULATEUR_DIFFICULTE_Q7", "q7"),
    SIMULATEUR_DIFFICULTE_Q8: getKey("SIMULATEUR_DIFFICULTE_Q8", "q8"),
    SIMULATEUR_DIFFICULTE_Q9: getKey("SIMULATEUR_DIFFICULTE_Q9", "q9"),
    SIMULATEUR_DIFFICULTE_Q10: getKey("SIMULATEUR_DIFFICULTE_Q10", "q10"),
    SIMULATEUR_DIFFICULTE_Q11: getKey("SIMULATEUR_DIFFICULTE_Q11", "q11"),
  };

  const email = item?.email || nAttrs.EMAIL || "—";

  // Helper functions
  const v = (val) => (val != null && val !== "" ? String(val) : "—");
  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("fr-FR");
    } catch {
      return "—";
    }
  };
  const formatPrenom = (p) => {
    if (!p) return "—";
    return p[0].toUpperCase() + p.slice(1).toLowerCase();
  };
  const formatCodePostal = (cp) => {
    if (cp == null) return "—";
    return String(cp).padStart(5, "0");
  };
  const formatCivilite = (c) => {
    if (!c) return "—";
    if (c === "homme" || c === "M") return "Monsieur";
    if (c === "femme" || c === "Mme") return "Madame";
    return c;
  };

  // Highlighting logic
  const isQ1Highlight = (val) => {
    const v = (val || "").toString().toLowerCase().replace(/\s/g, "");
    return (
      v === "9+" ||
      v === "9plus" ||
      v === "4-9" ||
      v === "4–9" ||
      v === "4à9" ||
      v === "4a9"
    );
  };
  const isOui = (val) => (val || "").toString().toLowerCase() === "oui";
  const isNon = (val) => (val || "").toString().toLowerCase() === "non";
  const isQ5Highlight = (val) => {
    const v = (val || "").toString().toLowerCase().trim();
    return v === "oui_contractuel" || v === "oui_fonctionnaire";
  };

  const highlightStyle = "background:#dcfce7;";

  const formatTags = (val) => {
    if (!val) return "—";
    return val
      .split(",")
      .map(
        (t) =>
          `<span style="display:inline-block;border:1px solid #e2e8f0;border-radius:999px;padding:2px 10px;margin:2px 6px 2px 0;font-size:12px;background:#f8fafc;">${t.replace(/_/g, " ")}</span>`,
      )
      .join(" ");
  };

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport Diagnostic Retraite</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="background:#002060;padding:18px 22px;color:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
          <tr>
            <td valign="middle" style="padding:0 12px 0 0;width:1%;white-space:nowrap;">
              <img src="https://www.eor.fr/wp-content/uploads/2024/03/eor-250px.png" alt="EOR" width="70" border="0" style="display:block;width:70px;max-width:70px;height:auto;line-height:100%;outline:none;text-decoration:none;" />
            </td>
            <td valign="middle" style="padding:0;">
              <div style="font-size:20px;font-weight:700;line-height:1.3;margin:0;">
                ${v(nAttrs.PRENOM)} ${v(nAttrs.NOM)}
                <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.18);font-size:12px;margin-left:8px;">${formatCivilite(nAttrs.CIVILITE)}</span>
                ${nAttrs.STATUT ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.18);font-size:12px;margin-left:8px;">${nAttrs.STATUT}</span>` : ""}
                ${nAttrs.SCORE != null ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.18);font-size:12px;margin-left:8px;">Score: ${nAttrs.SCORE}</span>` : ""}
              </div>
              <div style="font-size:13px;opacity:.95;margin-top:4px;">
                ${nAttrs.SMS ? ` · ${nAttrs.SMS}` : ""}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 22px;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 10px;">Informations personnelles</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Nom</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${v(nAttrs.NOM)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Prénom</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${formatPrenom(nAttrs.PRENOM)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Email</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${v(email)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Téléphone</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${v(nAttrs.SMS)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Date de naissance</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${formatDate(nAttrs.DATE_NAISSANCE)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Code postal</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${formatCodePostal(nAttrs.CODE_POSTAL)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Nombre d'enfants</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${v(nAttrs.NBR_ENFANTS)}</td></tr>
          <tr><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;width:240px;color:#475569;font-weight:600;">Date de départ souhaitée</td><td style="padding:8px 10px;border-bottom:1px solid #dbe0e6;">${formatDate(nAttrs.SIMULATEUR_DIFFICULTE_DATE_DEPART)}</td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 22px 18px 22px;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 10px;">Questionnaire</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Durant votre carrière, dans combien d'entreprises avez-vous travaillé ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isQ1Highlight(nAttrs.SIMULATEUR_DIFFICULTE_Q1) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q1)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Avez-vous, au cours d'une même période, travaillé dans plusieurs entreprises à la fois ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isOui(nAttrs.SIMULATEUR_DIFFICULTE_Q2) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q2)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Avez-vous travaillé à l'étranger ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isOui(nAttrs.SIMULATEUR_DIFFICULTE_Q3) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q3)}${isOui(nAttrs.SIMULATEUR_DIFFICULTE_Q3) ? '<div style="color:#64748b;font-size:12px;margin-top:6px;">→ A travaillé à l\'étranger.</div>' : ""}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Arrêt maladie, accident du travail ou chômage ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isOui(nAttrs.SIMULATEUR_DIFFICULTE_Q4) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q4)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Fonctionnaire, assimilé ou régimes spéciaux ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isQ5Highlight(nAttrs.SIMULATEUR_DIFFICULTE_Q5) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q5)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Profession libérale / gérant / chef d'entreprise ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isOui(nAttrs.SIMULATEUR_DIFFICULTE_Q6) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q6)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Sources de revenus complémentaires prévues ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;">${formatTags(nAttrs.SIMULATEUR_DIFFICULTE_Q7)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Êtes-vous allé consulter vos relevés de carrière auprès de l'Assurance Retraite et de vos caisses de retraite complémentaire ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isNon(nAttrs.SIMULATEUR_DIFFICULTE_Q8) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q8)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Connaissance du rachat de trimestres ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q9)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Cumul emploi-retraite vs cessation progressive :</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;">${formatTags(nAttrs.SIMULATEUR_DIFFICULTE_Q10)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;width:62%;color:#334155;font-weight:600;">Avez-vous fait le service militaire ?</td><td style="padding:12px 16px;border-bottom:1px solid #d1d5db;${isOui(nAttrs.SIMULATEUR_DIFFICULTE_Q11) ? highlightStyle : ""}">${v(nAttrs.SIMULATEUR_DIFFICULTE_Q11)}</td></tr>
        </table>
      </td>
    </tr>

    <table role="presentation" width="820" cellspacing="0" cellpadding="0" border="0" style="width:820px;max-width:820px;">
      <tr><td height="16" style="line-height:16px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="border-top:2px dashed #cbd5e1;">&nbsp;</td></tr>
      <tr><td height="16" style="line-height:16px;font-size:0;">&nbsp;</td></tr>
    </table>

  </table>
</body>
</html>`;
}
