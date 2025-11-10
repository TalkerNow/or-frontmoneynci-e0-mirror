import React from "react";
import { UserPlus, Trash2 } from "react-feather";
import {
  Button,
  Card,
  CardBody,
  Input,
  Row,
  Col,
} from "reactstrap";
import axios from "axios";
import * as XLSX from "xlsx";
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import { history } from "../../../../history";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss";
import "../../../../assets/scss/pages/users.scss";
import SweetAlert from "react-bootstrap-sweetalert";
import Moment from "react-moment";
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
  "sebastien@eor.fr"
];

class ClientsList extends React.Component {
  state = {
    defaultAlert: false,
    confirmAlert: false,
    cancelAlert: false,
    IdToDelete: 0,
    rowData: null,
    pageSize: 70, // par défaut 70 par page
    defaultColDef: {
      resizable: true,
      sortable: true,
      flex: 1,
      minWidth: 120,
    },
    searchVal: "",
    currentUserEmail: "",
    // ID utilisé pour le filtre "Mes clients". null => pas de filtre.
    myFilterId: null,
    // Saisie téléphone normalisée (chiffres) utilisée par le filtre externe
    phoneQueryDigits: "",
    // Map userId -> array de services (depuis le dernier document)
    servicesByUserId: {},
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
        history.push("/app/user/edit/" + params.data.id + "/2");
      },
      getRowClass: () => "client-row",
      suppressRowClickSelection: true,
    },
    columnDefs: [
      {
        headerName: "Création",
        filter: true,
        width: 120,
        minWidth: 120,
        flex: 0,
        cellRendererFramework: (params) => {
          return (
            <div>
              <Moment
                format="DD/MM/YYYY"
                date={params.data.created_at}
                utc
              />
            </div>
          );
        },
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
        headerName: "Prénom",
        filter: true,
        width: 120,
        minWidth: 120,
        flex: 0,
        valueGetter: (params) => params.data.first_name,
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
        cellClass: 'd-flex align-items-center justify-content-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
        cellRendererFramework: (params) => {
          const userId = params?.data?.id;
          const services =
            (this.state.servicesByUserId && this.state.servicesByUserId[userId]) || [];
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
                  "mailto:" + email + "?subject=Subject&body=message%20goes%20here";
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
        valueGetter: (params) => (params.data.parent ? params.data.parent.name : ""),
      },
      {
        headerName: "Apporteur",
        filter: false,
        width: 140,
        minWidth: 140,
        flex: 0,
        valueGetter: (params) => {
          return params.data.business_introducer
            ? params.data.business_introducer.name || params.data.business_introducer
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
        cellClass: 'd-flex align-items-center justify-content-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
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
    const found = candidates.find(v => v !== undefined && v !== null);
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

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // Récupère clients + documents en parallèle
    try {
      const [usersRes, docsRes] = await Promise.all([
        axios.get(global.config.server_url + "/users?kind=client", Config),
        axios.get(global.config.server_url + "/documents", Config),
      ]);

      const rowData = usersRes.data;
      const documents = docsRes.data || [];
      const servicesByUserId = this.buildServicesMapFromDocuments(documents);

      this.setState({ rowData, servicesByUserId });
    } catch (e) {
      console.error("Erreur chargement clients/documents", e);
    }

    // Email utilisateur courant (pour export XLSX)
    const userId = localStorage.getItem("userid");
    if (userId) {
      try {
        const meRes = await axios.get(`${global.config.server_url}/users/${userId}`, Config);
        const currentUserEmail = (meRes?.data?.email || "").toLowerCase();
        this.setState({ currentUserEmail });
      } catch (e) {
        console.error("Impossible de récupérer l'utilisateur courant", e);
      }
    }
  }

  sizeToFit = () => {
    if (this.gridApi) {
      try {
        this.gridApi.sizeColumnsToFit();
      } catch (e) {}
    }
  };

  // ======= EXPORT EXCEL (XLSX) =======
  getExportHeaders = () => [
    "ID","Créé le","Civilité","Nom","Prénom","Email","Téléphone mobile","Téléphone bureau",
    "Statut","Mise à jour du statut","Technicien (parent)","Apporteur","Date de naissance",
    "Lieu de naissance","Nombre d’enfants","Situation maritale","Adresse perso","Adresse perso 2",
    "Ville perso","Code postal perso","Pays perso","Société","Adresse société","Adresse société 2",
    "Ville société","Code postal société","Pays société","Notes","Services souscrits",
    "Compte valide","Utilisateur (ID)","ID parent (numérique)",
  ];
  formatDateForExcel = (d) => {
    if (!d) return "";
    return String(d).replace("T", " ").replace("Z", "");
  };
  sanitizeText = (t) => (!t ? "" : String(t).replace(/\r?\n/g, " ").replace(/\s\s+/g, " ").trim());
  buildClientRow = (c) => {
    const civ = c.civility === "Monsieur" ? "M." : c.civility === "Madame" ? "Mme" : (c.civility || "");
    const apport = c.business_introducer ? (c.business_introducer.name || c.business_introducer) : "";
    return {
      "ID": c.id ?? "",
      "Créé le": this.formatDateForExcel(c.created_at),
      "Civilité": civ,
      "Nom": c.last_name ?? "",
      "Prénom": c.first_name ?? "",
      "Email": c.email ?? "",
      "Téléphone mobile": c.mobile_number ?? "",
      "Téléphone bureau": c.office_number ?? "",
      "Statut": c.status ?? "",
      "Mise à jour du statut": c.status_update_date ?? "",
      "Technicien (parent)": c.parent ? c.parent.name : "",
      "Apporteur": apport,
      "Date de naissance": this.formatDateForExcel(c.birth_date),
      "Lieu de naissance": c.birth_place ?? "",
      "Nombre d’enfants": c.children_number ?? "",
      "Situation maritale": c.martial_status ?? "",
      "Adresse perso": c.personal_address ?? "",
      "Adresse perso 2": c.personal_address_2 ?? "",
      "Ville perso": c.personal_city ?? "",
      "Code postal perso": c.personal_zip_code ?? "",
      "Pays perso": c.personal_country ?? "",
      "Société": c.society_name ?? "",
      "Adresse société": c.society_address ?? "",
      "Adresse société 2": c.society_address_2 ?? "",
      "Ville société": c.society_city ?? "",
      "Code postal société": c.society_zip_code ?? "",
      "Pays société": c.society_country ?? "",
      "Notes": this.sanitizeText(c.notes),
      "Services souscrits": this.sanitizeText(c.subscribe_services),
      "Compte valide": c.valid_account ? "Oui" : "Non",
      "Utilisateur (ID)": c.user_id ?? "",
      "ID parent (numérique)": c.parent_id ?? "",
    };
  };
  canDownload = () => {
    const email = (this.state.currentUserEmail || "").toLowerCase();
    return ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email);
  };
  onBtExportXLSX = () => {
    if (!this.canDownload()) return;
    const { rowData } = this.state;
    if (!rowData || !rowData.length) return;
    const headers = this.getExportHeaders();
    const data = rowData.map(this.buildClientRow);
    const ws = XLSX.utils.json_to_sheet(data, { header: headers, skipHeader: true });
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
    const colWidths = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
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
    this.state.myFilterId !== null ||
    (this.state.phoneQueryDigits && this.state.phoneQueryDigits.length > 0);

  doesExternalFilterPass = (node) => {
    // 1) Filtre "Mes clients"
    if (this.state.myFilterId !== null) {
      const ownerId = this.getOwnerIdFromRow(node?.data);
      if (ownerId === null) return false;
      if (String(ownerId) !== String(this.state.myFilterId)) return false;
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

  // --- Actions (conservés mais plus déclenchés sans colonne Actions)
  deleteUser(id) {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    axios
      .delete(global.config.server_url + "/users/" + id, Config)
      .then(() => {
        var SelectedData = this.gridApi.getSelectedRows();
        this.gridApi.updateRowData({ remove: SelectedData });
      });
  }

  onGridReady = (params) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.sizeToFit();
    window.addEventListener("resize", this.sizeToFit);
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

    this.setState(
      { searchVal: val, phoneQueryDigits: phoneDigits },
      () => {
        // Recalcule le filtre externe (Mes clients + recherche téléphone)
        if (this.gridApi) this.gridApi.onFilterChanged();
      }
    );
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
  }

  // Toggle Mes clients / Tous les clients (filtre par l'ID utilisateur courant)
  toggleMyClients = () => {
    const me = this.normalizeId(localStorage.getItem("userid"));
    this.setState(
      (prev) => ({ myFilterId: prev.myFilterId === null ? me : null }),
      () => {
        if (this.gridApi) this.gridApi.onFilterChanged();
      }
    );
  };

  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state;
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
                (elem) => elem.id !== this.state.IdToDelete
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
              <CardBody className="h-100 d-flex flex-column" style={{ paddingBottom: "0.5rem" }}>
                {/* HEADER: recherche à gauche, boutons à droite */}
                <div className="ag-grid-actions d-flex justify-content-between align-items-center flex-wrap mb-1">
                  {/* Gauche : Recherche */}
                  <div className="d-flex align-items-center mb-1" style={{ minWidth: 280, flex: 1 }}>
                    <Input
                      className="mr-1 w-100"
                      type="text"
                      placeholder="Rechercher..."
                      onChange={(e) => this.updateSearchQuery(e.target.value)}
                      value={this.state.searchVal}
                    />
                  </div>

                  {/* Droite : Mes/Tous les clients + Créer un compte (vert) */}
                  <div className="d-flex align-items-center mb-1">
                    <Button
                      outline
                      color="primary"
                      className="mr-1"
                      onClick={this.toggleMyClients}
                    >
                      {this.state.myFilterId === null ? "Mes clients" : "Tous les clients"}
                    </Button>

                    <Button
                      color="success"
                      onClick={() => history.push("/app/user/createUser")}
                    >
                      <UserPlus size={15} className="mr-50" />
                      Créer un compte
                    </Button>
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
