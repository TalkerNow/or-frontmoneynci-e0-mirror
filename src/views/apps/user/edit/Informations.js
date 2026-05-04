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
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import ReactCountryFlag from "react-country-flag";
import {
  User,
  Home,
  Briefcase,
  Heart,
  Plus,
  Minus,
  AlertTriangle,
} from "react-feather";
import "flatpickr/dist/themes/light.css";
import "../../../../assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import InputMaskDate from "./InputMaskDate";
import axios from "axios";
import { toast } from "react-toastify";
import { history } from "../../../../history";
import Radio from "../../../../components/@vuexy/radio/RadioVuexy";
import { countryCodes } from "../../../../configs/countryCodes";
import Select from "react-select";

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
    notes: this.props.data.notes || "",

    // UI States
    showAddress2: !!this.props.data.personal_address_2,
    showSociety: !!this.props.data.society_name,
    showSocietyAddress2: !!this.props.data.society_address_2,

    // Modal State
    modalSocietyDelete: false,
  };

  markDirty = () => {
    if (this.props.setDirty) {
      this.props.setDirty(true);
    }
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

        this.setState({
          ...rowData,
          showAddress2: !!rowData.personal_address_2,
          showSociety: !!rowData.society_name,
          showSocietyAddress2: !!rowData.society_address_2,
        });
      });
  }
  zipTimeout = null;

  // Appel API : code postal -> liste de villes
  fetchCitiesByZip = async (zip, which /* 'personal' | 'society' */) => {
    const key = `${which}_city_options`;
    if (!zip || zip.trim() === "") {
      this.setState({ [key]: [] });
      return;
    }
    try {
      const { data } = await axios.get(
        `https://geo.api.gouv.fr/communes?codePostal=${zip}&fields=nom&format=json`,
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
    this.markDirty();
    if (this.zipTimeout) clearTimeout(this.zipTimeout);
    this.zipTimeout = setTimeout(() => this.fetchCitiesByZip(zip, which), 300);
  };
  // ===== Helpers téléphone (FR) =====
  normalizePhone = (v) => {
    if (!v) return "";
    let s = String(v).trim();
    // On conserve + et chiffres, on vire le reste
    let t = s.replace(/[^\d+]/g, "");

    return t;
  };
  formatPhonePretty = (v) => {
    const d = this.normalizePhone(v);
    if (!d) return "";

    // On cherche l'indicatif le plus long qui matche
    const sortedCodes = [...countryCodes].sort(
      (a, b) => b.dial_code.length - a.dial_code.length,
    );

    for (const c of sortedCodes) {
      if (d.startsWith(c.dial_code)) {
        const rest = d.substring(c.dial_code.length);
        return c.dial_code + " " + rest.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
      }
    }

    // Comportement par défaut
    return d.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  };

  getCountryFromPhone = (phone) => {
    if (!phone) return null;
    let p = String(phone).replace(/[^\d+]/g, "");

    // Cas typique français sans +
    if (
      p.startsWith("06") ||
      p.startsWith("07") ||
      (p.startsWith("0") && p.length === 10)
    )
      return "fr";
    if (p.startsWith("0") && p.length > 2) return "fr"; // Supposition raisonnable

    if (p.startsWith("+")) {
      const sortedCodes = [...countryCodes].sort(
        (a, b) => b.dial_code.length - a.dial_code.length,
      );
      for (const c of sortedCodes) {
        if (p.startsWith(c.dial_code)) {
          return c.code;
        }
      }
      return "globe";
    }

    return "fr"; // Défaut
  };
  updateUsername = (e) => {
    this.markDirty();
    const normalizeNullable = (value) => {
      if (value === null || value === undefined) return null;
      const trimmed = String(value).trim();
      return trimmed ? trimmed : null;
    };
    const firstName =
      e.first_name !== undefined
        ? normalizeNullable(e.first_name)
        : normalizeNullable(this.state.first_name);
    const lastName =
      e.last_name !== undefined
        ? normalizeNullable(e.last_name)
        : normalizeNullable(this.state.last_name);
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    this.setState({
      first_name: firstName,
      last_name: lastName,
      username: fullName,
    });
  };
  normalizeNullable = (value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  };
  updateUsersInformation = (information) => {
    const normalizedUsername = this.normalizeNullable(information.username);
    const normalizedFirstName = this.normalizeNullable(information.first_name);
    const normalizedLastName = this.normalizeNullable(information.last_name);
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    axios
      .put(
        global.config.server_url + "/users/" + this.props.id,
        {
          name: normalizedUsername,
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
        Config,
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
              first_name: normalizedFirstName,
              last_name: normalizedLastName,
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
              notes: information.notes,
            },
            Config,
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
    this.markDirty();
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

  // Toggle modal visibility
  toggleSocietyModal = () => {
    this.setState({ modalSocietyDelete: !this.state.modalSocietyDelete });
  };

  // Confirm deletion of society data
  confirmDeleteSociety = () => {
    this.setState({
      showSociety: false,
      showSocietyAddress2: false,
      society_name: "",
      society_address: "",
      society_address_2: "",
      society_zip_code: "",
      society_city: "",
      society_country: "",
      modalSocietyDelete: false,
    });
    this.markDirty();
  };

  render() {
    return (
      <Row>
        <Col sm="12">
          <Form onSubmit={this.updateData} id="user-edit-form">
            <Row className="mb-2">
              <Col sm="12">
                <h4 className="mb-0">Modification client</h4>
              </Col>
            </Row>
            <Row>
              <Col sm="12">
                <h5
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    marginTop: 0,
                    marginBottom: 8,
                    borderBottom: "1px solid #E5E7EB",
                    paddingBottom: 6,
                    width: "100%",
                  }}
                >
                  Informations personnelles
                </h5>
              </Col>
              {/* Civilité moved here */}
              <Col md="12" sm="12">
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">Civilité</span>
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
                          onChange={() => {
                            this.setState({ civility: "Monsieur" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Madame"
                          color="primary"
                          defaultChecked={this.ifCiviliteExist("Madame")}
                          name="civility"
                          onChange={() => {
                            this.setState({ civility: "Madame" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={this.ifCiviliteExist("Mlle")}
                          name="civility"
                          onChange={() => {
                            this.setState({ civility: "Mlle" });
                            this.markDirty();
                          }}
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
                          onChange={() => {
                            this.setState({ civility: "Monsieur" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Madame"
                          color="primary"
                          defaultChecked={false}
                          name="civility"
                          onChange={() => {
                            this.setState({ civility: "Madame" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Mlle"
                          color="primary"
                          defaultChecked={false}
                          name="civility"
                          onChange={() => {
                            this.setState({ civility: "Mlle" });
                            this.markDirty();
                          }}
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <Row>
                  <Col md="12" sm="12">
                    <FormGroup>
                      <Label for="firstname">Prénom</Label>
                      <Input
                        type="text"
                        defaultValue={this.ifExist("first_name")}
                        onChange={(e) =>
                          this.updateUsername({
                            first_name: e.target.value,
                          })
                        }
                        id="firstname"
                        placeholder="Prénom"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="12" sm="12">
                    <FormGroup>
                      <Label for="name">Nom</Label>
                      <Input
                        type="text"
                        defaultValue={this.ifExist("last_name")}
                        onChange={(e) =>
                          this.updateUsername({
                            last_name: e.target.value,
                          })
                        }
                        id="name"
                        placeholder="Nom"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="12" sm="12">
                    <FormGroup>
                      <Label for="email">Email</Label>
                      <Input
                        type="text"
                        defaultValue={this.ifDataExist("email")}
                        onChange={(e) => {
                          this.setState({ email: e.target.value });
                          this.markDirty();
                        }}
                        id="email"
                        placeholder="Email"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="12" sm="12">
                    <FormGroup>
                      <Label for="contactnumber">Numéro de Téléphone</Label>
                      <InputGroup>
                        {(() => {
                          const val =
                            this.state.contact_number ??
                            this.ifExist("mobile_number") ??
                            this.ifExist("office_number");
                          const country = this.getCountryFromPhone(val);

                          if (country && country !== "globe") {
                            return (
                              <InputGroupAddon addonType="prepend">
                                <InputGroupText
                                  className="p-0"
                                  style={{
                                    minWidth: "40px",
                                    justifyContent: "center",
                                  }}
                                >
                                  <ReactCountryFlag
                                    countryCode={country}
                                    svg
                                    style={{
                                      width: "1.5em",
                                      height: "1.5em",
                                    }}
                                  />
                                </InputGroupText>
                              </InputGroupAddon>
                            );
                          }
                          return null;
                        })()}
                        <Input
                          type="text"
                          id="contactnumber"
                          placeholder="Numéro de Téléphone"
                          value={this.formatPhonePretty(
                            this.state.contact_number ??
                              this.ifExist("mobile_number") ??
                              this.ifExist("office_number"),
                          )}
                          onChange={(e) =>
                            this.setState({
                              contact_number: this.normalizePhone(
                                e.target.value,
                              ),
                            })
                          }
                          onBlur={(e) =>
                            this.setState({
                              contact_number: this.normalizePhone(
                                e.target.value,
                              ),
                            })
                          }
                        />
                      </InputGroup>
                    </FormGroup>
                  </Col>
                </Row>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="notes">Notes</Label>
                  <Input
                    type="textarea"
                    rows="11"
                    placeholder="Notes"
                    value={this.state.notes || ""}
                    onChange={(e) => {
                      this.setState({ notes: e.target.value });
                      this.markDirty();
                    }}
                    id="notes"
                  />
                </FormGroup>
              </Col>
              {/* Section Informations administratives */}
              <Col md="12" sm="12">
                <h5
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    marginTop: 16,
                    marginBottom: 8,
                    borderBottom: "1px solid #E5E7EB",
                    paddingBottom: 6,
                  }}
                >
                  Informations administratives
                </h5>
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
                    onChange={(e) => {
                      this.setState({ birth_place: e.target.value });
                      this.markDirty();
                    }}
                    id="placeofbirth"
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
                    onChange={(e) => {
                      this.setState({ secu_social: e.target.value });
                      this.markDirty();
                    }}
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
                    onChange={(e) => {
                      this.setState({ secu_social_key: e.target.value });
                      this.markDirty();
                    }}
                  />
                </FormGroup>
              </Col>
              {/* Statut marital / Service militaire */}
              <Col md="6" sm="12">
                <h5 style={{ marginBottom: "5px" }}>
                  <Heart className="mr-50" size={16} />
                  <span className="align-middle">Statut marital</span>
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
                          onChange={() => {
                            this.setState({ martial_status: "Célibataire" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Marié(e)"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Marié"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Marié" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Divorcé(e)"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Divorcé"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Divorcé" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Pacsé(e)"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Pacsé"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Pacsé" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Veuf(ve)"
                          color="primary"
                          defaultChecked={
                            this.props.data["martial_status"] == "Veuf"
                              ? true
                              : false
                          }
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Veuf" });
                            this.markDirty();
                          }}
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
                          onChange={() => {
                            this.setState({ martial_status: "Célibataire" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Marié(e)"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Marié" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Divorcé(e)"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Divorcé" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Veuf(ve)"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Veuf" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Pacsé(e)"
                          color="primary"
                          defaultChecked={false}
                          name="martial_status"
                          onChange={() => {
                            this.setState({ martial_status: "Pacsé" });
                            this.markDirty();
                          }}
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <h5 style={{ marginBottom: "5px" }}>
                  <User className="mr-50" size={16} />
                  <span className="align-middle">Service militaire</span>
                </h5>
                <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                  {this.props.data["military_service"] != null ? (
                    <>
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
                          onChange={() => {
                            this.setState({ military_service: "oui" });
                            this.markDirty();
                          }}
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
                          onChange={() => {
                            this.setState({ military_service: "Non" });
                            this.markDirty();
                          }}
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
                          onChange={() => {
                            this.setState({ military_service: "Oui" });
                            this.markDirty();
                          }}
                        />
                      </div>
                      <div className="d-inline-block mr-1">
                        <Radio
                          label="Non"
                          color="primary"
                          defaultChecked={false}
                          name="military_service"
                          onChange={() => {
                            this.setState({ military_service: "Non" });
                            this.markDirty();
                          }}
                        />
                      </div>
                    </>
                  )}
                </FormGroup>
              </Col>
              {/* Nom de jeune fille / Rôle de l'utilisateur */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="ndjf">Nom de jeune fille</Label>
                  <Input
                    type="text"
                    defaultValue={this.ifExist("maiden_name")}
                    placeholder="Nom de jeune fille"
                    onChange={(e) => {
                      this.setState({ maiden_name: e.target.value });
                      this.markDirty();
                    }}
                    id="ndjf"
                  />
                </FormGroup>
              </Col>
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="business_introducer">
                    Responsable commercial
                  </Label>
                  <Select
                    inputId="business_introducer"
                    placeholder="Choisir..."
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "Aucun résultat"}
                    value={
                      this.props.members
                        ? (this.props.members
                            .filter(
                              (m) =>
                                m.role?.toLowerCase() === "consultant" ||
                                m.role?.toLowerCase() === "expert" ||
                                m.role?.toLowerCase() === "admin",
                            )
                            .map((m) => ({
                              value: m.id,
                              label: (m.first_name || m.last_name) ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() : (m.name ?? ""),
                            }))
                            .find(
                              (opt) =>
                                String(opt.value) ===
                                String(this.state.business_introducer_id),
                            ) || null)
                        : null
                    }
                    options={
                      this.props.members
                        ? this.props.members
                            .filter(
                              (m) =>
                                m.role?.toLowerCase() === "consultant" ||
                                m.role?.toLowerCase() === "expert" ||
                                m.role?.toLowerCase() === "admin",
                            )
                            .map((m) => ({
                              value: m.id,
                              label: (m.first_name || m.last_name) ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() : (m.name ?? ""),
                            }))
                        : []
                    }
                    onChange={(opt) => {
                      this.setState({
                        business_introducer_id: opt ? opt.value : null,
                      });
                      this.markDirty();
                    }}
                  />
                </FormGroup>
              </Col>
              {/* Nombre d’enfants / Nom société */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="child_nbr">Nombre d'enfants</Label>
                  <Input
                    type="number"
                    id="child_nbr"
                    placeholder="Nombre"
                    defaultValue={this.ifExist("children_number")}
                    onChange={(e) => {
                      this.setState({ children_number: e.target.value });
                      this.markDirty();
                    }}
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row className="mt-2">
              {/* Adresse du client */}
              <Col md="6" sm="12">
                <h5 className="mb-1">
                  <Home className="mr-50" size={16} />
                  <span className="align-middle">Adresse du client</span>
                </h5>
                <FormGroup>
                  <div className="d-flex justify-content-between align-items-center">
                    <Label for="address1">Rue / Numéro</Label>
                    {!this.state.showAddress2 && (
                      <div
                        className="cursor-pointer text-primary d-flex align-items-center"
                        onClick={() => this.setState({ showAddress2: true })}
                      >
                        <Plus size={14} className="mr-50" />
                        <span style={{ fontSize: "0.85rem" }}>
                          Ajouter un complément
                        </span>
                      </div>
                    )}
                  </div>
                  <Input
                    type="text"
                    id="address1"
                    defaultValue={this.ifExist("personal_address")}
                    onChange={(e) => {
                      this.setState({ personal_address: e.target.value });
                      this.markDirty();
                    }}
                    placeholder="Rue / Numéro"
                  />
                </FormGroup>
                {this.state.showAddress2 && (
                  <FormGroup>
                    <div className="d-flex justify-content-between align-items-center">
                      <Label for="address2">Adresse n°2</Label>
                      <div
                        className="cursor-pointer text-danger d-flex align-items-center"
                        onClick={() => {
                          this.setState({
                            showAddress2: false,
                            personal_address_2: "",
                          });
                          this.markDirty();
                        }}
                      >
                        <Minus size={14} className="mr-50" />
                        <span style={{ fontSize: "0.85rem" }}>Retirer</span>
                      </div>
                    </div>
                    <Input
                      type="text"
                      id="address2"
                      value={this.state.personal_address_2 || ""}
                      onChange={(e) => {
                        this.setState({ personal_address_2: e.target.value });
                        this.markDirty();
                      }}
                      placeholder="Adresse n°2"
                    />
                  </FormGroup>
                )}
                <FormGroup>
                  <Label for="pincode">Code postal</Label>
                  <Input
                    type="text"
                    id="pincode"
                    placeholder="Code postal"
                    defaultValue={this.ifExist("personal_zip_code")}
                    onChange={(e) =>
                      this.handleZipChange(e.target.value, "personal")
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="city">Ville</Label>
                  <Input
                    type="text"
                    id="city"
                    list="personalCityList"
                    placeholder="Ville"
                    value={this.state.personal_city || ""}
                    onChange={(e) => {
                      this.setState({ personal_city: e.target.value });
                      this.markDirty();
                    }}
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
                    onChange={(e) => {
                      this.setState({ personal_country: e.target.value });
                      this.markDirty();
                    }}
                    id="Country"
                    placeholder="Pays"
                  />
                </FormGroup>
              </Col>

              {/* Adresse société */}
              <Col md="6" sm="12">
                <div className="d-flex align-items-center justify-content-between mb-0">
                  <h5 className="mb-0">
                    <Briefcase className="mr-50" size={16} />
                    <span className="align-middle">Adresse de sa société</span>
                  </h5>
                  <CustomInput
                    type="switch"
                    id="societySwitch"
                    name="societySwitch"
                    inline
                    checked={this.state.showSociety}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Activation
                        this.setState({ showSociety: true });
                        this.markDirty();
                      } else {
                        // Désactivation -> Demande de confirmation
                        this.setState({ modalSocietyDelete: true });
                      }
                    }}
                  >
                    <span className="switch-label">Ajouter une société</span>
                  </CustomInput>
                </div>

                {this.state.showSociety && (
                  <>
                    <FormGroup>
                      <Label for="society_name">Nom de la Société</Label>
                      <Input
                        type="text"
                        id="society_name"
                        placeholder="Nom Société"
                        defaultValue={this.ifExist("society_name")}
                        onChange={(e) => {
                          this.setState({ society_name: e.target.value });
                          this.markDirty();
                        }}
                      />
                    </FormGroup>
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center">
                        <Label for="society_address1">Rue / Numéro</Label>
                        {!this.state.showSocietyAddress2 && (
                          <div
                            className="cursor-pointer text-primary d-flex align-items-center"
                            onClick={() =>
                              this.setState({ showSocietyAddress2: true })
                            }
                          >
                            <Plus size={14} className="mr-50" />
                            <span style={{ fontSize: "0.85rem" }}>
                              Ajouter un complément
                            </span>
                          </div>
                        )}
                      </div>
                      <Input
                        type="text"
                        id="society_address1"
                        placeholder="Rue / Numéro"
                        defaultValue={this.ifExist("society_address")}
                        onChange={(e) => {
                          this.setState({ society_address: e.target.value });
                          this.markDirty();
                        }}
                      />
                    </FormGroup>
                    {this.state.showSocietyAddress2 && (
                      <FormGroup>
                        <div className="d-flex justify-content-between align-items-center">
                          <Label for="society_address2">Adresse 2</Label>
                          <div
                            className="cursor-pointer text-danger d-flex align-items-center"
                            onClick={() => {
                              this.setState({
                                showSocietyAddress2: false,
                                society_address_2: "",
                              });
                              this.markDirty();
                            }}
                          >
                            <Minus size={14} className="mr-50" />
                            <span style={{ fontSize: "0.85rem" }}>Retirer</span>
                          </div>
                        </div>
                        <Input
                          type="text"
                          id="society_address2"
                          placeholder="Adresse société 2"
                          value={this.state.society_address_2 || ""}
                          onChange={(e) => {
                            this.setState({
                              society_address_2: e.target.value,
                            });
                            this.markDirty();
                          }}
                        />
                      </FormGroup>
                    )}
                    <FormGroup>
                      <Label for="society_pincode">Code postal société</Label>
                      <Input
                        type="number"
                        id="society_pincode"
                        placeholder="Code postal société"
                        defaultValue={this.ifExist("society_zip_code")}
                        onChange={(e) => {
                          this.setState({ society_zip_code: e.target.value });
                          this.markDirty();
                        }}
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label for="society_city">Ville</Label>
                      <Input
                        type="text"
                        defaultValue={this.ifExist("society_city")}
                        onChange={(e) => {
                          this.setState({ society_city: e.target.value });
                          this.markDirty();
                        }}
                        id="society_city"
                        placeholder="Ville société"
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label for="society_country">Pays</Label>
                      <Input
                        type="text"
                        defaultValue={this.ifExist("society_country")}
                        onChange={(e) => {
                          this.setState({ society_country: e.target.value });
                          this.markDirty();
                        }}
                        id="society_country"
                        placeholder="Pays de la société"
                      />
                    </FormGroup>
                  </>
                )}
              </Col>
            </Row>

            <Row>
              {/* Consultant */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="member">Consultant</Label>
                  <Select
                    inputId="member"
                    placeholder="Choisir..."
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "Aucun résultat"}
                    value={
                      this.props.members
                        ? (this.props.members
                            .filter(
                              (m) =>
                                m.role?.toLowerCase() === "consultant" ||
                                m.role?.toLowerCase() === "expert" ||
                                m.role?.toLowerCase() === "admin",
                            )
                            .map((m) => ({
                              value: m.id,
                              label: (m.first_name || m.last_name) ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() : (m.name ?? ""),
                            }))
                            .find(
                              (opt) =>
                                String(opt.value) ===
                                String(this.state.parent_id),
                            ) || null)
                        : null
                    }
                    options={
                      this.props.members
                        ? this.props.members
                            .filter(
                              (m) =>
                                m.role?.toLowerCase() === "consultant" ||
                                m.role?.toLowerCase() === "expert" ||
                                m.role?.toLowerCase() === "admin",
                            )
                            .map((m) => ({
                              value: m.id,
                              label: (m.first_name || m.last_name) ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() : (m.name ?? ""),
                            }))
                        : []
                    }
                    onChange={(opt) => {
                      this.setState({ parent_id: opt ? opt.value : null });
                      this.markDirty();
                    }}
                  />
                </FormGroup>
              </Col>
              {/* Rôle de l'utilisateur */}
              <Col md="6" sm="12">
                <FormGroup>
                  <Label for="role">Rôle de l'utilisateur</Label>
                  {this.ifDataExist("role") != null ? (
                    <CustomInput
                      type="select"
                      name="select"
                      id="role"
                      defaultValue={this.ifDataExist("role")}
                      onChange={(e) => {
                        this.setState({ role: e.target.value });
                        this.markDirty();
                      }}
                    >
                      <option>Client</option>
                      <option>Consultant</option>
                      <option>Expert</option>
                      <option>admin</option>
                    </CustomInput>
                  ) : (
                    <CustomInput
                      type="select"
                      name="select"
                      id="role"
                      defaultValue="Client"
                      onChange={(e) => {
                        this.setState({ role: e.target.value });
                        this.markDirty();
                      }}
                    >
                      <option>Client</option>
                      <option>Consultant</option>
                      <option>Expert</option>
                      <option>admin</option>
                    </CustomInput>
                  )}
                </FormGroup>
              </Col>
            </Row>

            {/* Bouton (bas de page) */}
            <Row className="mt-2">
              <Col className="d-flex justify-content-center flex-wrap" sm="12">
                <Button.Ripple className="mr-1" color="success" type="submit">
                  Enregistrer une modification
                </Button.Ripple>
              </Col>
            </Row>
          </Form>

          {/* MODAL DE CONFIRMATION DE SUPPRESSION SOCIÉTÉ */}
          <Modal
            isOpen={this.state.modalSocietyDelete}
            toggle={this.toggleSocietyModal}
            className="modal-dialog-centered"
          >
            <ModalHeader
              toggle={this.toggleSocietyModal}
              className="bg-danger text-white"
            >
              Confirmation de suppression
            </ModalHeader>
            <ModalBody className="text-center p-3">
              <AlertTriangle size={50} className="text-danger mb-2" />
              <h4>Êtes-vous sûr ?</h4>
              <p>
                En décochant cette option,{" "}
                <strong>
                  toutes les données relatives à la société seront effacées
                </strong>{" "}
                définitivement lors de la sauvegarde.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggleSocietyModal}>
                Annuler
              </Button>
              <Button color="danger" onClick={this.confirmDeleteSociety}>
                Oui, supprimer les données
              </Button>
            </ModalFooter>
          </Modal>
        </Col>
      </Row>
    );
  }
}
export default UserAccountTab;
/* eslint-disable */
