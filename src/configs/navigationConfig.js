import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM — arbo TEST JF 2026-09-11 (Cap'tain)
 * Admin: Tableau de bord · Clients(Opportunité, Suivi administratif, Prospects→Contrat perdu) · Contacts(Leads, Inscrits) · Tâches · Accès · Admin moteur
 * Clients = collapse mother — NO navLink (avoids false sticky to /kpi/suivi)
 * Prospects moved OUT of Contacts under Clients
 * Consultant: Clients leaf → clientslist (unchanged UX)
 * Routes CRM = prod VPS mapping (opportunities / suivi) — no invented pages
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
    type: "collapse",
    icon: <Icon.Users size={20} />,
    permissions: ["admin"],
    // NO navLink — mother collapse only (JF: no false sticky to /kpi/suivi)
    children: [
      {
        id: "crm-opportunities",
        title: "Opportunité",
        type: "item",
        icon: <Icon.Briefcase size={16} />,
        permissions: ["admin"],
        navLink: "/kpi/opportunities",
      },
      {
        id: "crm-suivi",
        title: "Suivi administratif",
        type: "item",
        icon: <Icon.FileText size={16} />,
        permissions: ["admin"],
        navLink: "/kpi/suivi",
      },
      {
        id: "prospects",
        title: "Prospects",
        type: "collapse",
        icon: <Icon.Target size={16} />,
        permissions: ["admin"],
        // no navLink: like Leads — avoids purple active / sticky mother
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

  // Consultant / Expert keep a direct Clients → clientslist leaf
  clientsList: {
    id: "clientsList",
    title: "Clients",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["Expert", "Consultant"],
    navLink: "/app/user/clientslist",
  },

  contact: {
    id: "contact",
    title: "Contacts",
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
        // Liste simple (pas le kanban opportunités).
        navLink: "/app/user/clientslist",
      },
      // Prospects removed from Contacts — now under Clients (JF arbo 2026-09-11)
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
  adminMoteur: {
    id: "adminMoteur",
    title: "Admin moteur",
    type: "item",
    icon: <Icon.Settings size={20} />,
    permissions: ["admin"],
    navLink: "/app/admin-moteur",
  },
};

const adminOrder = ["dashboard", "clients", "contact", "tasks", "consultantAccess", "adminMoteur"];
const consultantOrder = ["clientsList", "tasks"];

const buildMenu = (order) => order.map((key) => items[key]).filter(Boolean);

const role =
  typeof window !== "undefined" && localStorage.getItem("role")
    ? localStorage.getItem("role").toLowerCase()
    : "consultant";

const navigationConfig =
  role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder);

export default navigationConfig;
