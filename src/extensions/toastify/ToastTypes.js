import React from "react"
//import { Card, CardHeader, CardBody, CardTitle, Button } from "reactstrap"
import { Button } from "reactstrap" // delete if up line is uncommented
import { toast } from "react-toastify"


class Toastr extends React.Component {
    notifyInfo = () => toast.info("This is info toast!")
  render() {
    return (
        <Button.Ripple color="warning" onClick={this.notifyInfo} outline>
                Info
        </Button.Ripple>
    )
  }

    /*class Toastr extends React.Component {
      notifyDefault = () => toast("This is default toast!")
      notifySuccess = () => toast.success("This is success toast!")
      notifyError = () => toast.error("Email ou mot de passe invalide.")
      notifyInfo = () => toast.info("This is info toast!")
      notifyWarning = () => toast.warning("This is warning toast!")

      render() {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Types</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-inline-block mr-1 mb-1">
                <Button.Ripple color="primary" onClick={this.notifyDefault} outline>
                  Default
                </Button.Ripple>
              </div>
              <div className="d-inline-block mr-1 mb-1">
                <Button.Ripple color="success" onClick={this.notifySuccess} outline>
                  Success
                </Button.Ripple>
              </div>
              <div className="d-inline-block mr-1 mb-1">
                {" "}
                <Button.Ripple color="info" onClick={this.notifyError} outline>
                  Danger
                </Button.Ripple>{" "}
              </div>
              <div className="d-inline-block mr-1 mb-1">
                <Button.Ripple color="warning" onClick={this.notifyInfo} outline>
                  Info
                </Button.Ripple>{" "}
              </div>
              <div className="d-inline-block mr-1 mb-1">
                <Button.Ripple color="danger" onClick={this.notifyWarning} outline>
                  Warning
                </Button.Ripple>
              </div>
            </CardBody>
          </Card>
        )
      }
    }

    export default Toastr*/
}

export default Toastr
