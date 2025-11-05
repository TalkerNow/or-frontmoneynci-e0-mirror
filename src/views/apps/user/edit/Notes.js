import React from "react";
import { Row, Col, Button, Form, Input, Label, FormGroup } from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";

class UserInfoTab extends React.Component {
  state = {
    notes: this.props.perso?.notes ?? "",
    originalNotes: this.props.perso?.notes ?? "",
    hasChanged: false,
  };

  // 🔁 Si le parent recharge les infos (ou si on change d'utilisateur), on resynchronise.
  componentDidUpdate(prevProps) {
    const prevId = prevProps.id;
    const currId = this.props.id;

    const prevNotes = prevProps.perso?.notes ?? "";
    const currNotes = this.props.perso?.notes ?? "";

    // Changement d'utilisateur → reset propre
    if (prevId !== currId) {
      this.setState({
        notes: currNotes,
        originalNotes: currNotes,
        hasChanged: false,
      });
      return;
    }

    // Le parent a rafraîchi les notes → on sync si l'utilisateur n'est pas en train d'éditer
    if (prevNotes !== currNotes && !this.state.hasChanged) {
      this.setState({
        notes: currNotes,
        originalNotes: currNotes,
      });
    }
  }

  updateNotes = () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };

    axios
      .put(
        global.config.server_url + "/personal_information/" + this.props.id,
        { notes: this.state.notes },
        Config
      )
      .then(() => {
        toast.info("Modifications enregistrées");
        // ✅ On fige l'état local sur la valeur saisie, et on reset le flag
        this.setState((s) => ({
          originalNotes: s.notes,
          notes: s.notes,
          hasChanged: false,
        }));
      });
  };

  updateInfo = (e) => {
    e.preventDefault();
    if (this.state.hasChanged) this.updateNotes();
  };

  handleChange = (e) => {
    const newNotes = e.target.value;
    this.setState((s) => ({
      notes: newNotes,
      hasChanged: newNotes !== s.originalNotes,
    }));
  };

  render() {
    const { hasChanged, notes } = this.state;

    return (
      <Form onSubmit={this.updateInfo}>
        <Row className="mt-1">
          <Col md="12" sm="12">
            <FormGroup>
              <Label for="notes">Notes</Label>
              <Input
                id="notes"
                type="textarea"
                rows="9"
                placeholder="Notes"
                value={notes}
                onChange={this.handleChange}
              />
            </FormGroup>
          </Col>
          <Col className="d-flex justify-content-end flex-wrap" sm="12">
            <Button
              className="mr-1"
              color={hasChanged ? "primary" : "secondary"}
              type="submit"
              disabled={!hasChanged}
            >
              Enregistrer
            </Button>
          </Col>
        </Row>
      </Form>
    );
  }
}

export default UserInfoTab;
