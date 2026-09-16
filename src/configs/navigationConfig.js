import React from "react";
import * as Icon from "react-feather";
import { hasPermission } from "../constants/permissions";

// Define items once; reuse them in role-specific orders
const items = {
  dashboard: {
    id: "dashboard",
    title: "KPI",
    type: "item",
    icon: <Icon.Home size={20} />,
    permissions: ["admin"],
    navLink: "/dashboard",
  },
  kpi: {
    id: "kpi",
    title: "CRM",
    type: "collapse",
    icon: <Icon.BarChart2 size={20} />,
    permissions: ["admin"],
    navLink: "/kpi/suivi",
    children: [
      {
        id: "crm-inbox",
        title: "Flux réception",
        type: "collapse",
        icon: <Icon.Inbox size={16} />,
        permissions: ["admin", "Consultant", "Expert"],
        navLink: "/kpi/inbox/all",
        children: [
          {
            id: "crm-inbox-chatbot",
            title: "Chatbot",
            type: "item",
            icon: <Icon.MessageCircle size={14} />,
            permissions: ["admin", "Consultant", "Expert"],
            navLink: "/kpi/inbox/chatbot",
          },
          {
            id: "crm-inbox-diagnostic",
            title: "Diagnostic",
            type: "item",
            icon: <Icon.Activity size={14} />,
            permissions: ["admin", "Consultant", "Expert"],
            navLink: "/kpi/inbox/diagnostic",
          },
          {
            id: "crm-inbox-call",
            title: "Appels",
            type: "item",
            icon: <Icon.Phone size={14} />,
            permissions: ["admin", "Consultant", "Expert"],
            navLink: "/kpi/inbox/call",
          },
          {
            id: "crm-inbox-email",
            title: "Emails",
            type: "item",
            icon: <Icon.Mail size={14} />,
            permissions: ["admin", "Consultant", "Expert"],
            navLink: "/kpi/inbox/email",
          },
        ],
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
        id: "crm-suivi",
        title: "Suivi Administratif",
        type: "item",
        icon: <Icon.FileText size={16} />,
        permissions: ["admin", "Consultant", "Expert"],
        navLink: "/kpi/suivi",
      },
      // {
      //   id: "crm-agenda",
      //   title: "Mon Agenda",
      //   type: "item",
      //   icon: <Icon.Calendar size={16} />,
      //   permissions: ["admin", "Consultant", "Expert"],
      //   navLink: "/kpi/agenda",
      // },
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

  // Menu Contacts simplifié (sans dropdown)
  users: {
    id: "users",
    title: "Contacts",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist",
  },

  // (facultatif, non utilisé dans l’ordre)
  oldUsers: {
    id: "oldUsers",
    title: "Anciens Clients",
    type: "item",
    icon: <Icon.Monitor size={20} />,
    permissions: ["admin"],
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

  consultantAccess: {
    id: "consultantAccess",
    title: "Accès Consultants",
    type: "item",
    icon: <Icon.Shield size={20} />,
    permissions: ["admin"],
    navLink: "/app/consultant-access",
  },
};

// Admin keeps the current order (⚠️ sans "oldUsers")
const adminOrder = ["dashboard", "users", "kpi", "tasks", "contracts", "consultantAccess"];

// Consultant order (⚠️ sans "oldUsers")
const consultantOrder = ["users", "tasks", "contracts"];

// Certains items sont en plus gardés par une permission en base
// (voir user_permissions), indépendante du rôle.
const REQUIRED_PERMISSION_BY_KEY = {
  consultantAccess: "consultant-access",
};

const buildMenu = (order) =>
  order
    .filter((key) => {
      const requiredPermission = REQUIRED_PERMISSION_BY_KEY[key];
      return !requiredPermission || hasPermission(requiredPermission);
    })
    .map((key) => items[key]);

// Recalculé à chaque appel (et non une fois pour toutes au chargement du
// module) pour refléter le rôle/les permissions courants de localStorage,
// qui changent sans rechargement complet de la page (login en SPA).
const getNavigationConfig = () => {
  const role =
    typeof window !== "undefined" && localStorage.getItem("role")
      ? localStorage.getItem("role").toLowerCase()
      : "consultant";

  return role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder);
};

export default getNavigationConfig;
