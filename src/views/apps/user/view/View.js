import React from "react"
import { Card, CardHeader, CardTitle, CardBody, Row, Col, Button, Input, Label, FormGroup } from "reactstrap"
import { User as UserIcon, FileText, File, CheckSquare, MessageCircle } from "react-feather"
import axios from "axios"
import { toast } from "react-toastify"
import "../../../../assets/scss/pages/users.scss"

class UserView extends React.Component {
  state = {
    client: {},
    notes: "",
    contracts: [],
    tasks: []
  }

  async componentDidMount() {
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
    const id = (this.props.match && this.props.match.params && this.props.match.params.id) || localStorage.getItem("userid")
    try {
      const res = await axios.get(`${global.config.server_url}/users/${id}`, Config)
      const client = res.data || {}
      this.setState({ client, notes: client.notes || "" })
    } catch (e) { console.warn("Impossible de charger le client", e) }
    try {
      const resC = await axios.get(`${global.config.server_url}/documents/user/${id}`, Config)
      this.setState({ contracts: Array.isArray(resC.data) ? resC.data : [] })
    } catch (e) { console.warn("Impossible de charger les contrats", e) }
    try {
      const resT = await axios.get(`${global.config.server_url}/customer_tasks?filter=all&user_id=${id}`, Config)
      this.setState({ tasks: Array.isArray(resT.data) ? resT.data : [] })
    } catch (e) { console.warn("Impossible de charger les tâches", e) }
  }

