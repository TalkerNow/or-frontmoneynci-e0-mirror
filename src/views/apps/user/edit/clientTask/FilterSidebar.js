import React from "react";
import { Button, ListGroup, ListGroupItem } from "reactstrap";
import PerfectScrollbar from "react-perfect-scrollbar";
import { X, Layers, Star, Info, Check, ArrowLeft } from "react-feather";
import { connect } from "react-redux";
import { changeFilter } from "../../../../../redux/actions/client-todo/index";
import { history } from "../../../../../history";
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
          <div className="add-task">
            {this.props.customer && (
              <>
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    fontSize: "20px",
                    fontWeight: "bold",
                    marginTop: "20px",
                  }}
                >
                  {this.props.customer.first_name +
                    " " +
                    this.props.customer.last_name}
                </div>
                <div
                  style={{
                    color: "green",
                    fontSize: "11px",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  {this.props.customer.subscribe_services}
                </div>
              </>
            )}
            <Button.Ripple
              block
              className="btn-block my-1"
              color="primary"
              onClick={() => {
                history.push("/app/user/edit/" + this.props.id + "/2");
              }}
              aria-label="Retour"
              title="Retour"
            >
              <ArrowLeft size={16} className="mr-50" />
              Retour
            </Button.Ripple>
            <Button.Ripple
              block
              className="btn-block my-1"
              color="primary"
              onClick={() => {
                this.props.addTask("open");
                this.props.mainSidebar(false);
              }}
            >
              Ajouter une tâche
            </Button.Ripple>
          </div>
          <PerfectScrollbar
            className="sidebar-menu-list"
            options={{
              wheelPropagation: false,
            }}
          >
            <ListGroup className="font-medium-1">
              <ListGroupItem
                className="border-0 pt-0"
                action
                onClick={() => {
                  this.props.changeFilter(this.props.id, "all");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/all"
                    ? true
                    : false
                }
              >
                <Layers size={22} />
                <span className="align-middle ml-1">Tout</span>
              </ListGroupItem>
            </ListGroup>
            <hr />
            <h5 className="mt-2 mb-1 pt-25">Filtres</h5>
            <ListGroup className="font-medium-1">
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "unread");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/unread"
                    ? true
                    : false
                }
              >
                <Star size={22} />
                <span className="align-middle ml-1">Non lu</span>
              </ListGroupItem>
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "important");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/important"
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
                  this.props.changeFilter(this.props.id, "completed");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/completed"
                    ? true
                    : false
                }
              >
                <Check size={22} />
                <span className="align-middle ml-1">Terminé</span>
              </ListGroupItem>
              {/*<ListGroupItem*/}
              {/*    className="border-0"*/}
              {/*    onClick={() => {*/}
              {/*      this.props.changeFilter("trashed")*/}
              {/*    }}*/}
              {/*    active={*/}
              {/*      this.props.routerProps.location.pathname === "/task/trashed"*/}
              {/*          ? true*/}
              {/*          : false*/}
              {/*    }*/}
              {/*>*/}
              {/*  <Trash size={22} />*/}
              {/*  <span className="align-middle ml-1">Trashed</span>*/}
              {/*</ListGroupItem>*/}
            </ListGroup>
            <hr />
            <h5 className="mt-2 mb-1 pt-25">Labels</h5>
            <ListGroup className="font-medium-1">
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "relance_caisse");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/relance_caisse"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-primary align-middle" />
                <span className="align-middle ml-1">Relance caisse</span>
              </ListGroupItem>
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "relance_client");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/relance_client"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-warning align-middle" />
                <span className="align-middle ml-1">Relance client</span>
              </ListGroupItem>
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "envoi_caisse");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/envoi_caisse"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-success align-middle" />
                <span className="align-middle ml-1">Envoi caisse</span>
              </ListGroupItem>
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "envoi_client");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/envoi_client"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-danger align-middle" />
                <span className="align-middle ml-1">Envoi client</span>
              </ListGroupItem>
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "appel_client");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/appel_client"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-info align-middle" />
                <span className="align-middle ml-1">Appel client</span>
              </ListGroupItem>
              <ListGroupItem
                className="border-0"
                onClick={() => {
                  this.props.changeFilter(this.props.id, "appel_caisse");
                }}
                active={
                  this.props.routerProps.location.pathname ===
                    "/app/user/task/" + this.props.id + "/appel_caisse"
                    ? true
                    : false
                }
              >
                <span className="bullet bullet-primary align-middle" />
                <span className="align-middle ml-1">Appel caisse</span>
              </ListGroupItem>
            </ListGroup>
          </PerfectScrollbar>
        </div>
      </React.Fragment>
    );
  }
}

export default connect(null, { changeFilter })(FilterSidebar);
