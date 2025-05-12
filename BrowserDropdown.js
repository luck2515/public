/*
 * MinIO Cloud Storage (C) 2016, 2017, 2018 MinIO, Inc.
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
import { Dropdown } from "react-bootstrap"
import * as browserActions from "./actions"
import web from "../web"
import history from "../history"
import AboutModal from "./AboutModal"
import ChangePasswordModal from "./ChangePasswordModal"
import storage from "local-storage-fallback"

// Login.jsと同じキーを使用
const LOGOUT_FLAG_KEY = 'minioLoggedOut'
// OpenIDプロバイダー内のアカウント管理ページのパス（異なる可能性があるパターンを定義）
const KEYCLOAK_ACCOUNT_PATHS = [
  '/account/#/security/signingin',  // Keycloak新UIのパス
  '/account/password',              // Keycloak旧UIのパス
];

export class BrowserDropdown extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showAboutModal: false,
      showChangePasswordModal: false,
      discoveryDoc: null
    }
  }
  
  componentDidMount() {
    const { fetchServerInfo } = this.props
    fetchServerInfo()
    
    // ディスカバリードキュメントを取得して保存
    web.GetDiscoveryDoc().then(response => {
      if (response && response.DiscoveryDoc) {
        console.log("DiscoveryDoc in BrowserDropdown:", response.DiscoveryDoc);
        this.setState({ discoveryDoc: response.DiscoveryDoc });
      }
    }).catch(error => {
      console.error("Failed to get discovery document", error);
    });
  }
  
  showAbout(e) {
    e.preventDefault()
    this.setState({
      showAboutModal: true
    })
  }
  
  hideAbout() {
    this.setState({
      showAboutModal: false
    })
  }
  
  showChangePassword(e) {
    e.preventDefault()

    // ディスカバリードキュメントとIssuer情報があればKeycloakアカウント管理ページに遷移
    const { discoveryDoc } = this.state;
    if (discoveryDoc && discoveryDoc.issuer) {
      // Keycloakのアカウント管理ページのURLを構築
      const issuerUrl = discoveryDoc.issuer;
      let baseUrl = issuerUrl;
      if (issuerUrl.includes('/realms/')) {
        baseUrl = issuerUrl.substring(0, issuerUrl.indexOf('/realms/'));
      }
      if (!baseUrl.endsWith('/auth') && !baseUrl.includes('/auth/')) {
        baseUrl = baseUrl + '/auth';
      }
      const primaryAccountUrl = baseUrl + KEYCLOAK_ACCOUNT_PATHS[0];
      window.open(primaryAccountUrl, '_blank');
      // 代替パスもログ出力
      KEYCLOAK_ACCOUNT_PATHS.slice(1).forEach(path => {
        console.log("Alternative Keycloak account URL:", baseUrl + path);
      });
      return;
    }

    // それ以外は従来通りモーダルを表示
    this.setState({
      showChangePasswordModal: true
    });
  }
  
  hideChangePassword() {
    this.setState({
      showChangePasswordModal: false
    })
  }
  
  logout(e) {
    e.preventDefault()
    
    // ログアウトフラグを設定（Keycloakのログイン画面に強制的に遷移させるため）
    storage.setItem(LOGOUT_FLAG_KEY, 'true')
    
    web.Logout()
    history.replace("/login")
  }
  
  render() {
    const { serverInfo } = this.props
    return (
      <li>
        <Dropdown pullRight id="top-right-menu">
          <Dropdown.Toggle noCaret>
            <i className="fas fa-bars" />
          </Dropdown.Toggle>
          <Dropdown.Menu className="dropdown-menu-right">
            <li>
              <a href="" onClick={this.showChangePassword.bind(this)}>
                Change Password <i className="fas fa-cog" />
              </a>
              {this.state.showChangePasswordModal && (
                <ChangePasswordModal
                  serverInfo={serverInfo}
                  hideChangePassword={this.hideChangePassword.bind(this)}
                />
              )}
            </li>
            <li>
              <a target="_blank" href="https://docs.min.io/?ref=ob">
                Documentation <i className="fas fa-book" />
              </a>
            </li>
            <li>
              <a target="_blank" href="https://github.com/minio/minio">
                GitHub <i className="fab fa-github" />
              </a>
            </li>
            <li>
              <a target="_blank" href="https://min.io/pricing?ref=ob">
                Get Support <i className="fas fa-question-circle" />
              </a>
            </li>
            <li>
              <a href="" id="show-about" onClick={this.showAbout.bind(this)}>
                About <i className="fas fa-info-circle" />
              </a>
              {this.state.showAboutModal && (
                <AboutModal
                  serverInfo={serverInfo}
                  hideAbout={this.hideAbout.bind(this)}
                />
              )}
            </li>
            <li>
              <a href="" id="logout" onClick={this.logout}>
                Logout <i className="fas fa-sign-out-alt" />
              </a>
            </li>
          </Dropdown.Menu>
        </Dropdown>
      </li>
    )
  }
}

const mapStateToProps = state => {
  return {
    serverInfo: state.browser.serverInfo
  }
}

const mapDispatchToProps = dispatch => {
  return {
    fetchServerInfo: () => dispatch(browserActions.fetchServerInfo())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BrowserDropdown)
