/* eslint-disable */

import React from "react"
import { Row, Col } from "reactstrap"
import ClientCard from "./ClientCard"
import AcompteCard from "./AcompteCard"
import SoldeCard from "./SoldeCard"
import YearRevenue from "./YearRevenue"
import RevenueGraph from "./RevenueGraph"
import "../../../assets/scss/plugins/charts/apex-charts.scss"
import axios from "axios";

let $primary = "#7367F0",
  $success = "#28C76F",
  $danger = "#EA5455",
  $warning = "#FF9F43",
  $primary_light = "#9c8cfc",
  $warning_light = "#FFC085",
  $danger_light = "#f29292",
  $stroke_color = "#b9c3cd",
  $label_color = "#e7eef7"

class Index extends React.Component {
  state = {
    clients_count: 0,
    clients_count_list:[],
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
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }

    await axios.get(global.config.server_url + "/get_statistics", Config).then(response => {
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
      })
    })
  }
  render() {
    return (
      <React.Fragment>
        <Row className="match-height">
          {/* <Col lg="4" md="6" sm="6">
            <ClientCard
                clients_count={this.state.clients_count}
                clients_count_list={this.state.clients_count_list}
            />
          </Col> */}
          <Col lg="4" md="6" sm="6">
            <AcompteCard
                current_total_count={this.state.current_total_count}
                current_total_amount={this.state.current_total_amount}
                total_ended_count={this.state.total_ended_count}
                total_ended_amount={this.state.total_ended_amount}
                current_acompte_count={this.state.current_acompte_count}
                current_acompte_amount={this.state.current_acompte_amount}
                current_solde_count={this.state.current_solde_count}
                current_solde_amount={this.state.current_solde_amount}
                opportunite_count={this.state.opportunite_count}
                opportunite_amount={this.state.opportunite_amount}
                
            />
          </Col>
          
          <Col>
          </Col>
        </Row>
        <Row className="match-height">
          <Col lg="8" md="6" sm="12">
            <RevenueGraph
                strokeColor={$stroke_color}
                primary={$primary}
                danger={$danger}
                labelColor={$label_color}
            />
          </Col>
          {/* <Col lg="4" md="6" sm="12">
            <YearRevenue
                primary={$primary}
                dangerLight={$danger_light}
                strokeColor={$stroke_color}
                labelColor={$label_color}
            />
          </Col> */}
        </Row>
      </React.Fragment>
    )
  }
}

export default Index
/* eslint-disable */

