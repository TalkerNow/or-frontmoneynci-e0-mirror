import React from "react";
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
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import { Edit, Trash2, ChevronDown, UserPlus, Download } from "react-feather";

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
    defaultColDef: {
      resizable: true,
      sortable: true,
    },
    searchVal: "",
    columnDefs: [
      {
        headerName: "ID",
        field: "id",
        width: 160,
        filter: true,
        checkboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        headerCheckboxSelection: true,
      },
      {
        headerName: "Nom",
        field: "name",
        filter: true,
        width: 250,
        cellRendererFramework: (params) => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() =>
                history.push("/app/member/edit/" + params.data.id + "/1")
              }
            >
              <span>
                {params.data.first_name + " " + params.data.last_name}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Email",
        field: "email",
        filter: true,
        width: 300,
      },
      {
        headerName: "Date de Création",
        field: "created_at",
        filter: true,
        width: 200,
        cellRendererFramework: (params) => {
          return (
            <div>
              <Moment format="DD/MM/YYYY" date={params.data.created_at} utc />
            </div>
          );
        },
      },
      {
        headerName: "Role",
        field: "role",
        filter: true,
        width: 250,
      },
      {
        headerName: "Actions",
        field: "transactions",
        width: 150,
        cellRendererFramework: (params) => {
          return (
            <div className="actions cursor-pointer">
              <Edit
                className="mr-50"
                size={15}
                onClick={() =>
                  history.push("/app/member/edit/" + params.data.id + "/1")
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

  createContract(id, name) {
    console.log(name);
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

    await axios
      .get(global.config.server_url + "/users?kind=member", Config)
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData });
      });
  }
  onBtExport = () => {
    this.gridApi.exportDataAsCsv();
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
    // Normal layout; grid scrolls inside container
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
        role: "All",
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
        <Row className="app-user-list">
          <Col sm="12">
            <Card style={{ minHeight: "75vh" }}>
              <CardBody>
                <div className="ag-theme-material ag-grid-table" style={{ height: "68vh" }}>
                  <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                    <div className="sort-dropdown">
                      <UncontrolledDropdown className="ag-dropdown p-1">
                        <DropdownToggle tag="div">
                          1 - {pageSize} sur 150
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
                        placeholder="Search..."
                        onChange={(e) => this.updateSearchQuery(e.target.value)}
                        value={this.state.searchVal}
                      />
                      <div>
                        <Button.Ripple
                          className="mr-1 mb-1"
                          outline
                          color="primary"
                          onClick={() => history.push("/app/member/createUser")}
                        >
                          <UserPlus size={15} />
                        </Button.Ripple>
                      </div>
                      <div className="dropdown mr-1 mb-1 d-inline-block">
                        <Button
                          className="mb-2"
                          outline
                          color="primary"
                          onClick={() => this.onBtExport()}
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
    );
  }
}

export default MembersList;
