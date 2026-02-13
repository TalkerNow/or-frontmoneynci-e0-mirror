import React, { useState, useEffect } from "react";
import {
  Button,
  UncontrolledDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Input,
} from "reactstrap";
import { Search, Plus, Filter, Check, Star, Layers } from "react-feather";
import { connect } from "react-redux";
import { changeFilter, searchTask } from "../../../redux/actions/todo/index";

const TaskNavbar = (props) => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Sync local state if external changes happen (though unlikely for search)
  }, []);

  const handleFilterChange = (filter) => {
    props.changeFilter(filter);
    if (props.routerProps && props.routerProps.history) {
      props.routerProps.history.push(`/task/${filter}`);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    props.searchTask(e.target.value);
    if (props.onSearch) {
      props.onSearch(e.target.value);
    }
  };

  const activeFilter =
    props.routerProps.location.pathname.split("/").pop() || "all";
  const validFilters = ["all", "unread", "completed"];
  const currentIsLabel = !validFilters.includes(activeFilter);

  return (
    <div className="task-navbar d-flex flex-wrap justify-content-between align-items-center bg-white px-2 py-1 mb-0 w-100 border-bottom">
      <div className="d-flex align-items-center flex-wrap">
        <h3 className="mb-0 mr-2 text-primary d-none d-md-block font-weight-bold">Tâches</h3>

        {/* Filtres principaux */}
        <div className="filter-pills d-flex mr-2">
          <Button
            color={activeFilter === "all" ? "primary" : "light"}
            outline={activeFilter !== "all"}
            className="mr-1"
            size="sm"
            onClick={() => handleFilterChange("all")}
          >
            <Layers size={14} className="mr-50" />
            <span className="d-none d-sm-inline">Tout</span>
          </Button>
          <Button
            color={activeFilter === "unread" ? "warning" : "light"}
            outline={activeFilter !== "unread"}
            className="mr-1"
            size="sm"
            onClick={() => handleFilterChange("unread")}
          >
            <Star size={14} className="mr-50" />
            <span className="d-none d-sm-inline">Non lu</span>
          </Button>
          <Button
            color={activeFilter === "completed" ? "success" : "light"}
            outline={activeFilter !== "completed"}
            className="mr-1"
            size="sm"
            onClick={() => handleFilterChange("completed")}
          >
            <Check size={14} className="mr-50" />
            <span className="d-none d-sm-inline">Terminé</span>
          </Button>
        </div>

        {/* Dropdown Types */}
        <UncontrolledDropdown className="mr-2">
          <DropdownToggle
            color={currentIsLabel ? "primary" : "light"}
            outline={!currentIsLabel}
            caret
            size="sm"
          >
            <Filter size={14} className="mr-50" />
            {currentIsLabel ? (
              <span className="text-capitalize">
                {activeFilter.replace("_", " ")}
              </span>
            ) : (
              "Type"
            )}
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem header>Filtrer par type</DropdownItem>
            <DropdownItem onClick={() => handleFilterChange("relance_caisse")}>
              <span className="bullet bullet-primary mr-1" /> Relance caisse
            </DropdownItem>
            <DropdownItem onClick={() => handleFilterChange("relance_client")}>
              <span className="bullet bullet-warning mr-1" /> Relance client
            </DropdownItem>
            <DropdownItem onClick={() => handleFilterChange("envoi_caisse")}>
              <span className="bullet bullet-success mr-1" /> Envoi caisse
            </DropdownItem>
            <DropdownItem onClick={() => handleFilterChange("envoi_client")}>
              <span className="bullet bullet-danger mr-1" /> Envoi client
            </DropdownItem>
            <DropdownItem onClick={() => handleFilterChange("appel_client")}>
              <span className="bullet bullet-info mr-1" /> Appel client
            </DropdownItem>
            <DropdownItem onClick={() => handleFilterChange("appel_caisse")}>
              <span className="bullet bullet-primary mr-1" /> Appel caisse
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>

      <div className="d-flex align-items-center mt-1 mt-md-0 flex-grow-1">
        {/* Search */}
        <div className="position-relative has-icon-right mr-2 flex-grow-1">
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={handleSearch}
            bsSize="sm"
            style={{ width: "100%" }}
          />
          <div
            className="form-control-position"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Search size={15} />
          </div>
        </div>

        {/* Add Button */}
        <Button
          color="primary"
          size="sm"
          onClick={() => props.addTask("open")}
          title="Ajouter une nouvelle tâche"
        >
          <Plus size={16} className="mr-50" />
          <span className="d-none d-sm-inline">Nouvelle</span>
        </Button>
      </div>
    </div>
  );
};

export default connect(null, { changeFilter, searchTask })(TaskNavbar);
