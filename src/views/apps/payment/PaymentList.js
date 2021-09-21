/* eslint-disable */

import React from "react"
import {Button} from "reactstrap"
import {
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
  UncontrolledButtonDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Collapse,
  Spinner
} from "reactstrap"
import axios from "axios"
import Chip from "../../../../src/components/@vuexy/chips/ChipComponent"
import { ContextLayout } from "../../../utility/context/Layout"
import { AgGridReact } from "ag-grid-react"
import {
  Edit,
  Trash2,
  ChevronDown,
  RotateCw,
  X, UserPlus, PlusSquare, Home, FolderPlus
} from "react-feather"
import classnames from "classnames"
import { history } from "../../../history"
import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../assets/scss/pages/users.scss"
import SweetAlert from "react-bootstrap-sweetalert";
import Moment from "react-moment";
import {toast} from "react-toastify";
import swal from 'sweetalert';
import {default as NumberFormat} from "react-number-format";
const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: 'primary',
  RAC: 'warning'
}
const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token")
  }
}
class PaymentList extends React.Component {
  state = {
    defaultAlert : false,
    confirmAlert : false,
    cancelAlert : false,
    IdToDelete: 0,
    rowData: null,
    pageSize: 50,
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
        width: 120,
        filter: true,
        checkboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        headerCheckboxSelection: true
      },
      {
        headerName: "Nom",
        field: "name",
        filter: true,
        width: 250,
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => history.push("/app/user/edit/" + params.data.id + "/1")}
            >
              <span>{params.data.name}</span>
            </div>
          )
        }
      },
      {
        headerName: "Technicien Nom",
        field: "technician_name",
        filter: true,
        width: 250,
        cellRendererFramework: params => {
          return (
              <div
                  className="d-flex align-items-center cursor-pointer"
              >
                <span>{params.data.parent.name}</span>
              </div>
          )
        }
      },
      {
        headerName: "Email",
        field: "email",
        filter: true,
        width: 230
      },
      {
        headerName: "Date de Création",
        field: "created_at",
        filter: true,
        width: 200,
        cellRendererFramework: params => {
          return (
              <div>
                <Moment format="DD-MM-YYYY" date={params.data.status_update_date} utc/>
              </div>
          )
        }
      },
      {
        headerName: "Statut",
        field: "status",
        filter: true,
        width: 130,
      },
      {
        headerName: "FA",
        field: "status_fa",
        filter: true,
        width: 130,
        cellRendererFramework: params => {
          return (
            <>
              <NumberFormat value={params.data.payment_amount} displayType={'text'} thousandSeparator={true} prefix={'€'} />
            </>
          )
        }
      },
    ]
  }

  async componentDidMount() {
    await axios.get(global.config.server_url + "/get_payment_list", Config).then(response => {
      let rowData = response.data.payment_list;
      this.setState({ rowData })
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
      this.setState({ [state] : value })
      if (id != 0)
          this.setState({ IdToDelete : id })
      if (state === "confirmAlert" && value === true) {
          this.deleteUser(this.state.IdToDelete)
      }
  }
  onChangeYear(year){

    axios.get(global.config.server_url + "/get_payment_list?year="+year, Config).then(response => {
      let rowData = response.data.payment_list;
      this.setState({ rowData })
    })
  }
  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state
    return (
    <div>
      <Row className="app-user-list">
        <Col sm="12">
          <Card style={{minHeight:'3000px'}}>
            <CardBody>
              <div className="ag-theme-material ag-grid-table">
                <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                  <div className="sort-dropdown">
                    <div style={{display:'inline-block'}}>
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
                    <div style={{display:'inline-block',marginLeft:'30px'}}>
                      <Input type="select" name="select" id="role" defaultValue={2021} style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                             onChange={e => this.onChangeYear(e.target.value)}>
                        <option>2018</option><option>2019</option><option>2020</option>
                        <option>2021</option><option>2022</option><option>2023</option>
                        <option>2024</option><option>2025</option><option>2026</option>
                        <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                      </Input>
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

export default PaymentList
/* eslint-disable */

