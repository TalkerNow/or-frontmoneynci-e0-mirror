import React from "react"
import { Button, ListGroup, ListGroupItem } from "reactstrap"
import PerfectScrollbar from "react-perfect-scrollbar"
import { X, Layers, Star, Info, Check, Plus } from "react-feather"
import { connect } from "react-redux"
import { changeFilter } from "../../../redux/actions/todo/index"

class FilterSidebar extends React.Component {
  render() {
    return (
      <React.Fragment>
        <span
          className="sidebar-close-icon"
          onClick={() => this.props.mainSidebar(false)}
        >
          <X size={15} />
        </span>

        <div className="todo-app-menu">
          <div className="add-task d-flex justify-content-center">
            <Button.Ripple
              color="primary"
              aria-label="Ajouter une tâche"
              title="Ajouter une tâche"
              className="my-1 rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40 }}
              onClick={() => {
                this.props.addTask("open")
                this.props.mainSidebar(false)
              }}
            >
              <Plus size={18} />
            </Button.Ripple>
          </div>

          <PerfectScrollbar
            className="sidebar-menu-list"
            options={{
              wheelPropagation: false
            }}
          >
            <ListGroup className="font-medium-1">
              <ListGroupItem
                className="border-0 pt-0"
                action
                onClick={() => {
                  this.props.changeFilter("all")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/all"
                    ? true
                    : false
                }
              >
                <Layers size={22} />
                <span className="align-middle ml-1">All</span>
              </ListGroupItem>
            </ListGroup>

            <hr />
            <h5 className="mt-2 mb-1 pt-25">Filters</h5>

            <ListGroup className="font-medium-1">
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("unread")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/unread"
                    ? true
                    : false
                }
              >
                <Star size={22} />
                <span className="align-middle ml-1">Unread</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("important")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/important"
                    ? true
                    : false
                }
              >
                <Info size={22} />
                <span className="align-middle ml-1">Important</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("completed")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/completed"
                    ? true
                    : false
                }
              >
                <Check size={22} />
                <span className="align-middle ml-1">Completed</span>
              </ListGroupItem>

              {/*
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("trashed")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/trashed"
                    ? true
                    : false
                }
              >
                <Trash size={22} />
                <span className="align-middle ml-1">Trashed</span>
              </ListGroupItem>
              */}
            </ListGroup>

            <hr />
            <h5 className="mt-2 mb-1 pt-25">Labels</h5>

            <ListGroup className="font-medium-1">
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("relance_caisse")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/relance_caisse"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-primary align-middle" />
                <span className="align-middle ml-1">relance caisse</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("relance_client")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/relance_client"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-warning align-middle" />
                <span className="align-middle ml-1">relance client</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("envoi_caisse")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/envoi_caisse"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-success align-middle" />
                <span className="align-middle ml-1">envoi caisse</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("envoi_client")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/envoi_client"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-danger align-middle" />
                <span className="align-middle ml-1">envoi client</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("appel_client")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/appel_client"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-info align-middle" />
                <span className="align-middle ml-1">appel client</span>
              </ListGroupItem>

              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter("appel_caisse")
                }}
                active={
                  this.props.routerProps.location.pathname === "/clientTask/appel_caisse"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-primary align-middle" />
                <span className="align-middle ml-1">appel caisse</span>
              </ListGroupItem>
            </ListGroup>
          </PerfectScrollbar>
        </div>
      </React.Fragment>
    )
  }
}

export default connect(null, { changeFilter })(FilterSidebar)
