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
  const [action, setAction] = useState("");
  const [creating, setCreating] = useState(false);
  const adminId = localStorage.getItem("userid");
  const [error, setError] = useState("");
  const [kpiDate, setKpiDate] = useState(todayStr());

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
    fetchAdminEmailFromApi();
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

  async function fetchMembers() {
    try {
      setLoadingUsers(true);
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("jwt");

      const res = await axios.get("https://api.optionretraite.net/api/users", {
        params: { kind: "member" },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("jwt");

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = adminId ? { id: adminId } : undefined;

      const res = await axios.get(
        `https://api.optionretraite.net/api/users/${adminId}`,
        { headers, params }
      );

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

  return (
    <div className="vx-row">
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
                        fontSize: 12,
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
