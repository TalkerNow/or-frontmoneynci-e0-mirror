import React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";
import { getNavigationConfig } from "../../../../../configs/navigationConfig";
import SideMenuGroup from "./SideMenuGroup";
import { ChevronRight } from "react-feather";
import { FormattedMessage } from "react-intl";
import { history } from "../../../../../history";
import axios from "axios";
import {
  resolveActiveTrail,
  isLeafRouteActive,
  isCollapseNavActive,
} from "../../../../utils/menuActiveMatch";

// --- Helpers pour KPI (copié/adapté de KpiPage) ---
const parseServices = (servicesRaw) => {
  if (!servicesRaw) return [];
  return servicesRaw
    .split("/")
    .map((s) => s.replace(/["\\]/g, "").trim().toUpperCase())
    .filter(Boolean);
};

const getContractTypeCode = (source) => {
  if (!source) return "none";
  if (source.unipro === 1 || source.unipro === "1") return "credit_impot";
  const services = parseServices(source.subscribe_services);
  const groupCH = ["CH", "SIMU", "ACTU", "RAC"];
  const hasGroupCH = services.some((s) => groupCH.includes(s));
  if (hasGroupCH) return "ch_simu_actu_rac";
  const groupAR = ["AR", "TFD"];
  const hasGroupAR = services.some((s) => groupAR.includes(s));
  if (hasGroupAR) return "ar_tfd";
  return "none";
};

const STEP_DEFINITION = {
  credit_impot: {
    totalSteps: 8,
    dateSteps: [1, 2, 3, 4, 5, 6, 7],
    labels: [
      "Signature du contrat",
      "Activation compte Urssaf",
      "5 jours ouvrés d'attente",
      "Création devis",
      "Transformer devis en facture",
      "Paiement automatique Unipro",
      "Paiement du contrat",
      "Avancement du dossier",
    ],
  },
  ch_simu_actu_rac: {
    totalSteps: 5,
    dateSteps: [1, 2, 3, 4],
    labels: [
      "Étape 1",
      "Prise de RDV",
      "Facturation",
      "Paiement du contrat",
      "Avancement du dossier",
    ],
  },
};

function buildStepsForSuivi(suiviRow) {
  const profileKey = getContractTypeCode({
    unipro: suiviRow.unipro,
    subscribe_services: suiviRow.subscribe_services,
  });
  const config = STEP_DEFINITION[profileKey];
  if (!config) return { profileKey, steps: [] };

  const steps = [];
  for (let i = 1; i <= config.totalSteps; i++) {
    const label = config.labels[i - 1] || `Étape ${i}`;
    const dateField = `step${i}_completed_at`;
    const dateVal = suiviRow[dateField] || null;
    const hasDate = !!dateVal;
    steps.push({
      index: i,
      label,
      date: dateVal,
      completed: hasDate && config.dateSteps.includes(i),
    });
  }
  return { profileKey, steps };
}

function getLastAndNextSteps(steps = []) {
  if (!steps || steps.length === 0) return { last: null, next: null };
  const sorted = [...steps].sort((a, b) => a.index - b.index);
  const completed = sorted.filter((s) => s.completed);
  const last = completed.length ? completed[completed.length - 1] : null;
  let next = null;
  if (!last) {
    next = sorted[0] || null;
  } else {
    next = sorted.find((s) => s.index > last.index) || null;
  }
  return { last, next };
}

class SideMenuContent extends React.Component {
  constructor(props) {
    super(props);

    this.parentArr = [];
    this.collapsedPath = null;
    this.redirectUnauthorized = () => {
      history.push("/misc/not-authorized");
    };
  }
  state = {
    crmBadge: 0,
    inboxBadge: 0,
    chatbotBadge: 0,
    diagnosticBadge: 0,
    callBadge: 0,
    emailBadge: 0,
    inboundMailBadge: 0, // unread inbound_emails cf7|chatbot_report
    tasksBadge: 0,
    contractsBadge: 0,
    flag: true,
    isHovered: false,
    activeGroups: [],
    currentActiveGroup: [],
    tempArr: [],
  };

  handleGroupClick = (id, parent = null, type = "") => {
    let open_group = this.state.activeGroups;
    let active_group = this.state.currentActiveGroup;
    let temp_arr = this.state.tempArr;
    // Active Group to apply sidebar-group-active class
    if (type === "item" && parent === null) {
      active_group = [];
      temp_arr = [];
    } else if (type === "item" && parent !== null) {
      active_group = [];
      if (temp_arr.includes(parent)) {
        temp_arr.splice(temp_arr.indexOf(parent) + 1, temp_arr.length);
      } else {
        temp_arr = [];
        temp_arr.push(parent);
      }
      active_group = temp_arr.slice(0);
    } else if (type === "collapse" && parent === null) {
      temp_arr = [];
      temp_arr.push(id);
    } else if (type === "collapse" && parent !== null) {
      if (active_group.includes(parent)) {
        temp_arr = active_group.slice(0);
      }
      if (temp_arr.includes(id)) {
        // temp_arr.splice(temp_arr.indexOf(id), 1)
        temp_arr.splice(temp_arr.indexOf(id), temp_arr.length);
      } else {
        temp_arr.push(id);
      }
    } else {
      temp_arr = [];
    }

    if (type === "collapse") {
      if (!open_group.includes(id)) {
        let temp = open_group.filter(function (obj) {
          return active_group.indexOf(obj) === -1;
        });
        if (temp.length > 0 && !open_group.includes(parent)) {
          open_group = open_group.filter(function (obj) {
            return !temp.includes(obj);
          });
        }
        if (open_group.includes(parent) && active_group.includes(parent)) {
          open_group = active_group.slice(0);
        }
        if (!open_group.includes(id)) {
          open_group.push(id);
        }
      } else {
        open_group.splice(open_group.indexOf(id), 1);
      }
    }
    if (type === "item") {
      open_group = active_group.slice(0);
    }

    this.setState({
      activeGroups: open_group,
      tempArr: temp_arr,
      currentActiveGroup: active_group,
    });
  };

  // Route-derived open/active groups — leave section => highlight gone (JF).
  initRender = (_parentArr) => {
    const activePath = this.props.activePath || this.props.activeItemState || "";
    const navigationConfig = getNavigationConfig(this.props.currentUser);
    const { groupIds } = resolveActiveTrail(navigationConfig, activePath);
    this.setState({
      activeGroups: groupIds.slice(),
      currentActiveGroup: groupIds.slice(),
      flag: false,
    });
  };

  fetchInboxCount = async () => {
    try {
      const Config = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      };

      // --- Helpers ---
      const normalizePhone = (p) => {
        if (!p) return "";
        return String(p).replace(/\D/g, "").replace(/^33/, "0");
      };

      const extractPhone = (item) => {
        return (
          item.phone ||
          item.telephone ||
          item.attributes?.TELEPHONE ||
          item.user?.phone ||
          item.user?.telephone ||
          (item.user && item.user.username) ||
          ""
        );
      };

      // 1. Fetch user-kanbans
      let kanbanUserIds = new Set();
      let opportunitiesCount = 0;
      try {
        const resKanban = await axios.get(
          global.config.server_url + "/user-kanbans",
          Config,
        );
        const userKanbans = Array.isArray(resKanban.data) ? resKanban.data : [];
        kanbanUserIds = new Set(
          userKanbans.map((uk) => uk.user_id).filter((id) => id != null),
        );
        opportunitiesCount = userKanbans.length;
      } catch (err) {
        console.error("Error fetching user-kanbans", err);
      }

      // 2. Fetch Conversations (Chatbot)
      let allConvs = [];
      try {
        let p = 1;
        let maxPage = 1;
        do {
          const res = await axios.get(
            global.config.server_url + "/conversation-archives",
            { ...Config, params: { page: p } },
          );
          const payload = res.data || {};
          const data = Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
          allConvs = allConvs.concat(data);
          maxPage = payload.last_page || payload.meta?.last_page || 1;
          if (Array.isArray(payload)) maxPage = 1;
          p++;
        } while (p <= maxPage && p <= 50);
      } catch (e) {
        console.error("Error fetching convs", e);
      }

      // 3. Fetch Diagnostics
      let allDiags = [];
      try {
        let p = 1;
        let maxPage = 1;
        do {
          const res = await axios.get(
            global.config.server_url + "/v1/simulator-difficulty-results",
            { ...Config, params: { page: p } },
          );
          const payload = res.data || {};
          const data = Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
          allDiags = allDiags.concat(data);
          maxPage = payload.last_page || payload.meta?.last_page || 1;
          if (Array.isArray(payload)) maxPage = 1;
          p++;
        } while (p <= maxPage && p <= 50);
      } catch (e) {
        console.error("Error fetching diags", e);
      }

      // 4. Fetch KPIs (Emails / Calls)
      let allKpis = [];
      try {
        let p = 1;
        let maxPage = 1;
        do {
          const res = await axios.get(global.config.server_url + "/kpis", {
            ...Config,
            params: { page: p },
          });
          const payload = res.data || {};
          const data = Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
          allKpis = allKpis.concat(data);

          const metaMax =
            payload?.last_page ||
            payload?.meta?.last_page ||
            payload?.meta?.pagination?.total_pages ||
            1;
          maxPage = metaMax;
          if (Array.isArray(payload)) maxPage = 1;
          p++;
        } while (p <= maxPage && p <= 50);
      } catch (e) {
        console.error("Error fetching kpis", e);
      }

      // Filter KPIs for relevant Emails/Calls
      const relevantKpis = allKpis
        .filter((kpi) => {
          const obj = (kpi.objet || kpi.object || "").toString().toLowerCase();
          const act = (kpi.action || "").toString().toLowerCase();
          return (
            obj.includes("email") ||
            obj.includes("appel") ||
            act.includes("email") ||
            act.includes("appel") ||
            act === "email reçu" ||
            act === "email recu"
          );
        })
        .map((kpi) => {
          const obj = (kpi.objet || kpi.object || "").toString().toLowerCase();
          const act = (kpi.action || "").toString().toLowerCase();
          const isEmail =
            obj.includes("email") ||
            act.includes("email") ||
            act.includes("email reçu") ||
            act.includes("email recu");

          return {
            ...kpi,
            _source: isEmail ? "email" : "call",
          };
        });

      // LocalStorage reads
      let readIds = new Set();
      try {
        const stored = localStorage.getItem("inbox_read_ids");
        if (stored) readIds = new Set(JSON.parse(stored));
      } catch (e) {}
      let manualUnreadIds = new Set();
      try {
        const stored = localStorage.getItem("inbox_manual_unread_ids");
        if (stored) manualUnreadIds = new Set(JSON.parse(stored));
      } catch (e) {}

      // Prepare items for deduplication
      const convsMapped = allConvs.map((c) => ({ ...c, _source: "chatbot" }));
      // Diagnostic retraite gratuit : même règle que dans kpi/index.jsx —
      // ne compte que si email + tel étaient déjà tous les deux présents à la création.
      const diagsMapped = allDiags
        .filter((d) => d.crm_eligible)
        .map((d) => ({
          ...d,
          _source: "diagnostic",
        }));

      const allRawItems = [...convsMapped, ...diagsMapped, ...relevantKpis];

      // Deduplicate by phone (Keep most recent)
      const phoneMap = new Map();
      const uniqueItems = [];

      allRawItems.forEach((item) => {
        const phone = normalizePhone(extractPhone(item));
        if (!phone) {
          uniqueItems.push(item);
          return;
        }
        const existing = phoneMap.get(phone);
        if (!existing) {
          phoneMap.set(phone, item);
        } else {
          const existingDate = new Date(
            existing.created_at || existing.kpi_date || 0,
          );
          const newDate = new Date(item.created_at || item.kpi_date || 0);
          if (newDate > existingDate) {
            phoneMap.set(phone, item);
          }
        }
      });
      // Push unique items
      phoneMap.forEach((item) => uniqueItems.push(item));

      // Also add items without phone (kept in uniqueItems)
      // Wait, in my loop above "if (!phone) { uniqueItems.push(item); return; }" handles items with no phone.
      // So uniqueItems contains items-without-phone.
      // phoneMap contains items-with-phone (deduplicated).
      // I need to merge them.
      // Corrected logic:
      // uniqueItems ALREADY has items without phone.
      // I need to push map values to it.

      // Filter valid
      let validItems = uniqueItems.filter((c) => {
        // Standard filters
        if (c.invisible || c.invisible === 1) return false;
        if (c.status === "DISQUALIFIED") return false;
        if (c.user?.role === "Client") return false;

        // Kanban filter
        if (c.user_id && kanbanUserIds.has(c.user_id)) return false;

        return true;
      });

      // Count
      let chatbotCount = 0;
      let diagnosticCount = 0;
      let callCount = 0;
      let emailCount = 0;
      let totalUnread = 0;

      validItems.forEach((c) => {
        const status = c.status || c.action || "new";

        // Determine type first to use in composite ID
        let type = c._source || c.type;

        const compositeId = `${type}-${c.id}`;

        const isUnread =
          (status === "new" || manualUnreadIds.has(compositeId)) &&
          !readIds.has(compositeId);

        if (isUnread) {
          totalUnread++;

          if (type === "chatbot") chatbotCount++;
          else if (type === "diagnostic") diagnosticCount++;
          else if (type === "call") callCount++;
          else if (type === "email") emailCount++;
        }
      });

      this.setState({
        inboxBadge: totalUnread,
        chatbotBadge: chatbotCount,
        diagnosticBadge: diagnosticCount,
        callBadge: callCount,
        emailBadge: emailCount,
        opportunitiesBadge: opportunitiesCount,
      });
    } catch (err) {
      console.error("Error fetching inbox count loop", err);
    }
  };

  componentDidMount() {
    this.initRender(this.parentArr[0] ? this.parentArr[0] : []);

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // Initial fetch
    this.fetchInboxCount();

    axios
      .get(global.config.server_url + "/suivi-avancement/all", Config)
      .then((resSuivis) => {
        const suivis = Array.isArray(resSuivis.data)
          ? resSuivis.data.filter((s) => s.client_id)
          : [];

        // Badge CRM = uniquement les dossiers "Création devis" (Urgent),
        // pour matcher la section "Création devis — Urgent" du Suivi Administratif.
        let urgentCount = 0;
        suivis.forEach((s) => {
          const contract = s.contract || s;
          const isTerminated =
            contract && contract.document_state === "Terminé";
          if (isTerminated) return;

          const { steps } = buildStepsForSuivi(s);
          const { next } = getLastAndNextSteps(steps);

          // Création devis (tous profils)
          if (next && next.label === "Création devis") {
            urgentCount++;
          }
        });

        this.setState({ crmBadge: urgentCount });
      })
      .catch((err) =>
        console.error("Error fetching urgent count for sidebar", err),
      );

    // --- Fetch Urgent Tasks Count ---
    axios
      .get(global.config.server_url + "/tasks?filter=all", Config)
      .then((res) => {
        const tasks = Array.isArray(res.data) ? res.data : [];

        // Get today's date (without time) - same logic as TaskList.js
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Count urgent tasks: end_date <= today AND isCompleted = false
        const urgentTasks = tasks.filter((task) => {
          if (!task.end_date) return false;
          if (task.isCompleted) return false;
          const endDate = new Date(task.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate <= now; // <= pour inclure aujourd'hui
        });

        this.setState({ tasksBadge: urgentTasks.length });
      })
      .catch((err) =>
        console.error("❌ Error fetching urgent tasks count", err),
      );

    // --- Fetch inbound_emails unread (Mails pastille, cf7|chatbot_report) ---
    axios
      .get(
        global.config.server_url +
          "/inbound-emails/unread-count?source=cf7,chatbot_report",
        Config,
      )
      .then((res) => {
        const n = Number(res?.data?.count);
        this.setState({
          inboundMailBadge: Number.isFinite(n) ? n : 0,
          emailBadge: Number.isFinite(n) ? n : 0,
        });
      })
      .catch((err) =>
        console.error("❌ Error fetching inbound mail unread count", err),
      );

    // --- Fetch Unpaid Terminated Contracts Count ---
    axios
      .get(global.config.server_url + "/documents", Config)
      .then((res) => {
        const contracts = Array.isArray(res.data) ? res.data : [];

        const role = (localStorage.getItem("role") || "").toLowerCase();
        const userId = localStorage.getItem("userid");
        const isConsultant = role.includes("consultant");

        const unpaidCount = contracts.filter((contract) => {
          if (isConsultant && userId) {
            const user = contract.user;
            const linked = user
              ? [user.parent_id, user.technician_id, user.owner_id].some(
                  (v) => v !== undefined && v !== null && String(v) === String(userId)
                )
              : String(contract.parent_id) === String(userId);
            if (!linked) return false;
          }
          const isTerminated = contract.document_state === "Terminé";
          const isNotFullyPaid = contract.status_payment < 2;
          return isTerminated && isNotFullyPaid;
        }).length;

        this.setState({ contractsBadge: unpaidCount });
      })
      .catch((err) =>
        console.error("❌ Error fetching unpaid contracts count", err),
      );
  }

  componentWillUnmount() {}

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.activePath !== this.props.activePath) {
      if (this.collapsedMenuPaths !== null) {
        this.props.collapsedMenuPaths(this.collapsedMenuPaths);
      }

      this.initRender(
        this.parentArr[0] ? this.parentArr[this.parentArr.length - 1] : [],
      );
    }
  }

  render() {
    const pathname = this.props.activePath || this.props.activeItemState || "";
    const navigationConfig = getNavigationConfig(this.props.currentUser);
    const { groupIds: routeGroupIds, leafId: activeLeafId } = resolveActiveTrail(
      navigationConfig,
      pathname,
    );
    // Loop over sidebar items
    // eslint-disable-next-line
    const menuItems = navigationConfig.map((item) => {
      const CustomAnchorTag = item.type === "external-link" ? `a` : Link;
      if (item.type === "groupHeader") {
        return (
          <li
            className="navigation-header"
            key={`group-header-${item.groupTitle}`}
          >
            <span>{item.groupTitle}</span>
          </li>
        );
      }

      let renderItem = (
        <li
          className={classnames("nav-item", {
            "has-sub": item.type === "collapse",
            open: this.state.activeGroups.includes(item.id),
            "sidebar-group-active": routeGroupIds.includes(item.id),
            hover: this.props.hoverIndex === item.id,
            // Leaf exact match; OR Clients mother when on clientslist (no leaf)
            active:
              isLeafRouteActive(item, pathname, activeLeafId) ||
              isCollapseNavActive(item, pathname, activeLeafId),
            disabled: item.disabled,
          })}
          key={item.id}
          onClick={(e) => {
            e.stopPropagation();

            const clickedCaret = e.target.closest(".menu-toggle-icon");

            if (item.type === "item") {
              this.props.handleActiveItem(item.navLink);
              this.handleGroupClick(item.id, null, item.type);
              if (this.props.deviceWidth <= 1200) {
                this.props.toggleMenu();
              }
              return;
            }

            if (item.type === "collapse") {
              if (clickedCaret) {
                this.handleGroupClick(item.id, null, item.type);
                return;
              }
              if (item.navLink) {
                const targetLink =
                  item.id === "kpi" && this.state.crmBadge > 0
                    ? "/kpi/suivi"
                    : item.id === "contact" && this.state.inboundMailBadge > 0
                      ? "/kpi/inbox/email"
                      : item.navLink;
                // JF: clic mot = navigate + expand (force open, never toggle closed)
                this.setState((prev) => {
                  const open = prev.activeGroups.includes(item.id)
                    ? prev.activeGroups.slice()
                    : prev.activeGroups.concat(item.id);
                  return {
                    activeGroups: open,
                    currentActiveGroup: open.slice(),
                    tempArr: [item.id],
                  };
                });
                this.props.handleActiveItem(targetLink);
                history.push(targetLink);
                if (this.props.deviceWidth <= 1200) {
                  this.props.toggleMenu();
                }
                return;
              }
              this.handleGroupClick(item.id, null, item.type);
              return;
            }
          }}
        >
          <CustomAnchorTag
            to={
              item.filterBase
                ? item.filterBase
                : item.navLink && item.type === "item"
                  ? item.navLink
                  : ""
            }
            href={item.type === "external-link" ? item.navLink : ""}
            className={`d-flex ${
              item.badgeText
                ? "justify-content-between"
                : "justify-content-start"
            }`}
            style={
              ((item.id === "kpi" && this.state.crmBadge > 0) ||
                (item.id === "tasks" && this.state.tasksBadge > 0) ||
                (item.id === "contracts" && this.state.contractsBadge > 0) ||
                (item.id === "contact" && this.state.inboundMailBadge > 0)) &&
              !this.props.isCollapsed
                ? { paddingRight: "44px" }
                : undefined
            }
            onMouseEnter={() => {
              this.props.handleSidebarMouseEnter(item.id);
            }}
            onMouseLeave={() => {
              this.props.handleSidebarMouseEnter(item.id);
            }}
            key={item.id}
            onClick={(e) => {
              // on gère les collapses au niveau du <li>
              return item.type === "collapse" ? e.preventDefault() : "";
            }}
            target={item.newTab ? "_blank" : undefined}
          >
            <div className="menu-text" style={{ position: "relative" }}>
              {item.icon}
              {/* Petit point rouge pour les notifs (visible en collapsed) */}
              {((item.id === "contracts" && this.state.contractsBadge > 0) ||
                (item.id === "tasks" && this.state.tasksBadge > 0) ||
                (item.id === "kpi" && this.state.crmBadge > 0) ||
                (item.id === "contact" && this.state.inboundMailBadge > 0)) && (
                <span
                  className="sidebar-notif-dot"
                  style={{
                    position: "absolute",
                    top: -2,
                    left: 14,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#ea5455",
                    border: "1.5px solid #fff",
                  }}
                />
              )}
              <span className="menu-item menu-title">
                <FormattedMessage id={item.title} />
              </span>
            </div>

            {/* ✅ Badge Contrats terminés impayés */}
            {item.id === "contracts" && this.state.contractsBadge > 0 ? (
              <span
                className="sidebar-badge-num"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#ea5455",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: "0 5px",
                }}
              >
                {this.state.contractsBadge}
              </span>
            ) : null}

            {/* ✅ Badge Mails inbound non lus (cf7|chatbot_report) */}
            {item.id === "contact" && this.state.inboundMailBadge > 0 ? (
              <span
                className="sidebar-badge-num"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#ea5455",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: "0 5px",
                }}
              >
                {this.state.inboundMailBadge}
              </span>
            ) : null}

            {/* ✅ Badge Tâches Urgentes */}
            {item.id === "tasks" && this.state.tasksBadge > 0 ? (
              <span
                className="sidebar-badge-num"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#ea5455",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: "0 5px",
                }}
              >
                  {this.state.tasksBadge}
              </span>
            ) : null}

            {/* ✅ Badge CRM (Suivi Admin) */}
            {item.id === "kpi" && this.state.crmBadge > 0 ? (
              <span
                className="sidebar-badge-num"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#ea5455",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: "0 5px",
                }}
              >
                {this.state.crmBadge}
              </span>
            ) : null}

            {item.type === "collapse" ? (
              <ChevronRight className="menu-toggle-icon" size={13} />
            ) : (
              ""
            )}
          </CustomAnchorTag>
          {item.type === "collapse" ? (
            <SideMenuGroup
              group={item}
              handleGroupClick={this.handleGroupClick}
              activeGroup={this.state.activeGroups}
              handleActiveItem={this.props.handleActiveItem}
              activeItemState={this.props.activeItemState}
              handleSidebarMouseEnter={this.props.handleSidebarMouseEnter}
              activePath={this.props.activePath}
              hoverIndex={this.props.hoverIndex}
              initRender={this.initRender}
              parentArr={this.parentArr}
              triggerActive={undefined}
              currentActiveGroup={routeGroupIds}
              routeGroupIds={routeGroupIds}
              activeLeafId={activeLeafId}
              permission={this.props.permission}
              currentUser={this.props.currentUser}
              redirectUnauthorized={this.redirectUnauthorized}
              collapsedMenuPaths={this.props.collapsedMenuPaths}
              toggleMenu={this.props.toggleMenu}
              deviceWidth={this.props.deviceWidth}
              crmBadge={this.state.crmBadge}
              inboxBadge={this.state.inboxBadge}
              chatbotBadge={this.state.chatbotBadge}
              diagnosticBadge={this.state.diagnosticBadge}
              callBadge={this.state.callBadge}
              emailBadge={this.state.emailBadge}
              inboundMailBadge={this.state.inboundMailBadge}
              opportunitiesBadge={this.state.opportunitiesBadge}
            />
          ) : (
            ""
          )}
        </li>
      );

      if (
        item.navLink &&
        item.collapsed !== undefined &&
        item.collapsed === true
      ) {
        this.collapsedPath = item.navLink;
        this.props.collapsedMenuPaths(item.navLink);
      }

      if (
        (item.type === "collapse" ||
          item.type === "external-link" ||
          item.type === "item") &&
        (item.permissions === undefined ||
          item.permissions.includes(this.props.currentUser))
      ) {
        return renderItem;
      } else if (
        item.type === "item" &&
        item.navLink === this.props.activePath &&
        !item.permissions.includes(this.props.currentUser)
      ) {
        // return this.redirectUnauthorized()
      }
    });
    return <React.Fragment>{menuItems}</React.Fragment>;
  }
}
export default SideMenuContent;
