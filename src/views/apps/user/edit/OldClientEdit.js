import React from "react";
import { Card, CardBody, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane, Button } from "reactstrap";
import classnames from "classnames";
import { Info, Folder, CheckSquare, MessageCircle, ArrowLeft, Circle, Activity, Mail } from "react-feather";
import UserDetails from "../../profile/UserDetails";
import AccountTab from "./oldInformations";
import NotesTab from "./Notes";
import CommentsTab from "./Comments";
import DocumentsHub from "./DocumentsHub";
import CourriersHub from "./CourriersHub";
import SimulatorHub from "./SimulatorHub";
import { history } from "../../../../history";
import "../../../../assets/scss/pages/users.scss";
import "../../profile/Profile.css";
import axios from "axios";

class UserEdit extends React.Component {
  state = {
    rowData: {},
    activeTab: "notes",
    showFullForm: false,
    isCollapsed: false,
    simuOffset: 0,
    docsOffset: 0,
    courriersOffset: 0,
  };

  navRef = null;

  computeSimuOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(`simulateur-label-old-${this.props.match.params.id}`);
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ simuOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  computeDocsOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(`documents-label-old-${this.props.match.params.id}`);
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ docsOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  computeCourriersOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(`courriers-label-old-${this.props.match.params.id}`);
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ courriersOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
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
      const mapNumToKey = { "2": "notes", "3": "documents", "4": "documents", "5": "tasks", "6": "commentaires", "7": "simulateur" };
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
    if (this.state.activeTab !== tab) {
      const next = { activeTab: tab };
      if (tab === 'simulateur' && !this.state.isCollapsed) next.isCollapsed = true;
      this.setState(next, () => {
        if (tab === 'simulateur') setTimeout(this.computeSimuOffset, 0);
        if (tab === 'documents') setTimeout(this.computeDocsOffset, 0);
        if (tab === 'courriers') setTimeout(this.computeCourriersOffset, 0);
      });
    }
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
      <Row className='align-items-start'>
        <Col lg="4" md="4" sm="12" className={classnames('profile-left profile-sidebar-fixed client-left', { collapsed: this.state.isCollapsed })}>
          <UserDetails
            user={userView}
            onEdit={() => history.push(`/app/olduser/edit/${id}/1`)}
            showCollapse
            onCollapse={() => this.setState({ isCollapsed: true })}
          />
        </Col>
        <Col lg="8" md="8" sm="12" className={classnames('profile-right', { expanded: this.state.isCollapsed })}>
          <Nav tabs className="border-0 d-flex align-items-center gap-3 mb-1" ref={el => (this.navRef = el)}>
            {this.state.isCollapsed && (
              <NavItem>
                <NavLink onClick={() => this.setState({ isCollapsed: false })} className='p-0' aria-label='Afficher la fiche'>
                  <Circle className='text-primary profile-toggle-pulse' size={20} />
                </NavLink>
              </NavItem>
            )}
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'notes' })} onClick={() => this.toggle('notes')}>
                <Info className='text-primary mr-50' size={16}/> Notes
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink id={`documents-link-old-${id}`} className={classnames({ active: this.state.activeTab === 'documents' })} onClick={() => this.toggle('documents')}>
                <Folder className='text-primary mr-50' size={16}/>
                <span id={`documents-label-old-${id}`}> Documents</span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'tasks' })} onClick={() => this.toggle('tasks')}>
                <CheckSquare className='text-primary mr-50' size={16}/> Tâches
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'courriers' })} onClick={() => this.toggle('courriers')}>
                <Mail className='text-primary mr-50' size={16}/>
                <span id={`courriers-label-old-${id}`}> Courriers</span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'commentaires' })} onClick={() => this.toggle('commentaires')}>
                <MessageCircle className='text-primary mr-50' size={16}/> Commentaires
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink id={`simulateur-link-old-${id}`} className={classnames({ active: this.state.activeTab === 'simulateur' })} onClick={() => this.toggle('simulateur')}>
                <Activity className='text-primary mr-50' size={16}/>
                <span id={`simulateur-label-old-${id}`}> Simulateur</span>
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
            <TabPane tabId='tasks'>
              <Card className='mb-1'>
                <CardBody>
                  <div className='text-muted'>Utilise le module tâches dédié: <a href={`/app/user/clientTask/${id}/all`}>Ouvrir</a></div>
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='documents'>
              <DocumentsHub id={id} userFullName={`${userView.first_name || ''} ${userView.last_name || ''}`.trim()} alignOffset={this.state.docsOffset} labelId={`documents-label-old-${id}`} />
            </TabPane>
            <TabPane tabId='courriers'>
              <CourriersHub id={id} alignOffset={this.state.courriersOffset} labelId={`courriers-label-old-${id}`} />
            </TabPane>
            <TabPane tabId='commentaires'>
              <Card className='mb-1'>
                <CardBody>
                  <CommentsTab data={this.state.rowData} perso={this.state.rowData} id={id} />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='simulateur'>
              <SimulatorHub id={id} alignOffset={this.state.simuOffset} user={this.state.rowData} />
            </TabPane>
          </TabContent>
        </Col>
      </Row>
    );
  }
}
export default UserEdit;
