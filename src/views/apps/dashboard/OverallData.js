import React, { useEffect, useMemo, useState, useCallback } from "react";
import { CheckCircle, DollarSign, Inbox, Package, TrendingUp, Users, ChevronDown } from "react-feather";
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
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import classNames from "classnames";

/* ===================== Constantes ===================== */
const FRENCH_MONTHS = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre",
];

const AUTH_CONFIG = {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
};

/* ===================== Styles ===================== */
const DROPDOWN_CSS = `
  /* ---------- Header responsive : grid avec zones ---------- */
  .header-grid {
    display: grid;
    grid-template-columns: 1fr;          /* mobile: 1 colonne */
    grid-template-areas:
      "left"
      "title"
      "right";
    row-gap: 8px;
    align-items: center;
    width: 100%;
    min-height: 48px;
  }
  @media (min-width: 768px) {            /* >= md : une ligne */
    .header-grid {
      grid-template-columns: auto 1fr auto;
      grid-template-areas: "left title right";
      column-gap: 12px;
      row-gap: 0;
    }
  }
  .header-left  { grid-area: left;  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
  .header-right { grid-area: right; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
  .header-title { grid-area: title; display: flex; justify-content: center; min-width: 0; }
  .header-title .info-title {
    margin: 0;
    font-size: clamp(18px, 2.2vw, 22px);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* évite tout chevauchement */
    max-width: 100%;
    text-align: center;
  }

  /* ---------- Boutons "pilule" des dropdowns ---------- */
  .tab-dd .nav-link {
    cursor: pointer;
    border-radius: 9999px;
    padding: 0.35rem 0.75rem;
    border: 1px solid rgba(115,103,240,.25);
    background: rgba(115,103,240,.08);
    transition: background .15s ease, box-shadow .15s ease, border-color .15s ease, color .15s ease;
    display: inline-flex;
    align-items: center;
    gap: .35rem;
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
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0,0,0,.12);
    padding: 6px;
    max-height: 320px;
    overflow-y: auto;
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

  /* ---------- Petits écrans : compacter un peu ---------- */
  @media (max-width: 480px) {
    .tab-dd .nav-link { padding: 0.3rem 0.6rem; }
    .header-right .nav-link { padding: .2rem .45rem; font-size: .95rem; }
  }
`;

/* ===================== Utils ===================== */
const fmt   = (n) => (Number(n || 0)).toLocaleString("fr-FR");
const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const sum   = (arr) => arr.reduce((acc, v) => acc + Number(v || 0), 0);
const getMonthsOfTrim = (i) => { const s = i * 3; return [s, s + 1, s + 2]; };

/* ===================== UI: Items ===================== */
const StatItem = ({ icon: Icon, bubbleClass, value, label, color }) => (
  <div className="mx-auto d-flex align-items-start" style={{ minWidth: 240 }}>
    <div style={{ marginTop: 10 }}>
      <div className={classNames("avatar avatar-stats p-75", bubbleClass)}>
        <div className="avatar-content d-flex align-items-center justify-content-center" style={{ color, opacity: 1 }}>
          <Icon size={32} />
        </div>
      </div>
    </div>
    <div className="ml-1 mt-1" style={{ minWidth: 0 }}>
      <h2 className="mb-25" style={{ fontSize: "clamp(20px, 2.2vw, 28px)", lineHeight: 1.1 }}>{value}</h2>
      <CardTitle className="mb-0" style={{ fontSize: "clamp(13px, 1.6vw, 16px)", whiteSpace: "normal", textAlign: "left" }}>{label}</CardTitle>
    </div>
  </div>
);

