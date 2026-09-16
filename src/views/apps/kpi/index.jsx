import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Button,
  Table,
  Badge,
  UncontrolledDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
} from "reactstrap";

import { useHistory, useLocation, Link } from "react-router-dom";

import {
  Mail as MailIcon,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  ArrowRight, // Restored
  Briefcase,
  CheckSquare,
} from "react-feather"; // icônes
import KPIModal from "./KPIModal";
import { Plus } from "lucide-react";
// CRM v2 Components
import InboxView from "./components/InboxView";
import AdminView from "./components/AdminView";
import KanbanBoard from "./components/kanban/KanbanBoard.jsx";
import SuiviAvancementBox from "../user/edit/SuiviAvancementBox";

/** =============================
 *  Helpers (token, admin id, date)
 *  =============================*/
const API = axios.create({
  baseURL: `${global.config.server_url}`,
  headers: {
    Accept: "application/json",
  },
});

// Objets (ajout de "Email")

const CALL_ACTIONS = ["Rdv pris", "Mail prestation envoyé", "NUL", "Autre"];
const EMAIL_ACTION = "Email reçu";
const ACTION_OTHER = "Autre";
// Ensemble des actions à afficher dans le graphique/filtre
const ACTIONS_KNOWN = [...CALL_ACTIONS, EMAIL_ACTION];

const ACTION_FILLS = {
  "Rdv pris": "#28a745",
  "Mail prestation envoyé": "#17a2b8",
  NUL: "#dc3545",
  [EMAIL_ACTION]: "#6f42c1",
  [ACTION_OTHER]: "#495057",
};

const ACTION_COLORS = {
  "Rdv pris": "success",
  "Mail prestation envoyé": "info",
  NUL: "danger",
  [EMAIL_ACTION]: "secondary",
  [ACTION_OTHER]: "secondary",
};

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function formatFRPhoneDisplay(input) {
  if (!input) return "";
  const raw = String(input).replace(/\D/g, "");

  // gère 0033 / +33 / 33
  const startsWith0033 = /^0033/.test(input);
  const startsWithPlus33 = /^\+33/.test(input);
  let digits = raw;

  if (startsWith0033) {
    // 0033 + 9 chiffres (on remet un 0 devant)
    digits = "0" + raw.slice(4, 13);
  } else if (startsWithPlus33 || raw.startsWith("33")) {
    // +33XXXXXXXXX ou 33XXXXXXXXX  -> 0XXXXXXXXX
    const after33 = raw.replace(/^33/, "");
    digits = "0" + after33.slice(0, 9);
  } else if (raw.length === 9 && raw[0] !== "0") {
    // numéro sans 0 initial -> on le remet
    digits = "0" + raw;
  } else {
    // cas normal FR -> on limite à 10
    digits = raw.slice(0, 10);
  }

  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

// Pour le href "tel:" propre (E.164)
function formatTelHref(input) {
  if (!input) return "";
  const raw = String(input).replace(/\D/g, "");

  if (/^\+33/.test(input) || raw.startsWith("33")) {
    const n = raw.replace(/^33/, "").slice(0, 9);
    return `+33${n}`;
  }
  if (/^0033/.test(input)) {
    const n = raw.slice(4, 13);
    return `+33${n}`;
  }
  if (raw.startsWith("0")) {
    // 0X XX XX XX XX -> +33 XXXXXXXXX
    return `+33${raw.slice(1, 10)}`;
  }
  // fallback (déjà international)
  return input.toString().startsWith("+") ? input.toString() : `+${raw}`;
}
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
// Retourne le lundi d'une semaine ISO (Date)
function isoWeekStart(isoYear, isoWeek) {
  const simple = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7);
  const dow = (simple.getDay() + 6) % 7; // 0 = lundi
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dow);
  return monday;
}

