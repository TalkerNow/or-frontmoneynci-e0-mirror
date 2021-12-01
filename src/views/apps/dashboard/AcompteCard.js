import React from "react"
//import StatisticsCard from "./StatisticsCard"
//import {DollarSign} from "react-feather"
import axios from "axios";
import {Card, CardBody, Input} from "reactstrap";
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
  colors: ["#28C76F"],
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
const FrenchMonth = ['janvier', 'février', 'mars', 'avril','mai','juin','juillet','août',
                    'septembre','octobre','novembre', 'décembre'];

class AcompteCard extends React.Component {
  state = {
    month: null,
    year: null,
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
  }
  async componentDidMount() {
    let tmp = new Date();
    this.setState({ month: tmp.getMonth()})
    this.setState({ year: tmp.getFullYear()})
    this.setState({
      clients_count: this.props.clients_count,
      clients_count_list: this.props.clients_count_list,
      current_total_count: this.props.current_total_count,
      current_total_amount: this.props.current_total_amount,
      total_ended_count: this.props.total_ended_count,
      total_ended_amount: this.props.total_ended_amount,
      current_acompte_count: this.props.current_acompte_count,
      current_acompte_amount: this.props.current_acompte_amount,
      current_solde_count: this.props.current_solde_count,
      current_solde_amount: this.props.current_solde_amount,
      opportunite_count: this.props.opportunite_count,
      opportunite_amount: this.props.opportunite_amount,
    })
    await axios.get(global.config.server_url + "/get_statistics_total_income?year="+tmp.getFullYear()+'&month='+FrenchMonth[tmp.getMonth()], Config).then(response => {
      this.setState({
        
          clients_count: response.data.clients_count,
          clients_count_list: response.data.clients_count_list,
          current_total_count: response.data.current_total_count,
          current_total_amount: response.data.current_total_amount,
          total_ended_count: response.data.total_ended_count,
          total_ended_amount: response.data.total_ended_amount,
          current_acompte_count: response.data.current_acompte_count,
          current_acompte_amount: response.data.current_acompte_amount,
          current_solde_count: response.data.current_solde_count,
          current_solde_amount: response.data.current_solde_amount,
          opportunite_count: response.data.opportunite_count,
          opportunite_amount: response.data.opportunite_amount,
        }) // ! replace by good value
    })
  }
  // TODO adapt to this card make the request to the good adress
  onChangeDate(year, month) {
    axios.get(global.config.server_url + "/get_statistics_total_income?year="+year+"&month="+month, Config).then(response => {
        this.setState({
          clients_count: response.data.clients_count,
          clients_count_list: response.data.clients_count_list,
          current_total_count: response.data.current_total_count,
          current_total_amount: response.data.current_total_amount,
          total_ended_count: response.data.total_ended_count,
          total_ended_amount: response.data.total_ended_amount,
          current_acompte_count: response.data.current_acompte_count,
          current_acompte_amount: response.data.current_acompte_amount,
          current_solde_count: response.data.current_solde_count,
          current_solde_amount: response.data.current_solde_amount,
          opportunite_count: response.data.opportunite_count,
          opportunite_amount: response.data.opportunite_amount,
        }) // ! replace by good value
      this.setState({ year: year })
      this.setState({ month: month })
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
            <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
              <div style={{display:'inline-block'}}>
              <Input type="select" name="select" id="role" defaultValue={FrenchMonth[new Date().getMonth()]} style={{width:'130px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                     onChange={e => this.onChangeDate(this.state.year, e.target.value)}>
                    <option>tous</option><option>janvier</option><option>février</option><option>mars</option>
                    <option>avril</option><option>mai</option><option>juin</option>
                    <option>juillet</option><option>août</option><option>septembre</option>
                    <option>octobre</option><option>novembre</option><option>décembre</option>
              </Input>
              </div>
              {/* TODO */}
              <div style={{display:'inline-block', marginLeft:'10px'}}>
              <Input type="select" name="select" id="role" defaultValue={new Date().getFullYear()} style={{width:'80px',marginLeft:'auto',marginRight:'auto',fontSize:'17px'}}
                     onChange={e => this.onChangeDate(e.target.value, this.state.month)}>
                       <option>tous</option>
                    <option>2018</option><option>2019</option><option>2020</option>
                    <option>2021</option><option>2022'</option><option>2023</option>
                    <option>2024</option><option>2025</option><option>2026</option>
                    <option>2027</option><option>2028</option><option>2029</option><option>2030</option>
              </Input>
              </div>
            </div>
            <hr style={{width:'100%', margin: '20px 0 0 0', display: 'block', border: 'none', height: '2px',
                        background: '#7367f0'}} />
            <div className="icon-section">
            <p className="text-decoration-underline text-bold-600 mt-1 mb-25"><u>Chiffre d'affaires en cours</u></p>
            </div>
            <div style={{width:'100%'}}>
              <div className="title-section" style={{textAlign:'center',marginTop:'10px',display:'inline-block',float:'left'}}>
                <p className="mb-0">Total</p>
                <h2 className="text-bold-600 mt-1 mb-25">{this.state.current_total_count}</h2>
                <h2 className="text-bold-600 mt-1 mb-25">
                  <NumberFormat value={this.state.current_total_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                </h2>
              </div>
              <div className="title-section" style={{textAlign:'center',marginTop:'10px',display:'inline-block', marginLeft: '15%' }}>
                <p className="mb-0">Acompte</p>
                <h2 className="text-bold-600 mt-1 mb-25">{ this.state.current_acompte_count}</h2>
                <h2 className="text-bold-600 mt-1 mb-25">
                  <NumberFormat value={this.state.current_acompte_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                </h2>
              </div>
              <div className="title-section" style={{textAlign:'center',marginTop:'10px',display:'inline-block',float:'right'}}>
                <p className="mb-0">Solde</p>
                <h2 className="text-bold-600 mt-1 mb-25">{this.state.current_solde_count}</h2>
                <h2 className="text-bold-600 mt-1 mb-25">
                  <NumberFormat value={this.state.current_solde_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                </h2>
              </div>
            </div>
            <hr style={{width:'100%', margin: '20px 0 0 0', display: 'block', border: 'none', height: '2px',
                        background: '#7367f0'}} />
            <div className="icon-section"  style={{width:'100%'}}>
            <p className="text-bold-600 mt-1 mb-25" style={{display: "inline-block", float:'left'}}><u>Opportunités</u></p>
            <p className="text-bold-600 mt-1 mb-75" style={{display: "inline-block", float: 'right'}}><u>Terminer</u></p>
            </div>
            <div style={{width:'100%'}}>
              <div className="title-section" style={{textAlign:'center',marginTop:'10px',display:'inline-block',float:'left'}}>
                {/* <p className="mb-0">Total CA</p> */}
                <h2 className="text-bold-600 mt-1 mb-25">{this.state.opportunite_count}</h2>
                <h2 className="text-bold-600 mt-1 mb-25">
                  <NumberFormat value={this.state.opportunite_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                </h2>
              </div>
              <div className="title-section" style={{textAlign:'center',marginTop:'10px',display:'inline-block',float:'right'}}>
                {/* <p className="mb-0">Total CA</p> */}
                <h2 className="text-bold-600 mt-1 mb-25">{this.state.total_ended_count}</h2>
                <h2 className="text-bold-600 mt-1 mb-25">
                  <NumberFormat value={this.state.total_ended_amount} displayType={'text'} thousandSeparator={true} suffix={'€'} />
                </h2>
              </div>
            </div>
          </CardBody>
        </Card>
    )
  }
}
export default AcompteCard
