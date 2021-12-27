import React from "react"
import { Users } from "react-feather"
//import axios from "axios";


import {Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  CardHeader, CardTitle,
  TabPane} from "reactstrap";
  import classnames from "classnames"

class ExpertCard extends React.Component {
  state = {
    activeTab: "1",
    prestation: []
  }

  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
  }

  async componentDidMount() {
    await axios.get(global.config.server_url + "/getMembersPrestation", Config).then(response => {
      this.setState({
        prestation: response.data.prestation,
      })
    })
  }

  getPrestation(year) {
    axios.get(global.config.server_url + "/getPrestation?year="+year, Config).then(response => {
      this.setState({
        prestation: response.data.prestation,
      })
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
                  <Users className="success" size={22} />
                </div>
              </div>
              <CardTitle>Experts</CardTitle>
            </div>
          <Nav tabs className="px-2">
                    <NavItem>
                      <NavLink
                        className={classnames({
                          active: this.state.activeTab === "1"
                        })}
                        onClick={() => {
                          this.toggle("1")
                        }}
                      >
                        Mois
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({
                          active: this.state.activeTab === "2"
                        })}
                        onClick={() => {
                          this.toggle("2")
                        }}
                      >
                        Trimestre
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({
                          active: this.state.activeTab === "3"
                        })}
                        onClick={() => {
                          this.toggle("3")
                        }}
                      >
                        Annes
                      </NavLink>
                    </NavItem>
                  </Nav>
        </CardHeader>
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
                  <TabContent activeTab={this.state.activeTab}>
                    <TabPane tabId="1">
                      {/* <LoginJWT /> */}
                      <p>text Mois.</p>                   
                       </TabPane>
                    <TabPane tabId="2">
                      <p>text Trimestre</p>
                    </TabPane>
                    <TabPane tabId="3">
                      <p> text Annes</p>
                    </TabPane>
                  </TabContent>
          </CardBody>
        </Card>
    )
  }
}
export default ExpertCard
