import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Activity,
  DollarSign,
  FileText,
  MessageCircle,
  Users,
} from "react-feather";
import axios from "axios";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  CardHeader,
  CardTitle,
  TabPane,
  DropdownItem,
} from "reactstrap";
import classNames from "classnames";
import TabDropdown from "../../../components/TabDropdown";
/* ===================== Constantes ===================== */
const FRENCH_MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const AUTH_CONFIG = {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
};

// ---------- ISO week utils ----------
function isoWeekInfo(dateInput) {
  const d = new Date(dateInput);
  const day = (d.getDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);
  const isoWeek =
    1 + Math.round((thursday - firstThursday) / (7 * 24 * 3600 * 1000));
  return { isoYear, isoWeek };
}
function isoWeeksInYear(isoYear) {
  const dec28 = new Date(isoYear, 11, 28);
  return isoWeekInfo(dec28).isoWeek;
}
function isoWeekStart(isoYear, isoWeek) {
  const simple = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7);
  const dow = (simple.getDay() + 6) % 7;
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dow);
  return monday;
}

/* ===================== Styles ===================== */
const DROPDOWN_CSS = `
  /* ---------- Header en grille ---------- */
  .header-grid {
    position: relative;                     /* nécessaire pour centrer le titre en absolu */
    display: grid;
    grid-template-columns: auto 1fr auto;   /* gauche = filtres, centre = espace, droite = onglets */
    grid-template-areas: "left title right";
    align-items: center;
    width: 100%;
    min-height: 56px;
    column-gap: 12px;
  }

  .header-left  { grid-area: left;  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
  .header-right { grid-area: right; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }

  /* --------- Titre FIXE au centre de la carte --------- */
  .header-title {
    position: absolute;      /* retire le titre du flux → il ne bouge plus */
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);  /* centrage parfait */
    pointer-events: none;    /* laisse passer les clics vers les onglets/filtres */
    z-index: 1;              /* au-dessus de l'arrière-plan */
  }
  .header-title .info-title {
    margin: 0;
    font-size: clamp(18px, 2.2vw, 22px);
    line-height: 1.2;
    white-space: nowrap;
    text-align: center;
  }

  /* ---------- Boutons pilule violet (ancien style) ---------- */
  .tab-dd .nav-link {
    cursor: pointer;
    border-radius: 9999px;
    padding: 0.3rem 0.55rem 0.3rem 0.6rem; /* reduce right padding */
    border: 1px solid rgba(115,103,240,.25);
    background: rgba(115,103,240,.08);
    transition: background .15s ease, box-shadow .15s ease, border-color .15s ease, color .15s ease;
    display: inline-flex;
    align-items: center;
    gap: .25rem; /* tighter gap between text and chevron */
    text-decoration: none !important;
    white-space: nowrap;
  }
  .tab-dd .nav-link:hover,
  .tab-dd .nav-link:focus {
    background: rgba(115,103,240,.16);
    border-color: rgba(115,103,240,.45);
    box-shadow: 0 2px 8px rgba(115,103,240,.20);
    color: #212529;
    outline: none;
  }
  .tab-dd .nav-link.active {
    background: rgba(115,103,240,.22);
    border-color: rgba(115,103,240,.55);
    font-weight: 600;
  }
  .tab-dd .chev { transition: transform .2s ease; }
  .tab-dd .nav-link.active .chev { transform: rotate(180deg); }

  .tab-dd .dropdown-menu {
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,.15);
    padding: 8px;
    max-height: 450px;
    overflow-y: auto;
    border: 1px solid rgba(0,0,0,.05);
  }

  /* Grid layouts for dropdowns to avoid scroll */
  .grid-dropdown-menu {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    min-width: 280px;
    max-height: none !important;
  }
  .grid-dropdown-menu .dropdown-item {
    text-align: center;
    padding: 8px 4px;
  }
  .tab-dd .dropdown-item { color: #212529 !important; border-radius: 6px; }
  .tab-dd .dropdown-item:hover,
  .tab-dd .dropdown-item:focus { background: rgba(34,41,47,.06) !important; color: #212529 !important; }
  .tab-dd .dropdown-item.active { background: rgba(115,103,240,.12) !important; color: #212529 !important; font-weight: 600; }
  .tab-dd .dropdown-item.active:hover,
  .tab-dd .dropdown-item.active:focus { background: rgba(115,103,240,.12) !important; color: #212529 !important; }

  /* ---------- Onglets compacts ---------- */
  .header-right .nav-tabs { border-bottom: none; }
  .header-right .nav-item { display: inline-flex; }
  .header-right .nav-link { padding: .25rem .5rem; margin-right: .25rem; white-space: nowrap; }

  /* ---------- Petits écrans ---------- */
  @media (max-width: 900px) {
    .header-grid {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding-bottom: 10px;
      min-height: auto;
    }
    .header-title {
      position: static;
      transform: none;
      order: -1; /* Le titre passe tout en haut */
      margin-bottom: 5px;
    }
    .header-left, .header-right {
      width: 100%;
      justify-content: center;
    }
    .tab-dd .nav-link { padding: 0.3rem 0.6rem; }
    .header-right .nav-link { padding: .2rem .45rem; font-size: .95rem; }
  }
`;

