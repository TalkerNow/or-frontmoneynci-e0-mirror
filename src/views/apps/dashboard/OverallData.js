import React from "react"
import { Compass } from "react-feather"
//import axios from "axios";

import {Card,
  CardBody,
  Nav,
  Input,
  NavItem,
  NavLink,
  TabContent,
  CardHeader, CardTitle,
  TabPane} from "reactstrap";
  import classnames from "classnames"

  class OverallCard extends React.Component {
  state = {
    activeTab: "1",
  }

  toggle = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
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
                  <Compass className="success" size={22} />
                </div>
              </div>
              <CardTitle>Informations</CardTitle>
            </div>
            <div className="title-section" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto',marginTop:'10px' ,display:'inline-block',}}>
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
export default OverallCard