const StatGrid = ({ stats }) => (
  <div
    className="icon-section form-inline text-bold-600 w-100"
    style={{
      width: "100%",
      margin: "10px 20px",
      padding: "10px 20px",
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
    {stats.map((s) => <StatItem key={s.label} {...s} />)}
  </div>
);

/* ===================== Data shaping ===================== */
function normalizeApiYear(dataByMonthIndex1to12) {
  const months = Array.from({ length: 12 }, (_, i) => dataByMonthIndex1to12[i + 1] || {});
  return {
    client_count:           months.map((m) => m.current_acompte_count   || 0),
    current_total_amount:   months.map((m) => m.current_total_amount     || 0),
    total_ended_count:      months.map((m) => m.total_ended_count        || 0),
    current_acompte_amount: months.map((m) => m.current_acompte_amount   || 0),
    current_solde_amount:   months.map((m) => m.current_solde_amount     || 0),
    opportunite_amount:     months.map((m) => m.opportunite_amount       || 0),
    opportunite_count:      months.map((m) => m.opportunite_count        || 0),
  };
}

/* ===================== Composant principal ===================== */
export default function OverallCard({ iconBg, className, iconRight, hideChart }) {
  const now = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState("1"); // "1" Mois, "2" Trimestre, "3" Années
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth()); // 0..11
  const [trimIndex, setTrimIndex] = useState(Math.floor(now.getMonth() / 3)); // 0..3

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [data, setData]       = useState(() => normalizeApiYear({}));

  // Fetch
  const fetchYear = useCallback(async (y) => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${global.config.server_url}/get_statistics_total_income?year=${y}`, AUTH_CONFIG);
      setData(normalizeApiYear(res.data || {}));
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les statistiques. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchYear(year); }, [fetchYear, year]);

  // Dérivés
  const monthlyStats = useMemo(() => ({
    ca: fmt(data.current_total_amount[monthIndex]),
    acompte: fmt(data.current_acompte_amount[monthIndex]),
    solde: fmt(data.current_solde_amount[monthIndex]),
    oppoAmount: fmt(data.opportunite_amount[monthIndex]),
    clientsSignes: fmt(data.client_count[monthIndex]),
    prospects: fmt(data.opportunite_count[monthIndex]),
    totalClients: fmt((Number(data.client_count[monthIndex]) || 0) + (Number(data.opportunite_count[monthIndex]) || 0)),
    contratsClotures: fmt(data.total_ended_count[monthIndex]),
  }), [data, monthIndex]);

  const trimesterStats = useMemo(() => {
    const m = getMonthsOfTrim(trimIndex);
    const pick = (arr) => m.map((i) => arr[i]);
    return {
      ca: fmt(sum(pick(data.current_total_amount))),
      acompte: fmt(sum(pick(data.current_acompte_amount))),
      solde: fmt(sum(pick(data.current_solde_amount))),
      oppoAmount: fmt(sum(pick(data.opportunite_amount))),
      clientsSignes: fmt(sum(pick(data.client_count))),
      prospects: fmt(sum(pick(data.opportunite_count))),
      totalClients: fmt(sum(pick(data.client_count)) + sum(pick(data.opportunite_count))),
      contratsClotures: fmt(sum(pick(data.total_ended_count))),
    };
  }, [data, trimIndex]);

  const yearlyStats = useMemo(() => ({
    ca: fmt(sum(data.current_total_amount)),
    acompte: fmt(sum(data.current_acompte_amount)),
    solde: fmt(sum(data.current_solde_amount)),
    oppoAmount: fmt(sum(data.opportunite_amount)),
    clientsSignes: fmt(sum(data.client_count)),
    prospects: fmt(sum(data.opportunite_count)),
    totalClients: fmt(sum(data.client_count) + sum(data.opportunite_count)),
    contratsClotures: fmt(sum(data.total_ended_count)),
  }), [data]);

  // Menus
  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return range(2018, current + 5);
  }, [now]);

  const tabStats = useMemo(() => {
    const UL = (v) => v;
    const common = [
      { icon: TrendingUp, bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-warning", valueKey: "ca",              label: "Chiffre d'affaires", color: "#ff9f43" },
      { icon: Inbox,      bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-info",    valueKey: "acompte",         label: "Acomptes",            color: "#00cfe8" },
      { icon: Package,    bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-info",    valueKey: "solde",           label: "Soldes",              color: "#00cfe8" },
      { icon: DollarSign, bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-success", valueKey: "oppoAmount",      label: "Opportunités",        color: "#28c76f" },
      { icon: Users,      bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-primary", valueKey: "clientsSignes",   label: "Clients signés",      color: "#7367f0" },
      { icon: Users,      bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-primary", valueKey: "prospects",       label: "Prospects",           color: "#7367f0" },
      { icon: Users,      bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-primary", valueKey: "totalClients",    label: "Total clients",       color: "#7367f0" },
      { icon: CheckCircle,bubbleClass: iconBg ? `bg-rgba-${iconBg}` : "bg-rgba-danger",  valueKey: "contratsClotures",label: "Contrats cloturés",   color: "#ea5455" },
    ];
    const toCards = (obj) => common.map(({ icon, bubbleClass, valueKey, label, color }) => ({
      icon, bubbleClass, color,
      value: UL(obj[valueKey]) + (label !== "Clients signés" && label !== "Prospects" && label !== "Total clients" && label !== "Contrats cloturés" ? " €" : ""),
      label,
    }));
    return { month: toCards(monthlyStats), trim: toCards(trimesterStats), year: toCards(yearlyStats) };
  }, [iconBg, monthlyStats, trimesterStats, yearlyStats]);

  // ----- Dropdowns (Année/Mois/Trimestre) -----
  const TabDropdown = ({ label, valueLabel, children, isOpen, toggle, minWidth = 120 }) => (
    <Dropdown nav inNavbar isOpen={isOpen} toggle={toggle} className="tab-dd">
      <DropdownToggle
        nav caret={false} tag="button" type="button"
        className={classNames("nav-link d-flex align-items-center", { active: isOpen })}
        style={{ color:"#212529", fontWeight:500, minWidth, height:"1.9rem", lineHeight:1.2 }}
        aria-haspopup="listbox" aria-expanded={isOpen} title={`${label} — cliquer pour choisir`}
      >
        {valueLabel || label}
        <ChevronDown size={16} className="chev" />
      </DropdownToggle>
      <DropdownMenu>{children}</DropdownMenu>
    </Dropdown>
  );

  const [openYear, setOpenYear]   = useState(false);
  const [openMonth, setOpenMonth] = useState(false);
  const [openTrim, setOpenTrim]   = useState(false);

  // Filtres gauche
  const FiltersLeft = () => (
    <Nav className="d-flex align-items-center flex-wrap">
      <NavItem className="mr-1 mb-1">
        <TabDropdown
          label="Année"
          valueLabel={String(year)}
          isOpen={openYear}
          toggle={() => setOpenYear((v) => !v)}
          minWidth={90}
        >
          {yearOptions.map((y) => (
            <DropdownItem key={y} active={y === year} onClick={() => { setYear(y); setOpenYear(false); }}>
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
            toggle={() => setOpenMonth((v) => !v)}
            minWidth={140}
          >
            {FRENCH_MONTHS.map((m, idx) => (
              <DropdownItem key={m} active={idx === monthIndex} onClick={() => { setMonthIndex(idx); setOpenMonth(false); }}>
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
            toggle={() => setOpenTrim((v) => !v)}
            minWidth={140}
          >
            {[1, 2, 3, 4].map((t, i) => (
              <DropdownItem key={t} active={i === trimIndex} onClick={() => { setTrimIndex(i); setOpenTrim(false); }}>
                {`Trimestre ${t}`}
              </DropdownItem>
            ))}
          </TabDropdown>
        </NavItem>
      )}
    </Nav>
  );

  // Onglets droite
  const TabsRight = () => (
    <div className="header-right">
      <Nav tabs className="nav-tabs d-flex align-items-center flex-wrap">
        <NavItem>
          <NavLink className={classNames({ active: activeTab === "1" })} onClick={() => setActiveTab("1")}>
            Mois
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classNames({ active: activeTab === "2" })} onClick={() => setActiveTab("2")}>
            Trimestre
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classNames({ active: activeTab === "3" })} onClick={() => setActiveTab("3")}>
            Années
          </NavLink>
        </NavItem>
      </Nav>
    </div>
  );

  /* -------------------- Rendu -------------------- */
  return (
    <>
      <style>{DROPDOWN_CSS}</style>
      <Card>
        <CardHeader className="pb-2">
          <div className="header-grid">
            <div className="header-left">
              <FiltersLeft />
            </div>

            <div className="header-title">
              <CardTitle tag="h4" className="info-title">Informations</CardTitle>
            </div>

            <TabsRight />
          </div>
        </CardHeader>

        <CardBody
          className={classNames(
            className ? className : "stats-card-body",
            "d-flex",
            !iconRight && !hideChart
              ? "flex-column align-items-start"
              : iconRight
              ? "justify-content-between flex-row-reverse align-items-center"
              : hideChart && !iconRight
              ? "justify-content-center flex-column text-center"
              : null,
            !hideChart ? "pb-0" : "pb-2",
            "pt-2"
          )}
        >
          {error && <div className="w-100 alert alert-danger" role="alert">{error}</div>}

          <TabContent activeTab={activeTab} className="w-100">
            <TabPane tabId="1">
              {loading ? <div className="w-100 text-center py-3">Chargement…</div> : <StatGrid stats={tabStats.month} />}
            </TabPane>
            <TabPane tabId="2">
              {loading ? <div className="w-100 text-center py-3">Chargement…</div> : <StatGrid stats={tabStats.trim} />}
            </TabPane>
            <TabPane tabId="3">
              {loading ? <div className="w-100 text-center py-3">Chargement…</div> : <StatGrid stats={tabStats.year} />}
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </>
  );
}
