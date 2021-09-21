import * as firebase from "firebase/app"
import { history } from "../../../history"
import "firebase/auth"
import "firebase/database"
import axios from "axios"
import { config } from "../../../authServices/firebase/firebaseConfig"
import {toast} from "react-toastify";

// Init firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(config)
}

let firebaseAuth = firebase.auth()

export const signupWithFirebase = (email, password, name) => {
  return dispatch => {
    let userEmail = null,
      loggedIn = false
    // userName = null

    firebaseAuth
      .createUserWithEmailAndPassword(email, password)
      .then(result => {
        firebaseAuth.onAuthStateChanged(user => {
          result.user.updateProfile({
            displayName: name
          })
          if (user) {
            userEmail = user.email
            // let userName = user.displayName
            loggedIn = true
            dispatch({
              type: "SIGNUP_WITH_EMAIL",
              payload: {
                email: userEmail,
                name,
                isSignedIn: loggedIn
              }
            })
            dispatch({
              type: "LOGIN_WITH_EMAIL",
              payload: {
                email: userEmail,
                name
              }
            })
          }
        })
        history.push("/")
      })
      .catch(error => {
        console.log(error.message)
      })
  }
}

export const signupWithJWT = (email, password, first_name, last_name) => {
  return dispatch => {
    axios.post(global.config.server_url + "/register", {
        email: email,
        password: password,
        name: first_name + " " + last_name,
      })
      .then(response => {
        axios
            .post(global.config.server_url + "/personal_information", {
              user_id: 10,
              first_name: first_name,
              last_name: last_name
            })
            .then(response => {
              toast.info("Utilisateur enregistré");
            })
            .catch(error => {
              console.log(error);
              toast.error("API injoignable.")
            })
        var loggedInUser

        if(response.data){
          loggedInUser = response.data.user

          localStorage.setItem("token", response.data.accessToken);
          localStorage.setItem("userid", loggedInUser.id);
          localStorage.setItem("role", loggedInUser.role);

          dispatch({
            type: "LOGIN_WITH_JWT",
            payload: { loggedInUser, loggedInWith: "jwt" }
          })

          history.push("/app/profile")
        }

      })
      .catch(err => console.log(err))

  }
}
