/* eslint-disable */

import React from "react"
import Sidebar from "react-sidebar"
import { ContextLayout } from "../../../utility/context/Layout"
import FilterSidebar from "./FilterSidebar"
import TaskList from "./TaskList"
import TaskSidebar from "./TaskSidebar"
import "../../../assets/scss/pages/app-todo.scss"
import axios from "axios";
const mql = window.matchMedia(`(min-width: 992px)`)

class TODO extends React.Component {
  state = {
    addTask: false,
    sidebarDocked: mql.matches,
    sidebarOpen: false,
    taskToUpdate: null,
    prevState: null,
    receivers:[],
    role: localStorage.getItem('role')
  }
  UNSAFE_componentWillMount() {
    mql.addListener(this.mediaQueryChanged)
  }

  componentWillUnmount() {
    mql.removeListener(this.mediaQueryChanged)
  }

  onSetSidebarOpen = open => {
    this.setState({ sidebarOpen: open })
  }

  mediaQueryChanged = () => {
    this.setState({ sidebarDocked: mql.matches, sidebarOpen: false })
  }

  handleAddTask = status => {
    status === "open"
        ? this.setState({ addTask: true })
        : this.setState({ addTask: false, taskToUpdate: null })
  }
  handleUpdateTask = todo => {
    if (todo !== undefined) {
      this.setState({ addTask: true, taskToUpdate: todo })
    } else {
      this.setState({ taskToUpdate: null })
    }
  }

  handleUndoChanges = arr => {
    this.setState({
      prevState: arr
    })
  }
    async componentDidMount() {
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
        await axios.get(global.config.server_url + "/users", Config).then(response => {
            var tmp_receivers = [];
            response.data.forEach(item => {
                tmp_receivers.push({value: item['id'], label: item['personal_informations']['first_name'] + " " + item['personal_informations']['last_name'],
                    subscribe_services: item.subscribe_services});
            });
            this.setState({receivers: tmp_receivers});
        })
    }
  render() {
    return (
        <div className="todo-application position-relative">
            {
                (this.state.role == "admin"|| this.state.role == "Expert") &&
                <div
                    className={`app-content-overlay ${
                        this.state.addTask || this.state.sidebarOpen ? "show" : ""
                    }`}
                    onClick={() => {
                        this.handleAddTask("close")
                        this.onSetSidebarOpen(false)
                    }}
                />
            }
          <ContextLayout.Consumer>
            {context => (
                <Sidebar
                    sidebar={
                      <FilterSidebar
                          routerProps={this.props}
                          addTask={this.handleAddTask}
                          mainSidebar={this.onSetSidebarOpen}
                      />
                    }
                    docked={this.state.sidebarDocked}
                    open={this.state.sidebarOpen}
                    sidebarClassName="sidebar-content todo-sidebar d-flex"
                    touch={false}
                    contentClassName="sidebar-children d-none"
                    pullRight={context.state.direction === "rtl"}>
                  ""
                </Sidebar>
            )}
          </ContextLayout.Consumer>
          <TaskList
              routerProps={this.props}
              handleUpdateTask={this.handleUpdateTask}
              mainSidebar={this.onSetSidebarOpen}
              prevState={this.state.prevState}
          />
          <TaskSidebar
              receivers={this.state.receivers}
              addTask={this.handleAddTask}
              addTaskState={this.state.addTask}
              taskToUpdate={this.state.taskToUpdate}
              newTask={this.state.newTask}
              mainSidebar={this.onSetSidebarOpen}
              handleUndoChanges={this.handleUndoChanges}
          />
        </div>
    )
  }
}

export default TODO
/* eslint-disable */

