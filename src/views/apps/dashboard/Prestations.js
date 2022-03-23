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
import ReactApexChart from "react-apexcharts";



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
    month: null,
    monthb: 0,
    prestation: null,
    options: {
      chart: {
        width: 100,
        type: 'pie',
        responsive: true,
      },
      colors: ['#f39130', '#28c76f', '#7367f0', '#ea5455', '#44d9e6', '#ffdf5d'],
      labels: ['CH', 'SIMU', 'AR', 'TFD', 'ACTU', 'RAC'],
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom',
          }
        }
      }]
    },
    seriesW: [0, 0, 0, 0, 0, 0],
    seriesOg: [0, 0, 0, 0, 0, 0],
    seriesF: [0, 0, 0, 0, 0, 0],
    seriesTW: [0, 0, 0, 0, 0, 0],
    seriesTOg: [0, 0, 0, 0, 0, 0],
    seriesTF: [0, 0, 0, 0, 0, 0],
    seriesYW: [0, 0, 0, 0, 0, 0],
    seriesYOg: [0, 0, 0, 0, 0, 0],
    seriesYF: [0, 0, 0, 0, 0, 0],
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
    this.setState({ month: FrenchMonth[tmp.getMonth()] })
    this.setState({ monthb: tmp.getMonth() })
    this.setState({ year: tmp.getFullYear() })
    await axios.get(global.config.server_url + "/getPrestation", Config).then(response => {
      this.setState({
        prestation: response.data,
        seriesW: [
          response.data[0][this.state.monthb + 1]['CH'],
          response.data[0][this.state.monthb + 1]['SIMU'],
          response.data[0][this.state.monthb + 1]['AR'],
          response.data[0][this.state.monthb + 1]['TFD'],
          response.data[0][this.state.monthb + 1]['ACTU'],
          response.data[0][this.state.monthb + 1]['RAC']
        ],
        seriesOg: [
          response.data[1][this.state.monthb + 1]['CH'],
          response.data[1][this.state.monthb + 1]['SIMU'],
          response.data[1][this.state.monthb + 1]['AR'],
          response.data[1][this.state.monthb + 1]['TFD'],
          response.data[1][this.state.monthb + 1]['ACTU'],
          response.data[1][this.state.monthb + 1]['RAC']
        ],
        seriesF: [
          response.data[2][this.state.monthb + 1]['CH'],
          response.data[2][this.state.monthb + 1]['SIMU'],
          response.data[2][this.state.monthb + 1]['AR'],
          response.data[2][this.state.monthb + 1]['TFD'],
          response.data[2][this.state.monthb + 1]['ACTU'],
          response.data[2][this.state.monthb + 1]['RAC']
        ],
      })
    })
  }

  getYearData(newYear) {
    axios.get(global.config.server_url + "/getPrestation?year=" + newYear, Config).then(response => {
      let tmp_w_y_CH = 0
      let tmp_w_y_SIMU = 0
      let tmp_w_y_AR = 0
      let tmp_w_y_TFD = 0
      let tmp_w_y_ACTU = 12
      let tmp_w_y_RAC = 12
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
        tmp_w_y_CH = tmp_w_y_CH + response.data[0][i + 1]['CH'],
          tmp_w_y_SIMU = tmp_w_y_SIMU + response.data[0][i + 1]['SIMU'],
          tmp_w_y_AR = tmp_w_y_AR + response.data[0][i + 1]['AR'],
          tmp_w_y_TFD = tmp_w_y_TFD + response.data[0][i + 1]['TFD'],
          tmp_w_y_ACTU = tmp_w_y_ACTU + response.data[0][i + 1]['ACTU'],
          tmp_w_y_RAC = tmp_w_y_RAC + response.data[0][i + 1]['RAC'],
          tmp_o_y_CH = tmp_o_y_CH + response.data[1][i + 1]['CH'],
          tmp_o_y_SIMU = tmp_o_y_SIMU + response.data[1][i + 1]['SIMU'],
          tmp_o_y_AR = tmp_o_y_AR + response.data[1][i + 1]['AR'],
          tmp_o_y_TFD = tmp_o_y_TFD + response.data[1][i + 1]['TFD'],
          tmp_o_y_ACTU = tmp_o_y_ACTU + response.data[1][i + 1]['ACTU'],
          tmp_o_y_RAC = tmp_o_y_RAC + response.data[1][i + 1]['RAC'],
          tmp_e_y_CH = tmp_e_y_CH + response.data[2][i + 1]['CH'],
          tmp_e_y_SIMU = tmp_e_y_SIMU + response.data[2][i + 1]['SIMU'],
          tmp_e_y_AR = tmp_e_y_AR + response.data[2][i + 1]['AR'],
          tmp_e_y_TFD = tmp_e_y_TFD + response.data[2][i + 1]['TFD'],
          tmp_e_y_ACTU = tmp_e_y_ACTU + response.data[2][i + 1]['ACTU'],
          tmp_e_y_RAC = tmp_e_y_RAC + response.data[2][i + 1]['RAC']
      }
      this.setState({
        seriesYW: [
          tmp_w_y_CH,
          tmp_w_y_SIMU,
          tmp_w_y_AR,
          tmp_w_y_TFD,
          tmp_w_y_ACTU,
          tmp_w_y_RAC
        ],
        seriesYOg: [
          tmp_o_y_CH,
          tmp_o_y_SIMU,
          tmp_o_y_AR,
          tmp_o_y_TFD,
          tmp_o_y_ACTU,
          tmp_o_y_RAC
        ],
        seriesYF: [
          tmp_e_y_CH,
          tmp_e_y_SIMU,
          tmp_e_y_AR,
          tmp_e_y_TFD,
          tmp_e_y_ACTU,
          tmp_e_y_RAC,
        ],
        year: newYear,
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
      let i = 0
      if (Trim == "Trimestre 1") {
        i = 0
      } else if (Trim == "Trimestre 2") {
        i = 3
      } else if (Trim == "Trimestre 3") {
        i = 6
      } else if (Trim == "Trimestre 4") {
        i = 9
      }
      let j = i + 3
      while (i != j) {
        tmp_w_CH = tmp_w_CH + response.data[0][i + 1]['CH'],
          tmp_w_SIMU = tmp_w_SIMU + response.data[0][i + 1]['SIMU'],
          tmp_w_AR = tmp_w_AR + response.data[0][i + 1]['AR'],
          tmp_w_TFD = tmp_w_TFD + response.data[0][i + 1]['TFD'],
          tmp_w_ACTU = tmp_w_ACTU + response.data[0][i + 1]['ACTU'],
          tmp_w_RAC = tmp_w_RAC + response.data[0][i + 1]['RAC'],
          tmp_o_CH = tmp_o_CH + response.data[1][i + 1]['CH'],
          tmp_o_SIMU = tmp_o_SIMU + response.data[1][i + 1]['SIMU'],
          tmp_o_AR = tmp_o_AR + response.data[1][i + 1]['AR'],
          tmp_o_TFD = tmp_o_TFD + response.data[1][i + 1]['TFD'],
          tmp_o_ACTU = tmp_o_ACTU + response.data[1][i + 1]['ACTU'],
          tmp_o_RAC = tmp_o_RAC + response.data[1][i + 1]['RAC'],
          tmp_e_CH = tmp_e_CH + response.data[2][i + 1]['CH'],
          tmp_e_SIMU = tmp_e_SIMU + response.data[2][i + 1]['SIMU'],
          tmp_e_AR = tmp_e_AR + response.data[2][i + 1]['AR'],
          tmp_e_TFD = tmp_e_TFD + response.data[2][i + 1]['TFD'],
          tmp_e_ACTU = tmp_e_ACTU + response.data[2][i + 1]['ACTU'],
          tmp_e_RAC = tmp_e_RAC + response.data[2][i + 1]['RAC']
        i++
      }
      this.setState({
        seriesTW: [
          tmp_w_CH,
          tmp_w_SIMU,
          tmp_w_AR,
          tmp_w_TFD,
          tmp_w_ACTU,
          tmp_w_RAC
        ],
        seriesTOg: [
          tmp_o_CH,
          tmp_o_SIMU,
          tmp_o_AR,
          tmp_o_TFD,
          tmp_o_ACTU,
          tmp_o_RAC
        ],
        seriesTF: [
          tmp_e_CH,
          tmp_e_SIMU,
          tmp_e_AR,
          tmp_e_TFD,
          tmp_e_ACTU,
          tmp_e_RAC,
        ],
        year: newYear,
        trim: Trim,
      })
    })
  }

  getMonthdata(toCompare, newYear) {
    let i = 0;
    while (toCompare != FrenchMonth[i]) {
      i += 1;
    }
    axios.get(global.config.server_url + "/getPrestation?year=" + newYear, Config).then(response => {
      this.setState({
        seriesW: [
          response.data[0][i + 1]['CH'],
          response.data[0][i + 1]['SIMU'],
          response.data[0][i + 1]['AR'],
          response.data[0][i + 1]['TFD'],
          response.data[0][i + 1]['ACTU'],
          response.data[0][i + 1]['RAC']
        ],
        seriesOg: [
          response.data[1][i + 1]['CH'],
          response.data[1][i + 1]['SIMU'],
          response.data[1][i + 1]['AR'],
          response.data[1][i + 1]['TFD'],
          response.data[1][i + 1]['ACTU'],
          response.data[1][i + 1]['RAC']
        ],
        seriesF: [
          response.data[2][i + 1]['CH'],
          response.data[2][i + 1]['SIMU'],
          response.data[2][i + 1]['AR'],
          response.data[2][i + 1]['TFD'],
          response.data[2][i + 1]['ACTU'],
          response.data[2][i + 1]['RAC']
        ],
        year: newYear,
        month: FrenchMonth[i],
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
                  this.getMonthdata(this.state.month, this.state.year)
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
              <div className="title-section" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginTop: '10px', display: 'inline-block', }}>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={this.state.year} key={this.state.year} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getMonthdata(this.state.month, e.target.value)}>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                  </Input>
                </div>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{ width: '120px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getMonthdata(e.target.value, this.state.year)}>
                    <option>janvier</option><option>février</option><option>mars</option>
                    <option>avril</option><option>mai</option><option>juin</option>
                    <option>juillet</option><option>août</option><option>septembre</option>
                    <option>octobre</option><option>novembre</option><option>décembre</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: '100%' }} className='form-inline mt-1 mb-1'>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-4 d-flex justify-content-sm-center'>En Attente</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesW} type="pie" width={400} />
                  </div>
                </div>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-4 d-flex justify-content-sm-center'>En Cours</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesOg} type="pie" width={400} />
                  </div>
                </div>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-5 d-flex justify-content-sm-center'>Termine</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesF} type="pie" width={400} />
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="2">
              <div className="title-section" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginTop: '10px', display: 'inline-block', }}>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={this.state.year} key={this.state.year} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getTrimData(this.state.trim, e.target.value)}>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
                  </Input>
                </div>
                <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                  <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '130px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                    onChange={e => this.getTrimData(e.target.value, this.state.year)}>
                    <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                    <option>Trimestre 4</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: '100%' }} className='form-inline mt-1 mb-1'>
                <div className='ml-3  mt-1'>
                  <h4 className='w-50 ml-4 d-flex justify-content-sm-center'>En Attente</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesTW} type="pie" width={400} />
                  </div>
                </div>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-4 d-flex justify-content-sm-center'>En Cours</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesTOg} type="pie" width={400} />
                  </div>
                </div>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-5 d-flex justify-content-sm-center'>Termine</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesTF} type="pie" width={400} />
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="3">
              <div className="title-section" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', marginTop: '10px', display: 'inline-block' }}>
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
              <div style={{ width: '100%' }} className='form-inline mt-1 mb-1'>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-4 d-flex justify-content-sm-center'>En Attente</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesYW} type="pie" width={400} />
                  </div>
                </div>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-4 d-flex justify-content-sm-center'>En Cours</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesYOg} type="pie" width={400} />
                  </div>
                </div>
                <div className='ml-3 mt-1'>
                  <h4 className='w-50 ml-5 d-flex justify-content-sm-center'>Termine</h4>
                  <div id="chart">
                    <ReactApexChart key={this.state.activeTab} options={this.state.options} series={this.state.seriesYF} type="pie" width={400} />
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
