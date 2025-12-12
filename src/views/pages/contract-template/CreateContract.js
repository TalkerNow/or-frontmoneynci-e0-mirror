/* eslint-disable */
import React from "react";
import moment from "moment";
import {
  Card,
  CardBody,
  Row,
  Col,
  InputGroup,
  Input,
  InputGroupAddon,
  FormGroup,
  CardHeader,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Breadcrumb,
  BreadcrumbItem,
} from "reactstrap";
import LabeledCheckboxMaterialUi from "labeled-checkbox-material-ui";
import Breadcrumbs from "../../../components/@vuexy/breadCrumbs/BreadCrumb";
import logo from "../../../assets/img/logo/contract_logo.jpg";
import {
  FileText,
  ChevronsLeft,
  Save,
  ArrowLeft,
  Check,
  Plus,
  Home,
  Aperture,
  Download,
} from "react-feather";
import "../../../assets/scss/pages/contract.scss";
import axios from "axios";
import { history } from "../../../history";
import Chip from "../../../../src/components/@vuexy/chips/ChipComponent";
import { NavLink } from "react-router-dom";
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

const Config = {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token"),
  },
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

class CreateContract extends React.Component {
  pdfRef = React.createRef();
  state = {
    recipientEmail: "",
    creator_id: null,
    rowData: [],
    services: [],
    activeTab: "1",
    selectedRows: [], // Nouvelle propriété pour les lignes sélectionnées
    isDirty: false,
    showUnsavedModal: false,
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
    general_condition: "",
    subscribe_services: "",
    status: "",
    status_payment: 0,
  };

  sendViaDocusign = async () => {
    try {
      // 1) Assure-toi que les totaux sont à jour
      this.calculate();

      // 2) Fabrique le PDF (exactement ce qui est affiché)
      const pdfBase64 = await this.generatePdfBase64();

      // 3) Coordonnées de signature DocuSign (pixels @72dpi)
      //    Tu ajusteras après 1 test: +20/-20 sur X ou Y si besoin.
      const SIGN_PAGE = 2; // la page où il y a “Date & signature du client:”
      const SIGN_X = 420;
      const SIGN_Y = 740;
      const DATE_PAGE = 2;
      const DATE_X = 120;
      const DATE_Y = 740;

      // 4) Prépare le payload pour ton endpoint backend
      const payload = {
        user_id: this.state.user_id,
        recipient_email: this.state.recipientEmail || this.ifExist("email"),
        recipient_name: `${this.ifExist("first_name")} ${this.ifExist(
          "last_name"
        )}`.trim(),
        embedded: false, // ou false si tu veux que DocuSign envoie l'email

        // 🎯 LE PDF EXACT généré côté front
        exact_pdf_base64: pdfBase64,

        // 📍 Positions des champs DocuSign (ton back les lit et pose les tabs en coordonnées)
        sign_page: SIGN_PAGE,
        sign_x: SIGN_X,
        sign_y: SIGN_Y,
        date_page: DATE_PAGE,
        date_x: DATE_X,
        date_y: DATE_Y,
      };

      // 5) Envoie à ton API (route que tu utilises déjà)
      await axios.post(
        `${global.config.server_url}/contracts/send-docusign`,
        payload,
        {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        }
      );

      toast.success("Contrat envoyé via DocuSign !");
    } catch (e) {
      console.error(e);
      toast.error("Échec envoi DocuSign");
    }
  };

