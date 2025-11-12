/* eslint-disable */
import React from "react";
import moment from "moment";
import Moment from "react-moment";
import {
  Card,
  CardBody,
  Row,
  Col,
  Input,
  Button,
  FormGroup,
  CustomInput,
  CardHeader
} from "reactstrap";
import Chip from "../../../../src/components/@vuexy/chips/ChipComponent";
import LabeledCheckboxMaterialUi from "labeled-checkbox-material-ui";
import logo from "../../../assets/img/logo/contract_logo.jpg";
import { Download, ArrowLeft, Save, Aperture } from "react-feather";
import "../../../assets/scss/pages/contract.scss";
import axios from "axios";
import { toast } from "react-toastify";
import { history } from "../../../history";
import Radio from "../../../components/@vuexy/radio/RadioVuexy";
const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

var input_values = {
  c1: false,
  c2: true,
  c3: true,
  c4: false,
  c5: true,
  c6: true,
  c7: true,
  cnb2: false,
  cnb4: true,
  cnb5: false,
  cc5: true,
  nb1: "5",
  nb2: "1",
  nb4: "0",
  nb5: "10",
  p2: "1500",
  p3: "1500",
  p4: "1500",
  p5: "1500",
  p6: "1500",
  p7: "1500",
  TVAP: "20",
  fp1: "75",
  fp2: "25",
};
class EditContract extends React.Component {
  state = {
    rowData: [],
    services: [],
    acompte_dates: [],
    sold_dates: [],
    activeTab: "1",
    // Indique si des modifications ont été faites (pour activer le bouton Enregistrer)
    isDirty: false,
    formValues: {
      c1: false,
      c2: true,
      c3: true,
      c4: false,
      c5: true,
      c6: true,
      c7: true,
      cnb2: false,
      cnb4: true,
      cnb5: false,
      cc5: true,
    },
    user_id: null,
    parent_id: null,
    general_condition: "",
    subscribe_services: "",
    status: null,
    status_payment: null,
    payment_method: null,
    deposit_date: null,
    sold_date: null,
  };

  ifExist(name) {
    if (this.state.rowData) return this.state.rowData[name];
    else return "N/a";
  }
  handleFieldChange = (field, value) => {
    input_values[field] = value;
    this.state.formValues[field] = value;
    if (field == "fp1") {
      this.state.formValues["fp2"] = 100 - value;
      input_values["fp2"] = 100 - value;
    }
    if (field == "fp2") {
      this.state.formValues["fp1"] = 100 - value;
      input_values["fp1"] = 100 - value;
    }

    this.setState({
      formValues: this.state.formValues,
    });
    this.calculate();
    // Marque le formulaire comme modifié
    if (!this.state.isDirty) this.setState({ isDirty: true });
  };
  handleCheckChange = (check, field) => {
    input_values[field] = check;
    this.state.formValues[field] = check;
    this.setState({
      formValues: this.state.formValues,
    });
    this.calculate();
    if (!this.state.isDirty) this.setState({ isDirty: true });
  };
  calculate = () => {
    var VTA = 1 + input_values["TVAP"] / 100;

    //------- section1 -------
    var nbHT1 = 0;
    if (input_values["c1"])
      nbHT1 = Math.trunc(
        (this.state.formValues["nb1-price"] / 60) *
          parseInt(this.state.formValues["nb1"], 10)
      );
    this.state.formValues["nbHT1"] = nbHT1;
    this.state.formValues["TTC1"] = nbHT1 * VTA;

    //------- section2 -------
    var HT2 = 0;
    if (input_values["c2"]) HT2 = input_values["p2"];
    this.state.formValues["HT2"] = HT2;
    var nbHT2 = 0;
    if (input_values["c2"] && input_values["cnb2"])
      nbHT2 = this.state.formValues["nb2-price"] * input_values["nb2"];
    this.state.formValues["nbHT2"] = nbHT2;

    this.state.formValues["TTC2"] = (parseInt(HT2) + parseInt(nbHT2)) * VTA;

    //------- section3 -------
    var HT3 = 0;
    if (input_values["c3"]) HT3 = input_values["p3"];
    this.state.formValues["HT3"] = HT3;

    //------- section4 -------
    var HT4 = 0;
    if (input_values["c4"]) HT4 = input_values["p4"];
    this.state.formValues["HT4"] = HT4;
    this.state.formValues["TTC4"] = (parseInt(HT3) + parseInt(HT4)) * VTA;

    var nbHT4 = 0;
    if (input_values["cnb4"])
      nbHT4 = this.state.formValues["nb4-price"] * input_values["nb4"];
    this.state.formValues["nbHT4"] = nbHT4;
    this.state.formValues["TTC34"] =
      (parseInt(HT3) + parseInt(HT4) + parseInt(nbHT4)) * VTA;

    //------- section5 -------
    var HT5 = 0;
    var nbHT5 = 0;

    if (input_values["c5"] && !input_values["cc5"]) {
      HT5 = input_values["p5"];
    }
    if (input_values["c5"] && input_values["cnb5"]) {
      nbHT5 = this.state.formValues["nb5-price"] * input_values["nb5"];
    }

    this.state.formValues["HT5"] = HT5;
    this.state.formValues["nbHT5"] = nbHT5;
    this.state.formValues["TTC5"] = (parseInt(HT5) + parseInt(nbHT5)) * VTA;

    //------- section6 -------
    var HT6 = 0;
    if (input_values["c6"]) HT6 = input_values["p6"];
    this.state.formValues["HT6"] = HT6;
    this.state.formValues["TTC6"] = parseInt(HT6) * VTA;

    //------- section7 -------
    var HT7 = 0;
    if (input_values["c7"]) HT7 = input_values["p7"];
    this.state.formValues["HT7"] = HT7;

    this.state.formValues["TTC7"] = parseInt(HT7) * VTA;

    //------- total -------
    var TOTALHT =
      parseInt(nbHT1) +
      parseInt(HT2) +
      parseInt(nbHT2) +
      parseInt(HT3) +
      parseInt(HT4) +
      parseInt(nbHT4) +
      parseInt(HT5) +
      parseInt(nbHT5) +
      parseInt(HT6) +
      parseInt(HT7);

    this.state.formValues["TOTALHT"] = TOTALHT;
    this.state.formValues["TVA"] = (TOTALHT * input_values["TVAP"]) / 100;
    this.state.formValues["TOTALTTC"] = Math.trunc(TOTALHT * VTA);

    var percent1 = input_values["fp1"] / 100;
    var percent2 = 1 - input_values["fp1"] / 100;
    this.state.formValues["FINAL75"] =
      Math.trunc(TOTALHT * VTA * percent1) + ".00";
    this.state.formValues["FINAL25"] =
      Math.trunc(TOTALHT * VTA * percent2) + ".00";

    this.setState({
      formValues: this.state.formValues,
    });
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    axios
      .get(global.config.server_url + "/get_template/1", Config)
      .then((response) => {
        if (response.data != null) {
          this.setState({
            general_condition: response.data.general_condition,
          });
        }
      });
    axios
      .get(
        global.config.server_url +
          "/get_contract/" +
          this.props.match.params.id,
        Config
      )
      .then((response) => {
        let rowData = response.data.data;
        console.log("ICI", rowData);
        const acompteDates =
          Array.isArray(rowData.acompte_dates)
            ? rowData.acompte_dates
            : rowData.acompte_dates
              ? JSON.parse(rowData.acompte_dates)
              : [];

        const soldDates =
          Array.isArray(rowData.sold_dates)
            ? rowData.sold_dates
            : rowData.sold_dates
              ? JSON.parse(rowData.sold_dates)
              : [];
        this.setState({
          rowData,
          user_id: rowData.id,
          parent_id: rowData.parent_id,
          deposit_date: rowData.deposit_date,
          sold_date: rowData.sold_date,
          status: rowData.document_state,
          status_payment: rowData.status_payment,
          payment_method: rowData.payment_method,
          subscribe_services: rowData.subscribe_services,
          acompte_dates: acompteDates,
          sold_dates: soldDates,
        });
        if (rowData.values != null) {
          let values = JSON.parse(rowData.values);
          this.setState({
            formValues: values,
          });
          input_values = { ...values };
          this.calculate();
        }
      })
      .catch((e) => console.log(e));
  }