  handleSaveNotes = async () => {
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      const id = (this.props.match && this.props.match.params && this.props.match.params.id) || localStorage.getItem("userid")
      await axios.put(`${global.config.server_url}/personal_information/${id}`, { notes: this.state.notes }, Config)
      toast.info("Modifications enregistrées")
      this.setState((s) => ({ client: { ...s.client, notes: s.notes } }))
    } catch (e) { toast.error("Impossible d'enregistrer les notes") }
  }

  render() {
    const u = this.state.client || {}
    const fmt = (v) => (v ? String(v) : "—")
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Client"

    return (
      <React.Fragment>
        <Row>
          {/* Colonne gauche: informations client */}
          <Col lg="4" md="5" sm="12" className="mb-1">
            <Card className="h-100">
              <CardBody className="d-flex flex-column">
                <div className="d-flex justify-content-center mb-1">
                  <div style={{ width:64,height:64,borderRadius:"50%",border:"1px solid #c4b5fd",backgroundColor:"#f5f5ff",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <UserIcon size={28} color="#7367f0" />
                  </div>
                </div>
                <h4 className="mb-1 text-center">{fullName}</h4>
                {u.role ? (<div className="d-flex justify-content-center mb-1"><span className="badge badge-pill badge-light-primary">{String(u.role).toUpperCase()}</span></div>):null}
                <div className="mb-2">
                  <h5 className="mb-50">Détails</h5>
                  <div style={{ borderTop: "1px solid #ebe9f1", margin: "0.5rem 0 1rem" }} />
                  <div className="users-page-view-table">
                    <div className="d-flex user-info"><div className="user-info-title font-weight-bold">Email</div><div className="text-truncate">{fmt(u.email)}</div></div>
                    <div className="d-flex user-info"><div className="user-info-title font-weight-bold">Téléphone</div><div className="text-truncate">{fmt(u.mobile_number || u.office_number)}</div></div>
                    <div className="d-flex user-info"><div className="user-info-title font-weight-bold">Pays</div><div className="text-truncate">{fmt(u.personal_country)}</div></div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Colonne droite: pavés */}
          <Col lg="8" md="7" sm="12">
            {/* Contrats */}
            <Card className="mb-1">
              <CardHeader className="pb-0 d-flex align-items-center">
                <CardTitle className="mb-0 d-flex align-items-center"><FileText className="primary mr-50" size={18}/> Contrats</CardTitle>
              </CardHeader>
              <CardBody>
                {this.state.contracts.length ? (
                  <ul className="mb-0" style={{ listStyle:'none', paddingLeft:0 }}>
                    {this.state.contracts.slice(0,5).map(c => (
                      <li key={c.id} className="d-flex justify-content-between align-items-center py-25" style={{ borderBottom:'1px solid #f1f1f3' }}>
                        <div>
                          <div className="font-weight-bold text-truncate" style={{ maxWidth:360 }}>{fmt(c.comment)}</div>
                          <small className="text-muted">{fmt(c.document_state)} • {fmt(c.type)}</small>
                        </div>
                        <small className="text-muted">{c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—'}</small>
                      </li>
                    ))}
                  </ul>
                ) : (<p className="mb-0 text-muted">Aucun contrat.</p>)}
              </CardBody>
            </Card>

            {/* Notes */}
            <Card className="mb-1">
              <CardHeader className="pb-0 d-flex align-items-center">
                <CardTitle className="mb-0 d-flex align-items-center"><UserIcon className="primary mr-50" size={18}/> Notes</CardTitle>
              </CardHeader>
              <CardBody>
                <FormGroup>
                  <Label for="client-notes">Notes</Label>
                  <Input type="textarea" id="client-notes" rows="8" placeholder="Notes" value={this.state.notes} onChange={(e)=>this.setState({notes:e.target.value})} />
                </FormGroup>
                <div className="d-flex justify-content-end">
                  <Button color="primary" onClick={this.handleSaveNotes}>Enregistrer</Button>
                </div>
              </CardBody>
            </Card>

            {/* Documents (aperçu basé sur contrats) */}
            <Card className="mb-1">
              <CardHeader className="pb-0 d-flex align-items-center">
                <CardTitle className="mb-0 d-flex align-items-center"><File className="primary mr-50" size={18}/> Documents</CardTitle>
              </CardHeader>
              <CardBody>
                {this.state.contracts.length ? (
                  <ul className="mb-0" style={{ listStyle:'none', paddingLeft:0 }}>
                    {this.state.contracts.slice(0,5).map(d => (
                      <li key={`doc-${d.id}`} className="d-flex justify-content-between align-items-center py-25" style={{ borderBottom:'1px solid #f1f1f3' }}>
                        <div>
                          <div className="font-weight-bold text-truncate" style={{ maxWidth:360 }}>{fmt(d.comment)}</div>
                          <small className="text-muted">{fmt(d.type)}</small>
                        </div>
                        <small className="text-muted">{d.updated_at ? new Date(d.updated_at).toLocaleDateString('fr-FR') : '—'}</small>
                      </li>
                    ))}
                  </ul>
                ) : (<p className="mb-0 text-muted">Aucun document.</p>)}
              </CardBody>
            </Card>

            {/* Tasks */}
            <Card className="mb-1">
              <CardHeader className="pb-0 d-flex align-items-center">
                <CardTitle className="mb-0 d-flex align-items-center"><CheckSquare className="primary mr-50" size={18}/>Tâches</CardTitle>
              </CardHeader>
              <CardBody>
                {this.state.tasks.length ? (
                  <ul className="mb-0" style={{ listStyle:'none', paddingLeft:0 }}>
                    {this.state.tasks.slice(0,5).map(t => (
                      <li key={`task-${t.id || t.task_id || Math.random()}`} className="d-flex justify-content-between align-items-center py-25" style={{ borderBottom:'1px solid #f1f1f3' }}>
                        <div>
                          <div className="font-weight-bold text-truncate" style={{ maxWidth:360 }}>{fmt(t.title || t.name)}</div>
                          <small className="text-muted">{fmt(t.status || t.label)}</small>
                        </div>
                        <small className="text-muted">{t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}</small>
                      </li>
                    ))}
                  </ul>
                ) : (<p className="mb-0 text-muted">Aucune tâche.</p>)}
              </CardBody>
            </Card>

            {/* Commentaires */}
            <Card>
              <CardHeader className="pb-0 d-flex align-items-center">
                <CardTitle className="mb-0 d-flex align-items-center"><MessageCircle className="primary mr-50" size={18}/> Commentaires</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="mb-0 text-muted">Aucun commentaire pour le moment.</p>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </React.Fragment>
    )
  }
}
export default UserView
