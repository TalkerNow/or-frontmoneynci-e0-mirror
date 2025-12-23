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

import { useHistory, useLocation } from "react-router-dom";

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
import PipelineView from "./components/PipelineView";
import AdminView from "./components/AdminView";

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

// Date + heure (fr-FR)
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
function renderNullable(v) {
  return v ? v : <em style={{ opacity: 0.6 }}>(vide)</em>;
}
function renderEmail(v) {
  return v ? (
    <a href={`mailto:${v}`}>{v}</a>
  ) : (
    <em style={{ opacity: 0.6 }}>(vide)</em>
  );
}
function renderPhone(v) {
  if (!v) return <em style={{ opacity: 0.6 }}>(vide)</em>;
  const display = formatFRPhoneDisplay(v);
  const href = `tel:${formatTelHref(v)}`;
  return <a href={href}>{display}</a>;
}

/** Badge d'action (light) + puce couleur */
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
        .toUpperCase()
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
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 9px",
  borderRadius: 10, // pill
  backgroundColor: "#f1f1f1ff", // gris très léger
  maxWidth: 260,
};

const todoDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: "red", // accent bleu (change si tu veux)
  flexShrink: 0,
};

const todoMainText = {
  fontSize: 16,
  fontWeight: 600,
  color: "#212529",
  lineHeight: 1.2,
};

const todoSubText = {
  fontSize: 12,
  color: "#b0b3b5ff",
  lineHeight: 1.2,
};

