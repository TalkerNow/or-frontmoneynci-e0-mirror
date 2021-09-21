/* eslint-disable */

import React, { useState, useEffect } from "react"
import {
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Col,
    Row,
    CardImg,
    DropdownToggle,
    DropdownMenu,
    DropdownItem, UncontrolledButtonDropdown, Button
} from "reactstrap"
import { useDropzone } from "react-dropzone"
import Dropzone  from "react-dropzone"
import "../../../../assets/scss/plugins/extensions/dropzone.scss"
import {ChevronDown, DownloadCloud, Eye} from "react-feather";
import axios from "axios";
import pdf_icon_img from "../../../../../src/assets/img/icons/pdf_icon.png"
import excel_icon_img from "../../../../../src/assets/img/icons/excel_icon.png"
import image_icon_img from "../../../../../src/assets/img/icons/image_icon.png"
import doc_icon_img from "../../../../../src/assets/img/icons/doc_icon.png"
import csv_icon_img from "../../../../../src/assets/img/icons/csv_icon.png"
import {waiterHide, waiterShow} from "../../../../helpers/waiter";
class DropzoneBasic extends React.Component {
    state = { files: [], dates:[] }
    async componentDidMount() {
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
        axios.get(global.config.server_url + "/files?user_id=" + this.props.id, Config).then(response => {
            console.log(response.data);
            var dates = [];
            var cur_date = null;
            response.data.forEach(file => {
                var tmp_date = new Date(file.created_at);
                var str_date = ('0' + tmp_date.getDate()).slice(-2)+ "/" +  ('0' + (tmp_date.getMonth()+1)).slice(-2) + "/"+tmp_date.getFullYear();

                if(cur_date != str_date){
                    dates.push(str_date);
                    cur_date = str_date;
                }
            });
            this.setState({ dates: dates })
            this.setState({ files: response.data })
        })
    }
    onDrop = (acceptedFiles) => {
        acceptedFiles.forEach(file => {
            // req.attach(file.name, file);
        });
        var formData = new FormData();
        formData.set("user_id", this.props.id);
        acceptedFiles.forEach((file, i) => {
            formData.append("photoUpload" + i, file);
        });
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token"),
                'Content-Type': "multipart/form-data"
            }
        }
        axios.post(global.config.server_url+"/uploadFiles",formData, Config)
            .then(response => {
                if(response.data.success == true){
                    var file_array = [...this.state.files];
                    var date_array = [...this.state.dates];
                    response.data.files.forEach(file => {
                        var tmp_date = new Date(file.created_at);
                        var str_date = ('0' + tmp_date.getDate()).slice(-2)+ "/" +  ('0' + (tmp_date.getMonth()+1)).slice(-2) + "/"+tmp_date.getFullYear();
                        if(date_array.includes(str_date) == false)
                            date_array.push(str_date);
                        file_array.push(file)
                    });
                    this.setState({ dates: date_array })
                    this.setState({ files: file_array })
                }else
                    console.log("uploadFail!");
            });
    }
    removeFile = (id) =>{
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
        axios.delete(global.config.server_url + "/files/" + id, Config).then(response => {
            var file_array = [...this.state.files];
            const fileIndex = file_array.findIndex(function(item) {
                return item.id == id;
            });

            var deleted_file = file_array.find(x => x.id == id);
            var tmp_date = new Date(deleted_file.created_at);
            var str_deleted_date = ('0' + tmp_date.getDate()).slice(-2)+ "/" +  ('0' + (tmp_date.getMonth()+1)).slice(-2) + "/"+tmp_date.getFullYear();

            if(fileIndex !== -1){
                file_array.splice(fileIndex, 1);
            }

            //----- remove item if date doesn't exist in date_array
            var date_array = [...this.state.dates];
            var isExist = false;
            file_array.forEach(file => {
                var date1 = new Date(file.created_at);
                var str_date = ('0' + date1.getDate()).slice(-2)+ "/" +  ('0' + (date1.getMonth()+1)).slice(-2) + "/"+date1.getFullYear();
                if(str_date == str_deleted_date){
                    isExist = true;
                }
            });
            if(!isExist){
                var index = date_array.indexOf(str_deleted_date);
                if (index !== -1) {
                    date_array.splice(index, 1);
                }
            }

            this.setState({ dates: date_array })
            this.setState({ files: file_array })
        })
    }
    download=(file_id, file_url)=>{
        waiterShow();
        const Config = {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            },
            responseType: 'blob'
        }
        axios.get(global.config.server_url + "/downloadFile?file_id=" + file_id, Config).then(response => {
            waiterHide();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            let lst_filename = file_url.split("/");
            link.setAttribute('download', lst_filename[lst_filename.length - 1]);
            document.body.appendChild(link);
            link.click();
        }).catch(error => {
            waiterHide();
            console.log("there is no file");
        });
    }
    render() {
        return (
            <>
                <Card>
                  <CardBody>
                    <Dropzone onDrop={this.onDrop}>
                      {({getRootProps, getInputProps}) => (
                          <div {...getRootProps(({ className: "dropzone" }))}>
                            <input {...getInputProps()} />
                            <DownloadCloud className="text-light" size={50} />
                            <p className="mx-1">
                              Drag files here or click to select files
                            </p>
                          </div>
                      )}
                    </Dropzone>
                  </CardBody>
                </Card>
                {this.state.dates.length > 0 && this.state.dates.map((cur_date) => (
                    <>
                        <div style={{textAlign:'center',marginBottom:'5px', marginTop:'40px '}} width="90%">{cur_date}</div>
                        <div style={{height:'1px', background:'#dfdfdf',marginBottom:'15px'}} width="90%"></div>
                        <Row style={{textAlign:'center'}}>
                            {this.state.files.length > 0 && this.state.files.map((file) => {
                                var tmp_date = new Date(file.created_at);
                                var str_date = ('0' + tmp_date.getDate()).slice(-2)+ "/" +  ('0' + (tmp_date.getMonth()+1)).slice(-2) + "/"+tmp_date.getFullYear();
                                if(cur_date == str_date){
                                    return <Col xl="2" sm="12">
                                        <Card>
                                            <CardBody>
                                                <div style={{position: 'absolute', marginLeft: '65%', marginTop: '5%'}}>
                                                  <UncontrolledButtonDropdown>
                                                    <DropdownToggle color="flat-dark" caret style={{
                                                      width: '30px',
                                                      height: '22px',
                                                      background: '#e6e6e6',
                                                      padding: '5px'
                                                    }}>
                                                      <h3 style={{color: '#747373', marginTop: '-13px'}}>...</h3>
                                                    </DropdownToggle>
                                                    <DropdownMenu>
                                                      <DropdownItem tag="a"><a href={file.url} style={{color: '#5e5e5e'}}
                                                                               target="_blank">Open</a></DropdownItem>
                                                      <DropdownItem tag="a"
                                                                    onClick={e => this.removeFile(file.id)}>Remove</DropdownItem>
                                                      <DropdownItem tag="a"
                                                                   onClick={e => this.download(file.id, file.url)}>Download</DropdownItem>
                                                    </DropdownMenu>
                                                  </UncontrolledButtonDropdown>
                                                </div>
                                                {(() => {
                                                    if (file.filename.split('.').length > 0) {
                                                        var ext = file.filename.split('.').pop().toLowerCase();
                                                        if (ext == "jpg" || ext == "png" || ext == "gif" || ext == "tiff" || ext == "jfif")
                                                            return <CardImg src={image_icon_img} style={{width: '60%'}}/>
                                                        else if (ext == "pdf")
                                                            return <CardImg src={pdf_icon_img} style={{width: '60%'}}/>
                                                        else if (ext == "xls" || ext == "xlsx")
                                                            return <CardImg src={excel_icon_img} style={{width: '60%'}}/>
                                                        else if (ext == "doc" || ext == "docx")
                                                            return <CardImg src={doc_icon_img} style={{width: '60%'}}/>
                                                        else if (ext == "csv" || ext == "csv")
                                                            return <CardImg src={csv_icon_img} style={{width: '60%'}}/>
                                                    }
                                                })()}
                                                <div className="title-section" style={{height: '40px'}}>
                                                    <h5 className="text-bold-600 mt-1 mb-25"><a href={file.url}
                                                                                                style={{color: '#5e5e5e'}}
                                                                                                target="_blank">{file.filename}</a>
                                                    </h5>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                }
                            })}
                        </Row>
                    </>
                ))}
            </>
        )
    }
}

export default DropzoneBasic
/* eslint-disable */

