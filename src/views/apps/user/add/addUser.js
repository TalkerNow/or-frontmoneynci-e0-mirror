import React from "react";
import {
  FormGroup,
  Input,
  CustomInput,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardHeader,
  Button,
  Label,
} from "reactstrap";
import ReactCountryFlag from "react-country-flag";
import { history } from "../../../../history";
import axios from "axios";
import { toast } from "react-toastify";
import SweetAlert from "react-bootstrap-sweetalert";

import "flatpickr/dist/themes/light.css";
import "../../../../assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import InputMaskDate from "../edit/InputMaskDate";
import {
  Home,
  User,
  ArrowLeft,
  Plus,
  Minus,
  Heart,
  Briefcase,
} from "react-feather";
import Radio from "../../../../components/@vuexy/radio/RadioVuexy";
import { countryCodes } from "../../../../configs/countryCodes";
import moment from "moment";
import { waiterHide, waiterShow } from "../../../../helpers/waiter";

toast.configure();
var generator = require("generate-password");

class AddUser extends React.Component {
  state = {
    Alert: false,
    data: {
      id: null,
      name: null,
      last_name: null,
      maiden_name: null,
      first_name: null,
      society_related: "Moneynci",
      email: null,
      role: "Client",
      password: generator.generate({ length: 10, numbers: true }),
      civility: "",
      martial_status: "Célibataire",
      children_number: null,
      mobile_number: null,
      office_number: null,
      military_service: "Service militaire",
      birth_date: null,
      birth_place: null,
      personal_address: null,
      personal_address_2: null,
      personal_zip_code: null,
      personal_city: null,
      personal_city_options: [],
      personal_country: null,
      society_name: null,
      society_address: null,
      society_address_2: null,
      society_zip_code: null,
      society_city: null,
      society_country: null,

      // ✅ Nouveaux champs
      secu_social: null,
      secu_social_key: null,
      parent_id: null,
      business_introducer_id: null,
    },
    members: [],
    copyCompanyAddr: false,
    showAddress2: false,
    showSociety: false,
    showSocietyAddress2: false,
    isConsultant: false,
  };
  async componentDidMount() {
    const roleStr = (localStorage.getItem("role") || "").toLowerCase();
    const isConsultant = roleStr.includes("consultant");
    this.setState({ isConsultant });

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    await axios
      .get(global.config.server_url + "/users?kind=member", Config)
      .then((response) => {
        let rowData = response.data;
        let userid = localStorage.getItem("userid");
        let tmp = null;
        for (var i = 0; i < rowData.length; i++) {
          if (rowData[i]["id"] === parseInt(userid)) {
            tmp = rowData[i];
            rowData.splice(i, 1);
          }
        }
        rowData.unshift(tmp);
        this.setState({ members: rowData });

        if (rowData.length > 0 && rowData[0]) {
          const field = isConsultant ? "parent_id" : "business_introducer_id";
          this.setState({
            data: {
              ...this.state.data,
              [field]: rowData[0].id,
              [isConsultant ? "business_introducer_id" : "parent_id"]: null,
            },
          });
        }
      });

    // Handle pre-filled data from location state (e.g. from conversion)
    if (this.props.location && this.props.location.state) {
      this.setState((prev) => ({
        data: {
          ...prev.data,
          ...this.props.location.state,
        },
      }));
    }
  }
  zipTimeout = null;
  // ===== Helpers téléphone (FR + International) =====
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

  handleDataChange = (field) => (e) => {
    const value = e && e.target ? e.target.value : e; // safe
    this.setState((prev) => ({ data: { ...prev.data, [field]: value } }));
  };
  fetchCitiesByZip = async (zip, which /* 'personal' | 'society' */) => {
    const key = `${which}_city_options`;
    if (!zip || zip.trim() === "") {
      this.setState((prev) => ({
        data: { ...prev.data, [key]: [] },
      }));
      return;
    }
    try {
      const { data } = await axios.get(
        `https://geo.api.gouv.fr/communes?codePostal=${zip}&fields=nom&format=json`,
      );
      const options = (data || []).map((c) => c.nom);

      this.setState((prev) => ({
        data: { ...prev.data, [key]: options },
      }));

      if (options.length === 1) {
        this.setState((prev) => ({
          data: { ...prev.data, [`${which}_city`]: options[0] },
        }));
      }
    } catch (e) {
      console.error(e);
      this.setState((prev) => ({
        data: { ...prev.data, [key]: [] },
      }));
    }
  };

