import React from "react";
import { Button, Card, CardBody, Input, Row, Col } from "reactstrap";
import axios from "axios";
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import { Edit, Trash2, UserPlus } from "react-feather";

import { history } from "../../../../history";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss";
import "../../../../assets/scss/pages/users.scss";
import SweetAlert from "react-bootstrap-sweetalert";
import Moment from "react-moment";
import { toast } from "react-toastify";

class MembersList extends React.Component {
  state = {
    defaultAlert: false,
    confirmAlert: false,
    cancelAlert: false,
    IdToDelete: 0,
    rowData: null,
    pageSize: 20,
    isVisible: true,
    reload: false,
    collapse: false,
    status: "Opened",
    role: "All",
    selectStatus: "All",
    verified: "All",
    department: "All",
    // 👉 rôle actuel
    isConsultant: false,
    defaultColDef: {
      resizable: true,
      sortable: true,
      flex: 1,
      minWidth: 120,
      // pas de filtres
      filter: false,
    },
    searchVal: "",
    columnDefs: [
      {
        headerName: "Nom",
        field: "name",
        width: 140,
        minWidth: 140,
        flex: 1,
        valueGetter: (params) =>
          `${params.data?.first_name ?? ""} ${
            params.data?.last_name ?? ""
          }`.trim(),
        cellRendererFramework: (params) => {
          const fullName = `${params.data.first_name} ${params.data.last_name}`;
          const isConsultant = this.state.isConsultant;

          // 👉 Les consultants voient juste le nom, pas de clic, pas de cursor-pointer
          if (isConsultant) {
            return (
              <div className="d-flex align-items-center">
                <span>{fullName}</span>
              </div>
            );
          }

          // 👉 Autres rôles : clic vers les détails (onglet 2)
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() =>
                history.push("/app/member/edit/" + params.data.id + "/2")
              }
            >
              <span>{fullName}</span>
            </div>
          );
        },
      },
      {
        headerName: "Email",
        field: "email",
        width: 160,
        minWidth: 140,
        flex: 1,
      },
      {
        headerName: "Rôle",
        field: "role",
        width: 110,
        minWidth: 90,
        flex: 0,
        valueFormatter: (params) => {
          const v = params.value;
          if (!v || typeof v !== "string") return v || "";
          return v.charAt(0).toUpperCase() + v.slice(1);
        },
      },
      {
        headerName: "Date de Création",
        field: "created_at",
        width: 140,
        minWidth: 120,
        flex: 0,
        cellRendererFramework: (params) => {
          return (
            <div>
              <Moment format="DD/MM/YYYY" date={params.data.created_at} utc />
            </div>
          );
        },
        comparator: (a, b) => {
          const da = new Date(a).getTime();
          const db = new Date(b).getTime();
          return da - db;
        },
      },
      {
        headerName: "Actions",
        field: "transactions",
        width: 110,
        minWidth: 90,
        flex: 0,
        cellRendererFramework: (params) => {
          const isConsultant = this.state.isConsultant;

          // 👉 Les consultants voient les icônes mais ne peuvent pas cliquer
          if (isConsultant) {
            return (
              <div className="actions d-flex align-items-center">
                <Edit className="mr-50" size={20} color="#cccccc" />
                <Trash2 size={20} color="#cccccc" />
              </div>
            );
          }

          // 👉 Autres rôles : comportement normal (édition + suppression)
          return (
            <div className="actions cursor-pointer">
              <Edit
                className="mr-50"
                size={20}
                onClick={() =>
                  history.push("/app/member/edit/" + params.data.id + "/1")
                }
              />
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

  // Ajuste les colonnes à la largeur disponible (supprime l'espace droit)
  sizeToFit = () => {
    if (this.gridApi) {
      try {
        this.gridApi.sizeColumnsToFit();
      } catch (e) {}
    }
  };

  createContract(id, name) {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    axios
      .post(
        global.config.server_url + "/documents",
        {
          name: "abc",
          link_to_documents: "N/a",
          type: "contrat",
          document_state: "Pending...",
          date: "2010-10-10",
          comment: "Contrat de " + name,
          advanced_payment: "0",
          user_id: id,
        },
        Config
      )
      .then(function (result) {
        history.push("/app/contract/handleServices/" + result.data.id);
      })
      .catch(function (error) {
        toast.error("API injoignable" + error);
      });
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // 👉 Rôle depuis le localStorage
    const roleStr = (localStorage.getItem("role") || "").toLowerCase();
    const isConsultant = roleStr.includes("consultant");
    this.setState({ isConsultant });

    await axios
      .get(global.config.server_url + "/users?kind=member", Config)
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData });
      });
  }

  deleteUser(id) {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    axios
      .delete(global.config.server_url + "/users/" + id, Config)
      .then(() => {
        this.setState((prev) => ({
          rowData: (prev.rowData || []).filter((r) => r.id !== id),
        }));
      })
      .catch((error) => {
        toast.error("Suppression impossible : " + error);
      });
  }

  onGridReady = (params) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.sizeToFit();
    window.addEventListener("resize", this.sizeToFit);
  };

  componentWillUnmount() {
    window.removeEventListener("resize", this.sizeToFit);
  }

  updateSearchQuery = (val) => {
    if (this.gridApi) {
      this.gridApi.setQuickFilter(val);
    }
    this.setState({
      searchVal: val,
    });
  };

  toggleCollapse = () => {
    this.setState((state) => ({ collapse: !state.collapse }));
  };

  onEntered = () => {
    this.setState({ status: "Opened" });
  };
  onEntering = () => {
    this.setState({ status: "Opening..." });
  };
  onExiting = () => {
    this.setState({ status: "Closing..." });
  };
  onExited = () => {
    this.setState({ status: "Closed" });
  };

  removeCard = () => {
    this.setState({ isVisible: false });
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
          title="Êtes-vous sûrs?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          cancelBtnBsStyle="primary"
          confirmBtnBsStyle="danger"
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
            this.handleAlert("defaultAlert", false, 0);
            this.handleAlert("confirmAlert", false, 0);
          }}
        >
          <p className="sweet-alert-text">Your file has been deleted.</p>
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

        {/* Le Row occupe 100vh, puis on propage la hauteur aux enfants en flex */}
        <Row className="app-user-list" style={{ height: "100vh" }}>
          <Col sm="12" className="h-100 d-flex flex-column">
            <Card className="h-100 d-flex flex-column">
              <CardBody
                className="h-100 d-flex flex-column"
                style={{ paddingBottom: "1rem" }}
              >
                {/* Header : recherche + bouton création */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-1">
                  <Input
                    className="mr-1 mb-1 mb-sm-0"
                    style={{ maxWidth: 360 }}
                    type="text"
                    placeholder="Rechercher..."
                    onChange={(e) => this.updateSearchQuery(e.target.value)}
                    value={this.state.searchVal}
                  />

                  {/* 👉 Les consultants n'ont PAS le bouton "Créer un compte" */}
                  {!this.state.isConsultant && (
                    <Button.Ripple
                      className="mb-1"
                      outline
                      color="primary"
                      onClick={() =>
                        history.push("/app/member/createUser")
                      }
                    >
                      <UserPlus size={15} className="mr-50" />
                      Créer un compte
                    </Button.Ripple>
                  )}
                </div>

                {/* Conteneur AG Grid qui prend tout l'espace restant */}
                <div
                  className="ag-theme-material ag-grid-table flex-grow-1"
                  style={{ width: "100%", minHeight: 0 }}
                >
                  {this.state.rowData !== null ? (
                    <ContextLayout.Consumer>
                      {(context) => (
                        <AgGridReact
                          gridOptions={{}}
                          onFirstDataRendered={this.sizeToFit}
                          onGridSizeChanged={this.sizeToFit}
                          defaultColDef={defaultColDef}
                          columnDefs={columnDefs}
                          rowData={rowData}
                          onGridReady={this.onGridReady}
                          colResizeDefault={"shift"}
                          animateRows={true}
                          floatingFilter={false}
                          pagination={true}
                          paginationPageSize={pageSize}
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

export default MembersList;
