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
import LabeledCheckboxMaterialUi from 'labeled-checkbox-material-ui';
import logo from "../../../assets/img/logo/contract_logo.jpg"
import { Mail, Phone, FileText, Download } from "react-feather"
import "../../../assets/scss/pages/contract.scss"
import axios from "axios";
import {toast} from "react-toastify";
import {history} from "../../../history";
import jsPDF from 'jspdf';
import * as html2canvas from 'html2canvas';

class EditContract extends React.Component {
  state = {
    rowData: [],
    perso:[],
    services:[],
    activeTab: "1",
    formValues:{
        "f1":"0",     "f2":"0,00",    "f3":"0,00",   "f4":"990",     "f5":"990,00",
        "f6":"1",     "f7":"260,00",  "f8":"1500,00","f9":"2990",    "f10":"0,00",
        "f11":"3990", "f12":"0,00",   "f13":"0,00",  "f14":"1",      "f15":"0,00",
        "f16":"0,00", "f17":"1500",   "f18":"0,00",  "f19":"0",      "f20":"0,00", "f32":"0,00",
        "f21":"750",  "f22":"0,00",   "f23":"0,00",  "f24":"750",    "f25":"0,00",
        "f26":"0,00", "f27":"1250,00","f28":"250,00","f29":"1500,00","f30":"1125,00",
        "f31":"375,00",
        "c1":false,     "c2":true,    "c3":true,   "c4":false,     "c5":true,
        "c6":true,     "c7":false,    "c8":true,   "c9":false,     "c10":true,
        "c11":true,
    },
   user_id:null,
  }

