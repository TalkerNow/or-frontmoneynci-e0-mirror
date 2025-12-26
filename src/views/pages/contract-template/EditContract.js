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
  CardHeader,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import Chip from "../../../../src/components/@vuexy/chips/ChipComponent";
import LabeledCheckboxMaterialUi from "labeled-checkbox-material-ui";
import logo from "../../../assets/img/logo/contract_logo.jpg";
import {
  Download,
  ArrowLeft,
  Save,
  Aperture,
  Edit,
  Trash,
  Check,
  Plus,
} from "react-feather";
import "../../../assets/scss/pages/contract.scss";
import axios from "axios";
import { toast } from "react-toastify";
import { history } from "../../../history";
import Radio from "../../../components/@vuexy/radio/RadioVuexy";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  credit_impot_50: false,
};
const CREDIT_IMPOT_NOTE =
  "Prestation éligible à l'avance immédiate de crédit d'impôt soit 50 % pris en charge immédiatement par l'URSSAF après enregistrement du client.";

const stripe = (i) => ({
  backgroundColor: "#fff",
  border: "1px solid #ebe9f1",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "8px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
  transition: "all 0.2s ease",
});

const GRID = {
  display: "grid",
  gridTemplateColumns:
    "30px minmax(180px, 1.5fr) 60px 90px 70px 90px 110px 40px 10px 30px minmax(150px, auto) 24px 70px",
  alignItems: "center",
  columnGap: 10,
  fontSize: "0.9rem",
};

const inputStyle = {
  height: 34,
  borderRadius: 6,
  border: "1px solid #d8d6de",
  padding: "0 10px",
  fontSize: "0.9rem",
  textAlign: "right",
  width: "100%",
  backgroundColor: "#fff",
};

const Ghost = ({ children = "" }) => (
  <span style={{ visibility: "hidden" }}>{children}</span>
);

const VSep = () => (
  <div
    aria-hidden="true"
    style={{
      width: 1,
      height: 24,
      background: "#ebe9f1",
      justifySelf: "center",
    }}
  />
);

const RowMinutes = ({ i, formValues, onPrimaryToggle, handleFieldChange }) => (
  <div style={{ ...stripe(i), ...GRID }}>
    <LabeledCheckboxMaterialUi
      label=""
      checked={formValues["c1"]}
      onChange={(checked) => onPrimaryToggle(checked, "c1", "r1")}
    />
    <span style={{ fontWeight: 500, color: "#5e5873" }}>
      {formValues["title1"]}
    </span>

    <span className="text-muted" style={{ fontSize: "0.85rem" }}>
      Nb (min)
    </span>
    <Input
      type="text"
      value={formValues["nb1"]}
      onChange={(e) => handleFieldChange("nb1", e.target.value)}
      style={{ ...inputStyle, width: "100%" }}
    />

    <span className="text-muted" style={{ fontSize: "0.85rem" }}>
      PU (€/h)
    </span>
    <Input
      type="text"
      value={formValues["nb1-price"]}
      onChange={(e) => handleFieldChange("nb1-price", e.target.value)}
      style={{ ...inputStyle, width: "100%" }}
    />

    <Ghost>
      <Input style={{ ...inputStyle }} />
    </Ghost>
    <Ghost>€ HT</Ghost>

    <VSep />

    <Ghost>
      <LabeledCheckboxMaterialUi label="" checked={false} />
    </Ghost>
    <Ghost>Option</Ghost>
    <Ghost>Nb</Ghost>
    <Ghost>
      <Input style={{ ...inputStyle, width: 70 }} />
    </Ghost>
  </div>
);

const RowFixed = ({ i, n, formValues, onPrimaryToggle, handleFieldChange }) => (
  <div style={{ ...stripe(i), ...GRID }}>
    <LabeledCheckboxMaterialUi
      label=""
      checked={formValues[`c${n}`]}
      onChange={(checked) => onPrimaryToggle(checked, `c${n}`, `r${n}`)}
    />
    <span style={{ fontWeight: 500, color: "#5e5873" }}>
      {formValues[`title${n}`]}
    </span>

    <Ghost>Nb (min)</Ghost>
    <Ghost>
      <Input style={{ ...inputStyle }} />
    </Ghost>
    <Ghost>PU (€/h)</Ghost>
    <Ghost>
      <Input style={{ ...inputStyle }} />
    </Ghost>

    <Input
      type="text"
      value={formValues[`p${n}`]}
      onChange={(e) => handleFieldChange(`p${n}`, e.target.value)}
      style={{
        ...inputStyle,
        fontWeight: 600,
        color: "#5e5873",
      }}
    />
    <span style={{ fontSize: "0.85rem", color: "#b9b9c3" }}>€ HT</span>

    <VSep />

    <Ghost>
      <LabeledCheckboxMaterialUi label="" checked={false} />
    </Ghost>
    <Ghost>Option</Ghost>
    <Ghost>Nb</Ghost>
    <Ghost>
      <Input style={{ ...inputStyle, width: 70 }} />
    </Ghost>
  </div>
);

