import React from "react"
import { Card, CardHeader, CardTitle, CardBody } from "reactstrap"
import Chart from "react-apexcharts"
import axios from "axios";

class RevenueGraph extends React.Component {
  state = {
    lst_solde_amount: [],
    lst_acompte_amount:[],
    options: {
      chart: {
        stacked: true,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          columnWidth: '17%',
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
        tickAmount: 5,
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
        data: [175, 125, 225, 175, 160, 189, 206, 134, 159, 216, 148, 123]
      },
      {
        name: "Soldes",
        data: [
          -144,
          -155,
          -141,
          -167,
          -122,
          -143,
          -158,
          -107,
          -126,
          -131,
          -140,
          -137
        ]
      }
    ]
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }

    await axios.get(global.config.server_url + "/get_statistics_per_month", Config).then(response => {
      this.setState({
        series: [
          {
            name: "Acomptes",
            data: response.data.lst_acompte_amount
          },
          {
            name: "Soldes",
            data: response.data.lst_solde_amount
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
