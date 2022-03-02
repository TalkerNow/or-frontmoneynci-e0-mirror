import React from "react"
import { Users } from "react-feather"
import axios from "axios";
import { AgGridReact } from "ag-grid-react"
import {
  Nav,
  Button,
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

var creator = -1;

const FrenchMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];

class ExpertCard extends React.Component {
  state = {
    creator: false,
    month: null,
    monthb: 0,
    year: null,
    pageSize: 50,
    activeTab: "1",
    prestation: null,
    tot_att: null,
    trim: null,
    defaultColDef: {
      editable: true,
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
    },
    searchVal: "",
    columnDefs: this.getExecutantsCols(),
    rowData: null,
  }
  getExecutantsCols() {
    return [
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
        field: "total En attente",
        filter: true,
        width: 150,
      },
      {
        headerName: "En Cours",
        field: "total En cours",
        filter: true,
        width: 150,
      },
      {
        headerName: "Termine",
        field: "total Termine",
        filter: true,
        width: 150,
      },
      {
        headerName: "CA En attente",
        field: "total CA En attente",
        filter: true,
        width: 150,
      },
      {
        headerName: "CA En cours",
        field: "total CA En cours",
        filter: true,
        width: 150,
      },
      {
        headerName: "CA Termine",
        field: "total CA Termine",
        filter: true,
        width: 150,
      },
    ];
  }

  getCreatorsCols() {
    return [
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
        headerName: "Creer En Attente",
        field: "total creer En attente",
        filter: true,
        width: 150,
      },
      {
        headerName: "Creer en Cours",
        field: "total creer En cours",
        filter: true,
        width: 150,
      },
      {
        headerName: "Creer termine",
        field: "total creer Termine",
        filter: true,
        width: 150,
      },
      {
        headerName: "CA Creer en attente",
        field: "total CA creer En attente",
        filter: true,
        width: 150,
      },
      {
        headerName: "CA Creer en cours",
        field: "total CA creer En cours",
        filter: true,
        width: 150,
      },
      {
        headerName: "CA Creer termine",
        field: "total CA creer Termine",
        filter: true,
        width: 150,
      },
    ];
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
    let tmp = new Date();
    this.setState({ month: FrenchMonth[tmp.getMonth()] })
    this.setState({ monthb: tmp.getMonth() })
    this.setState({ year: tmp.getFullYear() })
    await axios.get(global.config.server_url + "/getMembersPrestation", Config).then(response => {
      let tmp_presta = response.data;
      for (let j = 0; j < response.data.length; j += 1) {
        tmp_presta[j]['total En attente'] = response.data[j]['monthArray'][this.state.monthb + 1]['En attente'];
        tmp_presta[j]['total creer En attente'] = response.data[j]['monthArray'][this.state.monthb + 1]['creer En attente'];
        tmp_presta[j]['total En cours'] = response.data[j]['monthArray'][this.state.monthb + 1]['En cours'];
        tmp_presta[j]['total creer En cours'] = response.data[j]['monthArray'][this.state.monthb + 1]['creer En cours'];
        tmp_presta[j]['total Termine'] = response.data[j]['monthArray'][this.state.monthb + 1]['Termine'];
        tmp_presta[j]['total creer Termine'] = response.data[j]['monthArray'][this.state.monthb + 1]['creer Termine'];
        tmp_presta[j]['total CA En attente'] = response.data[j]['monthArray'][this.state.monthb + 1]['CA En attente'];
        tmp_presta[j]['total CA creer En attente'] = response.data[j]['monthArray'][this.state.monthb + 1]['CA creer En attente'];
        tmp_presta[j]['total CA En cours'] = response.data[j]['monthArray'][this.state.monthb + 1]['CA En cours'];
        tmp_presta[j]['total CA creer En cours'] = response.data[j]['monthArray'][this.state.monthb + 1]['CA creer En cours'];
        tmp_presta[j]['total CA Termine'] = response.data[j]['monthArray'][this.state.monthb + 1]['CA Termine'];
        tmp_presta[j]['total CA creer Termine'] = response.data[j]['monthArray'][this.state.monthb + 1]['CA creer Termine'];
      }
      this.setState({ prestation: tmp_presta })
    })
  }

  getYearData(newYear) {
    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config).then(response => {
      let tmp_presta = this.state.prestation;
      for (let i = 0; i < response.data.length; i += 1) {
        let tmp_Waiting = 0;
        let tmp_C_Waiting = 0;
        let tmp_En_cours = 0;
        let tmp_C_En_cours = 0;
        let tmp_Finish = 0;
        let tmp_C_Finish = 0;
        let tmp_CA_Waiting = 0;
        let tmp_C_CA_Waiting = 0;
        let tmp_CA_En_cours = 0;
        let tmp_C_CA_En_cours = 0;
        let tmp_CA_Finish = 0;
        let tmp_C_CA_Finish = 0;
        for (let j = 0; j < 12; j += 1) {
          tmp_Waiting = tmp_Waiting + response.data[i]['monthArray'][j + 1]['En attente'];
          tmp_C_Waiting = tmp_C_Waiting + response.data[i]['monthArray'][j + 1]['creer En attente'];
          tmp_En_cours = tmp_En_cours + response.data[i]['monthArray'][j + 1]['En cours'];
          tmp_C_En_cours = tmp_C_En_cours + response.data[i]['monthArray'][j + 1]['creer En cours'];
          tmp_Finish = tmp_Finish + response.data[i]['monthArray'][j + 1]['Termine'];
          tmp_C_Finish = tmp_C_Finish + response.data[i]['monthArray'][j + 1]['creer Termine'];
          tmp_CA_Waiting = tmp_CA_Waiting + response.data[i]['monthArray'][j + 1]['CA En attente'];
          tmp_C_CA_Waiting = tmp_C_CA_Waiting + response.data[i]['monthArray'][j + 1]['CA creer En attente'];
          tmp_CA_En_cours = tmp_CA_En_cours + response.data[i]['monthArray'][j + 1]['CA En cours'];
          tmp_C_CA_En_cours = tmp_C_CA_En_cours + response.data[i]['monthArray'][j + 1]['CA creer En cours'];
          tmp_CA_Finish = tmp_CA_Finish + response.data[i]['monthArray'][j + 1]['CA Termine'];
          tmp_C_CA_Finish = tmp_C_CA_Finish + response.data[i]['monthArray'][j + 1]['CA creer Termine'];
        }
        tmp_presta[i]['total En attente'] = tmp_Waiting;
        tmp_presta[i]['total creer En attente'] = tmp_C_Waiting;
        tmp_presta[i]['total En cours'] = tmp_En_cours;
        tmp_presta[i]['total creer En cours'] = tmp_C_En_cours;
        tmp_presta[i]['total Termine'] = tmp_Finish;
        tmp_presta[i]['total creer Termine'] = tmp_C_Finish;
        tmp_presta[i]['total CA En attente'] = tmp_CA_Waiting;
        tmp_presta[i]['total CA creer En attente'] = tmp_C_CA_Waiting;
        tmp_presta[i]['total CA En cours'] = tmp_CA_En_cours;
        tmp_presta[i]['total CA creer En cours'] = tmp_C_CA_En_cours;
        tmp_presta[i]['total CA Termine'] = tmp_CA_Finish;
        tmp_presta[i]['total CA creer Termine'] = tmp_C_CA_Finish;
      }
      this.setState({ prestation: tmp_presta });
    })
  }

  getTrimData(Trim, newYear) {
    this.setState({
      trim: Trim,
      year: newYear,
    })
    let i = 0
    if (Trim === "Trimestre 1") {
      i = 0
    } else if (Trim === "Trimestre 2") {
      i = 3
    } else if (Trim === "Trimestre 3") {
      i = 6
    } else if (Trim === "Trimestre 4") {
      i = 9
    }
    let j = i + 2
    let tmpi = i
    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config).then(response => {
      let tmp_presta = this.state.prestation
      for (let k = 0; k < response.data.length; k += 1) {
        let tmp_Waiting = 0;
        let tmp_C_Waiting = 0;
        let tmp_En_cours = 0;
        let tmp_C_En_cours = 0;
        let tmp_Finish = 0;
        let tmp_C_Finish = 0;
        let tmp_CA_Waiting = 0;
        let tmp_C_CA_Waiting = 0;
        let tmp_CA_En_cours = 0;
        let tmp_C_CA_En_cours = 0;
        let tmp_CA_Finish = 0;
        let tmp_C_CA_Finish = 0;
        while (i <= j) {
          tmp_Waiting = tmp_Waiting + response.data[k]['monthArray'][i + 1]['En attente'];
          tmp_C_Waiting = tmp_C_Waiting + response.data[k]['monthArray'][i + 1]['creer En attente'];
          tmp_En_cours = tmp_En_cours + response.data[k]['monthArray'][i + 1]['En cours'];
          tmp_C_En_cours = tmp_C_En_cours + response.data[k]['monthArray'][i + 1]['creer En cours'];
          tmp_Finish = tmp_Finish + response.data[k]['monthArray'][i + 1]['Termine'];
          tmp_C_Finish = tmp_C_Finish + response.data[k]['monthArray'][i + 1]['creer Termine'];
          tmp_CA_Waiting = tmp_CA_Waiting + response.data[k]['monthArray'][i + 1]['CA En attente'];
          tmp_C_CA_Waiting = tmp_C_CA_Waiting + response.data[k]['monthArray'][i + 1]['CA creer En attente'];
          tmp_CA_En_cours = tmp_CA_En_cours + response.data[k]['monthArray'][i + 1]['CA En cours'];
          tmp_C_CA_En_cours = tmp_C_CA_En_cours + response.data[k]['monthArray'][i + 1]['CA creer En cours'];
          tmp_CA_Finish = tmp_CA_Finish + response.data[k]['monthArray'][i + 1]['CA Termine'];
          tmp_C_CA_Finish = tmp_C_CA_Finish + response.data[k]['monthArray'][i + 1]['CA creer Termine'];
          i += 1;
        }
        tmp_presta[j]['total En attente'] = tmp_Waiting;
        tmp_presta[j]['total creer En attente'] = tmp_C_Waiting;
        tmp_presta[j]['total En cours'] = tmp_En_cours;
        tmp_presta[j]['total creer En cours'] = tmp_C_En_cours;
        tmp_presta[j]['total Termine'] = tmp_Finish;
        tmp_presta[j]['total creer Termine'] = tmp_C_Finish;
        tmp_presta[j]['total CA En attente'] = tmp_CA_Waiting;
        tmp_presta[j]['total CA creer En attente'] = tmp_C_CA_Waiting;
        tmp_presta[j]['total CA En cours'] = tmp_CA_En_cours;
        tmp_presta[j]['total CA creer En cours'] = tmp_C_CA_En_cours;
        tmp_presta[j]['total CA Termine'] = tmp_CA_Finish;
        tmp_presta[j]['total CA creer Termine'] = tmp_C_CA_Finish;
        i = tmpi;
      }
      this.setState({ prestation: tmp_presta })
    })
  }
  getMonthData(newMonth, newYear) {
    let i = 0;
    while (newMonth !== FrenchMonth[i]) {
      i += 1;
    }
    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config).then(response => {
      this.setState({
        prestation: response.data,
      })
      let tmp_presta = this.state.prestation
      for (let j = 0; j < response.data.length; j += 1) {
        tmp_presta[j]['total En attente'] = response.data[j]['monthArray'][i + 1]['En attente'];
        tmp_presta[j]['total creer En attente'] = response.data[j]['monthArray'][i + 1]['creer En attente'];
        tmp_presta[j]['total En cours'] = response.data[j]['monthArray'][i + 1]['En cours'];
        tmp_presta[j]['total creer En cours'] = response.data[j]['monthArray'][i + 1]['creer En cours'];
        tmp_presta[j]['total Termine'] = response.data[j]['monthArray'][i + 1]['Termine'];
        tmp_presta[j]['total creer Termine'] = response.data[j]['monthArray'][i + 1]['creer Termine'];
        tmp_presta[j]['total CA En attente'] = response.data[j]['monthArray'][i + 1]['CA En attente'];
        tmp_presta[j]['total CA creer En attente'] = response.data[j]['monthArray'][i + 1]['CA creer En attente'];
        tmp_presta[j]['total CA En cours'] = response.data[j]['monthArray'][i + 1]['CA En cours'];
        tmp_presta[j]['total CA creer En cours'] = response.data[j]['monthArray'][i + 1]['CA creer En cours'];
        tmp_presta[j]['total CA Termine'] = response.data[j]['monthArray'][i + 1]['CA Termine'];
        tmp_presta[j]['total CA creer Termine'] = response.data[j]['monthArray'][i + 1]['CA creer Termine'];
      }
      this.setState({ prestation: tmp_presta })
    })
    this.setState({
      month: newMonth,
      year: newYear,
    })
  }

  updateSearchQuery = val => {
    this.gridApi.setQuickFilter(val)
    this.setState({
      searchVal: val
    })
  }

  setDataExecutants = () => {
    creator = 1;
    this.setState({ creator: true })
    this.gridApi.setColumnDefs(this.getCreatorsCols());
  };

  setDataCreators = () => {
    creator = -1;
    this.setState({ creator: false })
    this.gridApi.setColumnDefs(this.getExecutantsCols());
  };

  render() {
    const { prestation, columnDefs, defaultColDef } = this.state
    return (
      <Card>
        <CardHeader>
          <div className="icon-section form-inline">
            <div
              className={`avatar avatar-stats p-50 ${this.props.iconBg
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
            <div>
              {(creator !== -1 && this.state.creator === true) &&
                <>
                  <Button className="mr-1 mb-2 mr-1" outline color="primary" onClick={() => this.setDataCreators()}>
                    executants
                  </Button>
                </>
              }
              {(creator === -1 && this.state.creator === false) &&
                <>
                  <Button className="mr-1 mb-2 mr-1" outline color="primary" onClick={() => this.setDataExecutants()}>
                    createurs
                  </Button>
                </>
              }

            </div>
            <NavItem>
              <NavLink
                className={classnames({
                  active: this.state.activeTab === "1"
                })}
                onClick={() => {
                  this.getMonthData(this.state.month, this.state.year)
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
                  this.getTrimData(this.state.trim, this.state.year)
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
                  this.getYearData(this.state.year)
                  this.toggle("3")
                }}
              >
                Années
              </NavLink>
            </NavItem>
          </Nav>
        </CardHeader>
        <CardBody
          className={`${this.props.className ? this.props.className : "stats-card-body"} d-flex ${!this.props.iconRight && !this.props.hideChart
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
                  <Card style={{ minHeight: '500px', minWidth: '1500px' }}>
                    <CardBody>
                      <div className="ag-theme-material ag-grid-table">
                        <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                          <div className="title-section" style={{ textAlign: 'center', marginRight: 'auto', display: 'inline-block', }}>
                            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                              <Input type="select" name="select" id="role" defaultValue={this.state.year} key={this.state.year} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                                onChange={e => this.getMonthData(this.state.month, e.target.value)}>
                                <option>2018</option><option>2019</option><option>2020</option>
                                <option>2021</option><option>2022</option><option>2023</option>
                                <option>2024</option><option>2025</option><option>2026</option>
                                <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                              </Input>
                            </div>
                            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                              <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{ width: '120px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                                onChange={e => this.getMonthData(e.target.value, this.state.year)}>
                                <option>janvier</option><option>février</option><option>mars</option>
                                <option>avril</option><option>mai</option><option>juin</option>
                                <option>juillet</option><option>août</option><option>septembre</option>
                                <option>octobre</option><option>novembre</option><option>décembre</option>
                              </Input>
                            </div>
                          </div>
                        </div>
                        {this.state.prestation !== null ? (
                          <AgGridReact
                            height={'autoHeight'}
                            defaultColDef={defaultColDef}
                            columnDefs={columnDefs}
                            rowData={prestation}
                            colResizeDefault={"shift"}
                            animateRows={true}
                            onGridReady={this.onGridReady}
                            floatingFilter={true}
                            pagination={true}
                            pivotPanelShow="always"
                            enableRangeSelection={true}
                          />
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
                  <Card style={{ minHeight: '500px', minWidth: '1500px' }}>
                    <CardBody>
                      <div className="ag-theme-material ag-grid-table">
                        <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                          <div className="title-section" style={{ textAlign: 'center', marginRight: 'auto', display: 'inline-block', }}>
                            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                              <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '130px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                                onChange={e => this.getTrimData(e.target.value, this.state.year)}>
                                <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                                <option>Trimestre 4</option>
                              </Input>
                            </div>
                            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                              <Input type="select" name="select" id="role" defaultValue={this.state.year} key={this.state.year} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                                onChange={e => this.getTrimData(this.state.trim, e.target.value)}>
                                <option>2018</option><option>2019</option><option>2020</option>
                                <option>2021</option><option>2022</option><option>2023</option>
                                <option>2024</option><option>2025</option><option>2026</option>
                                <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                              </Input>
                            </div>
                          </div>
                        </div>
                        {this.state.prestation !== null ? (
                          <AgGridReact
                            height={'autoHeight'}
                            defaultColDef={defaultColDef}
                            columnDefs={columnDefs}
                            rowData={prestation}
                            colResizeDefault={"shift"}
                            animateRows={true}
                            onGridReady={this.onGridReady}
                            floatingFilter={true}
                            pagination={true}
                            pivotPanelShow="always"
                            enableRangeSelection={true}
                          />
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
                  <Card style={{ minHeight: '500px', minWidth: '1500px' }}>
                    <CardBody>
                      <div className="ag-theme-material ag-grid-table">
                        <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
                          <div className="title-section" style={{ textAlign: 'center', marginRight: 'auto', display: 'inline-block', }}>
                            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                              <Input type="select" name="select" id="role" defaultValue={this.state.year} key={this.state.year} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                                onChange={e => this.getYearData(e.target.value)}>
                                <option>2018</option><option>2019</option><option>2020</option>
                                <option>2021</option><option>2022</option><option>2023</option>
                                <option>2024</option><option>2025</option><option>2026</option>
                                <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                              </Input>
                            </div>
                          </div>
                        </div>
                        {this.state.prestation !== null ? (
                          <AgGridReact
                            height={'autoHeight'}
                            defaultColDef={defaultColDef}
                            columnDefs={columnDefs}
                            rowData={prestation}
                            colResizeDefault={"shift"}
                            animateRows={true}
                            onGridReady={this.onGridReady}
                            floatingFilter={true}
                            pagination={true}
                            pivotPanelShow="always"
                            enableRangeSelection={true}
                          />
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
