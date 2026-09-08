import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM — retouche JF 2026-09-08 ~10:46
 * Admin: Tableau de bord · Contact(Leads→sources, Inscrits, Prospects, Clients) · Tâches · Accès
 * Leads = collapse direct (chatbot/diagnostic/mails/appels) — pas de couche « Flux »
 * Consultant: Clients + Tâches seulement
 */

const items = {
  dashboard: {
    id: "dashboard",
    title: "Tableau de bord",
    type: "item",
    icon: <Icon.Home size={20} />,
    permissions: ["admin"],
    navLink: "/dashboard",
  },

  contact: {
    id: "contact",
    title: "Contact",
    type: "collapse",
    icon: <Icon.Users size={20} />,
    permissions: ["admin"],
    navLink: "/kpi/inbox/all",
    children: [
      {
        id: "leads",
        title: "Leads",
        type: "collapse",
        icon: <Icon.Inbox size={16} />,
        permissions: ["admin"],
        navLink: "/kpi/inbox/all",
        children: [
          {
            id: "leads-chatbot",
            title: "Chatbot",
            type: "item",
            icon: <Icon.MessageCircle size={14} />,
            permissions: ["admin"],
            navLink: "/kpi/inbox/chatbot",
          },
          {
            id: "leads-diagnostic",
            title: "Diagnostic",
            type: "item",
            icon: <Icon.Activity size={14} />,
            permissions: ["admin"],
            navLink: "/kpi/inbox/diagnostic",
          },
          {
            id: "leads-mails",
            title: "Mails / contacts",
            type: "item",
            icon: <Icon.Mail size={14} />,
            permissions: ["admin"],
            navLink: "/kpi/inbox/email",
          },
          {
            id: "leads-appels",
            title: "Appels",
            type: "item",
            icon: <Icon.Phone size={14} />,
            permissions: ["admin"],
            navLink: "/kpi/inbox/call",
          },
        ],
      },
      {
        id: "inscrits",
        title: "Inscrits",
        type: "item",
        icon: <Icon.UserPlus size={16} />,
        permissions: ["admin"],
        // TODO filtre métier inscrit dédié si backend l’expose
        navLink: "/kpi/opportunities",
      },
      {
        id: "prospects",
        title: "Prospects",
        type: "collapse",
        icon: <Icon.Briefcase size={16} />,
        permissions: ["admin"],
        navLink: "/kpi/suivi",
        children: [
          {
            id: "prospects-list",
            title: "Prospects",
            type: "item",
            icon: <Icon.Users size={14} />,
            permissions: ["admin"],
            navLink: "/kpi/suivi",
          },
          {
            id: "prospects-contrats-non-conclus",
            title: "Contrats non conclus",
            type: "item",
            icon: <Icon.FileText size={14} />,
            permissions: ["admin"],
            navLink: "/app/AllContracts",
          },
        ],
      },
      {
        id: "clients",
        title: "Clients",
        type: "item",
        icon: <Icon.UserCheck size={16} />,
        permissions: ["admin"],
        navLink: "/app/user/clientslist",
      },
    ],
  },

  // entrée directe clients pour consultants (hors bloc Contact)
  clients: {
    id: "clients-direct",
    title: "Clients",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist",
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
  consultantAccess: {
    id: "consultantAccess",
    title: "Accès consultants",
    type: "item",
    icon: <Icon.Shield size={20} />,
    permissions: ["admin"],
    navLink: "/app/consultant-access",
  },
};

// Admin: pas de Clients en doublon hors Contact
const adminOrder = ["dashboard", "contact", "tasks", "consultantAccess"];

// Consultant / Expert: Clients + Tâches seulement
const consultantOrder = ["clients", "tasks"];

const buildMenu = (order) => order.map((key) => items[key]).filter(Boolean);

const role =
  typeof window !== "undefined" && localStorage.getItem("role")
    ? localStorage.getItem("role").toLowerCase()
    : "consultant";

const navigationConfig =
  role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder);

export default navigationConfig;
