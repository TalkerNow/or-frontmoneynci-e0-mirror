import React from "react"
import { Link } from "react-router-dom"
import { CardBody, FormGroup, Form, Input, Button, Label } from "reactstrap"
import Checkbox from "../../../../components/@vuexy/checkbox/CheckboxesVuexy"
import { Mail, Lock, Check, Eye, EyeOff } from "react-feather"
import { loginWithJWT } from "../../../../redux/actions/auth/loginActions"
import { connect } from "react-redux"
import { history } from "../../../../history"
import {toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

toast.configure();

class LoginJWT extends React.Component {
  state = {
    email: "",
    password: "",
    remember: false,
    showPassword: false
  }

  toggleShowPassword = () => {
    this.setState(prev => ({ showPassword: !prev.showPassword }))
  };

  handleLogin = e => {
    e.preventDefault()
    this.props.loginWithJWT(this.state)
  }

  render() {
    return (
      <React.Fragment>
        <CardBody className="pt-1">
          <Form action="/" onSubmit={this.handleLogin}>
            <FormGroup className="form-label-group position-relative has-icon-left">
              <Input
                type="email"
                placeholder="Email"
                value={this.state.email}
                onChange={e => this.setState({ email: e.target.value })}
                required
              />
              <div className="form-control-position">
                <Mail size={15} />
              </div>
              <Label>Email</Label>
            </FormGroup>
            <FormGroup className="form-label-group position-relative has-icon-left has-icon-right">
              <Input
                type={this.state.showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={this.state.password}
                onChange={e => this.setState({ password: e.target.value })}
                required
              />
              <div className="form-control-position">
                <Lock size={15} />
              </div>
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
            <FormGroup className="d-flex justify-content-between align-items-center">
              <Checkbox
                color="primary"
                icon={<Check className="vx-icon" size={16} />}
                label="Se souvenir de moi"
                defaultChecked={false}
                onChange={this.handleRemember}
              />
              <div className="float-right">
                <Link to="/pages/forgot-password">Mot de passe oublié ?</Link>
              </div>
            </FormGroup>
            <div className="d-flex justify-content-between">
              <Button.Ripple
                color="primary"
                outline
                onClick={() => {
                  history.push("/pages/register")
                }}
              >
                Créer un compte
              </Button.Ripple>
              <Button.Ripple color="primary" type="submit">
                S'identifier
              </Button.Ripple>
            </div>
          </Form>
        </CardBody>
      </React.Fragment>
    )
  }
}
const mapStateToProps = state => {
  return {
    values: state.auth.login
  }
}
export default connect(mapStateToProps, { loginWithJWT })(LoginJWT)
