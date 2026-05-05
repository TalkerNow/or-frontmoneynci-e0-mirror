import React from "react"
import { Button, Card, CardBody, CardHeader, CardTitle, Badge } from "reactstrap"
import { AgGridReact } from "ag-grid-react"
import { Edit, Trash2, UserPlus, Shield } from "react-feather"
import SweetAlert from "react-bootstrap-sweetalert"
import { toast } from "react-toastify"
import { Redirect } from "react-router-dom"
import api from "../../../services/api"
import ConsultantAccessFormModal from "./ConsultantAccessFormModal"
import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"

const AUTHORIZED_IDS = [1271, 1638]

class ConsultantAccessPage extends React.Component {
  state = {
    rowData: [],
    loading: true,
    formOpen: false,
    selectedConsultant: null,
    confirmDeleteId: null,
    defaultColDef: {
      resizable: true,
      sortable: true,
      flex: 1,
      minWidth: 120,
      filter: false,
    },
    columnDefs: [
      {
        headerName: "Nom",
        minWidth: 150,
        valueGetter: (p) => {
          const fn = p.data?.first_name
          const ln = p.data?.last_name
          return fn || ln ? `${fn ?? ""} ${ln ?? ""}`.trim() : (p.data?.name ?? "")
        },
      },
      { headerName: "Email", field: "email", minWidth: 200 },
      {
        headerName: "Accès",
        field: "access_id",
        minWidth: 140,
        cellRendererFramework: (p) => {
          if (!p.data?.access_id) return <span className="badge badge-secondary">Aucun accès</span>
          if (p.data.access_type === "unlimited_pass") return <span className="badge badge-success">Pass illimité</span>
          return <span className="badge badge-info">Crédits</span>
        },
      },
      {
        headerName: "Crédits",
        field: "remaining_credits",
        minWidth: 100,
        valueFormatter: (p) => {
          if (!p.data?.access_id) return "—"
          if (p.data.access_type !== "credits") return "—"
          return p.value ?? 0
        },
      },
      {
        headerName: "Expiration pass",
        field: "pass_expiration_date",
        minWidth: 150,
        valueFormatter: (p) => p.value ? p.value.slice(0, 10) : "—",
      },
      {
        headerName: "Actions",
        minWidth: 130,
        sortable: false,
        cellRendererFramework: (p) => (
          <div className="d-flex align-items-center" style={{ gap: 10 }}>
            {p.data?.access_id ? (
              <>
                <Edit
                  size={16}
                  className="cursor-pointer text-primary"
                  title="Modifier"
                  onClick={() => this.openEdit(p.data)}
                />
                <Trash2
                  size={16}
                  className="cursor-pointer text-danger"
                  title="Supprimer l'accès"
                  onClick={() => this.setState({ confirmDeleteId: p.data.access_id })}
                />
              </>
            ) : (
              <UserPlus
                size={16}
                className="cursor-pointer text-success"
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

  componentDidMount() {
    if (AUTHORIZED_IDS.includes(this.currentUserId)) {
      this.fetchData()
    }
  }

  fetchData = async () => {
    this.setState({ loading: true })
    try {
      const res = await api.get("/v1/consultant-access")
      this.setState({ rowData: res.data, loading: false })
    } catch {
      toast.error("Impossible de charger les consultants.")
      this.setState({ loading: false })
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

    const { rowData, formOpen, selectedConsultant, confirmDeleteId, columnDefs, defaultColDef } = this.state

    return (
      <div className="p-2">
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center" style={{ gap: 8 }}>
              <Shield size={20} className="text-primary" />
              <CardTitle tag="h5" className="mb-0">Gestion des accès consultants</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <div className="ag-theme-material" style={{ height: 550, width: "100%" }}>
              <AgGridReact
                columnDefs={columnDefs}
                rowData={rowData}
                defaultColDef={defaultColDef}
                rowHeight={45}
                headerHeight={40}
                overlayNoRowsTemplate="<span>Aucun consultant trouvé.</span>"
              />
            </div>
          </CardBody>
        </Card>

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
            confirmBtnText="Supprimer"
            cancelBtnText="Annuler"
            confirmBtnBsStyle="danger"
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
