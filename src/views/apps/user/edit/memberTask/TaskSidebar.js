/* eslint-disable */

import React from "react"
import {
  Input,
  Button,
  FormGroup,
  UncontrolledDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle, Col,Row,
} from "reactstrap"
import { X, Info, Star, Tag, Check } from "react-feather"
import Checkbox from "../../../../../components/@vuexy/checkbox/CheckboxesVuexy"
import PerfectScrollbar from "react-perfect-scrollbar"
import { connect } from "react-redux"
import {
  readTask,
  completeTask,
  importantTask,
  updateTask,
  updateLabel,
  addNewTask
} from "../../../../../redux/actions/client-todo/index"
import Radio from "../../../../../components/@vuexy/radio/RadioVuexy";
import Select from "react-select";
import "flatpickr/dist/themes/light.css";
import "../../../../../../src/assets/scss/plugins/forms/flatpickr/flatpickr.scss"
import Flatpickr from "react-flatpickr";
var senders = [];
class FilterSidebar extends React.Component {

  state = {
    basicPicker : new Date(),
    role: localStorage.getItem('role'),
    taskToUpdate: null,
    taskTitle: "",
    taskDesc: "",
    taskStatus : false,
    taskRead : false,
    taskImportant  : false,
    taskType:"",
    taskEndDate:'',
    newTask: {
      receiver:'',
      title: "",
      desc: "",
      type: "",
      isCompleted: false,
      isImportant: false,
      isRead: false,
      end_date:'',
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    if(this.props.taskToUpdate !== null && this.state.taskToUpdate !== this.props.taskToUpdate){
      this.setState({
        taskToUpdate : this.props.taskToUpdate,
        taskTitle :  this.props.taskToUpdate.title,
        taskDesc :  this.props.taskToUpdate.desc,
        taskStatus : this.props.taskToUpdate.isCompleted,
        taskRead : this.props.taskToUpdate.isRead,
        taskImportant : this.props.taskToUpdate.isImportant,
        taskType : this.props.taskToUpdate.type,
        taskEndDate : this.props.taskToUpdate.end_date,
      })
    }else if(
        (this.props.taskToUpdate !== null && this.state.taskStatus !== this.props.taskToUpdate.isCompleted) ||
        (this.props.taskToUpdate !== null && this.state.taskRead !== this.props.taskToUpdate.isRead) ||
        (this.props.taskToUpdate !== null && this.state.taskImportant !== this.props.taskToUpdate.isImportant)){
      this.setState({
        taskStatus : this.props.taskToUpdate.isCompleted,
        taskRead : this.props.taskToUpdate.isRead,
        taskImportant : this.props.taskToUpdate.isImportant,
      })
    }
    else{
      return
    }
  }

  handleNewTaskTags = tag => {
    let tagsArr = this.state.newTask.tags
    if (tagsArr.includes(tag)) {
      tagsArr.splice(tagsArr.indexOf(tag), 1)
    } else {
      tagsArr.push(tag)
    }
    this.setState({
      ...this.state.newTask,
      tags: tag
    })
  }
  renderTags = taskArr => {
    return taskArr.map((tag, i) => (
        <div className="chip mb-0 mr-50" key={i}>
          <div className="chip-body">
          <span className="chip-text">
            <span
                className={`bullet bullet-${
                    tag === "backend"
                        ? "warning"
                        : tag === "doc"
                        ? "success"
                        : tag === "bug"
                            ? "danger"
                            : "primary"
                } bullet-xs`}
            />
            <span className="text-capitalize ml-25">{tag}</span>
          </span>
          </div>
        </div>
    ))
  }
  handleEndDate = date => {
    var str_date = new Date(date[0])
    var MyDateString = str_date.getFullYear() + "-" + ('0' + (str_date.getMonth()+1)).slice(-2) + "-" + ('0' + str_date.getDate()).slice(-2)

      if (this.props.taskToUpdate !== null){
        this.setState({ taskEndDate: MyDateString })
      }
      else{
        this.setState({ newTask : { ...this.state.newTask, end_date : MyDateString } })
      }
  }
  render() {
    const { taskToUpdate, taskTitle, taskDesc, newTask, taskStatus, taskType, taskEndDate,taskImportant,taskRead } = this.state;

    return (
        <div
            className={`task-sidebar ${
                this.props.addTaskState === true ? "show" : ""
            }`}
        >
          <div className="task-header">
            <div className="d-flex justify-content-between">
              <div className="task-type-title text-bold-600">
                <h3>
                  {this.props.taskToUpdate && this.props.taskToUpdate.id
                      ? "Update Task"
                      : "Add Task"}
                </h3>
              </div>
              <div className="close-icon">
                <X
                    className="cursor-pointer"
                    size={20}
                    onClick={() => this.props.addTask("close")}
                />
              </div>
            </div>
          </div>
          <PerfectScrollbar>
            <div className="task-body">
              <div className="d-flex justify-content-between" style={{marginBottom:'10px'}}>
                <div className="mark-complete">
                  {this.props.taskToUpdate && this.props.taskToUpdate.id && <Checkbox
                      color="primary"
                      className="user-checkbox"
                      icon={<Check className="vx-icon" size={15} />}
                      label={""}
                      checked={ taskStatus }
                      onChange={e =>  {
                        this.props.completeTask(this.props.taskToUpdate)
                      }}
                  />}
                </div>
                <div className="task-actions">
                  <Info
                      size={20}
                      className={`mr-50 ${
                          (this.props.taskToUpdate !== null && this.state.taskImportant) ||
                          newTask.isImportant
                              ? "text-success"
                              : ""
                      }`}
                      onClick={() => {
                        if (this.props.taskToUpdate !== null){
                          this.props.importantTask(this.props.taskToUpdate)
                        }
                        else{
                          this.setState({
                            newTask : {
                              ...this.state.newTask,
                              isImportant : !this.state.newTask.isImportant
                            }
                          })
                        }

                      }}
                  />
                  <Star
                      size={20}
                      className={`mr-50 ${
                          (this.props.taskToUpdate !== null  && this.state.taskRead) ||
                          newTask.isRead
                              ? "text-warning"
                              : ""
                      }`}
                      onClick={() => {
                        if (this.props.taskToUpdate !== null){
                          this.props.readTask(this.props.taskToUpdate)
                        }
                        else{
                          this.setState({
                            newTask : {
                              ...this.state.newTask,
                              isRead : !this.state.newTask.isRead
                            }
                          })
                        }

                      }}
                  />
                </div>
              </div>
              <FormGroup style={{marginBottom:'10px'}}>
                <Input
                    type="text"
                    placeholder="Title"
                    value={
                      this.props.taskToUpdate !== null ? taskTitle : newTask.title
                    }
                    onChange={e => {
                      if (this.props.taskToUpdate !== null) {
                        this.setState({
                          taskTitle : e.target.value
                        })
                      }else{
                        this.setState({ newTask : {
                            ...this.state.newTask,
                            title : e.target.value
                          } })
                      }
                    }}
                />
              </FormGroup>
              <FormGroup style={{marginBottom:'10px'}}>
                <Input
                    type="textarea"
                    placeholder="Description"
                    rows="4"
                    value={
                      this.props.taskToUpdate !== null ? taskDesc : newTask.desc
                    }
                    onChange={e => {
                      if (this.props.taskToUpdate !== null){
                        this.setState({
                          taskDesc: e.target.value
                        })
                      }
                      else{
                        this.setState({ newTask : {
                            ...this.state.newTask,
                            desc : e.target.value
                          } })
                      }
                    }}
                />
              </FormGroup>
              <FormGroup style={{marginBottom:'10px'}}>

                {this.props.taskToUpdate !== null &&
                    <Flatpickr
                        id="end_date"
                        className="form-control"
                        options={{ dateFormat: "d/m/Y" }}
                        defaultValue={this.props.taskToUpdate.end_date}
                        placeholder="End Date"
                        onChange={date => this.handleEndDate(date)}
                    />
                }
                {this.props.taskToUpdate == null &&
                  <Flatpickr
                      id="end_date"
                      className="form-control"
                      options={{ dateFormat: "d/m/Y" }}
                      placeholder="End Date"
                      onChange={date => this.handleEndDate(date)}
                  />
                }
              </FormGroup>
              <Row style={{marginLeft:'10px',marginBottom:'5px'}}>
                <Col md="6" sm="12">
                  <FormGroup style={{marginBottom:'3px'}}>
                    <div className="d-inline-block mr-1">
                      {
                        this.props.taskToUpdate !== null &&
                        <Radio
                            label="relance caisse"
                            color="primary"
                            defaultChecked={this.props.taskToUpdate.type == "relance_caisse" ? true : false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                              // this.props.updateLabel(taskToUpdate.id, "backend")
                                this.setState({ taskType:"relance_caisse"})
                            }}
                        />
                      }
                      {
                        this.props.taskToUpdate == null &&
                        <Radio
                            label="relance caisse"
                            color="primary"
                            defaultChecked={true}
                            name="type"
                            onChange={e => {
                              e.stopPropagation()
                              this.setState({ newTask : {
                                  ...this.state.newTask,
                                  type : "relance_caisse"
                              }})
                            }}
                        />
                      }
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6" sm="12">
                  <FormGroup style={{marginBottom:'3px'}}>
                    <div className="d-inline-block mr-1">
                      {
                        this.props.taskToUpdate !== null &&
                        <Radio
                            label="relance client"
                            color="warning"
                            defaultChecked={ this.props.taskToUpdate.type == "relance_client" ? true : false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({ taskType:"relance_client"})
                            }}
                        />
                      }
                      {
                        this.props.taskToUpdate == null &&
                        <Radio
                            label="relance client"
                            color="warning"
                            defaultChecked={false}
                            name="type"

                            onChange={e => {
                                e.stopPropagation()
                                this.setState({
                                  newTask: {
                                    ...this.state.newTask,
                                    type: "relance_client"
                                  }
                                })
                            }}
                        />
                      }
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6" sm="12">
                  <FormGroup style={{marginBottom:'3px'}}>
                    <div className="d-inline-block mr-1">
                      {
                        this.props.taskToUpdate !== null &&
                        <Radio
                            label="envoi caisse"
                            color="success"
                            defaultChecked={this.props.taskToUpdate.type == "envoi_caisse" ? true : false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({ taskType:"envoi_caisse"})
                            }}
                        />
                      }
                      {
                        this.props.taskToUpdate == null &&
                        <Radio
                            label="envoi caisse"
                            color="success"
                            defaultChecked={false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({
                                  newTask: {
                                    ...this.state.newTask,
                                    type: "envoi_caisse"
                                  }
                                })
                            }}
                        />
                      }
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6" sm="12">
                  <FormGroup style={{marginBottom:'3px'}}>
                    <div className="d-inline-block mr-1">
                      {
                        this.props.taskToUpdate !== null &&
                        <Radio
                            label="envoi client"
                            color="danger"
                            defaultChecked={ this.props.taskToUpdate.type == "envoi_client" ? true : false}
                            name="type"
                            onChange={e => {
                              e.stopPropagation()
                              this.setState({ taskType:"envoi_client"})
                            }}
                        />
                      }
                      {
                        this.props.taskToUpdate == null &&
                        <Radio
                            label="envoi client"
                            color="danger"
                            defaultChecked={false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({
                                  newTask: {
                                    ...this.state.newTask,
                                    type: "envoi_client"
                                  }
                                })
                            }}
                        />
                      }
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6" sm="12">
                  <FormGroup style={{marginBottom:'3px'}}>
                    <div className="d-inline-block mr-1">
                      {
                        this.props.taskToUpdate !== null &&
                        <Radio
                            label="appel client"
                            color="info"
                            defaultChecked={this.props.taskToUpdate.type == "appel_client" ? true : false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({ taskType:"appel_client"})
                            }}
                        />
                      }
                      {
                        this.props.taskToUpdate == null &&
                        <Radio
                            label="appel client"
                            color="info"
                            defaultChecked={false}
                            name="type"
                            onChange={e => {
                              e.stopPropagation()
                                this.setState({
                                  newTask: {
                                    ...this.state.newTask,
                                    type: "appel_client"
                                  }
                                })
                            }}
                        />
                      }
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6" sm="12">
                  <FormGroup style={{marginBottom:'3px'}}>
                    <div className="d-inline-block mr-1">
                      {
                        this.props.taskToUpdate !== null &&
                        <Radio
                            label="appel caisse"
                            color="primary"
                            defaultChecked={this.props.taskToUpdate.type == "appel_caisse" ? true : false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({ taskType:"appel_caisse"})
                            }}
                        />
                      }
                      {
                        this.props.taskToUpdate == null &&
                        <Radio
                            label="appel caisse"
                            color="primary"
                            defaultChecked={false}
                            name="type"
                            onChange={e => {
                                e.stopPropagation()
                                this.setState({
                                  newTask: {
                                    ...this.state.newTask,
                                    type: "appel_caisse"
                                  }
                                })
                            }}
                        />
                      }
                    </div>
                  </FormGroup>
                 </Col>
              </Row>
              {
                (this.state.role == "admin"|| this.state.role == "Technician EOR") &&
                    <>
                      <hr style={{marginBottom:'10px', marginTop:0}}/>
                      <div className="d-flex justify-content-end">
                <Button.Ripple
                    className="mr-50"
                    color="primary"
                    onClick={() => {
                      if (this.props.taskToUpdate !== null) {
                        var updateTask = {
                              receiver: this.props.customer_id,
                              title: taskTitle,
                              desc: taskDesc,
                              type: taskType,
                              isCompleted: taskStatus,
                              isImportant: taskImportant,
                              isRead: taskRead,
                              end_date:taskEndDate,
                          };
                        this.props.updateTask(taskToUpdate.id, updateTask)
                      } else {

                        var newTaskObject = this.state.newTask;
                            newTaskObject.receiver = this.props.customer_id;
                            this.props.addNewTask(this.state.newTask)
                      }
                      this.props.addTask("close")
                      this.setState({
                        newTask: {
                          receiver:'',
                          title: "",
                          desc: "",
                          type: "",
                          isCompleted: false,
                          isImportant: false,
                          isRead: false,
                          end_date:'',
                        }
                      })
                    }}
                    disabled={
                      taskTitle.length > 0 || newTask.title.length > 0
                          ? false
                          : true
                    }
                >
                  {taskToUpdate &&
                  taskToUpdate.id &&
                  this.props.taskToUpdate !== null
                      ? "Update"
                      : "Add"}
                </Button.Ripple>
                <Button.Ripple
                    color="light"
                    outline
                    onClick={() => {
                      this.props.addTask("close")
                      this.setState({
                        newTask: {
                          receiver:'',
                          title: "",
                          desc: "",
                          type: "",
                          isCompleted: false,
                          isImportant: false,
                          isRead: false,
                          end_date:'',
                        }
                      })
                    }}
                >
                  Cancel
                </Button.Ripple>
              </div>
                    </>
              }
            </div>
          </PerfectScrollbar>
        </div>
    )
  }
}
const mapStateToProps = state => {
  return {
    app: state.todoApp
  }
}

export default connect(mapStateToProps, {
  completeTask,
  importantTask,
  readTask,
  updateTask,
  updateLabel,
  addNewTask
})(FilterSidebar)
/* eslint-disable */

