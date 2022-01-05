import React from "react"
import { Compass } from "react-feather"
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

  const Config = {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  }

  const spacing = "10px 20px";
  const TodoComponent = {
    width: "100%",
    margin: spacing,
    padding: spacing,
    minHeight: "200px",
    boxSizing: "border-box",
    textAlign: "center"
   }
  
  const FrenchMonth = ['janvier', 'février', 'mars', 'avril','mai','juin','juillet','août',
                    'septembre','octobre','novembre', 'décembre'];
  
  class OverallCard extends React.Component {
  state = {
    month: null,
    year: null,
    clients_count: 0,
    current_total_count: 0,
    current_total_amount: 0,
    total_ended_count: 0,
    total_ended_amount: 0,
    current_acompte_count: 0,
    current_acompte_amount: 0,
    current_solde_count: 0,
    current_solde_amount: 0,
    opportunite_count: 0,
    opportunite_amount:0,
    activeTab: "1",
    rowData:[],
    monthb: 1
  }
  async componentDidMount() {
    let tmp = new Date();
    this.setState({ month: tmp.getMonth()})
    this.setState({ year: tmp.getFullYear()})
    await axios.get(global.config.server_url + "/get_statistics_total_income?year="+tmp.getFullYear(), Config).then(response => {
      this.setState({
          rowData: response.data,
        })
    })
    this.getMonthdata(this.month);
  }
  
  async getMonthdata(toCompare)
  {
    let tmp = new Date();
    let monthb = 0;
    while (toCompare != FrenchMonth[monthb])
    {
      monthb++;
    }
    monthb++;
    this.setState({
      monthb: monthb,
    })
  }

  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
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
                  <Compass className="success" size={22} />
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
                      <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
                      <div style={{display:'inline-block', marginLeft:'5px'}}>
                       <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={console.log('change')}>   
                             <option>2018</option><option>2019</option><option>2020</option>
                             <option>2021</option><option>2022</option><option>2023</option>
                             <option>2024</option><option>2025</option><option>2026</option>
                             <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                       </Input>
                       </div>
                       <div style={{display:'inline-block'}}>
                       <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{width:'120px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={console.log('change')}>
                             <option>janvier</option><option>février</option><option>mars</option>
                             <option>avril</option><option>mai</option><option>juin</option>
                             <option>juillet</option><option>août</option><option>septembre</option>
                             <option>octobre</option><option>novembre</option><option>décembre</option>
                       </Input>
                       </div>
                       </div>
                      <div className="icon-section form-inline" style={TodoComponent}>
                        <div style={{display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Nombre de Clients</CardTitle>
                          <NumberFormat value={this.state.rowData[this.monthb].clients_count} displayType={'text'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Chiffre d'affaires</CardTitle>
                          <NumberFormat value={this.state.rowData[this.monthb]['current_total_amount']} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Acompte           </CardTitle>
                          <NumberFormat value={this.state.rowData[this.monthb]['current_acompte_amount']} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Solde</CardTitle>
                          <NumberFormat value={this.state.rowData[this.monthb]['current_solde_amount']} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'100px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Opportunités</CardTitle>
                          <NumberFormat value={this.state.rowData[this.monthb]['opportunite_amount']} displayType={'text'} suffix={'€'} />
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Contrat cloturé</CardTitle>
                          <NumberFormat value={this.state.rowData[this.monthb]['total_ended_amount']} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                        </div>
                      </div>
                    </TabPane>
                    <TabPane tabId="2">
                      <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
                       <div style={{display:'inline-block', marginLeft:'5px'}}>
                       <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'130px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={console.log('change')}>   
                             <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                             <option>Trimestre 4</option>
                       </Input>
                       </div>
                      </div>
                      <div className="icon-section form-inline" style={TodoComponent}>
                        <div style={{display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Nombre de Clients</CardTitle>
                          <NumberFormat value={this.state.clients_count} displayType={'text'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Chiffre d'affaires</CardTitle>
                          <NumberFormat value={this.state.current_total_amount} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Acompte           </CardTitle>
                          <NumberFormat value={this.state.current_acompte_amount} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Solde</CardTitle>
                          <NumberFormat value={this.state.current_solde_amount} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'100px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Opportunités</CardTitle>
                          <NumberFormat value={this.state.opportunite_amount} displayType={'text'} suffix={'€'} />
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Contrat cloturé</CardTitle>
                          <NumberFormat value={this.state.total_ended_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                        </div>
                      </div>
                    </TabPane>
                    <TabPane tabId="3">
                    <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
                       <div style={{display:'inline-block', marginLeft:'5px'}}>
                       <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'75px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                              onChange={console.log('change')}>   
                             <option>2018</option><option>2019</option><option>2020</option>
                             <option>2021</option><option>2022</option><option>2023</option>
                             <option>2024</option><option>2025</option><option>2026</option>
                             <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                       </Input>
                       </div>
                       </div>
                       <div className="icon-section form-inline" style={TodoComponent}>
                        <div style={{display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Nombre de Clients</CardTitle>
                          <NumberFormat value={this.state.clients_count} displayType={'text'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Chiffre d'affaires</CardTitle>
                          <NumberFormat value={this.state.current_total_amount} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Acompte           </CardTitle>
                          <NumberFormat value={this.state.current_acompte_amount} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Solde</CardTitle>
                          <NumberFormat value={this.state.current_solde_amount} displayType={'text'} suffix={'€'}/>
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'100px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Opportunités</CardTitle>
                          <NumberFormat value={this.state.opportunite_amount} displayType={'text'} suffix={'€'} />
                        </div>
                        <div style={{marginTop:'10px',display:'inline-block',float:'left'}}>
                          <div className={`avatar avatar-stats p-50 ${
                            this.props.iconBg ? `bg-rgba-${this.props.iconBg}`: "bg-rgba-primary"}`}>
                              <div className="avatar-content" style={{marginLeft:'auto',marginRight:'auto'}}>
                                <Users className="success" size={22} />
                              </div>
                          </div>
                          <CardTitle style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'12px'}}>Contrat cloturé</CardTitle>
                          <NumberFormat value={this.state.total_ended_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
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
