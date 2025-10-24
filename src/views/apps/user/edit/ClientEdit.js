import React from "react";
import { Card, CardBody, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane, Button, UncontrolledTooltip } from "reactstrap";
import classnames from "classnames";
import { Info, Folder, CheckSquare, MessageCircle, ArrowLeft, Disc, Circle, Activity } from "react-feather";
import UserDetails from "../../profile/UserDetails";
import AccountTab from "./Informations";
import NotesTab from "./Notes";
import CommentsTab from "./Comments";
import "../../../../assets/scss/pages/users.scss";
import "../../profile/Profile.css";
import axios from "axios";
import Documents from "./Documents";
import DocumentsHub from "./DocumentsHub";
import SimulatorHub from "./SimulatorHub";
import { history } from "../../../../history";
class UserEdit extends React.Component {
  state = {
    rowData: [],
    members: [],
    activeTab: "notes",
    showFullForm: false,
    isCollapsed: false,
    simuOffset: 0,
    docsOffset: 0,
  };

  navRef = null;

  computeSimuOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(`simulateur-label-client-${this.props.match.params.id}`);
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ simuOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  computeDocsOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(`documents-label-client-${this.props.match.params.id}`);
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ docsOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  applyTabFromRoute(tabParam) {
    if (tabParam === "1") {
      this.setState({ showFullForm: true });
    } else if (tabParam) {
      const mapNumToKey = { "2": "notes", "3": "documents", "4": "documents", "5": "tasks", "6": "commentaires", "7": "simulateur" };
      this.setState({ showFullForm: false, activeTab: mapNumToKey[tabParam] || "notes" });
    }
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // Déterminer le mode selon l'URL (si ":tab" vaut "1" => plein formulaire)
    const tabParam = this.props.match && this.props.match.params && this.props.match.params.tab;
    this.applyTabFromRoute(tabParam);

    await axios
      .get(
        global.config.server_url + "/users/" + this.props.match.params.id,
        Config
      )
      .then((response) => {
        let rowData = response.data;

        this.setState({ rowData });
      });

    await axios
      .get(global.config.server_url + "/users?kind=member", Config)
      .then((response) => {
        this.setState({ members: response.data });
      });
  }

  componentDidUpdate(prevProps) {
    const prevTab = prevProps.match && prevProps.match.params && prevProps.match.params.tab;
    const currTab = this.props.match && this.props.match.params && this.props.match.params.tab;
    if (prevTab !== currTab) {
      this.applyTabFromRoute(currTab);
    }
    const prevId = prevProps.match && prevProps.match.params && prevProps.match.params.id;
    const currId = this.props.match && this.props.match.params && this.props.match.params.id;
    if (prevId !== currId) {
      // reset display mode when navigating between users
      this.applyTabFromRoute(currTab);
    }
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      const next = { activeTab: tab };
      if (tab === 'simulateur' && !this.state.isCollapsed) next.isCollapsed = true;
      this.setState(next, () => {
        if (tab === 'simulateur') setTimeout(this.computeSimuOffset, 0);
        if (tab === 'documents') setTimeout(this.computeDocsOffset, 0);
      });
    }
  };
  render() {
    const id = this.props.match.params.id;
    if (this.state.showFullForm) {
      return (
        <Row>
          <Col sm="12">
            <Card>
              <CardBody className="pt-2">
                <div className="d-flex justify-content-start mb-2">
                  <Button color="primary" size="lg" onClick={() => history.push(`/app/user/edit/${id}/2`)}>
                    <ArrowLeft size={18} className="mr-50" />
                    Retour
                  </Button>
                </div>
                <AccountTab
                  data={this.state.rowData}
                  members={this.state.members}
                  id={id}
                  dob={this.state.rowData["birth_date"]}
                  backTo={`/app/user/edit/${id}/2`}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      );
    }
    return (
      <Row className='align-items-start'>
        <Col lg="4" md="4" sm="12" className={classnames('profile-left profile-sidebar-fixed client-left', { collapsed: this.state.isCollapsed })}>
          <div>
            <UserDetails
              user={this.state.rowData || {}}
              onEdit={() => history.push(`/app/user/edit/${id}/1`)}
              showCollapse
              onCollapse={() => this.setState({ isCollapsed: true })}
            />
          </div>
        </Col>
        <Col lg="8" md="8" sm="12" className={classnames('profile-right', { expanded: this.state.isCollapsed })}>
          <Nav tabs className="border-0 d-flex align-items-center gap-3 mb-1" ref={el => (this.navRef = el)}>
            {this.state.isCollapsed && (
              <NavItem>
                <NavLink onClick={() => this.setState({ isCollapsed: false })} className='p-0' aria-label='Afficher la fiche'>
                  <Circle id={`clientOpenToggle-${id}`} className='text-primary profile-toggle-pulse' size={20} />
                </NavLink>
                <UncontrolledTooltip placement='top' target={`clientOpenToggle-${id}`}>Afficher la fiche</UncontrolledTooltip>
              </NavItem>
            )}
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'notes' })} onClick={() => this.toggle('notes')}>
                <Info className='text-primary mr-50' size={16}/> Notes
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink id={`documents-link-client-${id}`} className={classnames({ active: this.state.activeTab === 'documents' })} onClick={() => this.toggle('documents')}>
                <Folder className='text-primary mr-50' size={16}/>
                <span id={`documents-label-client-${id}`}> Documents</span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'tasks' })} onClick={() => this.toggle('tasks')}>
                <CheckSquare className='text-primary mr-50' size={16}/> Tâches
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: this.state.activeTab === 'commentaires' })} onClick={() => this.toggle('commentaires')}>
                <MessageCircle className='text-primary mr-50' size={16}/> Commentaires
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink id={`simulateur-link-client-${id}`} className={classnames({ active: this.state.activeTab === 'simulateur' })} onClick={() => this.toggle('simulateur')}>
                <Activity className='text-primary mr-50' size={16}/>
                <span id={`simulateur-label-client-${id}`}> Simulateur</span>
              </NavLink>
            </NavItem>
          </Nav>
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId='notes'>
              <Card className='mb-1'>
                <CardBody>
                  <NotesTab data={this.state.rowData} perso={this.state.rowData} members={this.state.members} id={id} />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='documents'>
              <DocumentsHub id={id} name={this.state.rowData.name} parent_id={this.state.rowData.parent_id} alignOffset={this.state.docsOffset} labelId={`documents-label-client-${id}`} />
            </TabPane>
            <TabPane tabId='tasks'>
              <Card className='mb-1'>
                <CardBody>
                  <div className='text-muted'>Utilise le module tâches dédié: <a href={`/app/user/clientTask/${id}/all`}>ouvrir</a></div>
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='commentaires'>
              <Card className='mb-1'>
                <CardBody>
                  <CommentsTab data={this.state.rowData} perso={this.state.rowData} members={this.state.members} id={id} />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='simulateur'>
              <SimulatorHub id={id} alignOffset={this.state.simuOffset} />
            </TabPane>
          </TabContent>
        </Col>
      </Row>
    );
  }
}
export default UserEdit;
