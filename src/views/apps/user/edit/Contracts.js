/* eslint-disable */

import React from "react";
import {
  Row,
  Col,
  Button,
  Card,
  CardBody,
  Spinner,
  Badge,
  UncontrolledTooltip,
} from "reactstrap";
import {
  Trash2,
  FolderPlus,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  DollarSign,
  TrendingUp,
  Download,
} from "react-feather";
import { history } from "../../../../history";
import axios from "axios";
import { ContextLayout } from "../../../../utility/context/Layout";
import "../../../../assets/scss/pages/users.scss";
import "../../../../assets/scss/pages/contract.scss";
import Moment from "react-moment";
import moment from "moment";
import SweetAlert from "react-bootstrap-sweetalert";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent";
import jsPDF from "jspdf";
import { toast } from "react-toastify";

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

import ContractStatusPath from "../../../../components/ContractStatusPath";

class Contracts extends React.Component {
  state = {
    // Alerts
    defaultAlert: false,
    IdToDelete: 0,

    // Data
    rowData: null,
    // pageSize: 20, // Not needed for list view unless we add pagination later

    // DocuSign
    requestingSignature: false,
    signatureAlertSuccess: false,
    signatureAlertError: { show: false, message: "" },

    // Download
    downloadingContractId: null,

    // Suivis for date calculations
    suivis: [],
  };

  async componentDidMount() {
    this.fetchData();
  }

