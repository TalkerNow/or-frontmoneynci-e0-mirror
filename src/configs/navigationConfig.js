import React from "react"
import * as Icon from "react-feather"
//import {CustomInput} from "reactstrap";

const navigationConfig = [
  {
    id: "dashboard",
    title: "Dashboard",
    type: "item",
    icon: <Icon.Home size={20}/>,
    permissions: ["admin", 'Consultant'],
    navLink: "/dashboard"
    //badge: "warning",
    //badgeText: "2"
   },
  {
    id: "profile",
    title: "Profile",
    type: "item",
    icon: <Icon.User size={20}/>,
    permissions: ["admin", "Client","Consultant","Expert"],
    navLink: "/app/profile"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "users",
    title: "Clients",
    type: "item",
    icon: <Icon.Monitor size={20}/>,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "oldUsers",
    title: "Anciens Clients",
    type: "item",
    icon: <Icon.Monitor size={20}/>,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/oldclientslist"
    //badge: "warning",
    //badgeText: "2"
  },  
  {
    id: "tasks",
    title: "Tâches",
    type: "item",
    icon: <Icon.CheckSquare size={20} />,
    permissions: ["admin","Consultant", "Expert"],
    navLink: "/task/:filter",
    filterBase: "/task/all"
  },
  {
    id: "document",
    title: "Documents",
    type: "item",
    icon: <Icon.Folder size={20} />,
    permissions: ["admin", "Client","Ancient Client", "Consultant", "Expert"],
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
    permissions: ["admin", "Consultant"],
    navLink: "/app/contractTemplate"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "contracts",
    title: "Contrats",
    type: "item",
    icon: <Icon.Folder size={20}/>,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/AllContracts"
    //badge: "warning",
    //badgeText: "2"
  },
  {
    id: "members",
    title: "Membres",
    type: "item",
    icon: <Icon.Folder size={20}/>,
    permissions: ["admin", 'Consultant'],
    navLink: "/app/member/memberslist"
    //badge: "warning",
    //badgeText: "2"
  }
  ]

export default navigationConfig
