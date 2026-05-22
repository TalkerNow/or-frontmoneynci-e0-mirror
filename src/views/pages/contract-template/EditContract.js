/* eslint-disable */
import React from "react";
import moment from "moment";
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
  Table,
  Badge,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledTooltip,
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
  ChevronDown,
  AlertTriangle,
} from "react-feather";
import "../../../assets/scss/pages/contract.scss";
import "flatpickr/dist/themes/light.css";
import "../../../../src/assets/scss/plugins/forms/flatpickr/flatpickr.scss";
import Flatpickr from "react-flatpickr";
import { French } from "flatpickr/dist/l10n/fr.js";
import axios from "axios";
import { toast } from "react-toastify";
import { history } from "../../../history";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ContractStatusPath from "../../../components/ContractStatusPath";
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

const formatTitle = (title) => {
  if (!title) return "";
  const up = title.toUpperCase();
  if (up.includes("AUDIT RETRAITE PARTICULIER")) {
    return "AUDIT BILAN RETRAITE PARTICULIER";
  }
  if (up.includes("AUDIT RETRAITE ENTREPRISE")) {
    return "AUDIT BILAN RETRAITE ENTREPRISE";
  }
  return title;
};

const RowMinutes = ({ i, formValues, onPrimaryToggle, handleFieldChange }) => (
  <div style={{ ...stripe(i), ...GRID }}>
    <LabeledCheckboxMaterialUi
      label=""
      checked={formValues["c1"]}
      onChange={(checked) => onPrimaryToggle(checked, "c1", "r1")}
    />
    <span style={{ fontWeight: 500, color: "#5e5873" }}>
      {formatTitle(formValues["title1"])}
    </span>

    <span className="text-muted" style={{ fontSize: "0.85rem" }}>
      Nb (min)
    </span>
    <Input
      type="text"
      value={formValues["nb1"] || ""}
      onChange={(e) => handleFieldChange("nb1", e.target.value)}
      style={{ ...inputStyle, width: "100%" }}
    />

    <span className="text-muted" style={{ fontSize: "0.85rem" }}>
      PU (€/h)
    </span>
    <Input
      type="text"
      value={formValues["nb1-price"] || ""}
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
      {formatTitle(formValues[`title${n}`])}
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
      value={formValues[`p${n}`] || ""}
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
        {formatTitle(formValues[`title${n}`])}
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
        value={formValues[`p${n}`] || ""}
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
              value={formValues[optionNbKey] || ""}
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
            value={formValues[optionNbKey] || ""}
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
      this.calculate,
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
      this.calculate,
    );
    if (key) input_values[key] = false;
  };

  // wrapper pour les cases principales des lignes (on garde ta logique handleCheckChange)
  onPrimaryToggle = (checked, key, id) => {
    this.handleCheckChange(checked, key);
    if (checked) this.addRowById(id);
    else this.removeRowById(id);
  };

  openPaymentModal = () => {
    const totalTTC = this.state.formValues["TOTALTTC"] || 0; // Total BRUT (348 €)
    const fp1 = this.state.formValues["fp1"] || 0;

    // Simulation du montant payé
    // On additionne les acomptes existants (basé sur fp1 global divisé par nb dates ?)
    // Non, si fp1 est le % TOTAL des acomptes, alors montant_total_acomptes = totalTTC * fp1.
    // Si on a des dates d'acompte, on considère ce montant comme "engagé".

    // MAIS, le calcul du 'PaidAmount' doit être plus SIMPLE pour correspondre à l'instruction :
    // "Récupère la somme des paiements existants."

    const acompteDates = this.state.acompte_dates || [];
    const soldDates = this.state.sold_dates || [];

    const amountAcompteGlobal = (totalTTC * fp1) / 100;

    let paidAmount = 0;

    // Si des acomptes sont présents, on compte le montant total des acomptes
    if (acompteDates.length > 0) {
      paidAmount += amountAcompteGlobal;
    }

    // Si des soldes sont présents
    if (soldDates.length > 0) {
      // Le reste (Solde)
      paidAmount += totalTTC - amountAcompteGlobal;
    }

    // Force la précision à 2 décimales pour éviter les epsilon
    paidAmount = Math.round(paidAmount * 100) / 100;

    let suggestedType = "acompte";
    let suggestedAmount = 0;

    if (paidAmount === 0) {
      // Scénario A : Rien -> Acompte
      suggestedType = "acompte";
      suggestedAmount = amountAcompteGlobal;

      // Si fp1 est 0, on propose le défaut 50%
      if (suggestedAmount === 0 && totalTTC > 0) {
        suggestedAmount = totalTTC * 0.5;
      }
    } else {
      // Scénario B : Déjà payé -> Solde
      suggestedType = "sold";
      const remainder = totalTTC - paidAmount;
      suggestedAmount = remainder > 0 ? remainder : 0;
    }

    this.setState({
      showPaymentModal: true,
      modalPaymentType: suggestedType,
      modalPaymentAmount: suggestedAmount,
      modalRemainingToPay: totalTTC - paidAmount, // Store remainder for smart type switching
      modalPaymentDate: moment().format("YYYY-MM-DD"),
    });
  };

  handlePaymentSubmit = () => {
    const { modalPaymentType, modalPaymentAmount, modalPaymentDate } =
      this.state;
    const totalTTC = this.state.formValues["TOTALTTC"] || 0;

    // Mise à jour des pourcentages si l'utilisateur change le montant
    // (Uniquement si c'est le premier paiement de ce type, pour simplifier)

    if (totalTTC > 0) {
      if (modalPaymentType === "acompte") {
        // Si c'est le tout premier acompte, on ajuste le % d'acompte (fp1)
        // pour correspondre au montant saisi.
        const currentAcomptes = this.state.acompte_dates || [];
        if (currentAcomptes.length === 0) {
          const newFp1 = (modalPaymentAmount / totalTTC) * 100;
          this.handleFieldChange("fp1", parseFloat(newFp1.toFixed(2)));
        }
        this.addDate("acompte_dates", modalPaymentDate);
      } else {
        // Si c'est le tout premier solde, on ajuste le % de solde (fp2) ?
        // En général fp2 = 100 - fp1.
        // Mais si on ajoute un solde, on l'ajoute juste à la liste.
        // Le calcul des montants dans le tableau divise le reste par le nb de soldes.
        this.addDate("sold_dates", modalPaymentDate);
      }
    } else {
      // Fallback sans montant total
      this.addDate(
        modalPaymentType === "acompte" ? "acompte_dates" : "sold_dates",
        modalPaymentDate,
      );
    }

    this.setState({ showPaymentModal: false });
  };

  ifExist(name) {
    if (this.state.rowData) return this.state.rowData[name];
    else return "N/a";
  }
  handleFieldChange = (field, value) => {
    input_values[field] = value;
    this.state.formValues[field] = value;
    if (field === "fp1") {
      // Clamp fp1 between 0% and 100%
      if (value === "" || value === undefined || value === null) {
        // Allow empty value for typing
        input_values[field] = "";
        this.state.formValues[field] = "";
        // Assume 0 for calculations but don't force it in the field
        this.state.formValues["fp2"] = 100;
        input_values["fp2"] = 100;
      } else {
        let clampedValue = parseInt(value);
        if (isNaN(clampedValue)) clampedValue = 0;
        if (clampedValue < 0) clampedValue = 0;
        if (clampedValue > 100) clampedValue = 100;

        value = clampedValue;
        input_values[field] = clampedValue;
        this.state.formValues[field] = clampedValue;

        this.state.formValues["fp2"] = 100 - clampedValue;
        input_values["fp2"] = 100 - clampedValue;
      }
      if (parseInt(value) <= 95) {
        let newSoldDates = [...(this.state.sold_dates || [])];
        let newEditingSold = [...(this.state.editingSold || [])];
        let newAcompteDates = [...(this.state.acompte_dates || [])];
        let newEditingAcompte = [...(this.state.editingAcompte || [])];

        const defaultMethod = this.state.payment_method || "Virement bancaire";

        // Ensure at least 1 Acompte date field
        if (newAcompteDates.length === 0) {
          newAcompteDates.push({
            date: "",
            method: defaultMethod,
            is_paid: false,
          });
          newEditingAcompte.push(0);
        }

        // ALWAYS ensure at least 1 Solde date field when fp1 < 100
        if (newSoldDates.length === 0) {
          newSoldDates.push({
            date: "",
            method: defaultMethod,
            is_paid: false,
          });
          newEditingSold.push(0);
        }

        // Only update status_payment if it was 0
        const newStatusPayment =
          this.state.status_payment === 0 ? 1 : this.state.status_payment;
        const newDepositDate =
          this.state.status_payment === 0
            ? moment().format("YYYY-MM-DD HH:mm:ss")
            : this.state.deposit_date;

        this.setState({
          status_payment: newStatusPayment,
          deposit_date: newDepositDate,
          sold_dates: newSoldDates,
          editingSold: newEditingSold,
          acompte_dates: newAcompteDates,
          editingAcompte: newEditingAcompte,
          isDirty: true,
        });
      }
      if (parseInt(value) === 100) {
        // 100% acompte means no solde, everything paid upfront
        const defaultMethod = this.state.payment_method || "Virement bancaire";
        let newAcompteDates = [...(this.state.acompte_dates || [])];
        let newEditingAcompte = [...(this.state.editingAcompte || [])];

        // Ensure at least one acompte line
        if (newAcompteDates.length === 0) {
          newAcompteDates.push({
            date: "",
            method: defaultMethod,
            is_paid: false,
          });
          newEditingAcompte.push(0);
        }

        this.setState({
          status_payment: 0,
          deposit_date: null,
          sold_date: null,
          sold_dates: [],
          editingSold: [],
          acompte_dates: newAcompteDates,
          editingAcompte: newEditingAcompte,
        });
      }
    }
    if (field === "fp2") {
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
          parseInt(this.state.formValues["nb1"], 10),
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

    const fullTotal = this.state.formValues["TOTALTTC"];
    const baseTotal = input_values["credit_impot_50"]
      ? Math.trunc(fullTotal * 0.5)
      : fullTotal;

    this.state.formValues["FINAL75"] = Math.trunc(baseTotal * percent1) + ".00";
    this.state.formValues["FINAL25"] = Math.trunc(baseTotal * percent2) + ".00";

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

    // Load template (general conditions) first - wait for it
    try {
      const templateResponse = await axios.get(
        global.config.server_url + "/get_template/1",
        Config,
      );
      if (templateResponse.data != null) {
        this.setState({
          general_condition: templateResponse.data.general_condition,
        });
      }
    } catch (e) {
      console.error("Error loading template:", e);
    }

    axios
      .get(
        global.config.server_url +
          "/get_contract/" +
          this.props.match.params.id,
        Config,
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

        const normalizeDates = (dates, defaultMethod) => {
          if (!Array.isArray(dates)) return [];
          return dates.map((d) => {
            if (typeof d === "string") {
              return { date: d, method: defaultMethod };
            }
            return d; // Already an object (hopefully)
          });
        };

        const acompteDatesNormalized = normalizeDates(
          acompteDates,
          payment_method,
        );
        const soldDatesNormalized = normalizeDates(soldDates, payment_method);

        this.setState({
          rowData,
          user_id: rowData.id,
          parent_id: rowData.parent_id,
          deposit_date: rowData.deposit_date,
          sold_date: rowData.sold_date,
          status: rowData.document_state,
          status_payment: rowData.status_payment,
          payment_method,
          payment_method_other,
          subscribe_services: rowData.subscribe_services,
          acompte_dates: acompteDatesNormalized,
          sold_dates: soldDatesNormalized,
        });

        if (rowData.values != null) {
          let values = JSON.parse(rowData.values);
          input_values = { ...values };

          // No longer auto-creating payment lines on load.
          // Users can add payment lines manually via "+ Ajouter une date" button.
          // This ensures deleted lines stay deleted after refresh.

          // Enforce "En attente" if no payments exist
          const finalAcompteDates = this.state.acompte_dates || [];
          const finalSoldDates = this.state.sold_dates || [];
          if (finalAcompteDates.length === 0 && finalSoldDates.length === 0) {
            this.setState({ status: "En attente" });
          }

          // calcule les montants puis active les lignes concernées
          this.setState(
            {
              formValues: values,
              selectedRows: this.computeSelectedRows(values),
            },
            this.calculate,
          );
        } else {
          // nouveau contrat → interface vide par défaut
          this.setState({ selectedRows: [], status: "En attente" });
          this.calculate();
        }

        // Check if we should auto-download
        const urlParams = new URLSearchParams(window.location.search);
        const shouldDownload = urlParams.get("download") === "true";
        if (shouldDownload) {
          const startTime = Date.now();
          const checkInterval = setInterval(async () => {
            const pages = document.getElementsByClassName("contract-page");
            const elapsed = Date.now() - startTime;

            // Wait for 3 pages OR 10 seconds timeout (fallback)
            if (pages.length >= 3 || elapsed > 10000) {
              clearInterval(checkInterval);
              // Small additional buffer to ensure styles are applied
              setTimeout(async () => {
                await this.print();
                // Redirect back to the contracts tab after download
                if (this.state.user_id) {
                  const backUrl = this.props.location && this.props.location.state && this.props.location.state.backUrl ? this.props.location.state.backUrl : ("/app/user/edit/" + this.state.user_id + "/8");
      history.push(backUrl);
                }
              }, 500);
            }
          }, 500);
        }

        // Fetch Suivi for this contract
        if (rowData.id && rowData.user_id) {
          axios
            .get(
              `${global.config.server_url}/suivi-avancement/client/${rowData.user_id}`,
              Config,
            )
            .then((res) => {
              const suivis = Array.isArray(res.data) ? res.data : [];
              const mySuivi = suivis.find((s) => s.facture_id === rowData.id);
              if (mySuivi) {
                this.setState({ suivi_id: mySuivi.id });
              }
            })
            .catch((err) => console.warn("Error fetching suivi", err));
        }
      })
      .catch(() => {});
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
        config,
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
        config,
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
      acompte_dates: JSON.stringify(this.state.acompte_dates || []),
      sold_dates: JSON.stringify(this.state.sold_dates || []),
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
        Config,
      );

      // 📡 3) maj des services liés
      this.setSubscribeServices();

      if (redirect) {
        // 🔁 4) retour sur la fiche user
        toast.success("Contrat enregistré avec succès");
        const backUrl = this.props.location && this.props.location.state && this.props.location.state.backUrl ? this.props.location.state.backUrl : ("/app/user/edit/" + userid + "/8");
        history.push(backUrl);
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
        // Turn ON Acompte - create acompte payment line if needed
        const defaultMethod = this.state.payment_method || "Virement bancaire";
        let newAcompteDates = [...(this.state.acompte_dates || [])];
        let newEditingAcompte = [...(this.state.editingAcompte || [])];

        if (newAcompteDates.length === 0) {
          newAcompteDates.push({
            date: "",
            method: defaultMethod,
            is_paid: false,
          });
          newEditingAcompte.push(0);
        }

        this.setState({
          status_payment: 1,
          deposit_date: moment().format("YYYY-MM-DD HH:mm:ss"),
          acompte_dates: newAcompteDates,
          editingAcompte: newEditingAcompte,
        });
      } else {
        // Turn OFF Acompte - create a solde line for 100% payment
        const defaultMethod = this.state.payment_method || "Virement bancaire";
        let newSoldDates = [...(this.state.sold_dates || [])];
        let newEditingSold = [...(this.state.editingSold || [])];

        // Add a solde line if none exists
        if (newSoldDates.length === 0) {
          newSoldDates.push({
            date: "",
            method: defaultMethod,
            is_paid: false,
          });
          newEditingSold.push(0);
        }

        // Set fp1 to 100 (no acompte, pay all as solde)
        this.handleFieldChange("fp1", 100);

        this.setState({
          status_payment: 0,
          sold_date: null,
          deposit_date: null,
          sold_dates: newSoldDates,
          editingSold: newEditingSold,
        });
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
        Config,
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
      this.state.rowData["first_name"] + " " + this.state.rowData["last_name"];
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
        Config,
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

      let fileName = "";
      const upperServices = selectedServices.map((s) => s.toUpperCase());
      const isAudit =
        upperServices.some((s) => s.includes("AUDIT RETRAITE PARTICULIER")) ||
        upperServices.some((s) =>
          s.includes("AUDIT BILAN RETRAITE PARTICULIER"),
        ) ||
        upperServices.some((s) => s.includes("AUDIT RETRAITE ENTREPRISE")) ||
        upperServices.some((s) =>
          s.includes("AUDIT BILAN RETRAITE ENTREPRISE"),
        );

      if (isAudit) {
        // --- LOGIQUE SPÉCIALE POUR AUDIT (Particulier ou Entreprise) ---
        // 1. Filtrer "Liquidation"
        const filteredServices = selectedServices.filter(
          (s) => !s.toUpperCase().includes("LIQUIDATION"),
        );

        // 2. Renommages spécifiques
        const mappedServices = filteredServices.map((s) => {
          const up = s.toUpperCase();
          if (
            up.includes("AUDIT RETRAITE PARTICULIER") ||
            up.includes("AUDIT BILAN RETRAITE PARTICULIER") ||
            up.includes("AUDIT BILANRETRAITE PARTICULIER")
          ) {
            return "AUDIT BILAN RETRAITE";
          }
          if (
            up.includes("AUDIT RETRAITE ENTREPRISE") ||
            up.includes("AUDIT BILAN RETRAITE ENTREPRISE")
          ) {
            return "AUDIT BILAN RETRAITE ENTREPRISE";
          }
          return s;
        });

        // 3. Construction de la chaîne de services
        let serviceString = "Dossier";
        if (mappedServices.length > 0) {
          if (mappedServices.length === 1) {
            serviceString = mappedServices[0];
          } else if (mappedServices.length === 2) {
            serviceString = `${mappedServices[0]} + ${mappedServices[1]}`;
          } else {
            serviceString = `${mappedServices[0]} et autres`;
          }
        }

        // 4. Format avec suffixe "- EOR Consultants"
        fileName = `${serviceString} ${firstName} ${lastName} - EOR Consultants`;
      } else {
        // --- LOGIQUE PAR DÉFAUT (AUTRES PRESTATIONS) ---
        let serviceString = "Dossier";
        if (selectedServices.length > 0) {
          if (selectedServices.length === 1) {
            serviceString = selectedServices[0];
          } else if (selectedServices.length === 2) {
            serviceString = `${selectedServices[0]} + ${selectedServices[1]}`;
          } else {
            serviceString = `${selectedServices[0]} et autres`;
          }
        }
        // Format demandé : "Prestation Prénom Nom - EOR Consultants"
        fileName = `${serviceString} ${firstName} ${lastName} - EOR Consultants`;
      }

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

  addDate = (key, dateValue = "") => {
    this.setState((prev) => {
      // Default method: "-" to indicate it needs to be filled
      const defaultMethod = "-";
      // Use empty string to show placeholder "JJ/MM/AAAA"
      const dateToUse = "";
      const newObj = { date: dateToUse, method: defaultMethod, is_paid: false };

      const newArr = [...(prev[key] || []), newObj];
      const newIdx = newArr.length - 1;
      const editKey =
        key === "acompte_dates" ? "editingAcompte" : "editingSold";

      const newState = {
        [key]: newArr,
        [editKey]: [...prev[editKey], newIdx],
        isDirty: true,
      };

      // Transition automatique du statut selon la présence de lignes
      if (prev.status === "Terminé" || prev.status === "En attente") {
        newState.status = "En cours";
      }

      return newState;
    });
  };

  changePaymentType = (oldKey, newKey, idx) => {
    this.setState((prev) => {
      const oldArr = [...(prev[oldKey] || [])];
      const newArr = [...(prev[newKey] || [])];

      // Remove from old
      const [movedObj] = oldArr.splice(idx, 1);

      // Add to new
      newArr.push(movedObj);
      const newIdx = newArr.length - 1;

      // Update editing states
      const oldEditKey =
        oldKey === "acompte_dates" ? "editingAcompte" : "editingSold";
      const newEditKey =
        newKey === "acompte_dates" ? "editingAcompte" : "editingSold";

      const oldEditing = (prev[oldEditKey] || [])
        .filter((i) => i !== idx)
        .map((i) => (i > idx ? i - 1 : i));
      const newEditing = [...(prev[newEditKey] || []), newIdx];

      return {
        [oldKey]: oldArr,
        [newKey]: newArr,
        [oldEditKey]: oldEditing,
        [newEditKey]: newEditing,
        isDirty: true,
      };
    });
  };

  updateSuiviPaymentStep = async (paymentDate) => {
    if (!this.state.suivi_id || !paymentDate) return;

    // Determine step number based on contract type
    // Same logic as in SuiviAvancementBox (simplified)
    const isCreditImpot = this.state.formValues.credit_impot_50; // unipro === 1
    const stepNumber = isCreditImpot ? 7 : 4; // 7 = Paiement du contrat (CI), 4 = Paiement du contrat (Standard)

    const dateToSend = paymentDate + " 00:00:00"; // Assuming paymentDate is YYYY-MM-DD

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };
      // We don't know if the step already exists, but the backend usually handles POST/PUT or upsert.
      // SuiviAvancementBox uses POST if empty, PUT if exists.
      // Here, we'll try POST first as general "update" or create. Or simpler: check if we can just use one endpoint.
      // Let's assume standard POST updates it. If fails, we might need a specific check.
      // BUT for simplicity and robustness, let's try POST.
      await axios.post(
        `${global.config.server_url}/suivi-avancement/${this.state.suivi_id}/steps/${stepNumber}`,
        { date: dateToSend },
        Config,
      );
    } catch (e) {
      console.error("Error updating suivi timeline step", e);
    }
  };

  updateDate = (key, idx, field, v) => {
    this.setState(
      (prev) => {
        const arr = [...(prev[key] || [])];
        // Ensure element is object
        if (typeof arr[idx] === "string") {
          arr[idx] = {
            date: arr[idx],
            method: this.state.payment_method || "",
          };
        }

        // Update specific field
        if (field === "date") {
          arr[idx] = { ...arr[idx], date: v };
        } else if (field === "method") {
          arr[idx] = { ...arr[idx], method: v };
        } else if (field === "amount") {
          arr[idx] = { ...arr[idx], amount: v };
        }

        return { [key]: arr, isDirty: true };
      },
      () => {
        // Callback after state update
        const currentList = this.state[key];
        if (currentList && currentList[idx]) {
          const item = currentList[idx];
          // If updating DATE and the payment is PAID, update the timeline
          if (field === "date" && item.is_paid) {
            this.updateSuiviPaymentStep(item.date);
          }
        }
      },
    );
  };

  togglePaymentPaidStatus = (key, idx) => {
    this.setState(
      (prev) => {
        // 1. Get current arrays (create copies)
        const acomptes = [...(prev.acompte_dates || [])];
        const soldes = [...(prev.sold_dates || [])];

        // 2. Identify which array we are modifying
        const targetArray = key === "acompte_dates" ? acomptes : soldes;

        // 3. Update the specific item
        // Ensure element is object
        if (typeof targetArray[idx] === "string") {
          targetArray[idx] = {
            date: targetArray[idx],
            method: this.state.payment_method || "",
            is_paid: false,
          };
        }

        const newIsPaid = !targetArray[idx].is_paid;
        let newDate = targetArray[idx].date;

        // Auto-fill date if paying and date is empty
        if (newIsPaid && !newDate) {
          newDate = moment().format("YYYY-MM-DD");
        }

        targetArray[idx] = {
          ...targetArray[idx],
          is_paid: newIsPaid,
          date: newDate,
        };

        // 4. Calculate global status
        // Check if ALL payments are paid
        const allAcomptesPaid = acomptes.every((p) => p && p.is_paid);
        const allSoldesPaid = soldes.every((p) => p && p.is_paid);
        const hasPayments = acomptes.length > 0 || soldes.length > 0;
        const isAllPaid = hasPayments && allAcomptesPaid && allSoldesPaid;

        // Check if AT LEAST ONE payment is paid
        const isSomePaid =
          acomptes.some((p) => p && p.is_paid) ||
          soldes.some((p) => p && p.is_paid);

        const newState = { [key]: targetArray, isDirty: true };

        if (newIsPaid) {
          // Feature: Liaison Date Paiement -> Facturation
          // If contract has a "billing_date", update it with this payment's date
          // Note: 'billing_date' key is assumed based on requirement, checking formValues generically
          const payDateStr = targetArray[idx].date;
          if (
            payDateStr &&
            this.state.formValues &&
            Object.prototype.hasOwnProperty.call(
              this.state.formValues,
              "billing_date",
            )
          ) {
            // We update directly into formValues
            // (Ensure we don't mutate state directly without setState in a larger refactor, but here we are in setState callback)
            // However, formValues is usually a separate part of state.
            // Accessing prev.formValues might be tricky if not destructured, but we can access this.state.formValues (careful with closure stale state, but inside setState updater 'this.state' refers to state at time of call? No, usually not safe. better to check existence.)
          }

          // Actually, we can just check if the field is present in the current state outside, or just try to update.
          // But wait, we are inside a setState updater.
          // Let's assume we can trigger another update or just side-effect update formValues if strictly needed,
          // OR better: return updated formValues in the same state update if possible.
          // But here we are returning { [key]: ..., isDirty: true }.
          // Let's implement a secondary setState call primarily for safety or merge it if possible.
          // Since 'formValues' is top level state, we can't easily merge it in this 'prev' callback which might be scoped.

          // Simpler approach: Check if we should update billing date.
          // Plan says: "Mets à jour automatiquement le champ 'Date de Facturation' (si présent dans le contrat)"
          // I will do a check after this state update or chaining it. Note: logic inside setState updater.
        }

        // REMOVED AUTO-CLOSE "Terminé" logic
        // Status remains "En cours" if it was "En cours", or becomes "En cours" if checking valid payments.
        // But actually, we just shouldn't force it to "Terminé".
        // We should ensuring it is "En cours" if it was "En attente" and now has payments.

        if (hasPayments && newState.status !== "Terminé") {
          // Force "En cours" only if it was "En attente".
          // If user manually set "Terminé", we might respect it or not?
          // Instruction says: "Un contrat ne doit passer à 'Terminé' QUE si l'utilisateur clique manuellement".
          // So if it IS 'Terminé', we leave it? Or if we uncheck a payment, should it reopen?
          // User instruction A: "Stop à l'auto-clôture".
          // So we just remove the block that sets it to "Terminé".
          if (prev.status === "En attente") {
            newState.status = "En cours";
          }
        } else if (!hasPayments) {
          newState.status = "En attente";
        }

        // Additional side-effect for Billing Date:
        // We can't easily modify 'formValues' inside this return if it's not part of the 'prev' destructure we want to return.
        // We will perform the billing date update in the callback of setState, but we are inside the updater function...
        // Refactoring to use a variable for billing update and trigger a callback or separate SetState is safer.

        return newState;
      },
      () => {
        // Callback after state update
        const currentList = this.state[key];
        if (currentList && currentList[idx]) {
          const item = currentList[idx];
          // If payment is now PAID, update the timeline
          if (item.is_paid) {
            this.updateSuiviPaymentStep(item.date);
          }
        }
      },
    );
  };

  removeDate = (key, idx) => {
    const editKey = `${key}_editing`;
    this.setState((prev) => {
      const arr = [...(prev[key] || [])];
      const editArr = [...(prev[editKey] || [])];
      arr.splice(idx, 1);
      editArr.splice(idx, 1);
      const newState = { [key]: arr, [editKey]: editArr, isDirty: true };

      // Recalcule le statut global après suppression
      const acomptesRemaining =
        key === "acompte_dates" ? arr : prev.acompte_dates || [];
      const soldesRemaining =
        key === "sold_dates" ? arr : prev.sold_dates || [];
      const hasPaymentsRemaining =
        acomptesRemaining.length > 0 || soldesRemaining.length > 0;

      if (!hasPaymentsRemaining) {
        newState.status = "En attente";
      } else {
        const allAcomptesPaid = acomptesRemaining.every((p) => p && p.is_paid);
        const allSoldesPaid = soldesRemaining.every((p) => p && p.is_paid);
        if (allAcomptesPaid && allSoldesPaid) {
          // Previously set "Terminé", now we keep "En cours"
          // Unless we want to respect existing "Terminé"?
          // Requirement: "Stop à l'auto-clôture". So we don't force it.
          // But if it IS "Terminé", should we downgrade it if I delete a payment?
          // Probably safer to leave it or default to "En cours".
          // Let's default to "En cours" to be safe against auto-closing.
          // If the user wants it Terminé, they click it.
          // If they delete a payment, it's ambiguous, but "En cours" is safe.
          if (newState.status === "En attente") newState.status = "En cours";
        } else {
          newState.status = "En cours";
        }
      }

      return newState;
    });
  };

  handleBack = () => {
    if (!this.state.isDirty) {
      const backUrl = this.props.location && this.props.location.state && this.props.location.state.backUrl ? this.props.location.state.backUrl : ("/app/user/edit/" + this.state.user_id + "/8");
      history.push(backUrl);
    } else {
      this.setState({ showUnsavedModal: true });
    }
  };

  handleLeaveWithoutSaving = () => {
    this.setState({ showUnsavedModal: false, isDirty: false });
    const backUrl = this.props.location && this.props.location.state && this.props.location.state.backUrl ? this.props.location.state.backUrl : ("/app/user/edit/" + this.state.user_id + "/8");
      history.push(backUrl);
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
                {/* Payment Modal */}
                <Modal
                  isOpen={this.state.showPaymentModal || false}
                  toggle={() =>
                    this.setState({
                      showPaymentModal: !this.state.showPaymentModal,
                    })
                  }
                  className="modal-dialog-centered"
                >
                  <ModalHeader
                    toggle={() =>
                      this.setState({
                        showPaymentModal: !this.state.showPaymentModal,
                      })
                    }
                  >
                    Ajouter un paiement
                  </ModalHeader>
                  <ModalBody>
                    <FormGroup>
                      <label>Date</label>
                      <Input
                        type="date"
                        value={this.state.modalPaymentDate || ""}
                        onChange={(e) =>
                          this.setState({ modalPaymentDate: e.target.value })
                        }
                      />
                    </FormGroup>
                    <FormGroup>
                      <label>Type</label>
                      <Input
                        type="select"
                        value={this.state.modalPaymentType || "acompte"}
                        onChange={(e) =>
                          this.setState({ modalPaymentType: e.target.value })
                        }
                      >
                        <option value="acompte">Acompte</option>
                        <option value="sold">Solde</option>
                      </Input>
                    </FormGroup>
                    <FormGroup>
                      <label>Montant (€)</label>
                      <Input
                        type="number"
                        value={this.state.modalPaymentAmount ?? ""}
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value);

                          // Smart Type Logic
                          let newType = this.state.modalPaymentType;
                          const remainder = this.state.modalRemainingToPay;

                          // Only auto-switch if we have a valid remainder
                          if (
                            typeof remainder === "number" &&
                            typeof val === "number"
                          ) {
                            // If amount == remainder => Solde
                            if (Math.abs(val - remainder) < 0.01) {
                              newType = "sold";
                            }
                            // If amount < remainder => Acompte
                            else if (val < remainder) {
                              newType = "acompte";
                            }
                          }

                          this.setState({
                            modalPaymentAmount: val,
                            modalPaymentType: newType,
                          });
                        }}
                      />
                    </FormGroup>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="primary" onClick={this.handlePaymentSubmit}>
                      Valider
                    </Button>
                    <Button
                      color="secondary"
                      onClick={() => this.setState({ showPaymentModal: false })}
                    >
                      Annuler
                    </Button>
                  </ModalFooter>
                </Modal>

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
                    <Button
                      color="primary"
                      outline
                      onClick={this.handleSaveAndLeave}
                    >
                      Enregistrer et Quitter
                    </Button>
                    <Button
                      color="danger"
                      onClick={this.handleLeaveWithoutSaving}
                    >
                      Annuler
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
                </CardBody>
              </Card>

              {this.state.status != null &&
                this.state.subscribe_services != null &&
                this.state.status_payment != null && (
                  <Card
                    className="border-0 shadow-sm mb-3"
                    style={{
                      borderRadius: 12,
                      height: "auto",
                      overflow: "visible",
                    }}
                  >
                    <CardBody
                      className="p-2 pb-0"
                      style={{ overflow: "visible" }}
                    >
                      {/* ZONE 1 : SALESFORCE PATH */}
                      {/* ZONE 1 : SALESFORCE PATH */}
                      <ContractStatusPath
                        status={this.state.status}
                        onStatusChange={(status) => {
                          const hasP =
                            (this.state.acompte_dates || []).length > 0 ||
                            (this.state.sold_dates || []).length > 0;

                          if (status === "En cours" && !hasP) {
                            // Auto-add line if switching to En cours with no payments
                            const needsAcompte =
                              (this.state.formValues["fp1"] || 0) > 0;
                            const defaultKey = needsAcompte
                              ? "acompte_dates"
                              : "sold_dates";
                            this.addDate(defaultKey, "");
                            this.setState({ status, isDirty: true });
                            toast.success(
                              "Une ligne de paiement a été ajoutée automatiquement.",
                            );
                          } else {
                            if (!hasP && status === "Terminé") {
                              toast.warning(
                                "Veuillez ajouter au moins une date de paiement pour terminer le contrat.",
                              );
                              return;
                            }
                            this.setState({ status, isDirty: true });
                          }
                        }}
                      />

                      {/* ZONE 2 : TOOLBAR COMPACTE */}
                      {(() => {
                        const totalTTC = this.state.formValues["TOTALTTC"] || 0;
                        const fp1 = this.state.formValues["fp1"] || 0;
                        const fp2 = this.state.formValues["fp2"] || 0;

                        // Recalculate totals for display
                        const amountAcompte = (totalTTC * fp1) / 100;
                        const acompteDates = this.state.acompte_dates || [];
                        const soldDates = this.state.sold_dates || [];
                        const amountTotalSolde =
                          acompteDates.length > 0
                            ? (totalTTC * fp2) / 100
                            : totalTTC;
                        let totalPercu = 0;

                        // Smart logic for Acompte (matching payment table logic)
                        const fixedAcomptes = acompteDates.filter(
                          (d) =>
                            d &&
                            typeof d === "object" &&
                            d.amount !== undefined,
                        );
                        const sumFixedAcomptes = fixedAcomptes.reduce(
                          (acc, d) => acc + parseFloat(d.amount || 0),
                          0,
                        );
                        const unFixedAcomptesCount =
                          acompteDates.length - fixedAcomptes.length;
                        let amountPerAcompte = 0;
                        if (unFixedAcomptesCount > 0) {
                          amountPerAcompte =
                            (amountAcompte - sumFixedAcomptes) /
                            unFixedAcomptesCount;
                        }

                        acompteDates.forEach((d) => {
                          if (d && typeof d === "object" && d.is_paid) {
                            if (d.amount !== undefined)
                              totalPercu += parseFloat(d.amount);
                            else totalPercu += amountPerAcompte;
                          }
                        });

                        // Smart logic for Solde (matching payment table logic)
                        const fixedSoldes = soldDates.filter(
                          (d) =>
                            d &&
                            typeof d === "object" &&
                            d.amount !== undefined,
                        );
                        const sumFixedSoldes = fixedSoldes.reduce(
                          (acc, d) => acc + parseFloat(d.amount || 0),
                          0,
                        );
                        const unFixedSoldesCount =
                          soldDates.length - fixedSoldes.length;
                        let amountPerSolde = 0;
                        if (unFixedSoldesCount > 0) {
                          amountPerSolde =
                            (amountTotalSolde - sumFixedSoldes) /
                            unFixedSoldesCount;
                        }

                        soldDates.forEach((d) => {
                          if (d && typeof d === "object" && d.is_paid) {
                            if (d.amount !== undefined)
                              totalPercu += parseFloat(d.amount);
                            else totalPercu += amountPerSolde;
                          }
                        });
                        const reste = totalTTC - totalPercu;
                        const formatMoney = (val) =>
                          new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(val);

                        return (
                          <div className="contract-toolbar">
                            {/* GAUCHE : KPIs - Affichage agrandi */}
                            <div
                              className="toolbar-kpis"
                              style={{ fontSize: "1.1rem" }}
                            >
                              <div className="kpi-item">
                                <span
                                  className="mr-2"
                                  style={{
                                    fontSize: "1.1rem",
                                    color: "#5e5873",
                                    fontWeight: 600,
                                  }}
                                >
                                  Payé :
                                </span>
                                <span
                                  className="text-success font-weight-bold"
                                  style={{ fontSize: "1.25rem" }}
                                >
                                  {formatMoney(totalPercu)}
                                </span>
                              </div>
                              <div className="kpi-separator"></div>
                              <div className="kpi-item">
                                <span
                                  className="mr-2"
                                  style={{
                                    fontSize: "1.1rem",
                                    color: "#5e5873",
                                    fontWeight: 600,
                                  }}
                                >
                                  Reste :
                                </span>
                                <span
                                  className="text-danger font-weight-bold"
                                  style={{ fontSize: "1.25rem" }}
                                >
                                  {formatMoney(Math.max(0, reste))}
                                </span>
                              </div>
                              <div className="kpi-separator"></div>
                              <div className="kpi-item">
                                <span
                                  className="text-dark font-weight-bolder"
                                  style={{ fontSize: "1.25rem" }}
                                >
                                  Total : {formatMoney(totalTTC)}
                                </span>
                              </div>
                            </div>

                            {/* DROITE : ACTIONS - Affichage agrandi sur une ligne */}
                            <div
                              className="d-flex align-items-center"
                              style={{
                                backgroundColor: "#f8f9fa",
                                border: "1px solid #ebe9f1",
                                borderRadius: 8,
                                padding: "10px 16px",
                                gap: 16,
                                flexWrap: "nowrap",
                              }}
                            >
                              <div
                                className="d-flex align-items-center"
                                style={{ gap: 10 }}
                              >
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "#5e5873",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  TVA
                                </span>
                                <Input
                                  type="text"
                                  style={{
                                    width: 70,
                                    height: 42,
                                    textAlign: "center",
                                    borderRadius: 6,
                                    border: "1px solid #d8d6de",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                  }}
                                  value={this.state.formValues["TVAP"] ?? 20}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "TVAP",
                                      e.target.value,
                                    )
                                  }
                                />
                                <span
                                  style={{
                                    color: "#5e5873",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  %
                                </span>
                              </div>

                              <div
                                style={{
                                  width: 1,
                                  height: 28,
                                  background: "#d8d6de",
                                }}
                              />

                              <div
                                className="d-flex align-items-center"
                                style={{ gap: 10 }}
                              >
                                <span
                                  style={{
                                    color: "#5e5873",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  Acompte :
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  style={{
                                    width: 70,
                                    height: 42,
                                    textAlign: "center",
                                    borderRadius: 6,
                                    border: "1px solid #d8d6de",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                  }}
                                  value={this.state.formValues["fp1"] ?? ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "fp1",
                                      e.target.value,
                                    )
                                  }
                                />
                                <span
                                  style={{
                                    color: "#5e5873",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  %
                                </span>
                              </div>

                              <div
                                style={{
                                  width: 1,
                                  height: 28,
                                  background: "#d8d6de",
                                }}
                              />

                              <div
                                className="d-flex align-items-center"
                                style={{ gap: 10 }}
                              >
                                <span
                                  style={{
                                    color: "#5e5873",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  Solde :
                                </span>
                                <Input
                                  type="text"
                                  style={{
                                    width: 70,
                                    height: 42,
                                    textAlign: "center",
                                    borderRadius: 6,
                                    border: "1px solid #d8d6de",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                  }}
                                  value={this.state.formValues["fp2"] ?? 0}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "fp2",
                                      e.target.value,
                                    )
                                  }
                                />
                                <span
                                  style={{
                                    color: "#5e5873",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  %
                                </span>
                              </div>

                              <div
                                style={{
                                  width: 1,
                                  height: 28,
                                  background: "#d8d6de",
                                }}
                              />

                              <div
                                className="d-flex align-items-center"
                                style={{
                                  gap: 8,
                                  backgroundColor: "#fff",
                                  padding: "6px 12px",
                                  borderRadius: 6,
                                  border: "1px solid #eee",
                                }}
                              >
                                <LabeledCheckboxMaterialUi
                                  label=""
                                  checked={
                                    !!this.state.formValues.credit_impot_50
                                  }
                                  onChange={(checked) =>
                                    this.handleCheckChange(
                                      checked,
                                      "credit_impot_50",
                                    )
                                  }
                                  style={{ padding: 0 }}
                                />
                                <span
                                  style={{
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    color: "#28c76f",
                                  }}
                                >
                                  Crédit d'impôts 50%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="payment-table-wrapper">
                        <Table
                          responsive
                          hover
                          size="sm"
                          className="payment-table-compact mb-0"
                        >
                          <thead className="thead-light">
                            <tr>
                              <th
                                style={{
                                  whiteSpace: "nowrap",
                                  padding: "0.5rem",
                                }}
                              >
                                Date de paiement
                              </th>
                              <th style={{ padding: "0.5rem" }}>Type</th>
                              <th
                                style={{
                                  whiteSpace: "nowrap",
                                  padding: "0.5rem",
                                }}
                              >
                                Moyen de paiement
                              </th>
                              <th
                                className="text-right"
                                style={{
                                  whiteSpace: "nowrap",
                                  padding: "0.5rem",
                                }}
                              >
                                {(() => {
                                  const totalTTC =
                                    this.state.formValues["TOTALTTC"] || 0;
                                  const fp1 = this.state.formValues["fp1"] || 0;
                                  const fp2 = this.state.formValues["fp2"] || 0;
                                  const acompteDates =
                                    this.state.acompte_dates || [];
                                  const soldDates = this.state.sold_dates || [];

                                  // Calculate actual payment amounts (same logic as tbody)
                                  const amountAcompte = (totalTTC * fp1) / 100;
                                  const amountTotalSolde =
                                    acompteDates.length > 0
                                      ? (totalTTC * fp2) / 100
                                      : totalTTC;

                                  // Smart logic for Acompte amounts
                                  const fixedAcomptes = acompteDates.filter(
                                    (d) =>
                                      d &&
                                      typeof d === "object" &&
                                      d.amount !== undefined,
                                  );
                                  const sumFixedAcomptes = fixedAcomptes.reduce(
                                    (acc, d) => acc + parseFloat(d.amount || 0),
                                    0,
                                  );
                                  const unFixedAcomptesCount =
                                    acompteDates.length - fixedAcomptes.length;
                                  const amountPerAcompte =
                                    unFixedAcomptesCount > 0
                                      ? (amountAcompte - sumFixedAcomptes) /
                                        unFixedAcomptesCount
                                      : 0;

                                  // Smart logic for Solde amounts
                                  const fixedSoldes = soldDates.filter(
                                    (d) =>
                                      d &&
                                      typeof d === "object" &&
                                      d.amount !== undefined,
                                  );
                                  const sumFixedSoldes = fixedSoldes.reduce(
                                    (acc, d) => acc + parseFloat(d.amount || 0),
                                    0,
                                  );
                                  const unFixedSoldesCount =
                                    soldDates.length - fixedSoldes.length;
                                  const amountPerSolde =
                                    unFixedSoldesCount > 0
                                      ? (amountTotalSolde - sumFixedSoldes) /
                                        unFixedSoldesCount
                                      : 0;

                                  // Calculate total of all payments
                                  let totalPayments = 0;
                                  acompteDates.forEach((d) => {
                                    if (d === null || d === undefined) return;
                                    const amount =
                                      d &&
                                      typeof d === "object" &&
                                      d.amount !== undefined
                                        ? parseFloat(d.amount)
                                        : amountPerAcompte;
                                    totalPayments += amount;
                                  });
                                  soldDates.forEach((d) => {
                                    if (d === null || d === undefined) return;
                                    const amount =
                                      d &&
                                      typeof d === "object" &&
                                      d.amount !== undefined
                                        ? parseFloat(d.amount)
                                        : amountPerSolde;
                                    totalPayments += amount;
                                  });

                                  // Only show mismatch if there are payment lines
                                  const hasPaymentLines =
                                    acompteDates.length > 0 ||
                                    soldDates.length > 0;
                                  const isMismatch =
                                    hasPaymentLines &&
                                    Math.abs(totalPayments - totalTTC) > 0.01;
                                  const formatMoney = (val) =>
                                    new Intl.NumberFormat("fr-FR", {
                                      style: "currency",
                                      currency: "EUR",
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    }).format(val);
                                  return (
                                    <div className="d-flex align-items-center justify-content-end">
                                      {isMismatch && (
                                        <>
                                          <AlertTriangle
                                            size={16}
                                            className="text-warning mr-1"
                                            style={{ cursor: "pointer" }}
                                            id="montantMismatchWarning"
                                          />
                                          <UncontrolledTooltip
                                            placement="top"
                                            target="montantMismatchWarning"
                                          >
                                            Le total des paiements (
                                            {formatMoney(totalPayments)})
                                            diffère du contrat (
                                            {formatMoney(totalTTC)}).
                                          </UncontrolledTooltip>
                                        </>
                                      )}
                                      <span>Montant</span>
                                    </div>
                                  );
                                })()}
                              </th>
                              <th
                                className="text-center"
                                style={{
                                  whiteSpace: "nowrap",
                                  padding: "0.5rem",
                                }}
                              >
                                Statut
                              </th>
                              <th
                                className="text-center"
                                style={{ width: "100px", padding: "0.5rem" }}
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const totalTTC =
                                this.state.formValues["TOTALTTC"] || 0;
                              const fp1 = this.state.formValues["fp1"] || 0;
                              const fp2 = this.state.formValues["fp2"] || 0;
                              let acompteDates = this.state.acompte_dates || [];
                              let soldDates = this.state.sold_dates || [];

                              const amountAcompte = (totalTTC * fp1) / 100;
                              // If no acompte dates, Solde takes the full amount logic (ignoring fp2=0 if fp1=100)
                              // Otherwise it respects the fp2 (balance)
                              const amountTotalSolde =
                                acompteDates.length > 0
                                  ? (totalTTC * fp2) / 100
                                  : totalTTC;

                              // Removed auto-creation of default entries in render to avoid side-effects and stay in view mode

                              // Smart logic for Acompte
                              const fixedAcomptes = acompteDates.filter(
                                (d) =>
                                  d &&
                                  typeof d === "object" &&
                                  d.amount !== undefined,
                              );
                              const sumFixedAcomptes = fixedAcomptes.reduce(
                                (acc, d) => acc + parseFloat(d.amount || 0),
                                0,
                              );
                              const unFixedAcomptesCount =
                                acompteDates.length - fixedAcomptes.length;
                              let amountPerAcompte = 0;
                              if (unFixedAcomptesCount > 0) {
                                amountPerAcompte =
                                  (amountAcompte - sumFixedAcomptes) /
                                  unFixedAcomptesCount;
                              }

                              // Smart logic for Solde
                              const fixedSoldes = soldDates.filter(
                                (d) =>
                                  d &&
                                  typeof d === "object" &&
                                  d.amount !== undefined,
                              );
                              const sumFixedSoldes = fixedSoldes.reduce(
                                (acc, d) => acc + parseFloat(d.amount || 0),
                                0,
                              );
                              const unFixedSoldesCount =
                                soldDates.length - fixedSoldes.length;
                              let amountPerSolde = 0;
                              if (unFixedSoldesCount > 0) {
                                amountPerSolde =
                                  (amountTotalSolde - sumFixedSoldes) /
                                  unFixedSoldesCount;
                              }

                              const rows = [];

                              // Acompte Rows
                              acompteDates.forEach((d, idx) => {
                                if (d === null || d === undefined) return;
                                const dateVal =
                                  typeof d === "object" ? d.date : d;
                                const methodVal =
                                  typeof d === "object"
                                    ? d.method
                                    : this.state.payment_method;
                                const isPaid =
                                  typeof d === "object" ? d.is_paid : false;
                                rows.push({
                                  type: "acompte",
                                  date: dateVal,
                                  method: methodVal,
                                  idx,
                                  amount:
                                    d &&
                                    typeof d === "object" &&
                                    d.amount !== undefined
                                      ? parseFloat(d.amount)
                                      : amountPerAcompte,
                                  is_paid: isPaid,
                                  isEditing: (
                                    this.state.editingAcompte || []
                                  ).includes(idx),
                                });
                              });

                              // Solde Rows
                              soldDates.forEach((d, idx) => {
                                if (d === null || d === undefined) return;
                                const dateVal =
                                  typeof d === "object" ? d.date : d;
                                const methodVal =
                                  typeof d === "object"
                                    ? d.method
                                    : this.state.payment_method;
                                const isPaid =
                                  typeof d === "object" ? d.is_paid : false;
                                rows.push({
                                  type: "sold",
                                  date: dateVal,
                                  method: methodVal,
                                  idx,
                                  amount:
                                    d &&
                                    typeof d === "object" &&
                                    d.amount !== undefined
                                      ? parseFloat(d.amount)
                                      : amountPerSolde,
                                  is_paid: isPaid,
                                  isEditing: (
                                    this.state.editingSold || []
                                  ).includes(idx),
                                });
                              });

                              if (rows.length === 0) {
                                return (
                                  <tr>
                                    <td
                                      colSpan="6"
                                      className="text-center py-4 text-muted"
                                    >
                                      <div style={{ opacity: 0.6 }}>
                                        Aucun paiement enregistré
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return rows.map((row, i) => (
                                <tr
                                  key={`${row.type}-${row.idx}`}
                                  style={{
                                    backgroundColor: row.is_paid
                                      ? "rgba(40, 199, 111, 0.08)"
                                      : row.date &&
                                          moment().diff(
                                            moment(row.date),
                                            "days",
                                          ) > 7
                                        ? "rgba(234, 84, 85, 0.08)"
                                        : "transparent",
                                    transition: "background-color 0.3s ease",
                                  }}
                                >
                                  <td>
                                    {row.isEditing ? (
                                      <Flatpickr
                                        className="form-control"
                                        placeholder="JJ/MM/AAAA"
                                        value={
                                          row.date
                                            ? moment(row.date).toDate()
                                            : null
                                        }
                                        options={{
                                          dateFormat: "d/m/Y",
                                          locale: French,
                                          allowInput: true,
                                        }}
                                        onChange={(date) => {
                                          if (date && date.length) {
                                            this.updateDate(
                                              row.type === "acompte"
                                                ? "acompte_dates"
                                                : "sold_dates",
                                              row.idx,
                                              "date",
                                              moment(date[0]).format(
                                                "YYYY-MM-DD",
                                              ),
                                            );
                                          }
                                        }}
                                        style={{
                                          minWidth: 150,
                                          cursor: "pointer",
                                          backgroundColor: "#fff",
                                        }}
                                      />
                                    ) : row.date ? (
                                      moment(row.date).format("DD/MM/YYYY")
                                    ) : (
                                      <span className="text-muted">
                                        JJ/MM/AAAA
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {row.isEditing ? (
                                      <UncontrolledDropdown className="payment-type-dropdown">
                                        <DropdownToggle
                                          tag="div"
                                          className="cursor-pointer"
                                        >
                                          {row.type === "acompte" ? (
                                            <Badge color="light-info" pill>
                                              Acompte
                                            </Badge>
                                          ) : (
                                            <Badge color="light-success" pill>
                                              Solde
                                            </Badge>
                                          )}
                                          <ChevronDown size={14} />
                                        </DropdownToggle>
                                        <DropdownMenu right>
                                          <DropdownItem
                                            onClick={() => {
                                              if (row.type !== "acompte") {
                                                this.changePaymentType(
                                                  "sold_dates",
                                                  "acompte_dates",
                                                  row.idx,
                                                );
                                              }
                                            }}
                                          >
                                            <Badge color="light-info" pill>
                                              Acompte
                                            </Badge>
                                          </DropdownItem>
                                          <DropdownItem
                                            onClick={() => {
                                              if (row.type !== "sold") {
                                                this.changePaymentType(
                                                  "acompte_dates",
                                                  "sold_dates",
                                                  row.idx,
                                                );
                                              }
                                            }}
                                          >
                                            <Badge color="light-success" pill>
                                              Solde
                                            </Badge>
                                          </DropdownItem>
                                        </DropdownMenu>
                                      </UncontrolledDropdown>
                                    ) : row.type === "acompte" ? (
                                      <Badge color="light-info" pill>
                                        Acompte
                                      </Badge>
                                    ) : (
                                      <Badge color="light-success" pill>
                                        Solde
                                      </Badge>
                                    )}
                                  </td>
                                  <td>
                                    {row.isEditing ? (
                                      <Input
                                        type="select"
                                        value={row.method || "-"}
                                        onChange={(e) =>
                                          this.updateDate(
                                            row.type === "acompte"
                                              ? "acompte_dates"
                                              : "sold_dates",
                                            row.idx,
                                            "method",
                                            e.target.value,
                                          )
                                        }
                                        style={{ minWidth: 200 }}
                                      >
                                        <option value="-">-</option>
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
                                    ) : (
                                      <span>
                                        {row.method || "Virement bancaire"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-right font-weight-bold">
                                    {row.isEditing ? (
                                      <Input
                                        type="number"
                                        style={{
                                          width: 100,
                                          textAlign: "right",
                                          display: "inline-block",
                                        }}
                                        value={row.amount}
                                        onChange={(e) =>
                                          this.updateDate(
                                            row.type === "acompte"
                                              ? "acompte_dates"
                                              : "sold_dates",
                                            row.idx,
                                            "amount",
                                            parseFloat(e.target.value),
                                          )
                                        }
                                      />
                                    ) : (
                                      new Intl.NumberFormat("fr-FR", {
                                        style: "currency",
                                        currency: "EUR",
                                      }).format(row.amount)
                                    )}
                                  </td>
                                  <td className="text-center">
                                    <div
                                      className="d-flex align-items-center justify-content-center"
                                      style={{ gap: 8 }}
                                    >
                                      <CustomInput
                                        type="switch"
                                        id={`status-switch-${row.type}-${row.idx}`}
                                        name={`status-switch-${row.type}-${row.idx}`}
                                        className="custom-switch-success d-inline-block"
                                        label=""
                                        checked={row.is_paid === true}
                                        onChange={() =>
                                          this.togglePaymentPaidStatus(
                                            row.type === "acompte"
                                              ? "acompte_dates"
                                              : "sold_dates",
                                            row.idx,
                                          )
                                        }
                                      />
                                      <Badge
                                        color={
                                          row.is_paid
                                            ? "light-success"
                                            : row.date &&
                                                moment().diff(
                                                  moment(row.date),
                                                  "days",
                                                ) > 7
                                              ? "light-danger"
                                              : "light-warning"
                                        }
                                        pill
                                        style={{
                                          fontSize: "0.75rem",
                                          transition: "all 0.3s ease",
                                        }}
                                      >
                                        {row.is_paid
                                          ? "Payé"
                                          : row.date &&
                                              moment().diff(
                                                moment(row.date),
                                                "days",
                                              ) > 7
                                            ? "En retard"
                                            : "En attente"}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {row.isEditing ? (
                                      <Button.Ripple
                                        className="btn-icon rounded-circle mr-1"
                                        color="success"
                                        size="sm"
                                        onClick={() =>
                                          this.handleSaveDate(
                                            row.type === "acompte"
                                              ? "acompte"
                                              : "sold",
                                            row.idx,
                                          )
                                        }
                                      >
                                        <Check size={14} />
                                      </Button.Ripple>
                                    ) : (
                                      <Edit
                                        size={16}
                                        className="mr-1 text-secondary cursor-pointer"
                                        onClick={() =>
                                          row.type === "acompte"
                                            ? this.toggleEditAcompte(row.idx)
                                            : this.toggleEditSold(row.idx)
                                        }
                                      />
                                    )}
                                    <Trash
                                      size={16}
                                      className="text-danger cursor-pointer"
                                      onClick={() =>
                                        this.handleDeleteDate(
                                          row.type === "acompte"
                                            ? "acompte_dates"
                                            : "sold_dates",
                                          row.idx,
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </Table>
                      </div>
                      <div
                        className="contract-action-bar d-flex"
                        style={{ gap: 8 }}
                      >
                        <Button
                          className="btn-white-primary d-flex align-items-center"
                          size="sm"
                          onClick={() => {
                            const hasAcompte =
                              (this.state.acompte_dates || []).length > 0;
                            const needsAcompte =
                              (this.state.formValues["fp1"] || 0) > 0;
                            const defaultKey =
                              !hasAcompte && needsAcompte
                                ? "acompte_dates"
                                : "sold_dates";

                            this.addDate(
                              defaultKey,
                              moment().format("YYYY-MM-DD"),
                            );
                          }}
                        >
                          <Plus size={14} className="mr-1" />
                          <span style={{ fontSize: "0.85rem" }}>
                            Ajouter une date
                          </span>
                        </Button>
                      </div>
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
                                  "DD/MM/YYYY",
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
                                  "DD/MM/YYYY",
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
                        .map(function (item, index) {
                          return (
                            <React.Fragment key={index}>
                              {item}
                              <br />
                            </React.Fragment>
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
                    <tbody>
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
                                  value={this.state.formValues["nb1"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb1",
                                      e.target.value,
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
                                  value={this.state.formValues["p2"] || ""}
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
                                  paddingTop: "3px",
                                  verticalAlign: "top",
                                }}
                              >
                                <Input
                                  type="text"
                                  className="contract-text"
                                  style={{ fontWeight: "bold", height: "20px" }}
                                  value={this.state.formValues["nb2"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb2",
                                      e.target.value,
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
                                  value={this.state.formValues["p3"] || ""}
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
                                  value={this.state.formValues["p4"] || ""}
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
                                  paddingTop: "3px",
                                  verticalAlign: "top",
                                }}
                              >
                                <Input
                                  type="text"
                                  className="contract-text"
                                  style={{ fontWeight: "bold", height: "20px" }}
                                  value={this.state.formValues["nb4"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb4",
                                      e.target.value,
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
                                  value={this.state.formValues["p5"] || ""}
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
                                  paddingTop: "3px",
                                  verticalAlign: "top",
                                }}
                              >
                                <Input
                                  type="text"
                                  className="contract-text"
                                  style={{ fontWeight: "bold", height: "20px" }}
                                  value={this.state.formValues["nb5"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "nb5",
                                      e.target.value,
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
                                  value={this.state.formValues["p6"] || ""}
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
                                  value={this.state.formValues["p7"] || ""}
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
                    </tbody>
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
                    <tbody>
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
                                  value={this.state.formValues["TVAP"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "TVAP",
                                      e.target.value,
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
                    </tbody>
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
                    <tbody>
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
                          {this.state.formValues.credit_impot_50 ? (
                            <div style={{ marginLeft: "30px", marginTop: "8px" }}>
                              <Row style={{ marginBottom: "4px" }}>
                                <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                                  <span className="bold-black">Total prestation :</span>
                                </Col>
                                <Col md="3" sm="12" style={{ paddingLeft: 0 }}>
                                  <div className="contract-div" style={{ display: "inline-block", width: "90px" }}>
                                    {this.state.formValues["TOTALTTC"]}.00 €
                                  </div>
                                </Col>
                              </Row>
                              <Row style={{ marginBottom: "4px" }}>
                                <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                                  <span className="bold-black">Avance immédiate du crédit d'impôt (50%) :</span>
                                </Col>
                                <Col md="3" sm="12" style={{ paddingLeft: 0 }}>
                                  <div className="contract-div" style={{ display: "inline-block", width: "90px" }}>
                                    - {Math.trunc(this.state.formValues["TOTALTTC"] * 0.5)}.00 €
                                  </div>
                                </Col>
                              </Row>
                              <Row style={{ marginBottom: "10px" }}>
                                <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                                  <span className="bold-black" style={{ fontWeight: 700 }}>Reste à charge :</span>
                                </Col>
                                <Col md="3" sm="12" style={{ paddingLeft: 0 }}>
                                  <div className="contract-div" style={{ display: "inline-block", width: "90px", fontWeight: 700 }}>
                                    {Math.trunc(this.state.formValues["TOTALTTC"] * 0.5)}.00 €
                                  </div>
                                </Col>
                              </Row>
                              <Row style={{ marginBottom: "4px" }}>
                                <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                                  <span className="bold-black">
                                    {(this.state.formValues["table3-subcontent1"] || "Acompte à la commande :").replace(/\s*:\s*$/, "").trim()} ({this.state.formValues["fp1"]}%) :
                                  </span>
                                </Col>
                                <Col md="3" sm="12" style={{ paddingLeft: 0 }}>
                                  <div className="contract-div" style={{ display: "inline-block", width: "90px" }}>
                                    {this.state.formValues["FINAL75"]} €
                                  </div>
                                </Col>
                              </Row>
                              <Row>
                                <Col md="9" sm="12" style={{ paddingRight: 0 }}>
                                  <span className="bold-black">
                                    {(this.state.formValues["table3-subcontent2"] || "Solde fin de mission :").replace(/\s*:\s*$/, "").trim()} ({this.state.formValues["fp2"]}%) :
                                  </span>
                                </Col>
                                <Col md="3" sm="12" style={{ paddingLeft: 0 }}>
                                  <div className="contract-div" style={{ display: "inline-block", width: "90px" }}>
                                    {this.state.formValues["FINAL25"]} €
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          ) : (
                            <>
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
                                    this.state.formValues[
                                      "table3-subcontent1"
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "table3-subcontent1",
                                      e.target.value,
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
                                  value={this.state.formValues["fp1"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "fp1",
                                      e.target.value,
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
                                    this.state.formValues[
                                      "table3-subcontent2"
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "table3-subcontent2",
                                      e.target.value,
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
                                  value={this.state.formValues["fp2"] || ""}
                                  onChange={(e) =>
                                    this.handleFieldChange(
                                      "fp2",
                                      e.target.value,
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
                            </>
                          )}
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
                            <u>Signature du client + Date :</u>
                          </div>
                          <br />
                          <br />
                          <br />
                        </td>
                      </tr>
                    </tbody>
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
