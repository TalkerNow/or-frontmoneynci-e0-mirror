import React from "react"
import { Users } from "react-feather"
//import axios from "axios";
import {Card, CardBody} from "reactstrap";
import Chart from "react-apexcharts";

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
class ClientCard extends React.Component {
  render() {
    return (
        <Card>
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
            <div className="icon-section">
              <div
                  className={`avatar avatar-stats p-50 m-0 ${
                      this.props.iconBg
                          ? `bg-rgba-${this.props.iconBg}`
                          : "bg-rgba-primary"
                  }`}
              >
                <div className="avatar-content">
                  <Users className="primary" size={22} />
                </div>
              </div>
            </div>
            <div className="title-section" style={{textAlign:'center'}}>
              <h2 className="text-bold-600 mt-1 mb-25">{this.props.clients_count}</h2>
              <p className="mb-0">Clients</p>
            </div>
          </CardBody>
          {!this.props.hideChart && (
              <Chart
                  options={card_properties}
                  series={[
                    {
                      name: "Clients",
                      data: this.props.clients_count_list
                    }
                  ]}
                  type="area"
                  height={this.props.height ? this.props.height : 100}
              />
          )}
        </Card>
    )
  }
}
export default ClientCard
