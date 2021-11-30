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
    acompte_count:0,
    acompte_amount:0,
    solde_count:0,
    solde_amount:0
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
        acompte_count: response.data.acompte_count,
        acompte_amount: response.data.acompte_amount,
        solde_count: response.data.solde_count,
        solde_amount: response.data.solde_amount,
      })
    })
  }
  render() {
    return (
      <React.Fragment>
        <Row className="match-height">
          <Col lg="4" md="6" sm="6">
            <ClientCard
                clients_count={this.state.clients_count}
                clients_count_list={this.state.clients_count_list}
            />
          </Col>
          <Col lg="4" md="6" sm="6">
            <AcompteCard
                acompte_count={this.state.acompte_count}
                acompte_amount={this.state.acompte_amount}
                solde_count={this.state.solde_count}
                solde_amount={this.state.solde_amount}
            />
          </Col>
          {/* <Col lg="4" md="6" sm="6">
            <SoldeCard
                acompte_amount={this.state.acompte_amount}
                solde_amount={this.state.solde_amount}
            />
          </Col> */}
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
          <Col lg="4" md="6" sm="12">
            <YearRevenue
                primary={$primary}
                dangerLight={$danger_light}
                strokeColor={$stroke_color}
                labelColor={$label_color}
            />
          </Col>
        </Row>
      </React.Fragment>
    )
  }
}

export default Index
/* eslint-disable */

