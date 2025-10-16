/* eslint-disable */

import React from "react";
import { Row, Col } from "reactstrap";
import OverallCard from "./OverallData";
import ExpertCard from "./ExpertCard";
import KpiStats from "./KpiStats"; // nouvel import

import RevenueGraph from "./RevenueGraph";
import PrestationStatistics from "./Prestations";
import "../../../assets/scss/plugins/charts/apex-charts.scss";

let $primary = "#7367F0",
  $success = "#28C76F",
  $danger = "#EA5455",
  $warning = "#FF9F43",
  $primary_light = "#9c8cfc",
  $warning_light = "#FFC085",
  $danger_light = "#f29292",
  $stroke_color = "#b9c3cd",
  $label_color = "#e7eef7";

class Index extends React.Component {
  state = {
    clients_count: 0,
    clients_count_list: [],
    current_total_count: 0,
    current_total_amount: 0,
    total_ended_count: 0,
    total_ended_amount: 0,
    current_acompte_count: 0,
    current_acompte_amount: 0,
    current_solde_count: 0,
    current_solde_amount: 0,
    opportunite_count: 0,
    opportunite_amount: 0,
  };
  render() {
    return (
      <React.Fragment>
        <Row className="match-height">
          <Col lg="12" md="6" sm="6">
            <OverallCard
              clients_count={this.state.clients_count}
              clients_count_list={this.state.clients_count_list}
              primary={$primary}
              dangerLight={$danger_light}
              strokeColor={$stroke_color}
              labelColor={$label_color}
            />
          </Col>
          <Col lg="12">
            <KpiStats />
          </Col>
          {/* <Col lg="12" md="6" sm="6">
            <RevenueGraph
              strokeColor={$stroke_color}
              primary={$primary}
              danger={$danger}
              labelColor={$label_color}
            />
          </Col> */}
          <Col lg="12" md="6" sm="6">
            <PrestationStatistics
              primary={$primary}
              dangerLight={$danger_light}
              strokeColor={$stroke_color}
              labelColor={$label_color}
            />
          </Col>
          <Col></Col>
        </Row>
        <Row className="match-height">
          <Col lg="12" md="6" sm="12">
            <ExpertCard
              clients_count={this.state.clients_count}
              clients_count_list={this.state.clients_count_list}
              primary={$primary}
              dangerLight={$danger_light}
              strokeColor={$stroke_color}
              labelColor={$label_color}
            />
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default Index;
/* eslint-disable */
