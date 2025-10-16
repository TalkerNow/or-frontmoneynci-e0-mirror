import React from "react";
import { PenTool } from "react-feather";
import axios from "axios";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  CardHeader,
  CardTitle,
  TabPane,
  DropdownItem,
} from "reactstrap";
import classnames from "classnames";
import ReactApexChart from "react-apexcharts";
import TabDropdown from "../../../components/TabDropdown";

// ==== Helpers ISO week ====
function isoWeekInfo(dateInput) {
  const d = new Date(dateInput)
  const day = (d.getDay() + 6) % 7
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - day + 3)
  const isoYear = thursday.getFullYear()
  const firstThursday = new Date(isoYear, 0, 4)
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3)
  const isoWeek = 1 + Math.round((thursday - firstThursday) / (7 * 24 * 3600 * 1000))
  return { isoYear, isoWeek }
}
function isoWeeksInYear(isoYear) {
  const dec28 = new Date(isoYear, 11, 28)
  return isoWeekInfo(dec28).isoWeek
}
function isoWeekStart(isoYear, isoWeek) {
  const simple = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7)
  const dow = (simple.getDay() + 6) % 7
  const monday = new Date(simple)
  monday.setDate(simple.getDate() - dow)
  return monday
}

const FrenchMonth = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
/* eslint-disable */
const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token"),
  },
};
class PrestationStatistics extends React.Component {
  state = {
    year: null,
    total_amount: 0,
    activeTab: "1",
    month: undefined,
    monthb: undefined,
    currentWeek: `W${isoWeekInfo(new Date()).isoWeek}`,
    prestation: null,
    openYear: false,
    openMonth: false,
    openTrim: false,
    openWeek: false,
    options: {
      noData: {
        text: "Pas de données",
        align: "center",
        verticalAlign: "middle",
        offsetX: -20,
        offsetY: 0,
      },
      chart: {
        width: 100,
        type: "pie",
        responsive: true,
      },
      plotOptions: {
        pie: {
          dataLabels: {
            offset: -20,
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "14px",
          fontWeight: "bold",
        },
        dropShadow: {
          enabled: false,
        },
      },
      colors: [
        "#f39130",
        "#28c76f",
        "#7367f0",
        "#ea5455",
        "#44d9e6",
        "#ffdf5d",
      ],
      labels: ["CH", "SIMU", "AR", "TFD", "ACTU", "RAC"],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    },

    seriesW: [0, 0, 0, 0, 0, 0],
    seriesOg: [0, 0, 0, 0, 0, 0],
    seriesF: [0, 0, 0, 0, 0, 0],
    seriesL: [0, 0, 0, 0, 0, 0],
    seriesTW: [0, 0, 0, 0, 0, 0],
    seriesTOg: [0, 0, 0, 0, 0, 0],
    seriesTF: [0, 0, 0, 0, 0, 0],
    seriesTL: [0, 0, 0, 0, 0, 0],
    seriesYW: [0, 0, 0, 0, 0, 0],
    seriesYOg: [0, 0, 0, 0, 0, 0],
    seriesYF: [0, 0, 0, 0, 0, 0],
    seriesYL: [0, 0, 0, 0, 0, 0],
    // Weekly
    seriesWW: [0, 0, 0, 0, 0, 0],
    seriesWOg: [0, 0, 0, 0, 0, 0],
    seriesWF: [0, 0, 0, 0, 0, 0],
    seriesWL: [0, 0, 0, 0, 0, 0],
    trim: "Trimestre 1",
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab,
      });
    }
  };

  async componentDidMount() {
    let tmp = new Date();
    await this.getMonthdata(FrenchMonth[tmp.getMonth()], tmp.getFullYear());
    // initialise the week dropdown to current ISO week
    const { isoWeek, isoYear } = isoWeekInfo(new Date())
    this.setState({ currentWeek: `W${isoWeek}`, year: isoYear })
    // optional: prepare weekly series for current week (doesn't switch tab)
    this.getWeekData(`W${isoWeek}`, isoYear)
    // optional auto-refresh check (daily) to update currentWeek when week changes
    this._weekTimer = setInterval(() => {
      const { isoWeek: w, isoYear: y } = isoWeekInfo(new Date())
      const next = `W${w}`
      if (next !== this.state.currentWeek || y !== this.state.year) {
        this.setState({ currentWeek: next, year: y })
      }
    }, 24 * 60 * 60 * 1000)
  }

  componentWillUnmount() {
    if (this._weekTimer) clearInterval(this._weekTimer)
  }

  async getYearData(newYear) {
    await axios
      .get(global.config.server_url + "/getPrestation?year=" + newYear, Config)
      .then((response) => {
        let responseAsArray = response.data;
        responseAsArray["En attente"] = Object.entries(
          responseAsArray["En attente"]
        );
        responseAsArray["En cours"] = Object.entries(
          responseAsArray["En cours"]
        );
        responseAsArray["Termine"] = Object.entries(responseAsArray["Termine"]);
        responseAsArray["Perdu"] = Object.entries(responseAsArray["Perdu"]);

        this.setState({
          prestation: responseAsArray,
          seriesYW: [
            responseAsArray["En attente"].reduce((acc, elem) => {
              return acc + elem[1]["CH"];
            }, 0),
            responseAsArray["En attente"].reduce((acc, elem) => {
              return acc + elem[1]["SIMU"];
            }, 0),
            responseAsArray["En attente"].reduce((acc, elem) => {
              return acc + elem[1]["AR"];
            }, 0),
            responseAsArray["En attente"].reduce((acc, elem) => {
              return acc + elem[1]["TFD"];
            }, 0),
            responseAsArray["En attente"].reduce((acc, elem) => {
              return acc + elem[1]["ACTU"];
            }, 0),
            responseAsArray["En attente"].reduce((acc, elem) => {
              return acc + elem[1]["RAC"];
            }, 0),
          ],
          seriesYOg: [
            responseAsArray["En cours"].reduce((acc, elem) => {
              return acc + elem[1]["CH"];
            }, 0),
            responseAsArray["En cours"].reduce((acc, elem) => {
              return acc + elem[1]["SIMU"];
            }, 0),
            responseAsArray["En cours"].reduce((acc, elem) => {
              return acc + elem[1]["AR"];
            }, 0),
            responseAsArray["En cours"].reduce((acc, elem) => {
              return acc + elem[1]["TFD"];
            }, 0),
            responseAsArray["En cours"].reduce((acc, elem) => {
              return acc + elem[1]["ACTU"];
            }, 0),
            responseAsArray["En cours"].reduce((acc, elem) => {
              return acc + elem[1]["RAC"];
            }, 0),
          ],
          seriesYF: [
            responseAsArray["Termine"].reduce((acc, elem) => {
              return acc + elem[1]["CH"];
            }, 0),
            responseAsArray["Termine"].reduce((acc, elem) => {
              return acc + elem[1]["SIMU"];
            }, 0),
            responseAsArray["Termine"].reduce((acc, elem) => {
              return acc + elem[1]["AR"];
            }, 0),
            responseAsArray["Termine"].reduce((acc, elem) => {
              return acc + elem[1]["TFD"];
            }, 0),
            responseAsArray["Termine"].reduce((acc, elem) => {
              return acc + elem[1]["ACTU"];
            }, 0),
            responseAsArray["Termine"].reduce((acc, elem) => {
              return acc + elem[1]["RAC"];
            }, 0),
          ],
          seriesYL: [
            responseAsArray["Perdu"].reduce((acc, elem) => {
              return acc + elem[1]["CH"];
            }, 0),
            responseAsArray["Perdu"].reduce((acc, elem) => {
              return acc + elem[1]["SIMU"];
            }, 0),
            responseAsArray["Perdu"].reduce((acc, elem) => {
              return acc + elem[1]["AR"];
            }, 0),
            responseAsArray["Perdu"].reduce((acc, elem) => {
              return acc + elem[1]["TFD"];
            }, 0),
            responseAsArray["Perdu"].reduce((acc, elem) => {
              return acc + elem[1]["ACTU"];
            }, 0),
            responseAsArray["Perdu"].reduce((acc, elem) => {
              return acc + elem[1]["RAC"];
            }, 0),
          ],
          year: newYear,
        });
      });
  }

  async getTrimData(trimester, newYear) {
    if (newYear !== this.state.year) {
      await this.getYearData(newYear);
    }

    let start = (trimester[trimester.length - 1] - 1) * 3;
    let end = start + 2;

    this.setState({
      seriesTW: [
        this.state.prestation["En attente"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["CH"];
          }, 0),
        this.state.prestation["En attente"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["SIMU"];
          }, 0),
        this.state.prestation["En attente"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["AR"];
          }, 0),
        this.state.prestation["En attente"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["TFD"];
          }, 0),
        this.state.prestation["En attente"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["ACTU"];
          }, 0),
        this.state.prestation["En attente"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["RAC"];
          }, 0),
      ],
      seriesTOg: [
        this.state.prestation["En cours"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["CH"];
          }, 0),
        this.state.prestation["En cours"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["SIMU"];
          }, 0),
        this.state.prestation["En cours"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["AR"];
          }, 0),
        this.state.prestation["En cours"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["TFD"];
          }, 0),
        this.state.prestation["En cours"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["ACTU"];
          }, 0),
        this.state.prestation["En cours"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["RAC"];
          }, 0),
      ],
      seriesTF: [
        this.state.prestation["Termine"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["CH"];
          }, 0),
        this.state.prestation["Termine"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["SIMU"];
          }, 0),
        this.state.prestation["Termine"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["AR"];
          }, 0),
        this.state.prestation["Termine"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["TFD"];
          }, 0),
        this.state.prestation["Termine"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["ACTU"];
          }, 0),
        this.state.prestation["Termine"]
          .slice(start, end)
          .reduce((acc, elem) => {
            return acc + elem[1]["RAC"];
          }, 0),
      ],
      seriesTL: [
        this.state.prestation["Perdu"].slice(start, end).reduce((acc, elem) => {
          return acc + elem[1]["CH"];
        }, 0),
        this.state.prestation["Perdu"].slice(start, end).reduce((acc, elem) => {
          return acc + elem[1]["SIMU"];
        }, 0),
        this.state.prestation["Perdu"].slice(start, end).reduce((acc, elem) => {
          return acc + elem[1]["AR"];
        }, 0),
        this.state.prestation["Perdu"].slice(start, end).reduce((acc, elem) => {
          return acc + elem[1]["TFD"];
        }, 0),
        this.state.prestation["Perdu"].slice(start, end).reduce((acc, elem) => {
          return acc + elem[1]["ACTU"];
        }, 0),
        this.state.prestation["Perdu"].slice(start, end).reduce((acc, elem) => {
          return acc + elem[1]["RAC"];
        }, 0),
      ],
      trim: trimester,
      activeTab: "2",
    });
  }

  async getMonthdata(month, newYear) {
    if (newYear !== this.state.year) {
      await this.getYearData(newYear);
    }

    let i = 0;
    while (month !== FrenchMonth[i]) {
      i += 1;
    }
    this.setState({
      seriesW: Object.values(this.state.prestation["En attente"][i][1]),
      seriesOg: Object.values(this.state.prestation["En cours"][i][1]),
      seriesF: Object.values(this.state.prestation["Termine"][i][1]),
      seriesL: Object.values(this.state.prestation["Perdu"][i][1]),
      month: FrenchMonth[i],
      monthb: i,
      activeTab: "1",
    });
  }

  getPrestation(year) {
    axios
      .get(global.config.server_url + "/getPrestation?year=" + year, Config)
      .then((response) => {
        this.setState({
          prestation: response.data,
        });
      });
  }

  async getWeekData(weekStr, newYear) {
    if (newYear !== this.state.year) {
      await this.getYearData(newYear)
    }
    const totalWeeks = isoWeeksInYear(Number(newYear))
    let w = parseInt(String(weekStr).replace(/[^0-9]/g, ""), 10)
    if (!Number.isFinite(w) || w < 1) w = 1
    if (w > totalWeeks) w = totalWeeks
    const monday = isoWeekStart(Number(newYear), w)
    const m = monday.getMonth() // map week to month index

    const safe = (arr) => (arr && arr[m] && arr[m][1]) || { CH: 0, SIMU: 0, AR: 0, TFD: 0, ACTU: 0, RAC: 0 }
    const waiting = Object.values(safe(this.state.prestation?.["En attente"]))
    const ongoing = Object.values(safe(this.state.prestation?.["En cours"]))
    const finished = Object.values(safe(this.state.prestation?.["Termine"]))
    const lost = Object.values(safe(this.state.prestation?.["Perdu"]))

    this.setState({
      seriesWW: waiting,
      seriesWOg: ongoing,
      seriesWF: finished,
      seriesWL: lost,
      currentWeek: `W${w}`,
      year: Number(newYear),
      activeTab: this.state.activeTab === "4" ? "4" : this.state.activeTab,
    })
  }
  render() {
    return (
      <Card>
        <CardHeader>
          <div className="icon-section form-inline">
            <div
              className={`avatar avatar-stats p-50 ${
                this.props.iconBg
                  ? `bg-rgba-${this.props.iconBg}`
                  : "bg-rgba-primary"
              }`}
            >
              <div className="avatar-content">
                <PenTool className="success" size={22} />
              </div>
            </div>
            <CardTitle>Prestations</CardTitle>
          </div>
          <Nav tabs className="px-2">
            {/* Semaines */}
            <NavItem>
              <NavLink
                className={classnames({ active: this.state.activeTab === "4" })}
                onClick={() => {
                  this.getWeekData(this.state.currentWeek, this.state.year)
                  this.toggle("4")
                }}
              >
                Semaines
              </NavLink>
            </NavItem>
            {/* Mois */}
            <NavItem>
              <NavLink
                className={classnames({ active: this.state.activeTab === "1" })}
                onClick={() => {
                  this.getMonthdata(this.state.month, this.state.year)
                  this.toggle("1")
                }}
              >
                Mois
              </NavLink>
            </NavItem>
            {/* Trimestre */}
            <NavItem>
              <NavLink
                className={classnames({ active: this.state.activeTab === "2" })}
                onClick={() => {
                  this.getTrimData(this.state.trim, this.state.year)
                  this.toggle("2")
                }}
              >
                Trimestre
              </NavLink>
            </NavItem>
            {/* Année */}
            <NavItem>
              <NavLink
                className={classnames({ active: this.state.activeTab === "3" })}
                onClick={() => {
                  this.getYearData(this.state.year)
                  this.toggle("3")
                }}
              >
                Années
              </NavLink>
            </NavItem>
          </Nav>
        </CardHeader>
        <CardBody
          className={`${
            this.props.className ? this.props.className : "stats-card-body"
          } d-flex ${
            !this.props.iconRight && !this.props.hideChart
              ? "flex-column align-items-start"
              : this.props.iconRight
              ? "justify-content-between flex-row-reverse align-items-center"
              : this.props.hideChart && !this.props.iconRight
              ? "justify-content-center flex-column text-center"
              : null
          } ${!this.props.hideChart ? "pb-0" : "pb-2"} pt-2`}
        >
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="1">
              <div
                className="title-section"
                style={{
                  textAlign: "center",
                  marginLeft: "auto",
                  marginRight: "auto",
                  marginTop: "10px",
                  display: "inline-block",
                }}
              >
                <Nav className="d-inline-flex align-items-center">
                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Année"
                      valueLabel={String(this.state.year || new Date().getFullYear())}
                      isOpen={this.state.openYear}
                      toggle={() => this.setState({ openYear: !this.state.openYear })}
                      minWidth={70}
                    >
                      {Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => (
                        <DropdownItem
                          key={y}
                          active={y === this.state.year}
                          onClick={() => {
                            this.setState({ openYear: false })
                            this.getMonthdata(this.state.month, y)
                          }}
                        >
                          {y}
                        </DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>

                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Mois"
                      valueLabel={this.state.month || FrenchMonth[new Date().getMonth()]}
                      isOpen={this.state.openMonth}
                      toggle={() => this.setState({ openMonth: !this.state.openMonth })}
                      minWidth={110}
                    >
                      {FrenchMonth.map((m) => (
                        <DropdownItem
                          key={m}
                          active={m === this.state.month}
                          onClick={() => {
                            this.setState({ openMonth: false })
                            this.getMonthdata(m, this.state.year)
                          }}
                        >
                          {m}
                        </DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>
                </Nav>
              </div>
              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Attente
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`waiting-month`}
                      options={this.state.options}
                      series={
                        this.state.seriesW.some((elem) => elem > 0)
                          ? this.state.seriesW
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Cours
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`ongoing-month`}
                      options={this.state.options}
                      series={
                        this.state.seriesOg.some((elem) => elem > 0)
                          ? this.state.seriesOg
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">
                    Terminé
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`finished-month`}
                      options={this.state.options}
                      series={
                        this.state.seriesF.some((elem) => elem > 0)
                          ? this.state.seriesF
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">
                    Perdu
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`lost-month`}
                      options={this.state.options}
                      series={
                        this.state.seriesL.some((elem) => elem > 0)
                          ? this.state.seriesL
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="2">
              <div
                className="title-section"
                style={{
                  textAlign: "center",
                  marginLeft: "auto",
                  marginRight: "auto",
                  marginTop: "10px",
                  display: "inline-block",
                }}
              >
                <Nav className="d-inline-flex align-items-center">
                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Année"
                      valueLabel={String(this.state.year || new Date().getFullYear())}
                      isOpen={this.state.openYear}
                      toggle={() => this.setState({ openYear: !this.state.openYear })}
                      minWidth={70}
                    >
                      {Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => (
                        <DropdownItem key={y} active={y === this.state.year} onClick={() => { this.setState({ openYear: false }); this.getTrimData(this.state.trim, y); }}>{y}</DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>
                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Trimestre"
                      valueLabel={this.state.trim}
                      isOpen={this.state.openTrim}
                      toggle={() => this.setState({ openTrim: !this.state.openTrim })}
                      minWidth={120}
                    >
                      {["Trimestre 1","Trimestre 2","Trimestre 3","Trimestre 4"].map((t) => (
                        <DropdownItem key={t} active={t === this.state.trim} onClick={() => { this.setState({ openTrim: false }); this.getTrimData(t, this.state.year); }}>{t}</DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>
                </Nav>
              </div>
              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3  mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Attente
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`waiting-trimester`}
                      options={this.state.options}
                      series={
                        this.state.seriesTW.some((elem) => elem > 0)
                          ? this.state.seriesTW
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Cours
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`ongoing-trimester`}
                      options={this.state.options}
                      series={
                        this.state.seriesTOg.some((elem) => elem > 0)
                          ? this.state.seriesTOg
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">
                    Terminé
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`finished-trimester`}
                      options={this.state.options}
                      series={
                        this.state.seriesTF.some((elem) => elem > 0)
                          ? this.state.seriesTF
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">
                    Perdu
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`lost-trimester`}
                      options={this.state.options}
                      series={
                        this.state.seriesTL.some((elem) => elem > 0)
                          ? this.state.seriesTL
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="3">
              <div
                className="title-section"
                style={{
                  textAlign: "center",
                  marginLeft: "auto",
                  marginRight: "auto",
                  marginTop: "10px",
                  display: "inline-block",
                }}
              >
                <Nav className="d-inline-flex align-items-center">
                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Année"
                      valueLabel={String(this.state.year || new Date().getFullYear())}
                      isOpen={this.state.openYear}
                      toggle={() => this.setState({ openYear: !this.state.openYear })}
                      minWidth={70}
                    >
                      {Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => (
                        <DropdownItem key={y} active={y === this.state.year} onClick={() => { this.setState({ openYear: false }); this.getYearData(y); }}>{y}</DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>
                </Nav>
              </div>
              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Attente
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`waiting-year`}
                      options={this.state.options}
                      series={
                        this.state.seriesYW.some((elem) => {
                          return elem > 0;
                        })
                          ? this.state.seriesYW
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Cours
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`ongoing-year`}
                      options={this.state.options}
                      series={
                        this.state.seriesYOg.some((elem) => elem > 0)
                          ? this.state.seriesYOg
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">
                    Terminé
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`finished-year`}
                      options={this.state.options}
                      series={
                        this.state.seriesYF.some((elem) => elem > 0)
                          ? this.state.seriesYF
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">
                    Perdu
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`lost-year`}
                      options={this.state.options}
                      series={
                        this.state.seriesYL.some((elem) => elem > 0)
                          ? this.state.seriesYL
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
              </div>
            </TabPane>
            <TabPane tabId="4">
              <div
                className="title-section"
                style={{
                  textAlign: "center",
                  marginLeft: "auto",
                  marginRight: "auto",
                  marginTop: "10px",
                  display: "inline-block",
                }}
              >
                <Nav className="d-inline-flex align-items-center">
                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Année"
                      valueLabel={String(this.state.year || new Date().getFullYear())}
                      isOpen={this.state.openYear}
                      toggle={() => this.setState({ openYear: !this.state.openYear })}
                      minWidth={70}
                    >
                      {Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => (
                        <DropdownItem key={y} active={y === this.state.year} onClick={() => { this.setState({ openYear: false }); this.getWeekData(this.state.currentWeek, y); }}>{y}</DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>

                  <NavItem className="mr-1">
                    <TabDropdown
                      label="Semaine"
                      valueLabel={this.state.currentWeek}
                      isOpen={this.state.openWeek}
                      toggle={() => this.setState({ openWeek: !this.state.openWeek })}
                      minWidth={110}
                    >
                      {Array.from({ length: (this.state.year === new Date().getFullYear() ? isoWeekInfo(new Date()).isoWeek : isoWeeksInYear(this.state.year || new Date().getFullYear())) }, (_, i) => (
                        <DropdownItem key={`W${i + 1}`} active={`W${i + 1}` === this.state.currentWeek} onClick={() => { this.setState({ openWeek: false }); this.getWeekData(`W${i + 1}`, this.state.year); }}>{`W${i + 1}`}</DropdownItem>
                      ))}
                    </TabDropdown>
                  </NavItem>
                </Nav>
              </div>

              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3  mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">En Attente</h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`waiting-week`}
                      options={this.state.options}
                      series={
                        this.state.seriesWW.some((elem) => elem > 0)
                          ? this.state.seriesWW
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">En Cours</h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`ongoing-week`}
                      options={this.state.options}
                      series={
                        this.state.seriesWOg.some((elem) => elem > 0)
                          ? this.state.seriesWOg
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">Terminé</h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`finished-week`}
                      options={this.state.options}
                      series={
                        this.state.seriesWF.some((elem) => elem > 0)
                          ? this.state.seriesWF
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-5 d-flex justify-content-sm-center">Perdu</h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`lost-week`}
                      options={this.state.options}
                      series={
                        this.state.seriesWL.some((elem) => elem > 0)
                          ? this.state.seriesWL
                          : []
                      }
                      type="pie"
                      width={300}
                      height={175}
                    />
                  </div>
                </div>
              </div>
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    );
  }
}
export default PrestationStatistics;
