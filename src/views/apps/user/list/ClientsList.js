import React from "react";
import { UserPlus, Trash2 } from "react-feather";
import { Button, Card, CardBody, Input, Row, Col, Badge } from "reactstrap";
import axios from "axios";
import * as XLSX from "xlsx";
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import { history } from "../../../../history";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss";
import "../../../../assets/scss/pages/users.scss";
import SweetAlert from "react-bootstrap-sweetalert";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent";

// === Couleurs pastilles identiques à la liste des contrats ===
const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};
const VALID_SERVICES = new Set(Object.keys(chipColors));

// ===== Helpers téléphone (normalisation / affichage) =====
const PHONE_FIELDS = [
  "mobile_number",
  "office_number",
  "phone",
  "telephone",
  "tel",
  "personal_phone",
  "work_phone",
];

const normalizePhone = (v) => {
  if (!v) return "";
  let s = String(v).trim();

  // Garder un éventuel "+" pour détecter +33, mais enlever le reste des non-digits
  let t = s.replace(/[^\d+]/g, "");

  // Normaliser préfixes FR (0033 / +33) vers 0
  if (t.startsWith("+33")) t = "0" + t.slice(3);
  else if (t.startsWith("0033")) t = "0" + t.slice(4);

  // Finir en chiffres uniquement
  t = t.replace(/\D/g, "");
  return t;
};

// ⬇️ Seuil abaissé à 3 chiffres (au lieu de 4) pour matcher "301" -> "30 11"
const phoneLooksLike = (s) => {
  return /\d/.test(s) && normalizePhone(s).length >= 3;
};

