import React from "react"
import {
  FormGroup,
  Input,
  CustomInput,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardHeader, Button, Form,
  // Button
} from "reactstrap"
import {history} from "../../../../history";
import axios from "axios";
import {toast} from "react-toastify"
import SweetAlert from "react-bootstrap-sweetalert";

toast.configure(); // required to work with toast
var generator = require('generate-password');

class AddSubService extends React.Component {
  state = {
      Alert : false,
    data: {
      name: null,
      description: null,
      variable: "€ HT",
      value: null,
      variable1: "Nombre",
      value1: null,
      total_ht: null,
      total_ttc: null,
      tva: null,
    }
  }

  handleAlert = (value) => {
    this.setState({ Alert : value })
    if (value === false)
      history.push("/app/user/conslist")

  }

  sendForm = (data) => {

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.post(global.config.server_url + "/services",  {
      name: data.name,
      description: data.description,
      variable: data.variable,
      value: data.value,
      variable1: data.variable1,
      value1: data.value1,
      total_ht: data.total_ht,
      total_ttc: data.total_ttc,
      tva: data.tva,
      parent_id: this.props.match.params.id,
      document_id: 0,
      status: "template"
    }, Config)
        .then(function(result) {
          console.log(result)
        })
        .catch(function(error) {
          toast.error("API injoignable" + data.name)
        })
  }

  handleSubmit = e => {
    e.preventDefault()
    this.sendForm(this.state.data)
    this.handleAlert(true)
  }
  render() {
    return (
      <Form action="/" onSubmit={this.handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Création d'une prestation</CardTitle>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="Nom de la préstation"
                    required
                    value={this.state.data.name}
                    onChange={e => this.setState({ data: { ...this.state.data, name: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="Description de la préstation"
                    required
                    value={this.state.data.description}
                    onChange={e => this.setState({ data: { ...this.state.data, description: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="€ HT"
                    required
                    value={this.state.data.variable}
                    onChange={e => this.setState({ data: { ...this.state.data, variable: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="valeur du paramètre '€ HT'"
                    required
                    value={this.state.data.value}
                    onChange={e => this.setState({ data: { ...this.state.data, value: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="Quantité"
                    required
                    value={this.state.data.variable1}
                    onChange={e => this.setState({ data: { ...this.state.data, variable1: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="valeur du paramètre 'Quantité'"
                    required
                    value={this.state.data.value1}
                    onChange={e => this.setState({ data: { ...this.state.data, value1: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="Total TTC"
                    required
                    value={this.state.data.total_ttc}
                    onChange={e => this.setState({ data: { ...this.state.data, total_ttc: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="TOTAL HT"
                    required
                    value={this.state.data.total_ht}
                    onChange={e => this.setState({ data: { ...this.state.data, total_ht: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md="6" sm="12">
              <FormGroup>
                <Input
                    type="text" placeholder="TVA"
                    required
                    value={this.state.data.tva}
                    onChange={e => this.setState({ data: { ...this.state.data, tva: e.target.value} })}
                />
              </FormGroup>
            </Col>
            <Col md={{ size: 9, offset: 5 }}>
              <Button.Ripple
                  color="primary"
                  type="submit"
                  className="mr-1 mb-1"
              >
                Enregistrer
              </Button.Ripple>
            </Col>
          </Row>
        </CardBody>
      </Card>
      </Form>
    )
  }
}

export default AddSubService