/* ===================== Utils ===================== */
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");
const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);
const sum = (arr) => arr.reduce((acc, v) => acc + Number(v || 0), 0);
const getMonthsOfTrim = (i) => {
  const s = i * 3;
  return [s, s + 1, s + 2];
};

/* ===================== UI: Items ===================== */
const StatItem = ({ icon: Icon, value, label, color, onClick }) => (
  <div
    className="d-flex align-items-center justify-content-start"
    style={{
      minWidth: 240,
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s ease",
      borderRadius: onClick ? "8px" : undefined,
      padding: onClick ? "8px" : undefined,
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.background = "rgba(115,103,240,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.transform = "translateY(0)";
      }
    }}
  >
    <div>
      <div
        className="avatar avatar-stats p-75"
        style={{
          backgroundColor: color + "20",
          borderRadius: "50%",
        }}
      >
        <div
          className="avatar-content d-flex align-items-center justify-content-center"
          style={{ color }}
        >
          <Icon size={32} />
        </div>
      </div>
    </div>
    <div className="ml-1" style={{ minWidth: 0 }}>
      <h2
        className="mb-25"
        style={{ fontSize: "clamp(20px, 2.2vw, 28px)", lineHeight: 1.1 }}
      >
        {value}
      </h2>
      <CardTitle
        className="mb-0"
        style={{
          fontSize: "clamp(13px, 1.6vw, 16px)",
          whiteSpace: "normal",
          textAlign: "left",
        }}
      >
        {label}
      </CardTitle>
    </div>
  </div>
);

const StatGrid = ({ stats }) => (
  <div
    className="icon-section form-inline text-bold-600 w-100"
    style={{
      width: "100%",
      margin: "10px 0",
      padding: "10px 0",
      minHeight: 100,
      boxSizing: "border-box",
      fontSize: 25,
      textAlign: "center",
      rowGap: 12,
      columnGap: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    }}
  >
    {stats.map((s) => (
      <StatItem key={s.label} {...s} />
    ))}
  </div>
);

/* ===================== Data shaping ===================== */
function normalizeApiYear(dataByMonthIndex1to12) {
  const months = Array.from(
    { length: 12 },
    (_, i) => dataByMonthIndex1to12[i + 1] || {},
  );
  return {
    // clients_count = users.role=Client créés dans l'année (période) — people tiles use STOCK instead
    clients_count: months.map((m) => m.clients_count || 0),
    current_acompte_count: months.map((m) => m.current_acompte_count || 0),
    current_total_amount: months.map((m) => m.current_total_amount || 0),
    total_ended_count: months.map((m) => m.total_ended_count || 0),
    current_acompte_amount: months.map((m) => m.current_acompte_amount || 0),
    current_solde_amount: months.map((m) => m.current_solde_amount || 0),
    opportunite_amount: months.map((m) => m.opportunite_amount || 0),
    opportunite_count: months.map((m) => m.opportunite_count || 0),
  };
}

