import React from "react";
import { Card, CardHeader, CardTitle, CardBody, Row, Col, Button, Input, Label, FormGroup, Nav, NavItem, NavLink, TabContent, TabPane, Alert, NavbarToggler } from "reactstrap";
import classnames from "classnames";
import UserDetails from "./UserDetails";
//import { Edit, Trash, Lock, Check } from "react-feather"
//import { Link } from "react-router-dom"
//import Checkbox from "../../../components/@vuexy/checkbox/CheckboxesVuexy"
//import userImg from "../../../assets/img/portrait/small/avatar-s-18.jpg"
import "../../../assets/scss/pages/users.scss";
import "./Profile.css";
import { history } from "../../../history";
//import { useTranslation } from 'react-i18next';
import axios from "axios";
import { toast } from "react-toastify";
import { Globe, FileText, File, CheckSquare, MessageCircle, Lock, Activity, Disc, Circle } from "react-feather";
import SimulatorHub from "../user/edit/SimulatorHub";
import DocumentsHub from "../user/edit/DocumentsHub";

/*const handleNavigation = (e, path) => {
  e.preventDefault()
  history.push(path)
}*/

class UserView extends React.Component {
  state = {
    rowData: [],
    notes: "",
    contracts: [],
    tasks: [],
    activeTab: "notes",
    isCollapsed: false,
    // Security tab state
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    alert: null,
    simuOffset: 0,
    docsOffset: 0,
  };

  navRef = null;

  computeSimuOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById('simulateur-label-profile');
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ simuOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };
  computeDocsOffset = () => {
    try {
      const nav = this.navRef;
      const label = document.getElementById('documents-label-profile');
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ docsOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  computeDocsOffset = () => {
    try {
      const nav = this.navRef;
      const link = document.getElementById('documents-link-profile');
      if (nav && link) {
        const delta = link.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        this.setState({ docsOffset: Math.max(0, Math.round(delta)) });
      }
    } catch (e) {}
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    var userid = localStorage.getItem("userid");

    await axios
      .get(global.config.server_url + "/users/" + userid, Config)
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData, notes: rowData?.notes || "" });
      });

    // Charger un aperçu des contrats de l'utilisateur
    try {
      const res = await axios.get(`${global.config.server_url}/documents/user/${userid}`, Config);
      const list = Array.isArray(res.data) ? res.data : [];
      this.setState({ contracts: list });
    } catch (e) {
      console.warn('Impossible de charger les contrats', e);
    }

    // Charger un aperçu des tâches de l'utilisateur
    try {
      const resT = await axios.get(`${global.config.server_url}/customer_tasks?filter=all&user_id=${userid}`, Config);
      const listT = Array.isArray(resT.data) ? resT.data : [];
      this.setState({ tasks: listT });
    } catch (e) {
      console.warn('Impossible de charger les tâches', e);
    }
  }
  handleSaveNotes = async () => {
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      const userid = localStorage.getItem("userid");
      await axios.put(`${global.config.server_url}/personal_information/${userid}`, { notes: this.state.notes }, Config);
      toast.info("Modifications enregistrées");
      this.setState((s) => ({ rowData: { ...s.rowData, notes: s.notes } }));
    } catch (e) {
      console.error(e);
      toast.error("Impossible d'enregistrer les notes");
    }
  };
  toggleTab = (tab) => {
    if (this.state.activeTab !== tab) {
      const next = { activeTab: tab };
      if (tab === 'simulateur' && !this.state.isCollapsed) next.isCollapsed = true;
      this.setState(next, () => {
        if (tab === 'simulateur') setTimeout(this.computeSimuOffset, 0);
        if (tab === 'documents') setTimeout(this.computeDocsOffset, 0);
      });
    }
  };

  handleResetPwd = () => {
    this.setState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      alert: null,
    });
  };

  handlePasswordChange = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = this.state;
    if (!currentPassword || !newPassword || !confirmPassword) {
      this.setState({ alert: { type: "danger", message: "Tous les champs sont requis." } });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.setState({ alert: { type: "danger", message: "Les mots de passe ne correspondent pas." } });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${global.config.server_url}/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res && res.status === 200) {
        this.setState({ alert: { type: "success", message: "Mot de passe changé avec succès." } });
        this.handleResetPwd();
      }
    } catch (err) {
      const message = (err && err.response && (err.response.data && (err.response.data.message || err.response.data.error))) || "Erreur lors du changement de mot de passe.";
      this.setState({ alert: { type: "danger", message } });
    }
  };
  render() {
    return (
      <React.Fragment>
        <Row className='align-items-start'>
          <Col md="4" className={classnames('profile-left profile-sidebar-fixed', { collapsed: this.state.isCollapsed })}>
            <div>
              <UserDetails
                user={this.state.rowData || {}}
                onEdit={() => history.push(`/app/member/edit/${localStorage.getItem("userid")}/1`)}
                showCollapse
                onCollapse={() => this.setState({ isCollapsed: true })}
              />
            </div>
          </Col>
          <Col md="8" className={classnames('profile-right', { expanded: this.state.isCollapsed })}>
            {/* Onglets */}
            <Nav tabs className="border-0 d-flex align-items-center gap-3 mb-1" ref={el => (this.navRef = el)}>
              {this.state.isCollapsed && (
                <NavItem>
                  <NavLink onClick={() => this.setState({ isCollapsed: false })} className='p-0'>
                    <Circle className="toggle-icon icon-x font-medium-4 text-primary" size={20} />
                  </NavLink>
                </NavItem>
              )}
              <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'notes' })} onClick={() => this.toggleTab('notes')}>
                  <Globe className='text-primary mr-50' size={16}/> Notes
                </NavLink>
              </NavItem>
              {/* <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'security' })} onClick={() => this.toggleTab('security')}>
                  <Lock className='text-primary mr-50' size={16}/> Sécurité
                </NavLink>
              </NavItem> */}
              <NavItem>
                <NavLink id='documents-link-profile' className={classnames({ active: this.state.activeTab === 'documents' })} onClick={() => this.toggleTab('documents')}>
                  <File className='text-primary mr-50' size={16}/>
                  <span id='documents-label-profile'> Documents</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'tasks' })} onClick={() => this.toggleTab('tasks')}>
                  <CheckSquare className='text-primary mr-50' size={16}/> Tâches
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'commentaires' })} onClick={() => this.toggleTab('commentaires')}>
                  <MessageCircle className='text-primary mr-50' size={16}/> Commentaires
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink id='simulateur-link-profile' className={classnames({ active: this.state.activeTab === 'simulateur' })} onClick={() => this.toggleTab('simulateur')}>
                  <Activity className='text-primary mr-50' size={16}/>
                  <span id='simulateur-label-profile'> Simulateur</span>
                </NavLink>
              </NavItem>
            </Nav>

            <TabContent activeTab={this.state.activeTab}>
              {/* Sécurité */}
              <TabPane tabId='security'>
                <Card className='mb-1 shadow-sm rounded-2xl'>
                  <CardHeader className='pb-0'>
                    <CardTitle tag='h5' className='d-flex align-items-center'>
                      <Lock className='text-primary mr-50' size={18}/> Sécurité
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Label className='font-weight-bold mb-50'>Changer le mot de passe</Label>
                    {this.state.alert ? (
                      <Alert color={this.state.alert.type} className='mt-50'>
                        {this.state.alert.message}
                      </Alert>
                    ) : null}
                    <form onSubmit={this.handlePasswordChange}>
                      <div className='row mt-1'>
                        <div className='col-md-6 mb-1'>
                          <Label>Mot de passe actuel</Label>
                          <div className='d-flex'>
                            <Input type={this.state.showCurrent ? 'text' : 'password'} value={this.state.currentPassword} onChange={(e)=>this.setState({currentPassword:e.target.value})} placeholder='••••••••' />
                            <Button type='button' color='light' className='ml-50' onClick={()=>this.setState({showCurrent:!this.state.showCurrent})}>
                              {this.state.showCurrent ? 'Masquer' : 'Voir'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className='row'>
                        <div className='col-md-6 mb-1'>
                          <Label>Nouveau mot de passe</Label>
                          <div className='d-flex'>
                            <Input type={this.state.showNew ? 'text' : 'password'} value={this.state.newPassword} onChange={(e)=>this.setState({newPassword:e.target.value})} placeholder='••••••••' />
                            <Button type='button' color='light' className='ml-50' onClick={()=>this.setState({showNew:!this.state.showNew})}>
                              {this.state.showNew ? 'Masquer' : 'Voir'}
                            </Button>
                          </div>
                        </div>
                        <div className='col-md-6 mb-1'>
                          <Label>Confirmer le mot de passe</Label>
                          <div className='d-flex'>
                            <Input type={this.state.showConfirm ? 'text' : 'password'} value={this.state.confirmPassword} onChange={(e)=>this.setState({confirmPassword:e.target.value})} placeholder='••••••••' />
                            <Button type='button' color='light' className='ml-50' onClick={()=>this.setState({showConfirm:!this.state.showConfirm})}>
                              {this.state.showConfirm ? 'Masquer' : 'Voir'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className='mt-1'>
                        <p className='font-weight-bold mb-50'>Exigences du mot de passe :</p>
                        <ul className='mb-1'>
                          <li>Minimum 8 caractères</li>
                          <li>Contient au moins une majuscule et une minuscule</li>
                          <li>Contient un chiffre ou symbole</li>
                        </ul>
                        <div className='d-flex'>
                          <Button color='primary' type='submit' className='mr-50'>Enregistrer</Button>
                          <Button color='secondary' outline type='reset' onClick={this.handleResetPwd}>Réinitialiser</Button>
                        </div>
                      </div>
                    </form>
                  </CardBody>
                </Card>
              </TabPane>
              {/* Simulateur */}
              <TabPane tabId='simulateur'>
                <SimulatorHub id={localStorage.getItem('userid')} alignOffset={this.state.simuOffset} />
              </TabPane>
              {/* Notes */}
              <TabPane tabId='notes'>
                <Card className='mb-1 shadow-sm rounded-2xl'>
                  <CardHeader className='pb-0'>
                    <CardTitle tag='h5' className='d-flex align-items-center'>
                      <Globe className='text-primary mr-50' size={18}/> Notes
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <FormGroup>
                      <Label for='notes' className='fw-bold mb-1'>Notes</Label>
                      <Input type='textarea' id='notes' value={this.state.notes} placeholder='Notes' onChange={(e)=>this.setState({notes:e.target.value})} rows='8' style={{ borderRadius:'10px', resize:'none' }}/>
                    </FormGroup>
                    <div className='d-flex justify-content-end'>
                      <Button color='primary' onClick={this.handleSaveNotes}>Enregistrer</Button>
                    </div>
                  </CardBody>
                </Card>
              </TabPane>


              {/* Documents */}
              <TabPane tabId='documents'>
                <DocumentsHub id={localStorage.getItem('userid')} alignOffset={this.state.docsOffset} labelId={'documents-label-profile'} />
              </TabPane>

              {/* Tasks */}
              <TabPane tabId='tasks'>
                <Card className='mb-1 shadow-sm rounded-2xl'>
                  <CardHeader className='pb-0'>
                    <CardTitle tag='h5' className='d-flex align-items-center'>
                      <CheckSquare className='text-primary mr-50' size={18}/> Tâches
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    {this.state.tasks && this.state.tasks.length > 0 ? (
                      <ul className='mb-0' style={{ listStyle:'none', paddingLeft:0 }}>
                        {this.state.tasks.slice(0,5).map((t)=>(
                          <li key={`task-${t.id || t.task_id || Math.random()}`} className='d-flex justify-content-between align-items-center py-25' style={{ borderBottom:'1px solid #f1f1f3' }}>
                            <div>
                              <div className='font-weight-bold text-truncate' style={{ maxWidth:360 }}>{t.title || t.name || 'Tâche'}</div>
                              <small className='text-muted'>{t.status || t.label || '—'}</small>
                            </div>
                            <small className='text-muted'>{t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (<p className='mb-0 text-muted'>Aucune tâche.</p>)}
                  </CardBody>
                </Card>
              </TabPane>

              {/* Commentaires */}
              <TabPane tabId='commentaires'>
                <Card className='mb-1 shadow-sm rounded-2xl'>
                  <CardHeader className='pb-0'>
                    <CardTitle tag='h5' className='d-flex align-items-center'>
                      <MessageCircle className='text-primary mr-50' size={18}/> Commentaires
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <p className='mb-0 text-muted'>Aucun commentaire pour le moment.</p>
                  </CardBody>
                </Card>
              </TabPane>
            </TabContent>
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}
export default UserView;
