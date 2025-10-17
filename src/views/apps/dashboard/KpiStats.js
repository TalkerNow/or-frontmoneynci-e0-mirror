import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Card, CardBody, Row, Col } from "reactstrap";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Mail,
  Calendar,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "react-feather";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/** ===== Utilitaires semaine ===== */
function isoWeekInfo(dateInput) {
  const d = new Date(dateInput);
  const day = (d.getDay() + 6) % 7;
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
function weekStartEnd(isoYear, isoWeek) {
  const simple = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7);
  const dow = (simple.getDay() + 6) % 7;
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dow);
  const end = new Date(monday);
  end.setDate(monday.getDate() + 6);
  return { start: monday, end };
}

/** ===== Couleurs prestations ===== */
const serviceColors = {
  CH: "#f59e0b",
  SIMU: "#10b981",
  AR: "#6366f1",
  TFD: "#ef4444",
  ACTU: "#0ea5e9",
  RAC: "#6b7280",
};

export default function KpiStats() {
  const today = new Date();
  const { isoYear: initialYear, isoWeek: initialWeek } = isoWeekInfo(today);

  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);

  const { start: weekStart, end: weekEnd } = useMemo(
    () => weekStartEnd(year, week),
    [year, week]
  );

  const [stats, setStats] = useState({
    appelsRecus: 0,
    appelsSortants: 0,
    mailsRecus: 0,
    rdvPris: 0,
    services: { CH: 0, SIMU: 0, AR: 0, TFD: 0, ACTU: 0, RAC: 0 },
  });
  const [callsData, setCallsData] = useState([]);

  const fetchAllKpis = async () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("jwt");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let aggregated = [];
    let p = 1;
    let maxPage = 1;
    do {
      const res = await axios.get(`${global.config.server_url}/kpis`, {
        headers,
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
    return aggregated;
  };

  const fetchStatsWeek = useCallback(async () => {
    try {
      // 1) Fetch all KPI from API (same as CRM page)
      const all = await fetchAllKpis();

      // 2) Prepare 7 days map for the current week
      const byDay = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        byDay[key] = { date: key, entrants: 0, sortants: 0 };
      }

      // 3) Filter kpis to current week and count entrants/sortants + mails/rdv
      let entrantsCount = 0,
        sortantsCount = 0,
        mailsCount = 0,
        rdvPrisCount = 0;

      const inWeek = [];
      for (const k of all) {
        const raw = k.kpi_date || k.created_at || k.updated_at;
        if (!raw) continue;
        const d = new Date(raw);
        if (isNaN(d.getTime())) continue;
        if (d < weekStart || d > weekEnd) continue;
        inWeek.push({ d, k });
        const obj = (k.objet || k.object || "").toString().toLowerCase();
        const action = (k.action || "").toString().toLowerCase();
        const dayKey = d.toISOString().slice(0, 10);
        if (!byDay[dayKey]) byDay[dayKey] = { date: dayKey, entrants: 0, sortants: 0 };
        if (obj === "appel entrant") {
          byDay[dayKey].entrants += 1;
          entrantsCount += 1;
        } else if (obj === "appel sortant") {
          byDay[dayKey].sortants += 1;
          sortantsCount += 1;
        }
        if (obj === "email" || action === "email reçu" || action === "email recu") {
          mailsCount += 1;
        }
        if (action === "rdv pris") {
          rdvPrisCount += 1;
        }
      }

      // 4) Update stats (preserve other fields)
      setStats((prev) => ({
        ...prev,
        appelsRecus: entrantsCount,
        appelsSortants: sortantsCount,
        mailsRecus: mailsCount,
        rdvPris: rdvPrisCount,
      }));

      // 5) Update chart data (sorted by date)
      const ordered = Object.values(byDay).sort((a, b) => (a.date > b.date ? 1 : -1));
      setCallsData(ordered);

      // 6) Fetch contracts/documents and compute services counts for the same week
      const fetchAllContracts = async () => {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("jwt");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let aggregated = [];
        let p = 1;
        let maxPage = 1;
        do {
          const res = await axios.get(`${global.config.server_url}/documents`, {
            headers,
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
        return aggregated;
      };

      const allContracts = await fetchAllContracts();
      const filteredContracts = allContracts.filter((c) => {
        const raw = c.created_at || c.date_creation;
        if (!raw) return false;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return false;
        return d >= weekStart && d <= weekEnd;
      });

      const counts = { CH: 0, SIMU: 0, AR: 0, TFD: 0, ACTU: 0, RAC: 0 };
      for (const c of filteredContracts) {
        // subscribe_services like: "CH/SIMU/AR" or quoted
        const servicesRaw = c.prestation || c.subscribe_services || "";
        const cleaned = String(servicesRaw).replace(/"/g, "").trim();
        if (!cleaned) continue;
        const parts = cleaned.split("/").map((s) => s.trim().toUpperCase()).filter(Boolean);
        for (const s of parts) {
          if (counts[s] !== undefined) counts[s] += 1;
        }
      }

      setStats((prev) => ({ ...prev, services: counts }));
    } catch (err) {
      console.error("Erreur récupération stats:", err);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchStatsWeek();
  }, [fetchStatsWeek]);

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

  return (
    <Row>
      {/* Stats */}
      <Col lg="6" md="12" className="mb">
        <Card style={{ borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", marginBottom: "8px" }}>
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 style={{ fontWeight: 600 }}>Statistiques Activité (sem. {week})</h5>
              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                <button
                  onClick={() => stepWeek(-1)}
                  style={{
                    border: "none",
                    background: "linear-gradient(to bottom, #f9fafb, #e5e7eb)",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "background 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d1d5db")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(to bottom, #f9fafb, #e5e7eb)")
                  }
                  aria-label="Semaine précédente"
                  title="Semaine précédente"
                >
                  <ChevronLeft size={18} color="#374151" />
                </button>
                <button
                  onClick={() => stepWeek(1)}
                  style={{
                    border: "none",
                    background: "linear-gradient(to bottom, #f9fafb, #e5e7eb)",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "background 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d1d5db")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(to bottom, #f9fafb, #e5e7eb)")
                  }
                  aria-label="Semaine suivante"
                  title="Semaine suivante"
                >
                  <ChevronRight size={18} color="#374151" />
                </button>
              </div>
            </div>

            <Row className="text-center">
              <Col xs="6" md="3" className="mb-3">
                <PhoneIncoming size={18} color="#8b5cf6" className="mb-1" />
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stats.appelsRecus}</div>
                <small style={{ fontSize: 12, color: "#6b7280" }}>Appels reçus</small>
              </Col>
              <Col xs="6" md="3" className="mb-3">
                <PhoneOutgoing size={18} color="#f97316" className="mb-1" />
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stats.appelsSortants}</div>
                <small style={{ fontSize: 12, color: "#6b7280" }}>Appels sortants</small>
              </Col>
              <Col xs="6" md="3" className="mb-3">
                <Mail size={18} color="#10b981" className="mb-1" />
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stats.mailsRecus}</div>
                <small style={{ fontSize: 12, color: "#6b7280" }}>Mails reçus</small>
              </Col>
              <Col xs="6" md="3" className="mb-3">
                <Calendar size={18} color="#f59e0b" className="mb-1" />
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stats.rdvPris}</div>
                <small style={{ fontSize: 12, color: "#6b7280" }}>RDV pris</small>
              </Col>
            </Row>

            <Row className="text-center">
              {Object.entries(stats.services).map(([service, count]) => (
                <Col xs="6" md="2" key={service} className="mb-3">
                  <Briefcase size={18} color={serviceColors[service]} className="mb-1" />
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{count}</div>
                  <small style={{ fontSize: 12, color: "#6b7280" }}>{service}</small>
                </Col>
              ))}
            </Row>
          </CardBody>
        </Card>
      </Col>

      {/* Graph */}
      <Col lg="6" md="12" className="mb">
        <Card style={{ borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
          <CardBody>
            <h5 style={{ fontWeight: 600, marginBottom: 20 }}>
              Appels / Mails (sem. {week})
            </h5>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={callsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entrants" stroke="#8b5cf6" dot={{ r: 3 }} name="Entrants" />
                <Line type="monotone" dataKey="sortants" stroke="#f97316" dot={{ r: 3 }} name="Sortants" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
}
