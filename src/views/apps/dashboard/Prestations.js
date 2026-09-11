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

// CSS du style violet arrondi pour les TabDropdown
const DROPDOWN_CSS = `
  .tab-dd .nav-link {
    cursor: pointer;
    border-radius: 9999px;
    padding: 0.3rem 0.55rem 0.3rem 0.6rem; /* reduce right padding */
    border: 1px solid rgba(115,103,240,.25);
    background: rgba(115,103,240,.08);
    transition: background .15s ease, box-shadow .15s ease, border-color .15s ease, color .15s ease;
    display: inline-flex;
    align-items: center;
    gap: .25rem; /* tighter gap between text and chevron */
    text-decoration: none !important;
    white-space: nowrap;
  }
  .tab-dd .nav-link:hover,
  .tab-dd .nav-link:focus {
    background: rgba(115,103,240,.16);
    border-color: rgba(115,103,240,.45);
    box-shadow: 0 2px 8px rgba(115,103,240,.20);
    color: #212529;
    outline: none;
  }
  .tab-dd .nav-link.active {
    background: rgba(115,103,240,.22);
    border-color: rgba(115,103,240,.55);
    font-weight: 600;
  }
  .tab-dd .chev { transition: transform .2s ease; }
  .tab-dd .nav-link.active .chev { transform: rotate(180deg); }
  .tab-dd .dropdown-menu {
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,.15);
    padding: 8px;
    max-height: 450px;
    overflow-y: auto;
    border: 1px solid rgba(0,0,0,.05);
  }

  /* Grid layouts for dropdowns to avoid scroll */
  .grid-dropdown-menu {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    min-width: 280px;
    max-height: none !important;
  }
  .grid-dropdown-menu .dropdown-item {
    text-align: center;
    padding: 8px 4px;
  }
  .tab-dd .dropdown-item { color: #212529 !important; border-radius: 6px; }
  .tab-dd .dropdown-item:hover,
  .tab-dd .dropdown-item:focus { background: rgba(34,41,47,.06) !important; color: #212529 !important; }
  .tab-dd .dropdown-item.active { background: rgba(115,103,240,.12) !important; color: #212529 !important; font-weight: 600; }

  /* ---------- Chart Grid ---------- */
  .chart-grid {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  .chart-item {
    margin-left: 1rem;
    margin-top: 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .chart-title {
    width: 50%;
    margin-left: 1.5rem;
    display: flex;
    justify-content: center;
  }
  @media (max-width: 600px) {
    .chart-grid {
      flex-direction: column;
      align-items: flex-start;
      padding-left: 0;
    }
    .chart-item {
      margin-left: 0;
      align-items: flex-start;
      width: 100%;
      margin-bottom: 1rem;
    }
    .chart-title {
      width: 100%;
      margin-left: 0;
      justify-content: flex-start !important;
      text-align: left;
    }
  }
`;

// ==== Helpers ISO week ====
function isoWeekInfo(dateInput) {
  const d = new Date(dateInput);
  const day = (d.getDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);
  const isoWeek =
    1 + Math.round((thursday - firstThursday) / (7 * 24 * 3600 * 1000));
  return { isoYear, isoWeek };
}
function isoWeeksInYear(isoYear) {
  const dec28 = new Date(isoYear, 11, 28);
  return isoWeekInfo(dec28).isoWeek;
}
function isoWeekStart(isoYear, isoWeek) {
  const simple = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7);
  const dow = (simple.getDay() + 6) % 7;
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dow);
  return monday;
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

