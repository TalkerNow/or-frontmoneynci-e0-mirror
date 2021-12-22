import React from "react"
import {PenTool} from "react-feather"
import axios from "axios";
import {Card,
    CardBody,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    CardHeader, CardTitle,
    TabPane} from "reactstrap";
    import classnames from "classnames"
//import Chart from "react-apexcharts";
import { default as NumberFormat } from 'react-number-format';
import {history} from "../../../history";

/* eslint-disable */
const card_properties = {
  chart: {
    id: "Clients",
    toolbar: {
      show: false
    },
    sparkline: {
      enabled: true
    }
  },
  grid: {
    show: false
  },
  colors: ["#7367F0"],
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: "smooth",
    width: 2.5
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 0.9,
      opacityFrom: 0.7,
      opacityTo: 0.5,
      stops: [0, 80, 100]
    }
  },

  xaxis: {
    labels: {
      show: false
    },
    axisBorder: {
      show: false
    }
  },
  yaxis: {
    labels: {
      show: false
    }
  },
  tooltip: {
    x: { show: false }
  }
}
const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token")
  }
}
class PrestationStatistics extends React.Component {

  state = {
    total_amount:0,
    activeTab: '1',
    prestation: ""
  }
  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
  }
  async componentDidMount() {
    await axios.get(global.config.server_url + "/get_statistics_total_income", Config).then(response => {
      this.setState({
        total_amount: response.data.total_amount,
      })
    })
  }

  onChangeYear(year){
    axios.get(global.config.server_url + "/get_statistics_total_income?year="+year, Config).then(response => {
      this.setState({
        total_amount: response.data.total_amount,
      })
    })
  }
  getPrestation(year){
    axios.get(global.config.server_url + "/getPrestation?year="+year, Config).then(response => {
      this.setState({
        prestation: response.data.prestation,
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
                  <PenTool className="success" size={22} />
                </div>
              </div>
              <CardTitle>Prestations</CardTitle>
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
                      {/* <LoginJWT /> */}
                      <p>text Mois.</p>
                      <div style={{width:'100%'}}>
                        <div className="title-section" style={{textAlign:'center',marginTop:'10px',display:'inline-block',float:'left'}}>
                          <p className="mb-0">Total</p>
                          <h2 className="text-bold-600 mt-1 mb-25">{this.state.prestation}</h2>
                          <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2>
                        </div>
                      </div>
                    </TabPane>
                    <TabPane tabId="2">
                      <p>text Trimestre</p>
                    </TabPane>
                    <TabPane tabId="3">
                      <p> text Annes</p>
                    </TabPane>
                  </TabContent>
          </CardBody>
        </Card>
    )
  }
}
export default PrestationStatistics
