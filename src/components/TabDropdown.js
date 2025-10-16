import React from "react";
import { Dropdown, DropdownToggle, DropdownMenu } from "reactstrap";
import classNames from "classnames";
import { ChevronDown } from "react-feather";

const TabDropdown = ({ label, valueLabel, children, isOpen, toggle, minWidth = 120, menuMaxHeight = 280 }) => (
  <Dropdown nav inNavbar isOpen={isOpen} toggle={toggle} className="tab-dd">
    <DropdownToggle
      nav
      caret={false}
      tag="button"
      type="button"
      className={classNames("nav-link d-flex align-items-center justify-content-center", { active: isOpen })}
      style={{
        color: "#6d28d9",
        fontWeight: 500,
        minWidth,
        height: "2rem",
        lineHeight: 1.2,
        border: "1px solid #c4b5fd",
        borderRadius: "8px",
        background: "linear-gradient(180deg, #faf5ff 0%, #ede9fe 100%)",
        padding: "0 0.6rem",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "linear-gradient(180deg, #f3e8ff 0%, #e9d5ff 100%)";
        e.currentTarget.style.borderColor = "#a78bfa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "linear-gradient(180deg, #faf5ff 0%, #ede9fe 100%)";
        e.currentTarget.style.borderColor = "#c4b5fd";
      }}
    >
      {valueLabel || label}
      <ChevronDown size={15} className="ml-1" color="#6d28d9" />
    </DropdownToggle>
    <DropdownMenu style={{ maxHeight: menuMaxHeight, overflowY: "auto", minWidth: "8rem", width: "max-content" }}>
      {children}
    </DropdownMenu>
  </Dropdown>
);

export default TabDropdown;
