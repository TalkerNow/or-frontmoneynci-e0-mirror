/* eslint-disable */

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
import LabeledCheckboxMaterialUi from 'labeled-checkbox-material-ui';
import Breadcrumbs from "../../../components/@vuexy/breadCrumbs/BreadCrumb"
import logo from "../../../assets/img/logo/contract_logo.jpg"
import { Mail, Phone, FileText, Download } from "react-feather"
import { Check } from "react-feather"
import "../../../assets/scss/pages/contract.scss"
import axios from "axios";
import Checkbox from "../../../components/@vuexy/checkbox/CheckboxesVuexy";
import {toast} from "react-toastify";
import {history} from "../../../history";
var input_values = {
    "c1":false,     "c2":true,    "c3":true,   "c4":false,     "c5":true,
    "c6":true,  "c7":true,   "cnb2":false,    "cnb4":true,   "cnb5":false,     "cc5":false,
    "nb1":"5",      "nb2":"1",     "nb4":"0",     "nb5":"10",
    "nb1-price":"260", "nb2-price":"300",      "nb4-price": "850",     "nb5-price": "750",
    "p2":"1500",       "p3":"1500",      "p4":"1500",      "p5":"1500",     "p6":"1500",    "p7":"1500",
    "TVAP":"20", "fp1":'75', "fp2":'25'
};
class TemplateContract extends React.Component {
  state = {
    services:[],
    activeTab: "1",
    formValues:{
        "c1":false,     "c2":true,    "c3":true,   "c4":false,     "c5":true,
        "nb1-price":"260", "nb2-price": "300",      "nb4-price": "850",     "nb5-price": "750",
        "c6":true,  "c7":true,   "cnb2":false,    "cnb4":true,   "cnb5":false,     "cc5":false,
    },
    templateValues:{
        "nb1-price":"260", "nb2-price": "300",      "nb4-price": "850",     "nb5-price": "750",

    },
    general_condition:'',
  }

