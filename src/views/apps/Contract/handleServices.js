import React from "react"
import {
    Card,
    CardBody,
    Button,
    UncontrolledDropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle
} from "reactstrap"
import { AgGridReact } from "ag-grid-react"
import { ContextLayout } from "../../../utility/context/Layout"
import { ChevronDown } from "react-feather"
import axios from "axios"

import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"

import Breadcrumbs from "../../../components/@vuexy/breadCrumbs/BreadCrumb"
import {history} from "../../../history";
import {toast} from "react-toastify";

class handleServices extends React.Component {
    state = {
        rowData: null,
        paginationPageSize: 20,
        currentPageSize: 50,
        getPageSize: "",
        defaultColDef: {
            sortable: true,
            editable: true,
            resizable: true,
            suppressMenu: true
        },
        columnDefs: [
            {
                headerName: "€ HT",
                field: "value",
                width: 150,
                filter: true,
                headerCheckboxSelectionFilteredOnly: true,
            },
            {
                headerName: "Nombre",
                field: "value1",
                width: 150,
                filter: true,
                headerCheckboxSelectionFilteredOnly: true,
            },
            {
                headerName: "Total HT",
                field: "total_ht",
                filter: true,
                width: 150
            },
            {
                headerName: "Nom de la prestation",
                field: "name",
                filter: true,
                checkboxSelection: true,
                headerCheckboxSelection: true,
                width: 400,
                pinned: window.innerWidth > 992 ? "left" : false
            },
            {
                headerName: "Total TTC",
                field: "total_ttc",
                filter: true,
                width: 150
            }
        ]
    }

    componentDidMount() {
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
        axios.get(global.config.server_url + "/documents/" + this.props.match.params.id, Config).then(response => {
            let rowData = response.data.services
            JSON.stringify(rowData)
            this.setState({ rowData })
        })
    }

    onCellEditingStopped = params => {
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
        axios.put(global.config.server_url + "/services/" + params.data.id,  {
            name: params.data.name,
            description: params.data.description,
            variable: params.data.variable,
            value: params.data.value,
            variable1: params.data.variable1,
            value1: params.data.value1,
            total_ht: params.data.total_ht,
            total_ttc: params.data.total_ttc,
            tva: params.data.tva,
            document_id: params.data.document_id,
            status: "unselected"
        }, Config)
            .then(function(result) {
                console.log(result)
            })
            .catch(function(error) {
                toast.error("API injoignable")
            })
    }

    onRowSelected = params => {
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
        axios.put(global.config.server_url + "/services/" + params.data.id,  {
            name: params.data.name,
            description: params.data.description,
            variable: params.data.variable,
            value: params.data.value,
            variable1: params.data.variable1,
            value1: params.data.value1,
            total_ht: params.data.total_ht,
            total_ttc: params.data.total_ttc,
            tva: params.data.tva,
            parent_id: 0,
            document_id: params.data.document_id,
            status: "selected"
        }, Config)
            .then(function(result) {
                console.log(result)
            })
            .catch(function(error) {
                toast.error("API injoignable")
            })
    }

    onGridReady = params => {
        this.gridApi = params.api
        this.gridColumnApi = params.columnApi
        this.setState({
            currenPageSize: this.gridApi.paginationGetCurrentPage() + 1,
            getPageSize: this.gridApi.paginationGetPageSize(),
            totalPages: this.gridApi.paginationGetTotalPages()
        })
    }

    updateSearchQuery = val => {
        this.gridApi.setQuickFilter(val)
    }

    filterSize = val => {
        if (this.gridApi) {
            this.gridApi.paginationSetPageSize(Number(val))
            this.setState({
                currenPageSize: val,
                getPageSize: val
            })
        }
    }

    render() {
        const { rowData, columnDefs, defaultColDef } = this.state
        return (
            <React.Fragment>
                <Breadcrumbs
                    breadCrumbTitle="Prestations"
                    breadCrumbParent="Prestations"
                    breadCrumbActive="Prestations"
                />
                <Card className="overflow-hidden agGrid-card">
                    <CardBody className="py-0">
                        {this.state.rowData === null ? null : (
                            <div className="ag-theme-material w-200 my-2 ag-grid-table">
                                <div className="d-flex flex-wrap justify-content-between align-items-center">
                                    <div className="mb-1">
                                        <UncontrolledDropdown className="p-1 ag-dropdown">
                                            <DropdownToggle tag="div">
                                                {this.gridApi
                                                    ? this.state.currenPageSize
                                                    : "" * this.state.getPageSize -
                                                    (this.state.getPageSize - 1)}{" "}
                                                -{" "}
                                                {this.state.rowData.length -
                                                this.state.currenPageSize * this.state.getPageSize >
                                                0
                                                    ? this.state.currenPageSize * this.state.getPageSize
                                                    : this.state.rowData.length}{" "}
                                                of {this.state.rowData.length}
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
                                                    onClick={() => this.filterSize(134)}
                                                >
                                                    134
                                                </DropdownItem>
                                            </DropdownMenu>
                                        </UncontrolledDropdown>
                                    </div>
                                    <div className="d-flex flex-wrap justify-content-between mb-1">
                                        { /* <div className="table-input mr-1">
                                            <Input
                                                placeholder="search..."
                                                onChange={e => this.updateSearchQuery(e.target.value)}
                                                value={this.state.value}
                                            />
                                        </div>*/}
                                        <div className="export-btn">
                                            <Button.Ripple
                                                color="primary"
                                                onClick={() => this.gridApi.exportDataAsCsv()}
                                            >
                                                Export as CSV
                                            </Button.Ripple>
                                        </div>
                                    </div>
                                </div>
                                <ContextLayout.Consumer>
                                    {context => (
                                        <AgGridReact
                                            gridOptions={{}}
                                            rowSelection="multiple"
                                            defaultColDef={defaultColDef}
                                            columnDefs={columnDefs}
                                            rowData={rowData}
                                            onCellEditingStopped={this.onCellEditingStopped}
                                            onGridReady={this.onGridReady}
                                            onRowSelected={this.onRowSelected}
                                            colResizeDefault={"shift"}
                                            animateRows={true}
                                            floatingFilter={true}
                                            pagination={true}
                                            pivotPanelShow="always"
                                            enableRtl={context.state.direction === "rtl"}
                                        />
                                    )}
                                </ContextLayout.Consumer>
                            </div>
                        )}
                        <div align="center">
                            <Button.Ripple
                                color="primary"
                                onClick={() => history.push("/pages/contract/" + this.props.match.params.id)}
                            >
                                Générer le contrat
                            </Button.Ripple>
                        </div>
                    </CardBody>
                </Card>
            </React.Fragment>
        )
    }
}
export default handleServices
