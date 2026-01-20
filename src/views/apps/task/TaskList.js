import React from "react";
import { Button, FormGroup, Input } from "reactstrap";
import { Menu, Search, Check, Info, Star, Trash } from "react-feather";
import PerfectScrollbar from "react-perfect-scrollbar";
import { connect } from "react-redux";
import {
  getTodos,
  completeTask,
  readTask,
  importantTask,
  trashTask,
  searchTask,
} from "../../../redux/actions/todo/index";
import Checkbox from "../../../components/@vuexy/checkbox/CheckboxesVuexy";
import SweetAlert from "react-bootstrap-sweetalert";
import dateConvert from "../../../helpers/dateConvert";

class TaskList extends React.Component {
  static getDerivedStateFromProps(props, state) {
    if (props.app.todo.routeParam !== state.currentLocation) {
      return {
        todos: props.app.todo.todos,
      };
    }
    // Return null if the state hasn't changed
    return null;
  }
  state = {
    Alert: false,
    delete_id: null,
    todos: [],

    handleUpdateTask: null,
    currentLocation: this.props.routerProps.location.pathname,
  };
  _isMounted = false;

  async componentDidMount() {
    this._isMounted = true;
    await this.props.getTodos(this.props.routerProps.match.params);
    if (this._isMounted) {
      this.setState({
        todos: this.props.app.todo.todos,
        handleUpdateTask: this.props.handleUpdateTask,
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }



  render() {
    const { todos, handleUpdateTask } = this.state;
    let routerFilter = this.props.routerProps.match.params.filter;
    let todosArr = this.props.searchQuery.length ? this.props.app.todo.filteredTodos : todos;
    let renderTodos =
      todosArr.length > 0 ? (
        todosArr.map((todo, i) => {
          return (
            <li
              className={`todo-item ${todo.isCompleted ? "completed" : ""} py-2 px-3 border-bottom`}
              key={i}
              onClick={() => {
                handleUpdateTask(todo);
              }}
              style={{ transition: "background-color 0.2s" }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center flex-grow-1" style={{ maxWidth: "70%" }}>
                  <Checkbox
                    color="primary"
                    className="user-checkbox mr-1"
                    icon={<Check className="vx-icon" size={12} />}
                    label={""}
                    checked={todo.isCompleted}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      this.props.completeTask(todo);
                    }}
                    onChange={(e) => e.stopPropagation()}
                  />

                  <div className="d-flex flex-column">
                    <div className="d-flex align-items-center">
                      <span className="font-weight-bold text-primary mr-1">{todo.task_customer?.name || "Client Inconnu"}</span>
                      {todo.task_customer?.subscribe_services && (
                        <span className="badge badge-light-primary badge-pill mr-1 font-small-1">
                          {todo.task_customer.subscribe_services}
                        </span>
                      )}
                      {todo.type && (
                        <span className={`badge badge-light-${todo.type === "relance_caisse" ? "primary" :
                          todo.type === "relance_client" ? "warning" :
                            todo.type === "envoi_caisse" ? "success" :
                              todo.type === "envoi_client" ? "danger" :
                                todo.type === "appel_client" ? "info" : "secondary"
                          } badge-pill font-small-1`}>
                          {todo.type ? todo.type.replace("_", " ") : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-secondary mt-1">{todo.title}</span>
                    {todo.desc && <small className="text-muted mt-50 d-inline-block text-truncate" style={{ maxWidth: "400px" }}>{todo.desc}</small>}
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  {todo.end_date && (
                    <div className={`mr-2 font-small-3 ${new Date() > new Date(todo.end_date) ? "text-danger" : "text-muted"}`}>
                      {dateConvert(todo.end_date)}
                    </div>
                  )}
                  <div className="d-flex actions">
                    <Info
                      size={18}
                      className={`mr-1 cursor-pointer ${todo.isImportant ? "text-success" : "text-muted"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        this.props.importantTask(todo);
                      }}
                    />
                    <Star
                      size={18}
                      className={`mr-1 cursor-pointer ${todo.isRead ? "text-warning" : "text-muted"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        this.props.readTask(todo);
                      }}
                    />
                    {routerFilter !== "trashed" && (
                      <Trash
                        size={18}
                        className="text-muted cursor-pointer hover-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          this.setState({ delete_id: todo.id, Alert: true });
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })
      ) : (
        <p className="p-1 text-center mt-2 font-medium-3 text-bold-500">
          Pas de tâches trouvées.
        </p>
      );

    return (
      <div className="w-100 h-100 d-flex flex-column">
        <SweetAlert
          warning
          title="Warning"
          show={this.state.Alert}
          onConfirm={() => {
            this.setState({ Alert: false });
            this.props.trashTask(this.state.delete_id);
          }}
        >
          <p className="sweet-alert-text"> Êtes-vous certain? </p>
        </SweetAlert>

        <PerfectScrollbar
          className="todo-task-list flex-grow-1"
          options={{
            wheelPropagation: false,
          }}
          style={{ height: "100%" }}
        >
          <ul className="todo-task-list-wrapper list-unstyled p-0 m-0 w-100">{renderTodos}</ul>
        </PerfectScrollbar>
      </div>
    );

  }
}
const mapStateToProps = (state) => {
  return {
    app: state.todoApp,
  };
};
export default connect(mapStateToProps, {
  getTodos,
  completeTask,
  readTask,
  importantTask,
  trashTask,
  searchTask,
})(TaskList);
