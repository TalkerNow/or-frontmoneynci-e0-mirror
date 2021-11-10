import React, { Suspense, lazy } from "react"
import { Router, Switch, Route } from "react-router-dom"
import { history } from "./history"
import { connect } from "react-redux"
import { Redirect } from "react-router-dom"
import Spinner from "./components/@vuexy/spinner/Loading-spinner"
import { ContextLayout } from "./utility/context/Layout"

// Route-based code splitting
const dashboard = lazy(() =>
  import("./views/apps/dashboard")
)
// const handleServices = lazy(() => import("./views/apps/Contract/handleServices"))
const error404 = lazy(() => import("./views/pages/misc/error/404"))
const error500 = lazy(() => import("./views/pages/misc/error/500"))
const authorized = lazy(() => import("./views/pages/misc/NotAuthorized"))

//-------- current active -----------------
const profile = lazy(() => import("./views/apps/profile"))

// const payment = lazy(() => import("./views/apps/payment/PaymentList"))

const task = lazy(() => import("./views/apps/task/Task"))
const clientTask = lazy(() => import("./views/apps/user/edit/clientTask/Task"))
const memberTask = lazy(() => import("./views/apps/user/edit/memberTask/Task"))
const document = lazy(() => import("./views/apps/document"))

const clientslist = lazy(() => import("./views/apps/user/list/ClientsList"))
const oldclientslist = lazy(() => import("./views/apps/user/list/OldClientsList"))
const memberslist = lazy(() => import("./views/apps/user/list/MembersList"))
const createUser = lazy(() => import("./views/apps/user/add/addUser"))
const userEdit = lazy(() => import("./views/apps/user/edit/ClientEdit"))
const memberEdit = lazy(() => import("./views/apps/user/edit/MemberEdit"))
const AllContracts = lazy(() => import("./views/apps/user/edit/AllContracts"))

const TemplateContract = lazy(() => import("./views/pages/contract-template/TemplateContract"))
const createContract = lazy(() => import("./views/pages/contract-template/CreateContract"))
const editContract = lazy(() => import("./views/pages/contract-template/EditContract"))

//-----------------------------------
const Login = lazy(() => import("./views/pages/authentication/login/Login"))
const forgotPassword = lazy(() => import("./views/pages/authentication/ForgotPassword"))
// const lockScreen = lazy(() => import("./views/pages/authentication/LockScreen"))
const resetPassword = lazy(() => import("./views/pages/authentication/ResetPassword"))
const register = lazy(() => import("./views/pages/authentication/register/Register"))
// const AdmUserList = lazy(() => import("./views/apps/user/list/usersList"))
// const createService = lazy(() => import("./views/apps/Contract/Services/addService"))

const ProtectedRoute = ({ component: Component, fullLayout, isAuth, authorisation, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      if (authorisation.include(isAuth.role)) return (
        <ContextLayout.Consumer>
          {context => {
            let LayoutTag =
              fullLayout === true
                ? context.fullLayout
                : context.state.activeLayout === "horizontal"
                ? context.horizontalLayout
                : context.VerticalLayout
            return (
              <LayoutTag {...props} permission={props.user}>
                <Suspense fallback={<Spinner />}>
                  <Component {...props} />
                </Suspense>
              </LayoutTag>
            )
          }}
        </ContextLayout.Consumer>
      )
      return <Redirect to={{ pathname: '/misc/not-authorized' }} />;
    }}
  />
)

const RouteConfig = ({ component: Component, fullLayout, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      return (
        <ContextLayout.Consumer>
          {context => {
            let LayoutTag =
              fullLayout === true
                ? context.fullLayout
                : context.state.activeLayout === "horizontal"
                ? context.horizontalLayout
                : context.VerticalLayout
            return (
              <LayoutTag {...props} permission={props.user}>
                <Suspense fallback={<Spinner />}>
                  <Component {...props} />
                </Suspense>
              </LayoutTag>
            )
          }}
        </ContextLayout.Consumer>
      )
    }}
  />
)
function mapStateToProps() {
  return {
    role: localStorage.getItem('role')
  }
}

const AppRoute = connect(mapStateToProps)(RouteConfig)

class AppRouter extends React.Component {
  render() {
    const basic_acess = ['admin', 'Consultant', 'Expert', 'Client'];
    const employee_acess = ['admin', 'Consultant', 'Expert'];
    const reduced_acess =  ['admin', 'Consultant'];

    return (
      // Set the directory path if you are deploying in sub-folder
      <Router history={history} basename={'/'}>
        <Switch>
          <AppRoute exact path="/" component={dashboard} isAuth={mapStateToProps()} authorisation={reduced_acess}/>
          <AppRoute path="/misc/error/404" component={error404} fullLayout/>
          <AppRoute path="/pages/login" component={Login} fullLayout />
          <AppRoute path="/pages/register" component={register} fullLayout />
          <AppRoute path="/pages/forgot-password" component={forgotPassword} fullLayout/>
          {/* <AppRoute path="/pages/lock-screen" component={lockScreen} fullLayout/> */}
          <AppRoute path="/pages/reset-password" component={resetPassword} fullLayout/>
          <AppRoute path="/misc/error/500" component={error500} fullLayout />
          <AppRoute path="/misc/not-authorized" component={authorized} fullLayout/>

          <AppRoute path="/app/profile" component={profile} isAuth={mapStateToProps()} authorisation={basic_acess}/>

          {/* <AppRoute path="/payment/paymentlist" component={payment} /> */}

          <ProtectedRoute path="/task" exact component={() => <Redirect to="/task/all" />} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/task/:filter" component={task} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/document" component={document} isAuth={mapStateToProps()} authorisation={basic_acess}/>

          <ProtectedRoute path="/app/user/clientslist" component={clientslist} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/app/user/oldclientslist" component={oldclientslist} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/app/user/edit/:id/:tab" component={userEdit} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/app/user/clientTask/:id/:filter" component={clientTask} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/app/user/createUser" component={createUser} isAuth={mapStateToProps()} authorisation={employee_acess}/>

          <ProtectedRoute path="/app/member/memberslist" component={memberslist} isAuth={mapStateToProps()} authorisation={reduced_acess}/>
          <ProtectedRoute path="/app/member/edit/:id/:tab" component={memberEdit} isAuth={mapStateToProps()} authorisation={reduced_acess}/>
          <ProtectedRoute path="/app/member/memberTask/:id/:filter" component={memberTask} isAuth={mapStateToProps()} authorisation={reduced_acess}/>
          <ProtectedRoute path="/app/member/createUser" component={createUser} isAuth={mapStateToProps()} authorisation={reduced_acess}/>

          <ProtectedRoute path="/app/AllContracts" component={AllContracts} isAuth={mapStateToProps()} authorisation={employee_acess}/>
          <ProtectedRoute path="/app/contractTemplate" component={TemplateContract} isAuth={mapStateToProps()} authorisation={reduced_acess}/>
          <ProtectedRoute path="/pages/contract/:id" component={editContract} isAuth={mapStateToProps()} authorisation={basic_acess}/>
          <ProtectedRoute path="/pages/create-contract/:id" component={createContract} isAuth={mapStateToProps()} authorisation={employee_acess}/>

          {/* <AppRoute path="/app/user/userlist" component={AdmUserList} /> */}
          {/* <AppRoute path="/app/contract/handleServices/:id" component={handleServices} /> */}
          {/* <AppRoute path="/app/user/createService" component={createService} /> */}

          <AppRoute component={error404} fullLayout />
        </Switch>
      </Router>
    )
  }
}

export default AppRouter
