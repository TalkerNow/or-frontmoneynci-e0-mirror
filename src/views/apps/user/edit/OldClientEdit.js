import React from "react";
import {
  Card,
  CardBody,
  Row,
  Col,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import classnames from "classnames";
import { User} from "react-feather";
import AccountTab from "./oldInformations";
import "../../../../assets/scss/pages/users.scss";
import axios from "axios";

class UserEdit extends React.Component {
  state = {
    rowData: [],
    members: [],
    activeTab: "1",
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    this.setState({ activeTab: this.props.match.params.tab });

    await axios
      .get(
        global.config.server_url +
          "/users/" +
          this.props.match.params.id +
          "?kind=oldclient",
        Config
      )
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData });
      });
  }

  toggle = (tab) => {
    this.setState({
      activeTab: tab,
    });
  };

  render() {
    if (this.state.rowData === undefined || this.state.rowData.length === 0) {
      return null;
    }

    return (
      <Row>
        <Col sm="12">
          <Card>
            <CardBody className="pt-2">
              <Nav tabs>
                <NavItem>
                  <NavLink
                    className={classnames({
                      active: this.state.activeTab === "1",
                    })}
                    onClick={() => {
                      this.toggle("1");
                    }}
                  >
                    <User size={16} />
                    {this.state.rowData.first_name && (
                      <span className="align-middle ml-50">
                        {this.state.rowData.first_name +
                          " " +
                          this.state.rowData.last_name}
                      </span>
                    )}
                    {!this.state.rowData.first_name && (
                      <span className="align-middle ml-50">Information</span>
                    )}
                  </NavLink>
                </NavItem>
              </Nav>
              <TabContent activeTab={this.state.activeTab}>
                <TabPane tabId="1">
                  <AccountTab
                    data={this.state.rowData}
                    members={this.state.members}
                    id={this.props.match.params.id}
                    dob={this.state.rowData.birth_date}
                  />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  }
}
export default UserEdit;
