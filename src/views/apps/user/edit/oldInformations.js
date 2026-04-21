/* eslint-disable */

import React from "react";
import {
  Row,
  Col,
  Button,
  Form,
  Input,
  Label,
  FormGroup,
  CustomInput,
} from "reactstrap";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent";
import { User, MapPin, Aperture } from "react-feather";
import "flatpickr/dist/themes/light.css";
import "../../../../assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import InputMaskDate from "./InputMaskDate";
import axios from "axios";
import { toast } from "react-toastify";
import { history } from "../../../../history";
import Radio from "../../../../components/@vuexy/radio/RadioVuexy";
const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

class UserAccountTab extends React.Component {
  state = {
    rowData: [],
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    if (this.props.data) {
      return;
    }
    await axios
      .get(
        global.config.server_url +
          "/users/" +
          this.props.id +
          "?kind=oldclient",
        Config
      )
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData });
      });
  }

  updateUsersInformation = () => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    axios
      .put(
        global.config.server_url +
          "/users/" +
          this.props.id +
          "?kind=oldclient",
        {
          cl_civilite:
            this.state.cl_civilite === undefined
              ? this.props.data.cl_civilite
              : this.state.cl_civilite,
          cl_nom:
            this.state.cl_nom === undefined
              ? this.props.data.cl_nom
              : this.state.cl_nom,
          cl_prenom:
            this.state.cl_prenom === undefined
              ? this.props.data.cl_prenom
              : this.state.cl_prenom,
          cl_ne_le:
            this.state.cl_ne_le === undefined
              ? this.props.data.cl_ne_le
              : this.state.cl_ne_le,
          cl_mail:
            this.state.cl_mail === undefined
              ? this.props.data.cl_mail
              : this.state.cl_mail,
          cl_service_mil:
            this.state.cl_service_mil === undefined
              ? this.props.data.cl_service_mil
              : this.state.cl_service_mil,
          cl_tel_bur:
            this.state.cl_tel_bur === undefined
              ? this.props.data.cl_tel_bur
              : this.state.cl_tel_bur,
          cl_tel_port:
            this.state.cl_tel_port === undefined
              ? this.props.data.cl_tel_port
              : this.state.cl_tel_port,
          cl_nb_enf:
            this.state.cl_nb_enf === undefined
              ? this.props.data.cl_nb_enf
              : this.state.cl_nb_enf,
          cl_ss1:
            this.state.cl_ss1 === undefined
              ? this.props.data.cl_ss1
              : this.state.cl_ss1,
          cl_ss2:
            this.state.cl_ss2 === undefined
              ? this.props.data.cl_ss2
              : this.state.cl_ss2,
          cl_nom_soc:
            this.state.cl_nom_soc === undefined
              ? this.props.data.cl_nom_soc
              : this.state.cl_nom_soc,
          cl_adr:
            this.state.cl_adr === undefined
              ? this.props.data.cl_adr
              : this.state.cl_adr,
          cl_cp:
            this.state.cl_cp === undefined
              ? this.props.data.cl_cp
              : this.state.cl_cp,
          cl_ville:
            this.state.cl_ville === undefined
              ? this.props.data.cl_ville
              : this.state.cl_ville,
          cl_pays:
            this.state.cl_pays === undefined
              ? this.props.data.cl_pays
              : this.state.cl_pays,
          cl_adr_soc:
            this.state.cl_adr_soc === undefined
              ? this.props.data.cl_adr_soc
              : this.state.cl_adr_soc,
          cl_cp_soc:
            this.state.cl_cp_soc === undefined
              ? this.props.data.cl_cp_soc
              : this.state.cl_cp_soc,
          cl_ville_soc:
            this.state.cl_ville_soc === undefined
              ? this.props.data.cl_ville_soc
              : this.state.cl_ville_soc,
          expert_name:
            this.state.expert_name === undefined
              ? this.props.data.expert_name
              : this.state.expert_name,
        },
        Config
      )
      .then((response) => {
        toast.info("Modifications enregistrées");
        if (this.props && this.props.backTo) {
          setTimeout(() => history.push(this.props.backTo), 100);
        }
      });
  };

  ifDateExist(name) {
    if (this.props.data) return new Date(this.props.data[name]);
    else return "N/A";
  }

  ifExist(name) {
    if (this.props.data) {
      return this.props.data[name];
    } else return "";
  }

  ifDataExist(name) {
    if (this.props.data) {
      return this.props.data[name];
    } else return "";
  }

  handledob = (date) => {
    var lstDate = date.split("/");
    // var MyDateString = test.getFullYear() + "-" + ('0' + (test.getMonth()+1)).slice(-2) + "-" + ('0' + test.getDate()).slice(-2)
    if (lstDate.length === 3) {
      var MyDateString = lstDate[2] + "-" + lstDate[1] + "-" + lstDate[0];
      this.setState({
        dob: MyDateString,
      });
    }
  };
  updateData = (e) => {
    e.preventDefault();
  };
  render() {
    return (
      <Row>
        <Col sm="12">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              this.updateUsersInformation();
            }}
          >
            <Row>
              <Col md="6" sm="12" style={{ marginTop: "20px" }}>
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">Civilité</span>
                </h5>
                <FormGroup style={{ marginTop: "10px" }}>
                  {this.props.data["cl_civilite"] !== null && (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Monsieur"
                          color="primary"
                          defaultChecked={
                            this.props.data["cl_civilite"] === "Mr"
                              ? true
                              : false
                          }
                          name="cl_civilite"
                          //onChange={() => this.setState({cl_civilite: "Monsieur"})}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Madame"
                          color="primary"
                          defaultChecked={
                            this.props.data["cl_civilite"] === "Mme"
                              ? true
                              : false
                          }
                          name="cl_civilite"
                          //onChange={() => this.setState({cl_civilite: "Madame"})}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={
                            this.props.data["cl_civilite"] === "Mlle"
                              ? true
                              : false
                          }
                          name="cl_civilite"
                          //onChange={() => this.setState({cl_civilite: "Mlle"})}
                        />
                      </div>
                    </>
                  )}
                  {this.props.data["cl_civilite"] == null && (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Monsieur"
                          color="primary"
                          defaultChecked={true}
                          name="cl_civilite"
                          //onChange={() => this.setState({cl_civilite: "Monsieur"})}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Madame"
                          color="primary"
                          defaultChecked={false}
                          name="cl_civilite"
                          //onChange={() => this.setState({cl_civilite: "Madame"})}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={false}
                          name="cl_civilite"
                          //onChange={() => this.setState({cl_civilite: "Mlle"})}
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12" style={{ marginTop: "20px" }}></Col>
              <Col md="6" sm="12" style={{ marginTop: "-15px" }}>
                <FormGroup>
                  <Label for="cl_nom">Nom</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifDataExist("cl_nom")}
                    id="cl_nom"
                    placeholder="Nom"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="name">Prénom</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("cl_prenom")}
                    id="name"
                    placeholder="Prénom"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="role">Rôle</Label>
                  {this.ifDataExist("role") != null && (
                    <Input
                      type="select"
                      name="select"
                      id="role"
                      defaultValue={this.ifDataExist("role")}
                      onChange={(e) => this.setState({ role: e.target.value })}
                    >
                      <option>Client</option>
                      <option>Consultant</option>
                      <option>Expert</option>
                      <option>admin</option>
                    </Input>
                  )}
                  {this.ifDataExist("role") == null && (
                    <Input
                      type="select"
                      name="select"
                      id="role"
                      defaultValue="Client"
                      onChange={(e) => this.setState({ role: e.target.value })}
                    >
                      <option>Client</option>
                      <option>Consultant</option>
                      <option>Expert</option>
                      <option>admin</option>
                    </Input>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label className="d-block" for="dob">
                    Date de naissance
                  </Label>
                  {this.props.data["cl_ne_le"] != null && (
                    <InputMaskDate
                      defaultValue={this.props.data["cl_ne_le"]}
                      onChange={(e) => this.handledob(e.target.value)}
                    />
                  )}
                  {this.props.data["cl_ne_le"] == null && (
                    <InputMaskDate
                      onChange={(e) => this.handledob(e.target.value)}
                    />
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="email">Email</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifDataExist("cl_mail")}
                    onChange={(e) => this.setState({ cl_mail: e.target.value })}
                    id="email"
                    placeholder="Email"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                  {this.props.data["cl_service_mil"] !== null && (
                    <>
                      <div
                        className="d-inline-block mr-1"
                        style={{ verticalAlign: "top", paddingTop: "3px" }}
                      >
                        Service militaire:
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="oui"
                          color="primary"
                          defaultChecked={
                            this.props.data["cl_service_mil"] === "oui"
                              ? true
                              : false
                          }
                          name="cl_service_mil"
                          onChange={() =>
                            this.setState({ cl_service_mil: "oui" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="non"
                          color="primary"
                          defaultChecked={
                            this.props.data["cl_service_mil"] === "non"
                              ? true
                              : false
                          }
                          name="cl_service_mil"
                          onChange={() =>
                            this.setState({ cl_service_mil: "non" })
                          }
                        />
                      </div>
                    </>
                  )}
                  {this.props.data["cl_service_mil"] === null && (
                    <>
                      <div
                        className="d-inline-block mr-1"
                        style={{ verticalAlign: "top", paddingTop: "5px" }}
                      >
                        Service militaire:
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="oui"
                          color="primary"
                          defaultChecked={false}
                          name="cl_service_mil"
                          onChange={() =>
                            this.setState({ cl_service_mil: "oui" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="non"
                          color="primary"
                          defaultChecked={false}
                          name="cl_service_mil"
                          onChange={() =>
                            this.setState({ cl_service_mil: "non" })
                          }
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="officenumber">
                    Numéro de Telephone de la société
                  </Label>
                  <Input
                    type="text"
                    id="officenumber"
                    defaultValue={this.ifExist("cl_tel_bur")}
                    placeholder="Numéro de Téléphone de la société"
                    onChange={(e) =>
                      this.setState({ cl_tel_bur: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="contactnumber">Numéro de Telephone</Label>
                  <Input
                    type="text"
                    id="contactnumber"
                    placeholder="Numéro de Telephone"
                    defaultValue={this.ifExist("cl_tel_port")}
                    onChange={(e) =>
                      this.setState({ cl_tel_port: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="child_nbr">Nombre d'enfants</Label>
                  <Input
                    type="number"
                    id="child_nbr"
                    placeholder="Nombre d'enfants"
                    defaultValue={this.ifExist("cl_nb_enf")}
                    onChange={(e) =>
                      this.setState({ cl_nb_enf: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="cl_ss1">Sécurité Sociale</Label>
                  <Input
                    type="number"
                    id="cl_ss1"
                    placeholder="Sécurité Sociale"
                    defaultValue={this.ifExist("cl_ss1")}
                    onChange={(e) => this.setState({ cl_ss1: e.target.value })}
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="cl_ss2">Clé de Sécurité Sociale</Label>
                  <Input
                    type="number"
                    id="cl_ss2"
                    placeholder="Clé de Sécurité Sociale"
                    defaultValue={this.ifExist("cl_ss2")}
                    onChange={(e) => this.setState({ cl_ss2: e.target.value })}
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="child_nbr">Nom Société</Label>
                  <Input
                    type="text"
                    id="cl_nom_soc"
                    placeholder="Nom Société"
                    defaultValue={this.ifExist("cl_nom_soc")}
                    onChange={(e) =>
                      this.setState({ cl_nom_soc: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col className="mt-1" md="6" sm="12">
                <h5 className="mb-1">
                  <User className="mr-50" size={16} />
                  <span className="align-middle">Adresse du client</span>
                </h5>
                <FormGroup>
                  <Label for="address1">Adresse 1</Label>
                  <Input
                    type="text"
                    id="address1"
                    defaultValue={this.ifExist("cl_adr")}
                    onChange={(e) => this.setState({ cl_adr: e.target.value })}
                    placeholder="Address rowDatannelle1"
                  />
                </FormGroup>
                <FormGroup form-group-lg>
                  <Label for="pincode">Code postal</Label>
                  <Input
                    type="number"
                    id="pincode"
                    placeholder="Code postal de rowDatannel"
                    defaultValue={this.ifExist("cl_cp")}
                    onChange={(e) => this.setState({ cl_cp: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="city">Ville</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("cl_ville")}
                    onChange={(e) =>
                      this.setState({ cl_ville: e.target.value })
                    }
                    id="city"
                    placeholder="Ville rowDatannel"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="Country">Pays</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("cl_pays")}
                    onChange={(e) => this.setState({ cl_pays: e.target.value })}
                    id="Country"
                    placeholder=">Pays rowDatannel"
                  />
                </FormGroup>
              </Col>
              <Col className="mt-1" md="6" sm="12">
                <h5 className="mb-1">
                  <MapPin className="mr-50" size={16} />
                  <span className="align-middle">Adresse de sa société</span>
                </h5>
                <FormGroup>
                  <Label for="address1">Adresse1</Label>
                  <Input
                    type="text"
                    id="address1"
                    placeholder="Address de société1"
                    defaultValue={this.ifExist("cl_adr_soc")}
                    onChange={(e) =>
                      this.setState({ cl_adr_soc: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup form-group-lg>
                  <Label for="pincode">Code postal</Label>
                  <Input
                    type="number"
                    id="pincode"
                    placeholder="Code postal de société"
                    defaultValue={this.ifExist("cl_cp_soc")}
                    onChange={(e) =>
                      this.setState({ cl_cp_soc: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="city">Ville</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("cl_ville_soc")}
                    onChange={(e) =>
                      this.setState({ cl_ville_soc: e.target.value })
                    }
                    id="city"
                    placeholder="Ville société"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="member">Nom de l'expert</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("expert_name")}
                    onChange={(e) =>
                      this.setState({ expert_name: e.target.value })
                    }
                    id="member"
                    placeholder="Nom de l'expert"
                  />
                </FormGroup>
              </Col>
              <Col
                className="d-flex justify-content-end flex-wrap mt-2"
                sm="12"
              >
                <Button.Ripple className="mr-1" color="primary" type="submit">
                  Valider
                </Button.Ripple>
                {/*<Button.Ripple color="flat-warning">Reset</Button.Ripple>*/}
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
    );
  }
}
export default UserAccountTab;
/* eslint-disable */
