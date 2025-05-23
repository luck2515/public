/*
 * MinIO Cloud Storage (C) 2018 MinIO, Inc.
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
import { Route, Switch, Redirect } from "react-router-dom"
import Browser from "./browser/Browser"
import Login from "./browser/Login"
import OpenIDLogin from "./browser/OpenIDLogin"
import web from "./web"

export const App = () => {
  return (
    <Switch>
      <Route path={"/login/openid"} component={OpenIDLogin} />
      <Route path={"/login/oauth_callback"} component={OpenIDLogin} />
      <Route path={"/login"} component={Login} />
      <Route path={"/:bucket?/*"} component={Browser} />
    </Switch>
  )
}

export default App
