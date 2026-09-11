import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM — arbo TEST JF 2026-09-11 (Cap'tain / HubSpot)
 * Admin: Tableau de bord · Clients(click→liste BDD) · Opportunités · Suivi administratif · Prospects(liste BDD) · Contacts(Leads, Inscrits) · Tâches · Accès · Admin moteur
 * Clients = collapse + navLink /app/user/clientslist (parent click → ALL dossiers)
 * Prospects = leaf /app/user/prospectslist (ClientsList tab prospect) — not Contrat perdu CRM
 * Contacts Inscrits stays /app/user/clientslist (shallowest leaf highlight OK)
 * Consultant: Clients leaf → clientslist (unchanged UX)
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
    // Parent click → liste BDD (HubSpot). Caret still expands children.
    // Exact navLink — not prefix — so /kpi/suivi does not sticky this mother.
    navLink: "/app/user/clientslist",
    children: [
      {
        id: "crm-opportunities",
        title: "Opportunités",
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
        type: "item",
        icon: <Icon.Target size={16} />,
        permissions: ["admin"],
        navLink: "/app/user/prospectslist",
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
