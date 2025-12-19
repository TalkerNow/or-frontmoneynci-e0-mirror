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
} from "react-feather";
import { history } from "../../../../history";
import axios from "axios";
import { ContextLayout } from "../../../../utility/context/Layout";
import "../../../../assets/scss/pages/users.scss";
import Moment from "react-moment";
import SweetAlert from "react-bootstrap-sweetalert";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent";

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning",
};

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
  };

  async componentDidMount() {
    this.fetchData();
  }

  fetchData = async () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    try {
      const response = await axios.get(
        global.config.server_url + "/documents/user/" + this.props.id,
        Config
      );
      this.setState({ rowData: response.data });
    } catch (error) {
      console.error("Error fetching contracts:", error);
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
        Config
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
        (k) => !payload[k] || String(payload[k]).trim() === ""
      );
      if (missing.length)
        throw new Error("Champs manquants: " + missing.join(", "));
      await axios.post(
        global.config.server_url + "/docusign/request-signature",
        payload,
        Config
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
          Config
        );
        if (res.data && Array.isArray(res.data)) {
          const suivi = res.data.find((s) => s.facture_id === id);
          if (suivi) {
            await axios.delete(
              global.config.server_url + "/suivi-avancement/" + suivi.id,
              Config
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
      <div className={`d-flex align-items-center font-weight-bold ${color}`} style={{ fontSize: '0.95rem' }}>
        {icon}
        <span className="mr-2">{amount} €</span>
        <span style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: 'normal' }}>({text})</span>
      </div>
    );
  };

  renderContractCard = (contract) => {
    const isTerminated = contract.document_state === "Terminé";
    const statusPayment = contract.status_payment || 0;

    // Logic from original code for payment coloration
    const isAcomptePaid = statusPayment >= 1;
    const isAcompteProblem = !isAcomptePaid && (contract.document_state === "Terminé" || contract.document_state === "En cours");

    const isSoldePaid = statusPayment === 2; // Assuming 2 means fully paid
    const isSoldeProblem = !isSoldePaid && contract.document_state === "Terminé";

    // Style for darker grey text
    const darkGreyStyle = { color: '#4b4b4b' };
    const labelStyle = { fontSize: '10px', letterSpacing: '1px', color: '#4b4b4b', fontWeight: 'bold' };

    return (
      <Card key={contract.id} className={`mb-2 border shadow-sm ${isTerminated ? 'border-success' : ''}`} style={{ transition: '0.3s', borderRadius: '12px' }}>
        <CardBody className="p-3">
          <Row>
            {/* Header / Main Info */}
            <Col md="12" className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center">
                <div>
                  <h5
                    className="mb-0 font-weight-bold cursor-pointer text-primary"
                    onClick={() => history.push("/pages/contract/" + contract.id)}
                    title="Ouvrir le contrat"
                  >
                    {contract.comment}
                  </h5>
                  <div className="d-flex align-items-center small mt-1" style={darkGreyStyle}>
                    <Calendar size={12} className="mr-1" />
                    <Moment format="DD/MM/YYYY HH:mm" date={contract.created_at} />
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <Badge color={isTerminated ? "success" : "light-info"} className="mr-3" style={{ fontSize: '12.5px', borderRadius: '4px', padding: '8px 12px' }}>
                  {(contract.document_state || "").toUpperCase()}
                </Badge>
                <Button.Ripple
                  className="btn-icon rounded-circle"
                  color="flat-danger"
                  size="sm"
                  onClick={() => this.handleAlert("defaultAlert", true, contract.id)}
                  id={`delete-btn-${contract.id}`}
                >
                  <Trash2 size={18} />
                </Button.Ripple>
                <UncontrolledTooltip placement="top" target={`delete-btn-${contract.id}`}>
                  Supprimer le contrat
                </UncontrolledTooltip>
              </div>
            </Col>

            {/* Separator */}
            <Col md="12"><hr className="my-2" /></Col>

            {/* Details Grid */}
            <Col md="4" className="d-flex flex-column justify-content-center border-right">
              <span className="text-uppercase mb-1" style={labelStyle}>Services</span>
              {this.renderServices(contract.subscribe_services)}
            </Col>

            <Col md="8">
              <Row>
                <Col sm="6" className="mb-2 mb-sm-0">
                  <span className="d-block text-uppercase mb-1" style={labelStyle}>Acompte</span>
                  {this.getPaymentStatus(contract.pre_payment, isAcomptePaid, isAcompteProblem)}
                </Col>
                <Col sm="6">
                  <span className="d-block text-uppercase mb-1" style={labelStyle}>Solde</span>
                  {this.getPaymentStatus(contract.end_payment, isSoldePaid, isSoldeProblem)}
                </Col>
              </Row>
            </Col>
          </Row>
        </CardBody>
      </Card>
    );
  }

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
              onClick={() => history.push("/pages/create-contract/" + this.props.id)}
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
                  <p className="text-muted">Créez un nouveau contrat pour commencer.</p>
                </CardBody>
              </Card>
            ) : (
              <div className="contract-list">
                {rowData.map(contract => this.renderContractCard(contract))}
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
