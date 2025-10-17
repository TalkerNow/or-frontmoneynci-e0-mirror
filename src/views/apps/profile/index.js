import React from "react";
import { Card, CardHeader, CardTitle, CardBody, Row, Col, Button, Input, Label, FormGroup, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import classnames from "classnames";
import UserDetails from "./UserDetails";
//import { Edit, Trash, Lock, Check } from "react-feather"
//import { Link } from "react-router-dom"
//import Checkbox from "../../../components/@vuexy/checkbox/CheckboxesVuexy"
//import userImg from "../../../assets/img/portrait/small/avatar-s-18.jpg"
import "../../../assets/scss/pages/users.scss";
import { history } from "../../../history";
//import { useTranslation } from 'react-i18next';
import axios from "axios";
import { toast } from "react-toastify";
import { Globe, FileText, File, CheckSquare, MessageCircle } from "react-feather";

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
    if (this.state.activeTab !== tab) this.setState({ activeTab: tab });
  };
  render() {
    return (
      <React.Fragment>
        <Row>
          <Col lg="4" md="5" sm="12" className="mb-1">
            <UserDetails user={this.state.rowData || {}} onEdit={() => history.push(`/app/member/edit/${localStorage.getItem("userid")}/1`)} />
          </Col>
          <Col lg="8" md="7" sm="12">
            {/* Onglets */}
            <Nav tabs className="border-0 d-flex align-items-center gap-3 mb-1">
              <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'notes' })} onClick={() => this.toggleTab('notes')}>
                  <Globe className='text-primary mr-50' size={16}/> Notes
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'contrats' })} onClick={() => this.toggleTab('contrats')}>
                  <FileText className='text-primary mr-50' size={16}/> Contrats
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink className={classnames({ active: this.state.activeTab === 'documents' })} onClick={() => this.toggleTab('documents')}>
                  <File className='text-primary mr-50' size={16}/> Documents
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
            </Nav>

            <TabContent activeTab={this.state.activeTab}>
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

              {/* Contrats */}
              <TabPane tabId='contrats'>
                <Card className='mb-1 shadow-sm rounded-2xl'>
                  <CardHeader className='pb-0'>
                    <CardTitle tag='h5' className='d-flex align-items-center'>
                      <FileText className='text-primary mr-50' size={18}/> Contrats
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    {this.state.contracts && this.state.contracts.length > 0 ? (
                      <ul className='mb-0' style={{ listStyle:'none', paddingLeft:0 }}>
                        {this.state.contracts.slice(0,5).map((c)=>(
                          <li key={c.id} className='d-flex justify-content-between align-items-center py-25' style={{ borderBottom:'1px solid #f1f1f3' }}>
                            <div>
                              <div className='font-weight-bold text-truncate' style={{ maxWidth:360 }}>{c.comment || '—'}</div>
                              <small className='text-muted'>{(c.document_state || '—') + ' • ' + (c.type || 'document')}</small>
                            </div>
                            <small className='text-muted'>{c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (<p className='mb-0 text-muted'>Aucun contrat.</p>)}
                  </CardBody>
                </Card>
              </TabPane>

              {/* Documents */}
              <TabPane tabId='documents'>
                <Card className='mb-1 shadow-sm rounded-2xl'>
                  <CardHeader className='pb-0'>
                    <CardTitle tag='h5' className='d-flex align-items-center'>
                      <File className='text-primary mr-50' size={18}/> Documents
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    {this.state.contracts && this.state.contracts.length > 0 ? (
                      <ul className='mb-0' style={{ listStyle:'none', paddingLeft:0 }}>
                        {this.state.contracts.slice(0,5).map((d)=>(
                          <li key={`doc-${d.id}`} className='d-flex justify-content-between align-items-center py-25' style={{ borderBottom:'1px solid #f1f1f3' }}>
                            <div>
                              <div className='font-weight-bold text-truncate' style={{ maxWidth:360 }}>{d.comment || '—'}</div>
                              <small className='text-muted'>{(d.type || 'document')}</small>
                            </div>
                            <small className='text-muted'>{d.updated_at ? new Date(d.updated_at).toLocaleDateString('fr-FR') : '—'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (<p className='mb-0 text-muted'>Aucun document.</p>)}
                  </CardBody>
                </Card>
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
