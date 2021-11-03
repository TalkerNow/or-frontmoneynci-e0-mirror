/* eslint-disable */

import React from "react"
import {
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Button,
  Card,
  CardHeader,
  Collapse,
  CardBody, Spinner, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, UncontrolledButtonDropdown
} from "reactstrap"
import {
  Edit, Trash2, ChevronDown, RotateCw, X, Home, FolderPlus
} from "react-feather"
import {history} from "../../../../history";
import axios from "axios";
import classnames from "classnames";
import {ContextLayout} from "../../../../utility/context/Layout";
import {AgGridReact} from "ag-grid-react";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../../assets/scss/pages/users.scss"
import Moment from "react-moment";
import SweetAlert from "react-bootstrap-sweetalert";

class Contracts extends React.Component {
  state = {
    defaultAlert : false,
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
      sortable: true
    },
    searchVal: "",
    columnDefs: [
      {
        headerName: "ID",
        field: "id",
        width: 150,
        filter: true,
        checkboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        headerCheckboxSelection: true
      },
      {
        headerName: "Commentaire",
        field: "comment",
        filter: true,
        width: 500,
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
        headerName: "Montant",
        field: "advanced_payment",
        filter: true,
        width: 200,
        cellRendererFramework: params => {
          return (
              <div
                  className="d-flex align-items-center cursor-pointer"
                  //onClick={() => history.push("/app/user/edit/" + params.data.id)}
              >
                <span>{params.data.advanced_payment + " €"}</span>
              </div>
          )
        }
      },
      {
        headerName: "Etat",
        field: "document_state",
        filter: true,
        width: 200,
        cellRendererFramework: params => {
          return (
              <div
                  className="d-flex align-items-center cursor-pointer"
                  //onClick={() => history.push("/app/user/edit/" + params.data.id)}
              >
                <span>{params.data.user.status}</span>
              </div>
          )
        }
      },
      {
        headerName: "Date de Création",
        field: "date",
        filter: true,
        width: 300,
        cellRendererFramework: params => {
          return (
              <div>
                <Moment format="DD-MM-YYYY HH:mm" date={params.data.created_at} utc/>
              </div>
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
                    onClick={() => {
                      this.handleDeleteAlert("defaultValue",true, params.data.id)
                    }}
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
    await axios.get(global.config.server_url + "/documents/user/" + this.props.id, Config).then(response => {
      let rowData = response.data
      this.setState({ rowData })
    })
  }

  deleteDoc(id){
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.delete(global.config.server_url + "/documents/" + id, Config).then(response => {})
  }

  onGridReady = params => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
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
  handleDeleteAlert = (status, value, id) => {
    this.setState({defaultAlert: value});
    if (id != 0)
      this.setState({IdToDelete: id})
    if(value == false && status == "confirm"){
      this.deleteDoc(this.state.IdToDelete);
      var SelectedData = this.gridApi.getSelectedRows();
      this.gridApi.updateRowData({remove: SelectedData})
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
                        this.handleDeleteAlert("confirm", false, 0)
                      }}
                      onCancel={() => {
                        this.handleDeleteAlert("cancel", false, 0)
                      }}
          >
            Vous ne pourrez pas revenir en arrière
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
                  <h4>Contrats</h4>
                  <div className="actions">
                    <ChevronDown
                        className="collapse-icon mr-50"
                        size={15}
                        onClick={this.toggleCollapse}
                    />
                    <RotateCw
                        className="mr-50"
                        size={15}
                        onClick={() => {
                          this.refreshCard()
                          this.gridApi.setFilterModel(null)
                        }}
                    />
                    <X size={15} onClick={this.removeCard} />
                  </div>
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
              <Card>
                <CardBody>
                  <div className="ag-theme-material ag-grid-table">
                    <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                      <div className="filter-actions d-flex">
                        <div>
                          <Button.Ripple className="mr-1 mb-1" outline color="primary"
                                         style={{}}
                                         onClick={() => history.push("/pages/create-contract/" + this.props.id)}>
                            <FolderPlus size={15} /> contrat
                          </Button.Ripple>
                        </div>
                        <div className="dropdown mr-1 mb-1 d-inline-block">
                          <UncontrolledButtonDropdown>
                            <DropdownToggle color="primary" caret>
                              Actions
                              <ChevronDown size={15} />
                            </DropdownToggle>
                            <DropdownMenu right>
                              <DropdownItem tag="a">
                                <Home size={15} />
                                <span className="align-middle ml-50">Exemple d'action</span>
                              </DropdownItem>
                            </DropdownMenu>
                          </UncontrolledButtonDropdown>
                        </div>
                      </div>
                    </div>
                    {this.state.rowData !== null ? (
                        <ContextLayout.Consumer>
                          {context => (
                              <AgGridReact
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
export default Contracts
/* eslint-disable */

