import React from "react";
import { Input, Row, Col, Button, Card, CardBody, Table } from "reactstrap";
import { Trash2, AlertTriangle } from "react-feather";
import { history } from "../../../../history";
import axios from "axios";
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss";
import "../../../../assets/scss/pages/users.scss";
import "../../../../assets/scss/pages/contract.scss";
import Moment from "react-moment";
import SweetAlert from "react-bootstrap-sweetalert";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent";

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};
var consultant_id = -1;

class AllContracts extends React.Component {
  calculateContractFinances = (contract) => {
    let values = {};
    try {
      values = contract.values ? JSON.parse(contract.values) : {};
    } catch (e) {
      console.warn("Error parsing contract values", e);
    }

    let acompteDates = [];
    try {
      acompteDates = contract.acompte_dates
        ? typeof contract.acompte_dates === "string"
          ? JSON.parse(contract.acompte_dates)
          : contract.acompte_dates
        : [];
    } catch (e) {
      console.warn("Error parsing acompte dates", e);
    }

    let soldDates = [];
    try {
      soldDates = contract.sold_dates
        ? typeof contract.sold_dates === "string"
          ? JSON.parse(contract.sold_dates)
          : contract.sold_dates
        : [];
    } catch (e) {
      console.warn("Error parsing sold dates", e);
    }

    const totalTTC =
      parseFloat(contract.advanced_payment) || parseFloat(values.TOTALTTC) || 0;
    const fp1 = values.fp1 || 0;
    const fp2 = values.fp2 || 0;

    const amountAcompte = (totalTTC * fp1) / 100;
    const amountTotalSolde = (totalTTC * fp2) / 100;

    let totalPaid = 0;
    let acomptePaid = 0;
    let soldePaid = 0;

    // Smart logic for Acompte
    const fixedAcomptes = acompteDates.filter(
      (d) => d && typeof d === "object" && d.amount !== undefined,
    );
    const sumFixedAcomptes = fixedAcomptes.reduce(
      (acc, d) => acc + parseFloat(d.amount || 0),
      0,
    );
    const unFixedAcomptesCount = acompteDates.length - fixedAcomptes.length;
    let amountPerAcompte = 0;
    if (unFixedAcomptesCount > 0) {
      amountPerAcompte =
        (amountAcompte - sumFixedAcomptes) / unFixedAcomptesCount;
    }

    acompteDates.forEach((d) => {
      if (d && typeof d === "object" && d.is_paid) {
        const paidAmount =
          d.amount !== undefined ? parseFloat(d.amount) : amountPerAcompte;
        totalPaid += paidAmount;
        acomptePaid += paidAmount;
      }
    });

    // Smart logic for Solde
    const fixedSoldes = soldDates.filter(
      (d) => d && typeof d === "object" && d.amount !== undefined,
    );
    const sumFixedSoldes = fixedSoldes.reduce(
      (acc, d) => acc + parseFloat(d.amount || 0),
      0,
    );
    const unFixedSoldesCount = soldDates.length - fixedSoldes.length;
    let amountPerSolde = 0;
    if (unFixedSoldesCount > 0) {
      amountPerSolde = (amountTotalSolde - sumFixedSoldes) / unFixedSoldesCount;
    }

    soldDates.forEach((d) => {
      if (d && typeof d === "object" && d.is_paid) {
        const paidAmount =
          d.amount !== undefined ? parseFloat(d.amount) : amountPerSolde;
        totalPaid += paidAmount;
        soldePaid += paidAmount;
      }
    });

    const totalRemaining = totalTTC - totalPaid;
    const isFullyPaid = totalPaid >= totalTTC - 0.01;

    // Check if acompte is fully paid (with small tolerance)
    const isAcomptePaid =
      amountAcompte > 0 ? acomptePaid >= amountAcompte - 0.01 : true;
    // Check if solde is fully paid
    const isSoldePaid =
      amountTotalSolde > 0 ? soldePaid >= amountTotalSolde - 0.01 : true;

    return {
      totalPaid: Math.round(totalPaid),
      totalRemaining: Math.round(Math.max(0, totalRemaining)),
      isFullyPaid,
      amountAcompte,
      amountTotalSolde,
      acomptePaid: Math.round(acomptePaid),
      soldePaid: Math.round(soldePaid),
      isAcomptePaid,
      isSoldePaid,
    };
  };

