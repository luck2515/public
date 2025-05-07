/*
 * MinIO Cloud Storage (C) 2016, 2018 MinIO, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react"
import { connect } from "react-redux"
import logo from "../../img/logo.svg"
import Alert from "../alert/Alert"
import * as actionsAlert from "../alert/actions"
import InputGroup from "./InputGroup"
import web from "../web"
import { Redirect, Link } from "react-router-dom"
import OpenIDLoginButton from './OpenIDLoginButton'
import { getRandomString } from "../utils"
import storage from "local-storage-fallback"
import { OPEN_ID_NONCE_KEY } from './utils'

export class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      accessKey: "",
      secretKey: "",
      discoveryDoc: {},
      clientId: ""
    }
  }

  // Handle field changes
  accessKeyChange(e) {
    this.setState({
      accessKey: e.target.value
    })
  }

  secretKeyChange(e) {
    this.setState({
      secretKey: e.target.value
    })
  }

  handleSubmit(event) {
    event.preventDefault()
    const { showAlert, clearAlert, history } = this.props
    let message = ""
    if (this.state.accessKey === "") {
      message = "Access Key cannot be empty"
    }
    if (this.state.secretKey === "") {
      message = "Secret Key cannot be empty"
    }
    if (message) {
      showAlert("danger", message)
      return
    }
    web
      .Login({
        username: this.state.accessKey,
        password: this.state.secretKey
      })
      .then(res => {
        // Clear alerts from previous login attempts
        clearAlert()

        history.push("/")
      })
      .catch(e => {
        showAlert("danger", e.message)
      })
  }

  componentWillMount() {
    const { clearAlert } = this.props
    // Clear out any stale message in the alert of previous page
    clearAlert()
    document.body.classList.add("is-guest")
  }

  componentDidMount() {
    // oauth_callbackページにいる場合は自動リダイレクトしない
    if (window.location.pathname.includes('oauth_callback')) {
      return
    }

    web.GetDiscoveryDoc().then(({ DiscoveryDoc, clientId }) => {
      this.setState({
        clientId,
        discoveryDoc: DiscoveryDoc
      }, () => {
        // OpenID情報が取得できたら自動的にリダイレクト
        if (this.state.discoveryDoc && this.state.discoveryDoc.authorization_endpoint && this.state.clientId) {
          // OpenIDLoginButtonのリダイレクト処理を直接呼び出す
          const authEp = this.state.discoveryDoc.authorization_endpoint
          const authScopes = this.state.discoveryDoc.scopes_supported || ['openid', 'profile', 'email']
          const redirectURL = window.location.origin + "/login/oauth_callback"
          
          // Store nonce in localstorage to check again after the redirect
          const nonce = getRandomString(16)
          storage.setItem(OPEN_ID_NONCE_KEY, nonce)
          
          // 認可コードフローを使用する（Keycloakで推奨）
          const params = new URLSearchParams()
          params.set("response_type", "code")
          params.set("scope", authScopes.join(" "))
          params.set("client_id", this.state.clientId)
          params.set("redirect_uri", redirectURL)
          params.set("nonce", nonce)
          
          const authorizationUrl = `${authEp}?${params.toString()}`
          
          // Keycloakへ自動的にリダイレクト
          window.location.href = authorizationUrl
        }
      })
    })
  }

  componentWillUnmount() {
    document.body.classList.remove("is-guest")
  }

  render() {
    const { clearAlert, alert } = this.props
    if (web.LoggedIn()) {
      return <Redirect to={"/"} />
    }
    let alertBox = <Alert {...alert} onDismiss={clearAlert} />
    // Make sure you don't show a fading out alert box on the initial web-page load.
    if (!alert.message) alertBox = ""

    const showOpenID = Boolean(this.state.discoveryDoc && this.state.discoveryDoc.authorization_endpoint)
    return (
      <div className="login">
        {alertBox}
        <div className="l-wrap">
          <form onSubmit={this.handleSubmit.bind(this)}>
            <InputGroup
              value={this.state.accessKey}
              onChange={this.accessKeyChange.bind(this)}
              className="ig-dark"
              label="Access Key"
              id="accessKey"
              name="username"
              type="text"
              spellCheck="false"
              required="required"
              autoComplete="username"
            />
            <InputGroup
              value={this.state.secretKey}
              onChange={this.secretKeyChange.bind(this)}
              className="ig-dark"
              label="Secret Key"
              id="secretKey"
              name="password"
              type="password"
              spellCheck="false"
              required="required"
            />
            <button className="lw-btn" type="submit">
              <i className="fas fa-sign-in-alt" />
            </button>
          </form>
          {showOpenID && (
            <div className="openid-login">
              <div className="or">or</div>
              {
                this.state.clientId ? (
                  <OpenIDLoginButton
                    className="btn openid-btn"
                    clientId={this.state.clientId}
                    authEp={this.state.discoveryDoc.authorization_endpoint}
                    authScopes={this.state.discoveryDoc.scopes_supported}
                  >
                    Log in with OpenID
                  </OpenIDLoginButton>
                ) : (
                  <Link to={"/login/openid"} className="btn openid-btn">
                    Log in with OpenID
                  </Link>
                )
              }
            </div>
          )}
        </div>
        <div className="l-footer">
          <a className="lf-logo" href="">
            <img src={logo} alt="" />
          </a>
          <div className="lf-server">{window.location.host}</div>
        </div>
      </div>
    )
  }
}

const mapDispatchToProps = dispatch => {
  return {
    showAlert: (type, message) =>
      dispatch(actionsAlert.set({ type: type, message: message })),
    clearAlert: () => dispatch(actionsAlert.clear())
  }
}

export default connect(
  state => state,
  mapDispatchToProps
)(Login)
