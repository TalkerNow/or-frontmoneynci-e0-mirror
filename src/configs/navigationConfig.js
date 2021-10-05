import React from "react"
import * as Icon from "react-feather"
//import {CustomInput} from "reactstrap";

const navigationConfig = [
  {
    id: "dashboard",
    title: "Dashboard",
    type: "item",
    icon: <Icon.Home size={20}/>,
    permissions: ["admin", "Technician EOR","Client EOR",],
    navLink: "/"
    //badge: "warning",
    //badgeText: "2"
   },
  {
    id: "profile",
    title: "profil",
    type: "item",
    icon: <Icon.User size={20}/>,
    permissions: ["admin", "Client EOR","Consultant EOR","Technician EOR"],
    navLink: "/app/profile"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "users",
    title: "Clients",
    type: "item",
    icon: <Icon.Monitor size={20}/>,
    permissions: ["admin", "Technician EOR", "Consultant EOR"],
    navLink: "/app/user/clientslist"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "tasks",
    title: "Tâches",
    type: "item",
    icon: <Icon.CheckSquare size={20} />,
    permissions: ["admin", "Client EOR","Consultant EOR", "Technician EOR"],
    navLink: "/task/:filter",
    filterBase: "/task/all"
  },
  {
    id: "document",
    title: "Documents",
    type: "item",
    icon: <Icon.Folder size={20} />,
    permissions: ["admin", "Client EOR", "Consultant EOR", "Technician EOR"],
    badge: "primary",
    badgeText: "5 news",
    navLink: "/document",
    // filterBase: "/clientTask/all"
  },
  {
    id: "contractTemplate",
    title: "Modèle de contrat",
    type: "item",
    icon: <Icon.List size={20}/>,
    permissions: ["admin"],
    navLink: "/app/contractTemplate"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "contracts",
    title: "Contrats",
    type: "item",
    icon: <Icon.Folder size={20}/>,
    permissions: ["admin", "Technician EOR", "Consultant EOR"],
    navLink: "/app/AllContracts"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "members",
    title: "Membres",
    type: "item",
    icon: <Icon.Folder size={20}/>,
    permissions: ["admin"],
    navLink: "/app/member/memberslist"
    //badge: "warning",
    //badgeText: "2"
  }
  ]

export default navigationConfig
