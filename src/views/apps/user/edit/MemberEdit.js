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
import { User, Info, Folder } from "react-feather"
import AccountTab from "./Informations"
import NotesTab from "./Notes"
import "../../../../assets/scss/pages/users.scss"
import axios from "axios";
import Contracts from "./Contracts";
import Documents from "./Documents";
//import Task from "./memberTask/Task";
import { history } from "../../../../history";
import CommentsTab from "./Comments";
class UserEdit extends React.Component {
  state = {
    rowData: [],
    persoData: [],
    activeTab: "1"
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }

    this.setState({ activeTab: this.props.match.params.tab });
    await axios.get(global.config.server_url + "/users/" + this.props.match.params.id, Config).then(response => {
      let rowData = response.data
      let persoData = response.data.personal_informations;

      this.setState({ rowData, persoData })
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
                <NavItem>
                  <NavLink
                    className={classnames({
                      active: this.state.activeTab === "2"
                    })}
                    onClick={() => {
                      this.toggle("2")
                    }}
                  >
                    <Info size={16} />
                    <span className="align-middle ml-50">Notes</span>
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
                    <Folder size={16} />
                    <span className="align-middle ml-50">Contrats</span>
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({
                      active: this.state.activeTab === "4"
                    })}
                    onClick={() => {
                      this.toggle("4")
                    }}
                  >
                    <Folder size={16} />
                    <span className="align-middle ml-50">Documents</span>
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({
                      active: this.state.activeTab === "5"
                    })}
                    onClick={() => {
                      history.push('/app/member/memberTask/' + this.props.match.params.id + '/all');
                    }}
                  >
                    <Folder size={16} />
                    <span className="align-middle ml-50">Tasks</span>
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({
                      active: this.state.activeTab === "6"
                    })}
                    onClick={() => {
                      this.toggle("6")
                    }}
                  >
                    <Info size={16} />
                    <span className="align-middle ml-50">Commentaires</span>
                  </NavLink>
                </NavItem>
              </Nav>
              <TabContent activeTab={this.state.activeTab}>
                <TabPane tabId="1">
                  <AccountTab
                    data={this.state.rowData}
                    perso={this.state.persoData}
                    id={this.props.match.params.id}
                    dob={this.state.persoData["birth_date"]}
                  />
                </TabPane>
                <TabPane tabId="2">
                  <NotesTab
                    data={this.state.rowData}
                    perso={this.state.persoData}
                    id={this.props.match.params.id}
                  />
                </TabPane>
                <TabPane tabId="3">
                  <Contracts
                    name={this.state.rowData.name}
                    id={this.props.match.params.id}
                  />
                </TabPane>
                <TabPane tabId="4">
                  <Documents
                    name={this.state.rowData.name}
                    id={this.props.match.params.id}
                  />
                </TabPane>
                <TabPane tabId="6">
                  <CommentsTab
                    data={this.state.rowData}
                    perso={this.state.persoData}
                    id={this.props.match.params.id}
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
