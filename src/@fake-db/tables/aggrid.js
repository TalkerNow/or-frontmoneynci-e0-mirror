import mock from "../mock"
const data = [
  {
    name: "CONSULTATION RETRAITE",
    variable: "Nbr mm",
    value: "260",
    variable1: "",
    value1: "1",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "SIMULATION ET CALCULS PENSIONS",
    variable: "€ HT",
    value: "990",
    variable1: "Nb",
    value1: "0",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "AUDIT RETRAITE PARTICULIER",
    variable: "€ HT",
    value: "2 990",
    variable1: "",
    value1: "",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "AUDIT RETRAITE ENTREPRISE et LIBERAL",
    variable: "€ HT",
    value: "3 990",
    variable1: "Nb",
    value1: "2",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "LIQUIDATION DES PENSIONS INCLUS",
    variable: "€ HT",
    value: "1 500",
    variable1: "Nb",
    value1: "0",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "ACTUALISATION ANNUELLE AUDIT",
    variable: "€ HT",
    value: "750",
    variable1: "",
    value1: "",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "RACHAT DE TRIMESTRE à facturer",
    variable: "€ HT",
    value: "750",
    variable1: "",
    value1: "",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
  {
    name: "COMMENTAIRE",
    variable: "€ HT",
    value: "750",
    variable1: "",
    value1: "",
    total_ht: "0.00 €",
    total_ttc: "0.00 €"
  },
]
mock.onGet("/api/aggrid/data").reply(200, {
  data
})
