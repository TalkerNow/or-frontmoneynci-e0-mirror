import React from "react";
import { Row, Col, Button, Form, Input, Label, FormGroup } from "reactstrap";

import axios from "axios";
import { toast } from "react-toastify";
//import {history} from "../../../../history";

class UserInfoTab extends React.Component {
  state = {
    notes: this.props.perso.notes,
  };

  updateNotes = (information) => {
    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    };

    axios
      .put(
        global.config.server_url + "/personal_information/" + this.props.id,
        {
          notes: information.notes,
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
    this.updateNotes(this.state);
    // history.push("/app/user/conslist");
  };

  render() {
    return (
      <Form onSubmit={this.updateInfo}>
        <Row className="mt-1">
          <Col md="12" sm="12">
            <FormGroup>
              <Label for="child_nbr">Notes</Label>
              <Input
                type="textarea"
                rows="9"
                placeholder="Notes"
                defaultValue={this.ifExist("notes")}
                onChange={(e) => this.setState({ notes: e.target.value })}
              />
            </FormGroup>
          </Col>
          <Col className="d-flex justify-content-end flex-wrap" sm="12">
            <Button.Ripple className="mr-1" color="primary" type="submit">
              Enregistrer
            </Button.Ripple>
            {/*<Button.Ripple color="flat-warning">Reset</Button.Ripple>*/}
          </Col>
        </Row>
      </Form>
    );
  }
}
export default UserInfoTab;
