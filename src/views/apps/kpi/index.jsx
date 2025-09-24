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
import { Trash2 } from "react-feather"; // icône poubelle

/** =============================
 *  Helpers (token, admin id, date)
 *  =============================*/
const API_BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || ""; // ex: "" (même domaine) ou "https://mon-vps"
const API = axios.create({
  baseURL: `${global.config.server_url}`,
  headers: {
    Accept: "application/json",
  },
});

// Catégories d'actions (avec "autre")
const ACTIONS_BASE = [
  "Rdv pris",
  "mail proposition envoyé",
  "affaire signée",
  "échec",
];
const ACTION_OTHER = "autre";
const ACTIONS_ALL = [...ACTIONS_BASE, ACTION_OTHER];

const ACTION_FILLS = {
  "Rdv pris": "#28a745", // success
  "mail proposition envoyé": "#17a2b8", // info
  "affaire signée": "#007bff", // primary
  "échec": "#dc3545", // danger
  [ACTION_OTHER]: "#6c757d", // secondary/gris
};

const ACTION_COLORS = {
  "Rdv pris": "success",
  "mail proposition envoyé": "info",
  "affaire signée": "primary",
  "échec": "danger",
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

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

/** ISO week utils */
function isoWeekInfo(dateInput) {
  const d = new Date(dateInput);
  // Transforme en jeudi de la semaine correspondante
  const day = (d.getDay() + 6) % 7; // 0=lundi ... 6=dimanche
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const isoYear = thursday.getFullYear();

  // Jeudi de la 1ère semaine ISO de l'année
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);

  const week =
    1 + Math.round((thursday - firstThursday) / (7 * 24 * 3600 * 1000));

  return { isoYear, isoWeek: week };
}

