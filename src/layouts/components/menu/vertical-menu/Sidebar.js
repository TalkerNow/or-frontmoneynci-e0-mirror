import React, { Component } from "react";
import classnames from "classnames";
import { ContextLayout } from "../../../../utility/context/Layout";
import { connect } from "react-redux";
import SidebarHeader from "./SidebarHeader";
import Hammer from "react-hammerjs";
import SideMenuContent from "./sidemenu/SideMenuContent";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  User,
  Settings,
  Users,
  File,
  Power,
  Menu,
  Download,
  Cpu,
  
} from "react-feather";
import axios from "axios";
import * as XLSX from "xlsx";

// ✅ importe l’action (ajuste le chemin si nécessaire)
import { logoutWithJWT } from "../../../../redux/actions/auth/loginActions";

class Sidebar extends Component {
  // Garde la route active en phase avec les props
  static getDerivedStateFromProps(props, state) {
    if (props.activePath !== state.activeItem) {
      return { activeItem: props.activePath };
    }
    return null;
  }

  state = {
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    activeIndex: null,
    hoveredMenuItem: null,
    activeItem: this.props.activePath,
    menuShadow: false,
    settingsOpen: false,
    exportHovered: false,
  };

  mounted = false;
  settingsBtnRef = React.createRef();
  settingsMenuRef = null;
  exportMenuTimer = null;

  // --- Lifecycle -------------------------------------------------------------

