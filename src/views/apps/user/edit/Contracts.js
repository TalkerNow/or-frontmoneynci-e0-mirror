/* eslint-disable */

import React from "react"
import {
  Row,
  Col,
  Button,
  Card,
  CardBody,
  Spinner
} from "reactstrap"
import { Trash2, FolderPlus } from "react-feather"
import { history } from "../../../../history"
import axios from "axios"
import { ContextLayout } from "../../../../utility/context/Layout"
import { AgGridReact } from "ag-grid-react"
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../../assets/scss/pages/users.scss"
import Moment from "react-moment"
import SweetAlert from "react-bootstrap-sweetalert"
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent"

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: "primary",
  RAC: "warning"
}

class Contracts extends React.Component {
  state = {
    // Alerts
    defaultAlert: false,
    IdToDelete: 0,

    // Data
    rowData: null,
    pageSize: 20,

    // Grid
    defaultColDef: { resizable: true, sortable: true },

    // DocuSign
    requestingSignature: false,
    signatureAlertSuccess: false,
    signatureAlertError: { show: false, message: "" },

    columnDefs: [
      {
        headerName: "Contrat",
        field: "comment",
        filter: true,
        width: 300,
        cellRendererFramework: params => (
          <div
            className="d-flex align-items-center cursor-pointer"
            onClick={() => history.push("/pages/contract/" + params.data.id)}
          >
            <span>{params.data.comment}</span>
          </div>
        )
      },
      {
        headerName: "Prestation",
        field: "subscribe_services",
        filter: true,
        width: 220,
        cellRendererFramework: params => {
          const subscribe_service = params.data.subscribe_services
          if (!subscribe_service) return <div />
          const tags = []
          const list = subscribe_service.replaceAll('"', "").trim().split("/")
          list.forEach(service => {
            if (!service) return
            tags.push(
              <Chip
                className="m-0 text-center ml-1"
                color={chipColors[service.trim()]}
                text={service}
                key={service + params.data.id}
              />
            )
          })
          return <>{tags}</>
        }
      },
      {
        headerName: "Montant",
        field: "advanced_payment",
        filter: true,
        width: 150,
        cellRendererFramework: params => (
          <div className="d-flex align-items-center cursor-pointer">
            <span>{params.data.advanced_payment + " €"}</span>
          </div>
        )
      },
      {
        headerName: "Acompte",
        field: "pre_payment",
        filter: true,
        width: 150,
        cellRendererFramework: params => {
          const red = (
            <div className="d-flex align-items-center cursor-pointer text-danger">
              <span>{params.data.pre_payment + " €"}</span>
            </div>
          )
          const green = (
            <div className="d-flex align-items-center cursor-pointer text-success">
              <span>{params.data.pre_payment + " €"}</span>
            </div>
          )
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment >= 1) return green
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment < 1) return red
          return (
            <div className="d-flex align-items-center cursor-pointer">
              <span>{params.data.pre_payment + " €"}</span>
            </div>
          )
        }
      },
      {
        headerName: "Solde",
        field: "end_payment",
        filter: true,
        width: 150,
        cellRendererFramework: params => {
          const red = (
            <div className="d-flex align-items-center cursor-pointer text-danger">
              <span>{params.data.end_payment + " €"}</span>
            </div>
          )
          const green = (
            <div className="d-flex align-items-center cursor-pointer text-success">
              <span>{params.data.end_payment + " €"}</span>
            </div>
          )
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment == 2) return green
          if (params.data.document_state == "Termine" && params.data.status_payment < 2) return red
          return (
            <div className="d-flex align-items-center cursor-pointer">
              <span>{params.data.end_payment + " €"}</span>
            </div>
          )
        }
      },
      {
        headerName: "État",
        field: "document_state",
        filter: true,
        width: 170,
        cellRendererFramework: params =>
          params.data.user && (
            <div className="d-flex align-items-center cursor-pointer">
              <span>{params.data.document_state}</span>
            </div>
          )
      },
      {
        headerName: "Date de création",
        field: "date",
        filter: true,
        width: 200,
        cellRendererFramework: params => (
          <div>
            <Moment format="DD-MM-YYYY HH:mm" date={params.data.created_at} utc />
          </div>
        )
      },
      {
        headerName: "Actions",
        field: "transactions",
        width: 120,
        cellRendererFramework: params => (
          <div className="actions cursor-pointer">
            <Trash2 size={15} onClick={() => this.handleAlert("defaultAlert", true, params.data.id)} />
          </div>
        )
      }
    ]
  }

  async componentDidMount() {
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
    const response = await axios.get(global.config.server_url + "/documents/user/" + this.props.id, Config)
    this.setState({ rowData: response.data })
  }

  // DocuSign
  requestSignature = async () => {
    this.setState({ requestingSignature: true, signatureAlertError: { show: false, message: "" } })
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
    try {
      const userRes = await axios.get(global.config.server_url + "/users/" + this.props.id, Config)
      const u = userRes.data || {}
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
        country: u.personal_country || ""
      }
      const required = ["user_id", "birth_date", "nir_body", "nir_key", "address", "zip", "city", "country"]
      const missing = required.filter(k => !payload[k] || String(payload[k]).trim() === "")
      if (missing.length) throw new Error("Champs manquants: " + missing.join(", "))
      await axios.post(global.config.server_url + "/docusign/request-signature", payload, Config)
      this.setState({ signatureAlertSuccess: true })
    } catch (err) {
      const message = (err && err.response && err.response.data && (err.response.data.message || err.response.data.error)) || err.message || "Erreur inconnue"
      this.setState({ signatureAlertError: { show: true, message } })
    } finally {
      this.setState({ requestingSignature: false })
    }
  }

  deleteDoc = id => {
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
    axios.delete(global.config.server_url + "/documents/" + id, Config)
  }

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value })
    if (id !== 0) this.setState({ IdToDelete: id })
    if (state === "confirmAlert" && value === true) {
      this.deleteDoc(this.state.IdToDelete)
      const SelectedData = this.gridApi.getSelectedRows()
      this.gridApi.updateRowData({ remove: SelectedData })
    }
  }

  onGridReady = params => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
  }

  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state
    return (
      <div>
        {/* Alertes */}
        <SweetAlert
          title="Êtes vous sûrs?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          cancelBtnBsStyle="danger"
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
          onConfirm={() => this.handleAlert("confirmAlert", true, 0)}
          onCancel={() => this.setState({ defaultAlert: false })}
        >
          Vous ne pourrez pas revenir en arrière
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
          title="Erreur lors de l'envoi"
          show={this.state.signatureAlertError.show}
          onConfirm={() => this.setState({ signatureAlertError: { show: false, message: "" } })}
        >
          {this.state.signatureAlertError.message}
        </SweetAlert>

        {/* Contenu minimal : actions principales + grille */}
        <Row className="app-user-list">
          <Col sm="12">
            <Card>
              <CardBody>
                <div className="ag-theme-material ag-grid-table">
                  <div className="ag-grid-actions d-flex flex-wrap mb-1">
                    <div className="filter-actions d-flex">
                      <div>
                        <Button.Ripple
                          className="mr-1 mb-1"
                          outline
                          color="primary"
                          onClick={() => history.push("/pages/create-contract/" + this.props.id)}
                        >
                          <FolderPlus size={15} /> Contrat
                        </Button.Ripple>
                      </div>

                      <div>
                        <Button.Ripple
                          className="mr-1 mb-1"
                          color="success"
                          onClick={this.requestSignature}
                          disabled={this.state.requestingSignature}
                        >
                          {this.state.requestingSignature && <Spinner size="sm" className="mr-50" />}
                          DocuSign procuration EOR
                        </Button.Ripple>
                      </div>
                    </div>
                  </div>

                  {rowData !== null ? (
                    <ContextLayout.Consumer>
                      {context => (
                        <AgGridReact
                          gridOptions={{}}
                          rowSelection="multiple"
                          defaultColDef={defaultColDef}
                          columnDefs={columnDefs}
                          rowData={rowData}
                          onGridReady={this.onGridReady}
                          colResizeDefault={"shift"}
                          animateRows={true}
                          floatingFilter={true}
                          pagination={true}
                          pivotPanelShow="always"
                          paginationPageSize={pageSize}
                          resizable={true}
                          enableRtl={context.state.direction === "rtl"}
                        />
                      )}
                    </ContextLayout.Consumer>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }
}

export default Contracts
/* eslint-disable */
