import React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  Row,
  Col
} from "reactstrap"
import loginImg from "../../../../assets/img/logo/eorbg.png"
import "../../../../assets/scss/pages/authentication.scss"
import LoginJWT from "./LoginJWT"

class Login extends React.Component {
  render() {
    return (
      <Row className="m-0 justify-content-center">
        <Col
          sm="8"
          xl="7"
          lg="10"
          md="8"
          className="d-flex justify-content-center"
        >
          <Card className="bg-authentication login-card rounded-0 mb-0 w-100">
            <Row className="m-0">
              <Col
                lg="6"
                className="d-lg-block d-none text-center align-self-center px-1 py-0"
              >
                <img src={loginImg} alt="loginImg" />
              </Col>
              <Col lg="6" md="12" className="p-0">
                <Card className="rounded-0 mb-0 px-2 login-tabs-container">
                  <CardHeader className="pb-1">
                    <CardTitle>
                      <h4 className="mb-0">Identifiez-vous</h4>
                    </CardTitle>
                  </CardHeader>
                  <p className="px-2 auth-title">
                    Utilisez votre adresse e-mail (connexion / inscription).
                  </p>

                  {/* Login / Register classique */}
                  <LoginJWT />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    )
  }
}

export default Login
