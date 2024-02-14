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
//import Flatpickr from "react-flatpickr";
import { User, MapPin, Aperture } from "react-feather";
import "flatpickr/dist/themes/light.css";
import "../../../../assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import InputMaskDate from "./InputMaskDate";
// import { updateUsersInformation } from "../../../../redux/actions/form/informationsFormActions"
import axios from "axios";
//import moment from "moment"
import { toast } from "react-toastify";
//import {history} from "../../../../history";
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

    dob: this.props.data.birth_date,
    username: this.props.data.username,
    p_password: this.props.data.p_password,
    status: this.props.data.status,
    status_fa: this.props.data.status_fa,

    civility: this.props.data.civility,
    first_name: this.props.data.first_name,
    last_name: this.props.data.last_name,
    role: this.props.data.role,
    email: this.props.data.email,
    contact_number: this.props.data.contact_number,
    office_number: this.props.data.office_number,
    martial_status: this.props.data.martial_status,
    children_number: this.props.data.children_number,
    secu_social: this.props.data.secu_social,
    secu_social_key: this.props.data.secu_social_key,
    military_service: this.props.data.military_service,

    personal_address: this.props.data.personal_address,
    personal_address_2: this.props.data.personal_address_2,
    personal_zip_code: this.props.data.personal_zip_code,
    personal_city: this.props.data.personal_city,
    personal_country: this.props.data.personal_country,
    society_name: this.props.data.society_name,
    society_address: this.props.data.society_address,
    society_address_2: this.props.data.society_address_2,
    society_zip_code: this.props.data.society_zip_code,
    society_city: this.props.data.society_city,
    society_country: this.props.data.society_country,

    parent_id: this.props.data.parent_id,
  };

  async componentDidMount() {
    console.log(this.props);
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    await axios
      .get(global.config.server_url + "/users/" + this.props.id, Config)
      .then((response) => {
        let rowData = response.data;
        console.log(rowData);

        this.setState({ rowData });
      });
  }

  updateUsername = (e) => {
    if (e.first_name != null && e.last_name != null) {
      this.setState({ first_name: e.first_name });
      this.setState({ last_name: e.last_name });
      this.setState({ username: e.first_name + " " + e.last_name });
    } else if (e.first_name != null && e.last_name == null) {
      this.setState({
        username: e.first_name + " " + this.state.rowData.last_name,
      });
      this.setState({ first_name: e.first_name });
    } else if (e.first_name == null && e.last_name != null) {
      this.setState({
        username: this.state.rowData.first_name + " " + e.last_name,
      });
      this.setState({ last_name: e.last_name });
    } else return;
  };
  updateUsersInformation = (information) => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    axios
      .put(
        global.config.server_url + "/users/" + this.props.id,
        {
          name: information.username,
          email: information.email,
          role: information.role
            ? information.role
            : this.props.data.role
            ? this.props.data.role
            : "Client",
          p_password: information.p_password,
          status: information.status
            ? information.status
            : this.props.data.status
            ? this.props.data.status
            : "En attente",
          status_fa: information.status_fa
            ? information.status_fa
            : this.props.data.status_fa
            ? this.props.data.status_fa
            : false,
          parent_id: information.parent_id,
        },
        Config
      )
      .then((response) => {
        axios
          .put(
            global.config.server_url + "/personal_information/" + this.props.id,
            {
              civility: information.civility
                ? information.civility
                : this.props.data.civility
                ? this.props.data.civility
                : "Monsieur",
              first_name: information.first_name,
              last_name: information.last_name,
              birth_date: information.dob,
              martial_status: information.martial_status
                ? information.martial_status
                : this.props.data.martial_status
                ? this.props.data.martial_status
                : "Célibataire",
              children_number: information.children_number,
              secu_social: information.secu_social,
              secu_social_key: information.secu_social_key,
              mobile_number: information.contact_number,
              office_number: information.office_number,

              personal_address: information.personal_address,
              personal_address_2: information.personal_address_2,
              personal_zip_code: information.personal_zip_code,
              personal_city: information.personal_city,
              personal_country: information.personal_country,
              society_address: information.society_address,
              society_address_2: information.society_address_2,
              society_zip_code: information.society_zip_code,
              society_city: information.society_city,
              society_country: information.society_country,
              society_name: information.society_name,
              military_service: information.military_service
                ? information.military_service
                : this.props.data.military_service
                ? this.props.data.military_service
                : "oui",

              parent_id: information.parent_id,
            },
            Config
          )
          .then((response) => {
            toast.info("Modifications enregistrées");
          });
      });
  };

  ifDateExist(name) {
    if (this.props.data) return new Date(this.props.data[name]);
    else return "";
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
    if (lstDate.length === 3) {
      var MyDateString = lstDate[2] + "-" + lstDate[1] + "-" + lstDate[0];
      this.setState({
        dob: MyDateString,
      });
    }
  };
  updateData = (e) => {
    e.preventDefault();
    this.updateUsersInformation(this.state);
  };
  render() {
    return (
      <Row>
        <Col sm="12">
          <Form onSubmit={this.updateData}>
            <Row>
              <Col md="6" sm="12" style={{ marginTop: "20px" }}>
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">Civilité</span>
                </h5>
                <FormGroup style={{ marginTop: "10px" }}>
                  {this.props.data["civility"] !== null && (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Monsieur"
                          color="primary"
                          defaultChecked={
                            this.props.data["civility"] === "Monsieur"
                              ? true
                              : false
                          }
                          name="civility"
                          onChange={() =>
                            this.setState({ civility: "Monsieur" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Madame"
                          color="primary"
                          defaultChecked={
                            this.props.data["civility"] === "Madame"
                              ? true
                              : false
                          }
                          name="civility"
                          onChange={() => this.setState({ civility: "Madame" })}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={
                            this.props.data["civility"] === "Mlle"
                              ? true
                              : false
                          }
                          name="civility"
                          onChange={() => this.setState({ civility: "Mlle" })}
                        />
                      </div>
                    </>
                  )}
                  {this.props.data["civility"] === null && (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Monsieur"
                          color="primary"
                          defaultChecked={true}
                          name="civility"
                          onChange={() =>
                            this.setState({ civility: "Monsieur" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Madame"
                          color="primary"
                          defaultChecked={false}
                          name="civility"
                          onChange={() => this.setState({ civility: "Madame" })}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={false}
                          name="civility"
                          onChange={() => this.setState({ civility: "Mlle" })}
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12" style={{ marginTop: "20px" }}></Col>
              <Col md="6" sm="12" style={{ marginTop: "-15px" }}>
                <FormGroup>
                  <Label for="name">Nom</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("last_name")}
                    onChange={(e) =>
                      this.updateUsername({
                        last_name: e.target.value,
                        first_name: null,
                      })
                    }
                    id="name"
                    placeholder="Nom"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12" style={{ marginTop: "-15px" }}>
                <FormGroup style={{ marginBottom: "15px" }}>
                  <Label for="p_password">Mot de passe</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifDataExist("p_password")}
                    onChange={(e) =>
                      this.setState({ p_password: e.target.value })
                    }
                    id="p_password"
                    placeholder="Mot de passe"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="name">Prénom</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("first_name")}
                    onChange={(e) =>
                      this.updateUsername({
                        first_name: e.target.value,
                        last_name: null,
                      })
                    }
                    id="name"
                    placeholder="Prénom"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="role">Role</Label>
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
                  {this.ifDataExist("role") === null && (
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
                  {this.props.data["birth_date"] != null && (
                    <InputMaskDate
                      defaultValue={this.props.data["birth_date"]}
                      onChange={(e) => this.handledob(e.target.value)}
                    />
                  )}
                  {this.props.data["birth_date"] == null && (
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
                    defaultValue={this.ifDataExist("email")}
                    onChange={(e) => this.setState({ email: e.target.value })}
                    id="email"
                    placeholder="Email"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                  {this.props.data["martial_status"] !== null && (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Célibataire"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Célibataire"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Célibataire" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Pacsé"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Pacsé"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Pacsé" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Marié"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Marié"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Marié" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Veuf"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Veuf"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Veuf" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Divorcé"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Divorcé"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Divorcé" })
                          }
                        />
                      </div>
                    </>
                  )}
                  {this.props.data["martial_status"] == null && (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Célibataire"
                          color="primary"
                          defaultChecked={true}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Célibataire" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Pacsé"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Pacsé" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Marié"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Marié" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Veuf"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Veuf" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Divorcé"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Divorcé" })
                          }
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                  {this.props.data["military_service"] != null && (
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
                            this.props.data["military_service"] == "oui"
                              ? true
                              : false
                          }
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "oui" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="non"
                          color="primary"
                          defaultChecked={
                            this.props.data["military_service"] == "non"
                              ? true
                              : false
                          }
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "non" })
                          }
                        />
                      </div>
                    </>
                  )}
                  {this.props.data["military_service"] == null && (
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
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "oui" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="non"
                          color="primary"
                          defaultChecked={false}
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "non" })
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
                    defaultValue={this.ifExist("office_number")}
                    placeholder="Numéro de Téléphone de la société"
                    onChange={(e) =>
                      this.setState({ office_number: e.target.value })
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
                    defaultValue={this.ifExist("mobile_number")}
                    onChange={(e) =>
                      this.setState({ contact_number: e.target.value })
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
                    defaultValue={this.ifExist("children_number")}
                    onChange={(e) =>
                      this.setState({ children_number: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="SS1">Sécurité Sociale</Label>
                  <Input
                    type="number"
                    id="secu_social"
                    placeholder="Sécurité Sociale"
                    defaultValue={this.ifExist("secu_social")}
                    onChange={(e) =>
                      this.setState({ secu_social: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="SS2">Clé de Sécurité Sociale</Label>
                  <Input
                    type="number"
                    id="secu_social_key"
                    placeholder="Clé de Sécurité Sociale"
                    defaultValue={this.ifExist("secu_social_key")}
                    onChange={(e) =>
                      this.setState({ secu_social_key: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="child_nbr">Nom Société</Label>
                  <Input
                    type="text"
                    id="society_name"
                    placeholder="Nom Société"
                    defaultValue={this.ifExist("society_name")}
                    onChange={(e) =>
                      this.setState({ society_name: e.target.value })
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
                  <Label for="address1">Adresse1</Label>
                  <Input
                    type="text"
                    id="address1"
                    defaultValue={this.ifExist("personal_address")}
                    onChange={(e) =>
                      this.setState({ personal_address: e.target.value })
                    }
                    placeholder="Address personnelle1"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="address1">Adresse2</Label>
                  <Input
                    type="text"
                    id="address2"
                    defaultValue={this.ifExist("personal_address_2")}
                    onChange={(e) =>
                      this.setState({ personal_address_2: e.target.value })
                    }
                    placeholder="Address personnelle2"
                  />
                </FormGroup>
                <FormGroup form-group-lg>
                  <Label for="pincode">Code postal</Label>
                  <Input
                    type="number"
                    id="pincode"
                    placeholder="Code postal de personnel"
                    defaultValue={this.ifExist("personal_zip_code")}
                    onChange={(e) =>
                      this.setState({ personal_zip_code: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="city">Ville</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("personal_city")}
                    onChange={(e) =>
                      this.setState({ personal_city: e.target.value })
                    }
                    id="city"
                    placeholder="Ville personnel"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="Country">Pays</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("personal_country")}
                    onChange={(e) =>
                      this.setState({ personal_country: e.target.value })
                    }
                    id="Country"
                    placeholder="Pays personnel"
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
                    defaultValue={this.ifExist("society_address")}
                    onChange={(e) =>
                      this.setState({ society_address: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="address2">Adresse2</Label>
                  <Input
                    type="text"
                    id="address2"
                    placeholder="Address de société2"
                    defaultValue={this.ifExist("society_address_2")}
                    onChange={(e) =>
                      this.setState({ society_address_2: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup form-group-lg>
                  <Label for="pincode">Code postal</Label>
                  <Input
                    type="number"
                    id="pincode"
                    placeholder="Code postal de société"
                    defaultValue={this.ifExist("society_zip_code")}
                    onChange={(e) =>
                      this.setState({ society_zip_code: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="city">Ville</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("society_city")}
                    onChange={(e) =>
                      this.setState({ society_city: e.target.value })
                    }
                    id="city"
                    placeholder="Ville société"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="Country">Pays</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("society_country")}
                    onChange={(e) =>
                      this.setState({ society_country: e.target.value })
                    }
                    id="Country"
                    placeholder="Pays de la société"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="member">Expert</Label>
                  <CustomInput
                    type="select"
                    name="member"
                    value={
                      this.state.parent_id != null
                        ? this.state.parent_id
                        : this.ifDataExist("parent_id")
                    }
                    id="member"
                    onChange={(e) =>
                      this.setState({ parent_id: e.target.value })
                    }
                  >
                    {this.props.members &&
                      this.props.members.map((member, index) => (
                        <option value={member.id}>
                          {member.first_name + " " + member.last_name}
                        </option>
                      ))}
                  </CustomInput>
                </FormGroup>
              </Col>

              <Col
                className="d-flex justify-content-end flex-wrap mt-2"
                sm="12"
              >
                <Button.Ripple className="mr-1" color="primary" type="submit">
                  Modifier
                </Button.Ripple>
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