/** Hide empty pies and 100%-CH pies (only first series value >0). */
function seriesUseful(series) {
  if (!Array.isArray(series) || !series.length) return false;
  if (!series.some((v) => Number(v) > 0)) return false;
  if (Number(series[0]) > 0 && series.slice(1).every((v) => !Number(v))) {
    return false;
  }
  return true;
}

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
    openYearMonth: false,
    openYearTrim: false,
    openYearYear: false,
    openYearWeek: false,
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
    const { isoWeek, isoYear } = isoWeekInfo(new Date());
    this.setState({ currentWeek: `W${isoWeek}`, year: isoYear });
    // optional: prepare weekly series for current week (doesn't switch tab)
    this.getWeekData(`W${isoWeek}`, isoYear);
    // optional auto-refresh check (daily) to update currentWeek when week changes
    this._weekTimer = setInterval(
      () => {
        const { isoWeek: w, isoYear: y } = isoWeekInfo(new Date());
        const next = `W${w}`;
        if (next !== this.state.currentWeek || y !== this.state.year) {
          this.setState({ currentWeek: next, year: y });
        }
      },
      24 * 60 * 60 * 1000,
    );
  }

  componentWillUnmount() {
    if (this._weekTimer) clearInterval(this._weekTimer);
  }

  async getYearData(newYear) {
    const response = await axios.get(
      global.config.server_url + "/getPrestation?year=" + newYear,
      Config
    );
    let responseAsArray = response.data;
    responseAsArray["En attente"] = Object.entries(
      responseAsArray["En attente"],
    );
    responseAsArray["En cours"] = Object.entries(
      responseAsArray["En cours"],
    );
    responseAsArray["Termine"] = Object.entries(responseAsArray["Termine"]);
    responseAsArray["Perdu"] = Object.entries(responseAsArray["Perdu"]);

    return new Promise((resolve) => {
      this.setState(
        {
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
        },
        resolve
      );
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
      year: newYear,
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
      year: newYear,
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
      await this.getYearData(newYear);
    }
    const totalWeeks = isoWeeksInYear(Number(newYear));
    let w = parseInt(String(weekStr).replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(w) || w < 1) w = 1;
    if (w > totalWeeks) w = totalWeeks;
    const monday = isoWeekStart(Number(newYear), w);
    const m = monday.getMonth(); // map week to month index

    const safe = (arr) =>
      (arr && arr[m] && arr[m][1]) || {
        CH: 0,
        SIMU: 0,
        AR: 0,
        TFD: 0,
        ACTU: 0,
        RAC: 0,
      };
    const waiting = Object.values(safe(this.state.prestation?.["En attente"]));
    const ongoing = Object.values(safe(this.state.prestation?.["En cours"]));
    const finished = Object.values(safe(this.state.prestation?.["Termine"]));
    const lost = Object.values(safe(this.state.prestation?.["Perdu"]));

    this.setState({
      seriesWW: waiting,
      seriesWOg: ongoing,
      seriesWF: finished,
      seriesWL: lost,
      currentWeek: `W${w}`,
      year: Number(newYear),
      activeTab: this.state.activeTab === "4" ? "4" : this.state.activeTab,
    });
  }
  render() {
    return (
      <>
        <style>{DROPDOWN_CSS}</style>
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
                  className={classnames({
                    active: this.state.activeTab === "4",
                  })}
                  onClick={() => {
                    this.getWeekData(this.state.currentWeek, this.state.year);
                    this.toggle("4");
                  }}
                >
                  Semaines
                </NavLink>
              </NavItem>
              {/* Mois */}
              <NavItem>
                <NavLink
                  className={classnames({
                    active: this.state.activeTab === "1",
                  })}
                  onClick={() => {
                    this.getMonthdata(this.state.month, this.state.year);
                    this.toggle("1");
                  }}
                >
                  Mois
                </NavLink>
              </NavItem>
              {/* Trimestre */}
              <NavItem>
                <NavLink
                  className={classnames({
                    active: this.state.activeTab === "2",
                  })}
                  onClick={() => {
                    this.getTrimData(this.state.trim, this.state.year);
                    this.toggle("2");
                  }}
                >
                  Trimestre
                </NavLink>
              </NavItem>
              {/* Année */}
              <NavItem>
                <NavLink
                  className={classnames({
                    active: this.state.activeTab === "3",
                  })}
                  onClick={() => {
                    this.getYearData(this.state.year);
                    this.toggle("3");
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
                        valueLabel={String(
                          this.state.year || new Date().getFullYear(),
                        )}
                        isOpen={this.state.openYearMonth}
                        toggle={() =>
                          this.setState({ openYearMonth: !this.state.openYearMonth })
                        }
                        minWidth={70}
                        menuClassName="grid-dropdown-menu"
                      >
                        {Array.from({ length: 13 }, (_, i) => 2018 + i)
                          .reverse()
                          .map((y) => (
                            <DropdownItem
                              toggle={false}
                              key={y}
                              active={y === this.state.year}
                              onClick={() => {
                                this.setState({ openYearMonth: false });
                                this.getMonthdata(this.state.month, y);
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
                        valueLabel={
                          this.state.month || FrenchMonth[new Date().getMonth()]
                        }
                        isOpen={this.state.openMonth}
                        toggle={() =>
                          this.setState({ openMonth: !this.state.openMonth })
                        }
                        minWidth={90}
                        menuClassName="grid-dropdown-menu"
                      >
                        {FrenchMonth.map((m) => (
                          <DropdownItem
                            key={m}
                            active={m === this.state.month}
                            onClick={() => {
                              this.setState({ openMonth: false });
                              this.getMonthdata(m, this.state.year);
                            }}
                          >
                            {m}
                          </DropdownItem>
                        ))}
                      </TabDropdown>
                    </NavItem>
                  </Nav>
                </div>
                <div className="chart-grid">
                  {seriesUseful(this.state.seriesW) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Attente</h4>
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
                  )}
                  {seriesUseful(this.state.seriesOg) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Cours</h4>
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
                  )}
                  {seriesUseful(this.state.seriesF) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Terminé</h4>
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
                  )}
                  {seriesUseful(this.state.seriesL) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Perdu</h4>
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
                  )}
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
                        valueLabel={String(
                          this.state.year || new Date().getFullYear(),
                        )}
                        isOpen={this.state.openYearTrim}
                        toggle={() =>
                          this.setState({ openYearTrim: !this.state.openYearTrim })
                        }
                        minWidth={70}
                        menuClassName="grid-dropdown-menu"
                      >
                        {Array.from({ length: 13 }, (_, i) => 2018 + i)
                          .reverse()
                          .map((y) => (
                            <DropdownItem
                              toggle={false}
                              key={y}
                              active={y === this.state.year}
                              onClick={() => {
                                this.setState({ openYearTrim: false });
                                this.getTrimData(this.state.trim, y);
                              }}
                            >
                              {y}
                            </DropdownItem>
                          ))}
                      </TabDropdown>
                    </NavItem>
                    <NavItem className="mr-1">
                      <TabDropdown
                        label="Trimestre"
                        valueLabel={this.state.trim}
                        isOpen={this.state.openTrim}
                        toggle={() =>
                          this.setState({ openTrim: !this.state.openTrim })
                        }
                        minWidth={120}
                      >
                        {[
                          "Trimestre 1",
                          "Trimestre 2",
                          "Trimestre 3",
                          "Trimestre 4",
                        ].map((t) => (
                          <DropdownItem
                            key={t}
                            active={t === this.state.trim}
                            onClick={() => {
                              this.setState({ openTrim: false });
                              this.getTrimData(t, this.state.year);
                            }}
                          >
                            {t}
                          </DropdownItem>
                        ))}
                      </TabDropdown>
                    </NavItem>
                  </Nav>
                </div>
                <div className="chart-grid">
                  {seriesUseful(this.state.seriesTW) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Attente</h4>
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
                  )}
                  {seriesUseful(this.state.seriesTOg) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Cours</h4>
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
                  )}
                  {seriesUseful(this.state.seriesTF) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Terminé</h4>
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
                  )}
                  {seriesUseful(this.state.seriesTL) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Perdu</h4>
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
                  )}
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
                        valueLabel={String(
                          this.state.year || new Date().getFullYear(),
                        )}
                        isOpen={this.state.openYearYear}
                        toggle={() =>
                          this.setState({ openYearYear: !this.state.openYearYear })
                        }
                        minWidth={70}
                        menuClassName="grid-dropdown-menu"
                      >
                        {Array.from({ length: 13 }, (_, i) => 2018 + i)
                          .reverse()
                          .map((y) => (
                            <DropdownItem
                              toggle={false}
                              key={y}
                              active={y === this.state.year}
                              onClick={() => {
                                this.setState({ openYearYear: false });
                                this.getYearData(y);
                              }}
                            >
                              {y}
                            </DropdownItem>
                          ))}
                      </TabDropdown>
                    </NavItem>
                  </Nav>
                </div>
                <div className="chart-grid">
                  {seriesUseful(this.state.seriesYW) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Attente</h4>
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
                  )}
                  {seriesUseful(this.state.seriesYOg) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Cours</h4>
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
                  )}
                  {seriesUseful(this.state.seriesYF) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Terminé</h4>
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
                  )}
                  {seriesUseful(this.state.seriesYL) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Perdu</h4>
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
                  )}
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
                        valueLabel={String(
                          this.state.year || new Date().getFullYear(),
                        )}
                        isOpen={this.state.openYearWeek}
                        toggle={() =>
                          this.setState({ openYearWeek: !this.state.openYearWeek })
                        }
                        minWidth={70}
                        menuClassName="grid-dropdown-menu"
                      >
                        {Array.from({ length: 13 }, (_, i) => 2018 + i)
                          .reverse()
                          .map((y) => (
                            <DropdownItem
                              toggle={false}
                              key={y}
                              active={y === this.state.year}
                              onClick={() => {
                                this.setState({ openYearWeek: false });
                                this.getWeekData(this.state.currentWeek, y);
                              }}
                            >
                              {y}
                            </DropdownItem>
                          ))}
                      </TabDropdown>
                    </NavItem>

                    <NavItem className="mr-1">
                      <TabDropdown
                        label="Semaine"
                        valueLabel={this.state.currentWeek}
                        isOpen={this.state.openWeek}
                        toggle={() =>
                          this.setState({ openWeek: !this.state.openWeek })
                        }
                        minWidth={110}
                        menuClassName="grid-dropdown-menu"
                      >
                        {Array.from(
                          {
                            length:
                              this.state.year === new Date().getFullYear()
                                ? isoWeekInfo(new Date()).isoWeek
                                : isoWeeksInYear(
                                    this.state.year || new Date().getFullYear(),
                                  ),
                          },
                          (_, i) => (
                            <DropdownItem
                              key={`W${i + 1}`}
                              active={`W${i + 1}` === this.state.currentWeek}
                              onClick={() => {
                                this.setState({ openWeek: false });
                                this.getWeekData(`W${i + 1}`, this.state.year);
                              }}
                            >{`W${i + 1}`}</DropdownItem>
                          ),
                        )}
                      </TabDropdown>
                    </NavItem>
                  </Nav>
                </div>

                <div className="chart-grid">
                  {seriesUseful(this.state.seriesWW) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Attente</h4>
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
                  )}
                  {seriesUseful(this.state.seriesWOg) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">En Cours</h4>
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
                  )}
                  {seriesUseful(this.state.seriesWF) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Terminé</h4>
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
                  )}
                  {seriesUseful(this.state.seriesWL) && (
                  <div className="chart-item">
                                      <h4 className="chart-title">Perdu</h4>
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
                  )}
                </div>
              </TabPane>
            </TabContent>
          </CardBody>
        </Card>
      </>
    );
  }
}
export default PrestationStatistics;
