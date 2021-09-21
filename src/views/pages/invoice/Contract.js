import React from "react"
import moment from "moment";
import {
  Card,
  CardBody,
  Row,
  Col,
  Media,
  Table,
  InputGroup,
  Input,
  InputGroupAddon,
  Button
} from "reactstrap"
import Breadcrumbs from "../../../components/@vuexy/breadCrumbs/BreadCrumb"
import logo from "../../../assets/img/logo/eor.png"
import { Mail, Phone, FileText, Download } from "react-feather"

import "../../../assets/scss/pages/invoice.scss"
import axios from "axios";

class Contract extends React.Component {
  state = {
    rowData: [],
    perso:[],
    services:[],
    activeTab: "1"
  }

  ifExist(name)
  {
    if (this.state.perso)
      return this.state.perso[name];
    else
      return "N/a";
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.get(global.config.server_url + "/documents/" + this.props.match.params.id, Config).then(response => {
      let services = response.data.services
        axios.get(global.config.server_url + "/users/" + response.data.user_id, Config).then(response => {
          let rowData = response.data
          let perso = response.data.personal_informations
          this.setState({ rowData, perso })
        })
      JSON.stringify(services)
      this.setState({ services })
    })
  }

  disp_services(){
    return this.state.services.name.map((reptile) => <li>{reptile}</li>);
  }

