import React from "react"
import { CheckCircle, Compass, DollarSign, Inbox, Package, Power, TrendingUp } from "react-feather"
import { Users } from "react-feather"
import axios from "axios";
import { default as NumberFormat } from 'react-number-format';


import {Card,
  CardBody,
  Nav,
  Input,
  NavItem,
  NavLink,
  TabContent,
  CardHeader, CardTitle,
  TabPane} from "reactstrap";
  import classnames from "classnames"
import { copyFileSync } from "fs";
import Autocomplete from "../../../components/@vuexy/autoComplete/AutoCompleteComponent";

  const Config = {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  }

  const spacing = "10px 20px";
  const bubleSize = 30;
  const TodoComponent = {
    width: "100%",
    margin: spacing,
    marginLeft: "auto",
    marginRight: "auto",
    padding: spacing,
    minHeight: "100px",
    boxSizing: "border-box",
    fontSize: "25px",
    textAlign: "center"
   }
  
  const FrenchMonth = ['janvier', 'février', 'mars', 'avril','mai','juin','juillet','août',
                    'septembre','octobre','novembre', 'décembre'];
  
  class OverallCard extends React.Component {
  state = {
    month: null,
    year: null,
    client_count: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    current_total_amount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    total_ended_count: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    current_acompte_amount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    current_solde_amount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    opportunite_amount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    opportunite_count: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    year_client_count: 0,
    year_current_total_amount: 0,
    year_total_ended_count: 0,
    year_current_acompte_amount: 0,
    year_current_solde_amount: 0,
    year_opportunite_amount: 0,
    year_opportunite_count: 0,
    trim_client_count: 0,
    trim_current_total_amount: 0,
    trim_total_ended_count: 0,
    trim_current_acompte_amount: 0,
    trim_current_solde_amount: 0,
    trim_opportunite_amount: 0,
    trim_opportunite_count: 0,
    trim: "Trimestre 1",
    activeTab: "1",
    rowData:[],
    monthb: 1
  }
  async componentDidMount() {
    let tmp = new Date();
    this.setState({ month: FrenchMonth[tmp.getMonth()]})
    this.setState({ year: tmp.getFullYear()})
    await axios.get(global.config.server_url + "/get_statistics_total_income?year="+tmp.getFullYear(), Config).then(response => {
      let tmp_clients = []
      let tmp_total_amount = []
      let tmp_account = []
      let tmp_sold = []
      let tmp_opportunite = []
      let tmp_opportunite_c = []
      let tmp_ended = []
      for (let i = 0; i < 12; i++) {
        tmp_clients[i] = response.data[i+1]['current_acompte_count'];
        tmp_total_amount[i] = response.data[i+1]['current_total_amount'];
        tmp_account[i] = response.data[i+1]['current_acompte_amount'];
        tmp_sold[i] = response.data[i+1]['current_solde_amount'];
        tmp_opportunite[i] = response.data[i+1]['opportunite_amount'];
        tmp_opportunite_c[i] = response.data[i+1]['opportunite_count'];
        tmp_ended[i] = response.data[i+1]['total_ended_count'];
      }
      this.setState({
          client_count: tmp_clients,
          current_total_amount: tmp_total_amount,
          total_ended_count: tmp_ended,
          current_acompte_amount: tmp_account,
          current_solde_amount: tmp_sold,
          opportunite_amount: tmp_opportunite,
          opportunite_count: tmp_opportunite_c,
          rowData: response.data,
        })
    })
    this.getAllData(tmp.getFullYear())
    this.getTrimData("Trimestre 1", tmp.getFullYear())
  }
  
  getTrimData(Trim, year) {
    axios.get(global.config.server_url + "/get_statistics_total_income?year="+year, Config).then(response => {
      let tmp_clients = 0
      let tmp_total_amount = 0
      let tmp_account = 0
      let tmp_sold = 0
      let tmp_opportunite = 0
      let tmp_opportunite_c = 0
      let tmp_ended = 0
      let i = 0
      if (Trim == "Trimestre 1") {
        i = 0
      } else if (Trim == "Trimestre 2") {
        i = 3
      } else if (Trim == "Trimestre 3") {
        i = 6
      } else if (Trim == "Trimestre 4"){
        i = 9
      }
      let j = i + 3
      while (i != j) {
        tmp_clients =  tmp_clients + response.data[i+1]['current_acompte_count'];
        tmp_total_amount = tmp_total_amount + response.data[i+1]['current_total_amount'];
        tmp_account = tmp_account + response.data[i+1]['current_acompte_amount'];
        tmp_sold = tmp_sold + response.data[i+1]['current_solde_amount'];
        tmp_opportunite = tmp_opportunite + response.data[i+1]['opportunite_amount'];
        tmp_opportunite_c = tmp_opportunite_c + response.data[i+1]['opportunite_count'];
        tmp_ended = tmp_ended + response.data[i+1]['total_ended_count'];
        i++
      }
      this.setState({
        trim_client_count: tmp_clients,
        trim_current_total_amount: tmp_total_amount,
        trim_total_ended_count: tmp_ended,
        trim_current_acompte_amount: tmp_account,
        trim_current_solde_amount: tmp_sold,
        trim_opportunite_amount: tmp_opportunite,
        trim_opportunite_count: tmp_opportunite_c,
        })
    })
  }

  getMonthdata(toCompare, newYear) {
    let i = 0;
    while (toCompare != FrenchMonth[i]) {
      i++;
    }
    i++;
    axios.get(global.config.server_url + "/get_statistics_total_income?year="+newYear, Config).then(response => {
      let tmp_clients = []
      let tmp_total_amount = []
      let tmp_account = []
      let tmp_sold = []
      let tmp_opportunite = []
      let tmp_opportunite_c = []
      let tmp_ended = []
      for (let i = 0; i < 12; i++) {
        tmp_clients[i] = response.data[i+1]['current_acompte_count'];
        tmp_total_amount[i] = response.data[i+1]['current_total_amount'];
        tmp_account[i] = response.data[i+1]['current_acompte_amount'];
        tmp_sold[i] = response.data[i+1]['current_solde_amount'];
        tmp_opportunite[i] = response.data[i+1]['opportunite_amount'];
        tmp_opportunite_c[i] = response.data[i+1]['opportunite_count'];
        tmp_ended[i] = response.data[i+1]['total_ended_count'];
      }
      this.setState({
          client_count: tmp_clients,
          current_total_amount: tmp_total_amount,
          total_ended_count: tmp_ended,
          current_acompte_amount: tmp_account,
          current_solde_amount: tmp_sold,
          opportunite_amount: tmp_opportunite,
          opportunite_count: tmp_opportunite_c,
          month: toCompare,
          year: newYear,
          monthb: i,
        })
    })
  }

  numStr(a, b) {
    a = '' + a;
    b = b || ' ';
    var c = '',
        d = 0;
    while (a.match(/^0[0-9]/)) {
      a = a.substr(1);
    }
    for (var i = a.length-1; i >= 0; i--) {
      c = (d != 0 && d % 3 == 0) ? a[i] + b + c : a[i] + c;
      d++;
    }
    return c;
  }

  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
  }
  getAllData(year) {
    axios.get(global.config.server_url + "/get_statistics_total_income?year="+year, Config).then(response => {
      let tmp_clients = 0
      let tmp_total_amount = 0
      let tmp_account = 0
      let tmp_sold = 0
      let tmp_opportunite = 0
      let tmp_opportunite_c = 0
      let tmp_ended = 0
      for (let i = 0; i < 12; i++) {
        tmp_clients =  tmp_clients + response.data[i+1]['current_acompte_count'];
        tmp_total_amount = tmp_total_amount + response.data[i+1]['current_total_amount'];
        tmp_account = tmp_account + response.data[i+1]['current_acompte_amount'];
        tmp_sold = tmp_sold + response.data[i+1]['current_solde_amount'];
        tmp_opportunite = tmp_opportunite + response.data[i+1]['opportunite_amount'];
        tmp_opportunite_c = tmp_opportunite_c + response.data[i+1]['opportunite_count'];
        tmp_ended = tmp_ended + response.data[i+1]['total_ended_count'];
      }
      this.setState({
        year_client_count: tmp_clients,
        year_current_total_amount: tmp_total_amount,
        year_total_ended_count: tmp_ended,
        year_current_acompte_amount: tmp_account,
        year_current_solde_amount: tmp_sold,
        year_opportunite_amount: tmp_opportunite,
        year_opportunite_count: tmp_opportunite_c,
        })
    })
  }
  render() {
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
                  <Compass className="success" size={27} />
                </div>
              </div>
              <CardTitle>Informations</CardTitle>
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
                        Années
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
                      <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
                      <div style={{display:'inline-block', marginLeft:'5px'}}>
                       <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={e => this.getMonthdata(this.state.month, e.target.value)}>
                             <option>2018</option><option>2019</option><option>2020</option>
                             <option>2021</option><option>2022</option><option>2023</option>
                             <option>2024</option><option>2025</option><option>2026</option>
                             <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                       </Input>
                       </div>
                       <div style={{display:'inline-block'}}>
                       <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{width:'120px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={e => this.getMonthdata(e.target.value, this.state.year)}>
                             <option>janvier</option><option>février</option><option>mars</option>
                             <option>avril</option><option>mai</option><option>juin</option>
                             <option>juillet</option><option>août</option><option>septembre</option>
                             <option>octobre</option><option>novembre</option><option>décembre</option>
                       </Input>
                       </div>
                       </div>
                      <div className="icon-section form-inline text-bold-600" style={TodoComponent}>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-warning"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <TrendingUp className="warning" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.current_total_amount[this.state.monthb - 1])} €</h2>
                            <CardTitle style={{width:'285px',marginLeft:'auto',marginRight:'auto'}}>Chiffre d'affaires</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-info"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Inbox className="info" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                              <h2>{this.numStr(this.state.current_acompte_amount[this.state.monthb - 1])} €</h2>
                              <CardTitle style={{width:'285px',marginLeft:'auto',marginRight:'auto'}}>Acomptes</CardTitle>
                            </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-info"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Package className="info" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.current_solde_amount[this.state.monthb - 1])} €</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Soldes</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-success"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <DollarSign className="success" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.opportunite_amount[this.state.monthb - 1])} €</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Opportunités</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats mt-1 p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Users className="primary" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.client_count[this.state.monthb - 1])}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Clients signés</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats mt-1 p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Users className="primary" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.opportunite_count[this.state.monthb - 1])}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Prospects</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-danger"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <CheckCircle className="danger" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.total_ended_count[this.state.monthb - 1])}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Contrats cloturés</CardTitle>
                          </div>
                        </div>
                      </div>
                    </TabPane>
                    <TabPane tabId="2">
                      <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
                      <div style={{display:'inline-block', marginLeft:'5px'}}>
                       <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={e => this.getTrimData(this.state.trim, e.target.value) | this.setState({year: e.target.value})}>
                             <option>2018</option><option>2019</option><option>2020</option>
                             <option>2021</option><option>2022</option><option>2023</option>
                             <option>2024</option><option>2025</option><option>2026</option>
                             <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                       </Input>
                       </div>
                       <div style={{display:'inline-block', marginLeft:'5px'}}>
                       <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'130px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={e => this.getTrimData(e.target.value, this.state.year) | this.setState({trim: e.target.value})}>
                             <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                             <option>Trimestre 4</option>
                       </Input>
                       </div>
                      </div>
                      <div className="icon-section form-inline text-bold-600" style={TodoComponent}>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-warning"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <TrendingUp className="warning" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.trim_current_total_amount)} €</h2>
                            <CardTitle style={{width:'285px',marginLeft:'auto',marginRight:'auto'}}>Chiffre d'affaires</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-info"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Inbox className="info" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                              <h2>{this.numStr(this.state.trim_current_acompte_amount)} €</h2>
                              <CardTitle style={{width:'285px',marginLeft:'auto',marginRight:'auto'}}>Acomptes</CardTitle>
                            </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-info"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Package className="info" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.trim_current_solde_amount)} €</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Soldes</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-success"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <DollarSign className="success" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.trim_opportunite_amount)} €</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Opportunités</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats mt-1 p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Users className="primary" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.trim_client_count)}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Clients signés</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats mt-1 p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Users className="primary" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.trim_opportunite_count)}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Prospects</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-danger"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <CheckCircle className="danger" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.trim_total_ended_count)}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Contrats cloturés</CardTitle>
                          </div>
                        </div>
                      </div>
                    </TabPane>
                    <TabPane tabId="3">
                    <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
                      <div style={{display:'inline-block', marginLeft:'5px'}}>
                        <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={e => this.getAllData(e.target.value)}>
                             <option>2018</option><option>2019</option><option>2020</option>
                             <option>2021</option><option>2022</option><option>2023</option>
                             <option>2024</option><option>2025</option><option>2026</option>
                             <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                        </Input>
                      </div>
                      </div>
                      <div className="icon-section form-inline text-bold-600" style={TodoComponent}>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-warning"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <TrendingUp className="warning" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.year_current_total_amount)} €</h2>
                            <CardTitle style={{width:'285px',marginLeft:'auto',marginRight:'auto'}}>Chiffre d'affaires</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-info"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Inbox className="info" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                              <h2>{this.numStr(this.state.year_current_acompte_amount)} €</h2>
                              <CardTitle style={{width:'285px',marginLeft:'auto',marginRight:'auto'}}>Acomptes</CardTitle>
                            </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-info"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Package className="info" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.year_current_solde_amount)} €</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Soldes</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-success"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <DollarSign className="success" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.year_opportunite_amount)} €</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Opportunités</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats mt-1 p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Users className="primary" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.year_client_count)}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Clients signés</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats mt-1 p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <Users className="primary" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <h2>{this.numStr(this.state.year_opportunite_count)}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Prospects</CardTitle>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                            <div className={`avatar avatar-stats p-75 ${
                              this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-danger"}`}>
                                <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                  <CheckCircle className="danger" size={bubleSize} />
                                </div>
                            </div>
                          </div>
                          <div className="ml-1 mt-1">
                            <h2>{this.numStr(this.state.year_total_ended_count)}</h2>
                            <CardTitle style={{width:'300px',marginLeft:'auto',marginRight:'auto'}}>Contrats cloturés</CardTitle>
                          </div>
                        </div>
                      </div>
                    </TabPane>
                  </TabContent>
          </CardBody>
        </Card>
    )
  }
}
export default OverallCard