const RowWithOption = ({
  i,
  n,
  optionCheckKey,
  optionLabel,
  optionNbKey,
  formValues,
  onPrimaryToggle,
  handleFieldChange,
  handleCheckChange,
}) => {
  const isPensionLine = n === 5; // ligne "liquidation des pensions"
  return (
    <div style={{ ...stripe(i), ...GRID }}>
      {/* Checkbox principale + titre */}
      <LabeledCheckboxMaterialUi
        label=""
        checked={formValues[`c${n}`]}
        onChange={(checked) => onPrimaryToggle(checked, `c${n}`, `r${n}`)}
      />
      <span style={{ fontWeight: 500, color: "#5e5873" }}>
        {formValues[`title${n}`]}
      </span>

      {/* colonnes minutes / PU fantômes */}
      <Ghost>Nb (min)</Ghost>
      <Ghost>
        <Input style={{ ...inputStyle }} />
      </Ghost>
      <Ghost>PU (€/h)</Ghost>
      <Ghost>
        <Input style={{ ...inputStyle }} />
      </Ghost>

      {/* prix forfait */}
      <Input
        type="text"
        value={formValues[`p${n}`]}
        onChange={(e) => handleFieldChange(`p${n}`, e.target.value)}
        style={{
          ...inputStyle,
          fontWeight: 600,
          color: "#5e5873",
        }}
      />
      <span style={{ fontSize: "0.85rem", color: "#b9b9c3" }}>€ HT</span>

      <VSep />

      {/* Partie option */}
      {isPensionLine ? (
        // Ligne 5 : option "liquidation des pensions" + cc5 sur la même rangée
        <div style={{ gridColumn: "10 / span 4" }}>
          {/* Option "liquidation des pensions" (cnb5) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px minmax(0, auto) 24px 70px",
              columnGap: 8,
              alignItems: "center",
            }}
          >
            <LabeledCheckboxMaterialUi
              label=""
              checked={formValues[optionCheckKey]}
              onChange={(checked) => handleCheckChange(checked, optionCheckKey)}
            />
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "0.85rem",
                color: "#5e5873",
              }}
              title={optionLabel}
            >
              {optionLabel}
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                color: "#b9b9c3",
              }}
            >
              Nb
            </span>
            <Input
              type="text"
              value={formValues[optionNbKey]}
              onChange={(e) => handleFieldChange(optionNbKey, e.target.value)}
              style={{ ...inputStyle, width: 70 }}
            />
          </div>

          {/* cc5 : "inclus sous réserve d'un départ en retraite..." */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 6,
              gap: 6,
            }}
          >
            <LabeledCheckboxMaterialUi
              label=""
              checked={formValues.cc5}
              onChange={(checked) => handleCheckChange(checked, "cc5")}
            />
            <span
              style={{
                whiteSpace: "normal",
                fontSize: "0.8rem",
                color: "#b9b9c3",
                fontStyle: "italic",
              }}
            >
              {formValues["subcontent5-3"]}
            </span>
          </div>
        </div>
      ) : (
        // Lignes 2 et 4 : comportement normal
        <>
          <LabeledCheckboxMaterialUi
            label=""
            checked={formValues[optionCheckKey]}
            onChange={(checked) => handleCheckChange(checked, optionCheckKey)}
          />
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "0.85rem",
              color: "#5e5873",
            }}
            title={optionLabel}
          >
            {optionLabel}
          </span>
          <span
            style={{
              fontSize: "0.85rem",
              color: "#b9b9c3",
            }}
          >
            Nb
          </span>
          <Input
            type="text"
            value={formValues[optionNbKey]}
            onChange={(e) => handleFieldChange(optionNbKey, e.target.value)}
            style={{ ...inputStyle, width: 70 }}
          />
        </>
      )}
    </div>
  );
};

const AddRowSelect = ({
  placeholder = "Ajouter une ligne",
  availableRowIds,
  addRowById,
  labelFor,
}) => {
  const avail = availableRowIds();
  if (avail.length === 0) return null;
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ margin: "12px 0" }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <Input
          type="select"
          style={{
            width: "100%",
            height: 42,
            borderRadius: 20,
            border: "2px dashed #7367f0",
            backgroundColor: "#f8f8f8",
            color: "#7367f0",
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
            appearance: "none",
            paddingLeft: "20px",
          }}
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id) addRowById(id);
          }}
        >
          <option value="" disabled hidden>
            + {placeholder}
          </option>
          {avail.map((id) => (
            <option key={id} value={id} style={{ color: "#000" }}>
              {labelFor(id)}
            </option>
          ))}
        </Input>
        <div
          style={{
            position: "absolute",
            right: 15,
            top: 10,
            pointerEvents: "none",
            color: "#7367f0",
          }}
        >
          <Plus size={18} />
        </div>
      </div>
    </div>
  );
};

