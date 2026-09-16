import React from "react";
import * as Icon from "react-feather";

/**
 * Menu CRM — tip C + Cap'tain GO 2026-09-15 (TEST)
 * Admin order: Tableau de bord · Contacts · Leads · Tâches · Accès · Admin moteur
 * Contacts = leaf people → /app/user/clientslist (no children)
 * Leads = Mail · Chatbot · Diagnostic · Inscrits (Appels DROP — no invent)
 * Clients sidebar leaf REMOVED — filter tab « Clients » lives inside Contacts list only
 * Consultant: Contacts leaf → clientslist (unchanged)
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

  // Contacts = leaf people list (tip C)
  contacts: {
    id: "contacts",
    title: "Contacts",
    type: "item",
    icon: <Icon.Users size={20} />,
    permissions: ["admin"],
    navLink: "/app/user/clientslist",
  },

  // Consultant / Expert keep a direct Contacts → clientslist leaf
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
        title: "Mail",
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
        id: "inscrits",
        title: "Inscrits",
        type: "item",
        icon: <Icon.UserPlus size={16} />,
        permissions: ["admin"],
        // Same ClientsList UI — dedicated path so Contacts≠Inscrits active (JF).
        navLink: "/app/user/inscritslist",
      },
      // tip C: Appels DROP from menu — do not invent another place
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

const adminOrder = ["dashboard", "contacts", "contact", "tasks", "consultantAccess", "adminMoteur"];
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
