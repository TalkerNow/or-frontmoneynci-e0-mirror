import React from "react"
import { Card, CardBody, CardHeader, CardTitle, Row, Col } from "reactstrap"
import { AgGridReact } from "ag-grid-react"
import { Edit2, Trash2, PlusCircle, Shield } from "react-feather"
import SweetAlert from "react-bootstrap-sweetalert"
import { toast } from "react-toastify"
import { Redirect } from "react-router-dom"
import { ContextLayout } from "../../../utility/context/Layout"
import api from "../../../services/api"
import ConsultantAccessFormModal from "./ConsultantAccessFormModal"
import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"

const AUTHORIZED_IDS = [4, 1271, 1638]

const BADGE = {
  none:    { background: "#f0f0f0", color: "#6e6b7b" },
  credits: { background: "#e8f4fd", color: "#1a73c8" },
  pass:    { background: "#e6f9f0", color: "#1b8a4e" },
}

const StatPill = ({ label, value, color }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "8px 18px", borderRadius: 10,
    background: "#f8f8f8", minWidth: 90,
  }}>
    <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{label}</span>
  </div>
)

class ConsultantAccessPage extends React.Component {
  state = {
    rowData: null,
    pageSize: 20,
    formOpen: false,
    selectedConsultant: null,
    confirmDeleteId: null,
    defaultColDef: {
      resizable: true,
      sortable: true,
      flex: 1,
      minWidth: 100,
      filter: false,
    },
    columnDefs: [
      {
        headerName: "Consultant",
        field: "name",
        minWidth: 160,
        flex: 2,
        valueGetter: (p) => p.data?.name || "—",
      },
      {
        headerName: "Email",
        field: "email",
        minWidth: 200,
        flex: 3,
        valueGetter: (p) => p.data?.email || "—",
      },
      {
        headerName: "Type d'accès",
        field: "access_type",
        minWidth: 140,
        flex: 1,
        cellStyle: { display: "flex", alignItems: "center" },
        cellRendererFramework: (p) => {
          if (!p.data?.access_id) {
            return (
              <span style={{
                ...BADGE.none, padding: "3px 10px",
                borderRadius: 20, fontSize: 12, fontWeight: 500,
              }}>Aucun accès</span>
            )
          }
          if (p.data.access_type === "unlimited_pass") {
            return (
              <span style={{
                ...BADGE.pass, padding: "3px 10px",
                borderRadius: 20, fontSize: 12, fontWeight: 500,
              }}>Pass illimité</span>
            )
          }
          return (
            <span style={{
              ...BADGE.credits, padding: "3px 10px",
              borderRadius: 20, fontSize: 12, fontWeight: 500,
            }}>Crédits</span>
          )
        },
      },
      {
        headerName: "Solde",
        minWidth: 140,
        flex: 1,
        valueGetter: (p) => {
          if (!p.data?.access_id) return "—"
          if (p.data.access_type === "credits") {
            return `${p.data.remaining_credits ?? 0} crédit(s)`
          }
          if (p.data.pass_expiration_date) {
            return `Exp. ${p.data.pass_expiration_date.slice(0, 10)}`
          }
          return "Illimité"
        },
      },
      {
        headerName: "Actions",
        minWidth: 110,
        width: 110,
        flex: 0,
        sortable: false,
        cellStyle: { display: "flex", alignItems: "center" },
        cellRendererFramework: (p) => (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {p.data?.access_id ? (
              <>
                <Edit2
                  size={15}
                  style={{ cursor: "pointer", color: "#7367f0" }}
                  title="Modifier l'accès"
                  onClick={() => this.openEdit(p.data)}
                />
                <Trash2
                  size={15}
                  style={{ cursor: "pointer", color: "#ea5455" }}
                  title="Supprimer l'accès"
                  onClick={() => this.setState({ confirmDeleteId: p.data.access_id })}
                />
              </>
            ) : (
              <PlusCircle
                size={17}
                style={{ cursor: "pointer", color: "#28c76f" }}
                title="Ajouter un accès"
                onClick={() => this.openAdd(p.data)}
              />
            )}
          </div>
        ),
      },
    ],
  }

  currentUserId = parseInt(localStorage.getItem("userid"), 10)

  sizeToFit = () => {
    if (this.gridApi) {
      try { this.gridApi.sizeColumnsToFit() } catch (e) {}
    }
  }

