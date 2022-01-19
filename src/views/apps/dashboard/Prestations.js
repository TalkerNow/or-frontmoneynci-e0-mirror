import React from "react"
import { PenTool } from "react-feather"
import axios from "axios";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  Input,
  NavLink,
  TabContent,
  CardHeader, CardTitle,
  TabPane
} from "reactstrap";
import classnames from "classnames"
//import Chart from "react-apexcharts";
import { default as NumberFormat } from 'react-number-format';
import { history } from "../../../history";
import { actions } from "react-table";

import Chip from "../../../../src/components/@vuexy/chips/ChipComponent"

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: 'primary',
  RAC: 'warning'
};

const chipType = [
  { type: 'CH' },
  { type: 'SIMU' },
  { type: 'AR' },
  { type: 'TFD' },
  { type: 'ACTU' },
  { type: 'RAC' },
];

const FrenchMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];
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
    year: null,
    total_amount: 0,
    activeTab: '1',
    month: 'janvier',
    monthb: 1,
    prestation: null,
    waiting: [],
    onGoing: [],
    finish: [],
    chipdataW: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdataOg: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdataf: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdataWTrim: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdataOgTrim: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdatafTrim: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdataWY: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdataOgY: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    chipdatafY: {
      CH: 1,
      SIMU: 2,
      AR: 3,
      TFD: 4,
      ACTU: 5,
      RAC: 6
    },
    trim: "Trimestre 1",
  }
  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
  }
    
  async componentDidMount() {
    let tmp = new Date();
    this.setState({ year: tmp.getFullYear()})
    await axios.get(global.config.server_url + "/getPrestation", Config).then(response => {
      this.setState({
        prestation: response.data,
        waiting: response.data[0],
        chipdataW: {
          CH: response.data[0][this.state.monthb]['CH'],
          SIMU: response.data[0][this.state.monthb]['SIMU'],
          AR: response.data[0][this.state.monthb]['AR'],
          TFD: response.data[0][this.state.monthb]['TFD'],
          ACTU: response.data[0][this.state.monthb]['ACTU'],
          RAC: response.data[0][this.state.monthb]['RAC']
        },
        chipdataOg: {
          CH: response.data[1][this.state.monthb]['CH'],
          SIMU: response.data[1][this.state.monthb]['SIMU'],
          AR: response.data[1][this.state.monthb]['AR'],
          TFD: response.data[1][this.state.monthb]['TFD'],
          ACTU: response.data[1][this.state.monthb]['ACTU'],
          RAC: response.data[1][this.state.monthb]['RAC']
        },
        chipdataf: {
          CH: response.data[2][this.state.monthb]['CH'],
          SIMU: response.data[2][this.state.monthb]['SIMU'],
          AR: response.data[2][this.state.monthb]['AR'],
          TFD: response.data[2][this.state.monthb]['TFD'],
          ACTU: response.data[2][this.state.monthb]['ACTU'],
          RAC: response.data[2][this.state.monthb]['RAC']
        },
        onGoing: response.data[1],
        finish: response.data[2],
      })
    })
  }

  getYearData(newYear){
    axios.get(global.config.server_url + "/getPrestation?year=" + newYear, Config).then(response => {
      let tmp_w_y_CH = 0
      let tmp_w_y_SIMU = 0
      let tmp_w_y_AR = 0
      let tmp_w_y_TFD = 0
      let tmp_w_y_ACTU = 0
      let tmp_w_y_RAC = 0
      let tmp_o_y_CH = 0
      let tmp_o_y_SIMU = 0
      let tmp_o_y_AR = 0
      let tmp_o_y_TFD = 0
      let tmp_o_y_ACTU = 0
      let tmp_o_y_RAC = 0
      let tmp_e_y_CH = 0
      let tmp_e_y_SIMU = 0
      let tmp_e_y_AR = 0
      let tmp_e_y_TFD = 0
      let tmp_e_y_ACTU = 0
      let tmp_e_y_RAC = 0
      for (let i = 0; i < 12; i++) {
        tmp_w_y_CH = tmp_w_y_CH + response.data[0][i+1]['CH'],
        tmp_w_y_SIMU = tmp_w_y_SIMU + response.data[0][i+1]['SIMU'],
        tmp_w_y_AR = tmp_w_y_AR + response.data[0][i+1]['AR'],
        tmp_w_y_TFD = tmp_w_y_TFD + response.data[0][i+1]['TFD'],
        tmp_w_y_ACTU = tmp_w_y_ACTU + response.data[0][i+1]['ACTU'],
        tmp_w_y_RAC = tmp_w_y_RAC + response.data[0][i+1]['RAC'],
        tmp_o_y_CH = tmp_o_y_CH + response.data[1][i+1]['CH'],
        tmp_o_y_SIMU = tmp_o_y_SIMU + response.data[1][i+1]['SIMU'],
        tmp_o_y_AR = tmp_o_y_AR + response.data[1][i+1]['AR'],
        tmp_o_y_TFD = tmp_o_y_TFD + response.data[1][i+1]['TFD'],
        tmp_o_y_ACTU = tmp_o_y_ACTU + response.data[1][i+1]['ACTU'],
        tmp_o_y_RAC = tmp_o_y_RAC + response.data[1][i+1]['RAC'],
        tmp_e_y_CH = tmp_e_y_CH + response.data[2][i+1]['CH'],
        tmp_e_y_SIMU = tmp_e_y_SIMU + response.data[2][i+1]['SIMU'],
        tmp_e_y_AR = tmp_e_y_AR + response.data[2][i+1]['AR'],
        tmp_e_y_TFD = tmp_e_y_TFD + response.data[2][i+1]['TFD'],
        tmp_e_y_ACTU = tmp_e_y_ACTU + response.data[2][i+1]['ACTU'],
        tmp_e_y_RAC = tmp_e_y_RAC + response.data[2][i+1]['RAC']
      }
      this.setState({
        chipdataWY: {
          CH: tmp_w_y_CH,
          SIMU: tmp_w_y_SIMU,
          AR: tmp_w_y_AR,
          TFD: tmp_w_y_TFD,
          ACTU: tmp_w_y_ACTU,
          RAC: tmp_w_y_RAC
        },
        chipdataOgY: {
          CH: tmp_o_y_CH,
          SIMU: tmp_o_y_SIMU,
          AR: tmp_o_y_AR,
          TFD: tmp_o_y_TFD,
          ACTU: tmp_o_y_ACTU,
          RAC: tmp_o_y_RAC
        },
        chipdatafY: {
          CH: tmp_e_y_CH,
          SIMU: tmp_e_y_SIMU,
          AR: tmp_e_y_AR,
          TFD: tmp_e_y_TFD,
          ACTU: tmp_e_y_ACTU,
          RAC: tmp_e_y_RAC
        }
      })
    })
  }

  getTrimData(Trim, newYear) {
    axios.get(global.config.server_url + "/getPrestation?year=" + newYear, Config).then(response => {
      let tmp_w_CH = 0
      let tmp_w_SIMU = 0
      let tmp_w_AR = 0
      let tmp_w_TFD = 0
      let tmp_w_ACTU = 0
      let tmp_w_RAC = 0
      let tmp_o_CH = 0
      let tmp_o_SIMU = 0
      let tmp_o_AR = 0
      let tmp_o_TFD = 0
      let tmp_o_ACTU = 0
      let tmp_o_RAC = 0
      let tmp_e_CH = 0
      let tmp_e_SIMU = 0
      let tmp_e_AR = 0
      let tmp_e_TFD = 0
      let tmp_e_ACTU = 0
      let tmp_e_RAC = 0
      if (Trim == "Trimestre 1") {
        for (let i = 0; i < 3; i++) {
          tmp_w_CH = tmp_w_CH + response.data[0][i+1]['CH'],
          tmp_w_SIMU = tmp_w_SIMU + response.data[0][i+1]['SIMU'],
          tmp_w_AR = tmp_w_AR + response.data[0][i+1]['AR'],
          tmp_w_TFD = tmp_w_TFD + response.data[0][i+1]['TFD'],
          tmp_w_ACTU = tmp_w_ACTU + response.data[0][i+1]['ACTU'],
          tmp_w_RAC = tmp_w_RAC + response.data[0][i+1]['RAC'],
          tmp_o_CH = tmp_o_CH + response.data[1][i+1]['CH'],
          tmp_o_SIMU = tmp_o_SIMU + response.data[1][i+1]['SIMU'],
          tmp_o_AR = tmp_o_AR + response.data[1][i+1]['AR'],
          tmp_o_TFD = tmp_o_TFD + response.data[1][i+1]['TFD'],
          tmp_o_ACTU = tmp_o_ACTU + response.data[1][i+1]['ACTU'],
          tmp_o_RAC = tmp_o_RAC + response.data[1][i+1]['RAC'],
          tmp_e_CH = tmp_e_CH + response.data[2][i+1]['CH'],
          tmp_e_SIMU = tmp_e_SIMU + response.data[2][i+1]['SIMU'],
          tmp_e_AR = tmp_e_AR + response.data[2][i+1]['AR'],
          tmp_e_TFD = tmp_e_TFD + response.data[2][i+1]['TFD'],
          tmp_e_ACTU = tmp_e_ACTU + response.data[2][i+1]['ACTU'],
          tmp_e_RAC = tmp_e_RAC + response.data[2][i+1]['RAC']
        }
      } else if (Trim == "Trimestre 2") {
        for (let i = 3; i < 6; i++) {
          tmp_w_CH = tmp_w_CH + response.data[0][i+1]['CH'],
          tmp_w_SIMU = tmp_w_SIMU + response.data[0][i+1]['SIMU'],
          tmp_w_AR = tmp_w_AR + response.data[0][i+1]['AR'],
          tmp_w_TFD = tmp_w_TFD + response.data[0][i+1]['TFD'],
          tmp_w_ACTU = tmp_w_ACTU + response.data[0][i+1]['ACTU'],
          tmp_w_RAC = tmp_w_RAC + response.data[0][i+1]['RAC'],
          tmp_o_CH = tmp_o_CH + response.data[1][i+1]['CH'],
          tmp_o_SIMU = tmp_o_SIMU + response.data[1][i+1]['SIMU'],
          tmp_o_AR = tmp_o_AR + response.data[1][i+1]['AR'],
          tmp_o_TFD = tmp_o_TFD + response.data[1][i+1]['TFD'],
          tmp_o_ACTU = tmp_o_ACTU + response.data[1][i+1]['ACTU'],
          tmp_o_RAC = tmp_o_RAC + response.data[1][i+1]['RAC'],
          tmp_e_CH = tmp_e_CH + response.data[2][i+1]['CH'],
          tmp_e_SIMU = tmp_e_SIMU + response.data[2][i+1]['SIMU'],
          tmp_e_AR = tmp_e_AR + response.data[2][i+1]['AR'],
          tmp_e_TFD = tmp_e_TFD + response.data[2][i+1]['TFD'],
          tmp_e_ACTU = tmp_e_ACTU + response.data[2][i+1]['ACTU'],
          tmp_e_RAC = tmp_e_RAC + response.data[2][i+1]['RAC']
        }
      } else if (Trim == "Trimestre 3") {
        for (let i = 6; i < 9; i++) {
          tmp_w_CH = tmp_w_CH + response.data[0][i+1]['CH'],
          tmp_w_SIMU = tmp_w_SIMU + response.data[0][i+1]['SIMU'],
          tmp_w_AR = tmp_w_AR + response.data[0][i+1]['AR'],
          tmp_w_TFD = tmp_w_TFD + response.data[0][i+1]['TFD'],
          tmp_w_ACTU = tmp_w_ACTU + response.data[0][i+1]['ACTU'],
          tmp_w_RAC = tmp_w_RAC + response.data[0][i+1]['RAC'],
          tmp_o_CH = tmp_o_CH + response.data[1][i+1]['CH'],
          tmp_o_SIMU = tmp_o_SIMU + response.data[1][i+1]['SIMU'],
          tmp_o_AR = tmp_o_AR + response.data[1][i+1]['AR'],
          tmp_o_TFD = tmp_o_TFD + response.data[1][i+1]['TFD'],
          tmp_o_ACTU = tmp_o_ACTU + response.data[1][i+1]['ACTU'],
          tmp_o_RAC = tmp_o_RAC + response.data[1][i+1]['RAC'],
          tmp_e_CH = tmp_e_CH + response.data[2][i+1]['CH'],
          tmp_e_SIMU = tmp_e_SIMU + response.data[2][i+1]['SIMU'],
          tmp_e_AR = tmp_e_AR + response.data[2][i+1]['AR'],
          tmp_e_TFD = tmp_e_TFD + response.data[2][i+1]['TFD'],
          tmp_e_ACTU = tmp_e_ACTU + response.data[2][i+1]['ACTU'],
          tmp_e_RAC = tmp_e_RAC + response.data[2][i+1]['RAC']
        }
      } else if (Trim == "Trimestre 4"){
        for (let i = 9; i < 12; i++) {
          tmp_w_CH = tmp_w_CH + response.data[0][i+1]['CH'],
          tmp_w_SIMU = tmp_w_SIMU + response.data[0][i+1]['SIMU'],
          tmp_w_AR = tmp_w_AR + response.data[0][i+1]['AR'],
          tmp_w_TFD = tmp_w_TFD + response.data[0][i+1]['TFD'],
          tmp_w_ACTU = tmp_w_ACTU + response.data[0][i+1]['ACTU'],
          tmp_w_RAC = tmp_w_RAC + response.data[0][i+1]['RAC'],
          tmp_o_CH = tmp_o_CH + response.data[1][i+1]['CH'],
          tmp_o_SIMU = tmp_o_SIMU + response.data[1][i+1]['SIMU'],
          tmp_o_AR = tmp_o_AR + response.data[1][i+1]['AR'],
          tmp_o_TFD = tmp_o_TFD + response.data[1][i+1]['TFD'],
          tmp_o_ACTU = tmp_o_ACTU + response.data[1][i+1]['ACTU'],
          tmp_o_RAC = tmp_o_RAC + response.data[1][i+1]['RAC'],
          tmp_e_CH = tmp_e_CH + response.data[2][i+1]['CH'],
          tmp_e_SIMU = tmp_e_SIMU + response.data[2][i+1]['SIMU'],
          tmp_e_AR = tmp_e_AR + response.data[2][i+1]['AR'],
          tmp_e_TFD = tmp_e_TFD + response.data[2][i+1]['TFD'],
          tmp_e_ACTU = tmp_e_ACTU + response.data[2][i+1]['ACTU'],
          tmp_e_RAC = tmp_e_RAC + response.data[2][i+1]['RAC']
        }
      }
      this.setState({
        chipdataWTrim: {
          CH: tmp_w_CH,
          SIMU: tmp_w_SIMU,
          AR: tmp_w_AR,
          TFD: tmp_w_TFD,
          ACTU: tmp_w_ACTU,
          RAC: tmp_w_RAC
        },
        chipdataOgTrim: {
          CH: tmp_o_CH,
          SIMU: tmp_o_SIMU,
          AR: tmp_o_AR,
          TFD: tmp_o_TFD,
          ACTU: tmp_o_ACTU,
          RAC: tmp_o_RAC
        },
        chipdatafTrim: {
          CH: tmp_e_CH,
          SIMU: tmp_e_SIMU,
          AR: tmp_e_AR,
          TFD: tmp_e_TFD,
          ACTU: tmp_e_ACTU,
          RAC: tmp_e_RAC,
        }
      })
    })
  }

  getMonthdata(toCompare) {
    let i = 0;
    while (toCompare != FrenchMonth[i]) {
      i++;
    }
    i++;
    axios.get(global.config.server_url + "/getPrestation?year=" + this.state.year, Config).then(response => {
      this.setState({
        chipdataW: {
          CH: response.data[0][i]['CH'],
          SIMU: response.data[0][i]['SIMU'],
          AR: response.data[0][i]['AR'],
          TFD: response.data[0][i]['TFD'],
          ACTU: response.data[0][i]['ACTU'],
          RAC: response.data[0][i]['RAC']
        },
        chipdataOg: {
          CH: response.data[1][i]['CH'],
          SIMU: response.data[1][i]['SIMU'],
          AR: response.data[1][i]['AR'],
          TFD: response.data[1][i]['TFD'],
          ACTU: response.data[1][i]['ACTU'],
          RAC: response.data[1][i]['RAC']
        },
        chipdataf: {
          CH: response.data[2][i]['CH'],
          SIMU: response.data[2][i]['SIMU'],
          AR: response.data[2][i]['AR'],
          TFD: response.data[2][i]['TFD'],
          ACTU: response.data[2][i]['ACTU'],
          RAC: response.data[2][i]['RAC']
        },
        onGoing: response.data[1],
        finish: response.data[2],
        monthb: i,
      })
    })
  }

  getPrestation(year) {
    axios.get(global.config.server_url + "/getPrestation?year=" + year, Config).then(response => {
      this.setState({
        prestation: response.data,
      })
    })
  }
  render() {
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
                  this.getMonthdata(this.state.month)
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
                Annes
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
              <div className="title-section" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginTop: '10px', display: 'inline-block', }}>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getPrestation(e.target.value)}>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                  </Input>
                </div>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{ width: '120px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getMonthdata(e.target.value) | this.setState({month: e.target.value})}>
                    <option>janvier</option><option>février</option><option>mars</option>
                    <option>avril</option><option>mai</option><option>juin</option>
                    <option>juillet</option><option>août</option><option>septembre</option>
                    <option>octobre</option><option>novembre</option><option>décembre</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: '100%' }} className='form-inline mt-1'>
                <div>
                  <h4>En Attente</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          width='40px'
                          color={chipColors[data.type]}
                          text={data.type}
                        />
                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataW[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
                <div className='ml-3'>
                  <h4>En Cours</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          color={chipColors[data.type]}
                          text={data.type}
                        />

                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataOg[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
                <div className='ml-3'>
                  <h4>Termine</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          width='40px'
                          color={chipColors[data.type]}
                          text={data.type}
                        />
                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataf[data.type]}</h2>
                      </div>
                    ))}
                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="2">
              <div className="title-section" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginTop: '10px', display: 'inline-block', }}>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getPrestation(e.target.value) | this.setState({year: e.target.value})}>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                  </Input>
                </div>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '130px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getTrimData(e.target.value, this.state.year) | this.setState({trim: e.target.value})}>
                    <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                    <option>Trimestre 4</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: '100%' }} className='form-inline mt-1'>
                <div>
                  <h4>En Attente</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          width='40px'
                          color={chipColors[data.type]}
                          text={data.type}
                        />
                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataWTrim[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
                <div className='ml-3'>
                  <h4>En Cours</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          color={chipColors[data.type]}
                          text={data.type}
                        />

                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataOgTrim[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
                <div className='ml-3'>
                  <h4>Termine</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          width='40px'
                          color={chipColors[data.type]}
                          text={data.type}
                        />
                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdatafTrim[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="3">
              <div className="title-section" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginTop: '10px', display: 'inline-block', }}>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getYearData(e.target.value) | this.setState({year: e.target.value})}>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: '100%' }} className='form-inline mt-1'>
                <div>
                  <h4>En Attente</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          width='40px'
                          color={chipColors[data.type]}
                          text={data.type}
                        />
                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataWY[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
                <div className='ml-3'>
                  <h4>En Cours</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          color={chipColors[data.type]}
                          text={data.type}
                        />

                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdataOgY[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
                  </div>
                </div>
                <div className='ml-3'>
                  <h4>Termine</h4>
                  <div className="title-section" style={{ textAlign: 'center', marginTop: '10px', display: 'inline-block', float: 'left' }}>
                    {chipType.map(data => (
                      <div className='form-inline mt-1'>
                        <Chip
                          className="d-flex text-center ml-2"
                          width='40px'
                          color={chipColors[data.type]}
                          text={data.type}
                        />
                        <h2 className="text-bold-600 d-flex text-center ml-2">{this.state.chipdatafY[data.type]}</h2>
                      </div>
                    ))}

                    {/* <h2 className="text-bold-600 mt-1 mb-25">
                            <NumberFormat value={this.state.prestation} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                          </h2> */}
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
export default PrestationStatistics