  fetchData = async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    try {
      const [docsRes, suivisRes] = await Promise.all([
        axios.get(
          global.config.server_url + "/documents/user/" + this.props.id,
          Config,
        ),
        axios.get(
          global.config.server_url +
            "/suivi-avancement/client/" +
            this.props.id,
          Config,
        ),
      ]);

      this.setState({
        rowData: docsRes.data,
        suivis: Array.isArray(suivisRes.data) ? suivisRes.data : [],
      });
    } catch (error) {
      console.error("Error fetching contracts/suivis:", error);
    }
  };

  // DocuSign
  requestSignature = async () => {
    this.setState({
      requestingSignature: true,
      signatureAlertError: { show: false, message: "" },
    });
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    try {
      const userRes = await axios.get(
        global.config.server_url + "/users/" + this.props.id,
        Config,
      );
      const u = userRes.data || {};
      const payload = {
        kind: "procuration",
        embedded: false,
        user_id: u.id,
        birth_date: u.birth_date || "",
        nir_body: (u.secu_social || "").toString(),
        nir_key: (u.secu_social_key || "").toString(),
        address: u.personal_address || "",
        address2: u.personal_address_2 || "",
        zip: u.personal_zip_code != null ? String(u.personal_zip_code) : "",
        city: u.personal_city || "",
        country: u.personal_country || "",
      };
      const required = [
        "user_id",
        "birth_date",
        "nir_body",
        "nir_key",
        "address",
        "zip",
        "city",
        "country",
      ];
      const missing = required.filter(
        (k) => !payload[k] || String(payload[k]).trim() === "",
      );
      if (missing.length)
        throw new Error("Champs manquants: " + missing.join(", "));
      await axios.post(
        global.config.server_url + "/docusign/request-signature",
        payload,
        Config,
      );
      this.setState({ signatureAlertSuccess: true });
    } catch (err) {
      const message =
        (err &&
          err.response &&
          err.response.data &&
          (err.response.data.message || err.response.data.error)) ||
        err.message ||
        "Erreur inconnue";
      this.setState({ signatureAlertError: { show: true, message } });
    } finally {
      this.setState({ requestingSignature: false });
    }
  };

  deleteDoc = async (id) => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    try {
      // 1. Try to find and delete associated suivi
      try {
        const client_id = this.props.id;
        const res = await axios.get(
          global.config.server_url + "/suivi-avancement/client/" + client_id,
          Config,
        );
        if (res.data && Array.isArray(res.data)) {
          const suivi = res.data.find((s) => s.facture_id === id);
          if (suivi) {
            await axios.delete(
              global.config.server_url + "/suivi-avancement/" + suivi.id,
              Config,
            );
          }
        }
      } catch (err) {
        console.warn("Could not delete associated suivi or none found", err);
      }

      // 2. Delete the document
      await axios.delete(global.config.server_url + "/documents/" + id, Config);
      // Refresh data locally
      this.setState((prevState) => ({
        rowData: prevState.rowData.filter((row) => row.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value });
    if (id !== 0) this.setState({ IdToDelete: id });
    if (state === "confirmAlert" && value === true) {
      this.deleteDoc(this.state.IdToDelete);
      this.setState({ defaultAlert: false });
    }
  };

  // Direct PDF download
  downloadContract = async (contractId) => {
    this.setState({ downloadingContractId: contractId });

    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };

    try {
      // Fetch complete contract data
      const response = await axios.get(
        global.config.server_url + "/get_contract/" + contractId,
        Config,
      );

      const contract = response.data.data;
      if (!contract) {
        throw new Error("Contrat introuvable");
      }

      // Parse values
      const values = contract.values ? JSON.parse(contract.values) : {};
      const firstName = contract.first_name || "";
      const lastName = contract.last_name || "";

      // Get services list
      const services = (contract.subscribe_services || "")
        .replaceAll('"', "")
        .trim()
        .split("/")
        .filter((s) => s && s.trim() !== "");

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(115, 103, 240); // Primary purple
      pdf.text("Contrat - EOR Consultants", pageWidth / 2, y, {
        align: "center",
      });
      y += 15;

      // Client info
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Client: ${firstName} ${lastName}`, 20, y);
      y += 10;

      // Contract date
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      if (contract.created_at) {
        const createdDate = new Date(contract.created_at).toLocaleDateString(
          "fr-FR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          },
        );
        pdf.text(`Date de création: ${createdDate}`, 20, y);
        y += 8;
      }

      // Status
      pdf.text(`Statut: ${contract.document_state || "Non défini"}`, 20, y);
      y += 12;

      // Services
      if (services.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Prestations:", 20, y);
        y += 8;

        pdf.setFontSize(10);
        services.forEach((service) => {
          pdf.text(`• ${service.trim()}`, 25, y);
          y += 6;
        });
        y += 5;
      }

      // Financial summary
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Résumé financier:", 20, y);
      y += 8;

      pdf.setFontSize(10);
      const totalTTC = values.TOTALTTC || contract.advanced_payment || 0;
      const acompte = values.FINAL75 || contract.pre_payment || 0;
      const solde = values.FINAL25 || contract.end_payment || 0;
      const tva = values.TVAP || 20;

      pdf.text(`Total TTC: ${Number(totalTTC).toFixed(2)} €`, 25, y);
      y += 6;
      pdf.text(
        `Acompte (${values.fp1 || 75}%): ${Number(acompte).toFixed(2)} €`,
        25,
        y,
      );
      y += 6;
      pdf.text(
        `Solde (${values.fp2 || 25}%): ${Number(solde).toFixed(2)} €`,
        25,
        y,
      );
      y += 6;
      pdf.text(`TVA: ${tva}%`, 25, y);
      y += 12;

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        "Document généré automatiquement - EOR Consultants",
        pageWidth / 2,
        280,
        { align: "center" },
      );

      // Generate filename
      let serviceString = "Dossier";
      if (services.length === 1) {
        serviceString = services[0].trim();
      } else if (services.length === 2) {
        serviceString = `${services[0].trim()} + ${services[1].trim()}`;
      } else if (services.length > 2) {
        serviceString = `${services[0].trim()} et autres`;
      }
      const fileName = `${serviceString} ${firstName} ${lastName} - EOR Consultants.pdf`;

      pdf.save(fileName);
      toast.success("Contrat téléchargé avec succès !");
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement du contrat");
    } finally {
      this.setState({ downloadingContractId: null });
    }
  };

  // Helper to render services chips
  renderServices = (servicesString) => {
    if (!servicesString) return null;
    const services = servicesString.replaceAll('"', "").trim().split("/");
    return (
      <div className="d-flex flex-wrap mt-1">
        {services.map((service, index) => {
          if (!service) return null;
          return (
            <Chip
              key={index}
              className="mr-1 mb-1"
              color={chipColors[service.trim()] || "primary"}
              text={service}
            />
          );
        })}
      </div>
    );
  };

  // Helper to determine payment status display
  getPaymentStatus = (amount, isPaid, isProblem) => {
    let color = "text-warning";
    let icon = <Clock size={15} className="mr-1" />;
    let text = "En attente";

    if (isPaid) {
      color = "text-success";
      icon = <CheckCircle size={15} className="mr-1" />;
      text = "Payé";
    } else if (isProblem) {
      color = "text-danger";
      icon = <AlertCircle size={15} className="mr-1" />;
      text = "Non réglé";
    }

    return (
      <div
        className={`d-flex align-items-center font-weight-bold ${color}`}
        style={{ fontSize: "0.95rem" }}
      >
        {icon}
        <span className="mr-2">{amount} €</span>
        <span
          style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: "normal" }}
        >
          ({text})
        </span>
      </div>
    );
  };

  renderContractCard = (contract) => {
    const isTerminated = contract.document_state === "Terminé";
    const statusPayment = contract.status_payment || 0;

    // --- ALERT LOGIC ---
    // --- ALERT LOGIC ---
    // 1. Detect CH properly
    const services = contract.subscribe_services
      ? contract.subscribe_services.toUpperCase()
      : "";
    const isCH = services.includes("CH");

    // 2. Find associated Suivi logic -> Facturation Date (Step 3 for CH) or try to find "Facturation" label if logic differs
    // Based on SuiviAvancementBox.js, CH has Facturation at Step 3.
    let dateFacturation = null;
    if (this.state.suivis && this.state.suivis.length > 0) {
      const suivi = this.state.suivis.find((s) => s.facture_id === contract.id);
      if (suivi) {
        // Step 3 is Facturation for CH
        if (suivi.step3_completed_at) {
          dateFacturation = suivi.step3_completed_at;
        }
      }
    }

    const daysLate = dateFacturation
      ? moment().diff(moment(dateFacturation), "days")
      : 0;

    // --- Synchronisation Données (Source of Truth : EditContract logic) ---
    // 1. Parsing des données
    let values = {};
    try {
      values = contract.values ? JSON.parse(contract.values) : {};
    } catch (e) {
      console.warn("Error parsing contract values", e);
    }

    let acompteDates = [];
    try {
      acompteDates = contract.acompte_dates
        ? typeof contract.acompte_dates === "string"
          ? JSON.parse(contract.acompte_dates)
          : contract.acompte_dates
        : [];
    } catch (e) {
      console.warn("Error parsing acompte dates", e);
    }

    let soldDates = [];
    try {
      soldDates = contract.sold_dates
        ? typeof contract.sold_dates === "string"
          ? JSON.parse(contract.sold_dates)
          : contract.sold_dates
        : [];
    } catch (e) {
      console.warn("Error parsing sold dates", e);
    }

    // 2. Calculs
    // Prioritize advanced_payment (DB Column) as it's the source of truth from EditContract save
    const totalTTC =
      parseFloat(contract.advanced_payment) || parseFloat(values.TOTALTTC) || 0;
    const fp1 = values.fp1 || 0;
    const fp2 = values.fp2 || 0;

    const amountAcompte = (totalTTC * fp1) / 100;
    const amountTotalSolde = (totalTTC * fp2) / 100;

    let totalPaid = 0;

    // Smart logic for Acompte
    const fixedAcomptes = acompteDates.filter(
      (d) => d && typeof d === "object" && d.amount !== undefined,
    );
    const sumFixedAcomptes = fixedAcomptes.reduce(
      (acc, d) => acc + parseFloat(d.amount || 0),
      0,
    );
    const unFixedAcomptesCount = acompteDates.length - fixedAcomptes.length;
    let amountPerAcompte = 0;
    if (unFixedAcomptesCount > 0) {
      amountPerAcompte =
        (amountAcompte - sumFixedAcomptes) / unFixedAcomptesCount;
    }

    acompteDates.forEach((d) => {
      if (d && typeof d === "object" && d.is_paid) {
        if (d.amount !== undefined) totalPaid += parseFloat(d.amount);
        else totalPaid += amountPerAcompte;
      }
    });

    // Smart logic for Solde
    const fixedSoldes = soldDates.filter(
      (d) => d && typeof d === "object" && d.amount !== undefined,
    );
    const sumFixedSoldes = fixedSoldes.reduce(
      (acc, d) => acc + parseFloat(d.amount || 0),
      0,
    );
    const unFixedSoldesCount = soldDates.length - fixedSoldes.length;
    let amountPerSolde = 0;
    if (unFixedSoldesCount > 0) {
      amountPerSolde = (amountTotalSolde - sumFixedSoldes) / unFixedSoldesCount;
    }

    soldDates.forEach((d) => {
      if (d && typeof d === "object" && d.is_paid) {
        if (d.amount !== undefined) totalPaid += parseFloat(d.amount);
        else totalPaid += amountPerSolde;
      }
    });

    const totalRemaining = totalTTC - totalPaid;
    const isFullyPaid = totalPaid >= totalTTC - 0.01;

    // Use totalRemaining from local calc instead of contract.remaining_amount
    const showLateAlert = isCH && totalRemaining > 0 && daysLate > 0;

    // 3. Status logic (for colors)
    const isAcomptePaid = totalPaid >= amountAcompte && amountAcompte > 0;
    // Si tout est payé, on est bon. Sinon si Terminé/En cours et rien payé -> Problème.
    const isAcompteProblem =
      totalPaid < amountAcompte &&
      (contract.document_state === "Terminé" ||
        contract.document_state === "En cours");

    const isSoldeProblem =
      !isFullyPaid && contract.document_state === "Terminé";

    // 4. Get Last Payment Date logic
    let allPaidDates = [];
    if (Array.isArray(acompteDates)) {
      acompteDates.forEach((d) => {
        if (d && d.is_paid && d.date) allPaidDates.push(d.date);
      });
    }
    if (Array.isArray(soldDates)) {
      soldDates.forEach((d) => {
        if (d && d.is_paid && d.date) allPaidDates.push(d.date);
      });
    }
    // Sort ascending (chronological) to show history: 1st payment, 2nd payment...
    allPaidDates.sort((a, b) => new Date(a) - new Date(b));
    // Take max 4 dates
    const displayDates = allPaidDates.slice(0, 4);

    // Style for darker grey text
    const darkGreyStyle = { color: "#4b4b4b" };
    const labelStyle = {
      fontSize: "10px",
      letterSpacing: "1px",
      color: "#4b4b4b",
      fontWeight: "bold",
    };

    return (
      <Card
        key={contract.id}
        className={`mb-2 border shadow-sm ${isTerminated ? "border-success" : ""}`}
        style={{ transition: "0.3s", borderRadius: "12px" }}
      >
        <CardBody className="p-3">
          {/* ZONE 1 : SALESFORCE PATH (TOP FULL WIDTH BANNER) */}
          <div
            className="w-100 mb-3 shadow-sm"
            style={{ borderRadius: "8px", overflow: "hidden" }}
          >
            <ContractStatusPath
              status={contract.document_state}
              readOnly={true}
            />
          </div>

          <Row className="align-items-center">
            {/* Header / Main Info */}
            <Col
              md="12"
              className="d-flex justify-content-between align-items-center mb-3"
            >
              <div className="d-flex align-items-center">
                <div>
                  <h4
                    className="mb-0 font-weight-bolder cursor-pointer text-primary"
                    style={{ fontSize: "1.2rem" }}
                    onClick={() =>
                      history.push("/pages/contract/" + contract.id)
                    }
                    title="Ouvrir le contrat"
                  >
                    {(contract.comment || "").replace(
                      /^(Contrat|Contract) de\s+/i,
                      "",
                    )}
                  </h4>
                  <div
                    className="d-flex align-items-center small mt-1"
                    style={{ ...darkGreyStyle }}
                  >
                    <Calendar size={12} className="mr-1" />
                    <span>Crée le&nbsp;</span>
                    <Moment format="DD/MM/YYYY" date={contract.created_at} />
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <Button.Ripple
                  className="btn-icon rounded-circle mr-1"
                  color="flat-primary"
                  size="md"
                  style={{ backgroundColor: "rgba(115, 103, 240, 0.05)" }}
                  onClick={() =>
                    history.push(
                      "/pages/contract/" + contract.id + "?download=true",
                    )
                  }
                  id={`download-btn-${contract.id}`}
                  title="Télécharger le contrat"
                >
                  <Download size={20} />
                </Button.Ripple>
                <UncontrolledTooltip
                  placement="top"
                  target={`download-btn-${contract.id}`}
                >
                  Télécharger le contrat
                </UncontrolledTooltip>
                <Button.Ripple
                  className="btn-icon rounded-circle"
                  color="flat-danger"
                  size="md"
                  style={{ backgroundColor: "rgba(234, 84, 85, 0.05)" }}
                  onClick={() =>
                    this.handleAlert("defaultAlert", true, contract.id)
                  }
                  id={`delete-btn-${contract.id}`}
                >
                  <Trash2 size={20} />
                </Button.Ripple>
                <UncontrolledTooltip
                  placement="top"
                  target={`delete-btn-${contract.id}`}
                >
                  Supprimer le contrat
                </UncontrolledTooltip>
              </div>
            </Col>

            {/* Details Grid */}
            <Col
              md="4"
              className="d-flex flex-column justify-content-center border-right"
            >
              <div className="d-flex align-items-center mb-1">
                <TrendingUp size={14} className="mr-1 text-primary" />
                <span className="text-uppercase" style={{ ...labelStyle }}>
                  Services
                </span>
              </div>
              {this.renderServices(contract.subscribe_services)}
            </Col>

            <Col md="8">
              {/* LIGNE TOTAUX SIMPLIFIÉE & RESPONSIVE */}
              <div className="d-flex flex-wrap align-items-center bg-light-secondary rounded p-2 w-100 justify-content-between">
                {/* 1. PAYÉ */}
                <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                  <div>
                    <span
                      className="text-grey font-weight-bolder mr-1"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Payé :
                    </span>
                    <span
                      className="text-success font-weight-bold"
                      style={{ fontSize: "1.1em", whiteSpace: "nowrap" }}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format(totalPaid)}
                    </span>
                  </div>

                  {/* Ligne Date (NOUVEAU - Liste des paiements) */}
                  {displayDates.length > 0 && totalPaid > 0 && (
                    <div className="d-flex flex-column align-items-center mt-1">
                      {displayDates.map((date, index) => (
                        <div
                          key={index}
                          className="d-flex align-items-center"
                          style={{
                            fontSize: "11px",
                            lineHeight: "1.4",
                            color: "#4b4b4b",
                          }}
                        >
                          <CheckCircle
                            size={10}
                            className="mr-1 text-success"
                          />
                          <span>
                            Reçu le <Moment format="DD/MM/YYYY" date={date} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Séparateur Vertical */}
                <div
                  className="border-left mx-2 d-none d-sm-block"
                  style={{ height: "20px", borderColor: "#d8d6de" }}
                ></div>

                {/* 2. RESTE */}
                <div className="d-flex flex-column align-items-center flex-grow-1 justify-content-center">
                  <div className="d-flex align-items-center">
                    <span
                      className="text-grey font-weight-bolder mr-1"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Reste :
                    </span>
                    <span
                      className="text-danger font-weight-bold"
                      style={{ fontSize: "1.1em", whiteSpace: "nowrap" }}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format(Math.max(0, totalRemaining))}
                    </span>
                  </div>
                  {/* ALERTE RETARD (TEXTE SEUL) */}
                  {showLateAlert && (
                    <div
                      className="mt-1 text-center"
                      style={{ lineHeight: "1.2" }}
                    >
                      {/* Ligne 1 : Le Constat */}
                      <div
                        className="text-danger font-weight-bold"
                        style={{ fontSize: "11px" }}
                      >
                        Retard de {daysLate} jours
                      </div>
                      {/* Ligne 2 : La Preuve (Date) - légèrement plus petit */}
                      <div className="text-danger" style={{ fontSize: "10px" }}>
                        depuis le{" "}
                        <Moment format="DD/MM/YYYY" date={dateFacturation} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Séparateur Vertical */}
                <div
                  className="border-left mx-2 d-none d-sm-block"
                  style={{ height: "20px", borderColor: "#d8d6de" }}
                ></div>

                {/* 3. TOTAL */}
                <div className="d-flex align-items-center flex-grow-1 justify-content-center">
                  <span
                    className="text-dark font-weight-bolder mr-1"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Total :
                  </span>
                  <span
                    className="text-dark font-weight-bolder"
                    style={{ fontSize: "1.1em", whiteSpace: "nowrap" }}
                  >
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(totalTTC)}
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    );
  };

  render() {
    const { rowData } = this.state;
    return (
      <div>
        {/* Alertes */}
        <SweetAlert
          title="Êtes-vous sûr ?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          cancelBtnBsStyle="primary"
          confirmBtnBsStyle="danger"
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
          onConfirm={() => this.handleAlert("confirmAlert", true, 0)}
          onCancel={() => this.setState({ defaultAlert: false })}
        >
          Cette action est irréversible.
        </SweetAlert>

        <SweetAlert
          success
          title="Demande envoyée"
          show={this.state.signatureAlertSuccess}
          onConfirm={() => this.setState({ signatureAlertSuccess: false })}
        >
          La demande de signature DocuSign a bien été envoyée.
        </SweetAlert>

        <SweetAlert
          danger
          title="Erreur"
          show={this.state.signatureAlertError.show}
          onConfirm={() =>
            this.setState({ signatureAlertError: { show: false, message: "" } })
          }
        >
          {this.state.signatureAlertError.message}
        </SweetAlert>

        {/* Actions Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <h2 className="content-header-title float-left mb-0">Contrats</h2>
          <div className="actions-right">
            <Button.Ripple
              className="mr-2 shadow-sm"
              color="primary"
              onClick={() =>
                history.push("/pages/create-contract/" + this.props.id)
              }
            >
              <FolderPlus size={16} className="mr-1" />
              Nouveau Contrat
            </Button.Ripple>
            <Button.Ripple
              className="shadow-sm"
              color="success"
              onClick={this.requestSignature}
              disabled={this.state.requestingSignature}
              outline
            >
              {this.state.requestingSignature ? (
                <Spinner size="sm" className="mr-1" />
              ) : (
                <FileText size={16} className="mr-1" />
              )}
              DocuSign Procuration
            </Button.Ripple>
          </div>
        </div>

        {/* Liste des contrats */}
        <Row>
          <Col sm="12">
            {!rowData ? (
              <div className="text-center p-5">
                <Spinner color="primary" />
              </div>
            ) : rowData.length === 0 ? (
              <Card>
                <CardBody className="text-center p-5">
                  <FolderPlus size={48} className="text-muted mb-2" />
                  <h4>Aucun contrat trouvé</h4>
                  <p className="text-muted">
                    Créez un nouveau contrat pour commencer.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="contract-list">
                {rowData.map((contract) => this.renderContractCard(contract))}
              </div>
            )}
          </Col>
        </Row>
      </div>
    );
  }
}

export default Contracts;
/* eslint-enable */