  sendForm = () => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    let sub_services = "";

    if (input_values.c1) sub_services += "CH";
    if (input_values.c2) sub_services += " / SIMU";
    if (input_values.c3) sub_services += " / AR";
    if (input_values.c4) sub_services += " / AR";
    if (input_values.c5) sub_services += " / TFD";
    if (input_values.c6) sub_services += " / ACTU";
    if (input_values.c7) sub_services += " / RAC";
    this.setState({ subscribe_services: sub_services });
    var parameters = {};
    var userid = this.state.user_id;
    parameters["user_id"] = userid;
    parameters["parent_id"] = this.state.parent_id;
    parameters["comment"] =
      "Contract de " +
      this.state.rowData["first_name"] +
      " " +
      this.state.rowData["last_name"];
    parameters["document_state"] = this.state.status;
    parameters["subscribe_services"] = sub_services;
    parameters["status_payment"] = this.state.status_payment;
    parameters["payment_method"] = this.state.payment_method;
    parameters["values"] = JSON.stringify(input_values);
    parameters["acompte_dates"] = this.state.acompte_dates; // ex: ["2025-11-12 10:00:00", ...]
    parameters["sold_dates"]    = this.state.sold_dates;
    parameters["advanced_payment"] = this.state.formValues["TOTALTTC"]
      ? this.state.formValues["TOTALTTC"]
      : 0;
    parameters["pre_payment"] = parseFloat(this.state.formValues["FINAL75"])
      ? parseFloat(this.state.formValues["FINAL75"])
      : 0;
    parameters["end_payment"] = parseFloat(this.state.formValues["FINAL25"])
      ? parseFloat(this.state.formValues["FINAL25"])
      : 0;
    parameters["deposit_date"] = this.state.deposit_date;
    parameters["sold_date"] = this.state.sold_date;
    axios
      .put(
        global.config.server_url + "/documents/" + this.props.match.params.id,
        parameters,
        Config
      )
      .then(function (result) {
        console.log(parameters);
        history.push("/app/user/edit/" + userid + "/3");
      })
      .catch(function (error) {
        toast.error("API injoignable" + error);
      });
    //--- set the subscribe services from contract into user table--------
    this.setSubscribeServices();
  };
  setStatusPayment(value) {
    if (value == 1) {
      if (this.state.status_payment == 0) {
        this.setState({ status_payment: 1 });
        this.setState({ deposit_date: moment().format("YYYY-MM-DD HH:mm:ss") });
      } else {
        this.setState({ status_payment: 0 });
        this.setState({ sold_date: null });
        this.setState({ deposit_date: null });
      }
    } else if (value == 2) {
      if (this.state.status_payment == 1) {
        this.setState({ status_payment: 2 });
        this.setState({ sold_date: moment().format("YYYY-MM-DD HH:mm:ss") });
      } else if (this.state.status_payment == 0) {
        this.setState({ status_payment: 2 });
        this.setState({ deposit_date: moment().format("YYYY-MM-DD HH:mm:ss") });
        this.setState({ sold_date: moment().format("YYYY-MM-DD HH:mm:ss") });
      } else {
        this.setState({ status_payment: 1 });
        this.setState({ sold_date: null });
      }
    }
    if (!this.state.isDirty) this.setState({ isDirty: true });
  }
  setSubscribeServices() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    var userid = this.state.user_id;
    let subscribe_services = "";
    if (input_values.c1) subscribe_services += "CH";
    if (input_values.c2) subscribe_services += " / SIMU";
    if (input_values.c3) subscribe_services += " / AR";
    if (input_values.c4) subscribe_services += " / AR";
    if (input_values.c5) subscribe_services += " / TFD";
    if (input_values.c6) subscribe_services += " / ACTU";
    if (input_values.c7) subscribe_services += " / RAC";

    axios
      .post(
        global.config.server_url + "/set_user_subscribe_services",
        {
          user_id: userid,
          subscribe_services: JSON.stringify(subscribe_services),
        },
        Config
      )
      .then(function (result) {})
      .catch(function (error) {
        toast.error("API injoignable" + error);
      });
  }
  print = () => {
    //---- save the form data before printing
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    let sub_services = "";

    if (input_values.c1) sub_services += "CH";
    if (input_values.c2) sub_services += " / SIMU";
    if (input_values.c3) sub_services += " / AR";
    if (input_values.c4) sub_services += " / AR";
    if (input_values.c5) sub_services += " / TFD";
    if (input_values.c6) sub_services += " / ACTU";
    if (input_values.c7) sub_services += " / RAC";
    this.setState({ subscribe_services: sub_services });
    var parameters = {};
    var userid = this.state.user_id;
    parameters["user_id"] = this.state.user_id;
    parameters["parent_id"] = this.state.parent_id;
    parameters["acompte_dates"] = this.state.acompte_dates; // ex: ["2025-11-12 10:00:00", ...]
    parameters["sold_dates"]    = this.state.sold_dates;
    parameters["subscribe_services"] = sub_services;
    parameters["comment"] =
      "Contract de " +
      this.state.rowData["first_name"] +
      " " +
      this.state.rowData["last_name"];
    parameters["status_payment"] = this.state.status_payment;
    parameters["values"] = JSON.stringify(input_values);
    parameters["advanced_payment"] = this.state.formValues["TOTALTTC"]
      ? this.state.formValues["TOTALTTC"]
      : 0;
    parameters["pre_payment"] = parseFloat(this.state.formValues["FINAL75"])
      ? parseFloat(this.state.formValues["FINAL75"])
      : 0;
    parameters["end_payment"] = parseFloat(this.state.formValues["FINAL25"])
      ? parseFloat(this.state.formValues["FINAL25"])
      : 0;
    parameters["deposit_date"] = this.state.deposit_date;
    parameters["sold_date"] = this.state.sold_date;

    axios
      .put(
        global.config.server_url + "/documents/" + this.props.match.params.id,
        parameters,
        Config
      )
      .then(function (result) {})
      .catch(function (error) {
        toast.error("API injoignable" + error);
      });

    //--- set the subscribe services from contract into user table--------
    this.setSubscribeServices();

    //------ print action -------
    //document.getElementById("send_contract_section").remove();
    document.getElementById("button_section").remove();
    document.getElementById("print-section").style.marginTop = "-20px";
    document.getElementById("print-section").style.fontSize = "18px";
    var userid = this.state.user_id;
    window.onafterprint = function (e) {
      history.push("/app/user/edit/" + userid + "/3");
    };
    window.print();
  };
  toInputValue = (sql) => { // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm"
    if (!sql) return '';
    return sql.replace(' ', 'T').slice(0, 16);
  };

  fromInputValue = (v) => { // "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:00"
    if (!v) return '';
    return v.replace('T', ' ') + ':00';
  };

  addDate = (key) => {
    this.setState(prev => ({ [key]: [...(prev[key] || []), '' ], isDirty: true }));
  };

  updateDate = (key, idx, v) => {
    this.setState(prev => {
      const arr = [...(prev[key] || [])];
      arr[idx] = v;
      return { [key]: arr, isDirty: true };
    });
  };

  removeDate = (key, idx) => {
    this.setState(prev => {
      const arr = [...(prev[key] || [])];
      arr.splice(idx, 1);
      return { [key]: arr, isDirty: true };
    });
  };

  render() {
    return (
      <React.Fragment>
        <Row>
          <Col
            xs="12"
            md="12"
            className="contract-header mb-0 px-0"
            style={{ minHeight: "50px" }}
          >
            {/* Bouton retour au-dessus de "Prestation" */}
            <div className="d-flex align-items-center mb-50">
              <Button.Ripple
                color="primary"
                aria-label="Retour"
                title="Retour"
                className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{ width: 32, height: 32 }}
                onClick={() => history.push("/app/user/edit/" + this.state.user_id + "/3")}
              >
                <ArrowLeft size={16} />
              </Button.Ripple>
            </div>
            <div>
              <div style={{ display: "inline-block" }}>
                <h5 style={{ marginBottom: "5px" }}>
                  <Aperture className="mr-50" size={16} />
                  <span className="align-middle">Prestation : </span>
                </h5>
              </div>
              <div style={{ display: "inline-block", marginLeft: "5px" }}>
                <div>
                  {(() => {
                    let subscribe_service = this.state.subscribe_services;
                    if (subscribe_service == null || subscribe_service == "") {
                      return <div>No</div>;
                    } else {
                      let lst_subscribe_services = subscribe_service
                        .replaceAll('"', "")
                        .trim()
                        .split("/");
                      const tags = [];
                      lst_subscribe_services.forEach(function (service) {
                        if (service != "") {
                          tags.push(
                            <Chip
                              className="m-0 text-center ml-1"
                              color={chipColors[service.trim()]}
                              text={service}
                            />
                          );
                        }
                      });
                      return tags;
                    }
                  })()}
                </div>
              </div>
            </div>
            <FormGroup style={{ marginTop: "8px", marginBottom: 0 }}>
              {this.state.status != null &&
                this.state.subscribe_services != null &&
                this.state.status_payment != null && (
                  <Card className="mb-1 shadow-sm" style={{ borderRadius: 10 }}>
                    <CardHeader
                      className="py-1 d-flex align-items-center"
                      style={{ background: "#f8f9fa", borderBottom: "1px solid #e9ecef" }}
                    >
                      <h5 className="mb-0">Statut & Paiements</h5>
                    </CardHeader>

                    <CardBody className="pt-1">
                      {/* Ligne 1 : statut + moyen de paiement + switches */}
                      <Row className="align-items-center">
                        <Col md="6" sm="12" className="mb-1">
                          <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                            <Radio
                              label="En attente"
                              color="primary"
                              name="status"
                              checked={this.state.status === "En attente"}
                              onChange={() => this.setState({ status: "En attente", isDirty: true })}
                            />
                            <Radio
                              label="En cours"
                              color="primary"
                              name="status"
                              checked={this.state.status === "En cours"}
                              onChange={() => this.setState({ status: "En cours", isDirty: true })}
                            />
                            <Radio
                              label="Terminé"
                              color="primary"
                              name="status"
                              checked={this.state.status === "Terminé"}
                              onChange={() => this.setState({ status: "Terminé", isDirty: true })}
                            />
                            <Radio
                              label="Perdu"
                              color="primary"
                              name="status"
                              checked={this.state.status === "Perdu"}
                              onChange={() => this.setState({ status: "Perdu", isDirty: true })}
                            />
                          </div>

                          <div className="d-flex align-items-center mt-1" style={{ gap: 8 }}>
                            <span className="text-muted" style={{ minWidth: 130 }}>Moyen de paiement</span>
                            <Input
                              style={{ width: 220, height: 34 }}
                              value={this.state.payment_method || ""}
                              color="primary"
                              type="text"
                              placeholder="Ex: CB, virement…"
                              onChange={(e) => this.setState({ payment_method: e.target.value, isDirty: true })}
                            />
                          </div>
                        </Col>

                        <Col md="6" sm="12" className="mb-1">
                          <div className="d-flex align-items-center" style={{ gap: 18 }}>
                            <CustomInput
                              className="custom-switch-success"
                              type="switch"
                              id="acompte"
                              name="Acompte"
                              inline
                              checked={this.state.status_payment > 0}
                              onChange={() => this.setStatusPayment(1)}
                            >
                              <span className="mb-0 switch-label" style={{ paddingTop: 3 }}>
                                Acompte
                              </span>
                            </CustomInput>

                            <CustomInput
                              className="custom-switch-success"
                              type="switch"
                              id="sold"
                              name="Sold"
                              inline
                              checked={this.state.status_payment > 1}
                              onChange={() => this.setStatusPayment(2)}
                            >
                              <span className="mb-0 switch-label" style={{ paddingTop: 3 }}>
                                Soldé
                              </span>
                            </CustomInput>
                          </div>
                        </Col>
                      </Row>

                      <hr className="my-2" />

                      {/* Ligne 2 : listes de dates */}
                      <Row>
                        {/* Acomptes */}
                        <Col md="6" sm="12" className="mb-1">
                          <div className="mb-1">
                            <h6 className="mb-0 text-muted">Dates d’acompte</h6>
                          </div>

                          {(this.state.acompte_dates || []).map((d, idx) => (
                            <div key={`ad-${idx}`} className="d-flex align-items-center" style={{ gap: 8, marginBottom: 8 }}>
                              <Input
                                type="datetime-local"
                                style={{ width: 240, height: 34 }}
                                value={this.toInputValue(d)}
                                onChange={(e) => this.updateDate('acompte_dates', idx, this.fromInputValue(e.target.value))}
                              />
                              <Button color="danger" size="sm" onClick={() => this.removeDate('acompte_dates', idx)}>
                                Supprimer
                              </Button>
                            </div>
                          ))}

                          <Button outline color="primary" size="sm" className="mt-1" onClick={() => this.addDate('acompte_dates')}>
                            + Ajouter
                          </Button>
                        </Col>

                        {/* Ventes */}
                        <Col md="6" sm="12" className="mb-1">
                          <div className="mb-1">
                            <h6 className="mb-0 text-muted">Dates de paiement</h6>
                          </div>

                          {(this.state.sold_dates || []).map((d, idx) => (
                            <div key={`sd-${idx}`} className="d-flex align-items-center" style={{ gap: 8, marginBottom: 8 }}>
                              <Input
                                type="datetime-local"
                                style={{ width: 240, height: 34 }}
                                value={this.toInputValue(d)}
                                onChange={(e) => this.updateDate('sold_dates', idx, this.fromInputValue(e.target.value))}
                              />
                              <Button color="danger" size="sm" onClick={() => this.removeDate('sold_dates', idx)}>
                                Supprimer
                              </Button>
                            </div>
                          ))}

                          <Button outline color="primary" size="sm" className="mt-1" onClick={() => this.addDate('sold_dates')}>
                            + Ajouter
                          </Button>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>
              )}
            </FormGroup>
          </Col>
          <Col
            className="d-flex flex-column flex-md-row justify-content-end contract-header px-0 mb-3"
            md="12"
            sm="12"
            id="button_section"
          >

            <Button
              className="mr-1 mb-md-0 mb-1"
              color={this.state.isDirty ? "success" : "secondary"}
              disabled={!this.state.isDirty}
              style={{ height: 40, lineHeight: '40px', padding: '0 16px' }}
              onClick={() => {
                if (this.state.isDirty) this.sendForm();
              }}
            >
              <Save size="15" />
              <span className="align-middle ml-50">Enregistrer le contrat</span>
            </Button>
            <Button
              className="mr-1 mb-md-0 mb-1"
              color="primary"
              style={{ height: 40, lineHeight: '40px', padding: '0 16px' }}
              onClick={this.print}
            >
              <Download size="15" />
              <span className="align-middle ml-50">Télécharger</span>
            </Button>
          </Col>

          <Col
            className="contract-wrapper"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
              marginTop: "-16px",
              fontSize: "15px",
            }}
          >
            <Card
              className="contract-page"
              style={{ padding: "0.5rem 5.5rem 2.2rem 5.5rem" }}
              id="print-section"
            >
              <CardBody>
                <Row>
                  <Col md="12" sm="12">
                    <img src={logo} alt="logo" style={{ height: "130px" }} />
                  </Col>
                </Row>
                <Row style={{ marginTop: "30px" }}>
                  <Col md="6" sm="12">
                    <div
                      className="recipient-info"
                      style={{
                        padding: "0.5rem",
                        border: "2px solid #8a8a8a",
                        marginBottom: "10px",
                      }}
                    >
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Civilité</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("civility")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Nom</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("last_name")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Prénom</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("first_name")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Date Naissance </h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{moment(this.ifExist("birth_date")).isValid() ? moment(this.ifExist("birth_date")).format("DD/MM/YYYY") : ""}</h6>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col md="6" sm="12">
                    <div
                      className="recipient-info"
                      style={{
                        padding: "0.5rem",
                        border: "2px solid #8a8a8a",
                        marginBottom: "10px",
                      }}
                    >
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Date du contrat</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>
                            <Moment
                              format="DD-MM-YYYY HH:mm"
                              date={this.ifExist("updated_at")}
                              utc
                            />
                          </h6>{" "}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col md="6" sm="12">
                    <div
                      className="recipient-info"
                      style={{
                        padding: "0.5rem",
                        border: "2px solid #8a8a8a",
                        marginBottom: "10px",
                      }}
                    >
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Statut Marital</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("martial_status")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Service Nat.</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>
                            {(() => {
                              const v = this.ifExist("military_service");
                              console.log("military_service", v);
                              const yes =
                                v === true ||
                                v === 1 ||
                                v === "1" ||
                                String(v).toLowerCase() === "oui" ||
                                String(v).toLowerCase() === "on";
                              return yes ? "Service Militaire" : "";
                            })()}
                          </h6>
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Nb d'enfant(s)</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("children_number")}</h6>{" "}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col md="6" sm="12">
                    <div
                      className="recipient-info"
                      style={{
                        padding: "0.5rem",
                        border: "2px solid #8a8a8a",
                        marginBottom: "10px",
                      }}
                    >
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Tel. mobile</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("mobile_number")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Tel. bureau</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("office_number")} </h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Mail</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("email")}</h6>{" "}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col md="6" sm="12">
                    <div
                      className="recipient-info"
                      style={{ padding: "0.5rem", border: "2px solid #8a8a8a" }}
                    >
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                        <h5 className="bold-black" style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>
                          Société
                        </h5>                        
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Adresse</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("personal_address")} </h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("personal_address_2")} </h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Code Postal</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("personal_zip_code")} </h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Ville</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h6>{this.ifExist("personal_city")} </h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="5"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Pays</h5>{" "}
                        </Col>
                        <Col md="7" sm="12">
                          {" "}
                          <h5>{this.ifExist("personal_country")} </h5>{" "}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col md="6" sm="12">
                    <div
                      className="recipient-info"
                      style={{ padding: "0.5rem", border: "2px solid #8a8a8a" }}
                    >
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                        <h5 className="bold-black" style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>
                          Société
                        </h5>                        
                        </Col>
                        <Col
                          md="8"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">
                            {this.ifExist("society_name")}
                          </h5>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Adresse</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("society_address")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                        </Col>
                        <Col md="8" sm="12" style={{ textAlign: "left" }}>
                          {" "}
                          <h6>{this.ifExist("society_address_2")} </h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Code Postal</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("society_zip_code")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Ville</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("society_city")}</h6>{" "}
                        </Col>
                      </Row>
                      <Row>
                        <Col
                          md="4"
                          sm="12"
                          className="contract-caption1-section"
                        >
                          {" "}
                          <h5 className="bold-black">Pays</h5>{" "}
                        </Col>
                        <Col md="8" sm="12">
                          {" "}
                          <h6>{this.ifExist("society_country")}</h6>{" "}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                <div
                  className="contract-items-table"
                  style={{
                    border: "2px solid #8d8d8d",
                    padding: "30px 20px 230px 20px",
                    marginTop: "30px",
                    height: "750px",
                    marginBottom: "50px",
                  }}
                >
                  <h5 className="bold-black">
                    <u>Notes</u>
                  </h5>
                  <h5 style={{ marginTop: "20px" }}>
                    {this.ifExist("notes") &&
                      this.ifExist("notes")
                        .split("\n")
                        .map(function (item) {
                          return (
                            <>
                              {item}
                              <br />
                            </>
                          );
                        })}
                  </h5>
                </div>
                <div
                  className="pt-3 contract-footer"
                  style={{ textAlign: "center" }}
                >
                  <p>
                    EOR - 36, RUE DE LABORDE 75008 PARIS - SIRET N°
                    48488721100023 - APE N° 7022Z
                  </p>
                </div>
              </CardBody>
            </Card>
            <Card
              className="contract-page"
              style={{
                padding: "0.5rem 5.5rem 2.2rem 5.5rem",
                marginTop: "50px",
              }}
            >
              <CardBody>
                <Row>
                  <Col md="12" sm="12">
                    <img src={logo} alt="logo" style={{ height: "130px" }} />
                  </Col>
                </Row>
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    marginTop: "30px",
                  }}
                >
                  <h1>
                    Contrat de{" "}
                    {this.ifExist("civility") +
                      " " +
                      this.ifExist("first_name") +
                      " " +
                      this.ifExist("last_name")}
                  </h1>
                </div>
                {/******* table1 ********/}
                <div style={{ display: "flex" }}>
                  <table
                    className="tableCSS"
                    style={{
                      textAlign: "left",
                      fontSize: "15px",
                      marginTop: "30px",
                    }}
                  >
                    {/*------- section1 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingTop: "20px" }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c1"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c1")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              <div style={{ display: "inline-block" }}>
                                {this.state.formValues["title1"]}
                              </div>
                              <div
                                style={{
                                  display: "inline-block",
                                  paddingLeft: "5px",
                                }}
                              >
                                (
                              </div>
                              <div style={{ display: "inline-block" }}>
                                {this.state.formValues["nb1-price"]}
                              </div>
                              <div style={{ display: "inline-block" }}>
                                € HT)
                              </div>
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div
                              className="bold-black"
                              style={{ display: "inline-block" }}
                            >
                              Nb mn:
                            </div>
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text"
                                value={this.state.formValues["nb1"]}
                                onChange={(e) =>
                                  this.handleFieldChange("nb1", e.target.value)
                                }
                                required
                              />
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent1-1"]}
                        </div>
                        <div
                          style={{ marginLeft: "30px" }}
                          className="contract-subcontent"
                        >
                          {this.state.formValues["subcontent1-2"]}
                        </div>
                      </td>
                      <td width="25%" style={{ paddingTop: "15px" }}>
                        <Row>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "45px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["nbHT1"]} €
                          </div>
                        </Row>
                        <Row style={{ marginTop: "5px" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "45px",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC1"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                    {/*------- section2 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingBottom: 0 }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c2"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c2")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              {this.state.formValues["title2"]}
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ fontWeight: "bold" }}
                                value={this.state.formValues["p2"]}
                                onChange={(e) =>
                                  this.handleFieldChange("p2", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "5px",
                                paddingTop: "10px",
                              }}
                            >
                              € HT
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent2-1"]}
                        </div>
                      </td>
                      <td width="25%" style={{ paddingBottom: 0 }}>
                        <Row
                          style={{ verticalAlign: "top", marginTop: "15px" }}
                        >
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "45px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["HT2"]} €
                          </div>
                        </Row>
                        <br />
                        <br />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ paddingTop: "0" }}>
                        <Row
                          style={{
                            borderBottom: "2px dashed #827b7b",
                            width: "90%",
                            float: "right",
                          }}
                        >
                          <div
                            style={{ display: "inline-block", width: "70%" }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["cnb2"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "cnb2")
                                }
                              />
                            </div>
                            <div
                              style={{ display: "inline-block", width: "65%" }}
                            >
                              <div style={{ display: "inline-block" }}>
                                {this.state.formValues["subcontent2-2"]}
                              </div>
                              <div style={{ display: "inline-block" }}>
                                <div
                                  style={{
                                    display: "inline-block",
                                    paddingLeft: "5px",
                                  }}
                                >
                                  (
                                </div>
                                <div style={{ display: "inline-block" }}>
                                  {this.state.formValues["nb2-price"]}
                                </div>
                                <div style={{ display: "inline-block" }}>
                                  € HT)
                                </div>
                              </div>
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "30px",
                                verticalAlign: "top",
                                marginTop: "5px",
                              }}
                            >
                              Nb:
                            </div>
                            <div
                              style={{
                                display: "inline-block",
                                paddingTop: "3px",
                                verticalAlign: "top",
                              }}
                            >
                              <Input
                                type="text"
                                className="contract-text"
                                style={{ fontWeight: "bold", height: "20px" }}
                                value={this.state.formValues["nb2"]}
                                onChange={(e) =>
                                  this.handleFieldChange("nb2", e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                          <div
                            style={{ display: "inline-block", width: "30%" }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "40px",
                                width: "55px",
                              }}
                            ></div>
                            <div
                              style={{
                                display: "inline-block",
                                width: "40px",
                                textAlign: "center",
                              }}
                            >
                              {" "}
                              HT
                            </div>
                            <div
                              style={{ display: "inline-block" }}
                              className="contract-div"
                            >
                              {this.state.formValues["nbHT2"]} €
                            </div>
                          </div>
                        </Row>
                      </td>
                    </tr>
                    <tr>
                      <td
                        width="75%"
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      ></td>
                      <td
                        width="25%"
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      >
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "47px",
                              textAlign: "center",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC2"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                    {/*------- section3 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingBottom: 0 }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c3"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c3")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              {this.state.formValues["title3"]}
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ fontWeight: "bold" }}
                                value={this.state.formValues["p3"]}
                                onChange={(e) =>
                                  this.handleFieldChange("p3", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "5px",
                                paddingTop: "10px",
                              }}
                            >
                              € HT
                            </div>
                          </Col>
                        </Row>
                      </td>
                      <td width="25%" style={{ paddingBottom: 0 }}>
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "47px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["HT3"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                    {/*------- section4 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingBottom: 0 }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c4"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c4")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              {this.state.formValues["title4"]}
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ fontWeight: "bold" }}
                                value={this.state.formValues["p4"]}
                                onChange={(e) =>
                                  this.handleFieldChange("p4", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "5px",
                                paddingTop: "10px",
                              }}
                            >
                              € HT
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent4-1"]}
                        </div>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent4-2"]}
                        </div>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent4-3"]}
                        </div>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent4-4"]}
                        </div>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent4-5"]}
                        </div>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent4-6"]}
                        </div>
                      </td>
                      <td width="25%" style={{ paddingBottom: 0 }}>
                        <Row style={{ verticalAlign: "top", marginTop: "8px" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "47px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["HT4"]} €
                          </div>
                        </Row>
                        <Row style={{ verticalAlign: "top", marginTop: "3px" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "47px",
                              textAlign: "center",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC4"]} €
                          </div>
                        </Row>
                        <br />
                        <br />
                        <br />
                        <br />
                        <br />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ paddingTop: "0" }}>
                        <Row
                          style={{
                            borderBottom: "2px dashed #827b7b",
                            width: "90%",
                            float: "right",
                          }}
                        >
                          <div
                            style={{ display: "inline-block", width: "70%" }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["cnb4"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "cnb4")
                                }
                              />
                            </div>
                            <div
                              style={{ display: "inline-block", width: "65%" }}
                            >
                              <div style={{ display: "inline-block" }}>
                                {this.state.formValues["subcontent4-7"]}
                              </div>
                              <div style={{ display: "inline-block" }}>
                                <div
                                  style={{
                                    display: "inline-block",
                                    paddingLeft: "5px",
                                  }}
                                >
                                  (
                                </div>
                                <div style={{ display: "inline-block" }}>
                                  {this.state.formValues["nb4-price"]}
                                </div>
                                <div style={{ display: "inline-block" }}>
                                  € HT)
                                </div>
                              </div>
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "30px",
                                verticalAlign: "top",
                                marginTop: "5px",
                              }}
                            >
                              Nb:
                            </div>
                            <div
                              style={{
                                display: "inline-block",
                                paddingTop: "3px",
                                verticalAlign: "top",
                              }}
                            >
                              <Input
                                type="text"
                                className="contract-text"
                                style={{ fontWeight: "bold", height: "20px" }}
                                value={this.state.formValues["nb4"]}
                                onChange={(e) =>
                                  this.handleFieldChange("nb4", e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                          <div
                            style={{ display: "inline-block", width: "30%" }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "40px",
                                width: "55px",
                              }}
                            ></div>
                            <div
                              style={{
                                display: "inline-block",
                                width: "40px",
                                textAlign: "center",
                              }}
                            >
                              {" "}
                              HT
                            </div>
                            <div
                              style={{ display: "inline-block" }}
                              className="contract-div"
                            >
                              {this.state.formValues["nbHT4"]} €
                            </div>
                          </div>
                        </Row>
                      </td>
                    </tr>
                    <tr>
                      <td
                        width="75%"
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      ></td>
                      <td
                        width="25%"
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      >
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "50px",
                              textAlign: "center",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC34"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                    {/*------- section5 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingBottom: 0 }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c5"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c5")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              {this.state.formValues["title5"]}
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ fontWeight: "bold" }}
                                value={this.state.formValues["p5"]}
                                onChange={(e) =>
                                  this.handleFieldChange("p5", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "5px",
                                paddingTop: "10px",
                              }}
                            >
                              € HT
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent5-1"]}
                        </div>
                      </td>
                      <td width="25%" style={{ paddingBottom: 0 }}>
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "50px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["HT5"]} €
                          </div>
                        </Row>
                        <br />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ paddingTop: "0" }}>
                        <Row
                          style={{
                            borderBottom: "2px dashed #827b7b",
                            width: "90%",
                            float: "right",
                          }}
                        >
                          <div
                            style={{ display: "inline-block", width: "70%" }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["cnb5"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "cnb5")
                                }
                              />
                            </div>
                            <div
                              style={{ display: "inline-block", width: "65%" }}
                            >
                              <div style={{ display: "inline-block" }}>
                                {this.state.formValues["subcontent5-2"]}
                              </div>
                              <div style={{ display: "inline-block" }}>
                                <div
                                  style={{
                                    display: "inline-block",
                                    paddingLeft: "5px",
                                  }}
                                >
                                  (
                                </div>
                                <div style={{ display: "inline-block" }}>
                                  {this.state.formValues["nb5-price"]}
                                </div>
                                <div style={{ display: "inline-block" }}>
                                  € HT)
                                </div>
                              </div>
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "30px",
                                verticalAlign: "top",
                                marginTop: "5px",
                              }}
                            >
                              Nb:
                            </div>
                            <div
                              style={{
                                display: "inline-block",
                                paddingTop: "3px",
                                verticalAlign: "top",
                              }}
                            >
                              <Input
                                type="text"
                                className="contract-text"
                                style={{ fontWeight: "bold", height: "20px" }}
                                value={this.state.formValues["nb5"]}
                                onChange={(e) =>
                                  this.handleFieldChange("nb5", e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                          <div
                            style={{ display: "inline-block", width: "30%" }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "40px",
                                width: "57px",
                              }}
                            ></div>
                            <div
                              style={{
                                display: "inline-block",
                                width: "40px",
                                textAlign: "center",
                              }}
                            >
                              {" "}
                              HT
                            </div>
                            <div
                              style={{ display: "inline-block" }}
                              className="contract-div"
                            >
                              {this.state.formValues["nbHT5"]} €
                            </div>
                          </div>
                        </Row>
                      </td>
                    </tr>
                    <tr>
                    <td width="75%" style={{ paddingBottom: 0, paddingTop: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", marginLeft: "20px" }}>
                        <div style={{ marginRight: 10 }}>
                          <LabeledCheckboxMaterialUi
                            label="" // pas de label → pas de styles MUI sur le texte
                            checked={this.state.formValues.cc5}
                            onChange={(e) => this.handleCheckChange(e, "cc5")}
                          />
                        </div>
                        <div style={{ lineHeight: 1.4 }}>
                          {this.state.formValues["subcontent5-3"]}
                        </div>
                      </div>
                    </td>
                      <td
                        width="25%"
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      >
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "50px",
                              textAlign: "center",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC5"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                    {/*------- section6 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingBottom: 0 }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c6"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c6")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              {this.state.formValues["title6"]}
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ fontWeight: "bold" }}
                                value={this.state.formValues["p6"]}
                                onChange={(e) =>
                                  this.handleFieldChange("p6", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "5px",
                                paddingTop: "10px",
                              }}
                            >
                              € HT
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent6-1"]}
                        </div>
                      </td>
                      <td width="25%" style={{ paddingBottom: 0 }}>
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "50px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["HT6"]} €
                          </div>
                        </Row>
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "52px",
                              textAlign: "center",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC6"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                    {/*------- section7 -------*/}
                    <tr>
                      <td width="75%" style={{ paddingBottom: "30px" }}>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              style={{
                                display: "inline-block",
                                marginLeft: "20px",
                              }}
                            >
                              <LabeledCheckboxMaterialUi
                                label=""
                                checked={this.state.formValues["c7"]}
                                onChange={(event) =>
                                  this.handleCheckChange(event, "c7")
                                }
                              />
                            </div>
                            <div
                              className="bold-black width-85"
                              style={{ display: "inline-block" }}
                            >
                              {this.state.formValues["title7"]}
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "-5px" }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ fontWeight: "bold" }}
                                value={this.state.formValues["p7"]}
                                onChange={(e) =>
                                  this.handleFieldChange("p7", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "5px",
                                paddingTop: "10px",
                              }}
                            >
                              € HT
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["subcontent7-1"]}
                        </div>
                      </td>
                      <td width="25%" style={{ paddingBottom: "30px" }}>
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "52px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            Total
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["HT7"]} €
                          </div>
                        </Row>
                        <Row style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "53px",
                              textAlign: "center",
                            }}
                          ></div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            {" "}
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TTC7"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                  </table>
                  <div
                    className="vertical-line"
                    style={{ height: "760px" }}
                  ></div>
                </div>
                {/******* table2 ********/}
                <div style={{ display: "flex" }}>
                  <table
                    className="tableCSS"
                    style={{
                      textAlign: "left",
                      fontSize: "15px",
                      marginTop: "30px",
                    }}
                  >
                    <tr>
                      <td
                        width="75%"
                        style={{
                          paddingTop: "20px",
                          borderRight: "2px solid #8d8d8d",
                        }}
                      >
                        <div
                          style={{ marginLeft: "30px", fontStyle: "italic" }}
                          className="bold-black"
                        >
                          <u>{this.state.formValues["table2-title"]}</u>
                        </div>
                        <div style={{ marginLeft: "30px" }}>
                          {this.state.formValues["table2-subcontent1"]}
                          {this.state.formValues["table2-subcontent2"]}
                        </div>
                        <br />
                        <br />
                      </td>
                      <td
                        width="25%"
                        style={{
                          paddingTop: "15px",
                          borderLeft: "2px solid #8d8d8d",
                        }}
                      >
                        <Row>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "52px",
                            }}
                          >
                            TOTAL
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            HT
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TOTALHT"]} €
                          </div>
                        </Row>
                        <Row style={{ marginTop: "5px" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "52px",
                            }}
                          >
                            TVA
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            <div style={{ display: "inline-block" }}>
                              <Input
                                type="text"
                                className="contract-text2"
                                style={{ width: "20px" }}
                                value={this.state.formValues["TVAP"]}
                                onChange={(e) =>
                                  this.handleFieldChange("TVAP", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div style={{ display: "inline-block" }}>%</div>
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TVA"]} €
                          </div>
                        </Row>
                        <Row style={{ marginTop: "5px" }}>
                          <div
                            style={{
                              display: "inline-block",
                              marginLeft: "40px",
                              width: "52px",
                            }}
                          >
                            TOTAL
                          </div>
                          <div
                            style={{
                              display: "inline-block",
                              width: "40px",
                              textAlign: "center",
                            }}
                          >
                            TTC
                          </div>
                          <div
                            style={{ display: "inline-block" }}
                            className="contract-div"
                          >
                            {this.state.formValues["TOTALTTC"]} €
                          </div>
                        </Row>
                      </td>
                    </tr>
                  </table>
                </div>
                {/******* table3 ********/}
                <div style={{ display: "flex", marginBottom: "50px" }}>
                  <table
                    className="tableCSS"
                    style={{
                      textAlign: "left",
                      fontSize: "15px",
                      marginTop: "30px",
                    }}
                  >
                    <tr>
                      <td
                        width="75%"
                        style={{
                          paddingTop: "20px",
                          borderRight: "2px solid #8d8d8d",
                        }}
                      >
                        <div
                          style={{ marginLeft: "30px", fontStyle: "italic" }}
                          className="bold-black"
                        >
                          <u>{this.state.formValues["table3-title"]}</u>
                        </div>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "30px",
                                width: "50%",
                              }}
                            >
                              <Input
                                type="text"
                                className="contract-subcontent"
                                value={
                                  this.state.formValues["table3-subcontent1"]
                                }
                                onChange={(e) =>
                                  this.handleFieldChange(
                                    "table3-subcontent1",
                                    e.target.value
                                  )
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{ display: "inline-block" }}
                            >
                              <Input
                                type="text"
                                className="contract-subcontent"
                                value={this.state.formValues["fp1"]}
                                onChange={(e) =>
                                  this.handleFieldChange("fp1", e.target.value)
                                }
                                required
                                style={{ width: "45px" }}
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{ display: "inline-block" }}
                            >
                              %
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "5px" }}
                          >
                            <div
                              style={{ display: "inline-block", width: "80px" }}
                              className="contract-div"
                            >
                              {this.state.formValues["FINAL75"]} €
                            </div>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                            <div
                              className="bold-black"
                              style={{
                                display: "inline-block",
                                marginLeft: "30px",
                                width: "50%",
                              }}
                            >
                              <Input
                                type="text"
                                className="contract-subcontent"
                                value={
                                  this.state.formValues["table3-subcontent2"]
                                }
                                onChange={(e) =>
                                  this.handleFieldChange(
                                    "table3-subcontent2",
                                    e.target.value
                                  )
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{ display: "inline-block" }}
                            >
                              <Input
                                type="text"
                                style={{ width: "45px" }}
                                className="contract-subcontent"
                                value={this.state.formValues["fp2"]}
                                onChange={(e) =>
                                  this.handleFieldChange("fp2", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div
                              className="bold-black"
                              style={{ display: "inline-block" }}
                            >
                              %
                            </div>
                          </Col>
                          <Col
                            md="3"
                            sm="12"
                            style={{ paddingLeft: 0, marginTop: "5px" }}
                          >
                            <div
                              style={{ display: "inline-block", width: "80px" }}
                              className="contract-div"
                            >
                              {this.state.formValues["FINAL25"]} €
                            </div>
                          </Col>
                        </Row>
                      </td>
                      <td
                        width="25%"
                        style={{
                          paddingTop: "15px",
                          borderLeft: "2px solid #8d8d8d",
                        }}
                      >
                        <div
                          style={{ fontStyle: "italic" }}
                          className="bold-black"
                        >
                          <u>Date & signature du client :</u>
                        </div>
                        <br />
                        <br />
                        <br />
                      </td>
                    </tr>
                  </table>
                </div>
                <div
                  className="pt-3 contract-footer"
                  style={{ marginBottom: "100px", textAlign: "center" }}
                >
                  <p>
                    EOR - 36, RUE DE LABORDE 75008 PARIS - SIRET N°
                    48488721100023 - APE N° 7022Z
                  </p>
                </div>
              </CardBody>
            </Card>
            <Card
              className="contract-page"
              style={{ padding: "0.5rem 5.5rem 2.2rem 5.5rem" }}
            >
              <CardBody>
                <Row>
                  <Col md="12" sm="12">
                    <img src={logo} alt="logo" style={{ height: "130px" }} />
                  </Col>
                </Row>
                <div className="text-left pt-3 contract-footer">
                  <div style={{ textAlign: "center" }}>
                    <h1>
                      Conditions Générales de ventes de{" "}
                      {this.ifExist("first_name")} {this.ifExist("last_name")}
                    </h1>
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: "16px",
                      marginTop: "50px",
                    }}
                  >
                    {this.state.general_condition}
                  </div>
                </div>
                <div
                  className="pt-3 contract-footer"
                  style={{ textAlign: "center", marginTop: "30px" }}
                >
                  <p>
                    EOR - 36, RUE DE LABORDE 75008 PARIS - SIRET N°
                    48488721100023 - APE N° 7022Z
                  </p>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default EditContract;
/* eslint-disable */
