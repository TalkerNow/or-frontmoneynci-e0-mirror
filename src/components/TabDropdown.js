import React from "react";
import { Dropdown, DropdownToggle, DropdownMenu } from "reactstrap";
import classNames from "classnames";
import { ChevronDown } from "react-feather";

// Old violet pill-like dropdown, styled via .tab-dd CSS in each view
const TabDropdown = ({ label, valueLabel, children, isOpen, toggle, minWidth = 120, menuMaxHeight = 320 }) => (
  <Dropdown isOpen={isOpen} toggle={toggle} className="tab-dd" tag="div">
    <DropdownToggle
      caret={false}
      tag="button"
      type="button"
      className={classNames("nav-link d-flex align-items-center", { active: isOpen })}
      style={{ color: "#212529", fontWeight: 500, minWidth, height: "1.9rem", lineHeight: 1.2 }}
      aria-haspopup={true}
      aria-expanded={isOpen}
      title={`${label} — cliquer pour choisir`}
    >
      {valueLabel || label}
      <ChevronDown size={16} className="chev" />
    </DropdownToggle>
    <DropdownMenu style={{ maxHeight: menuMaxHeight, overflowY: "auto" }}>{children}</DropdownMenu>
  </Dropdown>
);

export default TabDropdown;
