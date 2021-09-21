import React from "react"
import {DollarSign} from "react-feather"
import axios from "axios";
import {Button, Card, CardBody, Input} from "reactstrap";
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
class YearRevenue extends React.Component {

  state = {
    total_amount:0
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
                  <DollarSign className="success" size={22} />
                </div>
              </div>
            </div>
            <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'40px'}}>
              <Input type="select" name="select" id="role" defaultValue={2021} style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                     onChange={e => this.onChangeYear(e.target.value)}>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
              </Input>
              <h2 className="text-bold-600 mt-1 mb-25">
                <NumberFormat value={this.state.total_amount} displayType={'text'} thousandSeparator={true} prefix={'€'} />
              </h2>
              <p className="mt-1 mb-25">Total Income</p>
              <Button.Ripple className="mr-1" color="primary" type="submit" style={{marginTop:'20px',width:'200px',marginLeft:'20px'}}
                 onClick={() => history.push("/payment/paymentlist")}
              >
                  See Details
              </Button.Ripple>
            </div>
          </CardBody>
        </Card>
    )
  }
}
export default YearRevenue