  handleZipChange = (zip, which) => {
    this.setState((prev) => ({
      data: { ...prev.data, [`${which}_zip_code`]: zip },
    }));
    if (this.zipTimeout) clearTimeout(this.zipTimeout);
    this.zipTimeout = setTimeout(() => this.fetchCitiesByZip(zip, which), 300);
  };
  handleCopyCompanyToggle = (checked) => {
    this.setState((prev) => {
      const d = { ...prev.data };
      if (checked) {
        d.society_address = d.personal_address || "";
        d.society_address_2 = d.personal_address_2 || "";
        d.society_zip_code = d.personal_zip_code || "";
        d.society_city = d.personal_city || "";
        d.society_country = d.personal_country || "";
      }
      return { copyCompanyAddr: checked, data: d };
    });
  };
  handleAlert = (value) => {
    this.setState({ Alert: value });
  };
  normalizeNullable = (value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  };
  sendForm = (data, type) => {
    if (data.civility === "") {
      toast.error("Civilité est obligatoire.");
      return;
    }
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    const emailForRegistration =
      data.email || `client_${Date.now()}@placeholder.local`;

    const locationState = this.props.location?.state;

    waiterShow();
    const firstName = this.normalizeNullable(data.first_name);
    const lastName = this.normalizeNullable(data.last_name);
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    axios
      .post(global.config.server_url + "/register", {
        email: emailForRegistration,
        password: data.password,
        name: fullName,
        role: data.role,
        parent_id: data.parent_id,
        business_introducer_id: data.business_introducer_id,
      })
      .then(function (result) {
        if (result.data.accessToken) {
          axios
            .post(global.config.server_url + "/personal_information", {
              id: result.data.user.id,
              user_id: 10,
              last_name: lastName,
              maiden_name: data.maiden_name,
              first_name: firstName,
              society_related: data.society_related,
              civility: data.civility,
              martial_status: data.martial_status,
              children_number: data.children_number,
              mobile_number: data.mobile_number,
              office_number: data.office_number,
              military_service: data.military_service,
              birth_date: data.birth_date,
              birth_place: data.birth_place,
              personal_address: data.personal_address,
              personal_address_2: data.personal_address_2,
              personal_zip_code: data.personal_zip_code,
              personal_city: data.personal_city,
              personal_country: data.personal_country,
              society_name: data.society_name,
              society_address: data.society_address,
              society_address_2: data.society_address_2,
              society_zip_code: data.society_zip_code,
              society_city: data.society_city,
              society_country: data.society_country,

              // ✅ Envoi au back
              secu_social: data.secu_social,
              secu_social_key: data.secu_social_key,

              notes: data.notes,
              parent_id: data.parent_id,
              business_introducer_id: data.business_introducer_id,
            })
            .then((response) => {
              waiterHide();

              // Handle conversation hiding after successful client creation (from Convert workflow)
              const originId = locationState?.originConversationId;
              if (originId) {
                const hiddenIds = JSON.parse(
                  localStorage.getItem("MOCK_HIDDEN_CONV_IDS") || "[]",
                );
                if (!hiddenIds.includes(originId)) {
                  hiddenIds.push(originId);
                  localStorage.setItem(
                    "MOCK_HIDDEN_CONV_IDS",
                    JSON.stringify(hiddenIds),
                  );
                }
                toast.success("Client créé avec succès !");
                history.push("/kpi/inbox");
                return;
              }

              if (type === 1) {
                history.push("/pages/create-contract/" + response.data.user_id);
              } else if (type === 0) {
                let href_string = window.location.href;
                if (href_string.includes("member")) {
                  history.push(
                    "/app/member/edit/" + response.data.user_id + "/2",
                  );
                } else {
                  history.push(
                    "/app/user/edit/" + response.data.user_id + "/2",
                  );
                }
              }
            })
            .catch((error) => {
              waiterHide();
              axios
                .delete(
                  global.config.server_url + "/users/" + result.data.user.id,
                  Config,
                )
                .then((response) => {
                  toast.error("API injoignable.");
                });
            });
        } else {
          waiterHide();
          axios
            .delete(
              global.config.server_url + "/users/" + result.data.user.id,
              Config,
            )
            .then((response) => {
              toast.error("Création annulé: l'utilisateur existe déjà.");
            });
        }
      })
      .catch(function (error) {
        waiterHide();
        toast.error("API injoignable" + data.name);
      });
  };
  handledob = (date) => {
    var lstDate = date.split("/");
    if (lstDate.length === 3) {
      var MyDateString = lstDate[2] + "-" + lstDate[1] + "-" + lstDate[0];
      this.setState({
        dob: MyDateString,
      });
    }
    this.setState({ data: { ...this.state.data, birth_date: MyDateString } });
  };
  handleSubmit = (type) => {
    // Si une date de naissance est saisie, on la valide. Sinon on continue sans erreur.
    if (this.state.data.birth_date) {
      const birthday_valid = moment(
        this.state.data.birth_date,
        "YYYY-MM-DD",
        true,
      ).isValid();
      if (!birthday_valid) {
        toast.error("Le format de la date de naissance est invalide");
        return;
      }
    }

    // if (this.state.data.email === null || this.state.data.email === "") {
    //   toast.error("You should input email");
    //   return;
    // }

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    axios
      .get(
        global.config.server_url +
          "/duplicated_email?email=" +
          this.state.data.email,
        Config,
      )
      .then((response) => {
        if (response.data === "duplicated") {
          toast.error("The email is duplicated!");
        } else this.sendForm(this.state.data, type);
      });
  };
  ifExist(name) {
    if (this.props.data) {
      return this.props.data[name];
    } else return "";
  }
  render() {
    return (
      <Card>
        <CardHeader className="pb-0">
          <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between w-100 mb-2">
            <Button.Ripple
              color="primary"
              aria-label="Retour"
              title="Retour"
              className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{ width: 32, height: 32 }}
              onClick={() => history.goBack()}
            >
              <ArrowLeft size={16} />
            </Button.Ripple>
            <Button.Ripple
              color="success"
              onClick={() => this.handleSubmit(0)}
              className="mt-1 mt-sm-0 w-100 w-sm-auto"
            >
              Enregistrer
            </Button.Ripple>
          </div>
          <CardTitle className="mb-0">Création client</CardTitle>
        </CardHeader>
        <SweetAlert
          success
          title="Utilisateur enregistré"
          show={this.state.Alert}
          onConfirm={() => this.handleAlert(false)}
        >
          <p className="sweet-alert-text">
            Merci de copier son mot de passe : <b>{this.state.data.password}</b>
          </p>
        </SweetAlert>
        <CardBody>
          <h5
            style={{
              fontWeight: 600,
              fontSize: 16,
              marginBottom: 8,
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 6,
            }}
          >
            Informations personnelles
          </h5>
          {/* Civilité */}
          <Row>
            <Col md="12" sm="12">
              <h5 className="mb-1">
                <User className="mr-50" size={16} />
                <span className="align-middle">Civilité</span>
              </h5>
              <FormGroup style={{ marginBottom: "15px" }}>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Monsieur"
                    color="primary"
                    name="civility"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, civility: "Monsieur" },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Madame"
                    color="primary"
                    name="civility"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, civility: "Madame" },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Mlle"
                    color="primary"
                    name="civility"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, civility: "Mlle" },
                      })
                    }
                  />
                </div>
              </FormGroup>
            </Col>
          </Row>

          {/* Identité + Contact à gauche / Notes à droite */}
          <Row>
            <Col md="6" sm="12">
              <Row>
                <Col md="12" sm="12">
                  <FormGroup>
                    <Label for="firstname">Prénom</Label>
                    <Input
                      type="text"
                      placeholder="Prénom"
                      value={this.state.data.first_name || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            first_name: e.target.value,
                          },
                        })
                      }
                      id="firstname"
                    />
                  </FormGroup>
                </Col>
                <Col md="12" sm="12">
                  <FormGroup>
                    <Label for="lastname">Nom</Label>
                    <Input
                      type="text"
                      placeholder="Nom"
                      value={this.state.data.last_name || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            last_name: e.target.value,
                          },
                        })
                      }
                      id="lastname"
                    />
                  </FormGroup>
                </Col>
                <Col md="12" sm="12">
                  <FormGroup>
                    <Label for="email">Email</Label>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={this.state.data.email || ""}
                      onChange={(e) =>
                        this.setState({
                          data: { ...this.state.data, email: e.target.value },
                        })
                      }
                      id="email"
                    />
                  </FormGroup>
                </Col>
                <Col md="12" sm="12">
                  <FormGroup>
                    <Label for="phone">Numéro de téléphone</Label>
                    <InputGroup>
                      {(() => {
                        const val = this.state.data.mobile_number;
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
                        placeholder="Téléphone"
                        id="phone"
                        value={this.formatPhonePretty(
                          this.state.data.mobile_number || "",
                        )}
                        onChange={(e) => {
                          const val = this.normalizePhone(e.target.value);
                          this.setState({
                            data: { ...this.state.data, mobile_number: val },
                          });
                        }}
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
                  onChange={(e) =>
                    this.setState({
                      data: { ...this.state.data, notes: e.target.value },
                    })
                  }
                  id="notes"
                />
              </FormGroup>
            </Col>
          </Row>

          <h5
            style={{
              fontWeight: 600,
              fontSize: 16,
              marginTop: 8,
              marginBottom: 8,
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 6,
            }}
          >
            Informations administratives
          </h5>
          {/* Date et lieu de naissance */}
          <Row>
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="dateofbirth">Date de naissance</Label>
                <InputMaskDate
                  onChange={(e) => this.handledob(e.target.value)}
                  id="dateofbirth"
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="placeofbirth">Lieu de naissance</Label>
                <Input
                  type="text"
                  placeholder="Ville"
                  onChange={(e) =>
                    this.setState({
                      data: { ...this.state.data, birth_place: e.target.value },
                    })
                  }
                  id="placeofbirth"
                />
              </FormGroup>
            </Col>
          </Row>

          {/* Sécurité Sociale */}
          <Row>
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="secu_social">Sécurité Sociale</Label>
                <Input
                  type="text"
                  placeholder="N°"
                  onChange={(e) =>
                    this.setState({
                      data: { ...this.state.data, secu_social: e.target.value },
                    })
                  }
                  id="secu_social"
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="secu_social_key">Clé de Sécurité Sociale</Label>
                <Input
                  type="text"
                  placeholder="XX"
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        secu_social_key: e.target.value,
                      },
                    })
                  }
                  id="secu_social_key"
                />
              </FormGroup>
            </Col>
          </Row>

          {/* Statut marital & Service militaire */}
          <Row>
            {/* Statut marital */}
            <Col md="6" sm="12">
              <h5 className="mb-1">
                <Heart className="mr-50" size={16} />
                <span className="align-middle">Statut marital</span>
              </h5>
              <FormGroup style={{ marginBottom: "15px", marginTop: "5px" }}>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Célibataire"
                    color="primary"
                    name="martial_status"
                    onChange={() =>
                      this.setState({
                        data: {
                          ...this.state.data,
                          martial_status: "Célibataire",
                        },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Marié(e)"
                    color="info"
                    name="martial_status"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, martial_status: "Marié" },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Divorcé(e)"
                    color="danger"
                    name="martial_status"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, martial_status: "Divorcé" },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Veuf(ve)"
                    color="warning"
                    name="martial_status"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, martial_status: "Veuf" },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Pacsé(e)"
                    color="success"
                    name="martial_status"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, martial_status: "Pacsé" },
                      })
                    }
                  />
                </div>
              </FormGroup>
            </Col>

            {/* Service militaire */}
            <Col md="6" sm="12">
              <h5 className="mb-1">
                <User className="mr-50" size={16} />
                <span className="align-middle">Service militaire</span>
              </h5>
              <FormGroup>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Oui"
                    color="success"
                    name="military_service"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, military_service: "oui" },
                      })
                    }
                  />
                </div>
                <div className="d-inline-block mr-1">
                  <Radio
                    label="Non"
                    color="info"
                    name="military_service"
                    onChange={() =>
                      this.setState({
                        data: { ...this.state.data, military_service: "non" },
                      })
                    }
                  />
                </div>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            {/* Nom de jeune fille */}
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="maiden_name">Nom de jeune fille</Label>
                <Input
                  type="text"
                  placeholder="Nom de jeune fille"
                  value={this.state.data.maiden_name || ""}
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        maiden_name: e.target.value,
                      },
                    })
                  }
                  id="maiden_name"
                />
              </FormGroup>
            </Col>

            {/* Responsable commercial */}
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="business_introducer_id">
                  Responsable commercial
                </Label>
                <CustomInput
                  type="select"
                  name="business_introducer_id"
                  id="business_introducer_id"
                  value={this.state.data.business_introducer_id || ""}
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        business_introducer_id: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Aucun</option>
                  {this.state.members
                    .filter((m) => (m.role || "").toLowerCase() !== "prospect")
                    .map((member, index) => (
                      <option key={index} value={member.id}>
                        {member.first_name + " " + member.last_name}
                      </option>
                    ))}
                </CustomInput>
              </FormGroup>
            </Col>
          </Row>

          {/* Enfants / Société */}
          <Row>
            <Col md="6" sm="12">
              <FormGroup>
                <Label for="nb_child">Nombre D'enfants</Label>
                <Input
                  type="number"
                  placeholder="Nombre"
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        children_number: e.target.value,
                      },
                    })
                  }
                  id="nb_child"
                />
              </FormGroup>
            </Col>
            {/* <Col md="6" sm="12">
              <FormGroup>
                <Label for="officename">Nom de la Société</Label>
                <Input
                  type="text"
                  placeholder="Nom Société"
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        society_name: e.target.value,
                      },
                    })
                  }
                  id="officename"
                />
              </FormGroup>
            </Col> */}
          </Row>

          {/* Adresse du client & Société */}
          <Row>
            <Col md="6" sm="12">
              <div className="d-flex align-items-center mb-1">
                <h5 className="mb-0">
                  <Home className="mr-50" size={16} />
                  <span className="align-middle">Adresse du client</span>
                </h5>
              </div>
              <FormGroup>
                <div className="d-flex justify-content-between align-items-center">
                  <Label for="adress1">Rue / Numéro</Label>
                  {!this.state.showAddress2 && (
                    <div
                      className="cursor-pointer text-primary d-flex align-items-center"
                      onClick={() => this.setState({ showAddress2: true })}
                      style={{ cursor: "pointer" }}
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
                  placeholder="Rue / Numéro"
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        personal_address: e.target.value,
                      },
                    })
                  }
                  id="adress1"
                />
              </FormGroup>
              {this.state.showAddress2 && (
                <FormGroup>
                  <div className="d-flex justify-content-between align-items-center">
                    <Label for="adress2">Adresse n°2</Label>
                    <div
                      className="cursor-pointer text-danger d-flex align-items-center"
                      onClick={() =>
                        this.setState({
                          showAddress2: false,
                          data: { ...this.state.data, personal_address_2: "" },
                        })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <Minus size={14} className="mr-50" />
                      <span style={{ fontSize: "0.85rem" }}>Retirer</span>
                    </div>
                  </div>
                  <Input
                    type="text"
                    placeholder="Adresse n°2"
                    value={this.state.data.personal_address_2 || ""}
                    onChange={(e) =>
                      this.setState({
                        data: {
                          ...this.state.data,
                          personal_address_2: e.target.value,
                        },
                      })
                    }
                    id="adress2"
                  />
                </FormGroup>
              )}
              <FormGroup>
                <Label for="postalcode">Code postal</Label>
                <Input
                  type="text"
                  id="postalcode"
                  placeholder="Code postal"
                  value={this.state.data.personal_zip_code || ""}
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
                  value={this.state.data.personal_city || ""}
                  onChange={this.handleDataChange("personal_city")}
                />
                <datalist id="personalCityList">
                  {(this.state.data.personal_city_options || []).map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </FormGroup>

              <FormGroup>
                <Label for="country">Pays</Label>
                <Input
                  type="text"
                  placeholder="Pays"
                  onChange={(e) =>
                    this.setState({
                      data: {
                        ...this.state.data,
                        personal_country: e.target.value,
                      },
                    })
                  }
                  id="country"
                />
              </FormGroup>
            </Col>

            {/* Adresse société */}
            <Col md="6" sm="12">
              <div className="d-flex align-items-center justify-content-between mb-1">
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
                  onChange={(e) =>
                    this.setState({ showSociety: e.target.checked })
                  }
                >
                  <span className="switch-label">Ajouter une société</span>
                </CustomInput>
              </div>

              {this.state.showSociety && (
                <>
                  <FormGroup>
                    <Label for="officename">Nom de la Société</Label>
                    <Input
                      type="text"
                      placeholder="Nom Société"
                      value={this.state.data.society_name || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            society_name: e.target.value,
                          },
                        })
                      }
                      id="officename"
                    />
                  </FormGroup>
                  <FormGroup>
                    <div className="d-flex justify-content-between align-items-center">
                      <Label for="officeadress1">Rue / Numéro</Label>
                      {!this.state.showSocietyAddress2 && (
                        <div
                          className="cursor-pointer text-primary d-flex align-items-center"
                          onClick={() =>
                            this.setState({ showSocietyAddress2: true })
                          }
                          style={{ cursor: "pointer" }}
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
                      placeholder="Rue / Numéro"
                      value={this.state.data.society_address || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            society_address: e.target.value,
                          },
                        })
                      }
                      id="officeadress1"
                    />
                  </FormGroup>
                  {this.state.showSocietyAddress2 && (
                    <FormGroup>
                      <div className="d-flex justify-content-between align-items-center">
                        <Label for="officeadress2">Adresse 2</Label>
                        <div
                          className="cursor-pointer text-danger d-flex align-items-center"
                          onClick={() =>
                            this.setState({
                              showSocietyAddress2: false,
                              data: {
                                ...this.state.data,
                                society_address_2: "",
                              },
                            })
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <Minus size={14} className="mr-50" />
                          <span style={{ fontSize: "0.85rem" }}>Retirer</span>
                        </div>
                      </div>
                      <Input
                        type="text"
                        placeholder="Adresse société 2"
                        value={this.state.data.society_address_2 || ""}
                        onChange={(e) =>
                          this.setState({
                            data: {
                              ...this.state.data,
                              society_address_2: e.target.value,
                            },
                          })
                        }
                        id="officeadress2"
                      />
                    </FormGroup>
                  )}
                  <FormGroup>
                    <Label for="officepostcode">Code postal société</Label>
                    <Input
                      type="number"
                      placeholder="Code postal société"
                      value={this.state.data.society_zip_code || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            society_zip_code: e.target.value,
                          },
                        })
                      }
                      id="officepostcode"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label for="officecity">Ville société</Label>
                    <Input
                      type="text"
                      placeholder="Ville société"
                      value={this.state.data.society_city || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            society_city: e.target.value,
                          },
                        })
                      }
                      id="officecity"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label for="officecountry">Pays société</Label>
                    <Input
                      type="text"
                      placeholder="Pays de la société"
                      value={this.state.data.society_country || ""}
                      onChange={(e) =>
                        this.setState({
                          data: {
                            ...this.state.data,
                            society_country: e.target.value,
                          },
                        })
                      }
                      id="officecountry"
                    />
                  </FormGroup>
                </>
              )}
            </Col>
          </Row>

          {/* Mot de passe + Expert + Rôle */}
          <Row>
            {/* Mot de passe */}
            <Col md="4" sm="12">
              <FormGroup>
                <Label for="password">Mot de passe</Label>
                <Input
                  type="text"
                  name="password"
                  id="password"
                  value={this.state.data.password || ""}
                  placeholder="Mot de passe"
                  onChange={(e) =>
                    this.setState({
                      data: { ...this.state.data, password: e.target.value },
                    })
                  }
                />
              </FormGroup>
            </Col>
            {/* Consultant (Optionnel) */}
            <Col md="4" sm="12">
              <FormGroup>
                <Label for="parent_id">Consultant</Label>
                <CustomInput
                  type="select"
                  name="parent_id"
                  id="parent_id"
                  value={this.state.data.parent_id || ""}
                  onChange={(e) =>
                    this.setState({
                      data: { ...this.state.data, parent_id: e.target.value },
                    })
                  }
                >
                  <option value="">Aucun</option>
                  {this.state.members
                    .filter(
                      (m) =>
                        m.role?.toLowerCase() === "consultant" ||
                        m.role?.toLowerCase() === "admin",
                    )
                    .map((member, index) => (
                      <option key={index} value={member.id}>
                        {member.first_name + " " + member.last_name}
                      </option>
                    ))}
                </CustomInput>
              </FormGroup>
            </Col>

            {/* Rôle de l'utilisateur */}
            <Col md="4" sm="12">
              <FormGroup>
                <Label for="role">Rôle de l'utilisateur</Label>
                <CustomInput
                  type="select"
                  name="role"
                  id="role"
                  value={this.state.data.role}
                  onChange={(e) =>
                    this.setState({
                      data: { ...this.state.data, role: e.target.value },
                    })
                  }
                >
                  <option>Client</option>
                  <option>Consultant</option>
                  <option>Expert</option>
                  <option>admin</option>
                </CustomInput>
              </FormGroup>
            </Col>
          </Row>

          {/* Boutons */}
          <Row className="mt-2">
            <Col
              xs="12"
              className="d-flex flex-column flex-md-row justify-content-center"
            >
              <Button.Ripple
                color="success"
                className="mb-1 mb-md-0 mr-md-1 w-100 w-md-auto"
                onClick={() => this.handleSubmit(0)}
              >
                Enregistrer
              </Button.Ripple>
              <Button.Ripple
                color="primary"
                className="w-100 w-md-auto"
                onClick={() => this.handleSubmit(1)}
              >
                <Plus size={16} />
                Prestations
              </Button.Ripple>
            </Col>
          </Row>
        </CardBody>
      </Card>
    );
  }
}

export default AddUser;
/* eslint-disable */