  generatePdfBase64 = async () => {
    if (!window.html2pdf) throw new Error("html2pdf non chargé");
    const node = this.pdfRef.current;
    if (!node) throw new Error("pdf-root introuvable");

    // --- mémorise styles courants
    const prevBg = node.style.background;
    const prevShadow = node.style.boxShadow;
    const prevWidth = node.style.width;
    const prevMaxWidth = node.style.maxWidth;

    // --- force un vrai A4 pour la capture, pas pour l’écran
    node.style.background = "#ffffff";
    node.style.boxShadow = "none";
    node.style.width = "794px";
    node.style.maxWidth = "794px";

    const opt = {
      margin: 0,
      filename: "contrat.pdf",
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        removeContainer: true,
      },
      jsPDF: { unit: "pt", format: [595.28, 841.89], orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    const dataUri = await window
      .html2pdf()
      .set(opt)
      .from(node)
      .toPdf()
      .output("datauristring");

    // --- restaure styles écran
    node.style.background = prevBg;
    node.style.boxShadow = prevShadow;
    node.style.width = prevWidth;
    node.style.maxWidth = prevMaxWidth;

    return dataUri.split(",")[1];
  };

  ifExist(name) {
    if (this.state.rowData) return this.state.rowData[name];
    else return "N/a";
  }

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
    this.sendForm();
  };

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
      isDirty: true,
    });
    this.calculate();
  };

  handleCheckChange = (eOrBool, field) => {
    // Accepte soit un booléen direct, soit un event React
    const checked =
      typeof eOrBool === "boolean"
        ? eOrBool
        : !!(eOrBool && eOrBool.target && eOrBool.target.checked);

    input_values[field] = checked;
    this.setState(
      (prev) => ({
        formValues: { ...prev.formValues, [field]: checked },
        isDirty: true,
      }),
      this.calculate
    );
  };

  // --- Fonctions utilitaires pour la gestion des lignes du contrat ---
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

  onPrimaryToggle = (checked, key, id) => {
    this.handleCheckChange(checked, key);
    if (checked) this.addRowById(id);
    else this.removeRowById(id);
  };
  // --- Fin des fonctions utilitaires ---

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
    this.setState({
      user_id: this.props.match.params.id,
    });
    this.setState({
      creator_id: localStorage.getItem("userid").toString(),
    });
    this.setState({
      parent_id: this.props.match.params.parent_id,
    });
    axios
      .get(global.config.server_url + "/get_template/1", Config)
      .then((response) => {
        if (response.data != null) {
          let values = JSON.parse(response.data.values);

          // Convertit TOUT en vrais booléens
          const toStrictBool = (v) => {
            if (typeof v === "boolean") return v;
            if (v === 1 || v === "1") return true;
            if (v === 0 || v === "0") return false;
            if (typeof v === "string") {
              const s = v.trim().toLowerCase();
              if (["true", "on", "yes", "oui", "vrai"].includes(s)) return true;
              if (["false", "off", "no", "non", "faux"].includes(s))
                return false;
            }
            return !!v;
          };

          const boolKeys = [
            "c1",
            "c2",
            "c3",
            "c4",
            "c5",
            "c6",
            "c7",
            "cnb2",
            "cnb4",
            "cnb5",
            "cc5",
            "credit_impot_50",
          ];
          boolKeys.forEach((k) => {
            if (k in values) values[k] = toStrictBool(values[k]);
          });
          if (!("credit_impot_50" in values)) {
            values.credit_impot_50 = false;
          }
          // Forcer AR Entreprise (section 4) à false au chargement
          values.c4 = false;

          console.log(
            "TEMPLATE c4 (raw après normalisation):",
            values.c4,
            typeof values.c4
          );

          this.setState(
            {
              formValues: values,
              general_condition: response.data.general_condition,
              selectedRows: this.computeSelectedRows(values),
            },
            this.calculate
          );
          input_values = { ...values };
        }
      });

    axios
      .get(
        global.config.server_url + "/users/" + this.props.match.params.id,
        Config
      )
      .then((response) => {
        let rowData = response.data;
        this.setState({ rowData });
      });
  }
  appendCreditImpotNote = async () => {
    // Si la case n'est pas cochée, on ne fait rien
    if (!this.state.formValues.credit_impot_50) return;

    const userId = this.props.match.params.id;

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
      // notes probablement au niveau root (comme first_name / last_name)
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
      // tu peux mettre un toast si tu veux, mais j'évite de bloquer le contrat
      // toast.error("Impossible de mettre à jour les notes");
    }
  };

  sendForm = async () => {
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

    const userid = this.props.match.params.id;
    const parentid = this.state.rowData.parent_id;

    const parameters = {
      link_to_documents: "N/a",
      type: "contract",
      document_state: "En attente",
      date: "N/a",
      subscribe_services: sub_services,
      status_payment: 0,
      comment:
        "Contrat de " +
        this.state.rowData["first_name"] +
        " " +
        this.state.rowData["last_name"],
      advanced_payment: this.state.formValues["TOTALTTC"]
        ? this.state.formValues["TOTALTTC"]
        : 0,
      pre_payment: parseFloat(this.state.formValues["FINAL75"])
        ? parseFloat(this.state.formValues["FINAL75"])
        : 0,
      end_payment: parseFloat(this.state.formValues["FINAL25"])
        ? parseFloat(this.state.formValues["FINAL25"])
        : 0,
      user_id: userid,
      parent_id: parentid.toString(),
      creator_id: this.state.creator_id,
      values: JSON.stringify(input_values),
      unipro: this.state.formValues.credit_impot_50 ? 1 : 0,
    };

    try {
      // 🔹 On attend que les notes soient bien mises à jour
      await this.appendCreditImpotNote();

      // 🔹 On enregistre le document
      await axios.post(
        global.config.server_url + "/documents",
        parameters,
        Config
      );

      // 🔹 On met à jour les services (tu peux aussi await si tu veux être 100% séquentiel)
      this.setSubscribeServices();

      // 🔹 Puis seulement on revient sur la page editUser
      history.push("/app/user/edit/" + userid + "/8");
    } catch (error) {
      console.error(error);
      toast.error("API injoignable " + error);
    }
  };

  setSubscribeServices() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    var userid = this.props.match.params.id;
    var parentid = this.props.match.params.parent_id;
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
          parent_id: parentid,
          subscribe_services: subscribe_services,
        },
        Config
      )
      .then(function (result) { })
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
    var userid = this.props.match.params.id;
    var parentid = this.state.rowData.parent_id;
    parameters["link_to_documents"] = "N/a";
    parameters["type"] = "contract";
    parameters["document_state"] = "En attente";
    parameters["date"] = "N/a";
    parameters["status_payment"] = 0;
    parameters["subscribe_services"] = sub_services;
    parameters["pre_payment"] = parseFloat(this.state.formValues["FINAL75"])
      ? parseFloat(this.state.formValues["FINAL75"])
      : 0;
    parameters["end_payment"] = parseFloat(this.state.formValues["FINAL25"])
      ? parseFloat(this.state.formValues["FINAL25"])
      : 0;
    parameters["comment"] =
      "Contrat de " +
      this.state.rowData["first_name"] +
      " " +
      this.state.rowData["last_name"];
    parameters["advanced_payment"] = this.state.formValues["TOTALTTC"]
      ? this.state.formValues["TOTALTTC"]
      : 0;
    parameters["user_id"] = userid;
    if (parentid) parameters["parent_id"] = parentid.toString();
    parameters["creator_id"] = this.state.creator_id;
    parameters["values"] = JSON.stringify(input_values);
    parameters["unipro"] = this.state.formValues.credit_impot_50 ? 1 : 0;
    if (this.appendCreditImpotNote) await this.appendCreditImpotNote();

    try {
      // 1. Sauvegarde (Création)
      await axios.post(global.config.server_url + "/documents", parameters, Config);

      // 2. MAJ Services
      this.setSubscribeServices();

      // 3. Génération PDF
      const pages = document.getElementsByClassName("contract-page");
      if (!pages || pages.length === 0) {
        toast.error("Aucune page de contrat trouvée pour le PDF");
        return;
      }

      // Sauvegarde temporaire du style
      const firstPage = document.getElementById("print-section");
      let originalMarginTop = "";
      let originalFontSize = "";

      if (firstPage) {
        originalMarginTop = firstPage.style.marginTop;
        originalFontSize = firstPage.style.fontSize;
        firstPage.style.marginTop = "-20px";
        firstPage.style.fontSize = "18px";
      }

      try {
        const pdf = new jsPDF("p", "mm", "a4");

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();

          const canvas = await html2canvas(pages[i], {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 1200
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.9);
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        }

        const firstName = this.state.rowData["first_name"] || "";
        const lastName = this.state.rowData["last_name"] || "";

        // Récupération des services pour le nom du fichier (copié de EditContract)
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
        toast.success("Téléchargement du contract PDF réussi !");

        // 4. Redirection après succès (car création)
        setTimeout(() => {
          history.push("/app/user/edit/" + userid + "/8");
        }, 1500);

      } catch (err) {
        console.error("Erreur génération PDF", err);
        toast.error("Erreur lors de la génération du PDF");
      } finally {
        if (firstPage) {
          firstPage.style.marginTop = originalMarginTop;
          firstPage.style.fontSize = originalFontSize;
        }
      }

    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde : " + error);
    }
  };



  render() {
    return (
      <React.Fragment>
        <div className="content-header row">
          <div className="content-header-left col-md-9 col-12 mb-2">
            <div className="row breadcrumbs-top">
              <div className="col-12">
                <div className="d-flex align-items-center">
                  <Button.Ripple
                    className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center mr-1"
                    color="primary"
                    style={{ width: 32, height: 32 }}
                    onClick={this.handleBack}
                  >
                    <ArrowLeft size={16} />
                  </Button.Ripple>
                  <h2 className="content-header-title float-left mb-0">
                    Créer un contrat
                  </h2>
                </div>
                <div className="breadcrumb-wrapper vx-breadcrumbs d-sm-block d-none col-12">
                  <Breadcrumb tag="ol">
                    <BreadcrumbItem tag="li">
                      <NavLink to="/">
                        <Home className="align-top" size={15} />
                      </NavLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem tag="li" className="text-primary">
                      Pages
                    </BreadcrumbItem>
                    <BreadcrumbItem tag="li" active>
                      Créer un contrat
                    </BreadcrumbItem>
                  </Breadcrumb>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          /* Reset total pendant la capture PDF */
          #pdf-root, #pdf-root * {
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            background-image: none !important; /* pas de gradient/pseudo bg */
          }
          #pdf-root, #pdf-root .card, #pdf-root .contract-page, #pdf-root .card-body, #pdf-root .contract-wrapper {
            background: #fff !important; /* fond 100% blanc */
          }
          #pdf-root .vertical-line {
            background: none !important;
            border-left: 2px solid #8d8d8d !important; /* évite les bandes grises */
          }
          #pdf-root::before, #pdf-root::after, .contract-page::before, .contract-page::after {
            display: none !important; /* coupe tout décor ::before/::after */
          }
        `}</style>
        <Row>
          <Col
            className="mb-1 contract-header"
            md="5"
            sm="12"
            id="send_contract_section"
          >
            <InputGroup>
              <Input
                placeholder="Email"
                value={this.state.recipientEmail}
                onChange={(e) =>
                  this.setState({ recipientEmail: e.target.value })
                }
              />
              <InputGroupAddon addonType="append">
                <Button.Ripple
                  color="primary"
                  outline
                  onClick={this.sendViaDocusign}
                >
                  Envoyer via DocuSign
                </Button.Ripple>
              </InputGroupAddon>
            </InputGroup>
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
          </Col>
          <Col
            className="d-flex flex-column flex-md-row justify-content-end contract-header mb-1"
            md="7"
            sm="12"
            id="button_section"
          >
            <Button
              className="mr-1 mb-md-0 mb-1"
              color={this.state.isDirty ? "success" : "secondary"}
              disabled={!this.state.isDirty}
              onClick={() => {
                if (this.state.isDirty) this.sendForm();
              }}
            >
              <Save size="15" />
              <span className="align-middle ml-50">Enregistrer le contrat</span>
            </Button>

          </Col>
          <Col
            className="contract-wrapper"
            style={{ margin: "30px auto 0", width: "794px" }}
          >
            {/* ====== CONTRAT (édition en haut de page) ====== */}
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
                        label=""
                        checked={!!this.state.formValues.credit_impot_50}
                        onChange={(checked) =>
                          this.handleCheckChange(checked, "credit_impot_50")
                        }
                      />
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          color: "#5e5873",
                        }}
                      >
                        Crédit d'impôts 50%
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </FormGroup>
            {/* ====== FIN CONTRAT (carte d'édition) ====== */}

            <div
              id="pdf-root"
              ref={this.pdfRef}
              style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}
            >
              <Card
                className="contract-page"
                style={{
                  padding: "0.5rem 5.5rem 2.2rem 5.5rem",
                  boxShadow: "none",
                }}
                id="print-section"
              >
                <CardBody>
                  <Row>
                    <Col md="12" sm="12">
                      <img
                        src={logo}
                        alt="logo"
                        style={{ height: "130px" }}
                        crossOrigin="anonymous"
                      />
                    </Col>
                  </Row>
                  <Row style={{ marginTop: "20px" }}>
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
                            <h6>{moment().format("DD/MM/YYYY")}</h6>{" "}
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
                        style={{
                          padding: "0.5rem",
                          border: "2px solid #8a8a8a",
                        }}
                      >
                        <Row>
                          <Col
                            md="5"
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
                        style={{
                          padding: "0.5rem",
                          border: "2px solid #8a8a8a",
                        }}
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
                            md="5"
                            sm="12"
                            className="contract-caption1-section"
                          >
                            {" "}
                          </Col>
                          <Col md="7" sm="12">
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
                      height: "800px",
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
                          .map((item, idx) => (
                            <React.Fragment key={idx}>
                              {item}
                              <br />
                            </React.Fragment>
                          ))}
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
              <div className="html2pdf__page-break" />
              <Card
                className="contract-page"
                style={{
                  padding: "0.5rem 5.5rem 2.2rem 5.5rem",
                  marginTop: "50px",
                  boxShadow: "none",
                }}
              >
                <CardBody>
                  <Row>
                    <Col md="12" sm="12">
                      <img
                        src={logo}
                        alt="logo"
                        style={{ height: "130px" }}
                        crossOrigin="anonymous"
                      />
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
                                    {this.state.formValues["nb1-price"]}
                                  </div>
                                  <div style={{ display: "inline-block" }}>
                                    € HT)
                                  </div>
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
                                    this.handleFieldChange(
                                      "nb1",
                                      e.target.value
                                    )
                                  }
                                  required
                                />
                              </div>
                            </Col>
                          </Row>
                          <div style={{ marginLeft: "30px" }}>
                            {this.state.formValues["subcontent1-1"]}
                          </div>
                          <div style={{ marginLeft: "30px" }}>
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
                                style={{
                                  display: "inline-block",
                                  width: "65%",
                                }}
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
                                  paddingTop: "5px",
                                  verticalAlign: "top",
                                }}
                              >
                                <Input
                                  type="text"
                                  className="contract-text"
                                  style={{ fontWeight: "bold", height: "20px" }}
                                  value={this.state.formValues["nb2"]}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb2",
                                      e.target.value
                                    )
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
                          <Row
                            style={{ verticalAlign: "top", marginTop: "8px" }}
                          >
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
                          <Row
                            style={{ verticalAlign: "top", marginTop: "3px" }}
                          >
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
                                style={{
                                  display: "inline-block",
                                  width: "65%",
                                }}
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
                                  paddingTop: "5px",
                                  verticalAlign: "top",
                                }}
                              >
                                <Input
                                  type="text"
                                  className="contract-text"
                                  style={{ fontWeight: "bold", height: "20px" }}
                                  value={this.state.formValues["nb4"]}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb4",
                                      e.target.value
                                    )
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
                                style={{
                                  display: "inline-block",
                                  width: "65%",
                                }}
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
                                  paddingTop: "5px",
                                  verticalAlign: "top",
                                }}
                              >
                                <Input
                                  type="text"
                                  className="contract-text"
                                  style={{ fontWeight: "bold", height: "20px" }}
                                  value={this.state.formValues["nb5"]}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb5",
                                      e.target.value
                                    )
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
                                onChange={(e) =>
                                  this.handleCheckChange(e, "cc5")
                                }
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
                      style={{
                        height: "760px",
                        borderLeft: "2px solid #8d8d8d",
                      }}
                    />
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
                                    this.handleFieldChange(
                                      "TVAP",
                                      e.target.value
                                    )
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
                                    this.handleFieldChange(
                                      "fp1",
                                      e.target.value
                                    )
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
                                style={{
                                  display: "inline-block",
                                  width: "80px",
                                }}
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
                                    this.handleFieldChange(
                                      "fp2",
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
                                %
                              </div>
                            </Col>
                            <Col
                              md="3"
                              sm="12"
                              style={{ paddingLeft: 0, marginTop: "5px" }}
                            >
                              <div
                                style={{
                                  display: "inline-block",
                                  width: "80px",
                                }}
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
              <div className="html2pdf__page-break" />
              <Card
                className="contract-page"
                style={{
                  padding: "0.5rem 5.5rem 2.2rem 5.5rem",
                  boxShadow: "none",
                }}
              >
                <CardBody>
                  <Row>
                    <Col md="12" sm="12">
                      <img
                        src={logo}
                        alt="logo"
                        style={{ height: "130px" }}
                        crossOrigin="anonymous"
                      />
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
                    style={{ textAlign: "center", marginTop: "80px" }}
                  >
                    <p>
                      EOR - 36, RUE DE LABORDE 75008 PARIS - SIRET N°
                      48488721100023 - APE N° 7022Z
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default CreateContract;
/* eslint-disable */