class EditContract extends React.Component {
  state = {
    rowData: [],
    services: [],
    acompte_dates: [],
    sold_dates: [],
    editingAcompte: [],
    editingSold: [],
    activeTab: "1",
    // Indique si des modifications ont été faites (pour activer le bouton Enregistrer)
    isDirty: false,
    showUnsavedModal: false,
    // ← nouvelles: lignes visibles dans la carte "Contrat"
    selectedRows: [],

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
      credit_impot_50: false,
    },
    user_id: null,
    parent_id: null,
    general_condition: "",
    subscribe_services: "",
    status: null,
    status_payment: null,
    payment_method: null,
    payment_method_other: "",
    deposit_date: null,
    sold_date: null,
  };

  // ---------- utils d’affichage conditionnel ----------
  ALL_ROW_IDS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7"];

  rowPrimaryKey = (id) => {
    switch (id) {
      case "r1":
        return "c1";
      case "r2":
        return "c2";
      case "r3":
        return "c3";
      case "r4":
        return "c4";
      case "r5":
        return "c5";
      case "r6":
        return "c6";
      case "r7":
        return "c7";
      default:
        return null;
    }
  };

  labelFor = (id) => {
    const fv = this.state.formValues || {};
    switch (id) {
      case "r1":
        return fv["title1"] || "Minutes + PU (min / €/h)";
      case "r2":
        return fv["title2"] || "Forfait + Option rachat/chômage";
      case "r3":
        return fv["title3"] || "Ligne 3 (forfait)";
      case "r4":
        return fv["title4"] || "Forfait + 1ère période à l’étranger";
      case "r5":
        return fv["title5"] || "Forfait + 2ème période à l’étranger";
      case "r6":
        return fv["title6"] || "Ligne 6 (forfait)";
      case "r7":
        return fv["title7"] || "Ligne 7 (forfait)";
      default:
        return id;
    }
  };

  availableRowIds = () => {
    const selected = this.state.selectedRows || [];
    return this.ALL_ROW_IDS.filter((id) => !selected.includes(id));
  };

  computeSelectedRows = (fv) => {
    const ids = [];
    if (fv?.c1) ids.push("r1");
    if (fv?.c2) ids.push("r2");
    if (fv?.c3) ids.push("r3");
    if (fv?.c4) ids.push("r4");
    if (fv?.c5) ids.push("r5");
    if (fv?.c6) ids.push("r6");
    if (fv?.c7) ids.push("r7");
    return ids;
  };

  addRowById = (id) => {
    const key = this.rowPrimaryKey(id);
    this.setState(
      (prev) => ({
        selectedRows: prev.selectedRows.includes(id)
          ? prev.selectedRows
          : [...prev.selectedRows, id],
        formValues: key ? { ...prev.formValues, [key]: true } : prev.formValues,
        isDirty: true,
      }),
      this.calculate
    );
    if (key) input_values[key] = true;
  };

  removeRowById = (id) => {
    const key = this.rowPrimaryKey(id);
    this.setState(
      (prev) => ({
        selectedRows: prev.selectedRows.filter((r) => r !== id),
        formValues: key
          ? { ...prev.formValues, [key]: false }
          : prev.formValues,
        isDirty: true,
      }),
      this.calculate
    );
    if (key) input_values[key] = false;
  };

  // wrapper pour les cases principales des lignes (on garde ta logique handleCheckChange)
  onPrimaryToggle = (checked, key, id) => {
    this.handleCheckChange(checked, key);
    if (checked) this.addRowById(id);
    else this.removeRowById(id);
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

    this.setState({ formValues: this.state.formValues });
    this.calculate();
    if (!this.state.isDirty) this.setState({ isDirty: true });
  };

  handleCheckChange = (check, field) => {
    input_values[field] = check;
    this.state.formValues[field] = check;
    this.setState({ formValues: this.state.formValues });
    this.calculate();
    if (!this.state.isDirty) this.setState({ isDirty: true });
  };

  calculate = () => {
    var VTA = 1 + input_values["TVAP"] / 100;

    // section1
    var nbHT1 = 0;
    if (input_values["c1"])
      nbHT1 = Math.trunc(
        (this.state.formValues["nb1-price"] / 60) *
        parseInt(this.state.formValues["nb1"], 10)
      );
    this.state.formValues["nbHT1"] = nbHT1;
    this.state.formValues["TTC1"] = nbHT1 * VTA;

    // section2
    var HT2 = 0;
    if (input_values["c2"]) HT2 = input_values["p2"];
    this.state.formValues["HT2"] = HT2;
    var nbHT2 = 0;
    if (input_values["c2"] && input_values["cnb2"])
      nbHT2 = this.state.formValues["nb2-price"] * input_values["nb2"];
    this.state.formValues["nbHT2"] = nbHT2;
    this.state.formValues["TTC2"] = (parseInt(HT2) + parseInt(nbHT2)) * VTA;

    // section3
    var HT3 = 0;
    if (input_values["c3"]) HT3 = input_values["p3"];
    this.state.formValues["HT3"] = HT3;

    // section4
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

    // section5
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

    // section6
    var HT6 = 0;
    if (input_values["c6"]) HT6 = input_values["p6"];
    this.state.formValues["HT6"] = HT6;
    this.state.formValues["TTC6"] = parseInt(HT6) * VTA;

    // section7
    var HT7 = 0;
    if (input_values["c7"]) HT7 = input_values["p7"];
    this.state.formValues["HT7"] = HT7;
    this.state.formValues["TTC7"] = parseInt(HT7) * VTA;

    // total
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
        const acompteDates = Array.isArray(rowData.acompte_dates)
          ? rowData.acompte_dates
          : rowData.acompte_dates
            ? JSON.parse(rowData.acompte_dates)
            : [];

        const soldDates = Array.isArray(rowData.sold_dates)
          ? rowData.sold_dates
          : rowData.sold_dates
            ? JSON.parse(rowData.sold_dates)
            : [];
        const KNOWN_PAYMENT_METHODS = [
          "Virement bancaire",
          "Chèque de banque",
          "Carte bancaire",
          "Espèce",
          "Autre",
        ];
        let payment_method = rowData.payment_method || "";
        let payment_method_other = "";

        if (payment_method && !KNOWN_PAYMENT_METHODS.includes(payment_method)) {
          // On considère que c'est un "Autre" personnalisé
          payment_method_other = payment_method;
          payment_method = "Autre";
        }

        this.setState({
          rowData,
          user_id: rowData.id,
          parent_id: rowData.parent_id,
          deposit_date: rowData.deposit_date,
          sold_date: rowData.sold_date,
          status: rowData.document_state,
          status_payment: rowData.status_payment,
          payment_method, // <-- on garde la valeur calculée
          payment_method_other, // <-- et le champ "Autre"
          subscribe_services: rowData.subscribe_services,
          acompte_dates: acompteDates,
          sold_dates: soldDates,
        });

        if (rowData.values != null) {
          let values = JSON.parse(rowData.values);
          input_values = { ...values };
          // calcule les montants puis active les lignes concernées
          this.setState(
            {
              formValues: values,
              selectedRows: this.computeSelectedRows(values),
            },
            this.calculate
          );
        } else {
          // nouveau contrat → interface vide par défaut
          this.setState({ selectedRows: [] });
          this.calculate();
        }
      })
      .catch((e) => console.log(e));
  }
  appendCreditImpotNote = async () => {
    // Si la case n'est pas cochée, on ne fait rien
    if (!this.state.formValues.credit_impot_50) return;

    const userId = this.state.user_id; // 👈 CORRECTION ICI
    if (!userId) return;

    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    try {
      // 1) Récupérer les notes actuelles
      const res = await axios.get(
        `${global.config.server_url}/users/${userId}`,
        config
      );

      const user = res.data || {};
      let existingNotes =
        user.notes ||
        (user.personal_informations && user.personal_informations.notes) ||
        "";

      // Éviter les doublons si la phrase est déjà présente
      if (existingNotes && existingNotes.includes(CREDIT_IMPOT_NOTE)) {
        return;
      }

      // 2) Construire les nouvelles notes
      let newNotes;
      if (existingNotes && existingNotes.trim() !== "") {
        newNotes = `${existingNotes}\n\n${CREDIT_IMPOT_NOTE}`;
      } else {
        newNotes = CREDIT_IMPOT_NOTE;
      }

      // 3) PUT sur /personal_information/:id
      await axios.put(
        `${global.config.server_url}/personal_information/${userId}`,
        { notes: newNotes },
        config
      );
    } catch (e) {
      console.error("Erreur mise à jour des notes crédit d'impôt", e);
      // toast.error("Impossible de mettre à jour les notes");
    }
  };

  saveDocument = async (redirect = true) => {
    const moyenPaiementFinal =
      this.state.payment_method === "Autre"
        ? this.state.payment_method_other || "Autre"
        : this.state.payment_method;

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

    const userid = this.state.user_id;

    const parameters = {
      user_id: userid,
      parent_id: this.state.parent_id,
      comment:
        "Contrat de " +
        this.state.rowData["first_name"] +
        " " +
        this.state.rowData["last_name"],
      document_state: this.state.status,
      subscribe_services: sub_services,
      status_payment: this.state.status_payment,
      payment_method: moyenPaiementFinal,
      values: JSON.stringify(input_values),
      unipro: this.state.formValues.credit_impot_50 ? 1 : 0,
      acompte_dates: this.state.acompte_dates,
      sold_dates: this.state.sold_dates,
      advanced_payment: this.state.formValues["TOTALTTC"] || 0,
      pre_payment: parseFloat(this.state.formValues["FINAL75"]) || 0,
      end_payment: parseFloat(this.state.formValues["FINAL25"]) || 0,
      deposit_date: this.state.deposit_date,
      sold_date: this.state.sold_date,
    };

    try {
      // 🧠 1) notes client si crédit d'impôt checked
      await this.appendCreditImpotNote();

      // 📝 2) mise à jour du document
      await axios.put(
        global.config.server_url + "/documents/" + this.props.match.params.id,
        parameters,
        Config
      );

      // 📡 3) maj des services liés
      this.setSubscribeServices();

      if (redirect) {
        // 🔁 4) retour sur la fiche user
        history.push("/app/user/edit/" + userid + "/8");
      } else {
        this.setState({ isDirty: false });
        toast.success("Date enregistrée");
      }
    } catch (error) {
      console.error(error);
      toast.error("API injoignable " + error);
    }
  };

  sendForm = async () => {
    await this.saveDocument(true);
  };

  toggleEditAcompte = (idx) => {
    this.setState((prev) => {
      const list = prev.editingAcompte.includes(idx)
        ? prev.editingAcompte.filter((i) => i !== idx)
        : [...prev.editingAcompte, idx];
      return { editingAcompte: list };
    });
  };

  toggleEditSold = (idx) => {
    this.setState((prev) => {
      const list = prev.editingSold.includes(idx)
        ? prev.editingSold.filter((i) => i !== idx)
        : [...prev.editingSold, idx];
      return { editingSold: list };
    });
  };

  handleSaveDate = async (type, idx) => {
    // Save document without redirect
    await this.saveDocument(false);
    // Remove from edit mode
    if (type === "acompte") {
      this.setState((prev) => ({
        editingAcompte: prev.editingAcompte.filter((i) => i !== idx),
      }));
    } else {
      this.setState((prev) => ({
        editingSold: prev.editingSold.filter((i) => i !== idx),
      }));
    }
  };

  handleDeleteDate = async (key, idx) => {
    // Remove date from state first
    await new Promise((resolve) => {
      this.setState((prev) => {
        const arr = [...(prev[key] || [])];
        arr.splice(idx, 1);
        return { [key]: arr, isDirty: true };
      }, resolve);
    });
    // Then save
    await this.saveDocument(false);
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
      .catch(function (error) {
        toast.error("API injoignable" + error);
      });
  }

  print = async () => {
    toast.info("Génération du PDF en cours...");

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
    // var userid = this.state.user_id; // Unused in original parameters construction directly here (used in setSubscribeServices)
    parameters["user_id"] = this.state.user_id;
    parameters["parent_id"] = this.state.parent_id;
    parameters["acompte_dates"] = this.state.acompte_dates;
    parameters["sold_dates"] = this.state.sold_dates;
    parameters["subscribe_services"] = sub_services;
    parameters["comment"] =
      "Contrat de " +
      this.state.rowData["first_name"] +
      " " +
      this.state.rowData["last_name"];
    parameters["status_payment"] = this.state.status_payment;
    parameters["values"] = JSON.stringify(input_values);
    parameters["unipro"] = this.state.formValues.credit_impot_50 ? 1 : 0;
    if (this.appendCreditImpotNote) this.appendCreditImpotNote();
    parameters["advanced_payment"] = this.state.formValues["TOTALTTC"] || 0;
    parameters["pre_payment"] =
      parseFloat(this.state.formValues["FINAL75"]) || 0;
    parameters["end_payment"] =
      parseFloat(this.state.formValues["FINAL25"]) || 0;
    parameters["deposit_date"] = this.state.deposit_date;
    parameters["sold_date"] = this.state.sold_date;

    try {
      await axios.put(
        global.config.server_url + "/documents/" + this.props.match.params.id,
        parameters,
        Config
      );
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde: " + error);
    }

    // MAJ services
    this.setSubscribeServices();

    // Génération PDF via html2canvas + jsPDF
    const pages = document.getElementsByClassName("contract-page");
    if (!pages || pages.length === 0) {
      toast.error("Aucune page de contrat trouvée pour le PDF");
      return;
    }

    // Sauvegarde temporaire du style du premier élément (margin et font-size ajustés pour impression)
    const firstPage = document.getElementById("print-section");
    let originalMarginTop = "";
    let originalFontSize = "";

    if (firstPage) {
      originalMarginTop = firstPage.style.marginTop;
      originalFontSize = firstPage.style.fontSize;
      // Application des styles "print"
      firstPage.style.marginTop = "-20px";
      firstPage.style.fontSize = "18px";
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        // Capture de l'élément avec html2canvas ET le fix des inputs
        const canvas = await html2canvas(pages[i], {
          scale: 2, // Meilleure qualité
          useCORS: true,
          logging: false,
          windowWidth: 1200, // Force une largeur pour éviter les soucis de responsive

          // --- DÉBUT DU FIX MAGIQUE ---
          onclone: (clonedDoc) => {
            // On récupère tous les inputs dans la copie du document (invisible pour l'utilisateur)
            const inputs = clonedDoc.querySelectorAll(".contract-page input");

            inputs.forEach((input) => {
              // 1. On crée un élément texte (span) pour remplacer l'input
              const span = clonedDoc.createElement("span");

              // 2. On lui donne exactement la valeur visible de l'input
              span.innerText = input.value;

              // 3. On copie/force le style pour que ça ressemble à l'écran
              span.style.fontSize = "15px";
              span.style.color = "#575757";
              span.style.fontWeight = "500";
              span.style.fontFamily = "inherit";

              // 4. On nettoie tout ce qui peut gêner (bordures, fond, padding)
              span.style.background = "transparent";
              span.style.border = "none";
              span.style.padding = "0";
              span.style.margin = "0";

              // 5. On gère l'alignement
              span.style.display = "inline-block";
              span.style.textAlign = input.style.textAlign || "left";
              span.style.width = input.style.width || "auto";

              // LE PLUS IMPORTANT : L'alignement vertical pour que ce soit sur la même ligne
              span.style.verticalAlign = "baseline";

              // 6. On remplace l'input par le span dans le PDF
              if (input.parentNode) {
                input.parentNode.replaceChild(span, input);
              }
            });
          },
          // --- FIN DU FIX MAGIQUE ---
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.9); // JPEG compressé
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      // Construction du nom de fichier
      const firstName = this.state.rowData["first_name"] || "";
      const lastName = this.state.rowData["last_name"] || "";

      const selectedServices = [];
      for (let i = 1; i <= 7; i++) {
        if (input_values[`c${i}`]) {
          let title = this.state.formValues[`title${i}`] || "";
          title = title.replace(/\s*\(.*?\)/g, "").trim();
          if (title) selectedServices.push(title);
        }
      }

      let serviceString = "Audit Retraite EOR Consultants";
      if (selectedServices.length === 1) {
        serviceString = selectedServices[0];
      } else if (selectedServices.length === 2) {
        serviceString = `${selectedServices[0]} + ${selectedServices[1]}`;
      } else if (selectedServices.length > 2) {
        serviceString = `${selectedServices[0]} et autres`;
      }

      const fileName = `${serviceString} - ${firstName} ${lastName}`;
      pdf.save(`${fileName}.pdf`);
      toast.success("Téléchargement du contrat PDF réussi !");

    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      // Restauration des styles
      if (firstPage) {
        firstPage.style.marginTop = originalMarginTop;
        firstPage.style.fontSize = originalFontSize;
      }
    }
  };

  toInputValue = (sql) => {
    // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DD"
    if (!sql) return "";
    return sql.split(" ")[0];
  };

  fromInputValue = (v) => {
    // "YYYY-MM-DD" -> "YYYY-MM-DD HH:mm:ss"
    if (!v) return "";
    // prevent year > 4 chars
    const parts = v.split("-");
    if (parts.length === 3 && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      return parts.join("-") + " 00:00:00";
    }
    return v + " 00:00:00";
  };

  addDate = (key) => {
    this.setState((prev) => {
      const newArr = [...(prev[key] || []), ""];
      const newIdx = newArr.length - 1;
      const editKey =
        key === "acompte_dates" ? "editingAcompte" : "editingSold";
      return {
        [key]: newArr,
        [editKey]: [...prev[editKey], newIdx],
        isDirty: true,
      };
    });
  };

  updateDate = (key, idx, v) => {
    this.setState((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = v;
      return { [key]: arr, isDirty: true };
    });
  };

  removeDate = (key, idx) => {
    const editKey = `${key}_editing`;
    this.setState((prev) => {
      const arr = [...(prev[key] || [])];
      const editArr = [...(prev[editKey] || [])];
      arr.splice(idx, 1);
      editArr.splice(idx, 1);
      return { [key]: arr, [editKey]: editArr, isDirty: true };
    });
  };

  handleBack = () => {
    if (!this.state.isDirty) {
      history.push("/app/user/edit/" + this.state.user_id + "/8");
    } else {
      this.setState({ showUnsavedModal: true });
    }
  };

  handleLeaveWithoutSaving = () => {
    this.setState({ showUnsavedModal: false, isDirty: false });
    history.push("/app/user/edit/" + this.state.user_id + "/8");
  };

  handleSaveAndLeave = () => {
    this.setState({ showUnsavedModal: false });
    this.saveDocument(true);
  };

  render() {
    return (
      <React.Fragment>
        <Row>
          <Col xs="12" md="12" className="contract-header mb-1 px-0">
            <div
              className="d-flex align-items-center justify-content-between"
              style={{ minHeight: 50, gap: 12 }}
            >
              {/* Gauche : Retour + Prestation */}
              <div className="d-flex align-items-center" style={{ gap: 10 }}>
                <Button.Ripple
                  color="primary"
                  aria-label="Retour"
                  title="Retour"
                  className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{ width: 32, height: 32 }}
                  onClick={this.handleBack}
                >
                  <ArrowLeft size={16} />
                </Button.Ripple>
                <Modal
                  isOpen={this.state.showUnsavedModal}
                  toggle={() =>
                    this.setState({
                      showUnsavedModal: !this.state.showUnsavedModal,
                    })
                  }
                  className="modal-dialog-centered"
                >
                  <ModalHeader
                    toggle={() =>
                      this.setState({
                        showUnsavedModal: !this.state.showUnsavedModal,
                      })
                    }
                  >
                    Modifications non enregistrées
                  </ModalHeader>
                  <ModalBody>
                    Voulez-vous enregistrer vos modifications avant de quitter ?
                  </ModalBody>
                  <ModalFooter>
                    <Button color="primary" onClick={this.handleSaveAndLeave}>
                      Enregistrer et Quitter
                    </Button>
                    <Button
                      color="danger"
                      outline
                      onClick={this.handleLeaveWithoutSaving}
                    >
                      Quitter sans sauvegarder
                    </Button>
                  </ModalFooter>
                </Modal>

                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                  <h5 className="mb-0 d-flex align-items-center">
                    <Aperture className="mr-50" size={16} />
                    <span className="align-middle">Prestation :</span>
                  </h5>

                  <div
                    className="d-flex align-items-center flex-wrap"
                    style={{ gap: 4 }}
                  >
                    {(() => {
                      let subscribe_service = this.state.subscribe_services;
                      if (!subscribe_service) return <div>No</div>;
                      let lst = subscribe_service
                        .replaceAll('"', "")
                        .trim()
                        .split("/");
                      return lst
                        .filter((s) => s && s.trim() !== "")
                        .map((service, idx) => (
                          <Chip
                            key={idx}
                            className="m-0 text-center"
                            color={chipColors[service.trim()]}
                            text={service}
                          />
                        ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Droite : Boutons actions */}
              <div id="button_section" className="d-flex" style={{ gap: 8 }}>
                <Button
                  color={this.state.isDirty ? "success" : "secondary"}
                  disabled={!this.state.isDirty}
                  style={{ height: 40, lineHeight: "40px", padding: "0 16px" }}
                  onClick={() => {
                    if (this.state.isDirty) this.sendForm();
                  }}
                >
                  <Save size="15" />
                  <span className="align-middle ml-50">
                    Enregistrer le contrat
                  </span>
                </Button>

                <Button
                  color="primary"
                  style={{ height: 40, lineHeight: "40px", padding: "0 16px" }}
                  onClick={this.print}
                >
                  <Download size="15" />
                  <span className="align-middle ml-50">Télécharger</span>
                </Button>
              </div>
            </div>

            {/* ====== CONTRAT (affichage conditionnel) ====== */}

            {/* ====== CONTRAT (affichage conditionnel) ====== */}
            <FormGroup style={{ marginTop: "8px", marginBottom: 0 }}>
              <Card className="mb-1 shadow-sm" style={{ borderRadius: 10 }}>
                <CardHeader
                  className="py-1 d-flex align-items-center"
                  style={{
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e9ecef",
                  }}
                >
                  <h5 className="mb-0">Contrat</h5>
                </CardHeader>

                <CardBody className="pt-1">
                  <AddRowSelect
                    key="add-top"
                    placeholder="Ajouter une prestation"
                    availableRowIds={() => this.availableRowIds()}
                    addRowById={(id) => this.addRowById(id)}
                    labelFor={(id) => this.labelFor(id)}
                  />

                  {(this.state.selectedRows || []).map((id, index) => {
                    switch (id) {
                      case "r1":
                        return (
                          <RowMinutes
                            key="r1"
                            i={index}
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                          />
                        );
                      case "r2":
                        return (
                          <RowWithOption
                            key="r2"
                            i={index}
                            n={2}
                            optionCheckKey="cnb2"
                            optionLabel={this.state.formValues["subcontent2-2"]}
                            optionNbKey="nb2"
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                            handleCheckChange={(c, k) =>
                              this.handleCheckChange(c, k)
                            }
                          />
                        );
                      case "r3":
                        return (
                          <RowFixed
                            key="r3"
                            i={index}
                            n={3}
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                          />
                        );
                      case "r4":
                        return (
                          <RowWithOption
                            key="r4"
                            i={index}
                            n={4}
                            optionCheckKey="cnb4"
                            optionLabel={this.state.formValues["subcontent4-7"]}
                            optionNbKey="nb4"
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                            handleCheckChange={(c, k) =>
                              this.handleCheckChange(c, k)
                            }
                          />
                        );
                      case "r5":
                        return (
                          <RowWithOption
                            key="r5"
                            i={index}
                            n={5}
                            optionCheckKey="cnb5"
                            optionLabel={this.state.formValues["subcontent5-2"]}
                            optionNbKey="nb5"
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                            handleCheckChange={(c, k) =>
                              this.handleCheckChange(c, k)
                            }
                          />
                        );
                      case "r6":
                        return (
                          <RowFixed
                            key="r6"
                            i={index}
                            n={6}
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                          />
                        );
                      case "r7":
                        return (
                          <RowFixed
                            key="r7"
                            i={index}
                            n={7}
                            formValues={this.state.formValues}
                            onPrimaryToggle={(c, k, r) =>
                              this.onPrimaryToggle(c, k, r)
                            }
                            handleFieldChange={(k, v) =>
                              this.handleFieldChange(k, v)
                            }
                          />
                        );
                      default:
                        return null;
                    }
                  })}

                  <div
                    key="row-tva"
                    className="d-flex align-items-center flex-wrap"
                    style={{
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #ebe9f1",
                      borderRadius: 8,
                      padding: "15px 20px",
                      marginTop: 25,
                      gap: 15,
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      className="d-flex align-items-center"
                      style={{ gap: 10 }}
                    >
                      <span style={{ fontWeight: 600, color: "#5e5873" }}>
                        TVA
                      </span>
                      <Input
                        type="text"
                        value={this.state.formValues["TVAP"] ?? 20}
                        onChange={(e) =>
                          this.handleFieldChange("TVAP", e.target.value)
                        }
                        style={{
                          ...inputStyle,
                          width: 60,
                          textAlign: "center",
                        }}
                      />
                      <span style={{ color: "#b9b9c3" }}>%</span>
                    </div>

                    <VSep />

                    <div
                      className="d-flex align-items-center"
                      style={{ gap: 10 }}
                    >
                      <span style={{ color: "#5e5873" }}>
                        {this.state.formValues["table3-subcontent1"] ||
                          "Acompte à la commande :"}
                      </span>
                      <Input
                        type="text"
                        value={this.state.formValues["fp1"] ?? 100}
                        onChange={(e) =>
                          this.handleFieldChange("fp1", e.target.value)
                        }
                        style={{
                          ...inputStyle,
                          width: 60,
                          textAlign: "center",
                        }}
                      />
                      <span style={{ color: "#b9b9c3" }}>%</span>
                    </div>

                    <VSep />

                    <div
                      className="d-flex align-items-center"
                      style={{ gap: 10 }}
                    >
                      <span style={{ color: "#5e5873" }}>
                        {this.state.formValues["table3-subcontent2"] ||
                          "Solde fin de mission :"}
                      </span>
                      <Input
                        type="text"
                        value={this.state.formValues["fp2"] ?? 0}
                        onChange={(e) =>
                          this.handleFieldChange("fp2", e.target.value)
                        }
                        style={{
                          ...inputStyle,
                          width: 60,
                          textAlign: "center",
                        }}
                      />
                      <span style={{ color: "#b9b9c3" }}>%</span>
                    </div>

                    {/* 👇 séparation avant le crédit d'impôts */}
                    <VSep />

                    {/* 👇 checkbox + texte avec le même style que les autres spans */}
                    <div
                      className="d-flex align-items-center"
                      style={{
                        gap: 8,
                        backgroundColor: "#fff",
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid #eee",
                      }}
                    >
                      <LabeledCheckboxMaterialUi
                        label="" // important : label vide
                        checked={!!this.state.formValues.credit_impot_50}
                        onChange={(checked) =>
                          this.handleCheckChange(checked, "credit_impot_50")
                        }
                      />
                      <span style={{ fontWeight: 500, color: "#28c76f" }}>
                        Crédit d'impôts 50%
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {this.state.status != null &&
                this.state.subscribe_services != null &&
                this.state.status_payment != null && (
                  <Card className="mb-1 shadow-sm" style={{ borderRadius: 10 }}>
                    <CardHeader
                      className="py-1 d-flex align-items-center"
                      style={{
                        background: "#f8f9fa",
                        borderBottom: "1px solid #e9ecef",
                      }}
                    >
                      <h5 className="mb-0">Statut & Paiements</h5>
                    </CardHeader>

                    <CardBody className="pt-1">
                      <Row className="align-items-center">
                        <Col md="6" sm="12" className="mb-1">
                          <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                            <Radio
                              label="En attente"
                              color="primary"
                              name="status"
                              checked={this.state.status === "En attente"}
                              onChange={() =>
                                this.setState({
                                  status: "En attente",
                                  isDirty: true,
                                })
                              }
                            />
                            <Radio
                              label="En cours"
                              color="primary"
                              name="status"
                              checked={this.state.status === "En cours"}
                              onChange={() =>
                                this.setState({
                                  status: "En cours",
                                  isDirty: true,
                                })
                              }
                            />
                            <Radio
                              label="Terminé"
                              color="primary"
                              name="status"
                              checked={this.state.status === "Terminé"}
                              onChange={() => {
                                this.setState({
                                  status: "Terminé",
                                  isDirty: true,
                                });
                              }}
                            />
                            <Radio
                              label="Perdu"
                              color="primary"
                              name="status"
                              checked={this.state.status === "Perdu"}
                              onChange={() =>
                                this.setState({
                                  status: "Perdu",
                                  isDirty: true,
                                })
                              }
                            />
                          </div>
                          <div
                            className="d-flex align-items-center mt-1"
                            style={{ gap: 8 }}
                          >
                            <span style={{ minWidth: 130 }}>
                              Moyen de paiement
                            </span>

                            {/* Liste de choix */}
                            <Input
                              type="select"
                              style={{
                                minWidth: 100,
                                maxWidth: 200,
                                height: 40,
                              }}
                              value={this.state.payment_method || ""}
                              color="primary"
                              onChange={(e) =>
                                this.setState({
                                  payment_method: e.target.value,
                                  isDirty: true,
                                })
                              }
                            >
                              <option value="" disabled hidden>
                                Sélectionner…
                              </option>
                              <option value="Virement bancaire">
                                Virement bancaire
                              </option>
                              <option value="Chèque de banque">
                                Chèque de banque
                              </option>
                              <option value="Carte bancaire">
                                Carte bancaire
                              </option>
                              <option value="Espèce">Espèce</option>
                              <option value="Autre">Autre</option>
                            </Input>

                            {/* Champ texte si "Autre" */}
                            {this.state.payment_method === "Autre" && (
                              <Input
                                style={{ width: 220, height: 34 }}
                                value={this.state.payment_method_other || ""}
                                color="primary"
                                type="text"
                                placeholder="Précisez le moyen de paiement"
                                onChange={(e) =>
                                  this.setState({
                                    payment_method_other: e.target.value,
                                    isDirty: true,
                                  })
                                }
                              />
                            )}
                          </div>
                        </Col>

                        <Col md="6" sm="12" className="mb-1">
                          <div
                            className="d-flex align-items-center"
                            style={{ gap: 18 }}
                          >
                            <CustomInput
                              className="custom-switch-success"
                              type="switch"
                              id="acompte"
                              name="Acompte"
                              inline
                              checked={this.state.status_payment > 0}
                              onChange={() => this.setStatusPayment(1)}
                            >
                              <span
                                className="mb-0 switch-label"
                                style={{ paddingTop: 3 }}
                              >
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
                              <span
                                className="mb-0 switch-label"
                                style={{ paddingTop: 3 }}
                              >
                                Soldé
                              </span>
                            </CustomInput>
                          </div>
                        </Col>
                      </Row>

                      <hr className="my-2" />

                      <Row>
                        <Col md="6" sm="12" className="mb-1">
                          <div className="mb-1">
                            <h6 className="mb-0">Dates d’acompte</h6>
                          </div>
                          {(this.state.acompte_dates || []).map((d, idx) => {
                            const isEditing =
                              this.state.editingAcompte.includes(idx);
                            return (
                              <div
                                key={`ad-${idx}`}
                                className="d-flex align-items-center"
                                style={{ gap: 8, marginBottom: 8 }}
                              >
                                {isEditing ? (
                                  <>
                                    <Input
                                      type="date"
                                      max="9999-12-31"
                                      min="1900-01-01"
                                      style={{ width: 240, height: 34 }}
                                      value={this.toInputValue(d)}
                                      onChange={(e) =>
                                        this.updateDate(
                                          "acompte_dates",
                                          idx,
                                          this.fromInputValue(e.target.value)
                                        )
                                      }
                                    />
                                    <Button.Ripple
                                      className="btn-icon rounded-circle"
                                      color="success"
                                      size="sm"
                                      onClick={() =>
                                        this.handleSaveDate("acompte", idx)
                                      }
                                    >
                                      <Check size={16} />
                                    </Button.Ripple>
                                  </>
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        width: 240,
                                        height: 34,
                                        display: "flex",
                                        alignItems: "center",
                                        paddingLeft: 10,
                                        border: "1px solid #d9d9d9",
                                        borderRadius: 5,
                                        backgroundColor: "#f8f9fa",
                                      }}
                                    >
                                      {d ? moment(d).format("DD/MM/YYYY") : "-"}
                                    </div>
                                    <Button.Ripple
                                      className="btn-icon rounded-circle"
                                      color="primary"
                                      size="sm"
                                      onClick={() =>
                                        this.toggleEditAcompte(idx)
                                      }
                                    >
                                      <Edit size={16} />
                                    </Button.Ripple>
                                  </>
                                )}
                                <Button.Ripple
                                  className="btn-icon rounded-circle"
                                  color="danger"
                                  size="sm"
                                  onClick={() =>
                                    this.handleDeleteDate("acompte_dates", idx)
                                  }
                                >
                                  <Trash size={16} />
                                </Button.Ripple>
                              </div>
                            );
                          })}
                          <Button
                            outline
                            color="primary"
                            size="sm"
                            className="mt-1"
                            onClick={() => this.addDate("acompte_dates")}
                          >
                            <Plus size={14} className="mr-50" /> Ajouter
                          </Button>
                        </Col>

                        <Col md="6" sm="12" className="mb-1">
                          <div className="mb-1">
                            <h6 className="mb-0">Dates de paiement</h6>
                          </div>
                          {(this.state.sold_dates || []).map((d, idx) => {
                            const isEditing =
                              this.state.editingSold.includes(idx);
                            return (
                              <div
                                key={`sd-${idx}`}
                                className="d-flex align-items-center"
                                style={{ gap: 8, marginBottom: 8 }}
                              >
                                {isEditing ? (
                                  <>
                                    <Input
                                      type="date"
                                      max="9999-12-31"
                                      min="1900-01-01"
                                      style={{ width: 240, height: 34 }}
                                      value={this.toInputValue(d)}
                                      onChange={(e) =>
                                        this.updateDate(
                                          "sold_dates",
                                          idx,
                                          this.fromInputValue(e.target.value)
                                        )
                                      }
                                    />
                                    <Button.Ripple
                                      className="btn-icon rounded-circle"
                                      color="success"
                                      size="sm"
                                      onClick={() =>
                                        this.handleSaveDate("sold", idx)
                                      }
                                    >
                                      <Check size={16} />
                                    </Button.Ripple>
                                  </>
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        width: 240,
                                        height: 34,
                                        display: "flex",
                                        alignItems: "center",
                                        paddingLeft: 10,
                                        border: "1px solid #d9d9d9",
                                        borderRadius: 5,
                                        backgroundColor: "#f8f9fa",
                                      }}
                                    >
                                      {d ? moment(d).format("DD/MM/YYYY") : "-"}
                                    </div>
                                    <Button.Ripple
                                      className="btn-icon rounded-circle"
                                      color="primary"
                                      size="sm"
                                      onClick={() => this.toggleEditSold(idx)}
                                    >
                                      <Edit size={16} />
                                    </Button.Ripple>
                                  </>
                                )}
                                <Button.Ripple
                                  className="btn-icon rounded-circle"
                                  color="danger"
                                  size="sm"
                                  onClick={() =>
                                    this.handleDeleteDate("sold_dates", idx)
                                  }
                                >
                                  <Trash size={16} />
                                </Button.Ripple>
                              </div>
                            );
                          })}
                          <Button
                            outline
                            color="primary"
                            size="sm"
                            className="mt-1"
                            onClick={() => this.addDate("sold_dates")}
                          >
                            <Plus size={14} className="mr-50" /> Ajouter
                          </Button>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>
                )}
            </FormGroup>
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
                          <h6>
                            {moment(this.ifExist("birth_date")).isValid()
                              ? moment(this.ifExist("birth_date")).format(
                                "DD/MM/YYYY"
                              )
                              : ""}
                          </h6>
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
                            {moment(this.ifExist("updated_at")).isValid()
                              ? moment(this.ifExist("updated_at")).format(
                                "DD/MM/YYYY"
                              )
                              : ""}
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
                          <h6>
                            {(() => {
                              const s = this.ifExist("martial_status");
                              if (s === "Marié") return "Marié(e)";
                              if (s === "Divorcé") return "Divorcé(e)";
                              if (s === "Pacsé") return "Pacsé(e)";
                              if (s === "Veuf") return "Veuf(ve)";
                              return s;
                            })()}
                          </h6>{" "}
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
                          <h5
                            className="bold-black"
                            style={{
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            }}
                          >
                            Personnel
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
                          <h5
                            className="bold-black"
                            style={{
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            }}
                          >
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
                              Nb min:
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
                      <td
                        width="75%"
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            marginLeft: "20px",
                          }}
                        >
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
