import React from "react"
import { Card, CardHeader, CardTitle, CardBody, Input } from "reactstrap"
import Chart from "react-apexcharts"
import axios from "axios";


const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token")
  }
}



class RevenueGraph extends React.Component {
  state = {
    lst_solde_amount: [],
    lst_acompte_amount: [],
    options: {
      chart: {
        stacked: false,
        toolbar: { show: true }
      },
      plotOptions: {
        bar: {
          columnWidth: '50%',
          endingShape: 'rounded'
        },
        distributed: true
      },
      colors: [this.props.primary, '#ff8510'],
      dataLabels: {
        enabled: false
      },
      grid: {
        borderColor: this.props.labelColor,
        padding: {
          top: -20,
          bottom: -10
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        offsetX: 0,
        fontSize: "14px",
        markers: {
          radius: 50,
          width: 10,
          height: 10
        }
      },
      xaxis: {
        labels: {
          style: {
            colors: this.props.strokeColor,
            fontSize: '0.86rem'
          }
        },
        axisTicks: {
          show: false
        },
        categories: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec"
        ],
        axisBorder: {
          show: false
        }
      },
      yaxis: {
        tickAmount: 8,
        labels: {
          style: {
            color: this.props.strokeColor
          }
        }
      },

      tooltip: {
        x: { show: false }
      }
    },
    series: [
      {
        name: "Acomptes",
        type: 'column',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        name: "Soldes",
        type: 'column',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    ]
  }

  onChangeYear(year) {
    axios.get(global.config.server_url + "/get_statistics_total_income?year=" + year, Config).then(response => {
      let acomptelist = [];
      let soldlist = [];
      for (let i = 0; i < 12; i++) {
        acomptelist[i] = response.data[i + 1]['current_acompte_amount'];
        soldlist[i] = response.data[i + 1]['current_solde_amount'];
      }
      this.setState({
        series: [
          {
            name: "Soldes",
            data: soldlist
          },
          {
            name: "Acomptes",
            data: acomptelist
          }
        ]
      })
    })
  }

  async componentDidMount() {

    await axios.get(global.config.server_url + "/get_statistics_total_income", Config).then(response => {
      let acomptelist = [];
      let soldlist = [];
      for (let i = 0; i < 12; i++) {
        acomptelist[i] = response.data[i + 1]['current_acompte_amount'];
        soldlist[i] = response.data[i + 1]['current_solde_amount'];
      }
      this.setState({
        series: [
          {
            name: "Soldes",
            data: soldlist
          },
          {
            name: "Acomptes",
            data: acomptelist
          }
        ]
      })
    })
  }
  render() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Report</CardTitle>
          <div className="title-section" style={{ textAlign: 'celter', margin: 'left', display: 'inline-block', }}>
            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
              <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{ width: '75px', marginLeft: 'auto', marginRight: 'auto', fontSize: '17px' }}
                onChange={e => this.onChangeYear(e.target.value)}>
                <option>2018</option><option>2019</option><option>2020</option>
                <option>2021</option><option>2022</option><option>2023</option>
                <option>2024</option><option>2025</option><option>2026</option>
                <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
              </Input>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Chart
            options={this.state.options}
            series={this.state.series}
            type="bar"
            height={290}
            id="client-retention-chart"
          />
        </CardBody>
      </Card>
    )
  }
}
export default RevenueGraph
