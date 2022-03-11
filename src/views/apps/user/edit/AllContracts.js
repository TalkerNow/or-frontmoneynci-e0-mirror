import React from "react"
import {
  Input,
  Row,
  Col,
  Button,
  Card,
  CardBody, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
} from "reactstrap"
import {
  Trash2, ChevronDown, Download,
} from "react-feather"
import { history } from "../../../../history";
import axios from "axios";
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../../assets/scss/pages/users.scss"
import Moment from "react-moment";
import SweetAlert from "react-bootstrap-sweetalert";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent"

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: 'primary',
  RAC: 'warning'
}
var consultant_id = -1;

class AllContracts extends React.Component {
  state = {
    filter: false,
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
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },

    searchVal: "",
    columnDefs: [
      {
        headerName: "contrat",
        field: "comment",
        width: 300,
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => history.push("/pages/contract/" + params.data.id)}
            >
              <span>{params.data.comment}</span>
            </div>
          )
        }
      },
      {
        headerName: "creator_id",
        field: "creator_id",
        width: 150,
        hide: true,
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
            >
              <span>{params.data.creator_id}</span>
            </div>
          )
        }
      },
      {
        headerName: "Prestation",
        field: "subscribe_services",
        width: 220,
        cellRendererFramework: params => {
          return (
            <>
              {(() => {
                let subscribe_service = params.data.subscribe_services;
                if (subscribe_service === null || subscribe_service === "") {
                  return <div></div>;
                } else {
                  let lst_subscribe_services = subscribe_service.replaceAll('"', '').trim().split('/');
                  const tags = [];
                  lst_subscribe_services.forEach(function (service) {
                    if (service !== '') {
                      tags.push(<Chip
                        className="m-0 text-center ml-1"
                        key={service}
                        color={chipColors[service.trim()]}
                        text={service}
                      />);
                    }
                  })
                  return tags;
                }
              })()}
            </>
          )
        }
      },
      {
        headerName: "Montant",
        field: "advanced_payment",
        width: 150,
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
            >
              <span>{params.data.advanced_payment + " €"}</span>
            </div>
          )
        }
      },
      {
        headerName: "Acompte",
        field: "pre_payment",
        width: 150,
        cellRendererFramework: params => {
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment >= 1) {
            return (
              <div
                className="d-flex align-items-center cursor-pointer text-success"
              >
                <span>{params.data.pre_payment + " €"}</span>
              </div>
            )
          } else if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment < 1) {
            return (
              <div
                className="d-flex align-items-center cursor-pointer text-danger"
              >
                <span>{params.data.pre_payment + " €"}</span>
              </div>
            )
          } else {
            return (
              <div
                className="d-flex align-items-center cursor-pointer"
              >
                <span>{params.data.pre_payment + " €"}</span>
              </div>
            )
          }
        }
      },
      {
        headerName: "solde",
        field: "end_payment",
        width: 150,
        cellRendererFramework: params => {
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment === 2) {
            return (
              <div
                className="d-flex align-items-center cursor-pointer text-success"
              >
                <span>{params.data.end_payment + " €"}</span>
              </div>
            )
          } else if (params.data.document_state === "Termine" && params.data.status_payment < 2) {
            return (
              <div
                className="d-flex align-items-center cursor-pointer text-danger"
              >
                <span>{params.data.end_payment + " €"}</span>
              </div>
            )
          } else {
            return (
              <div
                className="d-flex align-items-center cursor-pointer"
              >
                <span>{params.data.end_payment + " €"}</span>
              </div>
            )
          }
        }
      },
      {
        headerName: "Etat",
        field: "document_state",
        width: 170,
        cellRendererFramework: params => {
          return (
            params.data.user &&
            <div
              className="d-flex align-items-center cursor-pointer"
            >
              <span>{params.data.document_state}</span>
            </div>
          )
        }
      },
      {
        headerName: "Date de Création",
        field: "created_at",
        width: 200,
        cellRendererFramework: params => {
          return (
            <div>
              <Moment format="DD-MM-YYYY HH:mm" date={params.data.created_at} utc />
            </div>
          )
        }
      },
      {
        headerName: "Date de Modification",
        field: "updated_at",
        width: 200,
        sort: 'desc',
        cellRendererFramework: params => {
          return (
            <div>
              <Moment format="DD-MM-YYYY HH:mm" date={params.data.updated_at} utc />
            </div>
          )
        }
      },
      {
        headerName: "Date acompte",
        field: "deposit_date",
        width: 200,
        cellRendererFramework: params => {
          if (params.data.deposit_date !== null) {
            return (
              <div>
                <Moment format="DD-MM-YYYY" date={params.data.deposit_date} utc />
              </div>
            )
          } else
            return (
              <div></div>
            )
        }
      },
      {
        headerName: "Date solde",
        field: "sold_date",
        width: 200,
        cellRendererFramework: params => {
          if (params.data.sold_date !== null) {
            return (
              <div>
                <Moment format="DD-MM-YYYY" date={params.data.sold_date} utc />
              </div>
            )
          } else
            return (
              <div></div>
            )
        }
      },
      {
        headerName: "Actions",
        field: "transactions",
        width: 150,
        cellRendererFramework: params => {
          return (
            <div className="actions cursor-pointer">
              <Trash2
                size={15}
                onClick={() => { this.handleAlert("defaultAlert", true, params.data.id) }}
              />
            </div>
          )
        }
      }
    ]
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.get(global.config.server_url + "/documents", Config).then(response => {
      let rowData = response.data
      this.setState({ rowData })
    })
  }

  isExternalFilterPresent = () => {
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
    return node.data.creator_id === consultant_id;
  };

  deleteDoc(id) {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.delete(global.config.server_url + "/documents/" + id, Config).then(response => { })
  };

  onBtExport = () => {
    this.gridApi.exportDataAsCsv();
  };

  onGridReady = params => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
  };

  filterData = (column, val) => {
    var filter = this.gridApi.getFilterInstance(column)
    var modelObj = null
    if (val !== "all") {
      modelObj = {
        type: "equals",
        filter: val
      }
    }
    filter.setModel(modelObj)
    this.gridApi.onFilterChanged()
  };

  filterSize = val => {
    if (this.gridApi) {
      this.gridApi.paginationSetPageSize(Number(val))
      this.setState({
        pageSize: val
      })
    }
  };

  updateSearchQuery = val => {
    this.gridApi.setQuickFilter(val)
    this.setState({
      searchVal: val
    })
  };


  refreshCard = () => {
    this.setState({ reload: true })
    setTimeout(() => {
      this.setState({
        reload: false,
        role: "All",
        selectStatus: "All",
        verified: "All",
        department: "All"
      })
    }, 500)
  }

  toggleCollapse = () => {
    this.setState(state => ({ collapse: !state.collapse }))
  }
  onEntered = () => {
    this.setState({ status: "Opened" })
  }
  onEntering = () => {
    this.setState({ status: "Opening..." })
  }

  onEntered = () => {
    this.setState({ status: "Opened" })
  }
  onExiting = () => {
    this.setState({ status: "Closing..." })
  }
  onExited = () => {
    this.setState({ status: "Closed" })
  }
  removeCard = () => {
    this.setState({ isVisible: false })
  }
  /* eslint-disable */
  deleteDoc(id) {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.delete(global.config.server_url + "/documents/" + id, Config).then(response => { })
  }

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value })
    if (id !== 0)
      this.setState({ IdToDelete: id })
    if (state === "confirmAlert" && value === true) {
      this.deleteDoc(this.state.IdToDelete)
      var SelectedData = this.gridApi.getSelectedRows();
      this.gridApi.updateRowData({ remove: SelectedData })
    }
  }

  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state
    return (
      <div>
        <SweetAlert title="Êtes vous sûrs?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          cancelBtnBsStyle="danger"
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
          onConfirm={() => {
            this.handleAlert("basicAlert", false, 0)
            this.handleAlert("confirmAlert", true, 0)
          }}
          onCancel={() => {
            this.handleAlert("basicAlert", false, 0)
            this.handleAlert("cancelAlert", true, 0)
          }}
        >
          Vous ne pourrez pas revenir en arrière
        </SweetAlert>

        <SweetAlert success title="Supprimé!"
          confirmBtnBsStyle="success"
          show={this.state.confirmAlert}
          onConfirm={() => {
            this.handleAlert("defaultAlert", false, 0)
            this.handleAlert("confirmAlert", false, 0)
          }}
        >
          <p className="sweet-alert-text">Your file has been deleted.</p>
        </SweetAlert>

        <SweetAlert error title="Annulé!"
          confirmBtnBsStyle="success"
          show={this.state.cancelAlert}
          onConfirm={() => {
            this.handleAlert("defaultAlert", false, 0)
            this.handleAlert("cancelAlert", false, 0)
          }}
        >
          <p className="sweet-alert-text">
            L'action est annulé
          </p>
        </SweetAlert>
        <Row className="app-user-list">
          <Col sm="12">
            <Card>
              <CardBody>
                <div className="ag-theme-material ag-grid-table">
                  <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                    <div className="sort-dropdown">
                      <UncontrolledDropdown className="ag-dropdown p-1">
                        <DropdownToggle tag="div">
                          1 - {pageSize} of 150
                          <ChevronDown className="ml-50" size={15} />
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
                          <DropdownItem
                            tag="div"
                            onClick={() => this.filterSize(100)}
                          >
                            100
                          </DropdownItem>
                          <DropdownItem
                            tag="div"
                            onClick={() => this.filterSize(150)}
                          >
                            150
                          </DropdownItem>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </div>
                    <div className="filter-actions d-flex">
                      <Input
                        className="w-50 mr-1 mb-1 mb-sm-0"
                        type="text"
                        placeholder="search..."
                        onChange={e => this.updateSearchQuery(e.target.value)}
                        value={this.state.searchVal}
                      />
                      <div>
                        {(consultant_id !== -1 && this.state.filter === true) &&
                          <>
                            <Button className="mb-1" style={{ width: 180, height: 40 }} outline color="primary" onClick={() => this.externalFilterChanged(-1)}>
                              tous les contrats
                            </Button>
                          </>
                        }
                        {(consultant_id === -1 && this.state.filter === false) &&
                          <>
                            <Button className="mb-1" style={{ width: 170, height: 40 }} outline color="primary" onClick={() => this.externalFilterChanged(localStorage.getItem('userid'))}>
                              mes contrats
                            </Button>
                          </>
                        }
                      </div>
                      <Button className="mb-2 ml-1" outline color="primary" onClick={() => this.onBtExport()}>
                        <Download className="primary" size={12} />
                      </Button>
                    </div>
                  </div>
                  {this.state.rowData !== null ? (
                    <ContextLayout.Consumer>
                      {context => (
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
      </div >
    )
  }
}
export default AllContracts
