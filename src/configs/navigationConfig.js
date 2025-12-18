import React from "react";
import * as Icon from "react-feather";

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
    type: "collapse",
    icon: <Icon.BarChart2 size={20} />,
    permissions: ["admin", "Consultant", "Expert"],
    navLink: "/kpi/inbox",
    children: [
      {
        id: "crm-flux-header",
        groupTitle: "FLUX ENTRANT",
        type: "groupHeader",
        permissions: ["admin", "Consultant", "Expert"],
      },
      {
        id: "crm-inbox",
        title: "Boîte de réception",
        type: "item",
        icon: <Icon.Inbox size={16} />,
        permissions: ["admin", "Consultant", "Expert"],
        navLink: "/kpi/inbox",
      },
      {
        id: "crm-sales-header",
        groupTitle: "VENTES",
        type: "groupHeader",
        permissions: ["admin", "Consultant", "Expert"],
      },
      {
        id: "crm-opportunities",
        title: "Opportunités",
        type: "item",
        icon: <Icon.Briefcase size={16} />,
        permissions: ["admin", "Consultant", "Expert"],
        navLink: "/kpi/opportunities",
      },
      {
        id: "crm-prod-header",
        groupTitle: "PRODUCTION",
        type: "groupHeader",
        permissions: ["admin", "Consultant", "Expert"],
      },
      {
        id: "crm-suivi",
        title: "Suivi Administratif",
        type: "item",
        icon: <Icon.FileText size={16} />,
        permissions: ["admin", "Consultant", "Expert"],
        navLink: "/kpi/suivi",
      },
      {
        id: "crm-agenda",
        title: "Mon Agenda",
        type: "item",
        icon: <Icon.Calendar size={16} />,
        permissions: ["admin", "Consultant", "Expert"],
        navLink: "/kpi/agenda",
      },
    ],
  },
  profile: {
    id: "profile",
    title: "Profile",
    type: "item",
    icon: <Icon.User size={20} />,
    permissions: ["admin", "Client", "Consultant", "Expert"],
    navLink: "/app/profile",
  },

  // 🔻 Clients = collapse (sans parentOf)
  users: {
    id: "users",
    title: "Clients",
    type: "collapse",
    icon: <Icon.Users size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist", // clic sur le libellé => navigate direct
    children: [
      {
        id: "users-list",
        title: "Liste des clients",
        type: "item",
        icon: <Icon.Users size={18} />,
        permissions: ["admin", "Expert", "Consultant"],
        navLink: "/app/user/clientslist",
      },
      {
        id: "oldUsers",
        title: "Anciens Clients",
        type: "item",
        icon: <Icon.Clock size={18} />,
        permissions: ["admin", "Expert", "Consultant"],
        navLink: "/app/user/oldclientslist",
      },
    ],
  },

  // (facultatif, non utilisé dans l’ordre)
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
};

// Admin keeps the current order (⚠️ sans "oldUsers")
const adminOrder = ["dashboard", "kpi", "users", "tasks", "contracts"];

// Consultant order (⚠️ sans "oldUsers")
const consultantOrder = ["users", "dashboard", "kpi", "tasks", "contracts"];

const buildMenu = (order) => order.map((key) => items[key]);

const role =
  typeof window !== "undefined" && localStorage.getItem("role")
    ? localStorage.getItem("role").toLowerCase()
    : "consultant";

const navigationConfig =
  role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder);

export default navigationConfig;
