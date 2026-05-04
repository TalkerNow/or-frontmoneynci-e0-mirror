import React from "react"
import { Button, Card, CardBody, CardHeader, CardTitle } from "reactstrap"
import { AgGridReact } from "ag-grid-react"
import { Edit, Trash2, UserPlus, Shield } from "react-feather"
import SweetAlert from "react-bootstrap-sweetalert"
import { toast } from "react-toastify"
import { Redirect } from "react-router-dom"
import api from "../../../services/api"
import ConsultantAccessFormModal from "./ConsultantAccessFormModal"
import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"

const AUTHORIZED_IDS = [4, 1271, 1638]

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
      minWidth: 100,
      filter: false,
    },
    columnDefs: [
      { headerName: "Nom",    field: "nom",    minWidth: 130 },
      { headerName: "Prénom", field: "prenom", minWidth: 130 },
      {
        headerName: "Date de naissance",
        field: "date_de_naissance",
        minWidth: 150,
        valueFormatter: (p) => p.value ? p.value.slice(0, 10) : "—",
      },
      {
        headerName: "Type d'accès",
        field: "access_type",
        minWidth: 140,
        cellRendererFramework: (p) =>
          p.value === "unlimited_pass"
            ? <span className="badge badge-success">Pass illimité</span>
            : <span className="badge badge-info">Crédits</span>,
      },
      {
        headerName: "Crédits",
        field: "remaining_credits",
        minWidth: 100,
        valueFormatter: (p) => p.data?.access_type === "credits" ? p.value : "—",
      },
      {
        headerName: "Expiration pass",
        field: "pass_expiration_date",
        minWidth: 150,
        valueFormatter: (p) =>
          p.value ? p.value.slice(0, 10) : "—",
      },
      {
        headerName: "Actions",
        minWidth: 120,
        sortable: false,
        cellRendererFramework: (p) => (
          <div className="d-flex align-items-center" style={{ gap: 10 }}>
            <Edit
              size={16}
              className="cursor-pointer text-primary"
              onClick={() => this.openEdit(p.data)}
            />
            <Trash2
              size={16}
              className="cursor-pointer text-danger"
              onClick={() => this.setState({ confirmDeleteId: p.data.id })}
            />
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
      toast.error("Impossible de charger les accès consultants.")
      this.setState({ loading: false })
    }
  }

  openAdd = () => this.setState({ formOpen: true, selectedConsultant: null })
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

    const { rowData, loading, formOpen, selectedConsultant, confirmDeleteId, columnDefs, defaultColDef } = this.state

    return (
      <div className="p-2">
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center" style={{ gap: 8 }}>
              <Shield size={20} className="text-primary" />
              <CardTitle tag="h5" className="mb-0">Gestion des accès consultants</CardTitle>
            </div>
            <Button color="primary" size="sm" onClick={this.openAdd}>
              <UserPlus size={14} className="mr-1" />
              Ajouter un accès
            </Button>
          </CardHeader>
          <CardBody>
            <div
              className="ag-theme-material"
              style={{ height: 500, width: "100%" }}
            >
              <AgGridReact
                columnDefs={columnDefs}
                rowData={rowData}
                defaultColDef={defaultColDef}
                rowHeight={45}
                headerHeight={40}
                overlayLoadingTemplate={loading ? "<span>Chargement...</span>" : undefined}
                overlayNoRowsTemplate="<span>Aucun accès consultant enregistré.</span>"
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
            title="Confirmer la suppression"
            onConfirm={this.handleDelete}
            onCancel={() => this.setState({ confirmDeleteId: null })}
          >
            Cette action est irréversible.
          </SweetAlert>
        )}
      </div>
    )
  }
}

export default ConsultantAccessPage
