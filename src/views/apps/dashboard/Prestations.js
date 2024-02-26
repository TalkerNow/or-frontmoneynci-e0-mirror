import React from "react";
import { PenTool } from "react-feather";
import axios from "axios";
import {
  Card,
  CardBody,
  Nav,
  NavItem,
  Input,
  NavLink,
  TabContent,
  CardHeader,
  CardTitle,
  TabPane,
} from "reactstrap";
import classnames from "classnames";
import ReactApexChart from "react-apexcharts";

const FrenchMonth = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
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
    prestation: null,
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
    this.getMonthdata(FrenchMonth[tmp.getMonth()], tmp.getFullYear());
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
                <div style={{ display: "inline-block", marginLeft: "5px" }}>
                  <Input
                    type="select"
                    name="select"
                    id="role"
                    defaultValue={this.state.year}
                    key={this.state.year}
                    style={{
                      width: "75px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      fontSize: "17px",
                    }}
                    onChange={(e) =>
                      this.getMonthdata(this.state.month, e.target.value)
                    }
                  >
                    <option>2018</option>
                    <option>2019</option>
                    <option>2020</option>
                    <option>2021</option>
                    <option>2022</option>
                    <option>2023</option>
                    <option>2024</option>
                    <option>2025</option>
                    <option>2026</option>
                    <option>2027</option>
                    <option>2028</option>
                    <option>2029</option>
                    <option>2030</option>
                  </Input>
                </div>
                <div style={{ display: "inline-block", marginLeft: "5px" }}>
                  <Input
                    type="select"
                    name="select"
                    id="role"
                    defaultValue={FrenchMonth[new Date().getMonth()]}
                    style={{
                      width: "120px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      fontSize: "17px",
                    }}
                    onChange={(e) =>
                      this.getMonthdata(e.target.value, this.state.year)
                    }
                  >
                    <option>janvier</option>
                    <option>février</option>
                    <option>mars</option>
                    <option>avril</option>
                    <option>mai</option>
                    <option>juin</option>
                    <option>juillet</option>
                    <option>août</option>
                    <option>septembre</option>
                    <option>octobre</option>
                    <option>novembre</option>
                    <option>décembre</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Attente
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`waiting-${this.state.activeTab}`}
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
                      key={`ongoing-${this.state.activeTab}`}
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
                      key={`finished-${this.state.activeTab}`}
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
                      key={`lost-${this.state.activeTab}`}
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
                <div style={{ display: "inline-block", marginLeft: "5px" }}>
                  <Input
                    type="select"
                    name="select"
                    id="role"
                    defaultValue={this.state.year}
                    key={this.state.year}
                    style={{
                      width: "75px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      fontSize: "17px",
                    }}
                    onChange={(e) => {
                      this.getTrimData(this.state.trim, e.target.value);
                    }}
                  >
                    <option>2018</option>
                    <option>2019</option>
                    <option>2020</option>
                    <option>2021</option>
                    <option>2022</option>
                    <option>2023</option>
                    <option>2024</option>
                    <option>2025</option>
                    <option>2026</option>
                    <option>2027</option>
                    <option>2028</option>
                    <option>2029</option>
                    <option>2030</option>
                  </Input>
                </div>
                <div style={{ display: "inline-block", marginLeft: "5px" }}>
                  <Input
                    type="select"
                    name="select"
                    id="role"
                    defaultValue={new Date().getFullYear()}
                    style={{
                      width: "130px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      fontSize: "17px",
                    }}
                    onChange={(e) =>
                      this.getTrimData(e.target.value, this.state.year)
                    }
                  >
                    <option>Trimestre 1</option>
                    <option>Trimestre 2</option>
                    <option>Trimestre 3</option>
                    <option>Trimestre 4</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3  mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Attente
                  </h4>
                  <div id="chart">
                    <ReactApexChart
                      key={`waiting-${this.state.activeTab}`}
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
                      key={`ongoing-${this.state.activeTab}`}
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
                      key={`finished-${this.state.activeTab}`}
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
                      key={`lost-${this.state.activeTab}`}
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
                <div style={{ display: "inline-block", marginLeft: "5px" }}>
                  <Input
                    type="select"
                    name="select"
                    id="role"
                    defaultValue={this.state.year}
                    key={this.state.year}
                    style={{
                      width: "75px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      fontSize: "17px",
                    }}
                    onChange={(e) => {
                      this.getYearData(e.target.value);
                      this.toggle(this.state.activeTab);
                    }}
                  >
                    <option>2018</option>
                    <option>2019</option>
                    <option>2020</option>
                    <option>2021</option>
                    <option>2022</option>
                    <option>2023</option>
                    <option>2024</option>
                    <option>2025</option>
                    <option>2026</option>
                    <option>2027</option>
                    <option>2028</option>
                    <option>2029</option>
                    <option>2030</option>
                  </Input>
                </div>
              </div>
              <div style={{ width: "100%" }} className="form-inline mt-1 mb-1">
                <div className="ml-3 mt-1">
                  <h4 className="w-50 ml-4 d-flex justify-content-sm-center">
                    En Attente
                  </h4>
                  <div id="chart">
                    {console.log("Waiting: ", this.state.seriesYW)}
                    {console.log("On going: ", this.state.seriesYOg)}
                    {console.log("Finished : ", this.state.seriesYF)}
                    {console.log("Lost : ", this.state.seriesYL)}
                    <ReactApexChart
                      key={`waiting-year`}
                      options={this.state.options}
                      series={
                        this.state.seriesYW.some((elem) => {
                          console.log(elem);
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
          </TabContent>
        </CardBody>
      </Card>
    );
  }
}
export default PrestationStatistics;
