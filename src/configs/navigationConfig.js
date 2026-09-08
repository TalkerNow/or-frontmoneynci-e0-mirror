import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM — retouche JF 2026-09-08 12:30
 * Admin: Tableau de bord · Clients · Contact(Leads→sources, Inscrits, Prospects→Contrat perdu) · Tâches · Accès
 * Leads: enfants directs (pas de couche Flux) — collapse Vuexy natif
 * Consultant: Clients + Tâches
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

  clients: {
    id: "clients",
    title: "Clients",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist",
  },

  contact: {
    id: "contact",
    title: "Contact",
    type: "collapse",
    icon: <Icon.Inbox size={20} />,
    permissions: ["admin"],
    children: [
      {
        id: "leads",
        title: "Leads",
        type: "collapse",
        icon: <Icon.Zap size={16} />,
        permissions: ["admin"],
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
        // Liste simple (pas le kanban opportunités). Filtre métier inscrit à câbler.
        navLink: "/app/user/clientslist",
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
            id: "prospects-contrat-perdu",
            title: "Contrat perdu",
            type: "item",
            icon: <Icon.FileText size={14} />,
            permissions: ["admin"],
            navLink: "/app/AllContracts",
          },
        ],
      },
    ],
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

const adminOrder = ["dashboard", "clients", "contact", "tasks", "consultantAccess"];
const consultantOrder = ["clients", "tasks"];

const buildMenu = (order) => order.map((key) => items[key]).filter(Boolean);

const role =
  typeof window !== "undefined" && localStorage.getItem("role")
    ? localStorage.getItem("role").toLowerCase()
    : "consultant";

const navigationConfig =
  role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder);

export default navigationConfig;
