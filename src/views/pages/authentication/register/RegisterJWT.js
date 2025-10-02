import React from "react"
import { Form, FormGroup, Input, Label, Button } from "reactstrap"
import Checkbox from "../../../../components/@vuexy/checkbox/CheckboxesVuexy"
import { Check, Eye, EyeOff } from "react-feather"
import { connect } from "react-redux"
import { signupWithJWT } from "../../../../redux/actions/auth/registerActions"
import { history } from "../../../../history"

class RegisterJWT extends React.Component {
  state = {
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    confirmPass: "",
    showPassword: false,
    showConfirm: false,
  }
  toggleShowPassword = () =>
    this.setState(prev => ({ showPassword: !prev.showPassword }))

  toggleShowConfirm = () =>
    this.setState(prev => ({ showConfirm: !prev.showConfirm }))

  handleRegister = e => {
    e.preventDefault()
    if (this.state.password !== this.state.confirmPass) {
      alert("Les mots de passe ne correspondent pas.")
      return
    }
    this.props.signupWithJWT(
      this.state.email,
      this.state.password,
      this.state.first_name,
      this.state.last_name
    )
  }

  render() {
    return (
      <Form action="/" onSubmit={this.handleRegister}>
        <FormGroup className="form-label-group">
          <Input
            type="text"
            placeholder="Nom"
            required
            value={this.state.last_name}
            onChange={e => this.setState({ last_name: e.target.value })}
          />
          <Label>Nom</Label>
        </FormGroup>
        <FormGroup className="form-label-group">
          <Input
            type="text"
            placeholder="Prénom"
            required
            value={this.state.first_name}
            onChange={e => this.setState({ first_name: e.target.value })}
          />
          <Label>Prénom</Label>
        </FormGroup>
        <FormGroup className="form-label-group">
          <Input
            type="email"
            placeholder="E-mail"
            required
            value={this.state.email}
            onChange={e => this.setState({ email: e.target.value })}
          />
          <Label>E-mail</Label>
        </FormGroup>
        {/* Mot de passe */}
        <FormGroup className="form-label-group position-relative has-icon-right">
          <Input
            type={this.state.showPassword ? "text" : "password"}
            placeholder="Mot de passe"
            required
            value={this.state.password}
            onChange={e => this.setState({ password: e.target.value })}
          />
          <button
            type="button"
            className="form-control-position right btn-reset"
            onClick={this.toggleShowPassword}
            aria-label={this.state.showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            title={this.state.showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {this.state.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <Label>Mot de passe</Label>
        </FormGroup>

        {/* Confirmer le mot de passe */}
        <FormGroup className="form-label-group position-relative has-icon-right">
          <Input
            type={this.state.showConfirm ? "text" : "password"}
            placeholder="Confirmer le mot de passe"
            required
            value={this.state.confirmPass}
            onChange={e => this.setState({ confirmPass: e.target.value })}
          />
          <button
            type="button"
            className="form-control-position right btn-reset"
            onClick={this.toggleShowConfirm}
            aria-label={this.state.showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            title={this.state.showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {this.state.showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <Label>Confirmer le mot de passe</Label>
        </FormGroup>

        <FormGroup>
          <Checkbox
            color="primary"
            icon={<Check className="vx-icon" size={16} />}
            label="J'accepte les termes et conditions."
            defaultChecked={true}
          />
        </FormGroup>
        <div className="d-flex justify-content-between">
          <Button.Ripple
            color="primary"
            outline
            onClick={() => {
              history.push("/pages/login")
            }}
          >
            Se connecter
          </Button.Ripple>
          <Button.Ripple color="primary" type="submit">
            Créer un compte
          </Button.Ripple>
        </div>
      </Form>
    )
  }
}
const mapStateToProps = state => {
  return {
    values: state.auth.register
  }
}
export default connect(mapStateToProps, { signupWithJWT })(RegisterJWT)
