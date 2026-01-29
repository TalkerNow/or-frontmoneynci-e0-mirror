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
  Button,
  UncontrolledTooltip,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import classnames from "classnames";
import {
  Info,
  Folder,
  CheckSquare,
  MessageCircle,
  ArrowLeft,
  Circle,
  Activity,
  FileText,
  Mail,
} from "react-feather";
import UserDetails from "../../profile/UserDetails";
import AccountTab from "./Informations";
import NotesTab from "./Notes";
import CommentsTab from "./Comments";
import "../../../../assets/scss/pages/users.scss";
import "../../profile/Profile.css";
import axios from "axios";
import DocumentsHub from "./DocumentsHub";
import CourriersHub from "./CourriersHub";
import SimulatorHub from "./SimulatorHub";
import { history } from "../../../../history";
import Contracts from "./Contracts";
import SuiviAvancementBox from "./SuiviAvancementBox";

import { canAccessSimulator } from "../../../../constants/permissions";
import ClientTasks from "./clientTask/Task";

class UserEdit extends React.Component {
  state = {
    rowData: [],
    members: [],
    activeTab: "notes",
    showFullForm: false,
    isCollapsed: false,
    simuOffset: 0,
    docsOffset: 0,
    courriersOffset: 0,
    isDirty: false,
    showUnsavedModal: false,
    taskCount: 0,
    hasUrgentTask: false,
  };

  navRef = null;
  documentsHubRef = React.createRef();

  computeSimuOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(
        `simulateur-label-client-${this.props.match.params.id}`,
      );
      if (nav && label) {
        const delta =
          label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ simuOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  computeDocsOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(
        `documents-label-client-${this.props.match.params.id}`,
      );
      if (nav && label) {
        const delta =
          label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ docsOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  computeCourriersOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById(
        `courriers-label-client-${this.props.match.params.id}`,
      );
      if (nav && label) {
        const delta =
          label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ courriersOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  applyTabFromRoute(tabParam) {
    if (tabParam === "1") {
      this.setState({ showFullForm: true });
    } else if (tabParam) {
      const mapNumToKey = {
        2: "notes",
        3: "documents",
        4: "documents",
        5: "tasks",
        6: "commentaires",
        7: "simulateur",
        8: "contrats",
      };
      this.setState({
        showFullForm: false,
        activeTab: mapNumToKey[tabParam] || "notes",
      });
    }
  }

  // -------------------------
  // Centralisation des fetchs
  // -------------------------
  fetchUser = async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    const { id } = this.props.match.params;
    const response = await axios.get(
      global.config.server_url + "/users/" + id,
      Config,
    );
    this.setState({ rowData: response.data });
  };

  fetchTaskCount = async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    const { id } = this.props.match.params;
    try {
      const response = await axios.get(
        global.config.server_url + "/tasks?filter=all",
        Config,
      );
      const tasks = Array.isArray(response.data) ? response.data : [];

      // Filtre par client ET non complété
      const clientTasks = tasks.filter(
        (t) => String(t.customer_id) === String(id) && !t.isCompleted,
      );

      // Vérifie si au moins une tâche est urgente (date passée)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const hasUrgent = clientTasks.some((t) => {
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate < now;
      });

      this.setState({
        taskCount: clientTasks.length,
        hasUrgentTask: hasUrgent
      });
    } catch (e) {
      console.error("Error fetching task count", e);
    }
  };

  fetchMembers = async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    const response = await axios.get(
      global.config.server_url + "/users?kind=member",
      Config,
    );
    this.setState({ members: response.data });
  };

  async componentDidMount() {
    // Déterminer le mode selon l'URL (si ":tab" vaut "1" => plein formulaire)
    const tabParam =
      this.props.match &&
      this.props.match.params &&
      this.props.match.params.tab;
    this.applyTabFromRoute(tabParam);

    // Utilise les méthodes centralisées
    await this.fetchUser();
    await this.fetchMembers();
    await this.fetchTaskCount();
    // Calculate offsets immediately after mount for alignment
    setTimeout(() => {
      if (this.state.activeTab === "simulateur") this.computeSimuOffset();
      if (this.state.activeTab === "documents") this.computeDocsOffset();
      if (this.state.activeTab === "courriers") this.computeCourriersOffset();
    }, 0);
  }

  componentDidUpdate(prevProps) {
    const prevTab =
      prevProps.match && prevProps.match.params && prevProps.match.params.tab;
    const currTab =
      this.props.match &&
      this.props.match.params &&
      this.props.match.params.tab;
    if (prevTab !== currTab) {
      this.applyTabFromRoute(currTab);
      // Recharger les infos quand on quitte le plein formulaire (1 -> autre)
      if (prevTab === "1" && currTab !== "1") {
        this.fetchUser();
      }
    }

    const prevId =
      prevProps.match && prevProps.match.params && prevProps.match.params.id;
    const currId =
      this.props.match && this.props.match.params && this.props.match.params.id;
    if (prevId !== currId) {
      // reset display mode when navigating between users
      this.applyTabFromRoute(currTab);
      // Re-fetch si on change d'utilisateur
      this.fetchUser();
      this.fetchMembers();
    }
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      const next = { activeTab: tab };
      if (tab === "simulateur" && !this.state.isCollapsed)
        next.isCollapsed = true;
      this.setState(next, () => {
        if (tab === "simulateur") setTimeout(this.computeSimuOffset, 0);
        if (tab === "documents") setTimeout(this.computeDocsOffset, 0);
        if (tab === "courriers") setTimeout(this.computeCourriersOffset, 0);
      });
    } else {
      if (tab === "documents" && this.documentsHubRef.current) {
        this.documentsHubRef.current.resetView();
      }
    }
  };

  setDirty = (val) => {
    if (this.state.isDirty !== val) {
      this.setState({ isDirty: val });
    }
  };

  handleBack = () => {
    const { id } = this.props.match.params;
    if (!this.state.isDirty) {
      history.push(`/app/user/edit/${id}/2`);
    } else {
      this.setState({ showUnsavedModal: true });
    }
  };

  handleLeaveWithoutSaving = () => {
    const { id } = this.props.match.params;
    this.setState({ showUnsavedModal: false, isDirty: false });
    history.push(`/app/user/edit/${id}/2`);
  };

  handleSaveAndLeave = () => {
    this.setState({ showUnsavedModal: false });
    // Trigger form submit
    const form = document.getElementById("user-edit-form");
    if (form) {
      // The form submit handler in Informations.js handles the save and navigation
      form.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true }),
      );
    }
  };

  render() {
    const id = this.props.match.params.id;
    const hasComments =
      this.state.rowData?.comments && this.state.rowData.comments.trim() !== "";
    if (this.state.showFullForm) {
      return (
        <Row>
          <Col sm="12">
            <Card>
              <CardBody className="pt-2">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-2 w-100">
                  <Button.Ripple
                    color="primary"
                    aria-label="Retour"
                    title="Retour"
                    className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32 }}
                    onClick={this.handleBack}
                  >
                    <ArrowLeft size={16} />
                  </Button.Ripple>
                  <Button.Ripple
                    color="success"
                    type="submit"
                    form="user-edit-form"
                    className="mt-1 mt-sm-0 w-100 w-sm-auto"
                  >
                    Enregistrer une modification
                  </Button.Ripple>
                </div>
                <AccountTab
                  data={this.state.rowData}
                  members={this.state.members}
                  id={id}
                  dob={this.state.rowData["birth_date"]}
                  backTo={`/app/user/edit/${id}/2`}
                  setDirty={this.setDirty}
                />
              </CardBody>
            </Card>
            <Modal
              isOpen={this.state.showUnsavedModal}
              toggle={() =>
                this.setState({
                  showUnsavedModal: !this.state.showUnsavedModal,
                })
              }
              className="modal-dialog-centered"
            >
              <ModalHeader
                toggle={() =>
                  this.setState({
                    showUnsavedModal: !this.state.showUnsavedModal,
                  })
                }
              >
                Modifications non enregistrées
              </ModalHeader>
              <ModalBody>
                Voulez-vous enregistrer vos modifications avant de quitter ?
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onClick={this.handleSaveAndLeave}>
                  Enregistrer et Quitter
                </Button>
                <Button
                  color="danger"
                  // outline
                  onClick={this.handleLeaveWithoutSaving}
                >
                  Quitter sans sauvegarder
                </Button>
              </ModalFooter>
            </Modal>
          </Col>
        </Row>
      );
    }
    return (
      <Row className="align-items-start user-edit-row flex-nowrap">
        <Col
          xs="12"
          sm="4"
          md="4"
          lg="4"
          className={classnames(
            "profile-left profile-sidebar-fixed client-left",
            {
              collapsed: this.state.isCollapsed,
            },
          )}
        >
          <div>
            <UserDetails
              user={this.state.rowData || {}}
              onEdit={() => history.push(`/app/user/edit/${id}/1`)}
              showCollapse
              onCollapse={() => this.setState({ isCollapsed: true })}
            />

            {/* 👇 Ta box de suivi d'avancement, dans un fichier séparé */}
            <SuiviAvancementBox clientId={id} />
          </div>
        </Col>
        <Col
          xs="12"
          sm="8"
          md="8"
          lg="8"
          className={classnames("profile-right", {
            expanded: this.state.isCollapsed,
          })}
        >
          <div
            className="border-0 d-flex align-items-center gap-3 mb-1 nav-tabs"
            ref={(el) => (this.navRef = el)}
          >
            <Button.Ripple
              color="primary"
              aria-label="Retour"
              title="Retour à la page précédente"
              className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center mr-1"
              style={{ width: 32, height: 32, minWidth: 32, flexShrink: 0 }}
              onClick={() => history.push("/app/user/clientslist")}
            >
              <ArrowLeft size={16} />
            </Button.Ripple>
            <Nav
              tabs
              className="border-0 d-flex align-items-center gap-3 mb-0"
              style={{
                flexWrap: "nowrap",
                overflowX: "auto",
                overflowY: "hidden",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
                borderBottom: "none",
              }}
            >
              <style>{`.nav-tabs .nav-link { white-space: nowrap; } .nav-tabs::-webkit-scrollbar { display: none; }`}</style>
              {this.state.isCollapsed && (
                <NavItem>
                  <NavLink
                    onClick={() => this.setState({ isCollapsed: false })}
                    className="p-0"
                    aria-label="Afficher la fiche"
                  >
                    <Circle
                      id={`clientOpenToggle-${id}`}
                      className="text-primary profile-toggle-pulse"
                      size={20}
                    />
                  </NavLink>
                  <UncontrolledTooltip
                    placement="top"
                    target={`clientOpenToggle-${id}`}
                  >
                    Afficher la fiche
                  </UncontrolledTooltip>
                </NavItem>
              )}
              <NavItem>
                <NavLink
                  className={classnames({
                    active: this.state.activeTab === "notes",
                  })}
                  onClick={() => this.toggle("notes")}
                >
                  <Info className="text-primary mr-50" size={16} /> Infos
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({
                    active: this.state.activeTab === "contrats",
                  })}
                  onClick={() => this.toggle("contrats")}
                >
                  <FileText className="text-primary mr-50" size={16} /> Contrats
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  id={`documents-link-client-${id}`}
                  className={classnames({
                    active: this.state.activeTab === "documents",
                  })}
                  onClick={() => this.toggle("documents")}
                >
                  <Folder className="text-primary mr-50" size={16} />
                  <span id={`documents-label-client-${id}`}> Documents</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames("d-flex align-items-center", {
                    active: this.state.activeTab === "tasks",
                  })}
                  onClick={() => this.toggle("tasks")}
                >
                  <CheckSquare className="text-primary mr-50" size={16} />
                  Tâches
                  {this.state.taskCount > 0 && (
                    <span
                      className={`badge badge-${this.state.hasUrgentTask ? 'danger' : 'primary'} ml-50`}
                      style={{
                        fontSize: '0.65rem', 
                        minWidth: '18px',
                        height: '18px',
                        padding: '0',
                        lineHeight: '18px',
                        textAlign: 'center',
                        borderRadius: '50%'
                      }}
                    >
                      {this.state.taskCount}
                    </span>
                  )}
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({
                    active: this.state.activeTab === "courriers",
                  })}
                  onClick={() => this.toggle("courriers")}
                >
                  <Mail className="text-primary mr-50" size={16} />
                  <span id={`courriers-label-client-${id}`}> Courriers</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames("d-flex align-items-center", {
                    active: this.state.activeTab === "commentaires",
                  })}
                  onClick={() => this.toggle("commentaires")}
                >
                  <MessageCircle className="text-primary mr-50" size={16} />
                  Commentaires
                  {hasComments && <span className="comment-dot" />}
                </NavLink>
              </NavItem>
              {canAccessSimulator() && (
                <NavItem>
                  <NavLink
                    id={`simulateur-link-client-${id}`}
                    className={classnames({
                      active: this.state.activeTab === "simulateur",
                    })}
                    onClick={() => this.toggle("simulateur")}
                  >
                    <Activity className="text-primary mr-50" size={16} />
                    <span id={`simulateur-label-client-${id}`}>
                      {" "}
                      Simulateur
                    </span>
                  </NavLink>
                </NavItem>
              )}
            </Nav>
          </div>
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="notes">
              <Card className="mb-1">
                <CardBody>
                  <NotesTab
                    data={this.state.rowData}
                    perso={this.state.rowData}
                    members={this.state.members}
                    id={id}
                  />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId="contrats">
              <Contracts id={id} />
            </TabPane>
            <TabPane tabId="documents">
              <DocumentsHub
                ref={this.documentsHubRef}
                id={id}
                name={this.state.rowData.name}
                parent_id={this.state.rowData.parent_id}
                alignOffset={this.state.docsOffset}
                labelId={`documents-label-client-${id}`}
              />
            </TabPane>
            <TabPane tabId="tasks">
              <ClientTasks
                {...this.props}
                match={{
                  params: {
                    id: id,
                    filter: "all",
                  },
                  path: this.props.match.path,
                  url: this.props.match.url,
                }}
                embedded={true}
              />
            </TabPane>
            <TabPane tabId="courriers">
              <CourriersHub
                id={id}
                alignOffset={this.state.courriersOffset}
                labelId={`courriers-label-client-${id}`}
              />
            </TabPane>
            <TabPane tabId="commentaires">
              <Card className="mb-1">
                <CardBody>
                  <CommentsTab
                    data={this.state.rowData}
                    perso={this.state.rowData}
                    members={this.state.members}
                    id={id}
                  />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId="simulateur">
              <SimulatorHub
                id={id}
                alignOffset={this.state.simuOffset}
                user={this.state.rowData}
              />
            </TabPane>
          </TabContent>
        </Col>
      </Row>
    );
  }
}
export default UserEdit;
