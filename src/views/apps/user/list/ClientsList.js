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

class ClientsList extends React.Component {
  state = {
    defaultAlert: false,
    confirmAlert: false,
    cancelAlert: false,
    IdToDelete: 0,
    filter: false,
    rowData: null,
    pageSize: 20,
    isVisible: true,
    collapse: false,
    defaultColDef: {
      resizable: true,
      sortable: true,
    },
    searchVal: "",
    gridOptions: {
      onCellClicked: (params) => {
        if (
          params.colDef.headerName === "Nom" ||
          params.colDef.field === "Prenom"
        ) {
          history.push("/app/user/edit/" + params.data.id + "/1");
        }
      },
    },
    columnDefs: [
      {
        headerName: "Création",
        filter: true,
        width: 150,
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
        width: 250,
        valueGetter: (params) => {
          return params.data.last_name;
        },
      },
      {
        headerName: "Prenom",
        filter: true,
        width: 250,
        valueGetter: (params) => {
          return params.data.first_name;
        },
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
        field: "parent_id",
        filter: true,
        hide: true,
      },
      {
        headerName: "Nom du technicien",
        filter: false,
        width: 250,
        valueGetter: (params) => {
          return params.data.parent ? params.data.parent.name : "";
        },
      },
      {
        headerName: "Apport commercial",
        filter: false,
        width: 250,
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
        width: 250,
        cellRendererFramework: (rowData) => {
          var email = rowData.data.email;
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() =>
                (window.location.href =
                  "mailto:" +
                  email +
                  "?subject=Subject&body=message%20goes%20here")
              }
            >
              <span>{rowData.data.email}</span>
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        width: 150,
        cellRendererFramework: (params) => {
          return (
            <div className="actions cursor-pointer">
              <Edit
                className="mr-50"
                size={15}
                onClick={() =>
                  history.push("/app/user/edit/" + params.data.id + "/1")
                }
              />
              <Trash2
                size={15}
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
  }

  // ======= EXPORT EXCEL (XLSX) =======

  // Ordre de colonnes voulu dans l'Excel
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
    "Apport commercial",
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

  // Format date simple et robuste
  formatDateForExcel = (d) => {
    if (!d) return "";
    // Garde un format lisible par Excel sans dépendances (#stabilité)
    return String(d).replace("T", " ").replace("Z", "");
  };

  // Nettoie les sauts de ligne / espaces longs
  sanitizeText = (t) => {
    if (!t) return "";
    return String(t).replace(/\r?\n/g, " ").replace(/\s\s+/g, " ").trim();
  };

  // Construit une ligne "propre" depuis l'objet brut
  buildClientRow = (c) => {
    const civ =
      c.civility === "Monsieur" ? "M." : c.civility === "Madame" ? "Mme" : (c.civility || "");
    const apport =
      c.business_introducer ? (c.business_introducer.name || c.business_introducer) : "";

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

  onBtExportXLSX = () => {
    const { rowData } = this.state;
    if (!rowData || !rowData.length) return;

    const headers = this.getExportHeaders();
    const data = rowData.map(this.buildClientRow);

    // Construit la feuille avec l'ordre de colonnes fixé
    const ws = XLSX.utils.json_to_sheet(data, { header: headers, skipHeader: true });
    // Ajoute les en-têtes en A1
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

    // Ajuste la largeur des colonnes (basique)
    const colWidths = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    XLSX.writeFile(wb, `export_clients_${today}.xlsx`);
  };

  // ======= FIN EXPORT EXCEL =======

  isExternalFilterPresent = () => {
    if (consultant_id !== -1) {
      return true;
    }
    return false;
  };

  // Ancien export CSV (gardé si besoin, mais non utilisé par le bouton)
  onBtExport = () => {
    this.gridApi.exportDataAsCsv({
      columnKeys: [3, 1, 2, 5],
    });
  };

  externalFilterChanged = (newValue) => {
    consultant_id = newValue;
    this.setState({ filter: !this.state.filter });
    this.gridApi.onFilterChanged();
  };
  doesExternalFilterPass = (node) => {
    return node.data.parent_id === consultant_id;
  };

  deleteUser(id) {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    axios
      .delete(global.config.server_url + "/users/" + id, Config)
      .then((response) => {
        var SelectedData = this.gridApi.getSelectedRows();
        this.gridApi.updateRowData({ remove: SelectedData });
      });
  }

  onGridReady = (params) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.gridApi.setDomLayout("autoHeight");
  };

  filterData = (column, val) => {
    var filter = this.gridApi.getFilterInstance(column);
    var modelObj = null;
    if (val !== "all") {
      modelObj = {
        type: "equals",
        filter: val,
      };
    }
    filter.setModel(modelObj);
    this.gridApi.onFilterChanged();
  };

  filterSize = (val) => {
    if (this.gridApi) {
      this.gridApi.paginationSetPageSize(Number(val));
      this.setState({
        pageSize: val,
      });
    }
  };

  updateSearchQuery = (val) => {
    this.gridApi.setQuickFilter(val);
    this.setState({
      searchVal: val,
    });
  };

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value });
    if (id !== 0) this.setState({ IdToDelete: id });
    if (state === "confirmAlert" && value === true) {
      this.deleteUser(this.state.IdToDelete);
    }
  };

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
            this.handleAlert("defaultAlert", false, 0);
            this.handleAlert("cancelAlert", false, 0);
          }}
        >
          <p className="sweet-alert-text">L'action est annulé</p>
        </SweetAlert>

        <Row className="app-user-list">
          <Col sm="12">
            <Card style={{ minHeight: "3000px" }}>
              <CardBody>
                <div className="ag-theme-material ag-grid-table">
                  <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                    <div className="sort-dropdown">
                      <UncontrolledDropdown className="ag-dropdown p-1">
                        <DropdownToggle tag="div">
                          1 - {pageSize} of 50
                          <ChevronDown className="ml-50" size={20} />
                        </DropdownToggle>
                        <DropdownMenu right>
                          <DropdownItem
                            tag="div"
                            onClick={() => this.filterSize(20)}
                          >
                            20
                          </DropdownItem>
                          <DropdownItem
                            tag="div"
                            onClick={() => this.filterSize(50)}
                          >
                            50
                          </DropdownItem>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </div>
                    <div className="filter-actions d-flex">
                      <Input
                        className="w-50 mr-1 mb-1 mb-sm-0"
                        type="text"
                        placeholder="search..."
                        onChange={(e) => this.updateSearchQuery(e.target.value)}
                        value={this.state.searchVal}
                      />
                      <div>
                        {consultant_id !== -1 && this.state.filter === true && (
                          <>
                            <Button
                              className="mr-1 mb-1"
                              style={{ width: 170, height: 40 }}
                              outline
                              color="primary"
                              onClick={() => this.externalFilterChanged(-1)}
                            >
                              tous les clients
                            </Button>
                          </>
                        )}
                        {consultant_id === -1 &&
                          this.state.filter === false && (
                            <>
                              <Button
                                className="mr-1 mb-1"
                                style={{ width: 140, height: 40 }}
                                outline
                                color="primary"
                                onClick={() =>
                                  this.externalFilterChanged(
                                    localStorage.getItem("userid")
                                  )
                                }
                              >
                                mes clients
                              </Button>
                            </>
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
                        <Button
                          className="mb-2"
                          outline
                          color="primary"
                          onClick={this.onBtExportXLSX}
                        >
                          <Download className="primary" size={15} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {this.state.rowData !== null ? (
                    <ContextLayout.Consumer>
                      {(context) => (
                        <AgGridReact
                          rowBuffer={10}
                          height={"autoHeight"}
                          gridOptions={this.state.gridOptions}
                          doesExternalFilterPass={this.doesExternalFilterPass}
                          isExternalFilterPresent={this.isExternalFilterPresent}
                          defaultColDef={defaultColDef}
                          columnDefs={columnDefs}
                          rowData={rowData}
                          onGridReady={this.onGridReady}
                          colResizeDefault={"shift"}
                          animateRows={false}
                          floatingFilter={true}
                          pagination={true}
                          pivotPanelShow="always"
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