  onGridReady = (params) => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
    this.sizeToFit()
    window.addEventListener("resize", this.sizeToFit)
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.sizeToFit)
  }

  componentDidMount() {
    if (AUTHORIZED_IDS.includes(this.currentUserId)) {
      this.fetchData()
    }
  }

  fetchData = async () => {
    try {
      const res = await api.get("/v1/consultant-access")
      this.setState({ rowData: res.data })
    } catch {
      toast.error("Impossible de charger les consultants.")
      this.setState({ rowData: [] })
    }
  }

  openAdd  = (c) => this.setState({ formOpen: true, selectedConsultant: c })
  openEdit = (c) => this.setState({ formOpen: true, selectedConsultant: c })
  closeForm = () => this.setState({ formOpen: false, selectedConsultant: null })

  handleDelete = async () => {
    const id = this.state.confirmDeleteId
    this.setState({ confirmDeleteId: null })
    try {
      await api.delete(`/v1/consultant-access/${id}`)
      toast.success("Accès supprimé.")
      this.fetchData()
    } catch {
      toast.error("Erreur lors de la suppression.")
    }
  }

  render() {
    if (!AUTHORIZED_IDS.includes(this.currentUserId)) {
      return <Redirect to="/misc/not-authorized" />
    }

    const { rowData, columnDefs, defaultColDef, pageSize, formOpen, selectedConsultant, confirmDeleteId } = this.state

    const total      = rowData ? rowData.length : 0
    const avecAcces  = rowData ? rowData.filter(r => r.access_id).length : 0
    const sansAcces  = total - avecAcces

    return (
      <div>
        <Row className="app-user-list" style={{ height: "100vh" }}>
          <Col sm="12" className="h-100 d-flex flex-column">
            <Card className="h-100 d-flex flex-column">
              <CardHeader className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center" style={{ gap: 8 }}>
                    <Shield size={20} className="text-primary" />
                    <CardTitle tag="h5" className="mb-0">Gestion des accès consultants</CardTitle>
                  </div>
                </CardHeader>
              <CardBody className="d-flex flex-column" style={{ flex: 1, overflow: "hidden", paddingBottom: "1rem" }}>

                {/* Stats */}
                <div className="d-flex flex-wrap mb-2" style={{ gap: 10 }}>
                  <StatPill label="Total"       value={total}     color="#6e6b7b" />
                  <StatPill label="Avec accès"  value={avecAcces} color="#28c76f" />
                  <StatPill label="Sans accès"  value={sansAcces} color="#ea5455" />
                </div>

                {/* Grid */}
                <div
                  className="ag-theme-material ag-grid-table flex-grow-1"
                  style={{ width: "100%", minHeight: 0 }}
                >
                  {rowData !== null ? (
                    <ContextLayout.Consumer>
                      {(context) => (
                        <AgGridReact
                          columnDefs={columnDefs}
                          rowData={rowData}
                          defaultColDef={defaultColDef}
                          onGridReady={this.onGridReady}
                          onFirstDataRendered={this.sizeToFit}
                          onGridSizeChanged={this.sizeToFit}
                          rowHeight={46}
                          headerHeight={40}
                          animateRows={true}
                          floatingFilter={false}
                          pagination={true}
                          paginationPageSize={pageSize}
                          enableRtl={context.state.direction === "rtl"}
                          overlayNoRowsTemplate="<span>Aucun consultant trouvé.</span>"
                        />
                      )}
                    </ContextLayout.Consumer>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <ConsultantAccessFormModal
          isOpen={formOpen}
          toggle={this.closeForm}
          consultant={selectedConsultant}
          onSaved={() => { toast.success("Accès enregistré."); this.fetchData() }}
        />

        {confirmDeleteId && (
          <SweetAlert
            warning
            showCancel
            reverseButtons
            confirmBtnText="Supprimer"
            cancelBtnText="Annuler"
            confirmBtnBsStyle="danger"
            cancelBtnBsStyle="primary"
            title="Supprimer l'accès ?"
            onConfirm={this.handleDelete}
            onCancel={() => this.setState({ confirmDeleteId: null })}
          >
            Le consultant n'aura plus accès aux fonctionnalités premium.
          </SweetAlert>
        )}
      </div>
    )
  }
}

export default ConsultantAccessPage
