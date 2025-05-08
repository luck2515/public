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
import { buildOpenIDAuthURL, OPEN_ID_NONCE_KEY } from './utils'

// ログアウト後のリダイレクトを制御するためのストレージキー
const LOGOUT_FLAG_KEY = 'minioLoggedOut'

export class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      accessKey: "",
      secretKey: "",
      discoveryDoc: {},
      clientId: "",
      redirectToOpenID: false,
      isLoading: true  // ローディング状態を追加
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
        // ログイン成功したらログアウトフラグを削除
        storage.removeItem(LOGOUT_FLAG_KEY)
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
    // 早期にリダイレクト処理を行うため、非同期処理をすぐに開始
    this.initializeOpenIDAuth();
  }

  // OpenID認証を初期化する処理を別メソッドに分離
  initializeOpenIDAuth() {
    web.GetDiscoveryDoc().then(response => {
      console.log("GetDiscoveryDoc response", response)
      if(response && response.DiscoveryDoc && response.clientId) {
        const {DiscoveryDoc, clientId} = response
        this.setState({
          clientId,
          discoveryDoc: DiscoveryDoc
        });

        // OpenIDリダイレクトを実行できる状態か確認
        const canRedirectToOpenID = DiscoveryDoc.authorization_endpoint && 
                                   !this.props.skipAutoRedirect;

        // ログアウトフラグをチェックして、リダイレクト処理を制御する
        const isLoggedOut = storage.getItem(LOGOUT_FLAG_KEY) === 'true';

        if (canRedirectToOpenID) {
          // リダイレクトURLを準備
          const authEp = DiscoveryDoc.authorization_endpoint;
          const authScopes = DiscoveryDoc.scopes_supported;
          const redirectURI = window.location.href.split("#")[0];
          const finalRedirectURI = redirectURI + (redirectURI.endsWith("/") ? "openid" : "/openid");

          const nonce = getRandomString(16);
          storage.setItem(OPEN_ID_NONCE_KEY, nonce);

          let authURL = buildOpenIDAuthURL(authEp, authScopes, finalRedirectURI, clientId, nonce);
          
          // ログアウト後なら強制的にKeycloakのログイン画面に遷移するパラメータを追加
          if (isLoggedOut) {
            // ログアウトフラグを削除（次回は通常のフローに戻る）
            storage.removeItem(LOGOUT_FLAG_KEY);
            authURL += "&prompt=login";
          }

          // リダイレクト前にレンダリングを避けるため状態を更新
          this.setState({ redirectToOpenID: true }, () => {
            // 次のレンダリングサイクルでリダイレクトが発生するのを確認するため小さな遅延を追加
            setTimeout(() => {
              window.location.href = authURL;
            }, 10);
          });
        } else {
          // リダイレクトしない場合はローディング終了
          this.setState({ isLoading: false });
          
          if (!DiscoveryDoc.authorization_endpoint) {
            console.warn("Discovery document received, but 'authorization_endpoint' is missing");
          }
        }
      } else {
        // OpenID情報が取得できなかった場合はローディング終了して通常のログインフォームを表示
        this.setState({ isLoading: false });
        console.warn("GetDiscoveryDoc response is missing expected properties (DiscoveryDoc or clientId)", response);
      }
    }).catch(error => {
      // エラー時はローディング終了して通常のログインフォームを表示
      this.setState({ isLoading: false });
      console.error("failed to get discovery document", error);
    });
  }

  componentWillUnmount() {
    document.body.classList.remove("is-guest")
  }

  // ローディング中の表示コンポーネント
  renderLoading() {
    return (
      <div className="login loading-view">
        <div className="page-load" style={{ position: 'relative', background: 'transparent' }}>
          <div className="pl-inner">
            <img src={logo} alt="Loading" />
          </div>
        </div>
      </div>
    );
  }

  // 通常のログインフォームを表示するコンポーネント
  renderLoginForm() {
    const { clearAlert, alert } = this.props;
    let alertBox = <Alert {...alert} onDismiss={clearAlert} />;
    if (!alert.message) alertBox = "";

    const showOpenID = Boolean(this.state.discoveryDoc && this.state.discoveryDoc.authorization_endpoint);

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
    );
  }

  render() {
    // すでにログイン済みならリダイレクト
    if (web.LoggedIn()) {
      return <Redirect to={"/"} />;
    }

    // OpenIDリダイレクト中なら最小限の表示に
    if (this.state.redirectToOpenID || this.state.isLoading) {
      return this.renderLoading();
    }

    // 通常のログインフォーム表示
    return this.renderLoginForm();
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
