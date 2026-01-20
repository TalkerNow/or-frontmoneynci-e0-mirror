/* eslint-disable */

import React from "react";
import TaskNavbar from "./TaskNavbar";
import TaskList from "./TaskList";
import TaskSidebar from "./TaskSidebar";
import "../../../assets/scss/pages/app-todo.scss";
import axios from "axios";
const mql = window.matchMedia(`(min-width: 992px)`);

class TODO extends React.Component {
  _isMounted = false;

  state = {
    addTask: false,
    sidebarDocked: mql.matches,
    sidebarOpen: false,
    taskToUpdate: null,
    prevState: null,
    receivers: [],
    role: localStorage.getItem("role"),
    searchQuery: "",
  };
  UNSAFE_componentWillMount() {
    mql.addListener(this.mediaQueryChanged);
  }

  componentWillUnmount() {
    this._isMounted = false;
    mql.removeListener(this.mediaQueryChanged);
  }

  onSetSidebarOpen = (open) => {
    this.setState({ sidebarOpen: open });
  };

  mediaQueryChanged = () => {
    this.setState({ sidebarDocked: mql.matches, sidebarOpen: false });
  };

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
      .get(global.config.server_url + "/users", Config)
      .then((response) => {
        if (this._isMounted) {
          var tmp_receivers = [];
          response.data.forEach((item) => {
            tmp_receivers.push({
              value: item["id"],
              label: item["first_name"] + " " + item["last_name"],
              subscribe_services: item.subscribe_services,
            });
          });
          this.setState({ receivers: tmp_receivers });
        }
      });
  }
  render() {
    return (
      <div
        className="todo-application w-100 bg-white d-flex flex-column"
        style={{ height: '100%', border: 'none', borderRadius: 0, boxShadow: 'none' }}
      >
        {(this.state.role == "admin" || this.state.role == "Expert") && (
          <div
            className={`app-content-overlay ${this.state.addTask ? "show" : ""
              }`}
            onClick={() => {
              this.handleAddTask("close");
            }}
          />
        )}

        <TaskNavbar
          routerProps={this.props}
          addTask={this.handleAddTask}
          onSearch={this.handleSearch}
        />

        <div className="flex-grow-1 overflow-hidden">
          <TaskList
            routerProps={this.props}
            handleUpdateTask={this.handleUpdateTask}
            prevState={this.state.prevState}
            searchQuery={this.state.searchQuery}
          />
        </div>
        <TaskSidebar
          receivers={this.state.receivers}
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
/* eslint-disable */