  componentDidMount() {
    this.mounted = true;
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.updateWidth, false);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.updateWidth, false);
    }
    document.removeEventListener("mousedown", this.handleDocClick, false);
    document.removeEventListener("keydown", this.handleDocKeyDown, false);
    if (this.exportMenuTimer) clearTimeout(this.exportMenuTimer);
  }

  componentDidUpdate(prevProps, prevState) {
    // Ajoute/retire les listeners quand le menu "Paramètres" s’ouvre/se ferme
    if (!prevState.settingsOpen && this.state.settingsOpen) {
      document.addEventListener("mousedown", this.handleDocClick, false);
      document.addEventListener("keydown", this.handleDocKeyDown, false);
    } else if (prevState.settingsOpen && !this.state.settingsOpen) {
      document.removeEventListener("mousedown", this.handleDocClick, false);
      document.removeEventListener("keydown", this.handleDocKeyDown, false);
    }
  }

  // --- Handlers --------------------------------------------------------------

  updateWidth = () => {
    if (this.mounted && typeof window !== "undefined") {
      this.setState({ width: window.innerWidth });
    }
  };

  handleDocClick = (e) => {
    const btn = this.settingsBtnRef.current;
    const menu = this.settingsMenuRef;
    if (btn && !btn.contains(e.target) && menu && !menu.contains(e.target)) {
      this.setState({ settingsOpen: false });
    }
  };

  handleDocKeyDown = (e) => {
    if (e.key === "Escape") this.setState({ settingsOpen: false });
  };

  changeActiveIndex = (id) => {
    this.setState({ activeIndex: id !== this.state.activeIndex ? id : null });
  };

  handleSidebarMouseEnter = (id) => {
    this.setState({
      hoveredMenuItem: id !== this.state.hoveredMenuItem ? id : null,
    });
  };

  handleActiveItem = (url) => {
    this.setState({ activeItem: url });
  };

  handleContentScroll = (e) => {
    const st = e.currentTarget.scrollTop;
    if (st >= 100 && !this.state.menuShadow)
      this.setState({ menuShadow: true });
    else if (st < 100 && this.state.menuShadow)
      this.setState({ menuShadow: false });
  };

  toggleSettings = () => {
    this.setState((prev) => ({ settingsOpen: !prev.settingsOpen }));
  };

  // ✅ Déconnexion
  handleLogout = (e) => {
    e.preventDefault();
    this.setState({ settingsOpen: false });
    if (this.props.logoutWithJWT) {
      this.props.logoutWithJWT();
    } else {
      window.location.href = "/pages/login";
    }
  };

  // ✅ Bouton "ouvrir le menu" (n’ouvre que si actuellement fermé)
  handleOpenSidebar = () => {
    const { visibilityState, sidebarVisibility } = this.props;
    if (sidebarVisibility && visibilityState === false) {
      sidebarVisibility();
    }
  };

  // --- Export Logic ----------------------------------------------------------

  handleExportClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const Config = { headers: { Authorization: "Bearer " + token } };

      // Fetch Clients and Documents (for services mapping)
      const [usersRes, docsRes] = await Promise.all([
        axios.get(global.config.server_url + "/users?kind=client", Config),
        axios.get(global.config.server_url + "/documents", Config),
      ]);

      const clients = usersRes.data;
      const documents = docsRes.data || [];

      // Build services map (simplified from ClientsList logic)
      const servicesByUserId = {};
      documents.forEach((doc) => {
        if (doc?.user_id) {
          const s = doc.subscribe_services
            ? String(doc.subscribe_services)
                .replace(/["\\]/g, "")
                .replace(/[|,]/g, "/")
                .trim()
            : "";
          if (s) servicesByUserId[doc.user_id] = s;
        }
      });

      const data = clients.map((c) => ({
        ID: c.id,
        "Créé le": c.created_at,
        Civilité: c.civility,
        Nom: c.last_name,
        Prénom: c.first_name,
        Email: c.email,
        Téléphone: c.mobile_number || c.phone || c.office_number,
        Statut: c.status,
        Société: c.society_name,
        "Services souscrits": servicesByUserId[c.id] || "",
        Adresse: c.personal_address || c.society_address,
        Ville: c.personal_city || c.society_city,
        "Code postal": c.personal_zip_code || c.society_zip_code,
        Notes: c.note || c.notes,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `export_clients_${today}.xlsx`);
    } catch (e) {
      console.error("Export Clients Error", e);
      // Optional: Show error alert
    }
  };

  handleExportContracts = async () => {
    try {
      const token = localStorage.getItem("token");
      const Config = { headers: { Authorization: "Bearer " + token } };

      const response = await axios.get(
        global.config.server_url + "/documents",
        Config,
      );
      const contracts = response.data;

      const data = contracts.map((c) => ({
        ID: c.id,
        Document: c.comment, // Nom du contrat
        Type: c.type,
        État: c.document_state,
        Prestations: c.subscribe_services
          ? String(c.subscribe_services).replace(/["\\]/g, "")
          : "",
        "Client ID": c.user_id,
        Montant: c.total_ht, // Assuming similar structure
        Acompte: c.pre_payment,
        Solde: c.end_payment,
        "Créé le": c.created_at,
        "Mis à jour le": c.updated_at,
        "Date Acompte": c.deposit_date,
        "Date Solde": c.sold_date,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contrats");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `export_contrats_${today}.xlsx`);
    } catch (e) {
      console.error("Export Contracts Error", e);
    }
  };

  // --- Portal du menu Paramètres --------------------------------------------

  renderSettingsPortal = () => {
    if (!this.state.settingsOpen || !this.settingsBtnRef.current) return null;
    const rect = this.settingsBtnRef.current.getBoundingClientRect();

    const style = {
      position: "fixed",
      top: rect.top,
      left: rect.left,
      transform: "translateY(-8px) translateY(-100%)", // drop-up
      minWidth: 220,
      background: "var(--bs-dropdown-bg, #fff)",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      padding: 8,
      zIndex: 2147483647,
    };

    return createPortal(
      <div
        ref={(node) => (this.settingsMenuRef = node)}
        style={style}
        role="menu"
        aria-label="Paramètres"
      >
        {/* ✅ Export Menu - Admin Only */}
        {localStorage.getItem("role") === "admin" && (
          <div
            className="dropdown-item d-flex align-items-center justify-content-between position-relative"
            onMouseEnter={() => {
              if (this.exportMenuTimer) clearTimeout(this.exportMenuTimer);
              this.setState({ exportHovered: true });
            }}
            onMouseLeave={() => {
              this.exportMenuTimer = setTimeout(() => {
                this.setState({ exportHovered: false });
              }, 300);
            }}
            style={{ cursor: "pointer" }}
          >
            <div className="d-flex align-items-center">
              <Download size={14} className="mr-50" />
              <span className="align-middle">Export</span>
            </div>
            <span className="ml-1">▸</span>

            {/* Sub-menu */}
            {this.state.exportHovered && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: "100%", // Display to the left to avoid overflow if sidebar is on right? Sidebar is on left.
                  // Actually settings button is bottom left.
                  // The portal is fixed positioned.
                  // "left: rect.left". So it opens above the button.
                  // A sub-menu to the right (left: 100%) is standard.
                  left: "100%",
                  marginLeft: 4,
                  minWidth: 160,
                  background: "var(--bs-dropdown-bg, #fff)",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                  padding: 8,
                  zIndex: 2147483648,
                }}
                onMouseEnter={() => {
                  if (this.exportMenuTimer) clearTimeout(this.exportMenuTimer);
                }}
              >
                <div
                  className="dropdown-item d-flex align-items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.handleExportClients();
                  }}
                >
                  <span>Export Clients</span>
                </div>
                <div
                  className="dropdown-item d-flex align-items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.handleExportContracts();
                  }}
                >
                  <span>Export Contrats</span>
                </div>
              </div>
            )}
          </div>
        )}

        <a
          className="dropdown-item d-flex align-items-center"
          href="/app/member/memberslist"
          onClick={(e) => {
            e.preventDefault();
            this.setState({ settingsOpen: false });
            this.props.sidebarVisibility && this.props.sidebarVisibility();
            this.props.history
              ? this.props.history.push("/app/member/memberslist")
              : (window.location.href = "/app/member/memberslist");
          }}
        >
          <Users size={14} className="mr-50" />
          <span className="align-middle">Admins</span>
        </a>

        <a
          className="dropdown-item d-flex align-items-center"
          href="/app/contractTemplate"
          onClick={(e) => {
            e.preventDefault();
            this.setState({ settingsOpen: false });
            this.props.sidebarVisibility && this.props.sidebarVisibility();
            this.props.history
              ? this.props.history.push("/app/contractTemplate")
              : (window.location.href = "/app/contractTemplate");
          }}
        >
          <File size={14} className="mr-50" />
          <span className="align-middle">Modèle de contrat</span>
        </a>

        <a
          className="dropdown-item d-flex align-items-center"
          href="/app/prompts"
          onClick={(e) => {
            e.preventDefault();
            this.setState({ settingsOpen: false });
            this.props.sidebarVisibility && this.props.sidebarVisibility();
            this.props.history
              ? this.props.history.push("/app/prompts")
              : (window.location.href = "/app/prompts");
          }}
        >
          <Cpu size={14} className="mr-50" />
          <span className="align-middle">Prompts</span>
        </a>

        {/* 🔴 Déconnexion */}
        <a
          className="dropdown-item d-flex align-items-center text-danger"
          style={{ color: "#dc3545" }}
          href="/pages/login"
          onClick={this.handleLogout}
        >
          <Power size={14} className="mr-50" />
          <span className="align-middle">Se déconnecter</span>
        </a>
      </div>,
      document.body,
    );
  };

  // --- Render ----------------------------------------------------------------

  render() {
    const {
      visibilityState,
      toggleSidebarMenu,
      sidebarHover,
      toggle,
      color,
      sidebarVisibility,
      activeTheme,
      collapsed,
      activePath,
      sidebarState,
      currentLang,
      permission,
      currentUser,
      collapsedMenuPaths,
    } = this.props;

    const { menuShadow, activeIndex, hoveredMenuItem, activeItem, width } =
      this.state;

    return (
      <ContextLayout.Consumer>
        {(context) => {
          const dir = context.state.direction;
          const isRTL = dir === "rtl";
          const isCollapsed = sidebarState === true;

          // ✅ Clarté : variables explicites
          const isMobile = width < 1200;
          // 👉 On ne cache la sidebar sur mobile que si l’app l’a EXPLICITEMENT fermée
          const shouldHide = isMobile ? visibilityState === false : false;

          return (
            <React.Fragment>
              {/* --- BOUTON FLOTTANT GAUCHE (plus bas) POUR OUVRIR LA SIDEBAR SUR MOBILE --- */}
              {isMobile &&
                shouldHide &&
                createPortal(
                  <button
                    type="button"
                    onClick={this.handleOpenSidebar}
                    aria-label="Ouvrir le menu"
                    aria-controls="app-sidebar"
                    className="sidebar-open-btn"
                    style={{
                      position: "fixed",
                      left: "max(16px, calc(env(safe-area-inset-left) + 12px))",
                      bottom: "calc(20px + env(safe-area-inset-bottom))", // ↓ plus bas
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#fff",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2147483646,
                      cursor: "pointer",
                    }}
                  >
                    <Menu size={24} />
                  </button>,
                  document.body,
                )}

              {/* Zone de swipe pour OUVRIR/FERMER (optionnel) */}
              <Hammer
                onSwipe={() => {
                  sidebarVisibility && sidebarVisibility();
                }}
                direction={isRTL ? "DIRECTION_LEFT" : "DIRECTION_RIGHT"}
              >
                <div
                  className="menu-swipe-area d-xl-none d-block vh-100"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: 18,
                    zIndex: 5,
                  }}
                />
              </Hammer>

              <div
                id="app-sidebar"
                className={classnames(
                  `main-menu menu-fixed menu-light menu-accordion menu-shadow theme-${activeTheme}`,
                  {
                    collapsed: isCollapsed,
                    "hide-sidebar": shouldHide,
                  },
                )}
                onMouseEnter={() => sidebarHover && sidebarHover(false)}
                onMouseLeave={() => sidebarHover && sidebarHover(true)}
              >
                <SidebarHeader
                  toggleSidebarMenu={toggleSidebarMenu}
                  toggle={toggle}
                  sidebarBgColor={color}
                  sidebarVisibility={sidebarVisibility}
                  activeTheme={activeTheme}
                  collapsed={collapsed}
                  menuShadow={menuShadow}
                  activePath={activePath}
                  sidebarState={sidebarState}
                />

                {/* Contenu (scroll natif) */}
                <div
                  className="main-menu-content"
                  onScroll={this.handleContentScroll}
                  style={{
                    paddingBottom: 56,
                    overflowY: "auto",
                    overflowX: "hidden",
                  }}
                >
                  {/* Swipe pour FERMER la sidebar sur mobile */}
                  <Hammer
                    onSwipe={() => {
                      sidebarVisibility && sidebarVisibility();
                    }}
                    direction={isRTL ? "DIRECTION_RIGHT" : "DIRECTION_LEFT"}
                  >
                    <ul className="navigation navigation-main">
                      <SideMenuContent
                        setActiveIndex={this.changeActiveIndex}
                        activeIndex={activeIndex}
                        hoverIndex={hoveredMenuItem}
                        handleSidebarMouseEnter={this.handleSidebarMouseEnter}
                        activeItemState={activeItem}
                        handleActiveItem={this.handleActiveItem}
                        activePath={activePath}
                        lang={currentLang}
                        permission={permission}
                        currentUser={currentUser}
                        collapsedMenuPaths={collapsedMenuPaths}
                        toggleMenu={sidebarVisibility}
                        deviceWidth={width}
                      />
                    </ul>
                  </Hammer>
                </div>

                {/* Barre basse avec Profil & Paramètres */}
                <div
                  className="sidebar-profile-bar"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 56,
                    display: "flex",
                    alignItems: "stretch",
                    justifyContent: "space-between",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    background: "inherit",
                  }}
                >
                  {/* Profil */}
                  <Link
                    to="/app/profile"
                    onClick={sidebarVisibility}
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      flex: "1 1 50%",
                      height: "100%",
                      textDecoration: "none",
                      borderRight: "1px solid rgba(0,0,0,0.08)",
                    }}
                    aria-label="Profil"
                    title="Profil"
                  >
                    <User size={18} />
                  </Link>

                  {/* Paramètres (ouvre le portal) */}
                  <div
                    ref={this.settingsBtnRef}
                    onClick={this.toggleSettings}
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      flex: "1 1 50%",
                      height: "100%",
                      cursor: "pointer",
                      color: "#6e6b7b",
                      userSelect: "none",
                    }}
                    aria-label="Paramètres"
                    title="Paramètres"
                  >
                    <Settings size={18} />
                  </div>
                </div>
              </div>

              {/* Menu Paramètres en portal */}
              {this.renderSettingsPortal()}
            </React.Fragment>
          );
        }}
      </ContextLayout.Consumer>
    );
  }
}

// ✅ Visible par défaut (y compris sur mobile) pour éviter la disparition ambiguë
Sidebar.defaultProps = {
  visibilityState: true,
};

const mapStateToProps = (state) => {
  return {
    currentUser: localStorage.getItem("role"),
  };
};

// ✅ injecte l’action logoutWithJWT dans les props du composant
export default connect(mapStateToProps, { logoutWithJWT })(Sidebar);