function isoWeekKey(dateInput) {
  const { isoYear, isoWeek } = isoWeekInfo(dateInput);
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

function isoWeeksInYear(isoYear) {
  // Le nombre de semaines ISO d'une année = le n° de semaine de la date du 28 décembre.
  const dec28 = new Date(isoYear, 11, 28);
  return isoWeekInfo(dec28).isoWeek;
}

function monthKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** =============================
 *  UI bits
 *  =============================*/
const OBJETS = ["appel entrant", "appel sortant"];

export default function KpiPage() {
  // Création KPI
  const [objet, setObjet] = useState("appel entrant"); // par défaut pour aller vite
  const [action, setAction] = useState(""); // pas obligatoire
  const [creating, setCreating] = useState(false);
  var adminId = localStorage.getItem("userid");
  const [error, setError] = useState("");

  // Liste KPI (pagination API)
  const [items, setItems] = useState([]); // éléments pour la TABLE (page courante)
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  // Utilisateurs (admin -> nom/prénom)
  const [usersById, setUsersById] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Données complètes pour le GRAPHIQUE
  const [allItems, setAllItems] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Graph controls
  const [groupBy, setGroupBy] = useState("week"); // "week" | "month"
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear); // filtre d'année pour la vue
  const [actionFilter, setActionFilter] = useState("all"); // "all" | ACTIONS_ALL

  // Suppression
  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Charger la TABLE paginée
  useEffect(() => {
    fetchKpis(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Charger TOUTES les données pour le GRAPHIQUE (toutes pages)
  useEffect(() => {
    fetchAllKpis();
    fetchMembers();
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
        const res = await API.get("/kpis", { params: p > 1 ? { page: p } : {} });
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
        const first = u.first_name ?? u.firstname ?? u.firstName ?? u.prenom ?? "";
        const last = u.last_name ?? u.lastname ?? u.lastName ?? u.nom ?? "";
        const fallback = u.name ?? u.username ?? u.email ?? String(id);
        const name = (`${first} ${last}`.trim()) || fallback;
        map[id] = name;
      });
      setUsersById(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
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
      if (adminId) body.admin_id = adminId;

      await API.post("/kpis", body);
      // Refresh table ET graph
      setPage(1);
      await fetchKpis(1);
      await fetchAllKpis();
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

  function openConfirmModal(kpiRow) {
    setToDelete(kpiRow);
    setConfirmOpen(true);
  }

  function closeConfirmModal() {
    if (deletingId) return; // évite la fermeture pendant la suppression
    setConfirmOpen(false);
    setToDelete(null);
  }

  // Suppression après confirmation (modale)
  async function deleteKpi(id) {
    if (!id) return;
    try {
      setDeletingId(id);
      setError("");
      await API.delete(`/kpis/${id}`);

      // Mise à jour optimiste
      setItems((prev) => prev.filter((x) => x.id !== id));
      setAllItems((prev) => prev.filter((x) => x.id !== id));

      // Rechargement pour garder pagination & graph synchronisés
      await fetchKpis(page);
      await fetchAllKpis();

      // Ferme la modale si ouverte
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

  // Années disponibles dans les données (ISO année, utile pour la vue semaine)
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

    // Initialisation des périodes en fonction du groupBy pour couvrir TOUTE L'ANNÉE sélectionnée
    if (groupBy === "week") {
      const totalWeeks = isoWeeksInYear(year);
      for (let w = 1; w <= totalWeeks; w++) {
        const period = `${year}-W${String(w).padStart(2, "0")}`;
        const base = {};
        ACTIONS_ALL.forEach((a) => (base[a] = 0));
        byPeriod.set(period, base);
      }
    } else {
      // month
      for (let m = 1; m <= 12; m++) {
        const period = `${year}-${String(m).padStart(2, "0")}`;
        const base = {};
        ACTIONS_ALL.forEach((a) => (base[a] = 0));
        byPeriod.set(period, base);
      }
    }

    // Remplissage avec les données
    (allItems || []).forEach((k) => {
      const dateStr = k.kpi_date || k.created_at || k.updated_at;
      if (!dateStr) return;

      const cat = ACTIONS_BASE.includes(k.action) ? k.action : ACTION_OTHER;

      if (groupBy === "week") {
        const { isoYear, isoWeek } = isoWeekInfo(dateStr);
        if (isoYear !== year) return; // on limite à l'année sélectionnée
        const periodKey = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
        const row = byPeriod.get(periodKey);
        if (!row) return;
        row[cat] = (row[cat] || 0) + 1;
      } else {
        // month (calendaire)
        const d = new Date(dateStr);
        if (d.getFullYear() !== year) return;
        const periodKey = monthKey(dateStr);
        const row = byPeriod.get(periodKey);
        if (!row) return;
        row[cat] = (row[cat] || 0) + 1;
      }
    });

    // Conversion en tableau ordonné
    const ordered = Array.from(byPeriod.entries())
      .map(([period, counts]) => ({ period, ...counts }))
      .sort((a, b) => (a.period > b.period ? 1 : -1));

    // Filtre d'action au NIVEAU DU RENDU (on garde toutes les clés pour la légende/tooltip)
    return ordered;
  }, [allItems, groupBy, year]);

  return (
    <div className="vx-row">
      {/* ====== Carte création KPI ====== */}
      <div className="vx-col w-100">
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Créer un KPI</h4>
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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 8,
                  }}
                >
                  {ACTIONS_BASE.map((a) => {
                    const isSelected = action === a;
                    const color = ACTION_COLORS[a] || "secondary";
                    return (
                      <Button
                        key={a}
                        color={color}
                        outline={!isSelected} // non sélectionné = outline, sélectionné = plein
                        onClick={() => setAction(a)}
                        style={{ width: "100%" }}
                        aria-pressed={isSelected}
                      >
                        {a}
                      </Button>
                    );
                  })}
                </div>
              </Col>
            </Row>
            <div className="d-flex mt-2">
              <Button color="success" onClick={createKpi} disabled={creating}>
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

              {/* Year filter */}
              <UncontrolledButtonDropdown className="mr-1">
                <DropdownToggle caret color="light">
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

              {/* Action filter */}
              <UncontrolledButtonDropdown>
                <DropdownToggle caret color="light">
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
          <CardBody style={{ height: 420 }}>
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
                      groupBy === "week" ? `Semaine ${label.split("-")[1]}` : label
                    }
                  />
                  <Legend />

                  {/* Colonnes empilées */}
                  {actionFilter === "all"
                    ? ACTIONS_ALL.map((a) => (
                        <Bar key={a} dataKey={a} stackId="total" fill={ACTION_FILLS[a]} />
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
                  <th>#</th>
                  <th>Date</th>
                  <th>Objet</th>
                  <th>Action</th>
                  <th>Admin</th>
                  <th className="text-right" style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan="6">Chargement…</td>
                  </tr>
                ) : items?.length ? (
                  items.map((k) => (
                    <tr key={k.id}>
                      <td>{k.id}</td>
                      <td>{formatDate(k.kpi_date || k.created_at || k.updated_at)}</td>
                      <td>{k.objet || <em style={{ opacity: 0.6 }}>(vide)</em>}</td>
                      <td>{k.action || <em style={{ opacity: 0.6 }}>(vide)</em>}</td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">Aucun KPI.</td>
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
        backdrop="static"          // évite le clic extérieur
        keyboard={!deletingId}     // bloque ESC pendant la suppression
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
                {formatDate(toDelete.kpi_date || toDelete.created_at || toDelete.updated_at)}
              </div>
              <div>
                <strong>Objet :</strong> {toDelete.objet || <em>(vide)</em>}
              </div>
              <div>
                <strong>Action :</strong> {toDelete.action || <em>(vide)</em>}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-0">
          <Button color="secondary" onClick={closeConfirmModal} disabled={!!deletingId}>
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