// Début/fin (lundi → dimanche) d'une semaine ISO
function weekStartEnd(isoYear, isoWeek) {
  const start = isoWeekStart(isoYear, isoWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// Libellé lisible : "Sem. 39 • 23 sept → 29 sept 2025"
// eslint-disable-next-line no-unused-vars
function formatWeekRangeLabel(isoYear, isoWeek) {
  const { start, end } = weekStartEnd(isoYear, isoWeek);
  const day2 = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" });
  const dm = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  const yfmt = new Intl.DateTimeFormat("fr-FR", { year: "numeric" });

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  const range = sameMonth
    ? `${dm.format(start)}–${day2.format(end)} ${yfmt.format(end)}`
    : `${dm.format(start)} → ${dm.format(end)} ${yfmt.format(end)}`;

  return `Sem. ${String(isoWeek).padStart(2, "0")} • ${range}`;
}

// Construit une petite liste de raccourcis (semaines récentes)

// Formatage lisible des dates (gère YYYY-MM-DD et ISO)
function formatDate(input) {
  if (!input) return "";
  try {
    const str = String(input);
    const d = new Date(str.length === 10 ? `${str}T00:00:00` : str);
    if (isNaN(d.getTime())) return str; // fallback brut si invalide
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch (e) {
    return String(input);
  }
}

// Vrai si la date (YYYY-MM-DD ou ISO) est aujourd'hui ou dans le passé
function isDatePastOrToday(input) {
  if (!input) return false;
  try {
    const str = String(input);
    const d = new Date(str.length === 10 ? `${str}T00:00:00` : str);
    if (isNaN(d.getTime())) return false;
    const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dayOnly.getTime() <= today.getTime();
  } catch (e) {
    return false;
  }
}

// Date + heure (fr-FR)
// eslint-disable-next-line no-unused-vars
function formatDateTime(input) {
  if (!input) return "";
  try {
    const str = String(input);
    const d = new Date(str.length === 10 ? `${str}T00:00:00` : str);
    if (isNaN(d.getTime())) return str;
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch (e) {
    return String(input);
  }
}

// Email admin depuis le storage (simple et silencieux)
// eslint-disable-next-line no-unused-vars
function getAdminEmailFromLocal() {
  const direct =
    localStorage.getItem("email") ||
    localStorage.getItem("user_email") ||
    localStorage.getItem("admin_email");
  if (direct) return direct;
  try {
    const u =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(localStorage.getItem("profile") || "null");
    return u?.email || u?.user?.email || null;
  } catch {
    return null;
  }
}

/** Icônes pour l'objet */
const OBJET_ICON = {
  Email: MailIcon,
  "Appel entrant": PhoneIncoming,
  "Appel sortant": PhoneOutgoing,
};
// eslint-disable-next-line no-unused-vars
function renderObjetCell(value) {
  const v = value || "";
  const Icon = OBJET_ICON[v] || PhoneCall;
  return (
    <span className="d-inline-flex align-items-center">
      <Icon size={16} style={{ marginRight: 6, opacity: 0.9 }} />
      {v || <em style={{ opacity: 0.6 }}>(vide)</em>}
    </span>
  );
}

/** Renders v or (vide) */
// eslint-disable-next-line no-unused-vars
function renderNullable(v) {
  return v ? v : <em style={{ opacity: 0.6 }}>(vide)</em>;
}
// eslint-disable-next-line no-unused-vars
function renderEmail(v) {
  return v ? (
    <a href={`mailto:${v}`}>{v}</a>
  ) : (
    <em style={{ opacity: 0.6 }}>(vide)</em>
  );
}
// eslint-disable-next-line no-unused-vars
function renderPhone(v) {
  if (!v) return <em style={{ opacity: 0.6 }}>(vide)</em>;
  const display = formatFRPhoneDisplay(v);
  const href = `tel:${formatTelHref(v)}`;
  return <a href={href}>{display}</a>;
}

/** Badge d'action (light) + puce couleur */
// eslint-disable-next-line no-unused-vars
function renderActionBadge(action) {
  const key = ACTIONS_KNOWN.includes(action)
    ? action
    : action
      ? ACTION_OTHER
      : null;
  if (!key) {
    return <em style={{ opacity: 0.6 }}>(vide)</em>;
  }
  const context = ACTION_COLORS[key] || "secondary";
  const dot = ACTION_FILLS[key] || "#6c757d";
  return (
    <Badge color={`light-${context}`} pill>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dot,
          display: "inline-block",
          marginRight: 6,
        }}
      />
      {action}
    </Badge>
  );
}
const parseServices = (servicesRaw) => {
  if (!servicesRaw) return [];

  return servicesRaw
    .split("/") // ex : "CH / AR / SIMU"
    .map((s) =>
      s
        .replace(/["\\]/g, "") // enlève guillemets / backslashes
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);
};

const getContractTypeLabel = (source) => {
  if (!source) return "Pas de prestation";

  const typeCode = getContractTypeCode(source);
  const services = parseServices(source.subscribe_services);
  const knownCodes = ["CH", "SIMU", "ACTU", "RAC", "AR", "TFD"];
  const filtered = services.filter((s) => knownCodes.includes(s));

  if (typeCode === "credit_impot") {
    if (filtered.length > 0) {
      // Crédit d'impôt (CH / SIMU)
      return `Crédit d'impôt (${filtered.join(" / ")})`;
    }
    return "Crédit d'impôt";
  }

  if (filtered.length > 0) {
    return filtered.join(" / ");
  }

  return "Pas de prestation";
};

const PRODUCT_BADGE_COLORS = {
  credit_impot: "success", // vert
  ar_tfd: "warning", // jaune
  ch_simu_actu_rac: "primary", // bleu
  none: "secondary", // gris
};

// Rendu "Produit" dans la table Suivi des contrats (badge)
function renderProductBadgeFromSuivi(suiviRow) {
  const typeCode = getContractTypeCode(suiviRow);
  const label = getContractTypeLabel(suiviRow);
  const context = PRODUCT_BADGE_COLORS[typeCode] || "secondary";

  return (
    <Badge color={`light-${context}`} pill>
      {label}
    </Badge>
  );
}
const getContractTypeCode = (source) => {
  if (!source) return "none";

  // on suppose que le suivi a les mêmes champs qu'un "contract"
  const unipro = source.unipro;
  const subscribe_services = source.subscribe_services;

  if (unipro === 1 || unipro === "1") {
    return "credit_impot";
  }

  const services = parseServices(subscribe_services);
  const groupCH = ["CH", "SIMU", "ACTU", "RAC"];
  const groupAR = ["AR", "TFD"];

  const hasGroupCH = services.some((s) => groupCH.includes(s));
  const hasGroupAR = services.some((s) => groupAR.includes(s));

  if (hasGroupCH) return "ch_simu_actu_rac";
  if (hasGroupAR) return "ar_tfd";

  return "none";
};

const STEP_DEFINITION = {
  credit_impot: {
    totalSteps: 8,
    dateSteps: [1, 2, 3, 4, 5, 6, 7],
    labels: [
      "Signature du contrat", // 1
      "Activation compte Urssaf", // 2
      "5 jours ouvrés d'attente", // 3
      "Création devis", // 4
      "Transformer devis en facture", // 5
      "Paiement automatique Unipro", // 6
      "Paiement du contrat", // 7
      "Avancement du dossier", // 8
    ],
  },
  ar_tfd: {
    totalSteps: 5,
    dateSteps: [1, 2, 3, 4],
    labels: [
      "Signature du contrat", // 1
      "Création devis", // 2
      "Transformer devis en facture", // 3
      "Paiement du contrat", // 4
      "Avancement du dossier", // 5 (sans date)
    ],
  },
  ch_simu_actu_rac: {
    totalSteps: 5,
    dateSteps: [1, 2, 3, 4],
    labels: [
      "Étape 1", // 1
      "Prise de RDV", // 2
      "Facturation", // 3
      "Paiement du contrat", // 4
      "Avancement du dossier", // 5
    ],
  },
  none: {
    totalSteps: 0,
    dateSteps: [],
    labels: [],
  },
};
function getClientDisplayNameFromSuivi(suiviRow, clientsMap) {
  const clientId = suiviRow?.client_id;
  if (!clientId) return "Client inconnu";

  // Si on a la data dans la map, priorité
  const fromMap = clientsMap?.[clientId];
  if (fromMap && fromMap.trim() !== "") return fromMap;

  // Fallback sur les champs renvoyés dans le suivi (au cas où)
  const full =
    suiviRow?.client_full_name ||
    suiviRow?.client_name ||
    [suiviRow?.client_first_name, suiviRow?.client_last_name]
      .filter(Boolean)
      .join(" ") ||
    suiviRow?.client ||
    null;

  if (full && full.trim() !== "") return full;

  // Dernier recours : ID
  return `Client #${clientId}`;
}

// Récupère la "clé produit" à partir du suivi (document)
// Récupère la "clé produit" (credit_impot / ar_tfd / ch_simu_actu_rac / none)
function getStepProfileKeyFromSuivi(suiviRow) {
  const contract = {
    unipro: suiviRow?.unipro,
    subscribe_services: suiviRow?.subscribe_services,
  };

  const code = getContractTypeCode(contract);
  return STEP_DEFINITION[code] ? code : "none";
}

function getLastAndNextSteps(steps = []) {
  if (!steps || steps.length === 0) {
    return { last: null, next: null };
  }

  const sorted = [...steps].sort((a, b) => a.index - b.index);

  const completed = sorted.filter((s) => s.completed);
  const last = completed.length ? completed[completed.length - 1] : null;

  let next = null;
  if (!last) {
    next = sorted[0] || null;
  } else {
    next = sorted.find((s) => s.index > last.index) || null;
  }

  return { last, next };
}

// Construit un tableau d'étapes pour un suivi donné
function buildStepsForSuivi(suiviRow) {
  const profileKey = getStepProfileKeyFromSuivi(suiviRow);
  const config = STEP_DEFINITION[profileKey] || STEP_DEFINITION.none;

  const steps = [];
  // Pour ch_simu_actu_rac : on ne montre pas la step 1, on commence à 2
  const startIndex = profileKey === "ch_simu_actu_rac" ? 2 : 1;

  for (let i = startIndex; i <= config.totalSteps; i++) {
    const label = config.labels[i - 1] || `Étape ${i}`;
    const dateField = `step${i}_completed_at`;
    const dateVal = suiviRow[dateField] || null;
    const hasDate = !!dateVal;

    steps.push({
      index: i,
      label,
      date: dateVal,
      hasDate,
      isDatedStep: config.dateSteps.includes(i),
      completed: hasDate && config.dateSteps.includes(i),
    });
  }
  return { profileKey, config, steps };
}

const todoBadgeWrapper = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const todoDot = {};

const todoMainText = {
  fontSize: 14,
  fontWeight: 400,
  color: "#212529",
};

const todoSubText = {
  fontSize: 12,
  color: "#212529",
};

function renderTodoCell(next, badge = null, isLate = false) {
  if (!next) {
    return (
      <span className="text-success" style={{ fontSize: 14 }}>
        Dossier terminé
      </span>
    );
  }

  let sub = "";
  if (next.isDatedStep && !next.date) sub = "À planifier";
  else if (!next.isDatedStep) sub = "Étape de suivi";

  // Si l'échéance est dépassée (date en rouge dans la colonne "Dernière étape"),
  // on remplace "À planifier" par "En retard" (en rouge).
  const isOverdue = isLate && sub === "À planifier";
  if (isOverdue) sub = "En retard";

  return (
    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={todoMainText}>{next.label}</span>
      {sub && (
        <>
          <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
          <span style={{ fontSize: 13, color: isOverdue ? "#ea5455" : "#6e6b7b" }}>{sub}</span>
        </>
      )}
      {badge && (
        <>
          <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
          <span style={{ fontSize: 13, color: "#6e6b7b" }}>{badge}</span>
        </>
      )}
    </span>
  );
}

/** =============================
 *  UI bits
 *  =============================*/

export default function KpiPage() {
  // Création KPI
  const history = useHistory();
  const location = useLocation();

  const [objet, setObjet] = useState("Appel entrant");
  const [activeFilter, setActiveFilter] = useState("active"); // "active" | "processing" | "completed"
  const showProcessing = activeFilter === "processing";
  const showCompleted = activeFilter === "completed";

  const [creating, setCreating] = useState(false);
  const toggleModal = () => setCreating(!creating);
  const adminId = localStorage.getItem("userid");
  const [error, setError] = useState("");

  const [sortField, setSortField] = useState("client"); // client | todo | last | type
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [adminSearch, setAdminSearch] = useState(""); // Search for AdminView
  const [selectedStep, setSelectedStep] = useState(""); // Filter by step ("À faire")

  // >>> Nouveaux champs contact (optionnels)
  const [action, setAction] = useState("");
  const [kpiDate, setKpiDate] = useState(todayStr());
  const [nomPrenom, setNomPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [note, setNote] = useState("");

  // eslint-disable-next-line no-unused-vars
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [allItems, setAllItems] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loadingChart, setLoadingChart] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [page, setPage] = useState(1);
  // eslint-disable-next-line no-unused-vars
  const [lastPage, setLastPage] = useState(1);

  // Email admin (local + API)
  // eslint-disable-next-line no-unused-vars
  const [adminEmailLocal, setAdminEmailLocal] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [adminEmailApi, setAdminEmailApi] = useState("");

  // Utilisateurs (admin -> nom/prénom)
  const [usersById, setUsersById] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Clients
  const [clientsById, setClientsById] = useState({});

  // Suivis d'avancement (backend Laravel)
  const [suivis, setSuivis] = useState([]);
  const [loadingSuivis, setLoadingSuivis] = useState(false);
  const [suivisError, setSuivisError] = useState("");

  // Contrats (documents) pour les alertes paiement
  const [contractsMap, setContractsMap] = useState({});

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [convError, setConvError] = useState("");

  // Diagnostic Results (simulator-difficulty-results)
  const [diagnostics, setDiagnostics] = useState([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [diagError, setDiagError] = useState("");

  // Inbound emails (source=cf7 only, last ~20d, read+unread) — Mails/contacts
  const [inboundEmails, setInboundEmails] = useState([]);
  const [loadingInboundEmails, setLoadingInboundEmails] = useState(false);
  const [inboundEmailError, setInboundEmailError] = useState("");

  // Call notes from Leads/Mail bandeau Appeler (call_report table)
  const [callReports, setCallReports] = useState([]);
  const [loadingCallReports, setLoadingCallReports] = useState(false);

  const handleSort = (field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        // on toggle juste le sens
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      }
      // on change de colonne, on repart en asc
      setSortDir("asc");
      return field;
    });
  };

  // Modal messages conversations
  // eslint-disable-next-line no-unused-vars
  const [convModalOpen, setConvModalOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);

  const handleSelectConversation = (id) => {
    // Check if it's a diagnostic to fetch details
    const isDiag = diagnostics.some((d) => d.id === id);
    if (isDiag) {
      fetchDiagnosticDetail(id);
    }
    // Add other types if needed
  };

  // Dropdown state for New Button
  // eslint-disable-next-line no-unused-vars
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    }
    return (
      <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  };

  const headerClickableStyle = {
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  // =========================================================================================
  // FONCTIONS DE FETCH (Définies APRÈS les useState pour avoir accès aux setters)
  // =========================================================================================

  async function fetchKpis(p = 1) {
    try {
      setLoadingList(true);
      setError("");

      const res = await API.get("/kpis", {
        params: p > 1 ? { page: p } : {},
      });

      const payload = res.data;
      const data = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      setItems(data);

      const lp = payload?.last_page || payload?.meta?.last_page || 1;
      setLastPage(lp);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          "Erreur lors du chargement des KPI. Vérifie l'API.",
      );
    } finally {
      setLoadingList(false);
    }
  }

  async function fetchSuivis() {
    try {
      setLoadingSuivis(true);
      setSuivisError("");

      const res = await API.get("/suivi-avancement/all");
      const data = Array.isArray(res.data)
        ? res.data.filter((s) => s.client_id)
        : [];
      setSuivis(data);
    } catch (e) {
      console.error(e);
      setSuivisError(
        e?.response?.data?.message ||
          "Erreur lors du chargement des suivis d'avancement.",
      );
    } finally {
      setLoadingSuivis(false);
    }
  }

  async function fetchContracts() {
    try {
      const res = await API.get("/documents");
      const list = Array.isArray(res.data) ? res.data : [];
      const map = {};
      list.forEach((doc) => {
        if (doc.id) map[doc.id] = doc;
      });
      setContractsMap(map);
    } catch (e) {
      console.error("fetchContracts error:", e);
    }
  }

  async function fetchConversationArchives() {
    try {
      setLoadingConversations(true);
      setConvError("");
      let p = 1;
      let aggregated = [];
      let maxPage = 1;

      do {
        const res = await API.get("/conversation-archives", {
          params: { page: p },
        });
        const payload = res.data || {};
        const data = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        aggregated = aggregated.concat(data);
        setConversations([...aggregated]);

        maxPage = payload.last_page || payload.meta?.last_page || 1;
        if (Array.isArray(payload)) maxPage = 1;
        p += 1;
        if (p > 100) break;
      } while (p <= maxPage);
    } catch (e) {
      console.error("fetchConversationArchives error:", e);
      setConvError("Impossible de charger les conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function fetchDiagnosticResults() {
    try {
      setLoadingDiagnostics(true);
      setDiagError("");
      let p = 1;
      let aggregated = [];
      let maxPage = 1;

      do {
        const res = await API.get("/v1/simulator-difficulty-results", {
          params: { page: p },
        });
        const payload = res.data || {};
        const data = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        aggregated = aggregated.concat(data);
        setDiagnostics([...aggregated]);

        maxPage = payload.last_page || payload.meta?.last_page || 1;
        if (Array.isArray(payload)) maxPage = 1;
        p += 1;
        if (p > 100) break;
      } while (p <= maxPage);
    } catch (e) {
      console.error("fetchDiagnosticResults error:", e);
      setDiagError("Impossible de charger les diagnostics.");
    } finally {
      setLoadingDiagnostics(false);
    }
  }

  async function fetchDiagnosticDetail(id) {
    try {
      const res = await API.get(`/v1/simulator-difficulty-results/${id}`);
      const payload = res.data;
      const data = payload?.data || payload;

      if (data && data.id) {
        setDiagnostics((prev) => {
          const exists = prev.find((d) => d.id === data.id);
          if (exists) {
            // Update existing
            return prev.map((d) => (d.id === data.id ? data : d));
          } else {
            // Should not happen usually as we select from list, but safe to add
            return [...prev, data];
          }
        });
      }
    } catch (e) {
      console.error("fetchDiagnosticDetail error:", e);
    }
  }

  async function fetchAllKpis() {
    try {
      setLoadingChart(true);
      setError("");

      let p = 1;
      let aggregated = [];
      let maxPage = 1;

      do {
        const res = await API.get("/kpis", {
          params: { page: p },
        });
        const payload = res.data;
        const data = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        aggregated = aggregated.concat(data);

        // Update allItems incrementally for better UX
        setAllItems([...aggregated]);

        // Update maxPage from payload metadata if available
        const metaMax =
          payload?.last_page ||
          payload?.meta?.last_page ||
          payload?.meta?.pagination?.total_pages;
        maxPage = metaMax || 1;

        // If it's a flat array, we already have everything
        if (Array.isArray(payload)) maxPage = 1;

        p += 1;
        // Safety break
        if (p > 500) break;
      } while (p <= maxPage);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Erreur lors du chargement complet des KPI pour le graphique.",
      );
    } finally {
      setLoadingChart(false);
    }
  }

  async function fetchClients() {
    try {
      const res = await API.get("/users", {
        // adapte si ton backend attend plutôt ?kind=client
        params: { role: "Client" },
      });

      const payload = res.data;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const map = {};
      list.forEach((u) => {
        const id = u.id;
        if (!id) return;

        const first =
          u.first_name ?? u.firstname ?? u.firstName ?? u.prenom ?? "";
        const last = u.last_name ?? u.lastname ?? u.lastName ?? u.nom ?? "";
        const fallback = u.name ?? u.email ?? `Client #${id}`;
        const name = `${first} ${last}`.trim() || fallback;
        map[id] = name;
      });

      setClientsById(map);
    } catch (e) {
      console.error("fetchClients error:", e);
      // on ne bloque pas l'écran si ça foire, on garde juste le fallback Client #ID
    }
  }

  async function fetchMembers() {
    try {
      setLoadingUsers(true);

      const res = await API.get("/users", {
        params: { kind: "member" },
      });

      const payload = res.data;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const map = {};
      list.forEach((u) => {
        const id = u.id ?? u.user_id ?? u._id;
        if (!id) return;
        const first =
          u.first_name ?? u.firstname ?? u.firstName ?? u.prenom ?? "";
        const last = u.last_name ?? u.lastname ?? u.lastName ?? u.nom ?? "";
        const fallback = u.name ?? u.username ?? u.email ?? String(id);
        const name = `${first} ${last}`.trim() || fallback;
        map[id] = name;
      });
      setUsersById(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchAdminEmailFromApi() {
    try {
      if (!adminId) return;

      const res = await API.get(`/users/${adminId}`, {
        params: { id: adminId },
      });

      const payload = res.data || {};
      const email =
        payload.email || payload?.data?.email || payload?.user?.email || null;

      if (email) setAdminEmailApi(email);
    } catch (e) {
      if (e?.response?.status === 404) {
        console.debug("Admin user not found, skipping email fetch");
        return;
      }
      console.error("fetchAdminEmailFromApi error:", e);
    }
  }

  async function createKpi(dataBody) {
    try {
      setCreating(true);
      setError("");

      const body = {
        objet: dataBody?.objet || objet || null,
        action:
          dataBody?.objet === "Email" || objet === "Email"
            ? EMAIL_ACTION
            : dataBody?.action || action || "Autre",
        kpi_date: dataBody?.kpi_date || kpiDate || todayStr(),
        nom_prenom: dataBody?.nom_prenom || nomPrenom || null,
        email: dataBody?.email || email || null,
        telephone: dataBody?.telephone || telephone || null,
        note: dataBody?.note || note || null,
      };

      if (adminId) body.admin_id = adminId;

      await API.post("/kpis", body);
      setPage(1);
      await fetchKpis(1);
      await fetchAllKpis();

      // reset des champs
      setObjet("Appel entrant");
      setAction("");
      setKpiDate(todayStr());
      setNomPrenom("");
      setEmail("");
      setTelephone("");
      setNote("");
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Impossible de créer le KPI.",
      );
    } finally {
      setCreating(false);
    }
  }


  async function fetchInboundEmails() {
    try {
      setLoadingInboundEmails(true);
      setInboundEmailError("");
      const perPage = 200;
      let page = 1;
      let last = 1;
      const aggregated = [];
      // HARD Cap'tain: Mail list = last ~20 days, source=cf7, read AND unread
      const from20 = new Date();
      from20.setDate(from20.getDate() - 20);
      const fromIso = from20.toISOString().slice(0, 19).replace("T", " ");
      do {
        const res = await API.get("/inbound-emails", {
          params: { source: "cf7", from: fromIso, per_page: perPage, page },
        });
        const payload = res.data;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        aggregated.push(...rows);
        last = Number(payload?.last_page || payload?.meta?.last_page || 1);
        page += 1;
      } while (page <= last && page <= 20);
      setInboundEmails(aggregated);
    } catch (e) {
      console.error("fetchInboundEmails error:", e);
      setInboundEmailError("Impossible de charger les mails entrants.");
      setInboundEmails([]);
    } finally {
      setLoadingInboundEmails(false);
    }
  }

  async function fetchCallReports() {
    try {
      setLoadingCallReports(true);
      const perPage = 50;
      let page = 1;
      let last = 1;
      const aggregated = [];
      do {
        const res = await API.get("/v1/call-reports", {
          params: { per_page: perPage, page },
        });
        const payload = res.data;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        aggregated.push(...rows);
        last = Number(payload?.last_page || payload?.meta?.last_page || 1);
        page += 1;
      } while (page <= last && page <= 50);
      setCallReports(aggregated);
    } catch (e) {
      console.error("fetchCallReports error:", e);
      setCallReports([]);
    } finally {
      setLoadingCallReports(false);
    }
  }

  // Effets de chargement
  useEffect(() => {
    fetchKpis(1);
    fetchAllKpis();
    fetchAdminEmailFromApi();
    fetchSuivis();
    fetchContracts();
    fetchMembers();
    fetchClients();
    fetchConversationArchives();
    fetchDiagnosticResults();
    fetchInboundEmails();
    fetchCallReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate unique step filter options from STEP_DEFINITION
  const stepFilterOptions = useMemo(() => {
    const allLabels = [];
    Object.keys(STEP_DEFINITION).forEach((key) => {
      if (key === "none") return;
      const labels = STEP_DEFINITION[key]?.labels || [];
      allLabels.push(...labels);
    });
    // Remove duplicates using Set, then sort alphabetically
    return [...new Set(allLabels)].sort((a, b) => a.localeCompare(b, "fr"));
  }, []);

  const sortedSuivis = useMemo(() => {
    if (!Array.isArray(suivis)) return [];

    let data = [...suivis];

    // Filter by adminSearch (client name)
    if (adminSearch) {
      const lower = adminSearch.toLowerCase();
      data = data.filter((s) => {
        const name = getClientDisplayNameFromSuivi(s, clientsById) || "";
        return name.toLowerCase().includes(lower);
      });
    }

    // Filter by selectedStep ("À faire" column)
    if (selectedStep) {
      data = data.filter((s) => {
        const { steps } = buildStepsForSuivi(s);
        const { next } = getLastAndNextSteps(steps);
        return next && next.label === selectedStep;
      });
    }

    const getSortKey = (s) => {
      switch (sortField) {
        case "client": {
          const label = getClientDisplayNameFromSuivi(s, clientsById);
          return (label || "").toLowerCase();
        }
        case "todo": {
          const { steps } = buildStepsForSuivi(s);
          const { next } = getLastAndNextSteps(steps);
          if (!next) return "zzz"; // dossiers terminés à la fin
          return (next.label || "").toLowerCase();
        }
        case "last": {
          const { steps } = buildStepsForSuivi(s);
          const { last } = getLastAndNextSteps(steps);
          // on trie d'abord par date si dispo
          if (last && last.date) return last.date;
          if (last && last.label) return last.label.toLowerCase();
          return "";
        }
        case "type": {
          const label = getContractTypeLabel(s);
          return (label || "").toLowerCase();
        }
        default:
          return "";
      }
    };

    data.sort((a, b) => {
      const ka = getSortKey(a);
      const kb = getSortKey(b);

      if (ka < kb) return sortDir === "asc" ? -1 : 1;
      if (ka > kb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [suivis, clientsById, sortField, sortDir, adminSearch, selectedStep]);
  const groupedSuivis = useMemo(() => {
    const res = {
      active: [], // par défaut
      creationDevis: [], // 🔴 Création devis - Urgent (tout en haut)
      suivi: [], // Bucket spécifique demandé (ex: AR/TFD creation devis)
      facturation: [], // Facturation (Urgent)
      after5days: [], // 5 jours atteints / dépassés
      processing: [], // Paiement du contrat -> Avancement du dossier
      completed: [], // Contrats terminés
      paymentAlerts: [], // 🔴 Paiements à lancer (échéances atteintes)
      relance: [], // 🟠 Contrats envoyés > 7 jours sans signature
    };

    if (!Array.isArray(sortedSuivis)) return res;

    // "Aujourd'hui" tronqué à minuit pour comparer les dates proprement
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper : parse une date YYYY-MM-DD en timestamp minuit
    const parseDateToTime = (dateStr) => {
      if (!dateStr) return null;
      let part = String(dateStr);
      if (part.includes("T")) part = part.split("T")[0];
      else if (part.includes(" ")) part = part.split(" ")[0];
      const [y, m, d] = part.split("-");
      if (y && m && d)
        return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
      return null;
    };

    sortedSuivis.forEach((s) => {
      const { steps } = buildStepsForSuivi(s);
      const { last, next } = getLastAndNextSteps(steps);

      const contract = s.contract || s;
      const isContractFinished =
        contract && contract.document_state === "Terminé";

      const isProcessing =
        last &&
        last.label === "Paiement du contrat" &&
        next &&
        next.label === "Avancement du dossier";

      // 🔴 Création devis : URGENT pour TOUS les profils
      let isCreationDevis = false;
      if (!isContractFinished && next && next.label === "Création devis") {
        isCreationDevis = true;
      }

      // 🔴 Cas Facturation : Urgent seulement si le jour du RDV est arrivé
      let isFacturationUrgent = false;
      let isRdvToday = false;
      if (
        !isContractFinished &&
        next &&
        next.label === "Facturation" &&
        last &&
        last.label === "Prise de RDV"
      ) {
        if (last.date) {
          const rawLastRdv = String(last.date);
          let datePartLastRdv = rawLastRdv;
          if (rawLastRdv.includes("T"))
            datePartLastRdv = rawLastRdv.split("T")[0];
          else if (rawLastRdv.includes(" "))
            datePartLastRdv = rawLastRdv.split(" ")[0];

          const [y, m, d] = datePartLastRdv.split("-");
          if (y && m && d) {
            const rdvDate = new Date(Number(y), Number(m) - 1, Number(d));
            const rdvOnly = new Date(
              rdvDate.getFullYear(),
              rdvDate.getMonth(),
              rdvDate.getDate(),
            );

            if (rdvOnly.getTime() <= today.getTime()) {
              isFacturationUrgent = true;
              if (rdvOnly.getTime() === today.getTime()) {
                isRdvToday = true;
              }
            }
          }
        } else {
          isFacturationUrgent = true;
        }
      }

      // 🔴 Alerte Paiement : 2ème+ paiement en attente dont la date est atteinte
      let paymentAlertLabel = null;
      let paymentAlertAmount = null;
      if (!isContractFinished) {
        const docId = s.facture_id || s.document_id || s.contract_id;
        const doc = docId ? contractsMap[docId] : null;
        if (doc) {
          // Parse acompte_dates et sold_dates
          let acompteDates = [];
          try {
            acompteDates = Array.isArray(doc.acompte_dates)
              ? doc.acompte_dates
              : doc.acompte_dates
                ? JSON.parse(doc.acompte_dates)
                : [];
          } catch (e) {
            acompteDates = [];
          }

          let soldDates = [];
          try {
            soldDates = Array.isArray(doc.sold_dates)
              ? doc.sold_dates
              : doc.sold_dates
                ? JSON.parse(doc.sold_dates)
                : [];
          } catch (e) {
            soldDates = [];
          }

          // Construire la liste complète des paiements dans l'ordre
          // Chaque entrée : { type, date, is_paid, method }
          const allPayments = [
            ...acompteDates.map((p) => ({ ...p, _type: "ACOMPTE" })),
            ...soldDates.map((p) => ({ ...p, _type: "SOLDE" })),
          ];

          // Il faut > 1 paiement au total
          if (allPayments.length > 1) {
            // On cherche à partir de l'index 1 (2ème paiement)
            for (let i = 1; i < allPayments.length; i++) {
              const payment = allPayments[i];
              const isPaid = payment.is_paid === true || payment.is_paid === 1;
              if (isPaid) continue;

              const paymentTime = parseDateToTime(payment.date);
              if (paymentTime && paymentTime <= today.getTime()) {
                // Paiement en attente dont la date est arrivée
                const position = i + 1; // Position humaine (1-based)
                paymentAlertLabel = `Lancement du ${position}${position === 1 ? "er" : "ème"} paiement`;

                // Calculer le montant approximatif
                const totalTTC = parseFloat(doc.advanced_payment) || 0;
                const fp1 = doc.values ? JSON.parse(doc.values).fp1 || 50 : 50;
                if (payment._type === "ACOMPTE") {
                  paymentAlertAmount = Math.round(
                    (totalTTC * fp1) / 100 / acompteDates.length,
                  );
                } else {
                  paymentAlertAmount = Math.round(
                    (totalTTC * (100 - fp1)) / 100 / (soldDates.length || 1),
                  );
                }
                break; // On s'arrête au premier paiement en attente trouvé
              }
            }
          }
        }
      }

      // Si alerte paiement détectée, priorité sur les autres buckets (sauf completed)
      if (paymentAlertLabel && !isContractFinished) {
        res.paymentAlerts.push({
          s,
          steps,
          last,
          next,
          isRdvToday,
          paymentAlertLabel,
          paymentAlertAmount,
        });
        return;
      }

      // 🟠 Relance contrat : envoi fait > 7 jours, signature non faite
      let isRelance = false;
      let relanceEnvoiDate = null;
      if (!isContractFinished) {
        const profileKey = getStepProfileKeyFromSuivi(s);
        // "Envoi du contrat" → step8 for credit_impot, step6 for ar_tfd
        if (profileKey === "credit_impot") {
          relanceEnvoiDate = s.step8_completed_at;
        } else if (profileKey === "ar_tfd") {
          relanceEnvoiDate = s.step6_completed_at;
        }
        const signatureDate = s.step1_completed_at; // "Signature du contrat"

        if (relanceEnvoiDate && !signatureDate) {
          const envoiTime = parseDateToTime(relanceEnvoiDate);
          if (envoiTime) {
            const sevenDaysLater = new Date(envoiTime);
            sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
            if (sevenDaysLater.getTime() <= today.getTime()) {
              isRelance = true;
            }
          }
        }
      }

      // Relance prioritaire sur les buckets normaux (sauf completed/payment)
      if (isRelance) {
        res.relance.push({
          s,
          steps,
          last,
          next,
          isRdvToday,
          relanceEnvoiDate,
        });
        return;
      }

      const bucket = isContractFinished
        ? "completed"
        : isCreationDevis
          ? "creationDevis"
          : isFacturationUrgent
            ? "facturation"
            : isProcessing
              ? "processing"
              : "active";

      res[bucket].push({ s, steps, last, next, isRdvToday });
    });

    return res;
  }, [sortedSuivis, contractsMap]);
  const [selectedSuivi, setSelectedSuivi] = useState(null);

  // Initial select first item if available and none selected
  useEffect(() => {
    // Only set if we have items and nothing is selected yet
    if (!selectedSuivi && sortedSuivis.length > 0) {
      setSelectedSuivi(sortedSuivis[0]);
    }
  }, [sortedSuivis, selectedSuivi]);

  // --- RENDER HELPERS ---

  // eslint-disable-next-line no-unused-vars
  const renderConversationItem = (conv) => {
    // conv structure usually: { id, user_id, status, created_at, user: { firstname, lastname }, ... }
    const isSelected = selectedConv && selectedConv.id === conv.id;

    // Name fallback
    let name = "Anonyme";

    // 1. Try direct user object (if populated properly)
    if (conv.user && (conv.user.firstname || conv.user.lastname)) {
      name = `${conv.user.firstname || ""} ${conv.user.lastname || ""}`.trim();
    }
    // 2. Try clientsById lookup (using client_id from fallback logic)
    else if (conv.client_id && clientsById[conv.client_id]) {
      name = clientsById[conv.client_id];
    }
    // 3. Try usersById lookup (using user_id)
    else if (conv.user_id && usersById[conv.user_id]) {
      name = usersById[conv.user_id];
    }
    // 4. Fallback to ID
    else if (conv.client_id) {
      name = `Client #${conv.client_id}`;
    } else if (conv.user_id) {
      name = `User #${conv.user_id}`;
    }

    const dateDisplay = conv.created_at ? formatDate(conv.created_at) : "";

    // Status color
    const statusColors = {
      "en attente": "warning",
      traité: "success",
      archivé: "secondary",
    };
    const sColor = statusColors[conv.status] || "primary";

    return (
      <div
        key={conv.id}
        onClick={() => setSelectedConv(conv)}
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #f0f0f0",
          cursor: "pointer",
          backgroundColor: isSelected ? "#f8f9fa" : "white",
          borderLeft: isSelected
            ? "3px solid #7367F0"
            : "3px solid transparent",
          transition: "all 0.2s ease",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span
            className="font-weight-bold text-dark font-small-3"
            style={{ margin: 0 }}
          >
            {name}
          </span>
          <span
            className="text-muted font-small-1"
            style={{
              whiteSpace: "nowrap",
            }}
          >
            {dateDisplay}
          </span>
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#666",
            marginBottom: "6px",
            // overflow: "hidden", textOverflow: "ellipsis" // removed for clearer multiline if needed
          }}
        >
          {/* Show a snippet or status */}
          <Badge color={`light-${sColor}`} pill className="px-2">
            {conv.status || "Nouveau"}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div
      className="kpi-page-container"
      style={{
        paddingBottom: 50,
        overflow: "visible",
      }}
    >
      <header
        className="kpi-header"
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          position: "relative",
          zIndex: 50,
          borderRadius: "8px",
          margin: "0 0 20px 0",
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          <span style={{ color: "#6b7280", fontSize: "14px" }}>CRM</span>
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>{">"}</span>
          <span
            className="font-semibold text-gray-800"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#1f2937",
              textTransform: "capitalize",
            }}
          >
            {location.pathname.includes("/kpi/suivi")
              ? "Suivi Administratif"
              : location.pathname.includes("/kpi/opportunities")
                ? "Opportunités"
                : location.pathname.includes("/kpi/clients")
                  ? "Clients"
                  : location.pathname.includes("/inbox/email")
                    ? "Mails / contacts"
                    : "Boîte De Réception"}
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <UncontrolledDropdown>
            <DropdownToggle
              tag="button"
              className="d-flex align-items-center gap-3 border-0"
              style={{
                backgroundColor: "#22C55E",
                color: "white",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: 500,
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#16a34a")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#22C55E")
              }
            >
              <Plus size={16} />
              <span>NOUVEAU</span>
            </DropdownToggle>
            <DropdownMenu
              className="dropdown-menu-end"
              style={{
                border: "1px solid #f3f4f6",
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
                padding: "4px",
                width: "160px",
                minWidth: "auto",
              }}
            >
              <DropdownItem
                onClick={() => toggleModal()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                <PhoneIncoming
                  size={16}
                  className="text-green-600"
                  style={{ color: "#16a34a" }}
                />
                <span>Appel Entrant</span>
              </DropdownItem>
              <DropdownItem
                onClick={() => history.push("/app/user/createUser")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                <Briefcase
                  size={16}
                  className="text-indigo-600"
                  style={{ color: "#4f46e5" }}
                />
                <span>Nouveau Client</span>
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  window.alert("Fonctionnalité 'Créer une tâche' à venir !")
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                <CheckSquare
                  size={16}
                  className="text-gray-500"
                  style={{ color: "#6b7280" }}
                />
                <span>Créer une tâche</span>
              </DropdownItem>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      </header>
      {location.pathname.includes("/kpi/suivi") && (
        <AdminView
          searchTerm={adminSearch}
          onSearchChange={setAdminSearch}
          stepFilterOptions={stepFilterOptions}
          selectedStep={selectedStep}
          onStepChange={setSelectedStep}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        >
          <div style={{ padding: "0 4px" }}>
            {/* ====== Suivis d'avancement (ANCIENNE TABLE) ====== */}
            <div className="w-100">
              {suivisError && (
                <div
                  style={{
                    background: "#ffe9e9",
                    border: "1px solid #ffb3b3",
                    color: "#b10000",
                    padding: 10,
                    borderRadius: 6,
                    marginBottom: 14,
                  }}
                >
                  {suivisError}
                </div>
              )}

              <style>{`
                .suivi-table td { padding: 0.85rem 0.75rem !important; vertical-align: middle !important; height: 52px; }
                .suivi-table th { padding: 0.85rem 0.75rem !important; vertical-align: middle !important; }
                .suivi-table thead th:hover { background-color: #f3f2f7 !important; cursor: pointer; }
                .suivi-table tbody td { color: #212529 !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 0; }
                .suivi-table tbody .text-muted { color: #212529 !important; }
                .suivi-table tbody .text-success { color: #212529 !important; }

                /* ── Responsive suivi-table ── */
                /* min-width inline (720px) force overflow du wrapper div → scroll horizontal */
                @media (max-width: 992px) {
                  /* Masquer colonne Contrat (5e) sur tablette */
                  .suivi-table th:nth-child(5),
                  .suivi-table td:nth-child(5) { display: none !important; }
                  .suivi-table { min-width: 560px !important; }
                }
                @media (max-width: 768px) {
                  /* Masquer Dernière étape (3e), Type (4e), Contrat (5e) sur mobile */
                  .suivi-table th:nth-child(3),
                  .suivi-table td:nth-child(3),
                  .suivi-table th:nth-child(4),
                  .suivi-table td:nth-child(4),
                  .suivi-table th:nth-child(5),
                  .suivi-table td:nth-child(5) { display: none !important; }
                  /* Redistribuer les 2 colonnes restantes */
                  .suivi-table th:nth-child(1),
                  .suivi-table td:nth-child(1) { width: 35% !important; }
                  .suivi-table th:nth-child(2),
                  .suivi-table td:nth-child(2) { width: 65% !important; }
                  /* 2 colonnes — fit dans l'écran, pas de scroll horizontal */
                  .suivi-table { min-width: 0 !important; width: 100% !important; }
                  .suivi-table tbody td { white-space: normal !important; word-break: break-word !important; }
                  .suivi-table td { padding: 0.6rem 0.5rem !important; height: auto !important; }
                  .suivi-table th { padding: 0.6rem 0.5rem !important; }
                }
                @media (max-width: 480px) {
                  .suivi-table { font-size: 13px !important; }
                }
              `}</style>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
              <Table hover className="suivi-table" style={{ fontSize: 14, fontWeight: 400, tableLayout: "fixed", minWidth: "720px", width: "100%" }}>
                <thead style={{ fontSize: 14, fontWeight: 400, color: "#6e6b7b" }}>
                  <tr>
                    <th
                      style={{ ...headerClickableStyle, width: "18%" }}
                      onClick={() => handleSort("client")}
                    >
                      Client
                      {renderSortIcon("client")}
                    </th>
                    <th
                      style={{ ...headerClickableStyle, width: "28%" }}
                      onClick={() => handleSort("todo")}
                    >
                      À faire
                      {renderSortIcon("todo")}
                    </th>
                    <th
                      style={{ ...headerClickableStyle, width: "25%" }}
                      onClick={() => handleSort("last")}
                    >
                      Dernière étape
                      {renderSortIcon("last")}
                    </th>
                    <th
                      style={{ ...headerClickableStyle, width: "18%" }}
                      onClick={() => handleSort("type")}
                    >
                      Type
                      {renderSortIcon("type")}
                    </th>
                    <th style={{ width: "11%" }}>Contrat</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSuivis ? (
                    <tr>
                      <td colSpan="5">Chargement des suivis…</td>
                    </tr>
                  ) : (
                    <>
                      {/* Determine if any filter is active */}
                      {(() => {
                        const noFilterActive =
                          !showProcessing && !showCompleted;
                        return (
                          <>
                            {/* 0.0) Création devis - Urgent (TOUT EN HAUT) */}
                            {noFilterActive &&
                              groupedSuivis.creationDevis.length > 0 && (
                                <>
                                  <tr style={{ backgroundColor: "#fff" }}>
                                    <td
                                      colSpan="5"
                                      style={{ paddingTop: 16, paddingBottom: 4, border: "none" }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#dc2626", flexShrink: 0 }} />
                                        Création devis
                                      </span>
                                    </td>
                                  </tr>

                                  {groupedSuivis.creationDevis.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById,
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`cdevis-${
                                            s.suivi_id || s.id || ""
                                          }-${
                                            s.document_id || s.facture_id || ""
                                          }`}
                                          onClick={() => {
                                            setSelectedSuivi(s);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          {/* Client */}
                                          <td>
                                            {clientId ? (
                                              <Link
                                                to={`/app/user/edit/${clientId}/2`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "inherit", textDecoration: "underline" }}
                                              >
                                                {clientLabel}
                                              </Link>
                                            ) : (
                                              clientLabel
                                            )}
                                          </td>

                                          {/* À faire */}
                                          <td>{renderTodoCell(next, null, isDatePastOrToday(last && last.date))}</td>

                                          {/* Dernière étape validée */}
                                          <td>
                                            {last ? (
                                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {last.label}
                                                {last.date && (
                                                  <>
                                                    <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                    <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                                  </>
                                                )}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                Aucune étape validée
                                              </span>
                                            )}
                                          </td>

                                          {/* Type de contrat */}
                                          <td
                                            style={{
                                              whiteSpace: "nowrap",
                                              width: 160,
                                            }}
                                          >
                                            {renderProductBadgeFromSuivi(s)}
                                          </td>

                                          {/* Contrat (flèche) */}
                                          <td
                                            style={{
                                              width: 60,
                                              textAlign: "center",
                                            }}
                                          >
                                            {contractId ? (
                                              <Button
                                                color="link"
                                                className="p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                                }}
                                                title="Voir le contrat"
                                              >
                                                <ArrowRight size={18} />
                                              </Button>
                                            ) : null}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </>
                              )}

                            {/* 0.1) Paiements à lancer - only show if no filter active */}
                            {noFilterActive &&
                              groupedSuivis.paymentAlerts.length > 0 && (
                                <>
                                  <tr style={{ backgroundColor: "#fff" }}>
                                    <td
                                      colSpan="5"
                                      style={{ paddingTop: 16, paddingBottom: 4, border: "none" }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#dc2626", flexShrink: 0 }} />
                                        Paiements à lancer — Échéances atteintes
                                      </span>
                                    </td>
                                  </tr>

                                  {groupedSuivis.paymentAlerts.map(
                                    ({
                                      s,
                                      steps,
                                      last,
                                      next,
                                      paymentAlertLabel,
                                      paymentAlertAmount,
                                    }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById,
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`payment-${
                                            s.suivi_id || s.id || ""
                                          }-${
                                            s.document_id || s.facture_id || ""
                                          }`}
                                          onClick={() => {
                                            setSelectedSuivi(s);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          {/* Client */}
                                          <td>
                                            {clientId ? (
                                              <Link
                                                to={`/app/user/edit/${clientId}/2`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "inherit", textDecoration: "underline" }}
                                              >
                                                {clientLabel}
                                              </Link>
                                            ) : (
                                              clientLabel
                                            )}
                                          </td>

                                          {/* À faire - Label dynamique du paiement */}
                                          <td>
                                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              <span style={todoMainText}>{paymentAlertLabel}</span>
                                              {paymentAlertAmount > 0 && (
                                                <>
                                                  <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                  <span style={{ fontSize: 13, color: "#6e6b7b" }}>
                                                    {new Intl.NumberFormat("fr-FR", {
                                                      style: "currency",
                                                      currency: "EUR",
                                                      minimumFractionDigits: 0,
                                                    }).format(paymentAlertAmount)}
                                                  </span>
                                                </>
                                              )}
                                            </span>
                                          </td>

                                          {/* Dernière étape validée */}
                                          <td>
                                            {last ? (
                                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {last.label}
                                                {last.date && (
                                                  <>
                                                    <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                    <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                                  </>
                                                )}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                Aucune étape validée
                                              </span>
                                            )}
                                          </td>

                                          {/* Type de contrat */}
                                          <td
                                            style={{
                                              whiteSpace: "nowrap",
                                              width: 160,
                                            }}
                                          >
                                            {renderProductBadgeFromSuivi(s)}
                                          </td>

                                          {/* Contrat (flèche) */}
                                          <td
                                            style={{
                                              width: 60,
                                              textAlign: "center",
                                            }}
                                          >
                                            {contractId ? (
                                              <Button
                                                color="link"
                                                className="p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                                }}
                                                title="Voir le contrat"
                                              >
                                                <ArrowRight size={18} />
                                              </Button>
                                            ) : null}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </>
                              )}
                            {/* 0.2) Facturation (Urgent) - only show if no filter active */}
                            {noFilterActive &&
                              groupedSuivis.facturation.length > 0 && (
                                <>
                                  <tr style={{ backgroundColor: "#fff" }}>
                                    <td
                                      colSpan="5"
                                      style={{ paddingTop: 16, paddingBottom: 4, border: "none" }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#dc2626", flexShrink: 0 }} />
                                        Facturation — Urgent
                                      </span>
                                    </td>
                                  </tr>

                                  {groupedSuivis.facturation.map(
                                    ({ s, steps, last, next, isRdvToday }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById,
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`factu-${
                                            s.suivi_id || s.id || ""
                                          }-${
                                            s.document_id || s.facture_id || ""
                                          }`}
                                          onClick={() => {
                                            setSelectedSuivi(s);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          {/* Client */}
                                          <td>
                                            {clientId ? (
                                              <Link
                                                to={`/app/user/edit/${clientId}/2`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "inherit", textDecoration: "underline" }}
                                              >
                                                {clientLabel}
                                              </Link>
                                            ) : (
                                              clientLabel
                                            )}
                                          </td>

                                          {/* À faire */}
                                          <td>
                                            {renderTodoCell(
                                              next,
                                              isRdvToday
                                                ? "Alerte : Jour du RDV"
                                                : null,
                                              isDatePastOrToday(last && last.date),
                                            )}
                                          </td>

                                          {/* Dernière étape validée */}
                                          <td>
                                            {last ? (
                                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {last.label}
                                                {last.date && (
                                                  <>
                                                    <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                    <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                                  </>
                                                )}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                Aucune étape validée
                                              </span>
                                            )}
                                          </td>

                                          {/* Type de contrat */}
                                          <td
                                            style={{
                                              whiteSpace: "nowrap",
                                              width: 160,
                                            }}
                                          >
                                            {renderProductBadgeFromSuivi(s)}
                                          </td>

                                          {/* Contrat (flèche) */}
                                          <td
                                            style={{
                                              width: 60,
                                              textAlign: "center",
                                            }}
                                          >
                                            {contractId ? (
                                              <Button
                                                color="link"
                                                className="p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                                }}
                                                title="Voir le contrat"
                                              >
                                                <ArrowRight size={18} />
                                              </Button>
                                            ) : null}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </>
                              )}

                            {/* 0.3) Dossiers à relancer (Contrats envoyés > 7 jours) */}
                            {noFilterActive &&
                              groupedSuivis.relance.length > 0 && (
                                <>
                                  <tr style={{ backgroundColor: "#fff" }}>
                                    <td
                                      colSpan="5"
                                      style={{ paddingTop: 16, paddingBottom: 4, border: "none" }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#d97706" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d97706", flexShrink: 0 }} />
                                        Dossiers à relancer — Contrats envoyés &gt; 7 jours
                                      </span>
                                    </td>
                                  </tr>

                                  {groupedSuivis.relance.map(
                                    ({
                                      s,
                                      steps,
                                      last,
                                      next,
                                      isRdvToday,
                                      relanceEnvoiDate,
                                    }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById,
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`relance-${
                                            s.suivi_id || s.id || ""
                                          }-${
                                            s.document_id || s.facture_id || ""
                                          }`}
                                          onClick={() => {
                                            setSelectedSuivi(s);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          {/* Client */}
                                          <td>
                                            {clientId ? (
                                              <Link
                                                to={`/app/user/edit/${clientId}/2`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "inherit", textDecoration: "underline" }}
                                              >
                                                {clientLabel}
                                              </Link>
                                            ) : (
                                              clientLabel
                                            )}
                                          </td>

                                          {/* À faire */}
                                          <td>
                                            {renderTodoCell(
                                              {
                                                label: "Relance contrat",
                                                isDatedStep: true,
                                                date: null,
                                              },
                                              `Envoyé le ${formatDate(relanceEnvoiDate)}`,
                                              isDatePastOrToday(last && last.date),
                                            )}
                                          </td>

                                          {/* Dernière étape validée */}
                                          <td>
                                            {last ? (
                                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {last.label}
                                                {last.date && (
                                                  <>
                                                    <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                    <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                                  </>
                                                )}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                Aucune étape validée
                                              </span>
                                            )}
                                          </td>

                                          {/* Type de contrat */}
                                          <td
                                            style={{
                                              whiteSpace: "nowrap",
                                              width: 160,
                                            }}
                                          >
                                            {renderProductBadgeFromSuivi(s)}
                                          </td>

                                          {/* Contrat (flèche) */}
                                          <td
                                            style={{
                                              width: 60,
                                              textAlign: "center",
                                            }}
                                          >
                                            {contractId ? (
                                              <Button
                                                color="link"
                                                className="p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                                }}
                                                title="Voir le contrat"
                                              >
                                                <ArrowRight size={18} />
                                              </Button>
                                            ) : null}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </>
                              )}

                            {/* Séparateur "Dossiers à suivre" si on a des sections urgentes au-dessus */}
                            {noFilterActive &&
                              (groupedSuivis.creationDevis.length > 0 ||
                              groupedSuivis.facturation.length > 0 ||
                              groupedSuivis.paymentAlerts.length > 0 ||
                              groupedSuivis.relance.length > 0) &&
                              groupedSuivis.active.length > 0 && (
                                <tr style={{ backgroundColor: "#fff" }}>
                                  <td
                                    colSpan="5"
                                    style={{ paddingTop: 20, paddingBottom: 4, border: "none" }}
                                  >
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#2563eb" }}>
                                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2563eb", flexShrink: 0 }} />
                                      Dossiers à suivre
                                    </span>
                                  </td>
                                </tr>
                              )}

                            {/* 1) Dossiers actifs (par défaut) - only if no filter */}
                            {noFilterActive &&
                              groupedSuivis.active.map(
                                ({ s, steps, last, next }) => {
                                  const clientLabel =
                                    getClientDisplayNameFromSuivi(
                                      s,
                                      clientsById,
                                    );
                                  const contractId =
                                    s.facture_id ||
                                    s.document_id ||
                                    s.contract_id;
                                  const clientId = s.client_id;

                                  return (
                                    <tr
                                      key={`${s.suivi_id || s.id || ""}-${
                                        s.document_id || s.facture_id || ""
                                      }`}
                                      onClick={() => {
                                        setSelectedSuivi(s);
                                      }}
                                      style={{ cursor: "pointer" }}
                                    >
                                      {/* Client */}
                                      <td>
                                        {clientId ? (
                                          <Link
                                            to={`/app/user/edit/${clientId}/2`}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ color: "inherit", textDecoration: "underline" }}
                                          >
                                            {clientLabel}
                                          </Link>
                                        ) : (
                                          clientLabel
                                        )}
                                      </td>

                                      {/* À faire */}
                                      <td>{renderTodoCell(next, null, isDatePastOrToday(last && last.date))}</td>
                                      {/* Dernière étape validée */}
                                      <td>
                                        {last ? (
                                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {last.label}
                                            {last.date && (
                                              <>
                                                <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                              </>
                                            )}
                                          </span>
                                        ) : (
                                          <span
                                            className="text-muted"
                                            style={{ fontSize: 14 }}
                                          >
                                            Aucune étape validée
                                          </span>
                                        )}
                                      </td>

                                      {/* Type de contrat */}
                                      <td
                                        style={{
                                          whiteSpace: "nowrap",
                                          width: 160,
                                        }}
                                      >
                                        {renderProductBadgeFromSuivi(s)}
                                      </td>

                                      {/* Contrat (flèche) */}
                                      <td
                                        style={{
                                          width: 60,
                                          textAlign: "center",
                                        }}
                                      >
                                        {contractId ? (
                                          <Button
                                            color="link"
                                            className="p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                            }}
                                            title="Voir le contrat"
                                          >
                                            <ArrowRight size={18} />
                                          </Button>
                                        ) : (
                                          <span
                                            className="text-muted"
                                            style={{ fontSize: 14 }}
                                          >
                                            -
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                },
                              )}

                            {/* 2) Dossiers en cours de traitement (tiroir) */}
                            {showProcessing &&
                              groupedSuivis.processing.length > 0 && (
                                <>
                                  <tr style={{ backgroundColor: "#fff" }}>
                                    <td
                                      colSpan="5"
                                      style={{ paddingTop: 20, paddingBottom: 4, border: "none" }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9ca3af", flexShrink: 0 }} />
                                        Dossiers en cours de traitement
                                      </span>
                                    </td>
                                  </tr>

                                  {groupedSuivis.processing.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById,
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`processing-${
                                            s.suivi_id || s.id || ""
                                          }-${
                                            s.document_id || s.facture_id || ""
                                          }`}
                                          onClick={() => {
                                            setSelectedSuivi(s);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <td>
                                            {clientId ? (
                                              <Link
                                                to={`/app/user/edit/${clientId}/2`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "inherit", textDecoration: "underline" }}
                                              >
                                                {clientLabel}
                                              </Link>
                                            ) : (
                                              clientLabel
                                            )}
                                          </td>
                                          <td>{renderTodoCell(next, null, isDatePastOrToday(last && last.date))}</td>
                                          <td>
                                            {last ? (
                                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {last.label}
                                                {last.date && (
                                                  <>
                                                    <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                    <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                                  </>
                                                )}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                Aucune étape validée
                                              </span>
                                            )}
                                          </td>

                                          <td
                                            style={{
                                              whiteSpace: "nowrap",
                                              width: 160,
                                            }}
                                          >
                                            {renderProductBadgeFromSuivi(s)}
                                          </td>

                                          <td
                                            style={{
                                              width: 60,
                                              textAlign: "center",
                                            }}
                                          >
                                            {contractId ? (
                                              <Button
                                                color="link"
                                                className="p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                                }}
                                                title="Voir le contrat"
                                              >
                                                <ArrowRight size={18} />
                                              </Button>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                -
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </>
                              )}

                            {/* 3) Contrats terminés (tiroir) */}
                            {showCompleted &&
                              groupedSuivis.completed.length > 0 && (
                                <>
                                  <tr style={{ backgroundColor: "#fff" }}>
                                    <td
                                      colSpan="5"
                                      style={{ paddingTop: 20, paddingBottom: 4, border: "none" }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9ca3af", flexShrink: 0 }} />
                                        Contrats terminés
                                      </span>
                                    </td>
                                  </tr>

                                  {groupedSuivis.completed.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById,
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`completed-${
                                            s.suivi_id || s.id || ""
                                          }-${
                                            s.document_id || s.facture_id || ""
                                          }`}
                                          onClick={() => {
                                            setSelectedSuivi(s);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <td>
                                            {clientId ? (
                                              <Link
                                                to={`/app/user/edit/${clientId}/2`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "inherit", textDecoration: "underline" }}
                                              >
                                                {clientLabel}
                                              </Link>
                                            ) : (
                                              clientLabel
                                            )}
                                          </td>

                                          <td>
                                            <span
                                              className="text-success"
                                              style={{ fontSize: 14 }}
                                            >
                                              Dossier terminé
                                            </span>
                                          </td>

                                          <td>
                                            {last ? (
                                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {last.label}
                                                {last.date && (
                                                  <>
                                                    <span style={{ color: "#ced4da", margin: "0 5px" }}>·</span>
                                                    <span style={{ fontSize: 13, color: isDatePastOrToday(last.date) ? "#ea5455" : "#6e6b7b" }}>{formatDate(last.date)}</span>
                                                  </>
                                                )}
                                              </span>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                Aucune étape validée
                                              </span>
                                            )}
                                          </td>

                                          <td
                                            style={{
                                              whiteSpace: "nowrap",
                                              width: 160,
                                            }}
                                          >
                                            {renderProductBadgeFromSuivi(s)}
                                          </td>

                                          <td
                                            style={{
                                              width: 60,
                                              textAlign: "center",
                                            }}
                                          >
                                            {contractId ? (
                                              <Button
                                                color="link"
                                                className="p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  history.push({
                                                  pathname: `/pages/contract/${contractId}`,
                                                  state: { backUrl: location.pathname }
                                                });
                                                }}
                                                title="Voir le contrat"
                                              >
                                                <ArrowRight size={18} />
                                              </Button>
                                            ) : (
                                              <span
                                                className="text-muted"
                                                style={{ fontSize: 14 }}
                                              >
                                                -
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </>
                              )}

                            {/* Si rien n’est visible du tout */}
                            {groupedSuivis.active.length === 0 &&
                              groupedSuivis.creationDevis.length === 0 &&
                              groupedSuivis.facturation.length === 0 &&
                              groupedSuivis.paymentAlerts.length === 0 &&
                              groupedSuivis.relance.length === 0 &&
                              (!showProcessing ||
                                groupedSuivis.processing.length === 0) &&
                              (!showCompleted ||
                                groupedSuivis.completed.length === 0) && (
                                <tr>
                                  <td colSpan="5">Aucun suivi trouvé.</td>
                                </tr>
                              )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </tbody>
              </Table>
              </div>
              {selectedSuivi?.client_id && (
                <div style={{ marginTop: 16 }}>
                  <SuiviAvancementBox
                    clientId={selectedSuivi.client_id}
                    onContractUpdate={fetchSuivis}
                  />
                </div>
              )}
            </div>
          </div>
        </AdminView>
      )}
      {/* 2. OPPORTUNITIES (Pipeline View) */}
      {/* {location.pathname.includes("/kpi/opportunities") && <PipelineView />} */}
      {location.pathname.includes("/kpi/opportunities") && <KanbanBoard />}

      {/* 3. INBOX (Default) */}
      {(location.pathname === "/kpi" || location.pathname.includes("/inbox")) &&
        (() => {
          // Normaliser les numéros de téléphone pour comparaison
          const normalizePhone = (p) => {
            if (!p) return null;
            const digits = String(p).replace(/\D/g, "");
            if (digits.length < 9) return null;
            // Normaliser vers le format 0XXXXXXXXX
            if (digits.startsWith("33") && digits.length >= 11) {
              return "0" + digits.slice(2, 11);
            }
            if (digits.length === 9) return "0" + digits;
            return digits.slice(0, 10);
          };

          // Helper pour trouver le téléphone dans l'objet brut
          const extractPhone = (item) => {
            const user = item.user || item.client || item.visitor || {};
            const raw =
              item.telephone ||
              item.phone ||
              item.client_phone ||
              item.contact_phone ||
              user.telephone ||
              user.phone ||
              item.attributes?.TELEPHONE_MOBILE ||
              item.name;
            return raw;
          };

          // Extraire les téléphones de chaque source
          const chatbotPhones = new Set(
            conversations
              .map((c) => normalizePhone(extractPhone(c)))
              .filter(Boolean),
          );
          const diagnosticPhones = new Set(
            diagnostics
              .map((d) => normalizePhone(extractPhone(d)))
              .filter(Boolean),
          );

          // Marquer les items avec _hasMultipleChannels
          const markMultiChannel = (item, source) => {
            const phone = normalizePhone(extractPhone(item));
            let hasMultiple = false;

            if (source === "chatbot" && phone) {
              const has = diagnosticPhones.has(phone);
              hasMultiple = has;
            } else if (source === "diagnostic" && phone) {
              const has = chatbotPhones.has(phone);
              hasMultiple = has;
            }
            return {
              ...item,
              _source: source,
              _hasMultipleChannels: hasMultiple,
            };
          };

          // Créer la liste brute avec tous les items
          const allRawItems = [
            ...conversations.map((c) => markMultiChannel(c, "chatbot")),
            // Diagnostic retraite gratuit : ne remonte que si email + tel étaient
            // déjà tous les deux présents à la création (crm_eligible figé côté back).
            ...diagnostics
              .filter((d) => d.crm_eligible)
              .map((d) => markMultiChannel(d, "diagnostic")),
            // Appels only from kpis — emails come from inbound_emails (not kpis)
            ...allItems
              .filter((kpi) => {
                const obj = (kpi.objet || kpi.object || "")
                  .toString()
                  .toLowerCase();
                const act = (kpi.action || "").toString().toLowerCase();
                const isEmail =
                  obj.includes("email") ||
                  act.includes("email") ||
                  act.includes("email reçu") ||
                  act.includes("email recu");
                const isCall =
                  obj.includes("appel") ||
                  act.includes("appel") ||
                  act.includes("call");
                return isCall && !isEmail;
              })
              .map((kpi) => ({
                ...kpi,
                _source: "call",
              })),
            // Notes d'appel Leads/Mail bandeau Appeler (call_report) — real API rows only
            ...callReports.map((row) => {
              const clientName = row.client_id
                ? clientsById[row.client_id] || ""
                : "";
              const parts = String(clientName).trim().split(/\s+/).filter(Boolean);
              const first =
                parts.length > 1 ? parts.slice(0, -1).join(" ") : clientName;
              const last = parts.length > 1 ? parts[parts.length - 1] : "";
              return {
                id: `cr-${row.id}`,
                _source: "call",
                type: "call",
                note: row.call_report || "",
                objet: "Appel",
                user_id: row.client_id || null,
                client_id: row.client_id || null,
                admin_id: row.admin_id || null,
                created_at: row.created_at,
                client_first_name: first || "",
                client_last_name: last || "",
                _fromCallReport: true,
              };
            }),
            // Mails/contacts = inbound_emails source=cf7 only (HARD: no kpis)
            ...inboundEmails.map((row) => ({
              ...row,
              _source: "email",
              created_at: row.received_at || row.created_at,
            })),
          ];

          // Dédupliquer par téléphone pour éviter le ±2
          // Garder l'entrée la plus récente, marquer hasMultipleChannels
          const deduplicatedItems = (() => {
            const phoneMap = new Map(); // phone -> best item
            const uniqueItems = [];

            allRawItems.forEach((item) => {
              const phone = normalizePhone(extractPhone(item));

              if (!phone) {
                // Pas de téléphone => garder tel quel
                uniqueItems.push(item);
                return;
              }

              const existing = phoneMap.get(phone);
              if (!existing) {
                phoneMap.set(phone, item);
              } else {
                // Comparer les dates, garder le plus récent
                const existingDate = new Date(existing.created_at || 0);
                const newDate = new Date(item.created_at || 0);

                // Fusionner hasMultipleChannels si l'un des deux est multi-canal
                const isMergedMulti =
                  existing._hasMultipleChannels ||
                  item._hasMultipleChannels ||
                  existing._source !== item._source; // Sources différentes = multi-canal

                if (newDate > existingDate) {
                  phoneMap.set(phone, {
                    ...item,
                    _hasMultipleChannels: isMergedMulti,
                  });
                } else {
                  phoneMap.set(phone, {
                    ...existing,
                    _hasMultipleChannels: isMergedMulti,
                  });
                }
              }
            });

            // Ajouter les items avec téléphone (dédupliqués)
            phoneMap.forEach((item) => uniqueItems.push(item));

            return uniqueItems;
          })();

          return (
            <InboxView
              key={`inbox-${location.pathname}`}
              items={deduplicatedItems}
              filter={
                location.pathname.includes("/inbox/chatbot")
                  ? "chatbot"
                  : location.pathname.includes("/inbox/diagnostic")
                    ? "diagnostic"
                    : location.pathname.includes("/inbox/call")
                      ? "call"
                      : location.pathname.includes("/inbox/email")
                        ? "email"
                        : "all"
              }
              loading={
                loadingConversations ||
                loadingDiagnostics ||
                loadingList ||
                loadingInboundEmails ||
                loadingCallReports
              }
              error={convError || diagError || inboundEmailError}
              onSelect={handleSelectConversation}
              onDataRefresh={() => {
                fetchConversationArchives();
                fetchDiagnosticResults();
                fetchInboundEmails();
                fetchCallReports();
              }}
            />
          );
        })()}

      {/* New KPI Modal (integrated) */}
      <KPIModal
        isOpen={creating}
        toggle={() => setCreating(!creating)}
        onSave={createKpi}
        loading={creating && !!error}
        error={error}
        history={history}
        adminId={adminId} // Optional: Pass adminId if needed by modal in future
      />
    </div>
  );
}
