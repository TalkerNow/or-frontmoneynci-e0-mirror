import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Row,
  ButtonGroup,
  Col,
  Input,
  Label,
  Table,
  Badge,
  UncontrolledButtonDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useHistory } from "react-router-dom";
import {
  Trash2,
  Mail as MailIcon,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  UserPlus,
  ArrowRight
} from "react-feather"; // icônes

/** =============================
 *  Helpers (token, admin id, date)
 *  =============================*/
const API = axios.create({
  baseURL: `${global.config.server_url}`,
  headers: {
    Accept: "application/json",
  },
});

// Webhook simple pour envoyer l'email (contenu)
const WEBHOOK_EMAIL_URL =
  "https://n8n.srv796541.hstgr.cloud/webhook/0627350c-a362-45dd-adfe-b947bf1c48f5/chat";

// Objets (ajout de "Email")
const OBJETS = ["Appel entrant", "Appel sortant", "Email"];

// Actions (RETIRE: "affaire signée")
const CALL_ACTIONS = ["Rdv pris", "Mail prestation envoyé", "NUL", "Autre"];
const EMAIL_ACTION = "Email reçu";
const ACTION_OTHER = "Autre";
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function weekdayIndexMondayFirst(dateInput) {
  const d = new Date(dateInput);
  return (d.getDay() + 6) % 7; // 0 = lundi ... 6 = dimanche
}
// Ensemble des actions à afficher dans le graphique/filtre
const ACTIONS_ALL = [...CALL_ACTIONS, EMAIL_ACTION, ACTION_OTHER];
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

function formatPhone(val) {
  // On enlève tout sauf chiffres et +
  val = val.replace(/[^0-9+]/g, "");

  // --- France (commence par 0) ---
  if (val.startsWith("0")) {
    // applique des espaces tous les 2 chiffres, même si incomplet
    return val.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }

  // --- Belgique (+32) ---
  if (val.startsWith("+32")) {
    // applique seulement si assez de chiffres après +32
    if (val.length > 3) {
      return val
        .replace(/^\+32/, "+32 ")
        .replace(/(\d)(\d{3})(\d{0,2})(\d{0,2})$/, (m, p1, p2, p3, p4) =>
          [p1, p2, p3, p4].filter(Boolean).join(" ")
        );
    }
    return val; // si juste "+32", on laisse tel quel
  }

  // --- Par défaut ---
  return val;
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
function buildQuickWeeks(anchorYear, anchorWeek, count = 10) {
  const out = [];
  let y = anchorYear;
  let w = anchorWeek;
  for (let i = 0; i < count; i++) {
    out.push({ year: y, week: w, label: formatWeekRangeLabel(y, w) });
    w -= 1;
    if (w < 1) {
      y -= 1;
      w = isoWeeksInYear(y);
    }
  }
  return out;
}

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

/** ISO week utils */
function isoWeekInfo(dateInput) {
  const d = new Date(dateInput);
  const day = (d.getDay() + 6) % 7; // 0=lundi ... 6=dimanche
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const isoYear = thursday.getFullYear();

  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);

  const week =
    1 + Math.round((thursday - firstThursday) / (7 * 24 * 3600 * 1000));

  return { isoYear, isoWeek: week };
}

function isoWeeksInYear(isoYear) {
  const dec28 = new Date(isoYear, 11, 28);
  return isoWeekInfo(dec28).isoWeek;
}

function monthKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

