import React from "react"
import * as Icon from "react-feather"

// Define items once; reuse them in role-specific orders
const items = {
  dashboard: {
    id: "dashboard",
    title: "KPI",
    type: "item",
    icon: <Icon.Home size={20} />,
    permissions: ["admin", "Consultant"],
    navLink: "/dashboard",
  },
  kpi: {
    id: "kpi",
    title: "CRM",
    type: "item",
    icon: <Icon.BarChart2 size={20} />,
    permissions: ["admin", "Consultant", "Expert"],
    navLink: "/kpi",
  },
  profile: {
    id: "profile",
    title: "Profile",
    type: "item",
    icon: <Icon.User size={20} />,
    permissions: ["admin", "Client", "Consultant", "Expert"],
    navLink: "/app/profile",
  },
  users: {
    id: "users",
    title: "Clients",
    type: "item",
    icon: <Icon.Monitor size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist",
  },
  oldUsers: {
    id: "oldUsers",
    title: "Anciens Clients",
    type: "item",
    icon: <Icon.Monitor size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/oldclientslist",
  },
  tasks: {
    id: "tasks",
    title: "Tâches",
    type: "item",
    icon: <Icon.CheckSquare size={20} />,
    permissions: ["admin", "Consultant", "Expert"],
    navLink: "/task/:filter",
    filterBase: "/task/all",
  },
  document: {
    id: "document",
    title: "Mes documents",
    type: "item",
    icon: <Icon.Folder size={20} />,
    permissions: ["admin", "Client", "Ancient Client", "Consultant", "Expert"],
    badge: "primary",
    badgeText: "5 news",
    navLink: "/document",
  },
  contractTemplate: {
    id: "contractTemplate",
    title: "Modèle de contrat",
    type: "item",
    icon: <Icon.List size={20} />,
    permissions: ["admin", "Consultant"],
    navLink: "/app/contractTemplate",
  },
  contracts: {
    id: "contracts",
    title: "Contrats",
    type: "item",
    icon: <Icon.Folder size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/AllContracts",
  },
  members: {
    id: "members",
    title: "Admins",
    type: "item",
    icon: <Icon.Monitor size={20} />,
    permissions: ["admin", "Consultant"],
    navLink: "/app/member/memberslist",
  },
}

// Admin keeps the current order
const adminOrder = [
  "dashboard",
  "kpi",
  // "profile",
  // Group clients-related entries together in this exact order
  "users",
  "oldUsers",
  "members",
  // Rest of the app entries
  "tasks",
  "document",
  "contractTemplate",
  "contracts",
]

// Consultant order: Clients first, then KPI, CRM, etc.
const consultantOrder = [
  // Clients-related entries first, in required order
  "users",
  "oldUsers",
  "members",
  // Then the rest
  "dashboard",
  "kpi",
  // "profile",
  "tasks",
  "document",
  "contractTemplate",
  "contracts",
]

const buildMenu = (order) => order.map((key) => items[key])

const role = (typeof window !== "undefined" && localStorage.getItem("role"))
  ? localStorage.getItem("role").toLowerCase()
  : "consultant"

const navigationConfig = role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder)

export default navigationConfig
