import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from "reactstrap";
import Chart from "react-apexcharts";
import axios from "axios";
import classNames from "classnames";
import { ChevronDown } from "react-feather";

// === TabDropdown réutilisable ===
const TabDropdown = ({ label, valueLabel, children, isOpen, toggle, minWidth = 120 }) => (
  <Dropdown nav inNavbar isOpen={isOpen} toggle={toggle} className="tab-dd">
    <DropdownToggle
      nav caret={false} tag="button" type="button"
      className={classNames("nav-link d-flex align-items-center", { active: isOpen })}
      style={{ color: "#212529", fontWeight: 500, minWidth, height: "1.9rem", lineHeight: 1.2 }}
      aria-haspopup="listbox" aria-expanded={isOpen} title={`${label} — cliquer pour choisir`}
    >
      {valueLabel || label}
      <ChevronDown size={16} className="chev" />
    </DropdownToggle>
    <DropdownMenu>{children}</DropdownMenu>
  </Dropdown>
);

const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token"),
  },
};

// Liste des années
const yearOptions = Array.from({ length: 13 }, (_, i) => 2018 + i); // 2018 → 2030

class RevenueGraph extends React.Component {
  state = {
    year: new Date().getFullYear(),
    openYear: false,
    options: {
      chart: { stacked: false, toolbar: { show: true } },
      plotOptions: { bar: { columnWidth: "50%", endingShape: "rounded" }, distributed: true },
      colors: [this.props.primary, "#ff8510"],
      dataLabels: { enabled: false },
      grid: { borderColor: this.props.labelColor, padding: { top: -20, bottom: -10 } },
      legend: {
        show: true, position: "top", horizontalAlign: "left", offsetX: 0, fontSize: "14px",
        markers: { radius: 50, width: 10, height: 10 },
      },
      xaxis: {
        labels: { style: { colors: this.props.strokeColor, fontSize: "0.86rem" } },
        axisTicks: { show: false },
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        axisBorder: { show: false },
      },
      yaxis: {
        tickAmount: 8,
        labels: {
          style: { color: this.props.strokeColor },
          formatter: (val) =>
            new Intl.NumberFormat("fr-FR", {
              style: "currency", currency: "EUR", maximumFractionDigits: 0,
            }).format(val),
        },
      },
      tooltip: { x: { show: false } },
    },
    series: [
      { name: "Acomptes", type: "column", data: Array(12).fill(0) },
      { name: "Soldes", type: "column", data: Array(12).fill(0) },
    ],
  };

  onChangeYear = (year) => {
    this.setState({ year });
    axios
      .get(`${global.config.server_url}/get_statistics_total_income?year=${year}`, Config)
      .then((response) => {
        let acomptelist = [], soldlist = [];
        for (let i = 0; i < 12; i++) {
          acomptelist[i] = response.data[i + 1]["current_acompte_amount"];
          soldlist[i] = response.data[i + 1]["current_solde_amount"];
        }
        this.setState({
          series: [
            { name: "Soldes", data: soldlist },
            { name: "Acomptes", data: acomptelist },
          ],
        });
      });
  };

  async componentDidMount() {
    await this.onChangeYear(this.state.year);
  }

  render() {
    const { year, openYear } = this.state;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rapport de revenus</CardTitle>
              <TabDropdown
                label="Année"
                valueLabel={String(year)}
                isOpen={openYear}
                toggle={() => this.setState({ openYear: !openYear })}
                minWidth={70}
              >
                {yearOptions.map((y) => (
                  <DropdownItem
                    key={y}
                    active={y === year}
                    onClick={() => {
                      this.setState({ openYear: false });
                      this.onChangeYear(y);
                    }}
                  >
                    {y}
                  </DropdownItem>
                ))}
              </TabDropdown>
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
    );
  }
}

export default RevenueGraph;
