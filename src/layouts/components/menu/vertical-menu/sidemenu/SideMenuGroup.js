import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "reactstrap";
import classnames from "classnames";
import { ChevronRight } from "react-feather";
import { FormattedMessage } from "react-intl";

class SideMenuGroup extends React.Component {
  constructor(props) {
    super(props);
    this.flag = true;
    this.parentArray = [];
    this.childObj = {};
  }
  state = {
    isOpen: false,
    activeItem: this.props.activePath,
  };

  handleActiveItem = (url) => {
    this.setState({
      activeItem: url,
    });
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.activePath !== this.props.activePath) {
      if (this.childObj.navLink && this.childObj.collapsed) {
        this.props.collapsedMenuPaths(this.childObj.navLink);
      }
      if (
        this.props.activePath === this.childObj.navLink &&
        !this.props.parentArr.includes(this.parentArray[0])
      ) {
        this.props.parentArr.splice(0, this.props.parentArr.length);
        this.props.parentArr.push(this.parentArray);
      } else if (this.props.parentArr.includes(this.parentArray)) {
        this.props.parentArr.splice(0, this.props.parentArr.length);
      }
    }
  }

  renderChild(item, activeGroup, handleGroupClick, handleActiveItem, parent) {
    return (
      <ul className="menu-content">
        {item.children
          ? item.children.map((child) => {
              const CustomAnchorTag =
                child.type === "external-link" ? `a` : Link;
              if (!this.parentArray.includes(item.id) && this.flag) {
                this.parentArray.push(item.id);
              }

              if (child.navlink && child.collapsed) {
                this.props.collapsedMenuPaths(child.navLink);
              }

              if (
                this.props.activeItemState === child.navLink ||
                (child.navLink &&
                  this.props.activeItemState.startsWith(child.navLink))
              ) {
                this.childObj = child;
                this.props.parentArr.push(this.parentArray);
                this.flag = false;
              }
              if (
                (child.permissions &&
                  child.permissions.includes(this.props.currentUser)) ||
                child.permissions === undefined
              ) {
                if (child.type === "groupHeader") {
                  return (
                    <li className="navigation-header" key={child.id}>
                      <span>{child.groupTitle}</span>
                    </li>
                  );
                }
                return (
                  <li
                    key={child.id}
                    className={classnames({
                      hover: this.props.hoverIndex === child.id,
                      "has-sub": child.type === "collapse",
                      open:
                        child.type === "collapse" &&
                        activeGroup.includes(child.id),
                      "sidebar-group-active":
                        this.props.currentActiveGroup.includes(child.id),
                      active:
                        // ✅ Items normaux
                        ((this.props.activeItemState === child.navLink ||
                          (child.navLink &&
                            this.props.activeItemState.startsWith(
                              child.navLink
                            ))) &&
                          child.type === "item") ||
                        // ✅ Collapse items avec navLink (ex: Boîte de réception) - exact match seulement
                        // ✅ Collapse items avec navLink (ex: Boîte de réception) - exact match ONLY
                        (child.type === "collapse" &&
                          child.navLink &&
                          this.props.activeItemState === child.navLink) ||
                        // ✅ Standard Groups - Active if children are active, BUT EXCLUDE collapse items with navLink (like Inbox)
                        // This prevents Inbox from turning violet when Chatbot is active.
                        (!child.navLink &&
                          item.parentOf &&
                          item.parentOf.includes(this.props.activeItemState)),
                    })}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupClick(child.id, item.id, child.type);
                      if (child.navLink && child.navLink !== undefined) {
                        handleActiveItem(child.navLink);
                      }
                      if (
                        this.props.deviceWidth <= 1200 &&
                        child.type === "item"
                      ) {
                        this.props.toggleMenu();
                      }
                    }}
                  >
                    <CustomAnchorTag
                      className={classnames({
                        "d-flex align-items-center":
                          child.type === "collapse" ||
                          child.badge ||
                          (child.id === "crm-inbox-chatbot" &&
                            this.props.chatbotBadge > 0) ||
                          (child.id === "crm-inbox-diagnostic" &&
                            this.props.diagnosticBadge > 0) ||
                          (child.id === "crm-inbox-call" &&
                            this.props.callBadge > 0) ||
                          (child.id === "crm-inbox-email" &&
                            this.props.emailBadge > 0) ||
                          (child.id === "crm-suivi" &&
                            this.props.crmBadge > 0) ||
                          (child.id === "crm-opportunities" &&
                            this.props.opportunitiesBadge > 0),
                      })}
                      to={
                        child.navLink &&
                        (child.type === "item" || child.type === "collapse")
                          ? child.navLink
                          : ""
                      }
                      href={child.type === "external-link" ? child.navLink : ""}
                      onMouseEnter={() => {
                        this.props.handleSidebarMouseEnter(child.id);
                      }}
                      onMouseLeave={() => {
                        this.props.handleSidebarMouseEnter(child.id);
                      }}
                      key={child.id}
                      onClick={(e) => {
                        // Pour les collapse avec navLink, permettre la navigation
                        if (child.type === "collapse" && !child.navLink) {
                          e.preventDefault();
                        }
                      }}
                      target={child.newTab ? "_blank" : undefined}
                    >
                      <div className="menu-text flex-grow-1">
                        {child.icon}
                        <span className="menu-item menu-title">
                          <FormattedMessage id={child.title} />
                        </span>
                      </div>
                      {child.badge ? (
                        <Badge
                          color={child.badge}
                          className="float-right mr-2"
                          pill
                        >
                          {child.badgeText}
                        </Badge>
                      ) : (
                        ""
                      )}

                      {/* Chatbot Badge */}
                      {child.id === "crm-inbox-chatbot" &&
                      this.props.chatbotBadge > 0 ? (
                        <Badge color="danger" className="mr-2" pill>
                          {this.props.chatbotBadge}
                        </Badge>
                      ) : null}

                      {/* Diagnostic Badge */}
                      {child.id === "crm-inbox-diagnostic" &&
                      this.props.diagnosticBadge > 0 ? (
                        <Badge color="danger" className="mr-2" pill>
                          {this.props.diagnosticBadge}
                        </Badge>
                      ) : null}

                      {/* Call Badge */}
                      {child.id === "crm-inbox-call" &&
                      this.props.callBadge > 0 ? (
                        <Badge color="danger" className="mr-2" pill>
                          {this.props.callBadge}
                        </Badge>
                      ) : null}

                      {/* Email Badge */}
                      {child.id === "crm-inbox-email" &&
                      this.props.emailBadge > 0 ? (
                        <Badge color="danger" className="mr-2" pill>
                          {this.props.emailBadge}
                        </Badge>
                      ) : null}

                      {/* Suivi Badge */}
                      {child.id === "crm-suivi" && this.props.crmBadge > 0 ? (
                        <Badge color="danger" className="mr-2 ml-auto" pill>
                          {this.props.crmBadge}
                        </Badge>
                      ) : null}

                      {/* Opportunities Badge */}
                      {child.id === "crm-opportunities" &&
                      this.props.opportunitiesBadge > 0 ? (
                        <Badge color="danger" className="mr-2 ml-auto" pill>
                          {this.props.opportunitiesBadge}
                        </Badge>
                      ) : null}
                      {child.type === "collapse" ? (
                        <ChevronRight className="menu-toggle-icon" size={13} />
                      ) : (
                        ""
                      )}
                    </CustomAnchorTag>

                    {child.children
                      ? this.renderChild(
                          child,
                          activeGroup,
                          handleGroupClick,
                          handleActiveItem,
                          item.id
                        )
                      : ""}
                  </li>
                );
              } else if (
                child.navLink === this.props.activePath &&
                !child.permissions.includes(this.props.currentUser)
              ) {
                return this.props.redirectUnauthorized();
              } else {
                return null;
              }
            })
          : null}
      </ul>
    );
  }

  render() {
    return (
      <React.Fragment>
        {this.renderChild(
          this.props.group,
          this.props.activeGroup,
          this.props.handleGroupClick,
          this.props.handleActiveItem,
          null
        )}
      </React.Fragment>
    );
  }
}
export default SideMenuGroup;
