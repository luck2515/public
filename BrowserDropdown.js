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
// OpenIDプロバイダー内のアカウント管理ページのパス（Keycloak 16.1.1向け）
const KEYCLOAK_ACCOUNT_PATHS = [
  '/auth/realms/{realm}/account/#/security/signingin',  // Keycloak 16.1.1のセキュリティ設定
  '/auth/realms/{realm}/account/#/password',           // Keycloak 16.1.1のパスワード変更
  '/auth/realms/{realm}/account/'                      // Keycloak 16.1.1のアカウントトップ
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
      try {
        // Keycloakのアカウント管理ページのURLを構築
        const issuerUrl = discoveryDoc.issuer;
        console.log("Issuer URL:", issuerUrl);
        
        // レルム名を抽出 (issuerUrlから)
        let realmName = "";
        const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
        if (realmMatch && realmMatch[1]) {
          realmName = realmMatch[1];
        } else {
          // レルム名が見つからない場合はデフォルト値
          console.warn("Realm name not found in issuer URL, using 'master' as fallback");
          realmName = "master";
        }
        console.log("Realm name:", realmName);
        
        // Keycloak 16.1.1のURLパターンに合わせてベースURLを構築
        let baseUrl = issuerUrl;
        if (issuerUrl.includes('/auth/realms/')) {
          baseUrl = issuerUrl.substring(0, issuerUrl.indexOf('/auth/realms/'));
        } else if (issuerUrl.includes('/realms/')) {
          baseUrl = issuerUrl.substring(0, issuerUrl.indexOf('/realms/'));
        }
        console.log("Base URL:", baseUrl);
        
        // プライマリアカウントパスを選択し、{realm}をレルム名に置き換え
        let accountUrl = KEYCLOAK_ACCOUNT_PATHS[0].replace('{realm}', realmName);
        
        // URLを構築
        const fullAccountUrl = baseUrl + accountUrl;
        console.log("Account management URL:", fullAccountUrl);
        
        // 新しいタブでKeycloakのアカウント管理ページを開く
        window.open(fullAccountUrl, '_blank');
        
        // 代替パスもログ出力
        KEYCLOAK_ACCOUNT_PATHS.slice(1).forEach(path => {
          const altUrl = baseUrl + path.replace('{realm}', realmName);
          console.log("Alternative Keycloak account URL:", altUrl);
        });
      } catch (error) {
        console.error("Error building Keycloak account URL:", error);
        // エラー時はフォールバックとしてKeycloakのベースURL + /auth/を開く
        try {
          const issuerUrl = discoveryDoc.issuer;
          let baseUrl = issuerUrl;
          
          if (issuerUrl.includes('/auth/realms/')) {
            baseUrl = issuerUrl.substring(0, issuerUrl.indexOf('/auth/realms/')) + '/auth/';
          } else if (issuerUrl.includes('/realms/')) {
            baseUrl = issuerUrl.substring(0, issuerUrl.indexOf('/realms/')) + '/auth/';
          }
          
          console.log("Fallback: Opening Keycloak base URL:", baseUrl);
          window.open(baseUrl, '_blank');
        } catch (fallbackError) {
          console.error("Failed to open even fallback URL:", fallbackError);
          // 最終手段：モーダルを表示
          this.setState({
            showChangePasswordModal: true
          });
        }
      }
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
