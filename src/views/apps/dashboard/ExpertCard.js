import React from "react"
import { Users } from "react-feather"
import axios from "axios";
import { ContextLayout } from "../../../utility/context/Layout"
import { AgGridReact } from "ag-grid-react"
import {
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Row,
  Col,
} from "reactstrap"
import classnames from "classnames"
import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../assets/scss/pages/users.scss"

const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token")
  }
}

const FrenchMonth = ['janvier', 'février', 'mars', 'avril','mai','juin','juillet','août',
                    'septembre','octobre','novembre', 'décembre'];
class ExpertCard extends React.Component {
  state = {
    pageSize: 50,
    activeTab: "1",
    prestation: null,
    defaultColDef: {
      editable: true,
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
    },
    searchVal: "",
    columnDefs: [
      {
        headerName: "Nom",
        field: "name",
        filter: true,
        width: 250,
      },
      {
        headerName: "Role",
        field: "role",
        filter: true,
        width: 100,
      },
        {
          headerName: "En Attente",
          field: "role",
          filter: true,
          width: 250,
        },
        {
          headerName: "En Cours",
          field: "role",
          filter: true,
          width: 250,
        },
        {
          headerName: "Termine",
          field: "role",
          filter: true,
          width: 250,
        },
      
    ]
  }

  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
  }

  onGridReady = params => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
    this.gridApi.setDomLayout("autoHeight");
  }
  filterSize = val => {
    if (this.gridApi) {
      this.gridApi.paginationSetPageSize(Number(val))
      this.setState({
        pageSize: val
      })
    }
  }

  async componentDidMount() {
    await axios.get(global.config.server_url + "/getMembersPrestation", Config).then(response => {
      this.setState({
        prestation: response.data,
      })
    })
  }

  getMembersPrestation(year) {
    axios.get(global.config.server_url + "/getMembersPrestation?year="+year, Config).then(response => {
      this.setState({
        prestation: response.data,
      })
    })
  }
  updateSearchQuery = val => {
    this.gridApi.setQuickFilter(val)
    this.setState({
      searchVal: val
    })
  }
  render() {
    const { prestation, columnDefs, defaultColDef, pageSize } = this.state
    return (
        <Card>
          <CardHeader>
          <div className="icon-section form-inline">
              <div
                  className={`avatar avatar-stats p-50 ${
                      this.props.iconBg
                          ? `bg-rgba-${this.props.iconBg}`
                          : "bg-rgba-primary"
                  }`}
              >
                <div className="avatar-content">
                  <Users className="success" size={22} />
                </div>
              </div>
              <CardTitle>Experts</CardTitle>
            </div>
          <Nav tabs className="px-2">
                    <NavItem>
                      <NavLink
                        className={classnames({
                          active: this.state.activeTab === "1"
                        })}
                        onClick={() => {
                          this.toggle("1")
                        }}
                      >
                        Mois
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({
                          active: this.state.activeTab === "2"
                        })}
                        onClick={() => {
                          this.toggle("2")
                        }}
                      >
                        Trimestre
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({
                          active: this.state.activeTab === "3"
                        })}
                        onClick={() => {
                          this.toggle("3")
                        }}
                      >
                        Annes
                      </NavLink>
                    </NavItem>
                  </Nav>
        </CardHeader>
          <CardBody
              className={`${this.props.className ? this.props.className : "stats-card-body"} d-flex ${
                  !this.props.iconRight && !this.props.hideChart
                      ? "flex-column align-items-start"
                      : this.props.iconRight
                      ? "justify-content-between flex-row-reverse align-items-center"
                      : this.props.hideChart && !this.props.iconRight
                          ? "justify-content-center flex-column text-center"
                          : null
              } ${!this.props.hideChart ? "pb-0" : "pb-2"} pt-2`}
          >
                  <TabContent activeTab={this.state.activeTab}>
                    <TabPane tabId="1">
                       <Row>
                       <Col sm="12">
                          <Card style={{minHeight:'500px', minWidth: '1500px'}}>
                            <CardBody>
                              <div className="ag-theme-material ag-grid-table">
                                <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                                <div className="title-section" style={{textAlign:'center',marginRight:'auto' ,display:'inline-block',}}>
                                <div style={{display:'inline-block'}}>
                                  <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{width:'120px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                                          onChange={console.log('change')}>
                                        <option>janvier</option><option>février</option><option>mars</option>
                                        <option>avril</option><option>mai</option><option>juin</option>
                                        <option>juillet</option><option>août</option><option>septembre</option>
                                        <option>octobre</option><option>novembre</option><option>décembre</option>
                                  </Input>
                                  </div>
                                  <div style={{display:'inline-block', marginLeft:'5px'}}>
                                    <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                                          onChange={e => this.getMembersPrestation(e.target.value)}>   
                                        <option>2018</option><option>2019</option><option>2020</option>
                                        <option>2021</option><option>2022</option><option>2023</option>
                                        <option>2024</option><option>2025</option><option>2026</option>
                                        <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                                    </Input>
                                  </div>
                                </div>
                                </div>
                                {this.state.prestation !== null ? (
                                  <ContextLayout.Consumer>
                                    {context => (
                                      <AgGridReact
                                        height={'autoHeight'}
                                        defaultColDef={defaultColDef}
                                        columnDefs={columnDefs}
                                        rowData={prestation}
                                        colResizeDefault={"shift"}
                                        animateRows={true}
                                        floatingFilter={true}
                                        pagination={true}
                                        pivotPanelShow="always"
                                        enableRangeSelection={false}
                                      />
                                    )}
                                  </ContextLayout.Consumer>
                                ) : null}
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>                  
                       </TabPane>
                    <TabPane tabId="2">
                      <Row>
                       <Col sm="12">
                          <Card style={{minHeight:'500px', minWidth: '1500px'}}>
                            <CardBody>
                              <div className="ag-theme-material ag-grid-table">
                                <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                                <div className="title-section" style={{textAlign:'center',marginRight:'auto' ,display:'inline-block',}}>
                                <div style={{display:'inline-block', marginLeft:'5px'}}>
                                    <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'130px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                                      onChange={console.log('change')}>   
                                        <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                                        <option>Trimestre 4</option>
                                    </Input>
                                  </div>
                                  <div style={{display:'inline-block', marginLeft:'5px'}}>
                                    <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                                          onChange={e => this.getMembersPrestation(e.target.value)}>   
                                        <option>2018</option><option>2019</option><option>2020</option>
                                        <option>2021</option><option>2022</option><option>2023</option>
                                        <option>2024</option><option>2025</option><option>2026</option>
                                        <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                                    </Input>
                                  </div>
                                </div>
                                </div>
                                {this.state.prestation !== null ? (
                                  <ContextLayout.Consumer>
                                    {context => (
                                      <AgGridReact
                                        
                                        height={'autoHeight'}
                                        defaultColDef={defaultColDef}
                                        columnDefs={columnDefs}
                                        rowData={prestation}
                                        colResizeDefault={"shift"}
                                        animateRows={true}
                                        floatingFilter={true}
                                        pagination={true}
                                        pivotPanelShow="always"
                                        enableRangeSelection={false}
                                      />
                                    )}
                                  </ContextLayout.Consumer>
                                ) : null}
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    </TabPane>
                    <TabPane tabId="3">
                       <Row>
                       <Col sm="12">
                          <Card style={{minHeight:'500px', minWidth: '1500px'}}>
                            <CardBody>
                              <div className="ag-theme-material ag-grid-table">
                                <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                                <div className="title-section" style={{textAlign:'center',marginRight:'auto' ,display:'inline-block',}}>
                                  <div style={{display:'inline-block', marginLeft:'5px'}}>
                                    <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                                          onChange={e => this.getMembersPrestation(e.target.value)}>   
                                        <option>2018</option><option>2019</option><option>2020</option>
                                        <option>2021</option><option>2022</option><option>2023</option>
                                        <option>2024</option><option>2025</option><option>2026</option>
                                        <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                                    </Input>
                                  </div>
                                </div>
                                </div>
                                {this.state.prestation !== null ? (
                                  <ContextLayout.Consumer>
                                    {context => (
                                      <AgGridReact
                
                                        height={'autoHeight'}
                                        defaultColDef={defaultColDef}
                                        columnDefs={columnDefs}
                                        rowData={prestation}
                                        colResizeDefault={"shift"}
                                        animateRows={true}
                                        floatingFilter={true}
                                        pagination={true}
                                        pivotPanelShow="always"
                                        enableRangeSelection={false}
                                      />
                                    )}
                                  </ContextLayout.Consumer>
                                ) : null}
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    </TabPane>
                  </TabContent>
          </CardBody>
        </Card>
    )
  }
}
export default ExpertCard