  render() {
    return (
      <React.Fragment>
        <Breadcrumbs
          breadCrumbTitle="Invoice"
          breadCrumbParent="Pages"
          breadCrumbActive="Invoice"
        />
        <Row>
          <Col className="mb-1 invoice-header" md="5" sm="12">
            <InputGroup>
              <Input placeholder="Email" />
              <InputGroupAddon addonType="append">
                <Button.Ripple color="primary" outline>
                  Send Invoice
                </Button.Ripple>
              </InputGroupAddon>
            </InputGroup>
          </Col>
          <Col
            className="d-flex flex-column flex-md-row justify-content-end invoice-header mb-1"
            md="7"
            sm="12"
          >
            <Button
              className="mr-1 mb-md-0 mb-1"
              color="primary"
              onClick={() => window.print()}
            >
              <FileText size="15" />
              <span className="align-middle ml-50">Print</span>
            </Button>
            <Button.Ripple color="primary" outline>
              <Download size="15" />
              <span className="align-middle ml-50">Download</span>
            </Button.Ripple>
          </Col>
          <Col className="invoice-wrapper" sm="12">
            <Card className="invoice-page">
              <CardBody>
                <Row>
                  <Col md="12" sm="12" className="pt-1">
                    <Media className="pt-1">
                      <img src={logo} alt="logo" />
                    </Media>
                  </Col>
                </Row>
                <Row className="pt-2">
                  <Col md="6" sm="12">
                    <h1>Informations</h1>
                    <div className="recipient-info my-2">
                      <h4>{this.ifExist("civility")}</h4>
                      <h4>{this.ifExist("first_name")} {this.ifExist("last_name")}</h4>
                      <h4>Date de naissance: {this.ifExist("birth_date")}</h4>
                    </div>
                  </Col>
                  <Col md="6" sm="12" className="text-right">
                    <div className="invoice-details mt-2">
                      <h3>Date du contrat</h3>
                      <h4>{moment().format("DD/MM/YYYY")}</h4>
                    </div>
                  </Col>
                  <Col md="3" sm="12">
                    <div className="recipient-contact pb-2">
                      <h4>Status Marital: {this.ifExist("martial_status")}</h4>
                      <h4>Service national: {this.ifExist("civility")}</h4>
                      <h4>Nombre d'enfants: {this.ifExist("children_number")}</h4>
                    </div>
                  </Col>
                  <Col md="9" sm="12">
                    <div className="recipient-contact pb-2">
                      <h4>
                        <Phone size={15} className="mr-50" />
                        Mobile: {this.ifExist("mobile_number")}
                      </h4>
                      <h4>
                      <Phone size={15} className="mr-50" />
                      Bureau: {this.ifExist("office_number")}
                      </h4>
                      <h4>
                        <Mail size={15} className="mr-50" />
                        {this.state.rowData.email}
                        </h4>
                    </div>
                  </Col>
                  <Col md="3" sm="12">
                    <div className="recipient-contact pb-2">
                      <h2>Adresse Personnelle</h2>
                      <h4>{this.ifExist("personal_address")}</h4>
                      <h4>{this.ifExist("personal_zip_code")}</h4>
                      <h4>{this.ifExist("personal_city")}</h4>
                      <h4>{this.ifExist("personal_country")}</h4>
                    </div>
                  </Col>
                  <Col md="3" sm="12">
                    <div className="recipient-contact pb-2">
                      <h2>Adresse Entreprise</h2>
                      <h4>{this.ifExist("society_address")}</h4>
                      <h4>{this.ifExist("society_zip_code")}</h4>
                      <h4>{this.ifExist("society_city")}</h4>
                      <h4>{this.ifExist("society_country")}</h4>
                    </div>
                  </Col>
                </Row>

                <div className="invoice-items-table pt-1">
                  <Row>
                    <Col sm="12">
                      <Table responsive borderless>
                        <thead>
                          <tr>
                            <th><h3>TASK DESCRIPTION</h3></th>
                            <th><h3>HOURS</h3></th>
                            <th><h3>RATE</h3></th>
                            <th><h3>AMOUNT</h3></th>
                          </tr>
                        </thead>
                        <tbody>
                        {this.state.services.map((data, key) => {
                          return (
                                <tr>
                                  <td>
                                    <h4>{data.name}</h4>
                                    <p>This is a default service description</p>
                                  </td>
                                  <td><h4>{data.value1}</h4></td>
                                  <td><h4>{data.value}</h4></td>
                                  <td><h4>{data.total_ttc}</h4></td>
                                </tr>
                          );
                        })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </div>
                <div className="invoice-total-table">
                  <Row>
                    <Col
                      sm={{ size: 7, offset: 5 }}
                      xs={{ size: 7, offset: 5 }}
                    >
                      <Table responsive borderless>
                        <tbody>
                          <tr>
                            <th>SUBTOTAL</th>
                            <td>114000 USD</td>
                          </tr>
                          <tr>
                            <th>DISCOUNT (5%)</th>
                            <td>5700 USD</td>
                          </tr>
                          <tr>
                            <th>TOTAL</th>
                            <td>108300 USD</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </div>
                <div className="text-right pt-3 invoice-footer">
                  <p>
                    EOR - 36, RUE DE LABORDE 75008 PARIS  - SIRET N° 48488721100023 - APE N° 7022Z
                  </p>
                </div>
                <div className="text-left pt-3 invoice-footer">
                  <h1>Conditions Générales de ventes de {this.ifExist("first_name")} {this.ifExist("last_name")}</h1>
                  <p>
                  Le Client dispose de 2 jours après la date figurant sur le Contrat de Prestations Retraite pour annuler sa commande auprès d’E.O.R.
                  Passé ce délai, et après avoir reçu les premières correspondances destinées aux Caisses de Retraite, le dossier est considéré comme engagé et le Client ne peut plus interrompre le Contrat de Prestations Retraite conclu : les premières correspondances étant décisives pour la présentation et les orientations d'un dossier.
                  </p><p>
                  Chaque prestation correspond à une mission précise décrite sur le Contrat de Prestation Retraite. Toute intervention de conseil de la part d’E.O.R qui sort du cadre décrit par le présent contrat fera l’objet d’un devis et d’une facturation complémentaire.
                </p><p>
                  E.O.R effectue pour le compte de ses Clients toutes les démarches et opérations qu'elle juge utile pour le bon développement de la mission qui lui est confiée, et ce, jusqu'au terme de cette dernière.
                  La prestation "Montage Départ en Retraite Anticipé" est indépendante de l'Audit Retraite et ne permet donc pas au client de bénéficier d'une reconstitution de carrière complète au sens de l'Audit Retraite, elle n'assure pas non plus le Traitement des Formalités de Départ en Retraite.
                  La prestation "Traitement des Formalités de Départ en Retraite" n'inclut pas les recours éventuels et ultérieurs à effectuer envers les Caisses de Retraite en cas d'erreurs de ces dernières.
                </p><p>
                  Le Client doit impérativement fournir les notifications de versement des pensions de la part des Caisses de Retraite dès qu'il les reçoit, afin qu’EOR puisse intervenir avant le délai de recours imposé par les Caisses de Retraite qui est de 2 mois, si une anomalie est constatée. Faute de quoi la responsabilité d’EOR ne saurait être engagée
                </p><p>
                  Les actions effectuées par EOR auprès des Caisses de Retraite sont totalement transparentes et doivent être signées par le Client avant d'être transmises aux Caisses de Retraite. EOR n'est pas responsable des modifications que le client pourrait effectuer sur les correspondances destinées aux Caisses de Retraite, ni des interventions téléphoniques effectuées par le client directement auprès des Caisses de Retraite, sans en référer à EOR.
                </p><p>
                  Les honoraires perçus par EOR concernent les actions entreprises à l'égard des caisses privées et ne concernent pas le Régime Général de la Sécurité Sociale (CNAV, CNAVTS, CRAM), EOR donnant ses conseils gratuitement et à titre indicatif envers cette dernière Institution.
                  EOR agit en fonction des informations et des documents fournis par le client.
                </p><p>
                  EOR n'est pas responsable des délais imposés par les Caisses de Retraite, et effectue ses relances, si elle le juge utile pour le dossier, selon le délai usuel de deux mois sans réponse de la part d'une Caisse de Retraite.
                  Pour toutes les contestations relatives aux prestations réalisées par EOR et à l’application ou à l’interprétation des présentes Conditions Générale de Vente, seul sera compétent le Tribunal de Commerce de Paris pour les personnes morales, et le Tribunal d’Instance de Paris pour les personnes physiques.
                </p><p>
                  Toutes les prestations fournies par E.O.R sont soumises à la loi française.
                </p><p>
                  A la fin de la prestation, le client est tenu de récupérer tous les documents
                  le concernant et ceux produits durant la mission faute de quoi le cabinet se
                  réserve le droit de détruire les pièces du dossier après 6 mois de conservation
                  dans ses locaux.
                </p>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </React.Fragment>
    )
  }
}

export default Contract
