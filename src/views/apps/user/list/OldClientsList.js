
import React from "react"
import { Download } from "react-feather"
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  UncontrolledDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Collapse,
  Spinner
} from "reactstrap"
import axios from "axios"
import { ContextLayout } from "../../../../utility/context/Layout"
import { AgGridReact } from "ag-grid-react"
import {
  ChevronDown,
} from "react-feather"
import classnames from "classnames"
import { history } from "../../../../history"
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../../assets/scss/pages/users.scss"
import SweetAlert from "react-bootstrap-sweetalert";
import { toast } from "react-toastify";

class OldClientsList extends React.Component {
  onCopy = (information) => {
    this.setState({ copied: true })
    navigator.clipboard.writeText(information)
    toast.success("Copier dans le presse papier", {
      position: toast.POSITION.TOP_CENTER,
      autoClose: 2000
    })
  }

  onCopyName = (nom, prenom) => {
    var info = prenom + " " + nom
    this.setState({ copied: true })
    navigator.clipboard.writeText(info)
    toast.success("Copier dans le presse papier", {
      position: toast.POSITION.TOP_CENTER,
      autoClose: 2000
    })
  }

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
    copied: false,
    value: "",
    status: "Opened",
    role: "All",
    selectStatus: "All",
    verified: "All",
    department: "All",
    defaultColDef: {
      resizable: true,
      sortable: true
    },
    searchVal: "",
    columnDefs: [
      {
        headerName: "Nom",
        field: "cl_nom",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopyName(rowData.data.cl_nom, rowData.data.cl_prenom)}
            ><span>{rowData.data.cl_nom}</span></div>
          )
        }
      },
      {
        headerName: "Prénom",
        field: "cl_prenom",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopyName(rowData.data.cl_nom, rowData.data.cl_prenom)}
            ><span>{rowData.data.cl_prenom}</span></div>
          )
        }
      },
      {
        headerName: "Expert",
        field: "expert_name",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
            ><span>{rowData.data.expert_name}</span></div>
          )
        }
      },
      {
        headerName: "civilité",
        field: "cl_civilite",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
            ><span>{rowData.data.cl_civilite}</span></div>
          )
        }
      },
      {
        headerName: "Date de naissance",
        field: "cl_ne_le",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopy(rowData.data.cl_ne_le)}
            ><span>{rowData.data.cl_ne_le}</span></div>
          )
        }
      },
      {
        headerName: "N° de téléphone",
        field: "cl_tel_port",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopy(rowData.data.cl_tel_port)}
            ><span>{rowData.data.cl_tel_port}</span></div>
          )
        }
      },
      {
        headerName: "Adresse",
        field: "cl_adr",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopy(rowData.data.cl_adr)}
            ><span>{rowData.data.cl_adr}</span></div>
          )
        }
      },
      {
        headerName: "Ville",
        field: "cl_ville",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopy(rowData.data.cl_ville)}
            ><span>{rowData.data.cl_ville}</span></div>
          )
        }
      },
      {
        headerName: "Code postal",
        field: "cl_cp",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => this.onCopy(rowData.data.cl_cp)}
            ><span>{rowData.data.cl_cp}</span></div>
          )
        }
      },
      {
        headerName: "Email",
        field: "cl_mail",
        filter: true,
        width: 200,
        cellRendererFramework: rowData => {
          var email = rowData.data.cl_mail;
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => window.location.href = "mailto:" + email + "?subject=Subject&body=message%20goes%20here"}
            ><span>{rowData.data.cl_mail}</span></div>
          )
        }
      },
      {
        headerName: "Date de Création",
        field: "cl_date",
        filter: true,
        width: 200,
      },
    ]
  }

  createContract(id, name) {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.post(global.config.server_url + "/documents", {
      name: "abc",
      link_to_documents: "N/a",
      type: "contrat",
      document_state: "Pending...",
      date: "2010-10-10",
      comment: "Contrat de " + name,
      advanced_payment: "0",
      user_id: id
    }, Config)
      .then(function (result) {
        history.push("/app/contract/handleServices/" + result.data.id)
      })
      .catch(function (error) {
        toast.error("API injoignable" + error)
      })
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.get(global.config.server_url + "/users?kind=oldclient", Config).then(response => {
      let rowData = response.data.data
      this.setState({ rowData })
    })
  }
  onBtExport = () => {
    this.gridApi.exportDataAsCsv();
  };
  deleteUser(id) {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") }
    }
    axios.delete(global.config.server_url + "/users/" + id, Config).then(response => {
      var SelectedData = this.gridApi.getSelectedRows();
      this.gridApi.updateRowData({ remove: SelectedData })
    })
  }
  onGridReady = params => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
    this.gridApi.setDomLayout("autoHeight");
  }
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
  }
  filterSize = val => {
    if (this.gridApi) {
      this.gridApi.paginationSetPageSize(Number(val))
      this.setState({
        pageSize: val
      })
    }
  }
  updateSearchQuery = val => {
    this.gridApi.setQuickFilter(val)
    this.setState({
      searchVal: val
    })
  }
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
  handleAlert = (state, value, id) => {
    this.setState({ [state]: value })
    if (id !== 0)
      this.setState({ IdToDelete: id })
    if (state === "confirmAlert" && value === true) {
      this.deleteUser(this.state.IdToDelete)
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
            <Card
              className={classnames("card-action card-reload", {
                "d-none": this.state.isVisible === false,
                "card-collapsed": this.state.status === "Closed",
                closing: this.state.status === "Closing...",
                opening: this.state.status === "Opening...",
                refreshing: this.state.reload
              })}
            >
              <CardHeader>
                <CardTitle>
                  Cette page permet de recenser les clients provenant de l'ancien site Optionretraite.net
                </CardTitle>
              </CardHeader>
              <Collapse
                isOpen={this.state.collapse}
                onExited={this.onExited}
                onEntered={this.onEntered}
                onExiting={this.onExiting}
                onEntering={this.onEntering}
              >
                <CardBody>
                  {this.state.reload ? (
                    <Spinner color="primary" className="reload-spinner" />
                  ) : (
                    ""
                  )}
                  <Row>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="role">Role</Label>
                        <Input
                          type="select"
                          name="role"
                          id="role"
                          value={this.state.role}
                          onChange={e => {
                            this.setState(
                              {
                                role: e.target.value
                              },
                              () =>
                                this.filterData(
                                  "role",
                                  this.state.role.toLowerCase()
                                )
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="User">User</option>
                          <option value="Staff">Staff</option>
                          <option value="Admin">Admin</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="status">Status</Label>
                        <Input
                          type="select"
                          name="status"
                          id="status"
                          value={this.state.selectStatus}
                          onChange={e => {
                            this.setState(
                              {
                                selectStatus: e.target.value
                              },
                              () =>
                                this.filterData(
                                  "status",
                                  this.state.selectStatus.toLowerCase()
                                )
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="Active">Active</option>
                          <option value="Blocked">Blocked</option>
                          <option value="Deactivated">Deactivated</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="verified">Verified</Label>
                        <Input
                          type="select"
                          name="verified"
                          id="verified"
                          value={this.state.verified}
                          onChange={e => {
                            this.setState(
                              {
                                verified: e.target.value
                              },
                              () =>
                                this.filterData(
                                  "is_verified",
                                  this.state.verified.toLowerCase()
                                )
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="department">Department</Label>
                        <Input
                          type="select"
                          name="department"
                          id="department"
                          value={this.state.department}
                          onChange={e => {
                            this.setState(
                              {
                                department: e.target.value
                              },
                              () =>
                                this.filterData(
                                  "department",
                                  this.state.department.toLowerCase()
                                )
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="Sales">Sales</option>
                          <option value="Development">Development</option>
                          <option value="Management">Management</option>
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Collapse>
            </Card>
          </Col>
          <Col sm="12">
            <Card style={{ minHeight: '3000px' }}>
              <CardBody>
                <div className="ag-theme-material ag-grid-table">
                  <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                    <div className="sort-dropdown">
                      <UncontrolledDropdown className="ag-dropdown p-1">
                        <DropdownToggle tag="div">
                          1 - {pageSize} of 150
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
                      <div className="dropdown mb-1 d-inline-block">
                        <Button className="mb-2" outline color="primary" onClick={() => this.onBtExport()}>
                          <Download className="primary" size={15} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {this.state.rowData !== null ? (
                    <ContextLayout.Consumer>
                      {context => (
                        <AgGridReact
                          height={'autoHeight'}
                          gridOptions={{}}
                          rowSelection="multiple"
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
                          enableRangeSelection={true}
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
    )
  }
}

export default OldClientsList
