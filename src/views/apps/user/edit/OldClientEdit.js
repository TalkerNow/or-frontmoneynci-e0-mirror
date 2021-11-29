import React from "react"
import {
  Card,
  CardBody,
  Row,
  Col,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane
} from "reactstrap"
import classnames from "classnames"
import {User, Info, Folder} from "react-feather"
import AccountTab from "./oldInformations"
//import NotesTab from "./Notes"
//import CommentsTab from "./Comments"
import "../../../../assets/scss/pages/users.scss"
import axios from "axios";
//import Contracts from "./Contracts";
//import Documents from "./Documents";
//import Task from "./clientTask/Task";
import {history} from "../../../../history";
class UserEdit extends React.Component {
  state = {
    rowData: [],
    persoData:[],
    members:[],
    activeTab: "1"
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    this.setState({ activeTab: this.props.match.params.tab});

    await axios.get(global.config.server_url + "/users?kind=oldclient", Config).then(response => {
      console.log(response)
      console.log(this.props.location.state)
      let rowData = response.data.data
      this.setState({ rowData })
    })
  }

  toggle = tab => {
    this.setState({
      activeTab: tab
    })
  }
  render() {
    return (
      <Row>
        <Col sm="12">
          <Card>
            <CardBody className="pt-2">
              <Nav tabs>
                <NavItem>
                  <NavLink
                    className={classnames({
                      active: this.state.activeTab === "1"
                    })}
                    onClick={() => {
                      this.toggle("1")
                    }}
                  >
                    <User size={16} />
                    {this.state.persoData.first_name &&
                      <span className="align-middle ml-50">
                        {this.state.persoData.first_name + " " + this.state.persoData.last_name}
                      </span>
                    }
                    {!this.state.persoData.first_name &&
                      <span className="align-middle ml-50">
                        Information
                      </span>
                    }
                  </NavLink>
                </NavItem>
              </Nav>
              <TabContent activeTab={this.state.activeTab}>
                <TabPane tabId="1">
                  <AccountTab
                      data={this.state.rowData}
                      perso={this.state.persoData}
                      members={this.state.members}
                      id={this.props.location.state}
                      dob={this.state.persoData["birth_date"]}
                  />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Col>
      </Row>
    )
  }
}
export default UserEdit
