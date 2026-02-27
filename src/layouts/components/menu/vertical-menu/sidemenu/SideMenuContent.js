import React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";
import navigationConfig from "../../../../../configs/navigationConfig";
import SideMenuGroup from "./SideMenuGroup";
import { ChevronRight } from "react-feather";
import { FormattedMessage } from "react-intl";
import { history } from "../../../../../history";
import axios from "axios";

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

const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  let part = String(dateStr);
  if (part.includes("T")) part = part.split("T")[0];
  else if (part.includes(" ")) part = part.split(" ")[0];
  const [y, m, d] = part.split("-");
  if (y && m && d) {
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  return null;
};

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
    crmBadge: 0, // NEW: badge pour KPI/CRM
    inboxBadge: 0, // NEW: badge pour Inbox (chat)
    chatbotBadge: 0,
    diagnosticBadge: 0,
    callBadge: 0,
    emailBadge: 0,
    tasksBadge: 0, // NEW: badge pour Tâches urgentes
    contractsBadge: 0, // NEW: badge pour Contrats terminés impayés
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
            // Garder "Boîte de réception" et son parent "CRM" ouverts si déjà ouverts
            if (obj === "crm-inbox" || obj === "kpi") return true;
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
      // Garder "Boîte de réception" ouvert si on clique sur un item (ex: Opportunités)
      if (this.state.activeGroups.includes("crm-inbox")) {
        if (!open_group.includes("crm-inbox")) open_group.push("crm-inbox");
        if (!open_group.includes("kpi")) open_group.push("kpi");
      }
    }

    this.setState({
      activeGroups: open_group,
      tempArr: temp_arr,
      currentActiveGroup: active_group,
    });
  };

  initRender = (parentArr) => {
    let active_groups = parentArr.slice(0);
    // Force "Boîte de réception" à être ouvert par défaut si on est dans la section inbox
    const currentPath =
      this.props.activePath || this.props.activeItemState || "";
    if (currentPath.includes("/kpi/inbox")) {
      if (!active_groups.includes("crm-inbox")) active_groups.push("crm-inbox");
      if (!active_groups.includes("kpi")) active_groups.push("kpi");
    }

    this.setState({
      activeGroups: active_groups,
      currentActiveGroup: active_groups,
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
      const diagsMapped = allDiags.map((d) => ({
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

        // Also fetch documents for payment alerts
        axios
          .get(global.config.server_url + "/documents", Config)
          .then((resDocs) => {
            const docs = Array.isArray(resDocs.data) ? resDocs.data : [];
            const docsMap = {};
            docs.forEach((d) => {
              if (d.id) docsMap[d.id] = d;
            });

            const now = new Date();
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );

            let urgentCount = 0;

            suivis.forEach((s) => {
              // Check contract state
              const contract = s.contract || s;
              const isTerminated =
                contract && contract.document_state === "Terminé";
              if (isTerminated) return;

              const { steps } = buildStepsForSuivi(s);
              const { last, next } = getLastAndNextSteps(steps);

              // 1. Check Création devis (tous profils)
              if (next && next.label === "Création devis") {
                urgentCount++;
                return;
              }

              // 2. Check Facturation Urgent (CH / Simu / etc)
              if (
                next &&
                next.label === "Facturation" &&
                last &&
                last.label === "Prise de RDV"
              ) {
                if (last.date) {
                  const rdvTime = parseDateOnly(last.date);
                  if (rdvTime && rdvTime <= today.getTime()) {
                    urgentCount++;
                    return;
                  }
                } else {
                  urgentCount++;
                  return;
                }
              }

              // 3. Check Payment Alerts (2nd+ payment due & unpaid)
              const docId = s.facture_id || s.document_id || s.contract_id;
              const doc = docId ? docsMap[docId] : null;
              if (doc) {
                let acompteDates = [];
                try {
                  acompteDates = Array.isArray(doc.acompte_dates)
                    ? doc.acompte_dates
                    : doc.acompte_dates
                      ? JSON.parse(doc.acompte_dates)
                      : [];
                } catch (e) {
                  acompteDates = [];
                }

                let soldDates = [];
                try {
                  soldDates = Array.isArray(doc.sold_dates)
                    ? doc.sold_dates
                    : doc.sold_dates
                      ? JSON.parse(doc.sold_dates)
                      : [];
                } catch (e) {
                  soldDates = [];
                }

                const allPayments = [...acompteDates, ...soldDates];
                if (allPayments.length > 1) {
                  for (let i = 1; i < allPayments.length; i++) {
                    const payment = allPayments[i];
                    const isPaid =
                      payment.is_paid === true || payment.is_paid === 1;
                    if (isPaid) continue;
                    const payTime = parseDateOnly(payment.date);
                    if (payTime && payTime <= today.getTime()) {
                      urgentCount++;
                      break;
                    }
                  }
                }
              }
            });

            this.setState({ crmBadge: urgentCount });
          })
          .catch((err) => {
            console.error("Error fetching documents for payment alerts", err);
            // Still set badge from suivi-only logic
            const now = new Date();
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            let urgentCount = 0;
            suivis.forEach((s) => {
              const contract = s.contract || s;
              if (contract && contract.document_state === "Terminé") return;
              const { steps } = buildStepsForSuivi(s);
              const { last, next } = getLastAndNextSteps(steps);
              if (next && next.label === "Création devis") {
                urgentCount++;
                return;
              }
              if (
                next &&
                next.label === "Facturation" &&
                last &&
                last.label === "Prise de RDV"
              ) {
                if (last.date) {
                  const rdvTime = parseDateOnly(last.date);
                  if (rdvTime && rdvTime <= today.getTime()) {
                    urgentCount++;
                    return;
                  }
                } else {
                  urgentCount++;
                  return;
                }
              }
            });
            this.setState({ crmBadge: urgentCount });
          });
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

    // --- Fetch Unpaid Terminated Contracts Count ---
    axios
      .get(global.config.server_url + "/documents", Config)
      .then((res) => {
        const contracts = Array.isArray(res.data) ? res.data : [];

        // Count unpaid terminated contracts (same logic as AllContracts.js)
        const unpaidCount = contracts.filter((contract) => {
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
            "sidebar-group-active": this.state.currentActiveGroup.includes(
              item.id,
            ),
            hover: this.props.hoverIndex === item.id,
            // ✅ active UNIQUEMENT pour les items (pas les parents)
            active:
              item.type === "item" &&
              (this.props.activeItemState === item.navLink ||
                (item.filterBase &&
                  this.props.activeItemState === item.filterBase) ||
                (item.navLink &&
                  item.navLink.includes(":") &&
                  this.props.activeItemState.startsWith(
                    item.navLink.split(":")[0],
                  )) ||
                (item.parentOf &&
                  item.parentOf.includes(this.props.activeItemState))),
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
                    : item.navLink;
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
            <div className="menu-text">
              {item.icon}
              <span className="menu-item menu-title">
                <FormattedMessage id={item.title} />
              </span>
            </div>

            {/* ✅ Badge Contrats terminés impayés */}
            {item.id === "contracts" && this.state.contractsBadge > 0 ? (
              <div className="menu-badge">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: "#ea5455",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    lineHeight: 1,
                    marginRight: 4,
                  }}
                >
                  {this.state.contractsBadge}
                </span>
              </div>
            ) : null}

            {/* ✅ Badge Tâches Urgentes */}
            {item.id === "tasks" && this.state.tasksBadge > 0 ? (
              <div className="menu-badge">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: "#ea5455",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    lineHeight: 1,
                    marginRight: 4,
                  }}
                >
                  {this.state.tasksBadge}
                </span>
              </div>
            ) : null}

            {/* ✅ Badge CRM (Suivi Admin) */}
            {item.id === "kpi" && this.state.crmBadge > 0 ? (
              <div
                className="menu-badge"
                style={{ marginLeft: "auto", marginRight: 10 }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: "#ea5455",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {this.state.crmBadge}
                </span>
              </div>
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
              currentActiveGroup={this.state.currentActiveGroup}
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
