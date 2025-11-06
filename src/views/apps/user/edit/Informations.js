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
import axios from "axios";
//import moment from "moment"
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

    dob: this.props.data.birth_date,
    birth_place: this.props.data.birth_place,
    username: this.props.data.username,
    p_password: this.props.data.p_password,
    status: this.props.data.status,
    status_fa: this.props.data.status_fa,

    civility: this.props.data.civility,
    first_name: this.props.data.first_name,
    maiden_name: this.props.data.maiden_name,
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
    personal_city_options: [],
    personal_country: this.props.data.personal_country,
    society_name: this.props.data.society_name,
    society_address: this.props.data.society_address,
    society_address_2: this.props.data.society_address_2,
    society_zip_code: this.props.data.society_zip_code,
    society_city: this.props.data.society_city,
    society_country: this.props.data.society_country,

    parent_id: this.props.data.parent_id,
    business_introducer_id: this.props.data.business_introducer_id,
  };

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    await axios
      .get(global.config.server_url + "/users/" + this.props.id, Config)
      .then((response) => {
        let rowData = response.data;

        this.setState({ ...rowData });
      });
  }
  zipTimeout = null;

  // Appel API : code postal -> liste de villes
  fetchCitiesByZip = async (zip, which /* 'personal' | 'society' */) => {
    const key = `${which}_city_options`;
    if (!/^\d{5}$/.test(zip)) {
      this.setState({ [key]: [] });
      return;
    }
    try {
      const { data } = await axios.get(
        `https://geo.api.gouv.fr/communes?codePostal=${zip}&fields=nom&format=json`
      );
      const options = (data || []).map((c) => c.nom);
      this.setState({ [key]: options });

      // Astuce: auto-sélection si une seule commune pour ce CP
      if (options.length === 1) {
        this.setState({ [`${which}_city`]: options[0] });
      }
    } catch (e) {
      console.error(e);
      this.setState({ [key]: [] });
    }
  };

  // Débounce de la saisie CP pour limiter les requêtes
  handleZipChange = (zip, which) => {
    this.setState({ [`${which}_zip_code`]: zip });
    if (this.zipTimeout) clearTimeout(this.zipTimeout);
    this.zipTimeout = setTimeout(() => this.fetchCitiesByZip(zip, which), 300);
  };
  updateUsername = (e) => {
    if (e.first_name != null && e.last_name != null) {
      this.setState({ first_name: e.first_name });
      this.setState({ last_name: e.last_name });
      this.setState({ username: e.first_name + " " + e.last_name });
    } else if (e.first_name != null && e.last_name == null) {
      this.setState({
        username: e.first_name + " " + this.state.last_name,
      });
      this.setState({ first_name: e.first_name });
    } else if (e.first_name == null && e.last_name != null) {
      this.setState({
        username: this.state.first_name + " " + e.last_name,
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
          business_introducer_id: information.business_introducer_id,
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
                : "",
              first_name: information.first_name,
              last_name: information.last_name,
              birth_date: information.dob,
              birth_place: information.birth_place,
              maiden_name: information.maiden_name,
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
              business_introducer_id: information.business_introducer_id,
            },
            Config
          )
          .then((response) => {
            toast.info("Modifications enregistrées");
            if (this.props && this.props.backTo) {
              // léger délai pour laisser apparaître le toast
              setTimeout(() => history.push(this.props.backTo), 100);
            }
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

  ifCiviliteExist(civ) {
    if (this.ifExist("civility") === civ) {
      return true;
    } else {
      return false;
    }
  }

  test(civ) {
    if (civ !== this.ifExist("civility")) return false;
    return true;
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
              {/* Civilité */}
              <Col md="12" sm="12" style={{ marginTop: "20px" }}>
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">
                    Civilité
                  </span>
                </h5>
                <FormGroup style={{ marginTop: "10px" }}>
                  {this.props.data["civility"] !== null ? (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Monsieur"
                          color="primary"
                          defaultChecked={this.ifCiviliteExist("Monsieur")}
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
                          defaultChecked={this.ifCiviliteExist("Madame")}
                          name="civility"
                          onChange={() => this.setState({ civility: "Madame" })}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={this.ifCiviliteExist("Mlle")}
                          name="civility"
                          onChange={() => this.setState({ civility: "Mlle" })}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Monsieur"
                          color="primary"
                          defaultChecked={false}
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

              {/* Nom / Prénom */}
              <Col md="6" sm="12">
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
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="firstname">Prénom</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("first_name")}
                    onChange={(e) =>
                      this.updateUsername({
                        first_name: e.target.value,
                        last_name: null,
                      })
                    }
                    id="firstname"
                    placeholder="Prénom"
                  />
                </FormGroup>
              </Col>

              {/* Email / Téléphone */}
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
                <FormGroup>
                  <Label for="contactnumber">Numéro de Téléphone</Label>
                  <Input
                    type="text"
                    id="contactnumber"
                    placeholder="Numéro de Téléphone"
                    defaultValue={this.ifExist("mobile_number")}
                    onChange={(e) =>
                      this.setState({ contact_number: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>

              {/* Statut marital / Service militaire */}
              <Col md="6" sm="12">
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">
                    Statut marital
                  </span>
                </h5>
                <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                  {this.props.data["martial_status"] !== null ? (
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
                    </>
                  ) : (
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
                          label="Divorcé"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Divorcé" })
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
                          label="Veuf"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() =>
                            this.setState({ martial_status: "Veuf" })
                          }
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">
                    Service militaire
                  </span>
                </h5>
                <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                  {this.props.data["military_service"] != null ? (
                    <>
                      <div
                        className="d-inline-block mr-1"
                        style={{ verticalAlign: "top", paddingTop: "3px" }}
                      >
                        Service militaire:
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Oui"
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
                          label="Non"
                          color="primary"
                          defaultChecked={
                            this.props.data["military_service"] == "Non"
                              ? true
                              : false
                          }
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "Non" })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="d-inline-block mr-1"
                        style={{ verticalAlign: "top", paddingTop: "5px" }}
                      >
                        Service militaire:
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Oui"
                          color="primary"
                          defaultChecked={false}
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "Oui" })
                          }
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Non"
                          color="primary"
                          defaultChecked={false}
                          name="military_service"
                          onChange={() =>
                            this.setState({ military_service: "Non" })
                          }
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>

              {/* Mot de passe / Rôle */}
              <Col md="6" sm="12">
                <FormGroup>
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
                  <Label for="role">Rôle</Label>
                  {this.ifDataExist("role") != null ? (
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
                  ) : (
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

              {/* Date de naissance / Lieu de naissance */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label className="d-block" for="dob">
                    Date de naissance
                  </Label>
                  {this.props.data["birth_date"] != null ? (
                    <InputMaskDate
                      defaultValue={this.props.data["birth_date"]}
                      onChange={(e) => this.handledob(e.target.value)}
                    />
                  ) : (
                    <InputMaskDate
                      onChange={(e) => this.handledob(e.target.value)}
                    />
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="placeofbirth">Lieu de naissance</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("birth_place")}
                    placeholder="Ville"
                    onChange={(e) =>
                      this.setState({ birth_place: e.target.value })
                    }
                    id="placeofbirth"
                  />
                </FormGroup>
              </Col>

              {/* Nom de jeune fille / Téléphone société */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="ndjf">Nom de jeune fille</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("maiden_name")}
                    placeholder="Nom de jeune fille"
                    onChange={(e) =>
                      this.setState({ maiden_name: e.target.value })
                    }
                    id="ndjf"
                  />
                </FormGroup>
              </Col>
              {/* <Col md="6" sm="12">
                <FormGroup>
                  <Label for="officenumber">
                    Numéro de Téléphone de la société
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
              </Col> */}

              {/* Nombre d’enfants / Nom société */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="child_nbr">Nombre d'enfants</Label>
                  <Input
                    type="number"
                    id="child_nbr"
                    placeholder="Nombre"
                    defaultValue={this.ifExist("children_number")}
                    onChange={(e) =>
                      this.setState({ children_number: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>

              {/* Sécurité sociale / Clé */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="SS1">Sécurité Sociale</Label>
                  <Input
                    type="number"
                    id="secu_social"
                    placeholder="N°"
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
                    placeholder="XX"
                    defaultValue={this.ifExist("secu_social_key")}
                    onChange={(e) =>
                      this.setState({ secu_social_key: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>

              {/* Adresse client */}
              <Col className="mt-1" md="6" sm="12">
                <h5 className="mb-1">
                  <User className="mr-50" size={16} />
                  <span className="align-middle">Adresse du client</span>
                </h5>
                <FormGroup>
                  <Label for="address1">Adresse</Label>
                  <Input
                    type="text"
                    id="address1"
                    defaultValue={this.ifExist("personal_address")}
                    onChange={(e) =>
                      this.setState({ personal_address: e.target.value })
                    }
                    placeholder="Adresse"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="address2">Adresse n°2</Label>
                  <Input
                    type="text"
                    id="address2"
                    defaultValue={this.ifExist("personal_address_2")}
                    onChange={(e) =>
                      this.setState({ personal_address_2: e.target.value })
                    }
                    placeholder="Adresse n°2"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="pincode">Code postal</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{5}"
                      id="pincode"
                      placeholder="Code postal personnel"
                      defaultValue={this.ifExist("personal_zip_code")}
                      onChange={(e) => this.handleZipChange(e.target.value, "personal")}
                    />
                </FormGroup>
                <FormGroup>
                  <Label for="city">Ville</Label>
                  <Input
                    type="text"
                    id="city"
                    list="personalCityList"
                    placeholder="Ville personnelle"
                    value={this.state.personal_city || ""}
                    onChange={(e) => this.setState({ personal_city: e.target.value })}
                  />
                  <datalist id="personalCityList">
                    {this.state.personal_city_options.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
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

              {/* Adresse société */}
              <Col className="mt-1" md="6" sm="12">
                <h5 className="mb-1">
                  <MapPin className="mr-50" size={16} />
                  <span className="align-middle">Adresse de sa société</span>
                </h5>
                <FormGroup>
                  <Label for="society_name">Nom Société</Label>
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
                <FormGroup>
                  <Label for="address1">Adresse 1</Label>
                  <Input
                    type="text"
                    id="address1"
                    placeholder="Adresse société 1"
                    defaultValue={this.ifExist("society_address")}
                    onChange={(e) =>
                      this.setState({ society_address: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="address2">Adresse 2</Label>
                  <Input
                    type="text"
                    id="address2"
                    placeholder="Adresse société 2"
                    defaultValue={this.ifExist("society_address_2")}
                    onChange={(e) =>
                      this.setState({ society_address_2: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="pincode">Code postal</Label>
                  <Input
                    type="number"
                    id="pincode"
                    placeholder="Code postal société"
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
                <FormGroup>
                  <Label for="officenumber">
                    Numéro de Téléphone de la société
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

              {/* Expert / Apporteur */}
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
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="business_introducer">Apporteur d'affaire</Label>
                  <CustomInput
                    type="select"
                    name="business_introducer"
                    value={
                      this.state.business_introducer_id != null
                        ? this.state.business_introducer_id
                        : this.ifDataExist("business_introducer_id")
                    }
                    id="business_introducer"
                    onChange={(e) =>
                      this.setState({ business_introducer_id: e.target.value })
                    }
                  >
                    {this.props.members &&
                      [<option value={null}>Aucun</option>].concat(
                        this.props.members.map((member, index) => (
                          <option value={member.id}>
                            {member.first_name + " " + member.last_name}
                          </option>
                        ))
                      )}
                  </CustomInput>
                </FormGroup>
              </Col>

              {/* Bouton */}
              <Col
                className="d-flex justify-content-center flex-wrap mt-2"
                sm="12"
              >
                <Button.Ripple className="mr-1" color="success" type="submit">
                  Valider
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