  handleFieldChange = (field, value) => {
      input_values[field] = value;
      this.state.formValues[field] = value;
      if(field == "fp1") {
          this.state.formValues["fp2"] = 100 - value;
          input_values["fp2"] = value;
      }
      if(field == "fp2") {
          this.state.formValues["fp1"] = 100 - value;
          input_values["fp1"] = value;
      }

      this.setState(
          {
              formValues: this.state.formValues
          }
      );
      this.calculate();
  };
  handleCheckChange = (check, field) => {
      input_values[field] = check;
      this.state.formValues[field] = check;
      this.setState({
          formValues: this.state.formValues
      });
      this.calculate();
  };
  calculate = () =>{
      var VTA = (1 + input_values['TVAP'] / 100);

      //------- section1 -------
      var nbHT1 = 0;
      if(input_values['c1'])
          nbHT1 = Math.trunc((this.state.formValues['nb1-price'] / 60) * parseInt(this.state.formValues['nb1'], 10));
      this.state.formValues['nbHT1'] = nbHT1;
      this.state.formValues['TTC1'] = nbHT1 * VTA;

     //------- section2 -------
      var HT2 = 0;
      if(input_values['c2'])
          HT2 = input_values['p2'];
      this.state.formValues['HT2'] = HT2;
      var nbHT2 = 0;
      if(input_values['c2'] && input_values['cnb2'])
          nbHT2 = this.state.formValues['nb2-price'] * input_values['nb2'];
      this.state.formValues['nbHT2'] = nbHT2;

      this.state.formValues['TTC2'] = (parseInt(HT2) + parseInt(nbHT2)) * VTA;

      //------- section3 -------
      var HT3 = 0;
      if(input_values['c3'])
          HT3 = input_values['p3'];
      this.state.formValues['HT3'] = HT3;

      //------- section4 -------
      var HT4 = 0;
      if(input_values['c4'])
          HT4 = input_values['p4'];
      this.state.formValues['HT4'] = HT4;
      this.state.formValues['TTC4'] = (parseInt(HT3) + parseInt(HT4)) * VTA;

      var nbHT4 = 0;
      if(input_values['cnb4'])
          nbHT4 = this.state.formValues['nb4-price'] * input_values['nb4'];
      this.state.formValues['nbHT4'] = nbHT4;
      this.state.formValues['TTC34'] = (parseInt(HT3) + parseInt(HT4) + parseInt(nbHT4) ) * VTA;

      //------- section5 -------
      var HT5 = 0;
      var nbHT5 = 0;

      if(input_values['c5'] && !input_values['cc5']){
          HT5 = input_values['p5'];
      }
      if(input_values['c5'] && input_values['cnb5']){
          nbHT5 = this.state.formValues['nb5-price'] * input_values['nb5'];
      }

      this.state.formValues['HT5'] = HT5;
      this.state.formValues['nbHT5'] = nbHT5;
      this.state.formValues['TTC5'] = Math.trunc((parseInt(HT5) + parseInt(nbHT5)) * VTA);

      //------- section6 -------
      var HT6 = 0;
      if(input_values['c6'])
          HT6 = input_values['p6'];
      this.state.formValues['HT6'] = HT6;

      this.state.formValues['TTC6'] = parseInt(HT6)* VTA;

      //------- section7 -------
      var HT7 = 0;
      if(input_values['c7'])
          HT7 = input_values['p7'];
      this.state.formValues['HT7'] = HT7;

      this.state.formValues['TTC7'] = parseInt(HT7)* VTA;

      //------- total -------
      var TOTALHT =
          parseInt(nbHT1) + parseInt(HT2) + parseInt(nbHT2) +
          parseInt(HT3) + parseInt(HT4) + parseInt(nbHT4)+
          parseInt(HT5) + parseInt(nbHT5) + parseInt(HT6) + parseInt(HT7);

      this.state.formValues['TOTALHT'] = TOTALHT;
      this.state.formValues['TVA'] = Math.trunc(TOTALHT * input_values['TVAP'] / 100);
      this.state.formValues['TOTALTTC'] = Math.trunc(TOTALHT* VTA);

      var percent1 = input_values['fp1'] / 100 ;
      var percent2 = 1 - input_values['fp1'] / 100 ;
      this.state.formValues['FINAL75'] = Math.trunc(TOTALHT* VTA * percent1)+".00";
      this.state.formValues['FINAL25'] = Math.trunc(TOTALHT* VTA * percent2)+".00";

      this.setState({
          formValues: this.state.formValues
      })
  }
  async componentDidMount() {
      const Config = {
          headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
          }
      }
      axios.get(global.config.server_url + "/get_template/1", Config).then(response => {
          if(response.data != null) {
              let values = JSON.parse(response.data.values);
              this.setState(
                  {
                      formValues: values,
                      general_condition: response.data.general_condition
                  }
              );
              input_values = { ...values};
              this.calculate();
          }
      })
  }

  sendForm = () => {
      const Config = {
          headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
          }
      }
      var parameters ={};
      parameters['values'] = JSON.stringify(this.state.formValues);
      parameters['general_condition'] = this.state.general_condition;
      axios.put(global.config.server_url + "/contract_templates/1", parameters, Config)
          .then(function(result) {
              toast.success("Template Saved Successfully", {
                  position: toast.POSITION.TOP_CENTER,
                  autoClose: 2000
              })
          })
          .catch(function(error) {
              toast.error("API injoignable" + error)
          })
  }
  render() {
    return (
      <React.Fragment>
        <Breadcrumbs
          breadCrumbTitle="Contract Template"
          breadCrumbParent="Pages"
          breadCrumbActive="Contract template"
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
                Save Contract Template
            </Button>
          </Col>
          <Col className="contract-wrapper" sm="10" style={{marginLeft:'auto', marginRight:'auto',marginTop:'30px'}}>
            <Card className="contract-page" style={{padding:'1.5rem 2.5rem 2.2rem 2.5rem'}}>
              <CardBody>
                <Row>
                  <Col md="12" sm="12" >
                      <img src={logo} alt="logo" style={{height:'100px'}}/>
                  </Col>
                </Row>
                  {/******* table1 ********/}
                  <div style={{display:'flex'}}>
                      <table className="tableCSS" style={{textAlign:'left',fontSize:'12px',marginTop:'30px'}}>
                          {/*------- section1 -------*/}
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
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <div style={{width:'70%',display:'inline-block'}}>
                                                  <Input
                                                      type="text"
                                                      className="contract-caption"
                                                      value={this.state.formValues['title1']}
                                                      onChange={e => this.handleFieldChange("title1", e.target.value )}
                                                      required
                                                  />
                                              </div>
                                              <div style={{width:'30%',display:'inline-block'}}>
                                                  <div style={{display:'inline-block'}}>(</div>
                                                  <div style={{display:'inline-block'}}>
                                                      <Input
                                                          type="number"
                                                          style={{width:'50px',textAlign:'right'}}
                                                          className="contract-subcontent"
                                                          value={this.state.formValues['nb1-price']}
                                                          onChange={e => this.handleFieldChange("nb1-price", e.target.value )}
                                                          required
                                                      />
                                                  </div>
                                                  <div style={{display:'inline-block'}}>€ HT)</div>
                                              </div>

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
                                                  value={this.state.formValues['nb1']}
                                                  onChange={e => this.handleFieldChange("nb1", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent1-1']}
                                          onChange={e => this.handleFieldChange("subcontent1-1", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent1-2']}
                                          onChange={e => this.handleFieldChange("subcontent1-2", e.target.value )}
                                          required
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingTop:'15px'}}>
                                  <Row>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                             {this.state.formValues['nbHT1']} €
                                      </div>
                                  </Row>
                                  <Row style={{marginTop:'5px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px'}}></div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC1']} €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- section2 -------*/}
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
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-caption"
                                                  value={this.state.formValues['title2']}
                                                  onChange={e => this.handleFieldChange("title2", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['p2']}
                                                  onChange={e => this.handleFieldChange("p2", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent2-1']}
                                          onChange={e => this.handleFieldChange("subcontent2-1", e.target.value )}
                                          required
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top",marginTop:'15px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '45px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['HT2']} €
                                      </div>
                                  </Row>
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
                                                                         checked={this.state.formValues['cnb2']}
                                                                         onChange={(event) => this.handleCheckChange(event,'cnb2')}
                                              />
                                          </div>
                                          <div style={{display:'inline-block',width:'65%'}}>
                                              <div style={{width:'70%',display:'inline-block'}}>
                                                  <Input
                                                      type="text"
                                                      className="contract-subcontent"
                                                      value={this.state.formValues['subcontent2-2']}
                                                      onChange={e => this.handleFieldChange("subcontent2-2", e.target.value )}
                                                      required
                                                  />
                                              </div>
                                              <div style={{width:'30%',display:'inline-block'}}>
                                                  <div style={{display:'inline-block'}}>(</div>
                                                  <div style={{display:'inline-block'}}>
                                                      <Input
                                                          type="number"
                                                          style={{width:'50px',textAlign:'right'}}
                                                          className="contract-subcontent"
                                                          value={this.state.formValues['nb2-price']}
                                                          onChange={e => this.handleFieldChange("nb2-price", e.target.value )}
                                                          required
                                                      />
                                                  </div>
                                                  <div style={{display:'inline-block'}}>€ HT)</div>
                                              </div>
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',verticalAlign:'top',marginTop:'5px'}}>
                                              Nb:
                                          </div>
                                          <div style={{display:'inline-block',paddingTop:'3px',verticalAlign:'top'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  style={{fontWeight:'bold',height:'20px'}}
                                                  value={this.state.formValues['nb2']}
                                                  onChange={e => this.handleFieldChange("nb2", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block',width:'30%'}}>
                                          <div style={{display:'inline-block', marginLeft:'40px',width: '55px'}}></div>
                                          <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                          <div style={{display:'inline-block'}} className="contract-div">
                                              {this.state.formValues['nbHT2']} €
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
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '47px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC2']} €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- section3 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c3']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c3')}
                                              />
                                          </div>
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-caption"
                                                  value={this.state.formValues['title3']}
                                                  onChange={e => this.handleFieldChange("title3", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['p3']}
                                                  onChange={e => this.handleFieldChange("p3", e.target.value )}
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
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '47px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['HT3']} €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- section4 -------*/}
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
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-caption"
                                                  value={this.state.formValues['title4']}
                                                  onChange={e => this.handleFieldChange("title4", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['p4']}
                                                  onChange={e => this.handleFieldChange("p4", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent4-1']}
                                          onChange={e => this.handleFieldChange("subcontent4-1", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent4-2']}
                                          onChange={e => this.handleFieldChange("subcontent4-2", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent4-3']}
                                          onChange={e => this.handleFieldChange("subcontent4-3", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent4-4']}
                                          onChange={e => this.handleFieldChange("subcontent4-4", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent4-5']}
                                          onChange={e => this.handleFieldChange("subcontent4-5", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent4-6']}
                                          onChange={e => this.handleFieldChange("subcontent4-6", e.target.value )}
                                          required
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top",marginTop:'8px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '47px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['HT4']} €
                                      </div>
                                  </Row>
                                  <Row style={{verticalAlign:"top",marginTop:'3px'}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '47px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC4']} €
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
                                                                         checked={this.state.formValues['cnb4']}
                                                                         onChange={(event) => this.handleCheckChange(event,'cnb4')}
                                              />
                                          </div>
                                          <div style={{display:'inline-block',width:'65%'}}>
                                              <div style={{width:'70%',display:'inline-block'}}>
                                                  <Input
                                                      type="text"
                                                      className="contract-subcontent"
                                                      value={this.state.formValues['subcontent4-7']}
                                                      onChange={e => this.handleFieldChange("subcontent4-7", e.target.value )}
                                                      required
                                                  />
                                              </div>
                                              <div style={{width:'30%',display:'inline-block'}}>
                                                  <div style={{display:'inline-block'}}>(</div>
                                                  <div style={{display:'inline-block'}}>
                                                      <Input
                                                          type="number"
                                                          style={{width:'50px',textAlign:'right'}}
                                                          className="contract-subcontent"
                                                          value={this.state.formValues['nb4-price']}
                                                          onChange={e => this.handleFieldChange("nb4-price", e.target.value )}
                                                          required
                                                      />
                                                  </div>
                                                  <div style={{display:'inline-block'}}>€ HT)</div>
                                              </div>
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',verticalAlign:'top',marginTop:'5px'}}>
                                              Nb:
                                          </div>
                                          <div style={{display:'inline-block',paddingTop:'3px',verticalAlign:'top'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  style={{fontWeight:'bold',height:'20px'}}
                                                  value={this.state.formValues['nb4']}
                                                  onChange={e => this.handleFieldChange("nb4", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block',width:'30%'}}>
                                          <div style={{display:'inline-block', marginLeft:'40px',width: '55px'}}></div>
                                          <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                          <div style={{display:'inline-block'}} className="contract-div">
                                              {this.state.formValues['nbHT4']} €
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
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '50px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC34']} €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- section5 -------*/}
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
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-caption"
                                                  value={this.state.formValues['title5']}
                                                  onChange={e => this.handleFieldChange("title5", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['p5']}
                                                  onChange={e => this.handleFieldChange("p5", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent5-1']}
                                          onChange={e => this.handleFieldChange("subcontent5-1", e.target.value )}
                                          required
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '50px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['HT5']} €
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
                                                                         checked={this.state.formValues['cnb5']}
                                                                         onChange={(event) => this.handleCheckChange(event,'cnb5')}
                                              />
                                          </div>
                                          <div style={{display:'inline-block',width:'65%'}}>
                                              <div style={{width:'70%',display:'inline-block'}}>
                                                  <Input
                                                      type="text"
                                                      className="contract-subcontent"
                                                      value={this.state.formValues['subcontent5-2']}
                                                      onChange={e => this.handleFieldChange("subcontent5-2", e.target.value )}
                                                      required
                                                  />
                                              </div>
                                              <div style={{width:'30%',display:'inline-block'}}>
                                                  <div style={{display:'inline-block'}}>(</div>
                                                  <div style={{display:'inline-block'}}>
                                                      <Input
                                                          type="number"
                                                          className="contract-subcontent"
                                                          style={{width:'50px',textAlign:'right'}}
                                                          value={this.state.formValues['nb5-price']}
                                                          onChange={e => this.handleFieldChange("nb5-price", e.target.value )}
                                                          required
                                                      />
                                                  </div>
                                                  <div style={{display:'inline-block'}}>€ HT)</div>
                                              </div>
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',verticalAlign:'top',marginTop:'5px'}}>
                                              Nb:
                                          </div>
                                          <div style={{display:'inline-block',paddingTop:'3px',verticalAlign:'top'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text"
                                                  style={{fontWeight:'bold',height:'20px'}}
                                                  value={this.state.formValues['nb5']}
                                                  onChange={e => this.handleFieldChange("nb5", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block',width:'30%'}}>
                                          <div style={{display:'inline-block', marginLeft:'40px',width: '57px'}}></div>
                                          <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                          <div style={{display:'inline-block'}} className="contract-div">
                                              {this.state.formValues['nbHT5']} €
                                          </div>
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          <tr>
                              <td width="75%" style={{paddingBottom:0,paddingTop:0}}>
                                  <div style={{display:'inline-block',width:'90%'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent5-3']}
                                          onChange={e => this.handleFieldChange("subcontent5-3", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <div style={{display:'inline-block',marginLeft:'10px',}}>
                                      <LabeledCheckboxMaterialUi label=""
                                                                 checked={this.state.formValues['cc5']}
                                                                 onChange={(event) => this.handleCheckChange(event,'cc5')}
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0,paddingTop:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '50px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC5']} €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- section6 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:0}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c6']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c6')}
                                              />
                                          </div>
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-caption"
                                                  value={this.state.formValues['title6']}
                                                  onChange={e => this.handleFieldChange("title6", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['p6']}
                                                  onChange={e => this.handleFieldChange("p6", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent6-1']}
                                          onChange={e => this.handleFieldChange("subcontent6-1", e.target.value )}
                                          required
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:0}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '50px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['HT6']} €
                                      </div>
                                  </Row>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '52px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC6']} €
                                      </div>
                                  </Row>
                              </td>
                          </tr>
                          {/*------- section7 -------*/}
                          <tr>
                              <td width="75%" style={{paddingBottom:'30px'}}>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div style={{display:'inline-block', marginLeft:'20px'}}>
                                              <LabeledCheckboxMaterialUi label=""
                                                                         checked={this.state.formValues['c7']}
                                                                         onChange={(event) => this.handleCheckChange(event,'c7')}
                                              />
                                          </div>
                                          <div className="bold-black width-85" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-caption"
                                                  value={this.state.formValues['title7']}
                                                  onChange={e => this.handleFieldChange("title7", e.target.value )}
                                                  required
                                              />
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0, marginTop:'-5px'}}>
                                          <div style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{fontWeight:'bold'}}
                                                  value={this.state.formValues['p7']}
                                                  onChange={e => this.handleFieldChange("p7", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'5px',paddingTop:'10px'}}>
                                              € HT
                                          </div>
                                      </Col>
                                  </Row>
                                  <div style={{marginLeft:'30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['subcontent7-1']}
                                          onChange={e => this.handleFieldChange("subcontent67-1", e.target.value )}
                                          required
                                      />
                                  </div>
                              </td>
                              <td width="25%" style={{paddingBottom:'30px'}}>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '52px',textAlign:'center'}}> Total</div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> HT</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['HT7']} €
                                      </div>
                                  </Row>
                                  <Row style={{verticalAlign:"top"}}>
                                      <div style={{display:'inline-block', marginLeft:'40px',width: '53px',textAlign:'center'}}> </div>
                                      <div style={{display:'inline-block', width: '40px',textAlign:'center'}}> TTC</div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TTC7']} €
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
                                  <div style={{marginLeft: '30px',fontStyle: 'italic'}} className="bold-black">
                                      <u>
                                          <Input
                                              type="text"
                                              className="contract-caption"
                                              style={{fontStyle: 'italic'}}
                                              value={this.state.formValues['table2-title']}
                                              onChange={e => this.handleFieldChange("table2-title", e.target.value )}
                                              required
                                          />
                                      </u>
                                  </div>
                                  <div style={{marginLeft: '30px'}}>
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['table2-subcontent1']}
                                          onChange={e => this.handleFieldChange("table2-subcontent1", e.target.value )}
                                          required
                                      />
                                      <Input
                                          type="text"
                                          className="contract-subcontent"
                                          value={this.state.formValues['table2-subcontent2']}
                                          onChange={e => this.handleFieldChange("table2-subcontent2", e.target.value )}
                                          required
                                      />
                                  </div>
                                  <br/>
                                  <br/>
                              </td>
                              <td width="25%" style={{paddingTop: '15px',borderLeft:'2px solid #8d8d8d'}}>
                                  <Row>
                                      <div style={{ display: 'inline-block', marginLeft: '40px', width: '52px'}}>
                                          TOTAL
                                      </div>
                                      <div style={{display: 'inline-block', width: '40px', textAlign: 'center'}}>
                                          HT
                                      </div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TOTALHT']} €
                                      </div>
                                  </Row>
                                  <Row style={{marginTop: '5px'}}>
                                      <div style={{display: 'inline-block', marginLeft: '40px', width: '52px'}}>TVA</div>
                                      <div style={{display: 'inline-block', width: '40px', textAlign: 'center'}}>
                                          <div style={{display: 'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-text2"
                                                  style={{width:'20px'}}
                                                  value={this.state.formValues['TVAP']}
                                                  onChange={e => this.handleFieldChange("TVAP", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div style={{display: 'inline-block'}}>
                                              %
                                          </div>
                                      </div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TVA']} €
                                      </div>
                                  </Row>
                                  <Row style={{marginTop: '5px'}}>
                                      <div style={{display: 'inline-block', marginLeft: '40px', width: '52px'}}>TOTAL</div>
                                      <div style={{display: 'inline-block', width: '40px', textAlign: 'center'}}>
                                          TTC
                                      </div>
                                      <div style={{display:'inline-block'}} className="contract-div">
                                          {this.state.formValues['TOTALTTC']} €
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
                                  <div style={{marginLeft: '30px',fontStyle: 'italic'}} className="bold-black">
                                      <u>
                                          <Input
                                              type="text"
                                              className="contract-caption"
                                              style={{fontStyle: 'italic'}}
                                              value={this.state.formValues['table3-title']}
                                              onChange={e => this.handleFieldChange("table3-title", e.target.value )}
                                              required
                                          />
                                      </u>
                                  </div>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',width:'50%'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-subcontent"
                                                  value={this.state.formValues['table3-subcontent1']}
                                                  onChange={e => this.handleFieldChange("table3-subcontent1", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-subcontent"
                                                  value={this.state.formValues['fp1']}
                                                  onChange={e => this.handleFieldChange("fp1", e.target.value )}
                                                  required
                                                  style={{width:"45px"}}
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',}}>
                                              %
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0,marginTop:'5px'}}>
                                          <div style={{display:'inline-block'}} className="contract-div" style={{width:'80px'}}>
                                              {this.state.formValues['FINAL75']} €
                                          </div>
                                      </Col>
                                  </Row>
                                  <Row>
                                      <Col md="9" sm="12" style={{paddingRight:0}}>
                                          <div className="bold-black" style={{display:'inline-block',marginLeft:'30px',width:'50%'}}>
                                              <Input
                                                  type="text"
                                                  className="contract-subcontent"
                                                  value={this.state.formValues['table3-subcontent2']}
                                                  onChange={e => this.handleFieldChange("table3-subcontent2", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block'}}>
                                              <Input
                                                  type="text"
                                                  style={{width:"45px"}}
                                                  className="contract-subcontent"
                                                  value={this.state.formValues['fp2']}
                                                  onChange={e => this.handleFieldChange("fp2", e.target.value )}
                                                  required
                                              />
                                          </div>
                                          <div className="bold-black" style={{display:'inline-block',}}>
                                              %
                                          </div>
                                      </Col>
                                      <Col md="3" sm="12" style={{paddingLeft:0,marginTop:'5px'}}>
                                          <div style={{display:'inline-block'}} className="contract-div" style={{width:'85px'}}>
                                              {this.state.formValues['FINAL25']} €
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
                    <div style={{textAlign:'center'}}>
                        <h1>Conditions Générales de ventes</h1>
                    </div>
                    <div>
                        <Input type="textarea" rows="45" placeholder="General Condition"
                               defaultValue={this.state.general_condition}
                               className="contract-general-condition"
                               onChange={e => this.setState({ general_condition: e.target.value })}/>
                    </div>
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

export default TemplateContract
/* eslint-disable */

