import React from "react"
import { Users, Download } from "react-feather"
import axios from "axios"
import { AgGridReact } from "ag-grid-react"
import {
  Nav,
  Button,
  TabContent,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Row,
  Col,
} from "reactstrap"
import "../../../assets/scss/plugins/tables/_agGridStyleOverride.scss"
import "../../../assets/scss/pages/users.scss"

const Config = {
  headers: { Authorization: "Bearer " + localStorage.getItem("token") }
}

const FrenchMonth = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre"
]

class ExpertCard extends React.Component {
  state = {
    creator: false,           // false = exécutants, true = créateurs
    month: null,
    monthb: 0,
    year: null,
    pageSize: 50,
    activeTab: "1",
    prestation: null,
    trim: "Trimestre 1",
    defaultColDef: {
      editable: true,
      sortable: true,
      resizable: true,
      // PAS DE FILTER ICI
      flex: 1,
      minWidth: 140,
    },
    searchVal: "",
    columnDefs: [],
  }

  componentDidMount = async () => {
    const now = new Date()
    this.setState({
      month: FrenchMonth[now.getMonth()],
      monthb: now.getMonth(),
      year: now.getFullYear(),
      columnDefs: this.getExecutantsCols(),
    })

    await axios.get(global.config.server_url + "/getMembersPrestation", Config)
      .then((response) => {
        const tmp_presta = response.data.map((row) => ({ ...row }))
        for (let j = 0; j < response.data.length; j += 1) {
          const m = this.state.monthb + 1
          const arr = response.data[j]["monthArray"][m]
          tmp_presta[j]["total En attente"] = arr["En attente"]
          tmp_presta[j]["total creer En attente"] = arr["creer En attente"]
          tmp_presta[j]["total En cours"] = arr["En cours"]
          tmp_presta[j]["total creer En cours"] = arr["creer En cours"]
          tmp_presta[j]["total Termine"] = arr["Termine"]
          tmp_presta[j]["total Balance Clients"] = arr["Balance Clients"]
          tmp_presta[j]["total creer Balance Clients"] = arr["creer Balance Clients"]
          tmp_presta[j]["total creer Termine"] = arr["creer Termine"]
          tmp_presta[j]["total CA En attente"] = arr["CA En attente"]
          tmp_presta[j]["total CA creer En attente"] = arr["CA creer En attente"]
          tmp_presta[j]["total CA En cours"] = arr["CA En cours"]
          tmp_presta[j]["total CA creer En cours"] = arr["CA creer En cours"]
          tmp_presta[j]["total CA Termine"] = arr["CA Termine"]
          tmp_presta[j]["total CA creer Termine"] = arr["CA creer Termine"]
          tmp_presta[j]["total CA Balance Clients"] = arr["CA Balance Clients"]
          tmp_presta[j]["total CA creer Balance Clients"] = arr["CA creer Balance Clients"]
        }
        this.setState({ prestation: tmp_presta })
      })
  }

  // ----- Colonnes (sans filtres) -----
  getExecutantsCols() {
    return [
      { headerName: "Nom",  field: "name", minWidth: 200 },
      // { headerName: "Role", field: "role", minWidth: 120 },
      { headerName: "En Attente", field: "total En attente" },
      { headerName: "En Cours",   field: "total En cours" },
      { headerName: "Terminé",    field: "total Termine" },
      // { headerName: "Balance",    field: "total Balance Clients", minWidth: 160 },
      { headerName: "CA En attente", field: "total CA En attente", minWidth: 130 },
      { headerName: "CA En cours",   field: "total CA En cours",   minWidth: 130 },
      { headerName: "CA Terminé",    field: "total CA Termine",    minWidth: 130 },
      // { headerName: "CA Balance",    field: "total CA Balance Clients", minWidth: 170 },
    ]
  }

