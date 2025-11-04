import React, { Component } from "react"
import classnames from "classnames"
import { ContextLayout } from "../../../../utility/context/Layout"
import { connect } from "react-redux"
import SidebarHeader from "./SidebarHeader"
import Hammer from "react-hammerjs"
import SideMenuContent from "./sidemenu/SideMenuContent"
import { Link } from "react-router-dom"
import { User } from "react-feather"

class Sidebar extends Component {
  static getDerivedStateFromProps(props, state) {
    if (props.activePath !== state.activeItem) {
      return { activeItem: props.activePath }
    }
    return null
  }

  state = {
    width: window.innerWidth,
    activeIndex: null,
    hoveredMenuItem: null,
    activeItem: this.props.activePath,
    menuShadow: false
  }

  mounted = false

  updateWidth = () => {
    if (this.mounted) {
      this.setState({ width: window.innerWidth })
    }
  }

  componentDidMount() {
    this.mounted = true
    if (this.mounted) {
      if (typeof window !== "undefined") {
        window.addEventListener("resize", this.updateWidth, false)
      }
    }
  }

  componentWillUnmount() {
    this.mounted = false
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.updateWidth, false)
    }
  }

  changeActiveIndex = id => {
    this.setState({ activeIndex: id !== this.state.activeIndex ? id : null })
  }

  handleSidebarMouseEnter = id => {
    this.setState({
      hoveredMenuItem: id !== this.state.hoveredMenuItem ? id : null
    })
  }

  handleActiveItem = url => {
    this.setState({ activeItem: url })
  }

  // Shadow en haut quand on a scrollé
  handleContentScroll = e => {
    const st = e.currentTarget.scrollTop
    if (st >= 100 && !this.state.menuShadow) this.setState({ menuShadow: true })
    else if (st < 100 && this.state.menuShadow) this.setState({ menuShadow: false })
  }

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
      collapsedMenuPaths
    } = this.props

    const {
      menuShadow,
      activeIndex,
      hoveredMenuItem,
      activeItem
    } = this.state

    return (
      <ContextLayout.Consumer>
        {context => {
          const dir = context.state.direction
          const isRTL = dir === "rtl"
          const isCollapsed = sidebarState === true

          return (
            <React.Fragment>
              <Hammer
                onSwipe={() => {
                  sidebarVisibility()
                }}
                direction={isRTL ? "DIRECTION_LEFT" : "DIRECTION_RIGHT"}
              >
                <div className="menu-swipe-area d-xl-none d-block vh-100"></div>
              </Hammer>

              <div
                className={classnames(
                  `main-menu menu-fixed menu-light menu-accordion menu-shadow theme-${activeTheme}`,
                  {
                    collapsed: isCollapsed,
                    "hide-sidebar":
                      this.state.width < 1200 && visibilityState === false
                  }
                )}
                onMouseEnter={() => sidebarHover(false)}
                onMouseLeave={() => sidebarHover(true)}
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

                {/* Contenu natif (scroll natif) */}
                <div
                  className="main-menu-content"
                  onScroll={this.handleContentScroll}
                  // on garde un padding bas pour ne pas recouvrir le bouton profil
                  style={{ paddingBottom: 56, overflowY: "auto", overflowX: "hidden" }}
                >
                  <Hammer
                    onSwipe={() => {
                      sidebarVisibility()
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
                        deviceWidth={this.state.width}
                      />
                    </ul>
                  </Hammer>
                </div>

                {/* Bouton profil simple, icône seule, fixe en bas */}
                <div
                  className="sidebar-profile-bar"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    background: "inherit"
                  }}
                >
                  <Link
                    to="/app/profile"
                    onClick={sidebarVisibility}
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      textDecoration: "none"
                    }}
                    aria-label="Profil"
                    title="Profil"
                  >
                    <User size={18} />
                  </Link>
                </div>
              </div>
            </React.Fragment>
          )
        }}
      </ContextLayout.Consumer>
    )
  }
}

const mapStateToProps = state => {
  return {
    currentUser: localStorage.getItem("role")
  }
}

export default connect(mapStateToProps)(Sidebar)
