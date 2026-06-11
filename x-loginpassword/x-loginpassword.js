// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginpassword
 * @requires module:pulseComponent
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseConfig from 'pulseConfig';
import * as pulseService from 'pulseService';
import * as pulseLogin from 'pulseLogin';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseUtility from 'pulseUtility';

(function () {

  /**
   * `<x-loginpassword>` — username + password form with a "Login" button.
   *
   * Renders user, password, "Stay connected" checkbox, message area and
   * "Login" button. On submit (button click or Enter on the password input):
   *
   * - When `useLogin` config is false, accepts the local pairs
   *   `dev` / `devPassword` and `Support|support` / `supportPassword` to
   *   stub a role without an HTTP call.
   *   Otherwise posts `{ Login, Password }` to `<path>UserPermissions/Post`
   *   via `pulseService.postAjax`.
   * - On success, stores the returned RefreshDTO through
   *   `pulseLogin.storeLoginRoleFromRefreshDTO` (session cookie when "Stay
   *   connected" is unchecked) and navigates with
   *   `pulseConfig.goToFirstPage(role)`. A response without `Role` shows an
   *   info dialog and redirects back to the login page.
   * - On error/timeout, clears the login and shows the server message or a
   *   generic "Invalid user name or password".
   *
   * @element x-loginpassword
   * @extends pulseComponent.PulseInitializedComponent
   */
  class LoginPasswordComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters

      self._content = undefined;

      return self;
    }

    //get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        default:
          break;
      }
    }

    _defineClickButtons () {
      this._loginButton.addEventListener('click', function () {
        this._ckeckLoginIsValid();
      }.bind(this));

      // Changing password hides error message
      this._passEdit.addEventListener('change', function () {
        this.removeError();
      }.bind(this));

      // Press 'enter' after passwords == press button
      this._passEdit.addEventListener('keyup', function (event) {
        if (event.keyCode == 13) {
          this._loginButton.click();
        }
      }.bind(this));
    }

    _ckeckLoginIsValid () {
      let useLogin = pulseConfig.getBool('useLogin', false);

      if (!useLogin) {
        if ('dev' == this._loginEdit.value
          && 'devPassword' == this._passEdit.value) {
          let data = {
            Login: 'dev',
            Role: 'dev',
            UserName: 'dev'
          };
          this._ckeckLoginSuccess(0, data);
          return;
        }

        if (('Support' == this._loginEdit.value
          || 'support' == this._loginEdit.value)
          && 'supportPassword' == this._passEdit.value) {
          let data = {
            Login: 'support',
            Role: 'support',
            UserName: 'Support'
          };
          this._ckeckLoginSuccess(0, data);
          return;
        }
      }

      let login = this._loginEdit.value;
      let pass = this._passEdit.value;

      let url = this.getConfigOrAttribute('path', '')
        + 'UserPermissions/Post'; //?Login=' + login;

      let timeout = this.timeout;
      pulseService.postAjax(0, url,
        {
          'Login': login,
          'Password': pass
        },
        timeout,
        this._ckeckLoginSuccess.bind(this),
        this._ckeckLoginError.bind(this),
        this._ckeckLoginFail.bind(this));
    }

    _ckeckLoginSuccess (token, data) {
      let role = data.Role;
      if (pulseUtility.isNotDefined(role)
        || ('' == role)) {
        this.displayError(this.getTranslation('noRoleError', 'No role defined for this login. Please, change configuration'));
        // Error :
        pulseLogin.cleanLoginRole();

        this._infoDialog = pulseCustomDialog.openDialog(
          //'Bad login or password ! Retry',
          this.getTranslation('noRoleError', 'No role defined for this login. Please, change configuration'),
          { type: 'Information',
            onClose: function () { // close
              // Go to login page
              pulseConfig.goToPageLogin();
            }
          });

        return;
      }

      // Un-log
      pulseLogin.cleanLoginRole();
      // Re-log
      role = role.toLowerCase();

      let useSessionCookie = !this._stayConnectedCheck.checked;
      pulseLogin.storeLoginRoleFromRefreshDTO(data, useSessionCookie);
      // cookie PulseLogin / PulseRole

      this.removeError();

      //TODO : send message ?

      // Go to firstPage (if defined)
      pulseConfig.goToFirstPage(role);
    }

    _ckeckLoginError (token, error) {
      pulseLogin.cleanLoginRole();

      this.displayError(error.ErrorMessage);
    }

    _ckeckLoginFail (token, url, isTimeout, xhrStatus) {
      pulseLogin.cleanLoginRole();

      this.displayError(this.getTranslation('deniedError', 'Invalid user name or password'));
    }

    initialize () {
      // Attributes

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Loader -> Not needed here

      // Create DOM - LOGIN Content
      const loginInputId = 'loginpassword-login-input';
      this._loginEdit = document.createElement('input');
      this._loginEdit.className = 'loginpassword-login-input';
      this._loginEdit.type = 'text';
      this._loginEdit.id = loginInputId;
      let loginLabel = document.createElement('label');
      loginLabel.className = 'loginpassword-login-label';
      loginLabel.setAttribute('for', loginInputId);
      loginLabel.innerHTML = this.getTranslation('user', 'User:');
      let loginRow = document.createElement('div');
      loginRow.className = 'loginpassword-row';
      loginRow.appendChild(loginLabel);
      loginRow.appendChild(this._loginEdit);

      const passInputId = 'loginpassword-password-input';
      this._passEdit = document.createElement('input');
      this._passEdit.className = 'loginpassword-password-input';
      this._passEdit.type = 'password';
      this._passEdit.id = passInputId;
      let passLabel = document.createElement('label');
      passLabel.className = 'loginpassword-password-label';
      passLabel.setAttribute('for', passInputId);
      passLabel.innerHTML = this.getTranslation('password', 'Password:');
      let passRow = document.createElement('div');
      passRow.className = 'loginpassword-row';
      passRow.appendChild(passLabel);
      passRow.appendChild(this._passEdit);

      const stayConnectedInputId = 'loginpassword-stay-connected';
      this._stayConnectedCheck = document.createElement('input');
      this._stayConnectedCheck.type = 'checkbox';
      this._stayConnectedCheck.name = 'stay-connected';
      this._stayConnectedCheck.id = stayConnectedInputId;
      this._stayConnectedCheck.className = 'loginpassword-stay-connected';
      let stayConnectedLabel = document.createElement('label');
      stayConnectedLabel.className = 'loginpassword-stay-connected-label';
      stayConnectedLabel.setAttribute('for', stayConnectedInputId);
      stayConnectedLabel.innerHTML = this.getTranslation('stayConnected', 'Stay connected');
      let stayConnectedDiv = document.createElement('div');
      stayConnectedDiv.className = 'loginpassword-stay-connected-div';
      stayConnectedDiv.appendChild(this._stayConnectedCheck);
      stayConnectedDiv.appendChild(stayConnectedLabel);

      this._changeContent = document.createElement('div');
      this._changeContent.className = 'loginpassword-content';
      this._changeContent.appendChild(loginRow);
      this._changeContent.appendChild(passRow);
      this._changeContent.appendChild(stayConnectedDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      this._messageDiv = document.createElement('div');
      this._messageDiv.className = 'pulse-message-div';
      this._messageDiv.appendChild(this._messageSpan);
      this._changeContent.appendChild(this._messageDiv);

      // Add button AFTER message
      this._loginButton = document.createElement('button');
      this._loginButton.className = 'loginpassword-button';
      this._loginButton.innerHTML = this.getTranslation('loginButton', 'Login');
      let divBtn = document.createElement('div');
      divBtn.className = 'loginpassword-button-div';
      divBtn.appendChild(this._loginButton);
      this._changeContent.appendChild(divBtn);

      this.element.appendChild(this._changeContent);

      // DO NOT display login

      // Press on buttons
      this._defineClickButtons();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    displayError (message) {
      this._messageDiv.style.display = '';
      this._messageSpan.innerHTML = message;
    }

    removeError () {
      this._messageDiv.style.display = 'none';
      this._messageSpan.innerHTML = '';
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
    }

  }

  pulseComponent.registerElement('x-loginpassword', LoginPasswordComponent);
})();