  state = {
    filter: false,
    defaultAlert: false,
    confirmAlert: false,
    cancelAlert: false,
    IdToDelete: 0,
    rowData: null,
    pageSize: 50,
    isVisible: true,
    reload: false,
    collapse: false,
    status: "Opened",
    selectStatus: "All",
    verified: "All",
    department: "All",
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },

    searchVal: "",
    columnDefs: [
      {
        headerName: "Contrat",
        field: "comment",
        width: 300,
        cellRendererFramework: (params) => {
          const name = params.data.comment || "";
          const formattedName = name.replace(/^(Contrat|Contract) de\s+/i, "");
          return (
            <div
              className="d-flex align-items-center cursor-pointer contract-name-cell"
              onClick={() => history.push("/pages/contract/" + params.data.id)}
            >
              <span style={{ color: "#283046" }}>{formattedName}</span>
            </div>
          );
        },
      },
      {
        headerName: "creator_id",
        field: "creator_id",
        width: 150,
        hide: true,
        cellRendererFramework: (params) => {
          return (
            <div className="d-flex align-items-center cursor-pointer">
              <span>{params.data.creator_id}</span>
            </div>
          );
        },
      },
      {
        headerName: "Prestation",
        field: "subscribe_services",
        width: 220,
        cellRendererFramework: (params) => {
          return (
            <>
              {(() => {
                let subscribe_service = params.data.subscribe_services;
                if (subscribe_service === null || subscribe_service === "") {
                  return <div></div>;
                } else {
                  let lst_subscribe_services = subscribe_service
                    .replaceAll('"', "")
                    .trim()
                    .split("/");
                  const tags = [];
                  lst_subscribe_services.forEach(function (service, index) {
                    if (service !== "") {
                      tags.push(
                        <Chip
                          className="m-0 text-center ml-1"
                          key={index}
                          color={chipColors[service.trim()]}
                          text={service}
                        />,
                      );
                    }
                  });
                  return tags;
                }
              })()}
            </>
          );
        },
      },
      {
        headerName: "Montant",
        field: "advanced_payment",
        width: 160,
        cellRendererFramework: (params) => {
          const totalAmount = params.data.advanced_payment || 0;
          return (
            <div className="d-flex align-items-center">
              <span>{totalAmount} €</span>
            </div>
          );
        },
      },
      {
        headerName: "Reste",
        field: "reste",
        width: 160,
        cellRendererFramework: (params) => {
          const { totalRemaining, isFullyPaid } =
            this.calculateContractFinances(params.data);

          // Vert si soldé (0 €), Rouge si reste à payer
          if (isFullyPaid || totalRemaining === 0) {
            return (
              <div className="d-flex align-items-center">
                <span style={{ color: "#28c76f" }}>0 €</span>
              </div>
            );
          }

          return (
            <div className="d-flex align-items-center">
              <span style={{ color: "#ea5455" }}>{totalRemaining} €</span>
            </div>
          );
        },
      },

      {
        headerName: "État",
        field: "document_state",
        width: 170,
        cellRendererFramework: (params) => {
          const { isFullyPaid } = this.calculateContractFinances(params.data);
          const state = params.data.document_state || "";
          const stateLower = state.toLowerCase();

          // Determine badge style and text based on state and payment
          let badgeClass = "etat-badge";
          let badgeText = state;

          if (stateLower.startsWith("termin")) {
            if (isFullyPaid) {
              badgeClass += " etat-success"; // Green - Paid and finished
              badgeText = "Terminé";
            } else {
              badgeClass += " etat-danger"; // Red/Pink - Finished but unpaid
              badgeText = "Terminé (Impayé)";
            }
          } else if (stateLower === "en cours") {
            badgeClass += " etat-primary"; // Blue - In progress
          } else if (stateLower === "en attente") {
            badgeClass += " etat-secondary"; // Gray - Pending
          } else {
            badgeClass += " etat-secondary"; // Default gray
          }

          return (
            params.data.user && (
              <div className="d-flex align-items-center">
                <span className={badgeClass}>{badgeText}</span>
              </div>
            )
          );
        },
      },
      {
        headerName: "Date de Création",
        field: "created_at",
        width: 200,
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
        headerName: "Date acompte",
        field: "deposit_date",
        width: 200,
        cellRendererFramework: (params) => {
          if (params.data.deposit_date !== null) {
            return (
              <div>
                <Moment
                  format="DD/MM/YYYY"
                  date={params.data.deposit_date}
                  utc
                />
              </div>
            );
          } else return <div></div>;
        },
      },
      {
        headerName: "Date solde",
        field: "sold_date",
        width: 200,
        cellRendererFramework: (params) => {
          if (params.data.sold_date !== null) {
            return (
              <div>
                <Moment format="DD/MM/YYYY" date={params.data.sold_date} utc />
              </div>
            );
          } else return <div></div>;
        },
      },
      {
        headerName: "Actions",
        field: "transactions",
        width: 150,
        cellRendererFramework: (params) => {
          return (
            <div className="actions cursor-pointer">
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

    // ✅ FORCE FILTER FOR CONSULTANTS
    const rawRole = localStorage.getItem("role") || "";
    const isConsultant = rawRole.toLowerCase().includes("consultant");
    const userId = localStorage.getItem("userid");

    if (isConsultant && userId) {
      consultant_id = userId; // Set global var used by filter
      this.setState({ filter: true });
    }

    await axios
      .get(global.config.server_url + "/documents", Config)
      .then((response) => {
        let rowData = response.data;
        // Sort by created_at descending (recent to oldest)
        if (rowData && Array.isArray(rowData)) {
          rowData.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          );
        }
        this.setState({ rowData }, () => {
          // Apply filter immediately after data load if consultant
          if (this.gridApi && isConsultant) {
            this.gridApi.onFilterChanged();
          }
        });
      });
  }

  isExternalFilterPresent = () => {
    // Always true if consultant (enforced in didMount) or if toggled
    if (consultant_id !== -1) {
      return true;
    }
    return false;
  };

  externalFilterChanged = (newValue) => {
    consultant_id = newValue;
    this.setState({ filter: !this.state.filter });
    this.gridApi.onFilterChanged();
  };

  doesExternalFilterPass = (node) => {
    // Si pas de filter ID set, on laisse tout passer (sauf si logique 'consultant_id !== -1' gère ça)
    if (consultant_id === -1) return true;

    // ✅ Logique Robuste (identique à ClientsList)
    // On vérifie si LE CONSULTANT (consultant_id) est lié au client du contrat
    // via parent_id, technician_id, owner_id...

    const user = node?.data?.user;
    if (!user) {
      // Fallback: check contract creator if user is missing?
      // Or hidden if no user linked?
      // Existing logic `node.data.creator_id === consultant_id` suggesting contract owner check.
      // Let's keep it safe:
      return String(node.data.creator_id) === String(consultant_id);
    }

    const target = String(consultant_id);
    const candidates = [
      user.parent_id,
      user.parent?.id,
      user.technician_id,
      user.owner_id,
      user.created_by_id,
      user.business_introducer_id, // Maybe include for Admin/All roles?
      // Note: original code had specific check for business_introducer_id for admin.
      // But here we are filtering by "consultant_id" which is the current user.
    ];

    return candidates.some(
      (v) => v !== undefined && v !== null && String(v) === target,
    );
  };

  // ... (Methods between) ...

  // In render(), hiding the buttons:
  // ... inside <div className="filter-actions ...">
  // We need to verify if we are consultant to HIDE buttons.

  // ...

  onBtExport = () => {
    this.gridApi.exportDataAsCsv();
  };

  onGridReady = (params) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
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

  refreshCard = () => {
    this.setState({ reload: true });
    setTimeout(() => {
      this.setState({
        reload: false,
        selectStatus: "All",
        verified: "All",
        department: "All",
      });
    }, 500);
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

  onEntered = () => {
    this.setState({ status: "Opened" });
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
  /* eslint-disable */
  async deleteDoc(id) {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // Try to delete associated suivi first
    if (this.state.rowData) {
      const contract = this.state.rowData.find((c) => c.id === id);
      if (contract && contract.user_id) {
        try {
          const res = await axios.get(
            global.config.server_url +
              "/suivi-avancement/client/" +
              contract.user_id,
            Config,
          );
          if (res.data && Array.isArray(res.data)) {
            const suivi = res.data.find((s) => s.facture_id === id);
            if (suivi) {
              await axios.delete(
                global.config.server_url + "/suivi-avancement/" + suivi.id,
                Config,
              );
            }
          }
        } catch (e) {
          console.warn("Could not delete associated suivi", e);
        }
      }
    }

    axios
      .delete(global.config.server_url + "/documents/" + id, Config)
      .then((response) => {});
  }

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value });
    if (id !== 0) this.setState({ IdToDelete: id });
    if (state === "confirmAlert" && value === true) {
      this.deleteDoc(this.state.IdToDelete);
      var SelectedData = this.gridApi.getSelectedRows();
      this.gridApi.updateRowData({ remove: SelectedData });
    }
  };

  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state;
    // Calculation of contracts late for payment
    let lateContracts = [];
    if (rowData) {
      lateContracts = rowData.filter((contract) => {
        // Filter by user permissions using the same logic as doesExternalFilterPass but adapted for data object
        let passFilter = true;
        if (this.isExternalFilterPresent()) {
          // Manually recreate the check
          const nodeMock = { data: contract };
          passFilter = this.doesExternalFilterPass(nodeMock);
        }

        if (!passFilter) return false;

        const isTerminated = contract.document_state === "Terminé";
        const isNotFullyPaid = contract.status_payment < 2;

        return isTerminated && isNotFullyPaid;
      });
    }

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

        {lateContracts.length > 0 && (
          <Row>
            <Col sm="12">
              <Card className="bg-transparent border-danger">
                <CardBody>
                  <div className="d-flex align-items-center mb-1 text-danger">
                    <AlertTriangle className="mr-50" size={20} />
                    <h4 className="mb-0 text-danger">
                      Contrats impayés ({lateContracts.length})
                    </h4>
                  </div>
                  <Table responsive hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Contrat</th>
                        <th>Prestation</th>
                        <th>Date de modification</th>
                        <th>Acompte</th>
                        <th>Solde</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lateContracts.map((contract) => {
                        const {
                          totalPaid,
                          totalRemaining,
                          isFullyPaid,
                          amountAcompte,
                        } = this.calculateContractFinances(contract);
                        const isAcompteProblem = totalPaid < amountAcompte;

                        // Parse services logic (copied from columnDefs)
                        let servicesRender = null;
                        if (contract.subscribe_services) {
                          const services = contract.subscribe_services
                            .replaceAll('"', "")
                            .trim()
                            .split("/");
                          servicesRender = services.map((service, index) => {
                            if (service && service.trim() !== "") {
                              return (
                                <Chip
                                  className="m-0 text-center ml-1"
                                  key={index}
                                  color={chipColors[service.trim()]}
                                  text={service}
                                />
                              );
                            }
                            return null;
                          });
                        }

                        return (
                          <tr
                            key={contract.id}
                            className="cursor-pointer"
                            onClick={() =>
                              history.push("/pages/contract/" + contract.id)
                            }
                          >
                            <td>
                              {(contract.comment || "").replace(
                                /^(Contrat|Contract) de\s+/i,
                                "",
                              )}
                            </td>
                            <td>
                              <div className="d-flex flex-wrap">
                                {servicesRender}
                              </div>
                            </td>
                            <td>
                              <Moment
                                format="DD/MM/YYYY"
                                date={contract.updated_at}
                              />
                            </td>
                            <td
                              className={
                                isAcompteProblem
                                  ? "text-danger"
                                  : "text-success"
                              }
                            >
                              {totalPaid} €
                            </td>
                            <td className="text-danger">{totalRemaining} €</td>
                            <td>
                              <div className="actions cursor-pointer">
                                <Trash2
                                  size={15}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    this.handleAlert(
                                      "defaultAlert",
                                      true,
                                      contract.id,
                                    );
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}

        <Row className="app-user-list" style={{ height: "100vh" }}>
          <Col sm="12" className="h-100 d-flex flex-column">
            <Card className="h-100 d-flex flex-column">
              <CardBody
                className="h-100 d-flex flex-column"
                style={{ paddingBottom: "0.5rem" }}
              >
                <div className="ag-grid-actions d-flex justify-content-between align-items-center flex-wrap mb-1">
                  <div className="filter-actions d-flex flex-nowrap align-items-center w-100">
                    <Input
                      className="mr-1 mb-1"
                      style={{ maxWidth: "300px" }}
                      type="text"
                      placeholder="Rechercher..."
                      onChange={(e) => this.updateSearchQuery(e.target.value)}
                      value={this.state.searchVal}
                    />
                    {/* BOUTONS FILTRE : Cachés pour les consultants (filtre forcé) */}
                    {!(localStorage.getItem("role") || "")
                      .toLowerCase()
                      .includes("consultant") && (
                      <>
                        {consultant_id !== -1 && this.state.filter === true && (
                          <Button
                            className="mb-1"
                            style={{ height: 38, whiteSpace: "nowrap" }}
                            outline
                            color="primary"
                            onClick={() => this.externalFilterChanged(-1)}
                          >
                            Tous les contrats
                          </Button>
                        )}
                        {consultant_id === -1 &&
                          this.state.filter === false && (
                            <Button
                              className="mb-1"
                              style={{ height: 38, whiteSpace: "nowrap" }}
                              outline
                              color="primary"
                              onClick={() =>
                                this.externalFilterChanged(
                                  localStorage.getItem("userid"),
                                )
                              }
                            >
                              Mes contrats
                            </Button>
                          )}
                      </>
                    )}
                  </div>
                </div>
                {this.state.rowData !== null ? (
                  <ContextLayout.Consumer>
                    {(context) => (
                      <div
                        className="ag-theme-material ag-grid-table flex-grow-1 contracts-row-cards"
                        style={{ width: "100%", minHeight: 0 }}
                      >
                        <AgGridReact
                          gridOptions={{}}
                          rowSelection="multiple"
                          doesExternalFilterPass={this.doesExternalFilterPass}
                          isExternalFilterPresent={this.isExternalFilterPresent}
                          defaultColDef={defaultColDef}
                          columnDefs={columnDefs}
                          rowData={rowData}
                          onGridReady={this.onGridReady}
                          colResizeDefault={"shift"}
                          animateRows={true}
                          floatingFilter={false}
                          pagination={true}
                          pivotPanelShow="always"
                          paginationPageSize={pageSize}
                          resizable={true}
                          enableRtl={context.state.direction === "rtl"}
                          getRowClass={(params) => {
                            const { isFullyPaid } =
                              this.calculateContractFinances(params.data);
                            const state = (
                              params.data.document_state || ""
                            ).toLowerCase();

                            // PRIORITÉ 1: Terminé + payé à 100% = VERT
                            if (state.startsWith("termin") && isFullyPaid) {
                              return "row-stripe-success"; // Vert - Terminé et payé
                            }

                            // PRIORITÉ 2: Terminé + impayé = ROUGE OBLIGATOIRE
                            if (state.startsWith("termin") && !isFullyPaid) {
                              return "row-stripe-danger"; // Rouge - Terminé mais impayé
                            }

                            // PRIORITÉ 3: Autres états (En cours, En attente) = BLANC
                            // Même si payé partiellement, ils restent blancs
                            return ""; // Normal/Blanc
                          }}
                        />
                      </div>
                    )}
                  </ContextLayout.Consumer>
                ) : null}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}
export default AllContracts;