function getProduitLabel(suiviRow, profileKey) {
  // 1) Si le contrat a un libellé métier, on l'affiche tel quel
  const raw =
    suiviRow?.subscribe_services ||
    suiviRow?.type ||
    suiviRow?.document_type ||
    "";

  if (raw && String(raw).trim() !== "") {
    return raw; // ex: "CH SIMU ACTU RAC", "AR / TFD", etc.
  }

  // 2) Sinon, on mappe le code vers un label propre
  switch (profileKey) {
    case "credit_impot":
      return "Crédit d’impôt";
    case "ar_tfd":
      return "Audit retraite / TFD";
    case "ch_simu_actu_rac":
      return "CH - Simulation / Actualisation / Rachat";
    default:
      return "Non défini";
  }
}
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
  credit_impot: "success",   // vert
  ar_tfd: "warning",         // jaune
  ch_simu_actu_rac: "primary", // bleu
  none: "secondary",         // gris
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
  borderRadius: 10,          // pill
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
      <span
        className="text-success"
        style={{ fontSize: 14, fontWeight: 600 }}
      >
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
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [objet, setObjet] = useState("Appel entrant");
  const [showProcessing, setShowProcessing] = useState(false); // Dossiers en cours de traitement
  const [showCompleted, setShowCompleted] = useState(false);   // Contrats terminés
  const [showAfter5Days, setShowAfter5Days] = useState(true);
  const [action, setAction] = useState("");
  const [creating, setCreating] = useState(false);
  const adminId = localStorage.getItem("userid");
  const [error, setError] = useState("");
  const [kpiDate, setKpiDate] = useState(todayStr());
  const [sortField, setSortField] = useState("client"); // client | todo | last | type
  const [sortDir, setSortDir] = useState("asc");        // asc | desc
  // >>> Nouveaux champs contact (optionnels)
  const [nomPrenom, setNomPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [note, setNote] = useState("");

  // Mini fenetre email (simple)
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  // Email admin (local + API)
  const adminEmailLocal = useMemo(() => getAdminEmailFromLocal(), []);
  const [adminEmailApi, setAdminEmailApi] = useState(null);
  const adminEmailFinal = useMemo(
    () => adminEmailApi || adminEmailLocal || null,
    [adminEmailApi, adminEmailLocal]
  );

  // Liste KPI (pagination API)
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  // Utilisateurs (admin -> nom/prénom)
  const [usersById, setUsersById] = useState({});
  const [, setLoadingUsers] = useState(false);

  // Données complètes pour le GRAPHIQUE
  const [allItems, setAllItems] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [clientsById, setClientsById] = useState({});

  // Suivis d'avancement (backend Laravel)
  const [suivis, setSuivis] = useState([]);
  const [loadingSuivis, setLoadingSuivis] = useState(false);
  const [suivisError, setSuivisError] = useState("");

  // Graph controls
  const [groupBy, setGroupBy] = useState("day");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [actionFilter, setActionFilter] = useState("all");
  const [week, setWeek] = useState(() => isoWeekInfo(new Date()).isoWeek);
  function stepWeek(delta) {
    let y = year;
    let w = week + delta;
    let max = isoWeeksInYear(y);
    if (w < 1) {
      y -= 1;
      w = isoWeeksInYear(y);
    } else if (w > max) {
      y += 1;
      w = 1;
    }
    setYear(y);
    setWeek(w);
  }
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

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    }
    return (
      <span style={{ marginLeft: 4 }}>
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const headerClickableStyle = {
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  // ---- styles filtres jolis ----
  const filterWrapperStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    padding: "6px 10px",
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    border: "1px solid #e9ecef",
  };

  const filterTitleStyle = {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#6c757d",
    fontWeight: 600,
  };

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
  };

  const filterPillActive = {
    backgroundColor: "#e7f1ff",
    borderColor: "#0d6efd",
    color: "#0d6efd",
    fontWeight: 600,
  };


  // Libellé clair
  const weekLabel = useMemo(
    () => formatWeekRangeLabel(year, week),
    [year, week]
  );
  const quickWeeks = useMemo(
    () => buildQuickWeeks(year, week, 10),
    [year, week]
  );

  // Suppression
  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Désactiver actions pour "Email"
  const actionsDisabled = objet === "Email";

  // Forcer l'action par défaut si Email
  useEffect(() => {
    if (objet === "Email") setAction(EMAIL_ACTION);
    else if (!CALL_ACTIONS.includes(action)) setAction("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objet]);

  // Charger la TABLE paginée
  useEffect(() => {
    fetchKpis(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const max = isoWeeksInYear(year);
    if (week > max) setWeek(max);
  }, [year, week]);

  // Charger TOUTES les données pour le GRAPHIQUE
  useEffect(() => {
    fetchAllKpis();
    fetchMembers();
    fetchClients();
    fetchAdminEmailFromApi();
    fetchSuivis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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


  // ✅ createKpi modifié
  async function createKpi() {
    try {
      setCreating(true);
      setError("");

      const body = {
        objet: objet || null,
        action:
          objet === "Email"
            ? EMAIL_ACTION
            : action && action.trim() !== ""
            ? action
            : "Autre", // <<--- ICI ajout de "Autre" par défaut
        kpi_date: kpiDate || todayStr(),
        nom_prenom: nomPrenom || null,
        email: email || null,
        telephone: telephone || null,
        note: note || null,
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

  // Envoi TRÈS SIMPLE au webhook (corps + adminEmailFinal + adminId)
  async function sendEmailWebhook() {
    setSendMsg("");
    const content = emailBody.trim();
    if (!content) {
      setSendMsg("⚠️ Le message est vide.");
      return;
    }
    try {
      setSending(true);
      const res = await fetch(WEBHOOK_EMAIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: content, // cohérent avec ton autre flow
          adminEmail: adminEmailFinal, // << email priorité API
          adminEmailFallback: adminEmailLocal || null,
          adminEmailSource: adminEmailApi
            ? "api"
            : adminEmailLocal
            ? "localStorage"
            : "unknown",
          adminId: adminId || null,
          source: "kpi-mini-email",
          sentAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`);
      }
      setEmailBody("");
      setSendMsg("✅ Message envoyé au webhook.");
    } catch (err) {
      console.error(err);
      setSendMsg("❌ Échec d'envoi au webhook.");
    } finally {
      setSending(false);
    }
  }

  function openConfirmModal(kpiRow) {
    setToDelete(kpiRow);
    setConfirmOpen(true);
  }
  function closeConfirmModal() {
    if (deletingId) return;
    setConfirmOpen(false);
    setToDelete(null);
  }
  async function deleteKpi(id) {
    if (!id) return;
    try {
      setDeletingId(id);
      setError("");
      await API.delete(`/kpis/${id}`);

      setItems((prev) => prev.filter((x) => x.id !== id));
      setAllItems((prev) => prev.filter((x) => x.id !== id));

      await fetchKpis(page);
      await fetchAllKpis();

      closeConfirmModal();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Impossible de supprimer le KPI."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const availableYears = useMemo(() => {
    const years = new Set();
    (allItems || []).forEach((k) => {
      const dateStr = k.kpi_date || k.created_at || k.updated_at;
      if (!dateStr) return;
      const { isoYear } = isoWeekInfo(dateStr);
      years.add(isoYear);
    });
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [allItems, currentYear]);

  const chartDataMulti = useMemo(() => {
    const byPeriod = new Map();

    if (groupBy === "week") {
      const totalWeeks = isoWeeksInYear(year);
      for (let w = 1; w <= totalWeeks; w++) {
        const period = `${year}-W${String(w).padStart(2, "0")}`;
        const base = {};
        ACTIONS_ALL.forEach((a) => (base[a] = 0));
        byPeriod.set(period, base);
      }
    } else if (groupBy === "month") {
      for (let m = 1; m <= 12; m++) {
        const period = `${year}-${String(m).padStart(2, "0")}`;
        const base = {};
        ACTIONS_ALL.forEach((a) => (base[a] = 0));
        byPeriod.set(period, base);
      }
    } else {
      for (let di = 0; di < 7; di++) {
        const base = {};
        ACTIONS_ALL.forEach((a) => (base[a] = 0));
        byPeriod.set(di, base);
      }
    }

    (allItems || []).forEach((k) => {
      const dateStr = k.kpi_date || k.created_at || k.updated_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const cat = ACTIONS_KNOWN.includes(k.action) ? k.action : ACTION_OTHER;

      if (groupBy === "week") {
        const { isoYear, isoWeek } = isoWeekInfo(dateStr);
        if (isoYear !== year) return;
        const periodKey = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
        const row = byPeriod.get(periodKey);
        if (!row) return;
        row[cat] = (row[cat] || 0) + 1;
      } else if (groupBy === "month") {
        if (d.getFullYear() !== year) return;
        const periodKey = monthKey(dateStr);
        const row = byPeriod.get(periodKey);
        if (!row) return;
        row[cat] = (row[cat] || 0) + 1;
      } else {
        const { isoYear, isoWeek } = isoWeekInfo(dateStr);
        if (isoYear !== year || isoWeek !== week) return;
        const di = weekdayIndexMondayFirst(dateStr);
        const row = byPeriod.get(di);
        if (!row) return;
        row[cat] = (row[cat] || 0) + 1;
      }
    });

    if (groupBy === "day") {
      return Array.from(byPeriod.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([di, counts]) => ({ period: DAY_LABELS[di], ...counts }));
    }

    return Array.from(byPeriod.entries())
      .map(([period, counts]) => ({ period, ...counts }))
      .sort((a, b) => (a.period > b.period ? 1 : -1));
  }, [allItems, groupBy, year, week]);
    const sortedSuivis = useMemo(() => {
      if (!Array.isArray(suivis)) return [];

      const data = [...suivis];

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
    }, [suivis, clientsById, sortField, sortDir]);
    const groupedSuivis = useMemo(() => {
      const res = {
        active: [],      // par défaut
        after5days: [],  // 5 jours atteints / dépassés
        processing: [],  // Paiement du contrat -> Avancement du dossier
        completed: [],   // Contrats terminés
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
      : isProcessing
      ? "processing"
      : "active";

    res[bucket].push({ s, steps, last, next });
  });

  return res;
}, [sortedSuivis]);

  return (
    <div className="vx-row">
            {/* ====== Suivis d'avancement ====== */}
      <div className="vx-col w-100">
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Suivi des contrats</h4>
          </CardHeader>
            <CardBody>
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

              {/* Filtres d'affichage (propre, aligné) */}
              <div className="d-flex justify-content-end mb-2">
                <div style={filterWrapperStyle}>
                  <span style={filterTitleStyle}>Afficher</span>

                  {/* Dossiers en cours */}
                  <button
                    type="button"
                    onClick={() => setShowProcessing((v) => !v)}
                    style={{
                      ...filterPillBase,
                      ...(showProcessing ? filterPillActive : {}),
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        marginRight: 6,
                        backgroundColor: showProcessing ? "#198754" : "transparent",
                        border: `1px solid ${
                          showProcessing ? "#198754" : "#ced4da"
                        }`,
                      }}
                    />
                    Dossiers en cours
                  </button>

                  {/* Contrats terminés */}
                  <button
                    type="button"
                    onClick={() => setShowCompleted((v) => !v)}
                    style={{
                      ...filterPillBase,
                      ...(showCompleted ? filterPillActive : {}),
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        marginRight: 6,
                        backgroundColor: showCompleted ? "#6c757d" : "transparent",
                        border: `1px solid ${
                          showCompleted ? "#6c757d" : "#ced4da"
                        }`,
                      }}
                    />
                    Contrats terminés
                  </button>
                </div>
              </div>
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
                {/* 0) 5 jours ouvrés atteints / dépassés (toujours en haut si présents) */}
                {groupedSuivis.after5days.length > 0 && (
                  <>
                    <tr className="table-warning">
                      <td colSpan="5" style={{ fontSize: 14, fontWeight: 600 }}>
                        5 jours ouvrés atteints / dépassés (à traiter en priorité)
                      </td>
                    </tr>

                    {groupedSuivis.after5days.map(({ s, steps, last, next }) => {
                      const clientLabel = getClientDisplayNameFromSuivi(s, clientsById);
                      const contractId =
                        s.facture_id || s.document_id || s.contract_id;
                      const clientId = s.client_id;

                      return (
                        <tr
                          key={`after5-${s.suivi_id || s.id || ""}-${s.document_id || s.facture_id || ""}`}
                          onClick={() => {
                            if (clientId) {
                              history.push(`/app/user/edit/${clientId}/2`);
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
                              <span className="text-muted" style={{ fontSize: 14 }}>
                                Aucune étape validée
                              </span>
                            )}
                          </td>

                          {/* Type de contrat */}
                          <td style={{ whiteSpace: "nowrap", width: 160 }}>
                            {renderProductBadgeFromSuivi(s)}
                          </td>

                          {/* Contrat (flèche) */}
                          <td style={{ width: 60, textAlign: "center" }}>
                            {contractId ? (
                              <Button
                                color="link"
                                className="p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  history.push(`/pages/contract/${contractId}`);
                                }}
                                title="Voir le contrat"
                              >
                                <ArrowRight size={18} />
                              </Button>
                            ) : (
                              <span className="text-muted" style={{ fontSize: 14 }}>
                                -
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

                  {/* 1) Dossiers actifs (par défaut) */}
                  {groupedSuivis.active.map(({ s, steps, last, next }) => {
                    const clientLabel = getClientDisplayNameFromSuivi(s, clientsById);
                    const contractId = s.facture_id || s.document_id || s.contract_id;
                    const clientId = s.client_id;

                    return (
                      <tr
                        key={`${s.suivi_id || s.id || ""}-${s.document_id || s.facture_id || ""}`}
                        onClick={() => {
                          if (clientId) {
                            history.push(`/app/user/edit/${clientId}/2`);
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
                                <div className="text-muted">{formatDate(last.date)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 14 }}>
                              Aucune étape validée
                            </span>
                          )}
                        </td>

                        {/* Type de contrat */}
                        <td style={{ whiteSpace: "nowrap", width: 160 }}>
                          {renderProductBadgeFromSuivi(s)}
                        </td>

                        {/* Contrat (flèche) */}
                        <td style={{ width: 60, textAlign: "center" }}>
                          {contractId ? (
                            <Button
                              color="link"
                              className="p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                history.push(`/pages/contract/${contractId}`);
                              }}
                              title="Voir le contrat"
                            >
                              <ArrowRight size={18} />
                            </Button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 14 }}>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* 2) Dossiers en cours de traitement (tiroir) */}
                  {showProcessing && groupedSuivis.processing.length > 0 && (
                    <>
                      <tr className="table-secondary">
                        <td colSpan="5" style={{ fontSize: 14, fontWeight: 600 }}>
                          Dossiers en cours de traitement
                        </td>
                      </tr>

                      {groupedSuivis.processing.map(({ s, steps, last, next }) => {
                        const clientLabel = getClientDisplayNameFromSuivi(s, clientsById);
                        const contractId = s.facture_id || s.document_id || s.contract_id;
                        const clientId = s.client_id;

                        return (
                          <tr
                            key={`processing-${s.suivi_id || s.id || ""}-${s.document_id || s.facture_id || ""}`}
                            onClick={() => {
                              if (clientId) {
                                history.push(`/app/user/edit/${clientId}/2`);
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
                                <span className="text-muted" style={{ fontSize: 14 }}>
                                  Aucune étape validée
                                </span>
                              )}
                            </td>

                            <td style={{ whiteSpace: "nowrap", width: 160 }}>
                              {renderProductBadgeFromSuivi(s)}
                            </td>

                            <td style={{ width: 60, textAlign: "center" }}>
                              {contractId ? (
                                <Button
                                  color="link"
                                  className="p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    history.push(`/pages/contract/${contractId}`);
                                  }}
                                  title="Voir le contrat"
                                >
                                  <ArrowRight size={18} />
                                </Button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 14 }}>
                                  -
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}

                  {/* 3) Contrats terminés (tiroir) */}
                  {showCompleted && groupedSuivis.completed.length > 0 && (
                    <>
                      <tr className="table-secondary">
                        <td colSpan="5" style={{ fontSize: 14, fontWeight: 600 }}>
                          Contrats terminés
                        </td>
                      </tr>

                      {groupedSuivis.completed.map(({ s, steps, last, next }) => {
                        const clientLabel = getClientDisplayNameFromSuivi(s, clientsById);
                        const contractId = s.facture_id || s.document_id || s.contract_id;
                        const clientId = s.client_id;

                        return (
                          <tr
                            key={`completed-${s.suivi_id || s.id || ""}-${s.document_id || s.facture_id || ""}`}
                            onClick={() => {
                              if (clientId) {
                                history.push(`/app/user/edit/${clientId}/2`);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{clientLabel}</td>

                            <td>
                              <span
                                className="text-success"
                                style={{ fontSize: 14, fontWeight: 600 }}
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
                                <span className="text-muted" style={{ fontSize: 14 }}>
                                  Aucune étape validée
                                </span>
                              )}
                            </td>

                            <td style={{ whiteSpace: "nowrap", width: 160 }}>
                              {renderProductBadgeFromSuivi(s)}
                            </td>

                            <td style={{ width: 60, textAlign: "center" }}>
                              {contractId ? (
                                <Button
                                  color="link"
                                  className="p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    history.push(`/pages/contract/${contractId}`);
                                  }}
                                  title="Voir le contrat"
                                >
                                  <ArrowRight size={18} />
                                </Button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 14 }}>
                                  -
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}

                  {/* Si rien n’est visible du tout */}
                  {groupedSuivis.active.length === 0 &&
                    groupedSuivis.after5days.length === 0 &&
                    (!showProcessing || groupedSuivis.processing.length === 0) &&
                    (!showCompleted || groupedSuivis.completed.length === 0) && (
                      <tr>
                        <td colSpan="5">Aucun suivi trouvé.</td>
                      </tr>
                  )}
                </>
              )}
            </tbody>

            </Table>
          </CardBody>
        </Card>
      </div>

      <Row className="align-items-stretch">
        <Col xs="12" className="d-flex">
          <Card className="flex-fill d-flex flex-column" style={{ padding: "10px 16px" }}>
            <CardHeader className="d-flex align-items-center justify-content-between">
              <h4 className="mb-0">Créer un KPI</h4>
              <div>
                <Button
                  className="mr-1 mb-1"
                  color="primary"
                  onClick={() => history.push("/app/user/createUser")}
                  title="Créer un utilisateur"
                  aria-label="Créer un utilisateur"
                >
                  <UserPlus size={15} />
                </Button>
              </div>
            </CardHeader>
            <CardBody className="d-flex flex-column">
              {error ? (
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
                  {error}
                </div>
              ) : null}

              {/* OBJET + Date */}
              <div
                className="d-flex align-items-center flex-wrap"
                style={{ gap: 8 }}
              >
                <div
                  className="d-inline-flex align-items-center"
                  style={{ gap: 8 }}
                >
                  {OBJETS.map((o) => {
                    const Icon = OBJET_ICON[o] || PhoneCall;
                    const selected = objet === o;
                    const isEmail = o === "Email";
                    return (
                      <Button
                        key={o}
                        color={selected ? "primary" : "light"}
                        className="d-inline-flex align-items-center"
                        onClick={() => setObjet(o)}
                        title={o}
                        aria-label={o}
                        style={{ gap: 6, padding: "8px 12px" }}
                      >
                        <Icon size={16} style={{ opacity: 0.9 }} />
                        {!isEmail && <span>{o}</span>}
                      </Button>
                    );
                  })}
                </div>
                <Input
                  type="date"
                  value={kpiDate}
                  onChange={(e) => setKpiDate(e.target.value)}
                  max={todayStr()}
                  aria-label="Date du KPI"
                  style={{ width: 170, marginLeft: "auto" }}
                />
              </div>

              {/* Bloc Récupérer le diagnostic - affiché seulement pour Appel sortant */}
              {objet === "Appel sortant" && (
                <div className="mt-1" style={{ marginBottom: 8 }}>
                  <h6 style={{ fontWeight: 600, marginBottom: 4 }}>
                    Récupérer le diagnostic
                  </h6>
                  <div className="d-flex align-items-center" style={{ gap: 6 }}>
                    <Input
                      type="text"
                      placeholder="Email du client"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      style={{ width: 260, fontSize: 13, height: 36 }}
                    />
                    <Button
                      color="primary"
                      onClick={sendEmailWebhook}
                      disabled={sending || !emailBody.trim()}
                      style={{ height: 36, fontSize: 13, padding: "0 14px" }}
                    >
                      {sending ? "Envoi..." : "Recevoir"}
                    </Button>
                  </div>

                  {sendMsg && (
                    <div
                      className="mt-1"
                      style={{
                        fontSize: 14,
                        color: sendMsg.startsWith("✅")
                          ? "#0f5132"
                          : sendMsg.startsWith("⚠️")
                          ? "#8a6d3b"
                          : "#b10000",
                      }}
                    >
                      {sendMsg.replace(/^[✅⚠️]/, "")}
                    </div>
                  )}
                </div>
              )}

              {/* Champs contact */}
              <div className="mt-2">
                <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <Label
                      className="mb-1"
                      style={{ fontWeight: 600, fontSize: 13 }}
                    >
                      Nom / Prénom
                    </Label>
                    <Input
                      type="text"
                      placeholder="Nom Prénom"
                      value={nomPrenom}
                      onChange={(e) => setNomPrenom(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <Label
                      className="mb-1"
                      style={{ fontWeight: 600, fontSize: 13 }}
                    >
                      Email
                    </Label>
                    <Input
                      type="text"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: 180, flex: 1 }}>
                    <Label
                      className="mb-1"
                      style={{ fontWeight: 600, fontSize: 13 }}
                    >
                      Téléphone
                    </Label>
                    <Input
                      type="text"
                      placeholder="Téléphone"
                      value={telephone}
                      onChange={(e) =>
                        setTelephone(formatPhone(e.target.value))
                      }
                    />
                  </div>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <Label
                      className="mb-1"
                      style={{ fontWeight: 600, fontSize: 13 }}
                    >
                      Note
                    </Label>
                    <Input
                      type="textarea"
                      placeholder="Quelques notes…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{
                        height: "38px",
                        paddingTop: "7px",
                        lineHeight: "1.5",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!actionsDisabled && (
                <div className="mb-2 mt-2">
                  <Label className="d-block" style={{ fontWeight: 600 }}>
                    Action
                  </Label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {CALL_ACTIONS.map((a) => {
                      const isSelected = action === a;
                      const color = ACTION_COLORS[a] || "secondary";
                      return (
                        <Button
                          key={a}
                          color={color}
                          outline={!isSelected}
                          onClick={() => setAction(a)}
                          className="w-100"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            whiteSpace: "normal",
                            lineHeight: 0.8,
                            padding: "10px 12px",
                          }}
                        >
                          {a}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center mt-1">
                <div className="ml-auto">
                  <Button
                    color="success"
                    onClick={createKpi}
                    disabled={creating}
                  >
                    {creating ? "Création..." : "Créer le KPI"}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* </div> */}

      {/* ====== Graph ====== */}
      <div className="vx-col w-100">
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: 8 }}>
            <h4 className="mb-0">Vue d’ensemble</h4>

            <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
              {/* GroupBy */}
              <UncontrolledButtonDropdown className="mr-1">
                <DropdownToggle caret color="primary">
                  {groupBy === "week"
                    ? "Par semaine"
                    : groupBy === "month"
                    ? "Par mois"
                    : "Par jour (semaine)"}
                </DropdownToggle>
                <DropdownMenu right>
                  <DropdownItem onClick={() => setGroupBy("week")}>
                    Par semaine
                  </DropdownItem>
                  <DropdownItem onClick={() => setGroupBy("month")}>
                    Par mois
                  </DropdownItem>
                  {/* NEW */}
                  <DropdownItem onClick={() => setGroupBy("day")}>
                    Par jour (semaine)
                  </DropdownItem>
                </DropdownMenu>
              </UncontrolledButtonDropdown>

              {/* Year filter */}
              <UncontrolledButtonDropdown className="mr-1">
                <DropdownToggle caret color="primary">
                  Année : {year}
                </DropdownToggle>
                <DropdownMenu right>
                  {availableYears.map((y) => (
                    <DropdownItem key={y} onClick={() => setYear(y)}>
                      {y}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </UncontrolledButtonDropdown>

              {groupBy === "day" && (
                <ButtonGroup className="mr-1">
                  <Button
                    color="primary"
                    onClick={() => stepWeek(-1)}
                    title="Semaine précédente"
                  >
                    ‹
                  </Button>

                  <UncontrolledButtonDropdown>
                    <DropdownToggle
                      color="primary"
                      caret={false}
                      className="px-3"
                      style={{ minWidth: 180, maxWidth: "90vw", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}
                    >
                      {weekLabel}
                    </DropdownToggle>
                    <DropdownMenu
                      right
                      style={{ maxHeight: 320, overflowY: "auto" }}
                    >
                      {quickWeeks.map(({ year: y, week: w, label }) => (
                        <DropdownItem
                          key={`${y}-${w}`}
                          onClick={() => {
                            setYear(y);
                            setWeek(w);
                          }}
                        >
                          {label}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledButtonDropdown>

                  <Button
                    color="primary"
                    onClick={() => stepWeek(1)}
                    title="Semaine suivante"
                  >
                    ›
                  </Button>
                </ButtonGroup>
              )}

              {/* Action filter */}
              <UncontrolledButtonDropdown>
                <DropdownToggle caret color="primary">
                  {actionFilter === "all" ? "Toutes actions" : actionFilter}
                </DropdownToggle>
                <DropdownMenu right>
                  <DropdownItem onClick={() => setActionFilter("all")}>
                    Toutes actions
                  </DropdownItem>
                  {ACTIONS_ALL.map((a) => (
                    <DropdownItem key={a} onClick={() => setActionFilter(a)}>
                      {a}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </UncontrolledButtonDropdown>
            </div>
          </CardHeader>
          <CardBody style={{ height: winW < 576 ? 280 : winW < 768 ? 320 : 420 }}>
            {loadingChart ? (
              <div className="text-center" style={{ opacity: 0.7 }}>
                Chargement du graphique…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataMulti}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(v) =>
                      groupBy === "week" ? v.replace(/^\d{4}-/, "") : v
                    }
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label) =>
                      groupBy === "week"
                        ? `Semaine ${label.split("-")[1]}`
                        : groupBy === "day"
                        ? `${label} – ${formatWeekRangeLabel(year, week)}`
                        : label
                    }
                  />
                  <Legend />

                  {actionFilter === "all"
                    ? ACTIONS_ALL.map((a) => (
                        <Bar
                          key={a}
                          dataKey={a}
                          stackId="total"
                          fill={ACTION_FILLS[a]}
                        />
                      ))
                    : [
                        <Bar
                          key={actionFilter}
                          dataKey={actionFilter}
                          fill={ACTION_FILLS[actionFilter]}
                        />,
                      ]}
                </BarChart>
              </ResponsiveContainer>
            )}
            {!loadingChart && chartDataMulti.length === 0 ? (
              <div className="text-center mt-1" style={{ opacity: 0.7 }}>
                Aucune donnée pour le filtre courant.
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* ====== Liste KPI ====== */}
      <div className="vx-col w-100">
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Tous les KPI</h4>
            <div>
              <Button
                color="light"
                className="mr-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Précédent
              </Button>
              <Button
                color="light"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Suivant →
              </Button>
              <Badge color="light-secondary" className="ml-1">
                Page {page}/{lastPage}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date / heure</th>
                  <th>Objet</th>
                  <th>Action</th>
                  <th>Nom / Prénom</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Note</th>
                  <th>Admin</th>
                  <th className="text-right" style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan="9">Chargement…</td>
                  </tr>
                ) : items?.length ? (
                  items.map((k) => {
                    return (
                      <tr key={k.id}>
                        <td>
                          {k.kpi_date
                            ? formatDate(k.kpi_date) // date choisie (YYYY-MM-DD)
                            : formatDateTime(k.created_at || k.updated_at)}
                        </td>
                        <td>{renderObjetCell(k.objet)}</td>
                        <td>{renderActionBadge(k.action)}</td>
                        <td>{renderNullable(k.nom_prenom)}</td>
                        <td>{renderPhone(k.telephone)}</td>
                        <td>{renderEmail(k.email)}</td>
                        <td>{renderNullable(k.note)}</td>
                        <td>
                          {k.admin_id == null ? (
                            <em style={{ opacity: 0.6 }}>(null)</em>
                          ) : (
                            usersById[k.admin_id] ||
                            k.admin_name ||
                            k.admin ||
                            String(k.admin_id)
                          )}
                        </td>
                        <td className="text-right" style={{ width: 40 }}>
                          <Button
                            color="link"
                            className="p-0"
                            style={{ color: "#dc3545" }}
                            onClick={() => openConfirmModal(k)}
                            disabled={deletingId === k.id}
                            aria-label={`Supprimer KPI ${k.id}`}
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9">Aucun KPI.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>

      {/* ====== Modale de confirmation ====== */}
      <Modal
        isOpen={confirmOpen}
        toggle={closeConfirmModal}
        centered
        size="md"
        backdrop="static"
        keyboard={!deletingId}
      >
        <ModalHeader toggle={closeConfirmModal} className="border-0">
          <div className="d-flex align-items-center">
            <Trash2 size={18} className="mr-1" />
            Confirmer la suppression
          </div>
        </ModalHeader>
        <ModalBody className="pt-0">
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #ffd6d6",
              color: "#8a1f1f",
              padding: 12,
              borderRadius: 8,
            }}
            className="mb-2"
          >
            Cette action est irréversible.
          </div>
          {toDelete && (
            <div className="small" style={{ lineHeight: 1.6 }}>
              <div>
                <strong>ID :</strong> #{toDelete.id}
              </div>
              <div>
                <strong>Date :</strong>{" "}
                {formatDate(
                  toDelete.kpi_date ||
                    toDelete.created_at ||
                    toDelete.updated_at
                )}
              </div>
              <div>
                <strong>Objet :</strong> {toDelete.objet || <em>(vide)</em>}
              </div>
              <div>
                <strong>Action :</strong> {toDelete.action || <em>(vide)</em>}
              </div>
              {/* on n'affiche pas les infos contact ici, mais je peux les ajouter si tu veux */}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-0">
          <Button
            color="secondary"
            onClick={closeConfirmModal}
            disabled={!!deletingId}
          >
            Annuler
          </Button>
          <Button
            color="danger"
            onClick={() => deleteKpi(toDelete?.id)}
            disabled={!toDelete || deletingId === toDelete?.id}
          >
            {deletingId === toDelete?.id ? "Suppression..." : "Supprimer"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
