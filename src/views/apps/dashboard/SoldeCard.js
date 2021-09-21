import React from "react"
//import StatisticsCard from "./StatisticsCard"
import {CreditCard} from "react-feather"
//import axios from "axios";
import {Card, CardBody} from "reactstrap";
//import Chart from "react-apexcharts";
import { default as NumberFormat } from 'react-number-format';

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
  colors: ["#EA5455"],
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
class SoldeCard extends React.Component {

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
                  className="avatar avatar-stats p-50 m-0 bg-rgba-danger"
              >
                <div className="avatar-content">
                  <CreditCard className="danger" size={22} />
                </div>
              </div>
            </div>
            <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto'}}>
              <h2 className="text-bold-600 mt-1 mb-25">
                <NumberFormat value={this.props.solde_amount + this.props.acompte_amount} displayType={'text'} thousandSeparator={true} prefix={'€'} />
              </h2>
              <p className="mb-0">Chiffre d'affaire</p>
            </div>
          </CardBody>
        </Card>
    )
  }
}
export default SoldeCard
