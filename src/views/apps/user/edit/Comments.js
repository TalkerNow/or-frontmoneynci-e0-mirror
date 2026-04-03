import React from "react";
import { Card, CardBody, Form, Input, Button } from "reactstrap";

import axios from "axios";
import { toast } from "react-toastify";

class CommentsTab extends React.Component {
  state = {
    comments: this.props.perso.comments,
  };

  updateComments = (information) => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    axios
      .put(
        global.config.server_url + "/personal_information/" + this.props.id,
        {
          comments: information.comments,
        },
        Config
      )
      .then((response) => {
        toast.info("Modifications enregistrées");
      });
  };

  ifExist(name) {
    if (this.props.perso) return this.props.perso[name];
    else return "";
  }

  updateInfo = (e) => {
    e.preventDefault();
    this.updateComments(this.state);
  };

  render() {
    return (
      <Card className="notes-card notes-card--compact h-100">
        <CardBody className="d-flex flex-column">
          <Form className="notes-form" onSubmit={this.updateInfo}>
            <div className="d-flex align-items-center justify-content-between mb-50">
              <h5 className="notes-card-title mb-0">Notes interne consultant</h5>
            </div>
            <Input
              type="textarea"
              className="notes-textarea"
              placeholder="Commentaires"
              defaultValue={this.ifExist("comments")}
              onChange={(e) => this.setState({ comments: e.target.value })}
            />
            <div
              className="notes-form-actions notes-action-row d-flex align-items-center justify-content-end"
              style={{ marginTop: "0.75rem", gap: "0.5rem" }}
            >
              <Button
                className="notes-action-btn"
                color="primary"
                type="submit"
              >
                Enregistrer
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    );
  }
}
export default CommentsTab;
