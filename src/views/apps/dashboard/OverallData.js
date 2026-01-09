import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle,
  DollarSign,
  Inbox,
  Package,
  TrendingUp,
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
import ProspectsDetailsModal from "./ProspectsDetailsModal";

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

const StatGrid = ({ stats, onProspectsClick }) => (
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
      <StatItem
        key={s.label}
        {...s}
        onClick={s.label === "Prospects" ? onProspectsClick : undefined}
      />
    ))}
  </div>
);

/* ===================== Data shaping ===================== */
function normalizeApiYear(dataByMonthIndex1to12) {
  const months = Array.from(
    { length: 12 },
    (_, i) => dataByMonthIndex1to12[i + 1] || {}
  );
  return {
    client_count: months.map((m) => m.current_acompte_count || 0),
    current_total_amount: months.map((m) => m.current_total_amount || 0),
    total_ended_count: months.map((m) => m.total_ended_count || 0),
    current_acompte_amount: months.map((m) => m.current_acompte_amount || 0),
    current_solde_amount: months.map((m) => m.current_solde_amount || 0),
    opportunite_amount: months.map((m) => m.opportunite_amount || 0),
    opportunite_count: months.map((m) => m.opportunite_count || 0),
  };
}

/* ===================== Composant principal ===================== */
export default function OverallCard() {
  const now = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState("1");
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [trimIndex, setTrimIndex] = useState(Math.floor(now.getMonth() / 3));
  const [openWeek, setOpenWeek] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(
    () => `W${isoWeekInfo(new Date()).isoWeek}`
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(() => normalizeApiYear({}));

  const fetchYear = useCallback(async (y) => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `${global.config.server_url}/get_statistics_total_income?year=${y}`,
        AUTH_CONFIG
      );
      setData(normalizeApiYear(res.data || {}));
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les statistiques. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchYear(year);
  }, [fetchYear, year]);

  const statsForMonth = useCallback(
    (i) => ({
      ca: fmt(data.current_total_amount[i]),
      acompte: fmt(data.current_acompte_amount[i]),
      solde: fmt(data.current_solde_amount[i]),
      oppoAmount: fmt(data.opportunite_amount[i]),
      clientsSignes: fmt(data.client_count[i]),
      prospects: fmt(data.opportunite_count[i]),
      totalClients: fmt(
        (Number(data.client_count[i]) || 0) +
          (Number(data.opportunite_count[i]) || 0)
      ),
      contratsClotures: fmt(data.total_ended_count[i]),
    }),
    [data]
  );

  const monthlyStats = useMemo(
    () => ({
      ca: fmt(data.current_total_amount[monthIndex]),
      acompte: fmt(data.current_acompte_amount[monthIndex]),
      solde: fmt(data.current_solde_amount[monthIndex]),
      oppoAmount: fmt(data.opportunite_amount[monthIndex]),
      clientsSignes: fmt(data.client_count[monthIndex]),
      prospects: fmt(data.opportunite_count[monthIndex]),
      totalClients: fmt(
        (Number(data.client_count[monthIndex]) || 0) +
          (Number(data.opportunite_count[monthIndex]) || 0)
      ),
      contratsClotures: fmt(data.total_ended_count[monthIndex]),
    }),
    [data, monthIndex]
  );

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
      totalClients: fmt(
        sum(pick(data.client_count)) + sum(pick(data.opportunite_count))
      ),
      contratsClotures: fmt(sum(pick(data.total_ended_count))),
    };
  }, [data, trimIndex]);

  const yearlyStats = useMemo(
    () => ({
      ca: fmt(sum(data.current_total_amount)),
      acompte: fmt(sum(data.current_acompte_amount)),
      solde: fmt(sum(data.current_solde_amount)),
      oppoAmount: fmt(sum(data.opportunite_amount)),
      clientsSignes: fmt(sum(data.client_count)),
      prospects: fmt(sum(data.opportunite_count)),
      totalClients: fmt(sum(data.client_count) + sum(data.opportunite_count)),
      contratsClotures: fmt(sum(data.total_ended_count)),
    }),
    [data]
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
    return range(2018, current + 5);
  }, [now]);

  const tabStats = useMemo(() => {
    const UL = (v) => v;
    const common = [
      {
        icon: TrendingUp,
        bubbleClass: "bg-rgba-warning",
        valueKey: "ca",
        label: "Chiffre d'affaires",
        color: "#7367f0",
      },
      {
        icon: Inbox,
        bubbleClass: "bg-rgba-info",
        valueKey: "acompte",
        label: "Acomptes",
        color: "#00cfe8",
      },
      {
        icon: Package,
        bubbleClass: "bg-rgba-info",
        valueKey: "solde",
        label: "Soldes",
        color: "#00cfe8",
      },
      {
        icon: DollarSign,
        bubbleClass: "bg-rgba-success",
        valueKey: "oppoAmount",
        label: "Opportunités",
        color: "#28c76f",
      },
      {
        icon: Users,
        bubbleClass: "bg-rgba-primary",
        valueKey: "clientsSignes",
        label: "Clients signés",
        color: "#28c76f",
      },
      {
        icon: Users,
        bubbleClass: "bg-rgba-primary",
        valueKey: "prospects",
        label: "Prospects",
        color: "#ff9f43",
      },
      {
        icon: Users,
        bubbleClass: "bg-rgba-primary",
        valueKey: "totalClients",
        label: "Total clients",
        color: "#7367f0",
      },
      {
        icon: CheckCircle,
        bubbleClass: "bg-rgba-danger",
        valueKey: "contratsClotures",
        label: "Contrats cloturés",
        color: "#ea5455",
      },
    ];
    const toCards = (obj) =>
      common.map(({ icon, bubbleClass, valueKey, label, color }) => ({
        icon,
        bubbleClass,
        color,
        value:
          UL(obj[valueKey]) +
          (label !== "Clients signés" &&
          label !== "Prospects" &&
          label !== "Total clients" &&
          label !== "Contrats cloturés"
            ? " €"
            : ""),
        label,
      }));
    return {
      month: toCards(monthlyStats),
      trim: toCards(trimesterStats),
      year: toCards(yearlyStats),
    };
  }, [monthlyStats, trimesterStats, yearlyStats]);

  const [openYear, setOpenYear] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);
  const [openTrim, setOpenTrim] = useState(false);
  const [prospectsModalOpen, setProspectsModalOpen] = useState(false);

  // Handler pour ouvrir la modale Prospects
  const handleProspectsClick = useCallback(() => {
    setProspectsModalOpen(true);
  }, []);

  // Extrait le numéro de semaine depuis currentWeek ("W12" -> 12)
  const weekNumber = useMemo(() => {
    return Number(String(currentWeek).replace(/\D/g, "")) || 1;
  }, [currentWeek]);

  const FiltersLeft = () => (
    <Nav className="d-flex align-items-center flex-wrap">
      <NavItem className="mr-1 mb-1">
        <TabDropdown
          label="Année"
          valueLabel={String(year)}
          isOpen={openYear}
          toggle={() => setOpenYear(!openYear)}
          minWidth={70}
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
          >
            {Array.from(
              {
                length:
                  year === new Date().getFullYear()
                    ? isoWeekInfo(new Date()).isoWeek
                    : isoWeeksInYear(year),
              },
              (_, i) => `W${i + 1}`
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

  return (
    <>
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
                    const common = [
                      {
                        icon: TrendingUp,
                        bubbleClass: "bg-rgba-warning",
                        valueKey: "ca",
                        label: "Chiffre d'affaires",
                        color: "#7367f0",
                      },
                      {
                        icon: Inbox,
                        bubbleClass: "bg-rgba-info",
                        valueKey: "acompte",
                        label: "Acomptes",
                        color: "#00cfe8",
                      },
                      {
                        icon: Package,
                        bubbleClass: "bg-rgba-info",
                        valueKey: "solde",
                        label: "Soldes",
                        color: "#00cfe8",
                      },
                      {
                        icon: DollarSign,
                        bubbleClass: "bg-rgba-success",
                        valueKey: "oppoAmount",
                        label: "Opportunités",
                        color: "#28c76f",
                      },
                      {
                        icon: Users,
                        bubbleClass: "bg-rgba-primary",
                        valueKey: "clientsSignes",
                        label: "Clients signés",
                        color: "#28c76f",
                      },
                      {
                        icon: Users,
                        bubbleClass: "bg-rgba-primary",
                        valueKey: "prospects",
                        label: "Prospects",
                        color: "#ff9f43",
                      },
                      {
                        icon: Users,
                        bubbleClass: "bg-rgba-primary",
                        valueKey: "totalClients",
                        label: "Total clients",
                        color: "#7367f0",
                      },
                      {
                        icon: CheckCircle,
                        bubbleClass: "bg-rgba-danger",
                        valueKey: "contratsClotures",
                        label: "Contrats cloturés",
                        color: "#ea5455",
                      },
                    ];
                    const obj = weeklyStats;
                    return common.map(
                      ({ icon, bubbleClass, valueKey, label, color }) => ({
                        icon,
                        bubbleClass,
                        color,
                        value:
                          UL(obj[valueKey]) +
                          (label !== "Clients signés" &&
                          label !== "Prospects" &&
                          label !== "Total clients" &&
                          label !== "Contrats cloturés"
                            ? " €"
                            : ""),
                        label,
                      })
                    );
                  })()}
                  onProspectsClick={handleProspectsClick}
                />
              )}
            </TabPane>
            <TabPane tabId="1">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={tabStats.month}
                  onProspectsClick={handleProspectsClick}
                />
              )}
            </TabPane>
            <TabPane tabId="2">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={tabStats.trim}
                  onProspectsClick={handleProspectsClick}
                />
              )}
            </TabPane>
            <TabPane tabId="3">
              {loading ? (
                <div className="w-100 text-center py-3">Chargement…</div>
              ) : (
                <StatGrid
                  stats={tabStats.year}
                  onProspectsClick={handleProspectsClick}
                />
              )}
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>

      {/* Modal Drill-Down Prospects */}
      <ProspectsDetailsModal
        isOpen={prospectsModalOpen}
        toggle={() => setProspectsModalOpen(false)}
        year={year}
        monthIndex={monthIndex}
        trimIndex={trimIndex}
        activeTab={activeTab}
        weekNumber={weekNumber}
      />
    </>
  );
}