  ifExist(name)
  {
    if (this.state.perso)
      return this.state.perso[name];
    else
      return "N/a";
  }
  handleFieldChange = (field, value) => {
      this.state.formValues[field] = value;
      this.setState(
          {
              formValues: this.state.formValues
          }
      );
  };
  handleCheckChange = (check, field) => {
      this.state.formValues[field] = check;
      this.setState({
          formValues: this.state.formValues
      })
   };
  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.get(global.config.server_url + "/get_contract/" + this.props.match.params.id, Config).then(response => {
      let rowData = response.data.data
      let perso = response.data.data.personal_informations;
      let userData = response.data.data.user;
      perso = Object.assign(perso, userData);
        this.setState(
            {
                user_id: response.data.data.user.id
            }
        );
      this.setState({ rowData, perso})
        if(response.data.data.values != null) {
            let values = JSON.parse(response.data.data.values);
            this.setState(
                {
                    formValues: values
                }
            );
        }
    })
  }
  generatePDF = () =>{
      let pdf_section = document.getElementById("pdf_section");
      var divHeight = pdf_section.offsetHeight;
      var divWidth = pdf_section.offsetWidth;
      var ratio = divHeight / divWidth;
      // var doc = new jsPDF();
      // var elementHTML = pdf_section;
      // var specialElementHandlers = {
      //     '#elementH': function (element, renderer) {
      //         return true;
      //     }
      // };
      // doc.fromHTML(elementHTML, 15, 15, {
      //     'width': 170,
      //     'elementHandlers': specialElementHandlers
      // });

// Save the PDF
//       doc.save('sample-document.pdf');
      window.scrollTo(0,0);
      html2canvas(pdf_section, { scale: '2.6' }).then((canvas) => {
          const imgData = canvas.toDataURL('image/jpeg');
          // const pdfDOC = new jsPDF("l", "mm", "a0"); //  use a4 for smaller page

          // const width = pdfDOC.internal.pageSize.getWidth();
          // let height = pdfDOC.internal.pageSize.getHeight();
          // height = 3 * width;
          // pdfDOC.addImage(imgData, 'JPEG', 0, 0, width - 20, height - 10);
          // pdfDOC.save('summary.pdf');   //Download the rendered PDF.

          var doc = new jsPDF('p', 'pt', [canvas.width - 40, canvas.height]);
          doc.addImage(imgData, 'PDF', 30, 30, canvas.width - 130, canvas.height)
          doc.save('contract.pdf')
      });
  }
  // disp_services(){
  //   return this.state.services.name.map((reptile) => <li>{reptile}</li>);
  // }
  sendForm = () => {
      const Config = {
          headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
          }
      }
      var parameters = {};
      var userid = this.state.user_id;
      parameters['user_id'] = userid;
      parameters['values'] = JSON.stringify(this.state.formValues);

      axios.put(global.config.server_url + "/documents/" + this.props.match.params.id, parameters, Config)
          .then(function(result) {
              history.push("/app/user/edit/" + userid)
          })
          .catch(function(error) {
              toast.error("API injoignable" + error)
          })
  }
  render() {
    return (
      <React.Fragment>
        <Breadcrumbs
          breadCrumbTitle="Contract"
          breadCrumbParent="Pages"
          breadCrumbActive="Contract"
        />
        <Row>
          <Col className="mb-1 contract-header" md="5" sm="12">
            <InputGroup>
              <Input placeholder="Email" />
              <InputGroupAddon addonType="append">
                <Button.Ripple color="primary" outline>
                  Send Contract
                </Button.Ripple>
              </InputGroupAddon>
            </InputGroup>
          </Col>
          <Col
            className="d-flex flex-column flex-md-row justify-content-end contract-header mb-1"
            md="7"
            sm="12"
          >
            <Button
                className="mr-1 mb-md-0 mb-1"
                color="primary"
                onClick={() => {
                    this.sendForm()
                }}
            >
                Save Contract
            </Button>
            <Button
              className="mr-1 mb-md-0 mb-1"
              color="primary"
              onClick={() => window.print()}
            >
              <FileText size="15" />
              <span className="align-middle ml-50">Print</span>
            </Button>
            <Button.Ripple color="primary" outline
                           onClick={() => this.generatePDF()}>
              <Download size="15" />
              <span className="align-middle ml-50">Download</span>
            </Button.Ripple>
          </Col>
          <Col className="contract-wrapper" sm="10" style={{marginLeft:'auto', marginRight:'auto',marginTop:'30px'}}>
            <Card className="contract-page" style={{padding:'1.5rem 2.5rem 2.2rem 2.5rem'}}>
              <CardBody id="pdf_section">
                <Row>
                  <Col md="12" sm="12" >
                      <img src={logo} alt="logo" style={{height:'100px'}}/>
                  </Col>
                </Row>
                <Row>
                  <Col md="6" sm="12">
                    <div className="recipient-info" style={{paddingTop:'1.5rem', paddingBottom:'0.5rem'}}>
                        <Row>
                          <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Civilité</h5> </Col>
                          <Col md="7" sm="12"> <h6>{this.ifExist("civility")}</h6> </Col>
                        </Row>
                        <Row>
                          <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Nom</h5> </Col>
                          <Col md="7" sm="12"> <h6>{this.ifExist("name")}</h6> </Col>
                        </Row>
                        <Row>
                            <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Prénom</h5> </Col>
                          <Col md="7" sm="12"> <h6>{this.ifExist("first_name")} {this.ifExist("last_name")}</h6> </Col>
                        </Row>
                        <Row>
                            <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Date Nais. </h5> </Col>
                          <Col md="7" sm="12"> <h6>{this.ifExist("birth_date")}</h6> </Col>
                        </Row>
                    </div>
                  </Col>
                  <Col md="6" sm="12" className="text-right">
                    <div className="contract-details" style={{paddingTop:'1.5rem', paddingBottom:'0.5rem'}}>
                      <strong>Date du contrat</strong>
                      <h5>{moment().format("DD/MM/YYYY")}</h5>
                    </div>
                  </Col>
                  <Col md="6" sm="12">
                      <div className="recipient-info" style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Statut Marital</h5> </Col>
                              <Col md="7" sm="12"> <h6>{this.ifExist("martial_status")}</h6> </Col>
                          </Row>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Service Nat.</h5> </Col>
                              <Col md="7" sm="12"> <h6>non</h6> </Col>
                          </Row>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Nb d'enfant(s)</h5> </Col>
                              <Col md="7" sm="12"> <h6>{this.ifExist("children_number")}</h6> </Col>
                          </Row>
                      </div>
                  </Col>
                  <Col md="6" sm="12">
                      <div className="recipient-info" style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>
                          <Row>
                              <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Tel mob</h5> </Col>
                              <Col md="8" sm="12"> <h6>{this.ifExist("mobile_number")}</h6> </Col>
                          </Row>
                          <Row>
                              <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Tel bur</h5> </Col>
                              <Col md="8" sm="12"> <h6>{this.ifExist("office_number")} </h6> </Col>
                          </Row>
                          <Row>
                              <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Mail</h5> </Col>
                              <Col md="8" sm="12"> <h6>{this.ifExist("email")}</h6> </Col>
                          </Row>
                      </div>
                  </Col>
                  <Col md="6" sm="12">
                      <div className="recipient-info" style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Personnel</h5> </Col>
                          </Row>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Adresse</h5> </Col>
                              <Col md="7" sm="12"> <h6>{this.ifExist("personal_address")} </h6> </Col>
                          </Row>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">CP</h5> </Col>
                              <Col md="7" sm="12"> <h6>{this.ifExist("personal_zip_code")} </h6> </Col>
                          </Row>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">VILLE</h5> </Col>
                              <Col md="7" sm="12"> <h6>{this.ifExist("personal_city")} </h6> </Col>
                          </Row>
                          <Row>
                              <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">PAYS</h5> </Col>
                              <Col md="7" sm="12"> <h5>{this.ifExist("personal_country")} </h5> </Col>
                          </Row>
                      </div>
                  </Col>
                    <Col md="6" sm="12">
                        <div className="recipient-info" style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>
                            <Row>
                                <Col md="5" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Société</h5> </Col>
                            </Row>
                            <Row>
                                <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">Adresse</h5> </Col>
                                <Col md="8" sm="12"> <h6>{this.ifExist("society_address")}</h6> </Col>
                            </Row>
                            <Row>
                                <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">CP</h5> </Col>
                                <Col md="8" sm="12"> <h6>{this.ifExist("society_zip_code")}</h6> </Col>
                            </Row>
                            <Row>
                                <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">VILLE</h5> </Col>
                                <Col md="8" sm="12"> <h6>{this.ifExist("society_city")}</h6> </Col>
                            </Row>
                            <Row>
                                <Col md="4" sm="12" className="contract-caption1-section"> <h5 className="bold-black">PAYS</h5> </Col>
                                <Col md="8" sm="12"> <h6>{this.ifExist("society_country")}</h6> </Col>
                            </Row>
                        </div>
                    </Col>
                </Row>

                <div className="contract-items-table" style={{border:'2px solid #8d8d8d', padding:'30px 20px', marginTop:'30px',marginBottom:'50px',height:'300px'}}>
                        <h5 className="bold-black"><u>NOTES :</u></h5>
                        <h5 style={{marginTop:'20px'}}>Simulation retraite 62 ans et au taux plein</h5>
                        <h5 className="bold-black" style={{marginTop:'20px'}}>rachat:</h5>
                        <h5>simulation pension si rachat au titre du TAUX et simulation pension au titre du TAUX + DUREE
                            durée d'amortissement du rachat selon les 2 scénarios</h5>
                        <h5 style={{marginTop:'20px'}}>exposé des restrictions liées au rachat</h5>
                </div>
                  <div style={{width:'100%', textAlign:'center', marginTop:'60px'}}>
                        <h1>Contrat de Monsieur HENRY</h1>
                  </div>
                  {/******* table1 ********/}
                  <div style={{display:'flex'}}>
                      <table className="tableCSS" style={{textAlign:'left',fontSize:'12px',marginTop:'30px'}}>
                          {/*------- type1 -------*/}
                          <tr>
                              <td width="75%" style={{paddingTop:'20px'}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c1']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c1')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              CONSULTATION RETRAITE
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              (Taux horaire 260 € HT)
                                          </div>

                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0,marginTop:'-5px'}}>
                                          <div className="bold-black" style={{display:'inline-block'}}>
                                              Nb mm:
                                          </div>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  value={this.state.formValues['f1']}
                                                  onChange={e => this.handleFieldChange("f1", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>Entretien retraite et gestion de fin de carrière </div>
                                  <div style={{marginLeft:'30px'}}>Intervention à périmètre défini</div>
                              </td>
                              <td width="25%" style={{paddingTop:'15px'}}>
                                  <Row>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f2']}
                                              onChange={e => this.handleFieldChange("f2", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <Row style={{marginTop:'5px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px'}}></div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f3']}
                                              onChange={e => this.handleFieldChange("f3", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- type2 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c2']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c2')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              SIMULATION ET CALCULS PENSIONS
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f4']}
                                                  onChange={e => this.handleFieldChange("f4", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>Simulation et calculs selon 2 scénarii de fin de carrière (Rachat/chomage/divorce etc) </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f5']}
                                              onChange={e => this.handleFieldChange("f5", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <br/>
                                  <br/>
                                  <br/>
                              </td>
                          </tr>
                          <tr>
                              <td colSpan="2" style={{paddingTop:'0'}}>
                                  <Row style={{borderBottom:'2px dashed #827b7b', width:'90%',float:'right'}}>
                                      <div style={{display:'inline-block',width:'70%'}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c3']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c3')}
                                              />
                                          </div>
                                          <div style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              Scénario fin carrière supplémentaire 260€ HT
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'40px',verticalAlign:'top',marginTop:'5px'}}>
                                              Nb:
                                          </div>
                                          <div style={{display:'inline-block',paddingTop:'3px',verticalAlign:'top'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  style={{fontWeight:'bold',height:'20px'}}
                                                  value={this.state.formValues['f6']}
                                                  onChange={e => this.handleFieldChange("f6", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block',width:'30%'}}>
                                          <div style={{display:'inline-block', marginLeft:'40px',width: '45px'}}></div>
                                          <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  value={this.state.formValues['f7']}
                                                  onChange={e => this.handleFieldChange("f7", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                              €
                                          </div>
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          <tr>
                              <td width="75%" style={{paddingBottom:0,paddingTop:0}}>
                              </td>
                              <td width="25%" style={{paddingBottom:0,paddingTop:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f8']}
                                              onChange={e => this.handleFieldChange("f8", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- type3 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c4']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c4')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              AUDIT RETRAITE PARTICULIER
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f9']}
                                                  onChange={e => this.handleFieldChange("f9", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f10']}
                                              onChange={e => this.handleFieldChange("f10", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- type2 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c5']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c5')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                               AUDIT RETRAITE ENTREPRISE et LIBERAL
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f11']}
                                                  onChange={e => this.handleFieldChange("f11", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>Analyse de la reconstitution de carrière.</div>
                                  <div style={{marginLeft:'30px'}}>Décomptes des points caisse par caisse.</div>
                                  <div style={{marginLeft:'30px'}}>Intervention et validation auprès des caisses.</div>
                                  <div style={{marginLeft:'30px'}}>Choix des options avec le client</div>
                                  <div style={{marginLeft:'30px'}}>Calculs des futures pensions selon scénarios possibles</div>
                                  <div style={{marginLeft:'30px'}}>Commentaires, conseils et conclusion.</div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top",marginTop:'8px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f12']}
                                              onChange={e => this.handleFieldChange("f12", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <Row style={{verticalAlign:"top",marginTop:'3px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f13']}
                                              onChange={e => this.handleFieldChange("f13", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <br/>
                                  <br/>
                                  <br/>
                                  <br/>
                                  <br/>
                              </td>
                          </tr>
                          <tr>
                              <td colSpan="2" style={{paddingTop:'0'}}>
                                  <Row style={{borderBottom:'2px dashed #827b7b', width:'90%',float:'right'}}>
                                      <div style={{display:'inline-block',width:'70%'}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c6']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c6')}
                                              />
                                          </div>
                                          <div style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              Période à l'étranger (850€ HT)
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'140px',verticalAlign:'top',marginTop:'5px'}}>
                                              Nb:
                                          </div>
                                          <div style={{display:'inline-block',paddingTop:'3px',verticalAlign:'top'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  style={{fontWeight:'bold',height:'20px'}}
                                                  value={this.state.formValues['f14']}
                                                  onChange={e => this.handleFieldChange("f14", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block',width:'30%'}}>
                                          <div style={{display:'inline-block', marginLeft:'40px',width: '45px'}}></div>
                                          <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  value={this.state.formValues['f15']}
                                                  onChange={e => this.handleFieldChange("f15", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                              €
                                          </div>
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          <tr>
                              <td width="75%" style={{paddingBottom:0,paddingTop:0}}>
                              </td>
                              <td width="25%" style={{paddingBottom:0,paddingTop:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f16']}
                                              onChange={e => this.handleFieldChange("f16", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- type2 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c7']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c7')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              LIQUIDATION DES PENSIONS INCLUS
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f17']}
                                                  onChange={e => this.handleFieldChange("f17", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>Liquidation et vérification des pensions</div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f18']}
                                              onChange={e => this.handleFieldChange("f18", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <br/>
                              </td>
                          </tr>
                          <tr>
                              <td colSpan="2" style={{paddingTop:'0'}}>
                                  <Row style={{borderBottom:'2px dashed #827b7b', width:'90%',float:'right'}}>
                                      <div style={{display:'inline-block',width:'70%'}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c8']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c8')}
                                              />
                                          </div>
                                          <div style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              Période à l'étranger (750€ HT)
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'140px',verticalAlign:'top',marginTop:'5px'}}>
                                              Nb:
                                          </div>
                                          <div style={{display:'inline-block',paddingTop:'3px',verticalAlign:'top'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  style={{fontWeight:'bold',height:'20px'}}
                                                  value={this.state.formValues['f19']}
                                                  onChange={e => this.handleFieldChange("f19", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block',width:'30%'}}>
                                          <div style={{display:'inline-block', marginLeft:'40px',width: '45px'}}></div>
                                          <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  value={this.state.formValues['f20']}
                                                  onChange={e => this.handleFieldChange("f20", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                              €
                                          </div>
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          <tr>
                              <td width="75%" style={{paddingBottom:0,paddingTop:0}}>
                                  <div style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                      (inclus sous réserve de la date de départ en retraite dans les 12 mois de la
                                  </div>
                                  <div style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                      signature de l’audit)
                                  </div>
                                  <div style={{display:'inline-block',width:'30px',marginLeft:'10px',}}>
                                          <LabeledCheckboxMaterialUi label=""
                                                                     checked={this.state.formValues['c9']}
                                                                     onChange={(event) => this.handleCheckChange(event,'c9')}
                                          />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0,paddingTop:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f32']}
                                              onChange={e => this.handleFieldChange("f32", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- type2 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c10']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c10')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              ACTUALISATION ANNUELLE AUDIT
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f21']}
                                                  onChange={e => this.handleFieldChange("f21", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>Mise à jour de votre audit retraite</div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f22']}
                                              onChange={e => this.handleFieldChange("f22", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f23']}
                                              onChange={e => this.handleFieldChange("f23", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- type2 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:'30px'}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c11']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c11')}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',verticalAlign:'top',marginTop:'5px'}}>
                                              RACHAT DE TRIMESTRE à facturer si rachat effectif
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f24']}
                                                  onChange={e => this.handleFieldChange("f24", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>Formalités administratives</div>
                              </td>
                              <td width="25%" style={{paddingBottom:'30px'}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f25']}
                                              onChange={e => this.handleFieldChange("f25", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f26']}
                                              onChange={e => this.handleFieldChange("f26", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black" style={{display:'inline-block',marginLeft:'3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                      </table>
                      <div class="vertical-line"></div>
                  </div>
                  {/******* table2 ********/}
                  <div style={{display: 'flex'}}>
                      <table className="tableCSS" style={{textAlign: 'left', fontSize: '12px', marginTop: '30px'}}>
                          <tr>
                              <td width="75%" style={{paddingTop: '20px',borderRight:'2px solid #8d8d8d'}}>
                                  <div style={{marginLeft: '30px',fontStyle: 'italic'}} className="bold-black"><u>Commentaires:</u></div>
                                  <div style={{marginLeft: '30px'}}>Toute intervention particulière à la demande du client, n'entrant pas dans le cadre  TOTAL HT 1 250,00 €
                                      du présent contrat, fera l'objet d'un devis.
                                  </div>
                                  <br/>
                                  <br/>
                              </td>
                              <td width="25%" style={{paddingTop: '15px',borderLeft:'2px solid #8d8d8d'}}>
                                  <Row>
                                      <div style={{ display: 'inline-block', marginLeft: '40px', width: '45px', textAlign: 'center'}}>
                                          TOTAL
                                      </div>
                                      <div style={{display: 'inline-block', width: '40px', textAlign: 'center'}}>
                                          HT
                                      </div>
                                      <div style={{display: 'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f27']}
                                              onChange={e => this.handleFieldChange("f27", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black"
                                           style={{display: 'inline-block', marginLeft: '3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <Row style={{marginTop: '5px'}}>
                                      <div style={{display: 'inline-block', marginLeft: '40px', width: '45px'}}>TVA</div>
                                      <div style={{display: 'inline-block', width: '40px', textAlign: 'center'}}>
                                          20%
                                      </div>
                                      <div style={{display: 'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f28']}
                                              onChange={e => this.handleFieldChange("f28", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black"
                                           style={{display: 'inline-block', marginLeft: '3px'}}>
                                          €
                                      </div>
                                  </Row>
                                  <Row style={{marginTop: '5px'}}>
                                      <div style={{display: 'inline-block', marginLeft: '40px', width: '45px'}}>TOTAL</div>
                                      <div style={{display: 'inline-block', width: '40px', textAlign: 'center'}}>
                                          TTC
                                      </div>
                                      <div style={{display: 'inline-block'}}>
                                          <Input
                                              type="text"
                                              className="contract-text2"
                                              value={this.state.formValues['f29']}
                                              onChange={e => this.handleFieldChange("f29", e.target.value )}
                                              required
                                          />
                                      </div>
                                      <div className="bold-black"
                                           style={{display: 'inline-block', marginLeft: '3px'}}>
                                          €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                      </table>
                  </div>
                  {/******* table3 ********/}
                  <div style={{display: 'flex'}}>
                      <table className="tableCSS" style={{textAlign: 'left', fontSize: '12px', marginTop: '30px'}}>
                          <tr>
                              <td width="75%" style={{paddingTop: '20px',borderRight:'2px solid #8d8d8d'}}>
                                  <div style={{marginLeft: '30px',fontStyle: 'italic'}} className="bold-black"><u>Modalités de règlement:</u></div>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',verticalAlign:'top',marginTop:'5px'}}>
                                              Acompte à la commande : 75%
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0,marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f30']}
                                                  onChange={e => this.handleFieldChange("f30", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',verticalAlign:'top',marginTop:'5px'}}>
                                              Solde fin de mission : 25%
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0,marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['f31']}
                                                  onChange={e => this.handleFieldChange("f31", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                              </td>
                              <td width="25%" style={{paddingTop: '15px',borderLeft:'2px solid #8d8d8d'}}>
                                  <div style={{fontStyle: 'italic'}} className="bold-black"><u>Date & signature du client:</u></div>
                                  <br/>
                                  <br/>
                                  <br/>
                              </td>
                          </tr>
                      </table>
                  </div>
                <div className="text-left pt-3 contract-footer">
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
                  <div className="text-right pt-3 contract-footer">
                      <p>
                          EOR - 36, RUE DE LABORDE 75008 PARIS  - SIRET N° 48488721100023 - APE N° 7022Z
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

export default EditContract
