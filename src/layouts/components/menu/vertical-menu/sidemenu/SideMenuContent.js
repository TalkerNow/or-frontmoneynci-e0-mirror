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
    // Indexes of interest:
    // ...
    //   "Signature du contrat", // 1
    //   "Activation compte Urssaf", // 2
    //   "5 jours ouvrés d'attente", // 3
    //   "Création devis", // 4
    dateSteps: [1, 2, 3, 4, 5, 6, 7],
  },
  // We only need credit_impot for "urgent" check
};

function buildStepsForSuivi(suiviRow) {
  // Simplified version focusing on what's needed for "Urgent" check
  const profileKey = getContractTypeCode({
    unipro: suiviRow.unipro,
    subscribe_services: suiviRow.subscribe_services,
  });
  if (profileKey !== "credit_impot") return { profileKey, steps: [] };

  const config = STEP_DEFINITION.credit_impot;
  const steps = [];
  const startIndex = 1;

  for (let i = startIndex; i <= 8; i++) {
    const dateField = `step${i}_completed_at`;
    const dateVal = suiviRow[dateField] || null;
    const hasDate = !!dateVal;
    steps.push({
      index: i,
      date: dateVal,
      completed: hasDate && config.dateSteps.includes(i),
    });
  }
  return { profileKey, steps };
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
    crmBadge: 0, // NEW: badge pour KPI/CRM
    inboxBadge: 0, // NEW: badge pour Inbox (chat)
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

  componentDidMount() {
    this.initRender(this.parentArr[0] ? this.parentArr[0] : []);

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    // --- Fetch KPI Urgent Count ---
    axios
      .get(global.config.server_url + "/suivi-avancement/all", Config)
      .then((res) => {
        const suivis = Array.isArray(res.data) ? res.data : [];
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        let urgentCount = 0;

        suivis.forEach((s) => {
          // Check contract state
          const contract = s.contract || s; // fallback if needed
          // Assuming 'document_state' is on the contract object or s itself if flattened
          // KpiPage: s.contract.document_state
          const isTerminated =
            contract && contract.document_state === "Terminé";
          if (isTerminated) return;

          const { profileKey, steps } = buildStepsForSuivi(s);

          if (profileKey === "credit_impot") {
            const step3 = steps.find((st) => st.index === 3); // "5 jours ouvrés d'attente"
            const step4 = steps.find((st) => st.index === 4); // "Création devis"

            // Step 3 has date AND Step 4 NOT completed
            if (step3 && step3.date && (!step4 || !step4.completed)) {
              // Check date logic
              const raw = String(step3.date);
              let datePart = raw;
              if (raw.includes("T")) datePart = raw.split("T")[0];
              else if (raw.includes(" ")) datePart = raw.split(" ")[0];

              const [y, m, d] = datePart.split("-");
              if (y && m && d) {
                const d3 = new Date(Number(y), Number(m) - 1, Number(d));
                const d3Only = new Date(
                  d3.getFullYear(),
                  d3.getMonth(),
                  d3.getDate(),
                );

                // If date of step 3 <= today => URGENT
                if (d3Only.getTime() <= today.getTime()) {
                  urgentCount++;
                }
              }
            }
          }
        });

        this.setState({ crmBadge: urgentCount });
      })
      .catch((err) =>
        console.error("Error fetching urgent count for sidebar", err),
      );

    // --- Fetch Inbox Unread Count ---
    axios
      .get(global.config.server_url + "/conversation-archives", Config)
      .then((res) => {
        const payload = res.data;
        const convs = Array.isArray(payload?.data) ? payload.data : [];

        // Load read IDs from localStorage
        let readIds = new Set();
        try {
          const stored = localStorage.getItem("inbox_read_ids");
          if (stored) readIds = new Set(JSON.parse(stored));
        } catch (e) {
          console.error("Error parsing inbox_read_ids", e);
        }

        const unreadCount = convs.filter(
          (c) => c.status === "new" && !readIds.has(c.id)
        ).length;
        this.setState({ inboxBadge: unreadCount });
      })
      .catch((err) => console.error("Error fetching inbox count", err));

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

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.activePath !== this.props.activePath) {
      if (this.collapsedMenuPaths !== null) {
        this.props.collapsedMenuPaths(this.collapsedMenuPaths);
      }

      this.initRender(
        this.parentArr[0] ? this.parentArr[this.parentArr.length - 1] : []
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
              item.id
            ),
            hover: this.props.hoverIndex === item.id,
            // ✅ active UNIQUEMENT pour les items (pas les parents)
            active:
              item.type === "item" &&
              (this.props.activeItemState === item.navLink ||
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

            {/* ✅ Badge CRM Urgent */}
            {item.id === "kpi" && this.state.crmBadge > 0 ? (
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
                  {this.state.crmBadge}
                </span>
              </div>
            ) : null}

            {/* ✅ Badge Boîte de réception (Red dot when unread) */}
            {item.id === "crm-inbox" && this.state.inboxBadge > 0 ? (
              <div className="menu-badge">
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#ea5455",
                    marginRight: 4,
                  }}
                />
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
