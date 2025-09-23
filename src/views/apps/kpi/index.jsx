import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Row,
  Col,
  Input,
  Label,
  Table,
  Badge,
  UncontrolledButtonDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
} from "reactstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/** =============================
 *  Helpers (token, admin id, date)
 *  =============================*/
const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || ""; // ex: "" (même domaine) ou "https://mon-vps"
const API = axios.create({
  baseURL: `${global.config.server_url}`,
  headers: {
    Accept: "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO week utils */
function isoWeekKey(dateInput) {
  const d = new Date(dateInput);
  // ISO: lundi=1..dim=7
  const day = (d.getDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);
  const week =
    1 + Math.round((thursday - firstThursday) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
function monthKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** =============================
 *  UI bits
 *  =============================*/
const OBJETS = ["appel entrant", "appel sortant"];
const ACTIONS = [
  "Rdv pris",
  "mail proposition envoyé",
  "affaire signée",
  "échec",
];

export default function KpiPage() {
  // Création KPI
  const [objet, setObjet] = useState("appel entrant"); // par défaut pour aller vite
  const [action, setAction] = useState(""); // pas obligatoire
  const [creating, setCreating] = useState(false);
  var adminId = localStorage.getItem("userid");
  const [error, setError] = useState("");

  // Liste KPI (pagination API)
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  // Graph controls
  const [groupBy, setGroupBy] = useState("week"); // "week" | "month"
  const [actionFilter, setActionFilter] = useState("all"); // "all" | ACTION

  useEffect(() => {
    fetchKpis(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

    async function fetchKpis(p = 1) {
    try {
        setLoadingList(true);
        setError("");

        // envoie ?page=p uniquement si p > 1 (et via axios params)
        const res = await API.get("/kpis", {
        params: p > 1 ? { page: p } : {},
        });

        const payload = res.data;

        // supporte les 2 formats:
        // - paginate: { data: [...], last_page: N } ou { data: [...], meta: { last_page: N } }
        // - array simple: [...]
        const data = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];

        setItems(data);

        const lp =
        payload?.last_page ||
        payload?.meta?.last_page ||
        1; // si pas de pagination, on reste à 1
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


  async function createKpi() {
    try {
      setCreating(true);
      setError("");
      const body = {
        objet: objet || null,
        action: action || null,
        kpi_date: todayStr(),
      };
      if (adminId) body.admin_id = adminId; // sinon on n’envoie pas

      await API.post("/kpis", body);
      // refresh la 1ère page (ou la page courante si tu préfères)
      setPage(1);
      await fetchKpis(1);
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

  /** Agrégation des KPI pour le graph */
  const chartData = useMemo(() => {
    const counts = new Map();
    (items || []).forEach((k) => {
      const dateStr = k.kpi_date || k.created_at || k.updated_at;
      if (!dateStr) return;
      if (actionFilter !== "all" && k.action !== actionFilter) return;
      const key = groupBy === "week" ? isoWeekKey(dateStr) : monthKey(dateStr);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const arr = Array.from(counts.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => (a.period > b.period ? 1 : -1));
    return arr;
  }, [items, groupBy, actionFilter]);

  return (
    <div className="vx-row">
      {/* ====== Carte création KPI ====== */}
      <div className="vx-col w-100">
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Créer un KPI</h4>
            <Badge color="light-secondary">
              {adminId ? `admin_id: ${adminId}` : "admin_id: (auto non trouvé)"}
            </Badge>
          </CardHeader>
          <CardBody>
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

            <Row>
              {/* OBJET */}
              <Col md="6" xs="12" className="mb-2">
                <Label className="d-block" style={{ fontWeight: 600 }}>
                  Objet
                </Label>
                <div className="d-flex gap-1">
                  {OBJETS.map((o) => (
                    <Button
                      key={o}
                      color={objet === o ? "primary" : "light"}
                      className="mr-1"
                      onClick={() => setObjet(o)}
                    >
                      {o}
                    </Button>
                  ))}
                </div>
              </Col>

              {/* ACTION */}
              <Col md="6" xs="12" className="mb-2">
                <Label className="d-block" style={{ fontWeight: 600 }}>
                  Action
                </Label>
                <div className="d-flex flex-wrap gap-1">
                  {ACTIONS.map((a) => (
                    <Button
                      key={a}
                      color={action === a ? "success" : "light"}
                      className="mr-1 mb-1"
                      onClick={() => setAction(a)}
                    >
                      {a}
                    </Button>
                  ))}
                </div>
              </Col>
            </Row>
            <div className="d-flex mt-2">
              <Button color="primary" onClick={createKpi} disabled={creating}>
                {creating ? "Création..." : "Créer le KPI"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ====== Graph ====== */}
      <div className="vx-col w-100">
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Vue d’ensemble</h4>

            <div className="d-flex align-items-center">
              {/* GroupBy */}
              <UncontrolledButtonDropdown className="mr-1">
                <DropdownToggle caret color="light">
                  {groupBy === "week" ? "Par semaine" : "Par mois"}
                </DropdownToggle>
                <DropdownMenu right>
                  <DropdownItem onClick={() => setGroupBy("week")}>
                    Par semaine
                  </DropdownItem>
                  <DropdownItem onClick={() => setGroupBy("month")}>
                    Par mois
                  </DropdownItem>
                </DropdownMenu>
              </UncontrolledButtonDropdown>

              {/* Action filter */}
              <UncontrolledButtonDropdown>
                <DropdownToggle caret color="light">
                  {actionFilter === "all" ? "Toutes actions" : actionFilter}
                </DropdownToggle>
                <DropdownMenu right>
                  <DropdownItem onClick={() => setActionFilter("all")}>
                    Toutes actions
                  </DropdownItem>
                  {ACTIONS.map((a) => (
                    <DropdownItem key={a} onClick={() => setActionFilter(a)}>
                      {a}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </UncontrolledButtonDropdown>
            </div>
          </CardHeader>
          <CardBody style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
            {chartData.length === 0 ? (
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
                  <th>#</th>
                  <th>Date</th>
                  <th>Objet</th>
                  <th>Action</th>
                  <th>Admin ID</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan="5">Chargement…</td>
                  </tr>
                ) : items?.length ? (
                  items.map((k) => (
                    <tr key={k.id}>
                      <td>{k.id}</td>
                      <td>{k.kpi_date || (k.created_at || "").slice(0, 10)}</td>
                      <td>{k.objet || <em style={{ opacity: 0.6 }}>(vide)</em>}</td>
                      <td>{k.action || <em style={{ opacity: 0.6 }}>(vide)</em>}</td>
                      <td>{k.admin_id ?? <em style={{ opacity: 0.6 }}>(null)</em>}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">Aucun KPI.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