  getCreatorsCols() {
    return [
      { headerName: "Nom",  field: "name", minWidth: 200 },
      // { headerName: "Role", field: "role", minWidth: 120 },
      { headerName: "En Attente", field: "total creer En attente" },
      { headerName: "En Cours",   field: "total creer En cours" },
      { headerName: "Terminé",    field: "total creer Termine" },
      // { headerName: "Balance",    field: "total creer Balance Clients", minWidth: 160 },
      { headerName: "CA En attente", field: "total CA creer En attente", minWidth: 130 },
      { headerName: "CA En cours",   field: "total CA creer En cours",   minWidth: 130 },
      { headerName: "CA Terminé",    field: "total CA creer Termine",    minWidth: 130 },
      // { headerName: "CA Balance",    field: "total CA creer Balance Clients", minWidth: 170 },
    ]
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) this.setState({ activeTab: tab })
  }

  onGridReady = (params) => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi
  }

  // ----- DATA -----
  getTotalData(newYear) {
    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config)
      .then((response) => {
        const tmp_presta = this.state.prestation?.map((r) => ({ ...r })) || []
        for (let i = 0; i < response.data.length; i += 1) {
          const t = response.data[i]["totalData"]
          tmp_presta[i]["total En attente"] = t["En attente"]
          tmp_presta[i]["total creer En attente"] = t["creer En attente"]
          tmp_presta[i]["total En cours"] = t["En cours"]
          tmp_presta[i]["total creer En cours"] = t["creer En cours"]
          tmp_presta[i]["total Termine"] = t["Termine"]
          tmp_presta[i]["total creer Termine"] = t["creer Termine"]
          tmp_presta[i]["total Balance Clients"] = t["Balance Clients"]
          tmp_presta[i]["total creer Balance Clients"] = t["creer Balance Clients"]
          tmp_presta[i]["total CA En attente"] = t["CA En attente"]
          tmp_presta[i]["total CA creer En attente"] = t["CA creer En attente"]
          tmp_presta[i]["total CA En cours"] = t["CA En cours"]
          tmp_presta[i]["total CA creer En cours"] = t["CA creer En cours"]
          tmp_presta[i]["total CA Termine"] = t["CA Termine"]
          tmp_presta[i]["total CA creer Termine"] = t["CA creer Termine"]
          tmp_presta[i]["total CA Balance Clients"] = t["CA Balance Clients"]
          tmp_presta[i]["total CA creer Balance Clients"] = t["CA creer Balance Clients"]
        }
        this.setState({ prestation: tmp_presta })
      })
  }

  getYearData(newYear) {
    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config)
      .then((response) => {
        const tmp_presta = this.state.prestation?.map((r) => ({ ...r })) || []
        for (let i = 0; i < response.data.length; i += 1) {
          let tmp_Waiting = 0, tmp_C_Waiting = 0, tmp_En_cours = 0, tmp_C_En_cours = 0,
              tmp_Finish = 0, tmp_C_Finish = 0, tmp_BC = 0, tmp_C_BC = 0,
              tmp_CA_Waiting = 0, tmp_C_CA_Waiting = 0, tmp_CA_En_cours = 0, tmp_C_CA_En_cours = 0,
              tmp_CA_Finish = 0, tmp_C_CA_Finish = 0, tmp_CA_BC = 0, tmp_CA_C_BC = 0

          for (let j = 0; j < 12; j += 1) {
            const arr = response.data[i]["monthArray"][j + 1]
            tmp_Waiting += arr["En attente"]
            tmp_C_Waiting += arr["creer En attente"]
            tmp_En_cours += arr["En cours"]
            tmp_C_En_cours += arr["creer En cours"]
            tmp_Finish += arr["Termine"]
            tmp_C_Finish += arr["creer Termine"]
            tmp_BC += arr["Balance Clients"]
            tmp_C_BC += arr["creer Balance Clients"]
            tmp_CA_Waiting += arr["CA En attente"]
            tmp_C_CA_Waiting += arr["CA creer En attente"]
            tmp_CA_En_cours += arr["CA En cours"]
            tmp_C_CA_En_cours += arr["CA creer En cours"]
            tmp_CA_Finish += arr["CA Termine"]
            tmp_C_CA_Finish += arr["CA creer Termine"]
            tmp_CA_BC += arr["CA Balance Clients"]
            tmp_CA_C_BC += arr["CA creer Balance Clients"]
          }

          tmp_presta[i]["total En attente"] = tmp_Waiting
          tmp_presta[i]["total creer En attente"] = tmp_C_Waiting
          tmp_presta[i]["total En cours"] = tmp_En_cours
          tmp_presta[i]["total creer En cours"] = tmp_C_En_cours
          tmp_presta[i]["total Termine"] = tmp_Finish
          tmp_presta[i]["total creer Termine"] = tmp_C_Finish
          tmp_presta[i]["total Balance Clients"] = tmp_BC
          tmp_presta[i]["total creer Balance Clients"] = tmp_C_BC
          tmp_presta[i]["total CA En attente"] = tmp_CA_Waiting
          tmp_presta[i]["total CA creer En attente"] = tmp_C_CA_Waiting
          tmp_presta[i]["total CA En cours"] = tmp_CA_En_cours
          tmp_presta[i]["total CA creer En cours"] = tmp_C_CA_En_cours
          tmp_presta[i]["total CA Termine"] = tmp_CA_Finish
          tmp_presta[i]["total CA creer Termine"] = tmp_C_CA_Finish
          tmp_presta[i]["total CA Balance Clients"] = tmp_CA_BC
          tmp_presta[i]["total CA creer Balance Clients"] = tmp_CA_C_BC
        }
        this.setState({ prestation: tmp_presta })
      })
  }

  getTrimData(Trim, newYear) {
    let start = 0
    if (Trim === "Trimestre 2") start = 3
    else if (Trim === "Trimestre 3") start = 6
    else if (Trim === "Trimestre 4") start = 9
    const end = start + 3

    this.setState({ trim: Trim, year: newYear })

    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config)
      .then((response) => {
        const tmp_presta = this.state.prestation?.map((r) => ({ ...r })) || []
        for (let k = 0; k < response.data.length; k += 1) {
          let tmp_Waiting = 0, tmp_C_Waiting = 0, tmp_En_cours = 0, tmp_C_En_cours = 0,
              tmp_Finish = 0, tmp_C_Finish = 0, tmp_BC = 0, tmp_C_BC = 0,
              tmp_CA_Waiting = 0, tmp_C_CA_Waiting = 0, tmp_CA_En_cours = 0, tmp_C_CA_En_cours = 0,
              tmp_CA_Finish = 0, tmp_C_CA_Finish = 0, tmp_CA_BC = 0, tmp_CA_C_BC = 0

          for (let i = start; i < end; i += 1) {
            const arr = response.data[k]["monthArray"][i + 1]
            tmp_Waiting += arr["En attente"]
            tmp_C_Waiting += arr["creer En attente"]
            tmp_En_cours += arr["En cours"]
            tmp_C_En_cours += arr["creer En cours"]
            tmp_Finish += arr["Termine"]
            tmp_C_Finish += arr["creer Termine"]
            tmp_BC += arr["Balance Clients"]
            tmp_C_BC += arr["creer Balance Clients"]
            tmp_CA_Waiting += arr["CA En attente"]
            tmp_C_CA_Waiting += arr["CA creer En attente"]
            tmp_CA_En_cours += arr["CA En cours"]
            tmp_C_CA_En_cours += arr["CA creer En cours"]
            tmp_CA_Finish += arr["CA Termine"]
            tmp_C_CA_Finish += arr["CA creer Termine"]
            tmp_CA_BC += arr["CA Balance Clients"]
            tmp_CA_C_BC += arr["CA creer Balance Clients"]
          }

          tmp_presta[k]["total En attente"] = tmp_Waiting
          tmp_presta[k]["total creer En attente"] = tmp_C_Waiting
          tmp_presta[k]["total En cours"] = tmp_En_cours
          tmp_presta[k]["total creer En cours"] = tmp_C_En_cours
          tmp_presta[k]["total Termine"] = tmp_Finish
          tmp_presta[k]["total creer Termine"] = tmp_C_Finish
          tmp_presta[k]["total Balance Clients"] = tmp_BC
          tmp_presta[k]["total creer Balance Clients"] = tmp_C_BC
          tmp_presta[k]["total CA En attente"] = tmp_CA_Waiting
          tmp_presta[k]["total CA creer En attente"] = tmp_C_CA_Waiting
          tmp_presta[k]["total CA En cours"] = tmp_CA_En_cours
          tmp_presta[k]["total CA creer En cours"] = tmp_C_CA_En_cours
          tmp_presta[k]["total CA Termine"] = tmp_CA_Finish
          tmp_presta[k]["total CA creer Termine"] = tmp_C_CA_Finish
          tmp_presta[k]["total CA Balance Clients"] = tmp_CA_BC
          tmp_presta[k]["total CA creer Balance Clients"] = tmp_CA_C_BC
        }
        this.setState({ prestation: tmp_presta })
      })
  }

  getMonthData(newMonth, newYear) {
    let i = 0
    while (newMonth !== FrenchMonth[i]) i += 1

    axios.get(global.config.server_url + "/getMembersPrestation?year=" + newYear, Config)
      .then((response) => {
        const tmp_presta = response.data.map((r) => ({ ...r }))
        for (let j = 0; j < response.data.length; j += 1) {
          const arr = response.data[j]["monthArray"][i + 1]
          tmp_presta[j]["total En attente"] = arr["En attente"]
          tmp_presta[j]["total creer En attente"] = arr["creer En attente"]
          tmp_presta[j]["total En cours"] = arr["En cours"]
          tmp_presta[j]["total creer En cours"] = arr["creer En cours"]
          tmp_presta[j]["total Termine"] = arr["Termine"]
          tmp_presta[j]["total creer Termine"] = arr["creer Termine"]
          tmp_presta[j]["total Balance Clients"] = arr["Balance Clients"]
          tmp_presta[j]["total creer Balance Clients"] = arr["creer Balance Clients"]
          tmp_presta[j]["total CA En attente"] = arr["CA En attente"]
          tmp_presta[j]["total CA creer En attente"] = arr["CA creer En attente"]
          tmp_presta[j]["total CA En cours"] = arr["CA En cours"]
          tmp_presta[j]["total CA creer En cours"] = arr["CA creer En cours"]
          tmp_presta[j]["total CA Termine"] = arr["CA Termine"]
          tmp_presta[j]["total CA creer Termine"] = arr["CA creer Termine"]
          tmp_presta[j]["total CA Balance Clients"] = arr["CA Balance Clients"]
          tmp_presta[j]["total CA creer Balance Clients"] = arr["CA creer Balance Clients"]
        }
        this.setState({ prestation: tmp_presta, month: newMonth, year: newYear })
      })
  }

  // ----- UI handlers -----
  setDataExecutants = () => this.setState({ creator: true, columnDefs: this.getCreatorsCols() })
  setDataCreators  = () => this.setState({ creator: false, columnDefs: this.getExecutantsCols() })
  onBtExport = () => { if (this.gridApi) this.gridApi.exportDataAsCsv() }

  render() {
    const { prestation, columnDefs, defaultColDef } = this.state

    return (
      <Card>
        <CardHeader>
          <div className="icon-section form-inline">
            <div className={`avatar avatar-stats p-50 ${this.props.iconBg ? `bg-rgba-${this.props.iconBg}` : "bg-rgba-primary"}`}>
              <div className="avatar-content"><Users className="success" size={22} /></div>
            </div>
            <CardTitle>Experts</CardTitle>
          </div>

          <Nav tabs className="px-2" style={{ gap: 8, flexWrap: "wrap" }}>
            <div>
              {this.state.creator ? (
                <Button className="mr-1 mb-2 mr-3" outline color="primary" onClick={this.setDataCreators}>
                  executants
                </Button>
              ) : (
                <Button className="mr-1 mb-2 mr-3" outline color="primary" onClick={this.setDataExecutants}>
                  Créateurs
                </Button>
              )}
            </div>
            <div>
              <Button className="mr-1 mb-2 mr-1" outline color={this.state.activeTab === "1" ? "primary" : "secondary"}
                onClick={() => { this.getMonthData(this.state.month, this.state.year); this.toggle("1") }}>
                Mois
              </Button>
              <Button className="mr-1 mb-2 mr-1" outline color={this.state.activeTab === "2" ? "primary" : "secondary"}
                onClick={() => { this.getTrimData(this.state.trim, this.state.year); this.toggle("2") }}>
                Trimestre
              </Button>
              <Button className="mr-1 mb-2 mr-1" outline color={this.state.activeTab === "3" ? "primary" : "secondary"}
                onClick={() => { this.getYearData(this.state.year); this.toggle("3") }}>
                Année
              </Button>
              <Button className="mr-1 mb-2 mr-1" outline color={this.state.activeTab === "4" ? "primary" : "secondary"}
                onClick={() => { this.getTotalData(this.state.year); this.toggle("4") }}>
                Total
              </Button>
              <Button className="mb-2 ml-1" outline color="primary" onClick={this.onBtExport}>
                <Download className="primary" size={12} />
              </Button>
            </div>
          </Nav>
        </CardHeader>

        <CardBody className={`${this.props.className ? this.props.className : "stats-card-body"} pt-2`}>
          <TabContent activeTab={this.state.activeTab} style={{ width: "100%" }}>
            <Row style={{ width: "100%" }}>
              <Col sm="12">
                <Card style={{ width: "100%" }}>
                  <CardBody>

                    {/* Wrapper: limite la hauteur et gère les scrolls */}
                    <div style={{ width: "100%", maxHeight: "70vh", overflow: "auto" }}>
                      <div className="ag-theme-material ag-grid-table" style={{ width: "100%" }}>
                        {prestation ? (
                          <AgGridReact
                            domLayout="autoHeight"   // ← la grille prend juste la hauteur nécessaire
                            defaultColDef={defaultColDef}
                            columnDefs={columnDefs}
                            rowData={prestation}
                            animateRows
                            onGridReady={this.onGridReady}
                            pagination
                            enableRangeSelection
                          />
                        ) : null}
                      </div>
                    </div>

                  </CardBody>
                </Card>
              </Col>
            </Row>
          </TabContent>
        </CardBody>
      </Card>
    )
  }
}

export default ExpertCard
