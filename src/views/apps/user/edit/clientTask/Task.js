import React from "react";
import ClientTaskNavbar from "./ClientTaskNavbar";
import TaskList from "./TaskList";
import TaskSidebar from "./TaskSidebar";
import "../../../../../assets/scss/pages/app-todo.scss";
import axios from "axios";

class TODO extends React.Component {
  _isMounted = false;

  state = {
    addTask: false,
    taskToUpdate: null,
    prevState: null,
    customer: null,
    role: localStorage.getItem("role"),
    searchQuery: "",
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleAddTask = (status) => {
    status === "open"
      ? this.setState({ addTask: true })
      : this.setState({ addTask: false, taskToUpdate: null });
  };
  handleUpdateTask = (todo) => {
    if (todo !== undefined) {
      this.setState({ addTask: true, taskToUpdate: todo });
    } else {
      this.setState({ taskToUpdate: null });
    }
  };

  handleUndoChanges = (arr) => {
    this.setState({
      prevState: arr,
    });
  };

  handleSearch = (query) => {
    this.setState({ searchQuery: query });
  }

  async componentDidMount() {
    this._isMounted = true;
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };
    await axios
      .get(
        global.config.server_url + "/users/" + this.props.match.params.id,
        Config
      )
      .then((response) => {
        if (this._isMounted) {
          this.setState({ customer: response.data });
        }
      });
  }
  render() {
    return (
      <div
        className="todo-application w-100 bg-white d-flex flex-column"
        style={{ height: '100%', border: 'none', borderRadius: 0, boxShadow: 'none' }}
      >
        {(this.state.role === "admin" || this.state.role === "Expert") && (
          <div
            className={`app-content-overlay ${this.state.addTask ? "show" : ""
              }`}
            onClick={() => {
              this.handleAddTask("close");
            }}
          />
        )}

        <ClientTaskNavbar
          id={this.props.match.params.id}
          routerProps={this.props}
          addTask={this.handleAddTask}
          embedded={this.props.embedded}
          onSearch={this.handleSearch}
        />

        <div className="flex-grow-1 overflow-hidden">
          <TaskList
            routerProps={this.props}
            handleUpdateTask={this.handleUpdateTask}
            prevState={this.state.prevState}
            searchQuery={this.state.searchQuery}
            embedded={this.props.embedded}
            addTask={this.handleAddTask}
          />
        </div>
          <TaskSidebar
            receivers={this.state.customer ? [{ value: this.state.customer.id, label: this.state.customer.first_name + " " + this.state.customer.last_name, subscribe_services: this.state.customer.subscribe_services }] : []}
            addTask={this.handleAddTask}
            addTaskState={this.state.addTask}
            taskToUpdate={this.state.taskToUpdate}
            newTask={this.state.newTask}
            handleUndoChanges={this.handleUndoChanges}
          />
      </div>
    );
  }
}

export default TODO;