function renderTodoCell(next) {
  if (!next) {
    return (
      <span className="text-success" style={{ fontSize: 14, fontWeight: 600 }}>
        Dossier terminé
      </span>
    );
  }

  let sub = "";
  if (next.isDatedStep && !next.date) sub = "À planifier";
  else if (!next.isDatedStep) sub = "Étape de suivi";

  return (
    <div style={todoBadgeWrapper}>
      <span style={todoDot} />
      <div>
        <div style={todoMainText}>{next.label}</div>
        {sub && <div style={todoSubText}>{sub}</div>}
      </div>
    </div>
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
  const [showProcessing, setShowProcessing] = useState(false); // Dossiers en cours de traitement
  const [showCompleted, setShowCompleted] = useState(false); // Contrats terminés

  const [creating, setCreating] = useState(false);
  const toggleModal = () => setCreating(!creating);
  const adminId = localStorage.getItem("userid");
  const [error, setError] = useState("");

  const [sortField, setSortField] = useState("client"); // client | todo | last | type
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [adminSearch, setAdminSearch] = useState(""); // Search for AdminView

  // >>> Nouveaux champs contact (optionnels)
  const [action, setAction] = useState("");
  const [kpiDate, setKpiDate] = useState(todayStr());
  const [nomPrenom, setNomPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [note, setNote] = useState("");

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Email admin (local + API)
  const [adminEmailLocal, setAdminEmailLocal] = useState("");
  const [adminEmailApi, setAdminEmailApi] = useState("");

  // Utilisateurs (admin -> nom/prénom)
  const [usersById, setUsersById] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Clients
  const [clientsById, setClientsById] = useState({});

  // Suivis d'avancement (backend Laravel)
  const [suivis, setSuivis] = useState([]);
  const [loadingSuivis, setLoadingSuivis] = useState(false);
  const [suivisError, setSuivisError] = useState("");

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [convError, setConvError] = useState("");

  // Diagnostic Results (simulator-difficulty-results)
  const [diagnostics, setDiagnostics] = useState([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [diagError, setDiagError] = useState("");

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
  const [convModalOpen, setConvModalOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);

  const handleSelectConversation = (id) => {
    // TODO: fetch conversation details /api/conversation-archives/{id}
  };

  // Dropdown state for New Button
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

  // ---- styles filtres jolis ----

  const filterPillBase = {
    borderRadius: 999,
    border: "1px solid transparent",
    padding: "4px 10px",
    fontSize: 14,
    backgroundColor: "transparent",
    color: "#495057",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };

  const filterPillActive = {
    fontWeight: 600,
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
        "Erreur lors du chargement des KPI. Vérifie l'API."
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
      const data = Array.isArray(res.data) ? res.data : [];
      setSuivis(data);
    } catch (e) {
      console.error(e);
      setSuivisError(
        e?.response?.data?.message ||
        "Erreur lors du chargement des suivis d'avancement."
      );
    } finally {
      setLoadingSuivis(false);
    }
  }

  async function fetchConversationArchives() {
    try {
      setLoadingConversations(true);
      setConvError("");

      // backend : GET /api/conversation-archives → front : "/conversation-archives"
      const res = await API.get("/conversation-archives");

      const payload = res.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];

      setConversations(data);
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

      // API v1: GET /api/v1/simulator-difficulty-results
      const res = await API.get("/v1/simulator-difficulty-results");

      const payload = res.data || {};
      const data = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      setDiagnostics(data);
    } catch (e) {
      console.error("fetchDiagnosticResults error:", e);
      setDiagError("Impossible de charger les diagnostics.");
    } finally {
      setLoadingDiagnostics(false);
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
          params: p > 1 ? { page: p } : {},
        });
        const payload = res.data;
        const data = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        aggregated = aggregated.concat(data);

        maxPage = payload?.last_page || payload?.meta?.last_page || 1;
        p += 1;
      } while (p <= maxPage);

      setAllItems(aggregated);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Erreur lors du chargement complet des KPI pour le graphique."
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
        "Impossible de créer le KPI."
      );
    } finally {
      setCreating(false);
    }
  }

  // Effets de chargement
  useEffect(() => {
    fetchKpis(1);
    fetchAllKpis();
    fetchAdminEmailFromApi();
    fetchSuivis();
    fetchMembers();
    fetchClients();
    fetchConversationArchives();
    fetchDiagnosticResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [suivis, clientsById, sortField, sortDir, adminSearch]);
  const groupedSuivis = useMemo(() => {
    const res = {
      active: [], // par défaut
      suivi: [], // Bucket spécifique demandé (ex: AR/TFD creation devis)
      after5days: [], // 5 jours atteints / dépassés
      processing: [], // Paiement du contrat -> Avancement du dossier
      completed: [], // Contrats terminés
    };

    if (!Array.isArray(sortedSuivis)) return res;

    // "Aujourd'hui" tronqué à minuit pour comparer les dates proprement
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    sortedSuivis.forEach((s) => {
      const { profileKey, steps } = buildStepsForSuivi(s);
      const { last, next } = getLastAndNextSteps(steps);

      const contract = s.contract || s;
      const isContractFinished =
        contract && contract.document_state === "Terminé";

      const isProcessing =
        last &&
        last.label === "Paiement du contrat" &&
        next &&
        next.label === "Avancement du dossier";

      // 🔶 Crédit d'impôt : "5 jours ouvrés d'attente" atteints / dépassés
      let isAfter5Days = false;

      // Cas AR/TFD : Création de devis = NON URGENT mais "SUIVI"
      let isSuiviSpecific = false;
      if (!isContractFinished && profileKey === "ar_tfd") {
        if (next && next.index === 2) {
          isSuiviSpecific = true;
        }
      }

      if (!isContractFinished && profileKey === "credit_impot") {
        const step3 = steps.find((st) => st.index === 3); // "5 jours ouvrés d'attente"
        const step4 = steps.find((st) => st.index === 4); // "Création devis"

        if (step3 && step3.date && (!step4 || !step4.completed)) {
          const raw = String(step3.date);
          let datePart = raw;

          if (raw.includes("T")) {
            datePart = raw.split("T")[0];
          } else if (raw.includes(" ")) {
            datePart = raw.split(" ")[0];
          }

          const [y, m, d] = datePart.split("-");
          if (y && m && d) {
            const d3 = new Date(Number(y), Number(m) - 1, Number(d));
            const d3Only = new Date(
              d3.getFullYear(),
              d3.getMonth(),
              d3.getDate()
            );

            // 👉 la date de l'étape 3 est arrivée ou passée
            if (d3Only.getTime() <= today.getTime()) {
              isAfter5Days = true;
            }
          }
        }
      }

      const bucket = isContractFinished
        ? "completed"
        : isAfter5Days
          ? "after5days"
          : isSuiviSpecific
            ? "suivi"
            : isProcessing
              ? "processing"
              : "active";

      res[bucket].push({ s, steps, last, next });
    });

    return res;
  }, [sortedSuivis]);
  const [selectedSuivi, setSelectedSuivi] = useState(null);

  // Initial select first item if available and none selected
  useEffect(() => {
    // Only set if we have items and nothing is selected yet
    if (!selectedSuivi && sortedSuivis.length > 0) {
      setSelectedSuivi(sortedSuivis[0]);
    }
  }, [sortedSuivis, selectedSuivi]);

  // --- RENDER HELPERS ---

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
                : location.pathname.includes("/kpi/clients") // Assuming clients route exists or will exist
                  ? "Clients"
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
              end
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
                  alert("Fonctionnalité 'Créer une tâche' à venir !")
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
          filters={
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <button
                type="button"
                onClick={() => setShowProcessing((v) => !v)}
                style={{
                  ...filterPillBase,
                  ...(showProcessing ? filterPillActive : {}),
                  // Override defaults for dropdown look
                  width: "100%",
                  justifyContent: "flex-start",
                  border: "none",
                  background: "transparent",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    marginRight: 8,
                    backgroundColor: showProcessing ? "#198754" : "transparent",
                    border: `1px solid ${showProcessing ? "#198754" : "#ced4da"
                      }`,
                  }}
                />
                Dossiers en cours
              </button>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                style={{
                  ...filterPillBase,
                  ...(showCompleted ? filterPillActive : {}),
                  width: "100%",
                  justifyContent: "flex-start",
                  border: "none",
                  background: "transparent",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    marginRight: 8,
                    backgroundColor: showCompleted ? "#6c757d" : "transparent",
                    border: `1px solid ${showCompleted ? "#6c757d" : "#ced4da"
                      }`,
                  }}
                />
                Contrats terminés
              </button>
            </div>
          }
        >
          <div style={{ padding: "0 14px" }}>
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

              <Table responsive hover>
                <thead>
                  <tr>
                    <th
                      style={headerClickableStyle}
                      onClick={() => handleSort("client")}
                    >
                      Client
                      {renderSortIcon("client")}
                    </th>
                    <th
                      style={headerClickableStyle}
                      onClick={() => handleSort("todo")}
                    >
                      À faire
                      {renderSortIcon("todo")}
                    </th>
                    <th
                      style={headerClickableStyle}
                      onClick={() => handleSort("last")}
                    >
                      Dernière étape validée
                      {renderSortIcon("last")}
                    </th>
                    <th
                      style={headerClickableStyle}
                      onClick={() => handleSort("type")}
                    >
                      Type de contrat
                      {renderSortIcon("type")}
                    </th>
                    <th>Voir le contrat</th>
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
                            {/* 0) 5 jours ouvrés - only show if no filter active */}
                            {noFilterActive &&
                              groupedSuivis.after5days.length > 0 && (
                                <>
                                  <tr className="table-warning">
                                    <td
                                      colSpan="5"
                                      style={{ fontSize: 14, fontWeight: 600 }}
                                    >
                                      5 jours ouvrés atteints / dépassés (à
                                      traiter en priorité)
                                    </td>
                                  </tr>

                                  {groupedSuivis.after5days.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`after5-${s.suivi_id || s.id || ""
                                            }-${s.document_id || s.facture_id || ""
                                            }`}
                                          onClick={() => {
                                            if (clientId) {
                                              history.push(
                                                `/app/user/edit/${clientId}/2`
                                              );
                                            }
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          {/* Client */}
                                          <td>{clientLabel}</td>

                                          {/* À faire */}
                                          <td>{renderTodoCell(next)}</td>

                                          {/* Dernière étape validée */}
                                          <td>
                                            {last ? (
                                              <div style={{ fontSize: 14 }}>
                                                <div>
                                                  <strong>{last.label}</strong>
                                                </div>
                                                {last.date && (
                                                  <div className="text-muted">
                                                    {formatDate(last.date)}
                                                  </div>
                                                )}
                                              </div>
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
                                                  history.push(
                                                    `/pages/contract/${contractId}`
                                                  );
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
                                    }
                                  )}
                                </>
                              )}
                            {groupedSuivis.after5days.length > 0 &&
                              groupedSuivis.active.length > 0 && (
                                <tr>
                                  <td
                                    colSpan="5"
                                    style={{
                                      padding: "6px 10px",
                                      borderTop: "2px solid #dee2e6",
                                      borderBottom: "1px solid #dee2e6",
                                      background: "#f8f9fa",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#6c757d",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    Autres dossiers
                                  </td>
                                </tr>
                              )}

                            {/* 0-bis) Dossiers "Suivi" (AR/TFD Création devis) - only if no filter */}
                            {noFilterActive &&
                              groupedSuivis.suivi.length > 0 && (
                                <>
                                  <tr className="table-info">
                                    <td
                                      colSpan="5"
                                      style={{ fontSize: 14, fontWeight: 600 }}
                                    >
                                      Dossiers à suivre
                                    </td>
                                  </tr>

                                  {groupedSuivis.suivi.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`suivi-${s.suivi_id || s.id || ""
                                            }-${s.document_id || s.facture_id || ""
                                            }`}
                                          onClick={() => {
                                            if (clientId) {
                                              history.push(
                                                `/app/user/edit/${clientId}/2`
                                              );
                                            }
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <td>{clientLabel}</td>
                                          <td>{renderTodoCell(next)}</td>
                                          <td>
                                            {last ? (
                                              <div style={{ fontSize: 14 }}>
                                                <div>
                                                  <strong>{last.label}</strong>
                                                </div>
                                                {last.date && (
                                                  <div className="text-muted">
                                                    {formatDate(last.date)}
                                                  </div>
                                                )}
                                              </div>
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
                                                  history.push(
                                                    `/pages/contract/${contractId}`
                                                  );
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
                                    }
                                  )}
                                </>
                              )}

                            {/* 1) Dossiers actifs (par défaut) - only if no filter */}
                            {noFilterActive &&
                              groupedSuivis.active.map(
                                ({ s, steps, last, next }) => {
                                  const clientLabel =
                                    getClientDisplayNameFromSuivi(
                                      s,
                                      clientsById
                                    );
                                  const contractId =
                                    s.facture_id ||
                                    s.document_id ||
                                    s.contract_id;
                                  const clientId = s.client_id;

                                  return (
                                    <tr
                                      key={`${s.suivi_id || s.id || ""}-${s.document_id || s.facture_id || ""
                                        }`}
                                      onClick={() => {
                                        if (clientId) {
                                          history.push(
                                            `/app/user/edit/${clientId}/2`
                                          );
                                        }
                                      }}
                                      style={{ cursor: "pointer" }}
                                    >
                                      {/* Client */}
                                      <td>{clientLabel}</td>

                                      {/* À faire */}
                                      <td>{renderTodoCell(next)}</td>
                                      {/* Dernière étape validée */}
                                      <td>
                                        {last ? (
                                          <div style={{ fontSize: 14 }}>
                                            <div>
                                              <strong>{last.label}</strong>
                                            </div>
                                            {last.date && (
                                              <div className="text-muted">
                                                {formatDate(last.date)}
                                              </div>
                                            )}
                                          </div>
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
                                              history.push(
                                                `/pages/contract/${contractId}`
                                              );
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
                                }
                              )}

                            {/* 2) Dossiers en cours de traitement (tiroir) */}
                            {showProcessing &&
                              groupedSuivis.processing.length > 0 && (
                                <>
                                  <tr className="table-secondary">
                                    <td
                                      colSpan="5"
                                      style={{ fontSize: 14, fontWeight: 600 }}
                                    >
                                      Dossiers en cours de traitement
                                    </td>
                                  </tr>

                                  {groupedSuivis.processing.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`processing-${s.suivi_id || s.id || ""
                                            }-${s.document_id || s.facture_id || ""
                                            }`}
                                          onClick={() => {
                                            if (clientId) {
                                              history.push(
                                                `/app/user/edit/${clientId}/2`
                                              );
                                            }
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <td>{clientLabel}</td>
                                          <td>{renderTodoCell(next)}</td>
                                          <td>
                                            {last ? (
                                              <div style={{ fontSize: 14 }}>
                                                <div>
                                                  <strong>{last.label}</strong>
                                                </div>
                                                {last.date && (
                                                  <div className="text-muted">
                                                    {formatDate(last.date)}
                                                  </div>
                                                )}
                                              </div>
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
                                                  history.push(
                                                    `/pages/contract/${contractId}`
                                                  );
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
                                    }
                                  )}
                                </>
                              )}

                            {/* 3) Contrats terminés (tiroir) */}
                            {showCompleted &&
                              groupedSuivis.completed.length > 0 && (
                                <>
                                  <tr className="table-secondary">
                                    <td
                                      colSpan="5"
                                      style={{ fontSize: 14, fontWeight: 600 }}
                                    >
                                      Contrats terminés
                                    </td>
                                  </tr>

                                  {groupedSuivis.completed.map(
                                    ({ s, steps, last, next }) => {
                                      const clientLabel =
                                        getClientDisplayNameFromSuivi(
                                          s,
                                          clientsById
                                        );
                                      const contractId =
                                        s.facture_id ||
                                        s.document_id ||
                                        s.contract_id;
                                      const clientId = s.client_id;

                                      return (
                                        <tr
                                          key={`completed-${s.suivi_id || s.id || ""
                                            }-${s.document_id || s.facture_id || ""
                                            }`}
                                          onClick={() => {
                                            if (clientId) {
                                              history.push(
                                                `/app/user/edit/${clientId}/2`
                                              );
                                            }
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <td>{clientLabel}</td>

                                          <td>
                                            <span
                                              className="text-success"
                                              style={{
                                                fontSize: 14,
                                                fontWeight: 600,
                                              }}
                                            >
                                              Dossier terminé
                                            </span>
                                          </td>

                                          <td>
                                            {last ? (
                                              <div style={{ fontSize: 14 }}>
                                                <div>
                                                  <strong>{last.label}</strong>
                                                </div>
                                                {last.date && (
                                                  <div className="text-muted">
                                                    {formatDate(last.date)}
                                                  </div>
                                                )}
                                              </div>
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
                                                  history.push(
                                                    `/pages/contract/${contractId}`
                                                  );
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
                                    }
                                  )}
                                </>
                              )}

                            {/* Si rien n’est visible du tout */}
                            {groupedSuivis.active.length === 0 &&
                              groupedSuivis.after5days.length === 0 &&
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
          </div>
        </AdminView>
      )}
      {/* 2. OPPORTUNITIES (Pipeline View) */}
      {location.pathname.includes("/kpi/opportunities") && <PipelineView />}

      {/* 3. INBOX (Default) */}
      {(location.pathname === "/kpi" ||
        location.pathname.includes("/inbox")) && (
          <InboxView
            items={[
              ...conversations.map((c) => ({ ...c, _source: "chatbot" })),
              ...diagnostics.map((d) => ({ ...d, _source: "diagnostic" })),
            ]}
            filter={
              location.pathname.includes("/inbox/chatbot")
                ? "chatbot"
                : location.pathname.includes("/inbox/diagnostic")
                  ? "diagnostic"
                  : "all"
            }
            loading={loadingConversations || loadingDiagnostics}
            error={convError || diagError}
            onSelect={handleSelectConversation}
          />
        )}

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