const formatPhonePretty = (v) => {
  const d = normalizePhone(v);
  if (!d) return "";
  // Si 10 chiffres (format FR), afficher en paires
  if (d.length === 10) {
    return d.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  // Sinon, tenter un regroupement lisible
  if (d.length > 4) {
    return d.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return v || "";
};

// ======= WHITELIST FRONT (modifier la liste ci-dessous) =======
const ALLOWED_EMAILS = [
  "remi@phocus1.com",
  "jfc@eor.fr",
  "martin.six@phocus1.com",
  "sebastien@eor.fr",
];

/** Prospects / Mes Clients leaf paths (or ?tab=) → ClientsList tab. */
const resolveClientsListTab = (location) => {
  const loc =
    location ||
    (history && history.location) ||
    (typeof window !== "undefined" && window.location) ||
    {};
  const pathname = loc.pathname || "";
  const search = loc.search || "";
  if (pathname.indexOf("prospectslist") !== -1) return "prospect";
  if (search.indexOf("tab=prospect") !== -1) return "prospect";
  if (pathname.indexOf("mesclientslist") !== -1) return "mine";
  if (search.indexOf("tab=mine") !== -1) return "mine";
  return "all";
};

class ClientsList extends React.Component {
  state = {
    defaultAlert: false,
    confirmAlert: false,
    cancelAlert: false,
    IdToDelete: 0,
    rowData: null,
    allRowData: null, // Données brutes complètes (clients + prospects)
    activeTab: resolveClientsListTab(), // "all" | "mine" | "old_client" | "prospect"
    pageSize: 50,
    defaultColDef: {
      resizable: true,
      sortable: true,
      flex: 1,
      minWidth: 120,
    },
    searchVal: "",
    currentUserEmail: "",
    // Flag rôle consultant
    isConsultant: false,
    // ID utilisé pour le filtre "Mes clients". null => pas de filtre.
    myFilterId: null,
    // Saisie téléphone normalisée (chiffres) utilisée par le filtre externe
    phoneQueryDigits: "",
    // Map userId -> array de services (depuis le dernier document)
    servicesByUserId: {},
    // Tip D: flags source CF7 / Chatbot / Diagnostic (batch endpoints, no users?include=)
    sourceFlagsByUserId: {},
    // Contacts pack: TOP pastilles filtre source (exclusive single-select)
    sourceFilter: null, // null | "cf7" | "chatbot" | "diagnostic"
    gridOptions: {
      onCellClicked: (params) => {
        const colKey = params?.colDef?.field || params?.colDef?.colId;
        if (!params?.data?.id) return;
        // Empêcher la navigation quand on clique sur Email, Téléphone, Prestation ou Actions
        if (
          colKey === "email" ||
          colKey === "phone" ||
          colKey === "prestations" ||
          colKey === "actions"
        )
          return;

        if (params.data.role === "old_client") {
          history.push("/app/olduser/edit/" + params.data.id + "/2");
        } else {
          history.push("/app/user/edit/" + params.data.id + "/2");
        }
      },
      getRowClass: () => "client-row",
      suppressRowClickSelection: true,
    },
    columnDefs: [
      // ====== COLONNE "Type" - pastilles v1 (Client/Prospect/Ancien/Perdue) + tip D sources ======
      {
        headerName: "Type",
        field: "role",
        colId: "type",
        filter: false,
        width: 200,
        minWidth: 180,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "4px",
          flexWrap: "wrap",
        },
        cellRendererFramework: (params) => {
          // JF/Cap'tain 2026-09-11 Type pastilles v1 (TEST):
          // Perdue > Ancien > Prospect > Client. Bot/Diag hors v1.
          const role = (params?.data?.role || "").toLowerCase();
          const status = (params?.data?.status || "").toLowerCase();
          const base = { fontSize: "0.75rem", fontWeight: 600 };
          let label = "CLIENT";
          let color = "light-success";
          let style = { ...base };

          if (status === "perdu") {
            label = "PERDUE";
            color = undefined;
            style = {
              ...base,
              backgroundColor: "#fce8e8",
              color: "#ea5455",
            };
          } else if (role === "old_client") {
            label = "ANCIEN";
            color = undefined;
            style = {
              ...base,
              backgroundColor: "#e9ecef",
              color: "#6c757d",
            };
          } else if (role === "prospect") {
            label = "PROSPECT";
            color = undefined;
            style = {
              ...base,
              backgroundColor: "#fde8dc",
              color: "#c45c26",
            };
          }

          const uid = params?.data?.id;
          const flags =
            (uid != null &&
              this.state.sourceFlagsByUserId &&
              this.state.sourceFlagsByUserId[uid]) ||
            {};
          const pillBase = { fontSize: "0.75rem", fontWeight: 600, marginLeft: 2 };
          const sourcePills = [];
          if (flags.cf7) {
            sourcePills.push(
              <Badge
                key="cf7"
                pill
                style={{
                  ...pillBase,
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                }}
              >
                CF7
              </Badge>
            );
          }
          if (flags.chatbot) {
            sourcePills.push(
              <Badge
                key="chatbot"
                pill
                style={{
                  ...pillBase,
                  backgroundColor: "#e8f4fd",
                  color: "#1e88e5",
                }}
              >
                Chatbot
              </Badge>
            );
          }
          if (flags.diagnostic) {
            sourcePills.push(
              <Badge
                key="diagnostic"
                pill
                style={{
                  ...pillBase,
                  backgroundColor: "#fff3e0",
                  color: "#ef6c00",
                }}
              >
                Diag
              </Badge>
            );
          }
          // Type Inscrit: ONLY if real user flag exists — DO NOT invent FK/BDD/sourceFlags.inscrit.
          // No real flag today → never render Type Inscrit.

          return (
            <div className="d-flex align-items-center" style={{ gap: 4, flexWrap: "wrap" }}>
              <Badge color={color} pill style={style}>
                {label}
              </Badge>
              {sourcePills}
            </div>
          );
        },
      },
      {
        headerName: "Création",
        filter: true,
        width: 130,
        minWidth: 120,
        flex: 0,
        cellRendererFramework: (params) => {
          const { date, time } = this.formatCreationBrussels(
            params?.data?.created_at,
          );
          return (
            <div style={{ lineHeight: 1.15 }}>
              <div>{date}</div>
              {time ? (
                <div style={{ fontSize: "0.7rem", color: "#6e6b7b" }}>{time}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        headerName: "Prénom",
        filter: true,
        width: 120,
        minWidth: 120,
        flex: 0,
        valueGetter: (params) => params.data.first_name,
      },
      {
        headerName: "Nom",
        filter: true,
        width: 120,
        minWidth: 120,
        flex: 1,
        valueGetter: (params) => params.data.last_name,
      },
      {
        headerName: "Civilité",
        filter: true,
        hide: true,
        width: 150,
        valueGetter: (params) => {
          if (params.data.civility === "Monsieur") return "M.";
          if (params.data.civility === "Madame") return "Mme";
          return params.data.civility || "";
        },
      },
      // ====== COLONNE "Prestation" (pastilles depuis le DERNIER document du client) ======
      {
        headerName: "Prestation",
        colId: "prestations",
        filter: false,
        cellClass: "prestations-cell",
        width: 150,
        minWidth: 150,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        },
        cellRendererFramework: (params) => {
          const userId = params?.data?.id;
          const services =
            (this.state.servicesByUserId &&
              this.state.servicesByUserId[userId]) ||
            [];
          if (!services || services.length === 0) {
            return <div className="h-100 d-flex align-items-center"></div>;
          }
          return (
            <div
              className="h-100 d-flex align-items-center"
              style={{ flexWrap: "wrap", alignContent: "center" }} // utile si ça passe à la ligne
              onClick={(e) => e.stopPropagation()}
            >
              {services.map((label) => (
                <Chip
                  className="m-0 text-center"
                  key={label}
                  color={chipColors[label] || "primary"}
                  text={label}
                />
              ))}
            </div>
          );
        },
      },

      // ====== COLONNE TÉLÉPHONE ======
      {
        headerName: "Téléphone",
        colId: "phone",
        filter: true,
        width: 160,
        minWidth: 140,
        flex: 0,
        // Affiche le mobile en priorité, sinon bureau, sinon les autres champs possibles
        valueGetter: (params) => {
          const d = params.data || {};
          const phone =
            d.mobile_number ||
            d.office_number ||
            d.phone ||
            d.telephone ||
            d.tel ||
            "";
          return formatPhonePretty(phone) || "-";
        },
        cellRendererFramework: (rowData) => {
          const d = rowData?.data || {};
          const raw =
            d.mobile_number ||
            d.office_number ||
            d.phone ||
            d.telephone ||
            d.tel ||
            "";
          const pretty = formatPhonePretty(raw) || "-";
          const telHref = "tel:" + normalizePhone(raw);
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (!normalizePhone(raw)) return;
                window.location.href = telHref;
              }}
              title={normalizePhone(raw) ? `Appeler ${pretty}` : ""}
            >
              <span>{pretty}</span>
            </div>
          );
        },
      },

      {
        headerName: "Email",
        field: "email",
        filter: true,
        width: 230,
        minWidth: 250,
        flex: 0,
        cellRendererFramework: (rowData) => {
          var email = rowData.data.email;
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href =
                  "mailto:" +
                  email +
                  "?subject=Subject&body=message%20goes%20here";
              }}
            >
              <span>{rowData.data.email}</span>
            </div>
          );
        },
      },
      {
        headerName: "Consultant",
        filter: false,
        width: 140,
        minWidth: 140,
        flex: 0,
        valueGetter: (params) => {
          const p = params.data.parent;
          if (!p) return "";
          const role = (p.role || "").toLowerCase();
          if (role !== "consultant" && role !== "admin") return "";
          if (p.name) return p.name;
          return [p.first_name, p.last_name].filter(Boolean).join(" ");
        },
      },
      {
        headerName: "Apporteur",
        filter: false,
        width: 140,
        minWidth: 140,
        flex: 0,
        valueGetter: (params) => {
          return params.data.business_introducer
            ? params.data.business_introducer.name ||
                params.data.business_introducer
            : "-";
        },
      },
      // -> Colonne Actions
      {
        headerName: "Action",
        colId: "actions",
        filter: false,
        width: 90,
        minWidth: 90,
        flex: 0,
        cellClass: "d-flex align-items-center justify-content-center",
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        },
        cellRendererFramework: (params) => {
          return (
            <div
              className="actions cursor-pointer d-flex align-items-center justify-content-center w-100"
              style={{ width: "100%", height: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2
                size={20}
                onClick={() => {
                  this.handleAlert("defaultAlert", true, params.data.id);
                }}
              />
            </div>
          );
        },
      },
    ],
  };

  // --- Helpers
  normalizeId = (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n;
  };

  // Contacts pack: Création date + HHhMM in Europe/Brussels
  formatCreationBrussels = (iso) => {
    if (!iso) return { date: "-", time: "" };
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return { date: "-", time: "" };
      const dateParts = new Intl.DateTimeFormat("fr-BE", {
        timeZone: "Europe/Brussels",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(d);
      const get = (parts, t) =>
        (parts.find((p) => p.type === t) || {}).value || "";
      const date = `${get(dateParts, "day")}/${get(dateParts, "month")}/${get(
        dateParts,
        "year",
      )}`;
      const timeParts = new Intl.DateTimeFormat("fr-BE", {
        timeZone: "Europe/Brussels",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const hh = get(timeParts, "hour");
      const mm = get(timeParts, "minute");
      const time = hh && mm ? `${hh}h${mm}` : "";
      return { date, time };
    } catch (e) {
      return { date: "-", time: "" };
    }
  };

  // Contacts pack: intersect rows with tip D sourceFlagsByUserId
  applySourceFilterToRows = (rows) => {
    const { sourceFilter, sourceFlagsByUserId } = this.state;
    if (!sourceFilter) return rows || [];
    return (rows || []).filter((u) => {
      const flags =
        (sourceFlagsByUserId && u && u.id != null && sourceFlagsByUserId[u.id]) ||
        {};
      return !!flags[sourceFilter];
    });
  };

  // Contacts pack: TOP pastilles exclusive single-select (re-click clears)
  setSourceFilter = (key) => {
    const next = this.state.sourceFilter === key ? null : key;
    this.setState({ sourceFilter: next }, () => {
      this.toggleTab(this.state.activeTab || "all");
    });
  };

  getOwnerIdFromRow = (row) => {
    // Essaie plusieurs champs possibles pour l'ID "créateur/propriétaire/technicien"
    const candidates = [
      row?.created_by_id,
      row?.created_by,
      row?.creator_id,
      row?.owner_id,
      row?.ownerId,
      row?.parent_id,
      row?.parent?.id,
      row?.parent?.user_id,
      row?.technician_id,
      row?.user_owner_id,
    ];
    const found = candidates.find((v) => v !== undefined && v !== null);
    return this.normalizeId(found);
  };

  getPhoneCandidatesFromRow = (row) => {
    if (!row) return [];
    const out = [];
    for (const key of PHONE_FIELDS) {
      const v = row[key];
      if (v) {
        const n = normalizePhone(v);
        if (n) out.push(n);
      }
    }
    return out;
  };

  // --- Parsing robuste des services (nettoyage + filtre par liste blanche)
  parseServices = (raw) => {
    if (raw === null || raw === undefined) return [];
    let s = String(raw).toUpperCase();

    // enlever guillemets et antislashs, unifier séparateurs
    s = s.replace(/["\\]/g, "");
    s = s.replace(/[|,]/g, "/");

    // couper, trim, garder uniquement codes connus (CH, SIMU, AR, TFD, ACTU, RAC)
    const parts = s
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);

    const seen = new Set();
    const out = [];
    for (const p of parts) {
      if (VALID_SERVICES.has(p) && !seen.has(p)) {
        out.push(p);
        seen.add(p);
      }
    }
    return out;
  };

  // Construit une map userId -> services depuis le DERNIER document (updated_at sinon created_at)
  buildServicesMapFromDocuments = (documents) => {
    const latestTsByUser = {};
    const map = {};

    if (!Array.isArray(documents)) return map;

    for (const doc of documents) {
      // ne garder que les contrats si le type existe
      if (doc?.type && String(doc.type).toLowerCase() !== "contract") continue;

      const userId = doc?.user?.id ?? doc?.user_id ?? null;
      if (!userId) continue;

      const services = this.parseServices(doc?.subscribe_services);
      if (!services.length) continue; // pas de services => ne pas écraser avec vide

      const tsStr = doc?.updated_at || doc?.created_at || null;
      const ts = tsStr ? Date.parse(tsStr) : 0;

      if (latestTsByUser[userId] === undefined || ts > latestTsByUser[userId]) {
        latestTsByUser[userId] = ts;
        map[userId] = services;
      }
    }
    return map;
  };

  // Tip D PERF-SAFE: batch source flags (no users?include= archives)
  fetchSourceFlags = async (Config) => {
    const base = global.config.server_url;
    const empty = new Set();
    const toRows = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      return [];
    };
    const safeGet = async (url) => {
      try {
        const res = await axios.get(url, Config);
        return toRows(res.data);
      } catch (e) {
        console.warn("Tip D source flag fetch failed", url, e?.message || e);
        return [];
      }
    };

    const [cf7Rows, archiveRows, diagRows] = await Promise.all([
      safeGet(base + "/inbound-emails?source=cf7&per_page=200"),
      safeGet(base + "/conversation-archives?per_page=200"),
      safeGet(base + "/simulator-difficulty-results?per_page=200").then(async (rows) => {
        if (rows.length) return rows;
        // dig: endpoint may live under /v1/
        return safeGet(base + "/v1/simulator-difficulty-results?per_page=200");
      }),
    ]);

    const cf7Ids = new Set();
    cf7Rows.forEach((r) => {
      const id = r.client_id ?? r.clientId;
      if (id != null && id !== "") cf7Ids.add(String(id));
    });

    const chatbotIds = new Set();
    archiveRows.forEach((r) => {
      const id = r.user_id ?? r.userId ?? (r.user && r.user.id);
      if (id != null && id !== "") chatbotIds.add(String(id));
    });

    const diagIds = new Set();
    diagRows.forEach((r) => {
      const id = r.user_id ?? r.userId ?? (r.user && r.user.id);
      if (id != null && id !== "") diagIds.add(String(id));
    });

    const allIds = new Set([...cf7Ids, ...chatbotIds, ...diagIds]);
    const sourceFlagsByUserId = {};
    allIds.forEach((id) => {
      // store under both string and numeric key when possible
      const flags = {
        cf7: cf7Ids.has(id),
        chatbot: chatbotIds.has(id),
        diagnostic: diagIds.has(id),
      };
      sourceFlagsByUserId[id] = flags;
      const n = Number(id);
      if (!Number.isNaN(n)) sourceFlagsByUserId[n] = flags;
    });

    this.setState({ sourceFlagsByUserId }, () => {
      if (this.gridApi) {
        try {
          this.gridApi.refreshCells({ force: true, columns: ["type"] });
        } catch (e) {}
      }
      // Contacts pack: if TOP source filter active, re-intersect now that flags exist
      if (this.state.sourceFilter) {
        this.toggleTab(this.state.activeTab || "all");
      }
    });
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // Rôle + ID utilisateur courant
    const userIdRaw = localStorage.getItem("userid");
    const roleStr = (localStorage.getItem("role") || "").toLowerCase();
    // On considère consultant si la chaîne contient "consultant"
    const isConsultant = roleStr.includes("consultant");
    const myFilterId =
      isConsultant && userIdRaw ? this.normalizeId(userIdRaw) : null;

    this.setState({ isConsultant, myFilterId });

    // Récupère clients (page 1) + prospects + anciens clients + documents en parallèle
    try {
      const PER_PAGE = 100;
      const [clientsRes, membersRes, oldClientsRes, docsRes] =
        await Promise.all([
          axios.get(global.config.server_url + `/users?kind=client&page=1&per_page=${PER_PAGE}`, Config),
          axios.get(global.config.server_url + "/users?kind=member", Config),
          axios.get(global.config.server_url + "/users?kind=oldclient", Config),
          axios.get(global.config.server_url + "/documents", Config),
        ]);

      // Filtrer les Prospects depuis la liste des membres
      const prospects = (membersRes.data || []).filter(
        (user) => (user.role || "").toLowerCase() === "prospect",
      );

      // Normaliser les anciens clients
      const oldClients = (oldClientsRes.data || []).map((oc) => ({
        ...oc,
        id: oc.clcleunik,
        // Mapping
        first_name: oc.cl_prenom,
        last_name: oc.cl_nom,
        email: oc.cl_mail,
        mobile_number: oc.cl_tel_port,
        telephone: oc.cl_tel_fixe,
        created_at: oc.cl_date,
        // Force le rôle pour distinction
        role: "old_client",
        // Mapping Consultant
        parent: { name: oc.expert_name },
      }));

      // Réponse paginée : { data, total, last_page } ou tableau direct (compatibilité)
      const clientsPage1 = Array.isArray(clientsRes.data)
        ? clientsRes.data
        : clientsRes.data.data || [];
      const clientsLastPage = clientsRes.data?.last_page || 1;

      const documents = docsRes.data || [];
      const servicesByUserId = this.buildServicesMapFromDocuments(documents);

      const buildSorted = (clients) => {
        const merged = [...clients, ...prospects, ...oldClients];
        return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      };

      // Afficher page 1 immédiatement
      const sortedPage1 = buildSorted(clientsPage1);
      this.setState(
        { allRowData: sortedPage1, servicesByUserId },
        () => {
          this.toggleTab(resolveClientsListTab(this.props.location));
        },
      );

      // Tip D: batch source flags after clients loaded (degrade → empty)
      this.fetchSourceFlags(Config);

      // Charger les pages suivantes en arrière-plan si nécessaire
      if (clientsLastPage > 1) {
        const remainingPages = [];
        for (let p = 2; p <= clientsLastPage; p++) {
          remainingPages.push(
            axios.get(global.config.server_url + `/users?kind=client&page=${p}&per_page=${PER_PAGE}`, Config)
          );
        }
        Promise.all(remainingPages).then((responses) => {
          const extraClients = responses.flatMap((r) =>
            Array.isArray(r.data) ? r.data : r.data.data || []
          );
          const allClients = [...clientsPage1, ...extraClients];
          const sortedAll = buildSorted(allClients);
          this.setState({ allRowData: sortedAll }, () => {
            this.toggleTab(this.state.activeTab || resolveClientsListTab(this.props.location));
          });
        }).catch((e) => {
          console.error("Erreur chargement pages clients supplémentaires", e);
        });
      }
    } catch (e) {
      console.error("Erreur chargement clients/documents", e);
    }

    // Email utilisateur courant (pour export XLSX)
    if (userIdRaw) {
      try {
        const meRes = await axios.get(
          `${global.config.server_url}/users/${userIdRaw}`,
          Config,
        );
        const currentUserEmail = (meRes?.data?.email || "").toLowerCase();
        this.setState({ currentUserEmail });
      } catch (e) {
        console.error("Impossible de récupérer l'utilisateur courant", e);
      }
    }
  }

  // Toggle entre les onglets
  toggleTab = (tab) => {
    const { allRowData, myFilterId } = this.state;

    // Si on reclique sur le même, on ne fait rien (ou on remet All ?)
    // Ici logique demandée : un onglet actif à la fois.

    // CAS SPECIAL : "Mes Clients" (tab = 'mine')
    // CAS SPECIAL : "Tous" (tab = 'all')

    let filteredData = allRowData || [];

    if (tab === "mine") {
      // Filtre "Mes clients"
      if (myFilterId) {
        filteredData = filteredData.filter((user) => {
          const role = (user.role || "").toLowerCase();
          // Exclure les prospects/anciens si "Mes Clients" ne concerne que les actifs ?
          // Le screenshot montre "Clients", "AnciensClients", "Prospects".
          // "Mes Clients" est probablement un sous-ensemble de "Clients" (actifs).
          if (role === "prospect" || role === "old_client") return false;
          return this.checkIsMyClient(user, myFilterId);
        });
      } else {
        // Fallback si pas d'ID
        filteredData = filteredData.filter((u) => {
          const r = (u.role || "").toLowerCase();
          return r !== "prospect" && r !== "old_client";
        });
      }
    } else if (tab === "client") {
      // "Tous les CLIENTS ACTIFS" (exclut prospects et anciens) ?
      // Le screenshot montre "Tous", "Mes Clients" ...
      // "Tous" peut vouloir dire VRAIMENT TOUS (clients + anciens + prospects) OU "Tous les Clients"
      // Généralement "Tous" = Tout le monde.
      // Mais il y a un onglet "Mes Clients".
      // Si l'onglet est "Tous", on affiche tout ?
      // Voyons les titres : [Tous] [Mes Clients] [Anciens Clients] [Prospects]
      // Donc "Tous" = Tout le monde.
      // "Mes Clients" = Clients actifs liés à moi.
      // "Anciens Clients" = old_clients.
      // "Prospects" = prospects.
      // ATTENTION : L'onglet s'appelle "client" dans le code précédent pour "Clients" (vs Prospects).
      // Je vais renommer les clés pour être clair : 'all', 'mine', 'old_client', 'prospect'.
    }

    if (tab === "all") {
      filteredData = allRowData;
    } else if (tab === "mine") {
      // logic above
    } else if (tab === "old_client") {
      filteredData = filteredData.filter(
        (u) => (u.role || "").toLowerCase() === "old_client",
      );
    } else if (tab === "prospect") {
      filteredData = filteredData.filter(
        (u) => (u.role || "").toLowerCase() === "prospect",
      );
    }

    // Contacts pack: apply TOP source pastille filter (tip D flags)
    filteredData = this.applySourceFilterToRows(filteredData);

    this.setState({ activeTab: tab, rowData: filteredData }, () => {
      if (this.gridApi) {
        this.gridApi.onFilterChanged();
      }
    });
  };

  checkIsMyClient = (row, myId) => {
    if (!myId) return true;
    const target = String(myId);
    const candidates = [
      row?.created_by_id,
      row?.created_by,
      row?.creator_id,
      row?.owner_id,
      row?.ownerId,
      row?.parent_id,
      row?.parent?.id,
      row?.parent?.user_id,
      row?.technician_id,
      row?.user_owner_id,
    ];
    return candidates.some(
      (v) => v !== undefined && v !== null && String(v) === target,
    );
  };

  sizeToFit = () => {
    if (this.gridApi) {
      try {
        this.gridApi.sizeColumnsToFit();
      } catch (e) {}
    }
  };

  // ======= EXPORT EXCEL (XLSX) =======
  getExportHeaders = () => [
    "ID",
    "Créé le",
    "Civilité",
    "Nom",
    "Prénom",
    "Email",
    "Téléphone mobile",
    "Téléphone bureau",
    "Statut",
    "Mise à jour du statut",
    "Technicien (parent)",
    "Apporteur",
    "Date de naissance",
    "Lieu de naissance",
    "Nombre d’enfants",
    "Situation maritale",
    "Adresse perso",
    "Adresse perso 2",
    "Ville perso",
    "Code postal perso",
    "Pays perso",
    "Société",
    "Adresse société",
    "Adresse société 2",
    "Ville société",
    "Code postal société",
    "Pays société",
    "Notes",
    "Services souscrits",
    "Compte valide",
    "Utilisateur (ID)",
    "ID parent (numérique)",
  ];
  formatDateForExcel = (d) => {
    if (!d) return "";
    return String(d).replace("T", " ").replace("Z", "");
  };
  sanitizeText = (t) =>
    !t ? "" : String(t).replace(/\r?\n/g, " ").replace(/\s\s+/g, " ").trim();
  buildClientRow = (c) => {
    const civ =
      c.civility === "Monsieur"
        ? "M."
        : c.civility === "Madame"
          ? "Mme"
          : c.civility || "";
    const apport = c.business_introducer
      ? c.business_introducer.name || c.business_introducer
      : "";
    return {
      ID: c.id ?? "",
      "Créé le": this.formatDateForExcel(c.created_at),
      Civilité: civ,
      Nom: c.last_name ?? "",
      Prénom: c.first_name ?? "",
      Email: c.email ?? "",
      "Téléphone mobile": c.mobile_number ?? "",
      "Téléphone bureau": c.office_number ?? "",
      Statut: c.status ?? "",
      "Mise à jour du statut": c.status_update_date ?? "",
      "Technicien (parent)": c.parent
        ? c.parent.name ||
          [c.parent.first_name, c.parent.last_name].filter(Boolean).join(" ")
        : "",
      Apporteur: apport,
      "Date de naissance": this.formatDateForExcel(c.birth_date),
      "Lieu de naissance": c.birth_place ?? "",
      "Nombre d’enfants": c.children_number ?? "",
      "Situation maritale": c.martial_status ?? "",
      "Adresse perso": c.personal_address ?? "",
      "Adresse perso 2": c.personal_address_2 ?? "",
      "Ville perso": c.personal_city ?? "",
      "Code postal perso": c.personal_zip_code ?? "",
      "Pays perso": c.personal_country ?? "",
      Société: c.society_name ?? "",
      "Adresse société": c.society_address ?? "",
      "Adresse société 2": c.society_address_2 ?? "",
      "Ville société": c.society_city ?? "",
      "Code postal société": c.society_zip_code ?? "",
      "Pays société": c.society_country ?? "",
      Notes: this.sanitizeText(c.notes),
      "Services souscrits": this.sanitizeText(c.subscribe_services),
      "Compte valide": c.valid_account ? "Oui" : "Non",
      "Utilisateur (ID)": c.user_id ?? "",
      "ID parent (numérique)": c.parent_id ?? "",
    };
  };
  canDownload = () => {
    const email = (this.state.currentUserEmail || "").toLowerCase();
    return ALLOWED_EMAILS.map((e) => e.toLowerCase()).includes(email);
  };
  onBtExportXLSX = () => {
    if (!this.canDownload()) return;
    const { rowData } = this.state;
    if (!rowData || !rowData.length) return;
    const headers = this.getExportHeaders();
    const data = rowData.map(this.buildClientRow);
    const ws = XLSX.utils.json_to_sheet(data, {
      header: headers,
      skipHeader: true,
    });
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
    const colWidths = headers.map((h) => ({
      wch: Math.max(14, h.length + 2),
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `export_clients_${today}.xlsx`);
  };
  // ======= FIN EXPORT EXCEL =======

  // --- AgGrid External Filter API
  // Présence du filtre externe si "Mes clients" est actif OU si une recherche téléphone est active
  isExternalFilterPresent = () =>
    (this.state.activeTab === 'mine' && this.state.myFilterId !== null) ||
    (this.state.phoneQueryDigits && this.state.phoneQueryDigits.length > 0);

  doesExternalFilterPass = (node) => {
    // 1) Filtre "Mes clients"
    if (this.state.myFilterId !== null) {
      const row = node?.data;
      const target = String(this.state.myFilterId);

      const candidates = [
        row?.created_by_id,
        row?.created_by,
        row?.creator_id,
        row?.owner_id,
        row?.ownerId,
        row?.parent_id,
        row?.parent?.id,
        row?.parent?.user_id,
        row?.technician_id,
        row?.user_owner_id,
      ];

      const match = candidates.some(
        (v) => v !== undefined && v !== null && String(v) === target,
      );

      if (!match) return false;
    }

    // 2) Filtre "recherche téléphone" (normalisé)
    const q = this.state.phoneQueryDigits;
    if (q && q.length > 0) {
      const candidates = this.getPhoneCandidatesFromRow(node?.data);
      if (!candidates.length) return false;
      const hit = candidates.some((digits) => digits.includes(q));
      if (!hit) return false;
    }

    return true;
  };

  // --- Actions
  deleteUser(id) {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };

    // Check if user is old client
    const user = (this.state.allRowData || []).find((u) => u.id === id);
    const isOld = user?.role === "old_client";
    const url = isOld
      ? global.config.server_url + "/users/" + id + "?old=true"
      : global.config.server_url + "/users/" + id;

    axios.delete(url, Config).then(() => {
      // Si ag-grid est utilisé
      if (this.gridApi) {
        // On peut utiliser updateRowData ou simplement re-filtrer le state local
        // Ici on vire de rowData local
        this.setState(
          (prev) => ({
            allRowData: prev.allRowData.filter((u) => u.id !== id),
            rowData: prev.rowData.filter((u) => u.id !== id),
          }),
          () => {
            this.gridApi.setRowData(this.state.rowData);
          },
        );
      }
    });
  }

  onGridReady = (params) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.sizeToFit();
    window.addEventListener("resize", this.sizeToFit);
    if (this.isExternalFilterPresent()) {
      this.gridApi.onFilterChanged();
    }
  };

  filterData = (column, val) => {
    var filter = this.gridApi.getFilterInstance(column);
    var modelObj = null;
    if (val !== "all") modelObj = { type: "equals", filter: val };
    filter.setModel(modelObj);
    this.gridApi.onFilterChanged();
  };

  filterSize = (val) => {
    if (this.gridApi) {
      this.gridApi.paginationSetPageSize(Number(val));
      this.setState({ pageSize: val });
    }
  };

  updateSearchQuery = (val) => {
    const phoneDigits = phoneLooksLike(val) ? normalizePhone(val) : "";

    // IMPORTANT :
    // - si recherche téléphone => vider le Quick Filter (sinon il "AND" avec notre filtre externe et bloque les résultats
    //   car l'affichage contient des espaces)
    // - sinon, Quick Filter normal
    if (this.gridApi) {
      this.gridApi.setQuickFilter(phoneDigits ? "" : val);
    }

    this.setState({ searchVal: val, phoneQueryDigits: phoneDigits }, () => {
      // Recalcule le filtre externe (Mes clients + recherche téléphone)
      if (this.gridApi) this.gridApi.onFilterChanged();
    });
  };

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value });
    if (id !== 0) this.setState({ IdToDelete: id });
    if (state === "confirmAlert" && value === true) {
      this.deleteUser(this.state.IdToDelete);
    }
  };

  componentWillUnmount() {
    window.removeEventListener("resize", this.sizeToFit);
    this.gridApi = null;
    this.gridColumnApi = null;
  }

  // Toggle Mes clients / Tous les clients (désactivé pour les consultants)
  toggleMyClients = () => {
    // Les consultants doivent toujours rester sur "Mes clients"
    if (this.state.isConsultant) {
      return;
    }
    const me = this.normalizeId(localStorage.getItem("userid"));
    this.setState(
      (prev) => ({ myFilterId: prev.myFilterId === null ? me : null }),
      () => {
        if (this.gridApi) this.gridApi.onFilterChanged();
      },
    );
  };

  render() {
    const { rowData, columnDefs, defaultColDef, pageSize, activeTab } =
      this.state;
    return (
      <div>
        <SweetAlert
          title="Êtes-vous sûr de supprimer ce client ?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          confirmBtnBsStyle="danger"
          cancelBtnBsStyle="primary"
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
          onConfirm={() => {
            this.handleAlert("defaultAlert", false, 0);
            this.handleAlert("confirmAlert", true, 0);
          }}
          onCancel={() => {
            this.handleAlert("defaultAlert", false, 0);
            this.handleAlert("cancelAlert", true, 0);
          }}
        >
          Vous ne pourrez pas revenir en arrière
        </SweetAlert>

        <SweetAlert
          success
          title="Supprimé!"
          confirmBtnBsStyle="success"
          show={this.state.confirmAlert}
          onConfirm={() => {
            this.setState({
              rowData: this.state.rowData.filter(
                (elem) => elem.id !== this.state.IdToDelete,
              ),
            });
            this.handleAlert("defaultAlert", false, 0);
            this.handleAlert("confirmAlert", false, 0);
          }}
        >
          <p className="sweet-alert-text">L'utilisateur à été supprimé.</p>
        </SweetAlert>

        <SweetAlert
          error
          title="Annulé !"
          confirmBtnBsStyle="success"
          show={this.state.cancelAlert}
          onConfirm={() => {
            this.handleAlert("cancelAlert", false, 0);
          }}
        >
          <p className="sweet-alert-text">L'action est annulée.</p>
        </SweetAlert>

        {/* Pleine hauteur page */}
        <Row className="app-user-list" style={{ height: "100vh" }}>
          <Col sm="12" className="h-100 d-flex flex-column">
            <Card className="h-100 d-flex flex-column">
              <CardBody
                className="h-100 d-flex flex-column"
                style={{ paddingBottom: "0.5rem" }}
              >
                {/* Titre de la page */}
                <div className="mb-1">
                  <h2 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    Contacts
                  </h2>
                  <p className="text-muted mb-0">
                    Base de données clients et prospects.
                  </p>
                </div>

                {/* HEADER: Barre d'outils */}
                <div
                  className="mb-1"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  {/* === HAUT : Recherche + Création === */}
                  <div
                    className="d-flex align-items-center"
                    style={{ gap: "0.75rem" }}
                  >
                    {/* Barre de recherche */}
                    <Input
                      type="text"
                      placeholder="Rechercher..."
                      onChange={(e) => this.updateSearchQuery(e.target.value)}
                      value={this.state.searchVal}
                      style={{ flex: 1 }}
                    />
                    {/* Lot1 JF 23:09: +bonhomme Nouveau removed (déjà fiche) */}
                  </div>

                  {/* === Onglets + pastilles source (after Prospects, same line) === */}
                  <div
                    className="d-flex align-items-center"
                    style={{
                      gap: "2.5rem",
                      overflowX: "auto",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Onglet TOUS */}
                    <div
                      className={`cursor-pointer ${activeTab === "all" ? "text-primary font-weight-bold" : "text-secondary"}`}
                      style={{
                        borderBottom:
                          activeTab === "all"
                            ? "2px solid #7367f0"
                            : "2px solid transparent",
                        paddingBottom: "5px",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => this.toggleTab("all")}
                    >
                      Tous
                    </div>

                    {/* Onglet MES CLIENTS */}
                    <div
                      className={`cursor-pointer ${activeTab === "mine" ? "text-primary font-weight-bold" : "text-secondary"}`}
                      style={{
                        borderBottom:
                          activeTab === "mine"
                            ? "2px solid #7367f0"
                            : "2px solid transparent",
                        paddingBottom: "5px",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => this.toggleTab("mine")}
                    >
                      Clients
                    </div>

                    {/* Onglet ANCIENS CLIENTS */}
                    <div
                      className={`cursor-pointer ${activeTab === "old_client" ? "text-primary font-weight-bold" : "text-secondary"}`}
                      style={{
                        borderBottom:
                          activeTab === "old_client"
                            ? "2px solid #7367f0"
                            : "2px solid transparent",
                        paddingBottom: "5px",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => this.toggleTab("old_client")}
                    >
                      Anciens Clients
                    </div>

                    {/* Onglet PROSPECTS */}
                    <div
                      className={`cursor-pointer ${activeTab === "prospect" ? "text-primary font-weight-bold" : "text-secondary"}`}
                      style={{
                        borderBottom:
                          activeTab === "prospect"
                            ? "2px solid #7367f0"
                            : "2px solid transparent",
                        paddingBottom: "5px",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => this.toggleTab("prospect")}
                    >
                      Prospects
                    </div>

                    {/* Pastilles filtre source AFTER Prospects (exclusive; tip D pastels) + Inscrit disabled ANCIEN */}
                    <div
                      className="d-flex align-items-center"
                      style={{ gap: "0.5rem", flexWrap: "wrap" }}
                    >
                      {[
                        {
                          key: "cf7",
                          label: "CF7",
                          bg: "#eef2ff",
                          fg: "#4f46e5",
                        },
                        {
                          key: "chatbot",
                          label: "Chatbot",
                          bg: "#e8f4fd",
                          fg: "#1e88e5",
                        },
                        {
                          key: "diagnostic",
                          label: "Diagnostic",
                          bg: "#fff3e0",
                          fg: "#ef6c00",
                        },
                      ].map((p) => {
                        const active = this.state.sourceFilter === p.key;
                        return (
                          <Badge
                            key={p.key}
                            pill
                            className="cursor-pointer"
                            onClick={() => this.setSourceFilter(p.key)}
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              padding: "0.4rem 0.85rem",
                              backgroundColor: active ? p.fg : p.bg,
                              color: active ? "#fff" : p.fg,
                              border: `1px solid ${p.fg}`,
                              cursor: "pointer",
                            }}
                            title={
                              active
                                ? "Cliquer pour retirer le filtre"
                                : `Filtrer source ${p.label}`
                            }
                          >
                            {p.label}
                          </Badge>
                        );
                      })}
                      {/* Inscrit: visible DISABLED until real source flag — ANCIEN grey; not in sourceFilter */}
                      <Badge
                        pill
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          padding: "0.4rem 0.85rem",
                          backgroundColor: "#e9ecef",
                          color: "#6c757d",
                          border: "1px solid #6c757d",
                          cursor: "not-allowed",
                          opacity: 0.7,
                        }}
                        title="Inscrit — bientôt (filtre désactivé)"
                      >
                        Inscrit
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Le conteneur grid prend tout l'espace restant */}
                <div
                  className="ag-theme-material ag-grid-table flex-grow-1"
                  style={{ width: "100%", minHeight: 0 }}
                >
                  {this.state.rowData !== null ? (
                    <ContextLayout.Consumer>
                      {(context) => (
                        <AgGridReact
                          rowBuffer={10}
                          gridOptions={this.state.gridOptions}
                          doesExternalFilterPass={this.doesExternalFilterPass}
                          isExternalFilterPresent={this.isExternalFilterPresent}
                          defaultColDef={defaultColDef}
                          columnDefs={columnDefs}
                          rowData={rowData}
                          onGridReady={(params) => {
                            this.onGridReady(params);
                          }}
                          onFirstDataRendered={this.sizeToFit}
                          onGridSizeChanged={this.sizeToFit}
                          colResizeDefault={"shift"}
                          animateRows={false}
                          floatingFilter={false}
                          pagination={true}
                          paginationPageSize={pageSize}
                          resizable={true}
                          enableRtl={context.state.direction === "rtl"}
                        />
                      )}
                    </ContextLayout.Consumer>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default ClientsList;
