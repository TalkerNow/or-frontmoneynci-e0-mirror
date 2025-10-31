/* eslint-disable */

import React from "react"
import {
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Button,
  Card,
  CardHeader,
  Collapse,
  CardBody, Spinner, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, UncontrolledButtonDropdown
} from "reactstrap"
import {
  Edit, Trash2, ChevronDown, RotateCw, X, Home, FolderPlus
} from "react-feather"
import { history } from "../../../../history";
import axios from "axios";
import classnames from "classnames";
import { ContextLayout } from "../../../../utility/context/Layout";
import { AgGridReact } from "ag-grid-react";
import "../../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../../assets/scss/pages/users.scss"
import Moment from "react-moment";
import SweetAlert from "react-bootstrap-sweetalert";
import Chip from "../../../../../src/components/@vuexy/chips/ChipComponent"

const chipColors = {
  CH: "warning",
  SIMU: "success",
  AR: "primary",
  TFD: "danger",
  ACTU: 'primary',
  RAC: 'warning'
}

class Contracts extends React.Component {
  state = {
    defaultAlert: false,
    IdToDelete: 0,
    rowData: null,
    pageSize: 20,
    isVisible: true,
    reload: false,
    collapse: false,
    status: "Opened",
    role: "All",
    selectStatus: "All",
    verified: "All",
    department: "All",
    defaultColDef: {
      resizable: true,
      sortable: true
    },
    searchVal: "",
    // Nouveaux états pour la signature DocuSign
    requestingSignature: false,
    signatureAlertSuccess: false,
    signatureAlertError: { show: false, message: "" },

    columnDefs: [
      {
        headerName: "Contrat",
        field: "comment",
        filter: true,
        width: 300,
        cellRendererFramework: params => {
          return (
            <div
              className="d-flex align-items-center cursor-pointer"
              onClick={() => history.push("/pages/contract/" + params.data.id)}
            >
              <span>{params.data.comment}</span>
            </div>
          )
        }
      },
      {
        headerName: "Prestation",
        field: "subscribe_services",
        filter: true,
        width: 220,
        cellRendererFramework: params => {
          return (
            <>
              {(() => {
                let subscribe_service = params.data.subscribe_services;
                if (subscribe_service === null || subscribe_service === "") {
                  return <div></div>;
                } else {
                  let lst_subscribe_services = subscribe_service.replaceAll('"', '').trim().split('/');
                  const tags = [];
                  lst_subscribe_services.forEach(function (service) {
                    if (service !== '') {
                      tags.push(<Chip
                        className="m-0 text-center ml-1"
                        color={chipColors[service.trim()]}
                        text={service}
                        key={service + params.data.id}
                      />);
                    }
                  })
                  return tags;
                }
              })()}
            </>
          )
        }
      },
      {
        headerName: "Montant",
        field: "advanced_payment",
        filter: true,
        width: 150,
        cellRendererFramework: params => {
          return (
            <div className="d-flex align-items-center cursor-pointer">
              <span>{params.data.advanced_payment + " €"}</span>
            </div>
          )
        }
      },
      {
        headerName: "Acompte",
        field: "pre_payment",
        filter: true,
        width: 150,
        cellRendererFramework: params => {
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment >= 1) {
            return (
              <div className="d-flex align-items-center cursor-pointer text-success">
                <span>{params.data.pre_payment + " €"}</span>
              </div>
            )
          } else if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment < 1) {
            return (
              <div className="d-flex align-items-center cursor-pointer text-danger">
                <span>{params.data.pre_payment + " €"}</span>
              </div>
            )
          } else {
            return (
              <div className="d-flex align-items-center cursor-pointer">
                <span>{params.data.pre_payment + " €"}</span>
              </div>
            )
          }
        }
      },
      {
        headerName: "solde",
        field: "end_payment",
        filter: true,
        width: 150,
        cellRendererFramework: params => {
          if ((params.data.document_state === "En cours" || params.data.document_state === "Termine") && params.data.status_payment == 2) {
            return (
              <div className="d-flex align-items-center cursor-pointer text-success">
                <span>{params.data.end_payment + " €"}</span>
              </div>
            )
          } else if (params.data.document_state == "Termine" && params.data.status_payment < 2) {
            return (
              <div className="d-flex align-items-center cursor-pointer text-danger">
                <span>{params.data.end_payment + " €"}</span>
              </div>
            )
          } else {
            return (
              <div className="d-flex align-items-center cursor-pointer">
                <span>{params.data.end_payment + " €"}</span>
              </div>
            )
          }
        }
      },
      {
        headerName: "Etat",
        field: "document_state",
        filter: true,
        width: 170,
        cellRendererFramework: params => {
          return (
            params.data.user &&
            <div className="d-flex align-items-center cursor-pointer">
              <span>{params.data.document_state}</span>
            </div>
          )
        }
      },
      {
        headerName: "Date de Création",
        field: "date",
        filter: true,
        width: 200,
        cellRendererFramework: params => {
          return (
            <div>
              <Moment format="DD-MM-YYYY HH:mm" date={params.data.created_at} utc />
            </div>
          )
        }
      },
      {
        headerName: "Actions",
        field: "transactions",
        width: 150,
        cellRendererFramework: params => {
          return (
            <div className="actions cursor-pointer">
              <Trash2
                size={15}
                onClick={() => { this.handleAlert("defaultAlert", true, params.data.id) }}
              />
            </div>
          )
        }
      }
    ]
  }

  async componentDidMount() {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    await axios.get(global.config.server_url + "/documents/user/" + this.props.id, Config).then(response => {
      let rowData = response.data
      this.setState({ rowData })
    })
  }

  // ======= NEW: envoyer la demande de signature DocuSign =======
  requestSignature = async () => {
    this.setState({ requestingSignature: true, signatureAlertError: { show: false, message: "" } })
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }

    try {
      // 1) Récupérer les infos du user
      const userRes = await axios.get(
        global.config.server_url + "/users/" + this.props.id,
        Config
      )
      const u = userRes.data || {}

      // 2) Construire le payload
      const payload = {
        kind: "procuration",
        embedded: false,
        user_id: u.id,
        birth_date: u.birth_date || "",
        nir_body: (u.secu_social || "").toString(),
        nir_key: (u.secu_social_key || "").toString(),
        address: u.personal_address || "",
        address2: u.personal_address_2 || "",
        zip: (u.personal_zip_code !== null && u.personal_zip_code !== undefined) ? String(u.personal_zip_code) : "",
        city: u.personal_city || "",
        country: u.personal_country || ""
      }

      // (Optionnel) petite validation locale minimale
      const requiredFields = ["user_id", "birth_date", "nir_body", "nir_key", "address", "zip", "city", "country"]
      const missing = requiredFields.filter(k => !payload[k] || String(payload[k]).trim() === "")
      if (missing.length) {
        throw new Error("Champs manquants: " + missing.join(", "))
      }

      // 3) POST vers l’endpoint DocuSign
      await axios.post(
        // même base que le reste de l'app pour respecter la config env
        global.config.server_url + "/docusign/request-signature",
        payload,
        Config
      )

      // 4) Succès
      this.setState({ signatureAlertSuccess: true })
    } catch (err) {
      const message =
        (err && err.response && err.response.data && (err.response.data.message || err.response.data.error)) ||
        err.message ||
        "Erreur inconnue"
      this.setState({ signatureAlertError: { show: true, message } })
    } finally {
      this.setState({ requestingSignature: false })
    }
  }
  // =============================================================

  deleteDoc(id) {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.delete(global.config.server_url + "/documents/" + id, Config).then(response => { })
  }

  handleAlert = (state, value, id) => {
    this.setState({ [state]: value })
    if (id !== 0)
      this.setState({ IdToDelete: id })
    if (state === "confirmAlert" && value === true) {
      this.deleteDoc(this.state.IdToDelete)
      var SelectedData = this.gridApi.getSelectedRows();
      this.gridApi.updateRowData({ remove: SelectedData })
    }
  }

  onGridReady = params => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
  }

  filterData = (column, val) => {
    var filter = this.gridApi.getFilterInstance(column)
    var modelObj = null
    if (val !== "all") {
      modelObj = {
        type: "equals",
        filter: val
      }
    }
    filter.setModel(modelObj)
    this.gridApi.onFilterChanged()
  }

  filterSize = val => {
    if (this.gridApi) {
      this.gridApi.paginationSetPageSize(Number(val))
      this.setState({
        pageSize: val
      })
    }
  }
  updateSearchQuery = val => {
    this.gridApi.setQuickFilter(val)
    this.setState({
      searchVal: val
    })
  }

  refreshCard = () => {
    this.setState({ reload: true })
    setTimeout(() => {
      this.setState({
        reload: false,
        role: "All",
        selectStatus: "All",
        verified: "All",
        department: "All"
      })
    }, 500)
  }

  toggleCollapse = () => {
    this.setState(state => ({ collapse: !state.collapse }))
  }
  onEntered = () => {
    this.setState({ status: "Opened" })
  }
  onEntering = () => {
    this.setState({ status: "Opening..." })
  }

  onEntered = () => {
    this.setState({ status: "Opened" })
  }
  onExiting = () => {
    this.setState({ status: "Closing..." })
  }
  onExited = () => {
    this.setState({ status: "Closed" })
  }
  removeCard = () => {
    this.setState({ isVisible: false })
  }
  handleDeleteAlert = (status, value, id) => {
    this.setState({ defaultAlert: value });
    if (id != 0)
      this.setState({ IdToDelete: id })
    if (value == false && status == "confirm") {
      this.deleteDoc(this.state.IdToDelete);
      var SelectedData = this.gridApi.getSelectedRows();
      this.gridApi.updateRowData({ remove: SelectedData })
    }
  }
  render() {
    const { rowData, columnDefs, defaultColDef, pageSize } = this.state
    return (
      <div>
        {/* Alerte delete existante */}
        <SweetAlert title="Êtes vous sûrs?"
          warning
          show={this.state.defaultAlert}
          showCancel
          reverseButtons
          cancelBtnBsStyle="danger"
          confirmBtnText="Oui, supprimer"
          cancelBtnText="Annuler"
          onConfirm={() => {
            this.handleDeleteAlert("confirm", false, 0)
          }}
          onCancel={() => {
            this.handleDeleteAlert("cancel", false, 0)
          }}
        >
          Vous ne pourrez pas revenir en arrière
        </SweetAlert>

        {/* NEW: Alertes pour la demande de signature */}
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

        <Row className="app-user-list">
          <Col sm="12">
            <Card
              className={classnames("card-action card-reload", {
                "d-none": this.state.isVisible === false,
                "card-collapsed": this.state.status === "Closed",
                closing: this.state.status === "Closing...",
                opening: this.state.status === "Opening...",
                refreshing: this.state.reload
              })}
            >
              <CardHeader>
                <h4>Contrats</h4>
                <div className="actions">
                  <ChevronDown
                    className="collapse-icon mr-50"
                    size={15}
                    onClick={this.toggleCollapse}
                  />
                  <RotateCw
                    className="mr-50"
                    size={15}
                    onClick={() => {
                      this.refreshCard()
                      this.gridApi.setFilterModel(null)
                    }}
                  />
                  <X size={15} onClick={this.removeCard} />
                </div>
              </CardHeader>
              <Collapse
                isOpen={this.state.collapse}
                onExited={this.onExited}
                onEntered={this.onEntered}
                onExiting={this.onExiting}
                onEntering={this.onEntering}
              >
                <CardBody>
                  {this.state.reload ? (
                    <Spinner color="primary" className="reload-spinner" />
                  ) : (
                    ""
                  )}
                  <Row>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="role">Rôle</Label>
                        <Input
                          type="select"
                          name="role"
                          id="role"
                          value={this.state.role}
                          onChange={e => {
                            this.setState(
                              { role: e.target.value },
                              () => this.filterData("role", this.state.role.toLowerCase())
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="User">User</option>
                          <option value="Staff">Staff</option>
                          <option value="Admin">Admin</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="status">Status</Label>
                        <Input
                          type="select"
                          name="status"
                          id="status"
                          value={this.state.selectStatus}
                          onChange={e => {
                            this.setState(
                              { selectStatus: e.target.value },
                              () => this.filterData("status", this.state.selectStatus.toLowerCase())
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="Active">Active</option>
                          <option value="Blocked">Blocked</option>
                          <option value="Deactivated">Deactivated</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="verified">Verified</Label>
                        <Input
                          type="select"
                          name="verified"
                          id="verified"
                          value={this.state.verified}
                          onChange={e => {
                            this.setState(
                              { verified: e.target.value },
                              () => this.filterData("is_verified", this.state.verified.toLowerCase())
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col lg="3" md="6" sm="12">
                      <FormGroup className="mb-0">
                        <Label for="department">Department</Label>
                        <Input
                          type="select"
                          name="department"
                          id="department"
                          value={this.state.department}
                          onChange={e => {
                            this.setState(
                              { department: e.target.value },
                              () => this.filterData("department", this.state.department.toLowerCase())
                            )
                          }}
                        >
                          <option value="All">All</option>
                          <option value="Sales">Sales</option>
                          <option value="Development">Development</option>
                          <option value="Management">Management</option>
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Collapse>
            </Card>
          </Col>

          <Col sm="12">
            <Card>
              <CardBody>
                <div className="ag-theme-material ag-grid-table">
                  <div className="ag-grid-actions d-flex justify-content-between flex-wrap mb-1">
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

                      {/* NEW: Bouton pour envoyer la demande de signature */}
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

                      <div className="dropdown mr-1 mb-1 d-inline-block">
                        <UncontrolledButtonDropdown>
                          <DropdownToggle color="primary" caret>
                            Actions
                            <ChevronDown size={15} />
                          </DropdownToggle>
                          <DropdownMenu right>
                            <DropdownItem tag="a">
                              <Home size={15} />
                              <span className="align-middle ml-50">Exemple d'action</span>
                            </DropdownItem>
                          </DropdownMenu>
                        </UncontrolledButtonDropdown>
                      </div>
                    </div>
                  </div>

                  {this.state.rowData !== null ? (
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
