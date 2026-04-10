import React, { Component } from "react"
import { NavLink } from "react-router-dom"
import { X } from "react-feather"
import classnames from "classnames"
class SidebarHeader extends Component {
  render() {
    let {
      toggleSidebarMenu,
      collapsed,
      toggle,
      sidebarVisibility,
      menuShadow
    } = this.props
    const isCollapsed = collapsed === true
    const handleToggle = () => {
      toggleSidebarMenu(!isCollapsed)
      toggle()
    }
    return (
      <div className="navbar-header">
        <ul className="nav navbar-nav flex-row">
          <li className="nav-item mr-auto">
            <NavLink to="/dashboard" className="navbar-brand">
              <div className="brand-logo" />
            </NavLink>
          </li>
          <li className="nav-item nav-toggle">
            <div className="nav-link modern-nav-toggle">
              <X
                onClick={sidebarVisibility}
                className="toggle-icon icon-x d-block d-xl-none font-medium-4"
                size={20}
                style={{ color: "#555" }}
              />
            </div>
          </li>
        </ul>
        <div
          className={classnames("shadow-bottom", {
            "d-none": menuShadow === false
          })}
        />
      </div>
    )
  }
}

export default SidebarHeader