/** Extract Laravel paginator total, or array length. */
function extractTotal(payload) {
  if (payload == null) return null;
  if (typeof payload.total === "number") return payload.total;
  if (payload.meta && typeof payload.meta.total === "number") return payload.meta.total;
  if (Array.isArray(payload.data) && typeof payload.total === "number") return payload.total;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload.data)) return payload.data.length;
  return null;
}

/** Pull items array from Laravel paginator or bare array. */
function extractList(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

/** Fetch all pages of a paginated endpoint (cap maxPages). */
async function fetchAllPages(url, params = {}, maxPages = 100) {
  let page = 1;
  let aggregated = [];
  let maxPage = 1;
  do {
    const res = await axios.get(url, {
      ...AUTH_CONFIG,
      params: { ...params, page },
    });
    const payload = res.data || {};
    const data = extractList(payload);
    aggregated = aggregated.concat(data);
    maxPage = payload.last_page || payload.meta?.last_page || 1;
    if (Array.isArray(payload)) maxPage = 1;
    page += 1;
  } while (page <= maxPage && page <= maxPages);
  return aggregated;
}

function parseDate(raw) {
  if (raw == null || raw === "") return null;
  // Laravel often returns "YYYY-MM-DD HH:mm:ss" (space); Date() needs ISO-ish "T"
  let s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(" ", "T");
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive period bounds matching dashboard filters (local dates). */
function getPeriodBounds(activeTab, year, monthIndex, trimIndex, currentWeek) {
  const startOfDay = (y, m, d) => new Date(y, m, d, 0, 0, 0, 0);
  const endOfDay = (y, m, d) => new Date(y, m, d, 23, 59, 59, 999);

  if (activeTab === "1") {
    // Mois
    const start = startOfDay(year, monthIndex, 1);
    const end = endOfDay(year, monthIndex + 1, 0); // last day of month
    return { start, end };
  }
  if (activeTab === "2") {
    // Trimestre
    const m0 = trimIndex * 3;
    const start = startOfDay(year, m0, 1);
    const end = endOfDay(year, m0 + 3, 0);
    return { start, end };
  }
  if (activeTab === "4") {
    // Semaine ISO
    const num =
      Number(String(currentWeek).replace(/\D/g, "")) ||
      isoWeekInfo(new Date()).isoWeek;
    const monday = isoWeekStart(year, num);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: startOfDay(monday.getFullYear(), monday.getMonth(), monday.getDate()),
      end: endOfDay(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()),
    };
  }
  // Année (tab 3) + fallback
  return {
    start: startOfDay(year, 0, 1),
    end: endOfDay(year, 11, 31),
  };
}

function countInPeriod(items, dateKeys, start, end) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (!it) continue;
    let d = null;
    for (const k of dateKeys) {
      d = parseDate(it[k]);
      if (d) break;
    }
    if (d && d >= start && d <= end) n += 1;
  }
  return n;
}

function periodLabel(activeTab, year, monthIndex, trimIndex, currentWeek) {
  if (activeTab === "1") return `${FRENCH_MONTHS[monthIndex]} ${year}`;
  if (activeTab === "2") return `T${trimIndex + 1} ${year}`;
  if (activeTab === "4") return `${currentWeek} ${year}`;
  return `Année ${year}`;
}

