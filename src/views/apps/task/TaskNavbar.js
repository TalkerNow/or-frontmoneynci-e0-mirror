import React, { useState, useEffect } from "react"
import {
    Button,
    UncontrolledDropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    Input,
} from "reactstrap"
import { Search, Plus, Filter, Check, Star, Info, Layers } from "react-feather"
import { connect } from "react-redux"
import { changeFilter, searchTask } from "../../../redux/actions/todo/index"

const TaskNavbar = (props) => {
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        // Sync local state if external changes happen (though unlikely for search)
    }, [])

    const handleFilterChange = (filter) => {
        props.changeFilter(filter)
        // We might need to handle navigation if the filter relies on URL changes
        // The original FilterSidebar just called changeFilter. 
        // Assuming changeFilter action handles navigation or Redux state that TaskList listens to.
        // Looking at FilterSidebar, it just calls props.changeFilter.
        // But it also uses routerProps to check active state.
        // Does changeFilter redirect? Or just update state?
        // Usually it updates the reducer.
        // But if the URL changes, it's likely handled by history.push in the action or the component updates the URL.
        // Let's assume standard behavior for now.

        // Actually, looking at FilterSidebar, it uses routerProps.history.push probably?
        // No, it just calls changeFilter. 
        // Wait, FilterSidebar checks routerProps.location.pathname.
        // If changeFilter doesn't push to history, the URL won't update.
        // Let's assume I need to push to history if I want the URL to reflect the filter.
        if (props.routerProps && props.routerProps.history) {
            props.routerProps.history.push(`/clientTask/${filter}`)
        }
    }

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
        props.searchTask(e.target.value)
        if (props.onSearch) {
            props.onSearch(e.target.value)
        }
    }

    const activeFilter = props.routerProps.location.pathname.split("/").pop() || "all"

    // Helper to determine button style
    const validFilters = ["all", "unread", "important", "completed"]
    const currentIsLabel = !validFilters.includes(activeFilter)

    return (
        <div className="task-navbar d-flex flex-wrap justify-content-between align-items-center bg-white p-1 mb-0 w-100 border-bottom">
            <div className="d-flex align-items-center flex-wrap">
                <h3 className="mb-0 mr-2 text-primary d-none d-md-block brand-text font-weight-bold">Tâches</h3>

                {/* Main Filters Pills */}
                <div className="filter-pills d-flex mr-2">
                    <Button
                        color={activeFilter === "all" ? "primary" : "flat-primary"}
                        className="mr-1 rounded-pill"
                        size="sm"
                        onClick={() => handleFilterChange("all")}
                    >
                        <Layers size={14} className="mr-50" />
                        <span className="d-none d-sm-inline">Tout</span>
                    </Button>
                    <Button
                        color={activeFilter === "unread" ? "primary" : "flat-primary"}
                        className="mr-1 rounded-pill"
                        size="sm"
                        onClick={() => handleFilterChange("unread")}
                    >
                        <Star size={14} className="mr-50" />
                        <span className="d-none d-sm-inline">Non lu</span>
                    </Button>
                    <Button
                        color={activeFilter === "important" ? "primary" : "flat-primary"}
                        className="mr-1 rounded-pill"
                        size="sm"
                        onClick={() => handleFilterChange("important")}
                    >
                        <Info size={14} className="mr-50" />
                        <span className="d-none d-sm-inline">Important</span>
                    </Button>
                    <Button
                        color={activeFilter === "completed" ? "primary" : "flat-primary"}
                        className="mr-1 rounded-pill"
                        size="sm"
                        onClick={() => handleFilterChange("completed")}
                    >
                        <Check size={14} className="mr-50" />
                        <span className="d-none d-sm-inline">Terminé</span>
                    </Button>
                </div>

                {/* Labels Dropdown */}
                <UncontrolledDropdown className="mr-2">
                    <DropdownToggle color={currentIsLabel ? "primary" : "flat-secondary"} caret size="sm" className="rounded-pill">
                        <Filter size={14} className="mr-50" />
                        {currentIsLabel ? <span className="text-capitalize">{activeFilter.replace("_", " ")}</span> : "Type"}
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

            <div className="d-flex align-items-center mt-1 mt-md-0">
                {/* Search */}
                <div className="position-relative has-icon-right mr-2">
                    <Input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="round"
                        style={{ maxWidth: "250px", minWidth: "150px" }}
                    />
                    <div className="form-control-position">
                        <Search size={15} />
                    </div>
                </div>

                {/* Add Button */}
                <Button
                    color="primary"
                    className="rounded-circle p-0 d-flex justify-content-center align-items-center shadow hover-scale"
                    style={{ width: "40px", height: "40px", transition: "transform 0.2s" }}
                    onClick={() => props.addTask("open")}
                    title="Ajouter une nouvelle tâche"
                >
                    <Plus size={20} />
                </Button>
            </div>
        </div>
    )
}

export default connect(null, { changeFilter, searchTask })(TaskNavbar)
