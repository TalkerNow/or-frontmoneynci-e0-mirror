import React from "react";
import { Card, CardBody, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane, Button } from "reactstrap";
import classnames from "classnames";
import { Info, Folder, CheckSquare, MessageCircle, ArrowLeft } from "react-feather";
import UserDetails from "../../profile/UserDetails";
import AccountTab from "./oldInformations";
import NotesTab from "./Notes";
import CommentsTab from "./Comments";
import Contracts from "./Contracts";
import Documents from "./Documents";
import { history } from "../../../../history";
import "../../../../assets/scss/pages/users.scss";
import axios from "axios";

class UserEdit extends React.Component {
  state = {
    rowData: {},
    activeTab: "notes",
    showFullForm: false,
  };

  mapToUser = (d = {}) => ({
    first_name: d.cl_prenom,
    last_name: d.cl_nom,
    email: d.cl_mail,
    mobile_number: d.cl_tel_port,
    office_number: d.cl_tel_bur,
    personal_country: d.cl_pays,
    role: "Client",
  });

  applyTabFromRoute(tabParam) {
    if (tabParam === "1") {
      this.setState({ showFullForm: true });
    } else if (tabParam) {
      const mapNumToKey = { "2": "notes", "3": "contrats", "4": "documents", "5": "tasks", "6": "commentaires" };
      this.setState({ showFullForm: false, activeTab: mapNumToKey[tabParam] || "notes" });
    }
  }

  async componentDidMount() {
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
    const tabParam = this.props.match && this.props.match.params && this.props.match.params.tab;
    this.applyTabFromRoute(tabParam);
    await axios
      .get(`${global.config.server_url}/users/${this.props.match.params.id}?kind=oldclient`, Config)
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData: rowData || {} });
      });
  }

  componentDidUpdate(prevProps) {
    const prevTab = prevProps.match && prevProps.match.params && prevProps.match.params.tab;
    const currTab = this.props.match && this.props.match.params && this.props.match.params.tab;
    if (prevTab !== currTab) this.applyTabFromRoute(currTab);
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) this.setState({ activeTab: tab });
  };

  render() {
    const id = this.props.match.params.id;
    const userView = this.mapToUser(this.state.rowData);

    if (this.state.showFullForm) {
      return (
        <Row>
          <Col sm="12">
            <Card>
              <CardBody className="pt-2">
                <div className="d-flex justify-content-start mb-2">
                  <Button color="primary" size="lg" onClick={() => history.push(`/app/olduser/edit/${id}/2`)}>
                    <ArrowLeft size={18} className="mr-50" />
                    Retour
                  </Button>
                </div>
                <AccountTab data={this.state.rowData} members={[]} id={id} dob={this.state.rowData.cl_ne_le} backTo={`/app/olduser/edit/${id}/2`} />
              </CardBody>
            </Card>
          </Col>
        </Row>
      );
    }

    return (
      <Row>
        <Col lg="4" md="5" sm="12" className="mb-1">
          <UserDetails user={userView} onEdit={() => history.push(`/app/olduser/edit/${id}/1`)} />
        </Col>
        <Col lg="8" md="7" sm="12">
          <Nav tabs className="border-0 d-flex align-items-center gap-3 mb-1">
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'notes' })} onClick={() => this.toggle('notes')}>
                <Info className='text-primary mr-50' size={16}/> Notes
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'contrats' })} onClick={() => this.toggle('contrats')}>
                <Folder className='text-primary mr-50' size={16}/> Contrats
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'documents' })} onClick={() => this.toggle('documents')}>
                <Folder className='text-primary mr-50' size={16}/> Documents
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'tasks' })} onClick={() => history.push(`/app/user/clientTask/${id}/all`)}>
                <CheckSquare className='text-primary mr-50' size={16}/> Tâches
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'commentaires' })} onClick={() => this.toggle('commentaires')}>
                <MessageCircle className='text-primary mr-50' size={16}/> Commentaires
              </NavLink>
            </NavItem>
          </Nav>
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId='notes'>
              <Card className='mb-1'>
                <CardBody>
                  <NotesTab data={this.state.rowData} perso={this.state.rowData} id={id} />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='contrats'>
              <Card className='mb-1'>
                <CardBody>
                  <Contracts name={`${userView.first_name || ''} ${userView.last_name || ''}`.trim()} id={id} />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='documents'>
              <Card className='mb-1'>
                <CardBody>
                  <Documents name={`${userView.first_name || ''} ${userView.last_name || ''}`.trim()} id={id} />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='commentaires'>
              <Card className='mb-1'>
                <CardBody>
                  <CommentsTab data={this.state.rowData} perso={this.state.rowData} id={id} />
                </CardBody>
              </Card>
            </TabPane>
          </TabContent>
        </Col>
      </Row>
    );
  }
}
export default UserEdit;
