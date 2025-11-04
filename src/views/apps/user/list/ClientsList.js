import React from "react";
import { Download, Edit, Trash2, ChevronDown, UserPlus } from "react-feather";
import {
  Button,
  Card,
  CardBody,
  Input,
  Row,
  Col,
  UncontrolledDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
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

var consultant_id = -1;

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
    filter: false,
    rowData: null,
    pageSize: 70,
    isVisible: true,
    collapse: false,
    defaultColDef: {
      resizable: true,
      sortable: true,
      flex: 1,
      minWidth: 120,
    },
    searchVal: "",
    currentUserEmail: "",
    gridOptions: {
      onCellClicked: (params) => {
        const colKey = params?.colDef?.field || params?.colDef?.colId;
        if (!params?.data?.id) return;
        if (colKey === "email" || colKey === "actions") return;
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
                format="DD/MM/YYYY HH:mm"
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
      {
        headerName: "Nom du technicien",
        filter: false,
        width: 140,
        minWidth: 140,
        flex: 0,
        valueGetter: (params) => (params.data.parent ? params.data.parent.name : ""),
      },
      {
        headerName: "Apport commercial",
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
      {
        headerName: "Email",
        field: "email",
        filter: true,
        width: 220,
        minWidth: 200,
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
        headerName: "Actions",
        colId: "actions",
        width: 81,
        minWidth: 81,
        flex: 0,
        cellRendererFramework: (params) => {
          return (
            <div
              className="actions"
              style={{ cursor: "default" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Edit
                className="mr-50"
                size={20}
                onClick={(e) => {
                  e.stopPropagation();
                  history.push("/app/user/edit/" + params.data.id + "/1");
                }}
              />
              <Trash2
                size={20}
                onClick={(e) => {
                  e.stopPropagation();
                  this.handleAlert("defaultAlert", true, params.data.id);
                }}
              />
            </div>
          );
        },
      },
    ],
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    await axios
      .get(global.config.server_url + "/users?kind=client", Config)
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData });
      });

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
    "Statut","Mise à jour du statut","Technicien (parent)","Apport commercial","Date de naissance",
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
      "Apport commercial": apport,
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

  isExternalFilterPresent = () => consultant_id !== -1;
  onBtExport = () => {
    this.gridApi.exportDataAsCsv({ columnKeys: [3, 1, 2, 5] });
  };
  externalFilterChanged = (newValue) => {
    consultant_id = newValue;
    this.setState({ filter: !this.state.filter });
    this.gridApi.onFilterChanged();
  };
  doesExternalFilterPass = (node) => node.data.parent_id === consultant_id;

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
    this.gridApi.setQuickFilter(val);
    this.setState({ searchVal: val });
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

  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state;
    return (
      <div>
        <SweetAlert
          title="Êtes vous sûrs?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          cancelBtnBsStyle="danger"
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
          onConfirm={() => {
            this.handleAlert("basicAlert", false, 0);
            this.handleAlert("confirmAlert", true, 0);
          }}
          onCancel={() => {
            this.handleAlert("basicAlert", false, 0);
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
          title="Annulé!"
          confirmBtnBsStyle="success"
          show={this.state.cancelAlert}
          onConfirm={() => {
            this.handleAlert("cancelAlert", false, 0);
          }}
        >
          <p className="sweet-alert-text">L'action est annulé</p>
        </SweetAlert>

        {/* Pleine hauteur page */}
        <Row className="app-user-list" style={{ height: "100vh" }}>
          <Col sm="12" className="h-100 d-flex flex-column">
            <Card className="h-100 d-flex flex-column">
              <CardBody className="h-100 d-flex flex-column" style={{ paddingBottom: "0.5rem" }}>
                <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                  <div className="filter-actions d-flex">
                    <Input
                      className="w-50 mr-1 mb-1 mb-sm-0"
                      type="text"
                      placeholder="Rechercher..."
                      onChange={(e) => this.updateSearchQuery(e.target.value)}
                      value={this.state.searchVal}
                    />
                    <div>
                      {consultant_id !== -1 && this.state.filter === true && (
                        <Button
                          className="mr-1 mb-1"
                          style={{ width: 170, height: 40 }}
                          outline
                          color="primary"
                          onClick={() => this.externalFilterChanged(-1)}
                        >
                          tous les clients
                        </Button>
                      )}
                      {consultant_id === -1 && this.state.filter === false && (
                        <Button
                          className="mr-1 mb-1"
                          style={{ width: 140, height: 40 }}
                          outline
                          color="primary"
                          onClick={() =>
                            this.externalFilterChanged(localStorage.getItem("userid"))
                          }
                        >
                          Mes clients
                        </Button>
                      )}
                    </div>
                    <div>
                      <Button
                        className="mr-1 mb-1"
                        outline
                        color="primary"
                        onClick={() => history.push("/app/user/createUser")}
                      >
                        <UserPlus size={15} />
                      </Button>
                    </div>
                    <div className="dropdown mr-1 mb-1 d-inline-block">
                      {this.canDownload() && (
                        <Button
                          className="mb-2"
                          outline
                          color="primary"
                          onClick={this.onBtExportXLSX}
                        >
                          <Download className="primary" size={15} />
                        </Button>
                      )}
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
                          floatingFilter={true}
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
