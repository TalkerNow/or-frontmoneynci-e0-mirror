import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM — arbo TEST JF 2026-09-13 (Cap'tain / HubSpot)
 * Admin: Tableau de bord · Clients(click→liste BDD) · Opportunités · Suivi administratif · Prospects(liste BDD) · Leads(Mails, Chatbot, Diagnostic, Appels, Inscrits) · Tâches · Accès · Admin moteur
 * Clients = collapse + navLink /app/user/clientslist — whole-row click toggles; open also navigates
 * Prospects = leaf /app/user/prospectslist (ClientsList tab prospect) — not Contrat perdu CRM
 * Leads Inscrits = /app/user/inscritslist (same ClientsList) — NOT clientslist
 * so Clients click no longer lights Inscrits (JF 2026-09-11).
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
    title: "Contacts",
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
    title: "Contacts",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["admin", "Expert", "Consultant"],
    navLink: "/app/user/clientslist",
  },

  contact: {
    id: "contact",
    title: "Leads",
    type: "collapse",
    icon: <Icon.Inbox size={20} />,
    permissions: ["admin"],
    children: [
      {
        id: "leads-mails",
        title: "Mails / contacts",
        type: "item",
        icon: <Icon.Mail size={14} />,
        permissions: ["admin"],
        navLink: "/kpi/inbox/email",
      },
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
        id: "leads-appels",
        title: "Appels",
        type: "item",
        icon: <Icon.Phone size={14} />,
        permissions: ["admin"],
        navLink: "/kpi/inbox/call",
      },
      {
        id: "inscrits",
        title: "Inscrits",
        type: "item",
        icon: <Icon.UserPlus size={16} />,
        permissions: ["admin"],
        // Same ClientsList UI — dedicated path so Clients≠Inscrits active (JF).
        navLink: "/app/user/inscritslist",
      },
      // Flattened 2026-09-13: no nested Contacts/Leads subgroup
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

/**
 * Build menu EACH call — never freeze at module import.
 * Role from localStorage.role (or optional arg / currentUser).
 * Admin if role includes "admin" OR currentUser arg is admin.
 */
export function getNavigationConfig(roleOrUser) {
  let role = "";
  if (typeof roleOrUser === "string" && roleOrUser.trim()) {
    role = roleOrUser.trim().toLowerCase();
  } else if (typeof window !== "undefined") {
    const stored = localStorage.getItem("role");
    if (stored) role = String(stored).toLowerCase();
  }
  const isAdmin = role.includes("admin");
  return isAdmin ? buildMenu(adminOrder) : buildMenu(consultantOrder);
}

// Back-compat default: evaluate lazily via getter-like call sites should use getNavigationConfig.
// Keep default export as a function-result at import ONLY for AccessControl docs; SideMenu uses getNavigationConfig.
const navigationConfig = getNavigationConfig();
export default navigationConfig;
