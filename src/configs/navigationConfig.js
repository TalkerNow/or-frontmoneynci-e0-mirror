import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM verrouillé 2026-09-08 (Cap'tain / JF)
 * Funnel: Leads → Inscrits → Prospects → Clients
 * Consultant: Clients + Tâches seulement (jamais Leads/Inscrits/Prospects)
 * Rendu Vuexy: collapse = sous-menus indentés (« décalés »)
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

  // --- Leads (flux brut, pas de compte SaaS) ---
  leads: {
    id: "leads",
    title: "Leads",
    type: "collapse",
    icon: <Icon.Inbox size={20} />,
    permissions: ["admin"],
    navLink: "/kpi/inbox/all",
    children: [
      {
        id: "leads-flux",
        title: "Flux",
        type: "collapse",
        icon: <Icon.Layers size={16} />,
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
    ],
  },

  // --- Inscrits (compte SaaS, pas encore de contrat) ---
  // Route provisoire: liste contacts — TODO filtre métier « inscrit » dédié si backend l’expose
  inscrits: {
    id: "inscrits",
    title: "Inscrits",
    type: "item",
    icon: <Icon.UserPlus size={20} />,
    permissions: ["admin"],
    navLink: "/kpi/opportunities",
  },

  // --- Prospects (contrat fait) ---
  prospects: {
    id: "prospects",
    title: "Prospects",
    type: "collapse",
    icon: <Icon.Briefcase size={20} />,
    permissions: ["admin"],
    navLink: "/kpi/suivi",
    children: [
      {
        id: "prospects-list",
        title: "Prospects",
        type: "item",
        icon: <Icon.Users size={16} />,
        permissions: ["admin"],
        navLink: "/kpi/suivi",
      },
      {
        id: "prospects-contrats-non-conclus",
        title: "Contrats non conclus",
        type: "item",
        icon: <Icon.FileText size={16} />,
        permissions: ["admin"],
        navLink: "/app/AllContracts",
      },
    ],
  },

  // --- Clients (mandat) ---
  clients: {
    id: "clients",
    title: "Clients",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist",
  },

  // --- Ops ---
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

  // Conservés hors menu principal (routes encore utilisées ailleurs)
  profile: {
    id: "profile",
    title: "Profile",
    type: "item",
    icon: <Icon.User size={20} />,
    permissions: ["admin", "Client", "Consultant", "Expert"],
    navLink: "/app/profile",
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
    permissions: ["admin"],
    navLink: "/app/contractTemplate",
  },
  members: {
    id: "members",
    title: "Admins",
    type: "item",
    icon: <Icon.Monitor size={20} />,
    permissions: ["admin"],
    navLink: "/app/member/memberslist",
  },
};

// Admin / commercial — menu CRM complet
const adminOrder = [
  "dashboard",
  "leads",
  "inscrits",
  "prospects",
  "clients",
  "tasks",
  "consultantAccess",
];

// Consultant / Expert — Clients + Tâches seulement (sécu funnel)
const consultantOrder = ["clients", "tasks"];

const buildMenu = (order) => order.map((key) => items[key]).filter(Boolean);

const role =
  typeof window !== "undefined" && localStorage.getItem("role")
    ? localStorage.getItem("role").toLowerCase()
    : "consultant";

const navigationConfig =
  role === "admin" ? buildMenu(adminOrder) : buildMenu(consultantOrder);

export default navigationConfig;
