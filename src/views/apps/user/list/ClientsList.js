import React from "react"
import { Download } from "react-feather"
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
} from "reactstrap"
import axios from "axios"
import { ContextLayout } from "../../../../utility/context/Layout"
import { AgGridReact } from "ag-grid-react"
import {
  Edit,
  Trash2,
  ChevronDown,
  UserPlus,
} from "react-feather"
import { history } from "../../../../history"
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../../assets/scss/pages/users.scss"
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
      sortable: true
    },
    searchVal: "",
    columnDefs: [
      {
        headerName: "Nom",
        filter: true,
        width: 250,
        // valueGetter: params => {
        //   return params.data.personal_informations.last_name;
        // }
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => history.push("/app/member/edit/" + params.data.id + "/1")}
            >
              <span>{params.data.personal_informations.last_name}</span>
            </div>
          )
        }
      },
      {
        headerName: "Prenom",
        filter: true,
        width: 250,
        // valueGetter: params => {
        //   return params.data.personal_informations.first_name;
        // }
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => history.push("/app/member/edit/" + params.data.id + "/1")}
            >
              <span>{params.data.personal_informations.first_name}</span>
            </div>
          )
        }
      },
      {
        headerName: "Civilité",
        filter: true,
        width: 250,
        valueGetter: params => {
          return params.data.personal_informations.civility;
        },
      },
      {
        field: "parent_id",
        filter: true,
        hide: true,
      },
      {
        headerName: "Technicien Nom",
        filter: false,
        width: 250,
        valueGetter: params => {
          return params.data.parent ? params.data.parent.name : '';
        }
      },
      {
        headerName: "Email",
        field: "email",
        filter: true,
        width: 250,
        cellRendererFramework: rowData => {
          var email = rowData.data.email;
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => window.location.href = "mailto:" + email + "?subject=Subject&body=message%20goes%20here"}
            ><span>{rowData.data.email}</span></div>
          )
        }
      },
      {
        headerName: "Création",
        filter: true,
        width: 150,
        cellRendererFramework: params => {
          return (
            <div>
              <Moment format="DD-MM-YYYY HH:mm" date={params.data.created_at} utc />
            </div>
          )
        }
      },
      {
        headerName: "Actions",
        width: 150,
        cellRendererFramework: params => {
          return (
            <div className="actions cursor-pointer">
              <Edit
                className="mr-50"
                size={15}
                onClick={() => history.push("/app/user/edit/" + params.data.id + "/1")}
              />
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

    await axios.get(global.config.server_url + "/users?kind=client", Config).then(response => {
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
  onBtExport = () => {
    this.gridApi.exportDataAsCsv();
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
            <Card style={{ minHeight: '3000px' }}>
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
                        onChange={e => this.updateSearchQuery(e.target.value)}
                        value={this.state.searchVal}
                      />
                      <div>
                        {(consultant_id !== -1 && this.state.filter === true) &&
                          <>
                            <Button className="mr-1 mb-1" outline color="primary" onClick={() => this.externalFilterChanged(-1)}>
                              tous les clients
                            </Button>
                          </>
                        }
                        {(consultant_id === -1 && this.state.filter === false) &&
                          <>
                            <Button className="mr-1 mb-1" outline color="primary" onClick={() => this.externalFilterChanged(localStorage.getItem('userid'))}>
                              mes clients
                            </Button>
                          </>
                        }

                      </div>
                      <div>
                        <Button className="mr-1 mb-1" outline color="primary" onClick={() => history.push("/app/user/createUser")}>
                          <UserPlus size={15} />
                        </Button>
                      </div>
                      <div className="dropdown mr-1 mb-1 d-inline-block">
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
                          rowBuffer={10}
                          height={'autoHeight'}
                          gridOptions={{}}
                          // rowSelection="multiple"
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
    )
  }
}

export default ClientsList