/* ===================== Composant principal ===================== */
export default function OverallCard() {
  // Vérification du rôle utilisateur - seuls les admins peuvent voir les données
  const isAdmin = useMemo(() => {
    const role = localStorage.getItem("role");
    return role && role.toLowerCase() === "admin";
  }, []);

  const now = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState("1");
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [trimIndex, setTrimIndex] = useState(Math.floor(now.getMonth() / 3));
  const [openWeek, setOpenWeek] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(
    () => `W${isoWeekInfo(new Date()).isoWeek}`,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(() => normalizeApiYear({}));

  // Activité période — raw lists (null = API fail → hide tile; [] = 0 OK)
  const [activityRaw, setActivityRaw] = useState({
    chatbot: null, // conversation_archives
    diags: null, // simulator_difficulty_results
    prospects: null, // CRM users Client|Prospect|user (created_at)
    inboundEmails: null, // Mail tile = inbound_emails source=cf7 only
  });

  // Contrats signés période — suivi_avancement.step1 + documents.advanced_payment (flat join)
  const [suiviRaw, setSuiviRaw] = useState(null); // null = fail/hide; [] = 0 OK
  // Contrats créés période — documents.created_at (all rows = type contract; no contracts table)
  const [docsRaw, setDocsRaw] = useState(null); // null = fail/hide; [] = 0 OK

  const fetchYear = useCallback(
    async (y) => {
      // Ne pas charger les données si l'utilisateur n'est pas admin
      if (!isAdmin) return;

      try {
        setLoading(true);
        setError("");
        const res = await axios.get(
          `${global.config.server_url}/get_statistics_total_income?year=${y}`,
          AUTH_CONFIG,
        );
        setData(normalizeApiYear(res.data || {}));
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les statistiques. Réessayez.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin],
  );
  useEffect(() => {
    fetchYear(year);
  }, [fetchYear, year]);

  // Activité raw lists (once) + suivi for Contrats signés — admin only
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    (async () => {
      const next = {
        chatbot: null,
        diags: null,
        prospects: null,
        inboundEmails: null,
      };

      // Prospects créés = CRM fiches created: Client|Prospect|user (excl. admin/consultant/expert)
      try {
        const [clients, members] = await Promise.all([
          fetchAllPages(`${global.config.server_url}/users`, {
            kind: "client",
            per_page: 200,
          }),
          fetchAllPages(`${global.config.server_url}/users`, {
            kind: "member",
            per_page: 200,
          }).catch(async () => {
            // kind=member may return bare array (non-paginated)
            const res = await axios.get(
              `${global.config.server_url}/users?kind=member`,
              AUTH_CONFIG,
            );
            return Array.isArray(res.data)
              ? res.data
              : Array.isArray(res.data?.data)
                ? res.data.data
                : [];
          }),
        ]);
        const byId = new Map();
        for (const u of [...clients, ...members]) {
          if (!u || u.id == null) continue;
          byId.set(u.id, u);
        }
        const ALLOWED = new Set(["client", "prospect", "user"]);
        next.prospects = [...byId.values()].filter((u) =>
          ALLOWED.has(String(u.role || "").toLowerCase()),
        );
      } catch (e) {
        console.error("dashboard prospects activity", e);
        next.prospects = null;
      }

      try {
        next.chatbot = await fetchAllPages(
          `${global.config.server_url}/conversation-archives`,
          { per_page: 200 },
        );
      } catch (e) {
        console.error("dashboard chatbot activity", e);
        next.chatbot = null;
      }

      try {
        next.diags = await fetchAllPages(
          `${global.config.server_url}/v1/simulator-difficulty-results`,
          { per_page: 200 },
        );
      } catch (e) {
        console.error("dashboard diags activity", e);
        next.diags = null;
      }

      try {
        // Mail tile = inbound_emails source=cf7 only (auth:api)
        next.inboundEmails = await fetchAllPages(
          `${global.config.server_url}/inbound-emails`,
          { source: "cf7", per_page: 200 },
        );
      } catch (e) {
        console.error("dashboard inbound emails activity", e);
        // Prefer visible tile at 0 over hidden (null) when fetch fails
        next.inboundEmails = [];
      }

      // Contrats signés: GET /suivi-avancement/all (flat join incl. advanced_payment)
      let suiviList = null;
      try {
        const res = await axios.get(
          `${global.config.server_url}/suivi-avancement/all`,
          AUTH_CONFIG,
        );
        const payload = res.data;
        suiviList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      } catch (e) {
        console.error("dashboard contrats signes suivi", e);
        suiviList = null;
      }

      // Contrats créés: GET /documents — COUNT created_at in period (SQL: documents.created_at)
      let docsList = null;
      try {
        const res = await axios.get(
          `${global.config.server_url}/documents`,
          AUTH_CONFIG,
        );
        const payload = res.data;
        docsList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      } catch (e) {
        console.error("dashboard contrats crees documents", e);
        docsList = null;
      }

      if (!cancelled) {
        setActivityRaw({
          chatbot: next.chatbot,
          diags: next.diags,
          inboundEmails: next.inboundEmails,
          prospects: next.prospects,
        });
        setSuiviRaw(suiviList);
        setDocsRaw(docsList);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Activité période — filter Martin motion sources by dashboard period
  const activityPeriod = useMemo(() => {
    const { start, end } = getPeriodBounds(
      activeTab,
      year,
      monthIndex,
      trimIndex,
      currentWeek,
    );
    const label = periodLabel(
      activeTab,
      year,
      monthIndex,
      trimIndex,
      currentWeek,
    );
    const mk = (raw, keys) =>
      raw == null ? null : countInPeriod(raw, keys, start, end);
    // Mail = inbound_emails source=cf7 only × received_at (fallback created_at)
    let mail = null;
    if (activityRaw.inboundEmails != null) {
      mail = 0;
      const items = activityRaw.inboundEmails;
      if (Array.isArray(items)) {
        const ALLOWED = new Set(["cf7"]);
        for (const it of items) {
          if (!it) continue;
          if (!ALLOWED.has(String(it.source || "").toLowerCase())) continue;
          let d = parseDate(it.received_at) || parseDate(it.created_at);
          if (d && d >= start && d <= end) mail += 1;
        }
      }
    }
    return {
      label,
      prospectsCreated: mk(activityRaw.prospects, ["created_at"]),
      diags: mk(activityRaw.diags, ["created_at", "external_created_at"]),
      chatbot: mk(activityRaw.chatbot, ["created_at"]),
      mail,
    };
  }, [
    activityRaw,
    activeTab,
    year,
    monthIndex,
    trimIndex,
    currentWeek,
  ]);

  // Contrats signés (période) — count step1 + SUM advanced_payment (TTC devis, ≠ CA encaissé)
  const contratsSignesPeriod = useMemo(() => {
    if (suiviRaw == null) return { count: null, ttc: null };
    const { start, end } = getPeriodBounds(
      activeTab,
      year,
      monthIndex,
      trimIndex,
      currentWeek,
    );
    let count = 0;
    let ttc = 0;
    for (const it of suiviRaw) {
      if (!it) continue;
      const d = parseDate(it.step1_completed_at);
      if (!d || d < start || d > end) continue;
      count += 1;
      // API flat join exposes advanced_payment; tolerate nested document/facture if shape changes
      const ap =
        it.advanced_payment ??
        it.document?.advanced_payment ??
        it.facture?.advanced_payment;
      ttc += Number(ap || 0);
    }
    return { count, ttc };
  }, [suiviRaw, activeTab, year, monthIndex, trimIndex, currentWeek]);

  // Contrats créés (période) — COUNT documents.created_at (tous = contrats; table contracts absente)
  const contratsCreesPeriod = useMemo(() => {
    if (docsRaw == null) return null;
    const { start, end } = getPeriodBounds(
      activeTab,
      year,
      monthIndex,
      trimIndex,
      currentWeek,
    );
    // Prefer type=contract when present; all current rows are contract
    const items = Array.isArray(docsRaw)
      ? docsRaw.filter((it) => {
          if (!it) return false;
          const t = String(it.type || "").toLowerCase();
          return !t || t === "contract";
        })
      : [];
    return countInPeriod(items, ["created_at"], start, end);
  }, [docsRaw, activeTab, year, monthIndex, trimIndex, currentWeek]);

  const statsForMonth = useCallback(
    (i) => ({
      ca: fmt(data.current_total_amount[i]),
      acompte: fmt(data.current_acompte_amount[i]),
      solde: fmt(data.current_solde_amount[i]),
      oppoAmount: fmt(data.opportunite_amount[i]),
      contratsClotures: fmt(data.total_ended_count[i]),
    }),
    [data],
  );

  const monthlyStats = useMemo(
    () => ({
      ca: fmt(data.current_total_amount[monthIndex]),
      acompte: fmt(data.current_acompte_amount[monthIndex]),
      solde: fmt(data.current_solde_amount[monthIndex]),
      oppoAmount: fmt(data.opportunite_amount[monthIndex]),
      contratsClotures: fmt(data.total_ended_count[monthIndex]),
    }),
    [data, monthIndex],
  );

  const trimesterStats = useMemo(() => {
    const m = getMonthsOfTrim(trimIndex);
    const pick = (arr) => m.map((i) => arr[i]);
    return {
      ca: fmt(sum(pick(data.current_total_amount))),
      acompte: fmt(sum(pick(data.current_acompte_amount))),
      solde: fmt(sum(pick(data.current_solde_amount))),
      oppoAmount: fmt(sum(pick(data.opportunite_amount))),
      contratsClotures: fmt(sum(pick(data.total_ended_count))),
    };
  }, [data, trimIndex]);

  const yearlyStats = useMemo(
    () => ({
      ca: fmt(sum(data.current_total_amount)),
      acompte: fmt(sum(data.current_acompte_amount)),
      solde: fmt(sum(data.current_solde_amount)),
      oppoAmount: fmt(sum(data.opportunite_amount)),
      contratsClotures: fmt(sum(data.total_ended_count)),
    }),
    [data],
  );

  const weeklyStats = useMemo(() => {
    const num =
      Number(String(currentWeek).replace(/\D/g, "")) ||
      isoWeekInfo(new Date()).isoWeek;
    const monday = isoWeekStart(year, num);
    const mi = monday.getMonth();
    return statsForMonth(mi);
  }, [currentWeek, year, statsForMonth]);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return range(2018, current + 5).reverse();
  }, [now]);

  const tabStats = useMemo(() => {
    const UL = (v) => v;
    // JF tip: Contrats créés · Contrats signés · Signés TTC (Opportunités € dropped as key)
    // Créés = documents.created_at période; Signés = step1; Signés TTC = SUM advanced_payment
    const COUNT_LABELS = new Set(["Contrats créés", "Contrats signés"]);
    const common = [
      {
        icon: FileText,
        bubbleClass: "bg-rgba-success",
        valueKey: "contratsCrees",
        label: "Contrats créés",
        color: "#28c76f",
      },
      {
        icon: FileText,
        bubbleClass: "bg-rgba-primary",
        valueKey: "contratsSignes",
        label: "Contrats signés",
        color: "#7367f0",
      },
      {
        icon: DollarSign,
        bubbleClass: "bg-rgba-warning",
        valueKey: "signesTtc",
        label: "Signés TTC",
        color: "#ff9f43",
      },
    ];
    const withSigned = (obj) => ({
      ...obj,
      contratsCrees:
        contratsCreesPeriod == null ? null : fmt(contratsCreesPeriod),
      contratsSignes:
        contratsSignesPeriod.count == null
          ? null
          : fmt(contratsSignesPeriod.count),
      signesTtc:
        contratsSignesPeriod.ttc == null
          ? null
          : fmt(contratsSignesPeriod.ttc),
    });
    const toCards = (obj) =>
      common
        .filter(({ valueKey }) => obj[valueKey] != null)
        .map(({ icon, bubbleClass, valueKey, label, color }) => ({
          icon,
          bubbleClass,
          color,
          value: UL(obj[valueKey]) + (COUNT_LABELS.has(label) ? "" : " €"),
          label,
        }));
    return {
      month: toCards(withSigned(monthlyStats)),
      trim: toCards(withSigned(trimesterStats)),
      year: toCards(withSigned(yearlyStats)),
    };
  }, [monthlyStats, trimesterStats, yearlyStats, contratsSignesPeriod, contratsCreesPeriod]);

  const [openYear, setOpenYear] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);
  const [openTrim, setOpenTrim] = useState(false);

  const FiltersLeft = () => (
    <Nav className="d-flex align-items-center flex-wrap">
      <NavItem className="mr-1 mb-1">
        <TabDropdown
          label="Année"
          valueLabel={String(year)}
          isOpen={openYear}
          toggle={() => setOpenYear(!openYear)}
          minWidth={70}
          menuClassName="grid-dropdown-menu"
        >
          {yearOptions.map((y) => (
            <DropdownItem
              key={y}
              active={y === year}
              onClick={() => {
                setYear(y);
                setOpenYear(false);
              }}
            >
              {y}
            </DropdownItem>
          ))}
        </TabDropdown>
      </NavItem>

      {activeTab === "1" && (
        <NavItem className="mr-1 mb-1">
          <TabDropdown
            label="Mois"
            valueLabel={FRENCH_MONTHS[monthIndex]}
            isOpen={openMonth}
            toggle={() => setOpenMonth(!openMonth)}
            minWidth={90}
            menuClassName="grid-dropdown-menu"
          >
            {FRENCH_MONTHS.map((m, idx) => (
              <DropdownItem
                key={m}
                active={idx === monthIndex}
                onClick={() => {
                  setMonthIndex(idx);
                  setOpenMonth(false);
                }}
              >
                {m}
              </DropdownItem>
            ))}
          </TabDropdown>
        </NavItem>
      )}

      {activeTab === "2" && (
        <NavItem className="mr-1 mb-1">
          <TabDropdown
            label="Trimestre"
            valueLabel={`Trimestre ${trimIndex + 1}`}
            isOpen={openTrim}
            toggle={() => setOpenTrim(!openTrim)}
            minWidth={120}
          >
            {[1, 2, 3, 4].map((t, i) => (
              <DropdownItem
                key={t}
                active={i === trimIndex}
                onClick={() => {
                  setTrimIndex(i);
                  setOpenTrim(false);
                }}
              >
                {`Trimestre ${t}`}
              </DropdownItem>
            ))}
          </TabDropdown>
        </NavItem>
      )}

      {activeTab === "4" && (
        <NavItem className="mr-1 mb-1">
          <TabDropdown
            label="Semaine"
            valueLabel={currentWeek}
            isOpen={openWeek}
            toggle={() => setOpenWeek(!openWeek)}
            minWidth={90}
            menuClassName="grid-dropdown-menu"
          >
            {Array.from(
              {
                length:
                  year === new Date().getFullYear()
                    ? isoWeekInfo(new Date()).isoWeek
                    : isoWeeksInYear(year),
              },
              (_, i) => `W${i + 1}`,
            ).map((w) => (
              <DropdownItem
                key={w}
                active={w === currentWeek}
                onClick={() => {
                  setCurrentWeek(w);
                  setOpenWeek(false);
                }}
              >
                {w}
              </DropdownItem>
            ))}
          </TabDropdown>
        </NavItem>
      )}
    </Nav>
  );

  const TabsRight = () => (
    <div className="header-right">
      <Nav tabs className="nav-tabs d-flex align-items-center flex-wrap">
        <NavItem>
          <NavLink
            className={classNames({ active: activeTab === "4" })}
            onClick={() => setActiveTab("4")}
          >
            Semaines
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classNames({ active: activeTab === "1" })}
            onClick={() => setActiveTab("1")}
          >
            Mois
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classNames({ active: activeTab === "2" })}
            onClick={() => setActiveTab("2")}
          >
            Trimestre
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classNames({ active: activeTab === "3" })}
            onClick={() => setActiveTab("3")}
          >
            Années
          </NavLink>
        </NavItem>
      </Nav>
    </div>
  );

  // Si l'utilisateur n'est pas admin, on n'affiche rien du tout
  if (!isAdmin) return null;

  return (
    <div className="w-100">
      <style>{DROPDOWN_CSS}</style>
      <Card>
        <CardHeader className="pb-2">
          <div className="header-grid">
            <div className="header-left">
              <FiltersLeft />
            </div>

            {/* Titre ABSOLU centré : ne bouge plus */}
            <div className="header-title">
              <CardTitle tag="h4" className="info-title">
                Informations Clés
              </CardTitle>
            </div>

            <TabsRight />
          </div>
        </CardHeader>

        <CardBody>
          {error && (
            <div className="w-100 alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <TabContent activeTab={activeTab} className="w-100">
            <TabPane tabId="4">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={(() => {
                    const UL = (v) => v;
                    const COUNT_LABELS = new Set(["Contrats créés", "Contrats signés"]);
                    const common = [
                      {
                        icon: FileText,
                        bubbleClass: "bg-rgba-success",
                        valueKey: "contratsCrees",
                        label: "Contrats créés",
                        color: "#28c76f",
                      },
                      {
                        icon: FileText,
                        bubbleClass: "bg-rgba-primary",
                        valueKey: "contratsSignes",
                        label: "Contrats signés",
                        color: "#7367f0",
                      },
                      {
                        icon: DollarSign,
                        bubbleClass: "bg-rgba-warning",
                        valueKey: "signesTtc",
                        label: "Signés TTC",
                        color: "#ff9f43",
                      },
                    ];
                    const obj = {
                      ...weeklyStats,
                      contratsCrees:
                        contratsCreesPeriod == null
                          ? null
                          : fmt(contratsCreesPeriod),
                      contratsSignes:
                        contratsSignesPeriod.count == null
                          ? null
                          : fmt(contratsSignesPeriod.count),
                      signesTtc:
                        contratsSignesPeriod.ttc == null
                          ? null
                          : fmt(contratsSignesPeriod.ttc),
                    };
                    return common
                      .filter(({ valueKey }) => obj[valueKey] != null)
                      .map(({ icon, bubbleClass, valueKey, label, color }) => ({
                        icon,
                        bubbleClass,
                        color,
                        value:
                          UL(obj[valueKey]) +
                          (COUNT_LABELS.has(label) ? "" : " €"),
                        label,
                      }));
                  })()}
                />
              )}
            </TabPane>
            <TabPane tabId="1">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={tabStats.month}
                />
              )}
            </TabPane>
            <TabPane tabId="2">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={tabStats.trim}
                />
              )}
            </TabPane>
            <TabPane tabId="3">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={tabStats.year}
                />
              )}
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>

      {/* Activité période — Martin motion (honest 0 OK; Chatbot=archives created_at) */}
      {(activityPeriod.prospectsCreated != null ||
        activityPeriod.diags != null ||
        activityPeriod.chatbot != null ||
        activityPeriod.mail != null) && (
        <Card className="mt-1">
          <CardHeader className="pb-1 d-flex align-items-center justify-content-between flex-wrap">
            <CardTitle tag="h4" className="mb-0">
              Activité
            </CardTitle>
            <span
              className="text-muted"
              style={{ fontSize: "0.9rem", fontWeight: 500 }}
            >
              {activityPeriod.label}
            </span>
          </CardHeader>
          <CardBody>
            <StatGrid
              stats={[
                activityPeriod.prospectsCreated != null && {
                  icon: Users,
                  color: "#ff9f43",
                  value: fmt(activityPeriod.prospectsCreated),
                  label: "Prospects créés",
                },
                activityPeriod.diags != null && {
                  icon: Activity,
                  color: "#7367f0",
                  value: fmt(activityPeriod.diags),
                  label: "Diags",
                },
                activityPeriod.chatbot != null && {
                  icon: MessageCircle,
                  color: "#00cfe8",
                  value: fmt(activityPeriod.chatbot),
                  label: "Chatbots",
                },
                activityPeriod.mail != null && {
                  icon: FileText,
                  color: "#28c76f",
                  value: fmt(activityPeriod.mail),
                  label: "Mails",
                },
              ].filter(Boolean)}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
