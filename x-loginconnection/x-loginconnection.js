// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginconnection
 * @requires module:pulseComponent
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
//var pulseService = require('pulseService');
import * as pulseLogin from 'pulseLogin';
import * as pulseConfig from 'pulseConfig';
import * as pulseSvg from 'pulseSvg';

import 'x-loginpassword/x-loginpassword';

(function () {

  /**
   * `<x-loginconnection>` — login panel exposing username/password plus
   * available OAuth2 sign-in methods.
   *
   * Fetches `User/AuthenticationMethods` once. Always nests an
   * `x-loginpassword` (shown only when `UserPasswordAuthentication` is true)
   * and renders one row per entry in `OAuth2Methods`: an image
   * `images/login-<AuthenticationKind>.svg`, the "Connect with <name>"
   * label and an optional user input (when `LoginRequired`). Clicking a row
   * stores the picked method through `pulseLogin.storeAuthentication`,
   * substitutes `{{login}}` and `{{state}}` placeholders in
   * `AuthenticationUrl` when required, and navigates to it. When username/
   * password is disabled and a single OAuth2 method is configured, that
   * method is clicked automatically.
   *
   * @element x-loginconnection
   * @attr {string} PulseLogin debug override for `_getLogin()`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class LoginConnectionComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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

    _getLogin () {
      // For debug
      if (this.element.hasAttribute('PulseLogin')) {
        return this.element.getAttribute('PulseLogin');
      }
      // Normal
      return pulseLogin.getLogin();
    }

    initialize () {
      // Attributes

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Loader -> Not needed here

      // Create DOM - LOGIN Content
      this._loginPass = pulseUtility.createElementWithAttribute('x-loginpassword', {});

      this._loginContent = document.createElement('div');
      this._loginContent.className = 'loginconnection-login-content';
      this._loginContent.appendChild(this._loginPass);

      this._content = document.createElement('div');
      this._content.className = 'loginconnection-content';
      this._content.appendChild(this._loginContent);

      this._loginOauthContent = document.createElement('div');
      this._loginOauthContent.className = 'loginconnection-login-oauth-content';
      this._content.appendChild(this._loginOauthContent);
      this._loginOauthContent.style.display = 'none';

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      this._messageDiv = document.createElement('div');
      this._messageDiv.className = 'pulse-message-div';
      this._messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(this._messageDiv);

      // Add button AFTER message
      /*this._loginButton = document.createElement('button');
      this._loginButton.className = 'loginconnection-login-button';
      this._loginButton.innerHTML = 'Log in';
      let divBtn = document.createElement('div');
      divBtn.className = 'loginconnection-login-button-div';
      divBtn.appendChild(this._loginButton);
      this._loginContent.appendChild(divBtn);*/

      this.element.appendChild(this._content);

      // Press on buttons
      //this._defineClickButtons();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      this.switchToNextContext();
    }

    displayError (message) {
      this._messageDiv.style.display = '';
      this._messageSpan.innerHTML = message;
    }

    removeError () {
      this._messageDiv.style.display = 'none';
      this._messageSpan.innerHTML = '';
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'User/AuthenticationMethods';
    }

    manageError (data) {
      pulseLogin.cleanAuthentication();
      super.manageError();
    }

    refresh (data) {
      pulseLogin.cleanAuthentication();
      if (!data.UserPasswordAuthentication) {
        this._loginContent.style.display = 'none';
      }
      else {
        this._loginContent.style.display = '';
      }
      let tmpAuth = data.OAuth2Methods;
      /*[
        {
          'AuthenticationName': 'Facedebook',
          'AuthenticationKind': 'FacebookOauth2',
          'StateRequired': true,
          'LoginRequired': false,
          'AuthenticationUrl': ''
        },
        {
          'AuthenticationName': 'Git hub',
          'AuthenticationKind': 'GithubOauth2',
          'StateRequired': true,
          'LoginRequired': true,
          'AuthenticationUrl': ''
        }
      ];*/

      if (tmpAuth.length == 0) {
        this._loginOauthContent.style.display = 'none';
      }
      else {
        this._loginOauthContent.replaceChildren();
        this._loginOauthContent.style.display = '';
      }
      for (let iMeth = 0; iMeth < tmpAuth.length; iMeth++) {
        // Main
        let authDiv = document.createElement('div');
        authDiv.className = 'loginconnection-oauth';
        this._loginOauthContent.appendChild(authDiv);

        // Attributes for click
        authDiv.setAttribute('AuthenticationKind', tmpAuth[iMeth].AuthenticationKind);
        authDiv.setAttribute('AuthenticationName', tmpAuth[iMeth].AuthenticationName);
        authDiv.setAttribute('StateRequired', tmpAuth[iMeth].StateRequired);
        authDiv.setAttribute('LoginRequired', tmpAuth[iMeth].LoginRequired);
        authDiv.setAttribute('AuthenticationUrl', tmpAuth[iMeth].AuthenticationUrl);

        // Image
        let authImage = document.createElement('div');
        authImage.className = 'loginconnection-oauth-image';

        let imgUrl = 'images/login-' + tmpAuth[iMeth].AuthenticationKind + '.svg';
        authImage.style.backgroundImage = 'url(' + imgUrl + ')';
        authImage.src = imgUrl;

        authDiv.appendChild(authImage);

        // Moved LATER pulseSvg.inlineBackgroundSvg(authImage);

        // Name
        let authNameDisplay = document.createElement('span');
        authNameDisplay.className = 'loginconnection-oauth-name';
        authNameDisplay.innerHTML = this.getTranslation('connectWith', 'Connect with ')
           + tmpAuth[iMeth].AuthenticationName;
        authDiv.appendChild(authNameDisplay);

        // Login if required
        if (tmpAuth[iMeth].LoginRequired) {
          let loginEdit = document.createElement('input');
          loginEdit.className = 'loginconnection-oauth-login-input';
          loginEdit.type = 'text';
          let loginLabel = document.createElement('label');
          loginLabel.className = 'loginconnection-oauth-login-label';
          loginLabel.innerHTML = this.getTranslation('user', 'User:');
          loginLabel.appendChild(loginEdit);
          authDiv.appendChild(loginLabel);
        }

        // Click
        authNameDisplay.addEventListener('click', (e) => {
          let div = e.target.closest('.loginconnection-oauth');

          let AuthenticationKind = div.getAttribute('AuthenticationKind');
          let AuthenticationName = div.getAttribute('AuthenticationName');
          let StateRequired = div.getAttribute('StateRequired');
          let LoginRequired = div.getAttribute('LoginRequired');
          let AuthenticationUrl = div.getAttribute('AuthenticationUrl');
          let login = '';

          if ("true" == LoginRequired) {
            let loginEdit = div.querySelector('.loginconnection-oauth-login-input');
            if (loginEdit) {
              login = loginEdit.value;
            }
            // replace in URL
            AuthenticationUrl = AuthenticationUrl.replace('{{login}}', login);
          }

          // Store AuthenticationKind / AuthenticationName' / 'State':
          let state = pulseLogin.storeAuthentication(AuthenticationKind,
            AuthenticationName, StateRequired, login);

          if ("true" == StateRequired) {
            // replace in URL
            AuthenticationUrl = AuthenticationUrl.replace('{{state}}', state);
          }

          window.location.href = AuthenticationUrl;
        });

        // Click
        authImage.addEventListener('click', (e) => {
          let div = e.target.closest('.loginconnection-oauth');

          let AuthenticationKind = div.getAttribute('AuthenticationKind');
          let AuthenticationName = div.getAttribute('AuthenticationName');
          let StateRequired = div.getAttribute('StateRequired');
          let LoginRequired = div.getAttribute('LoginRequired');
          let AuthenticationUrl = div.getAttribute('AuthenticationUrl');
          let login = '';

          if ("true" == LoginRequired) {
            let loginEdit = div.querySelector('.loginconnection-oauth-login-input');
            if (loginEdit) {
              login = loginEdit.value;
            }
            // TODO : Replace in URL
            //AuthenticationUrl = AuthenticationUrl.replace('%%login%%', login);
            // ? If login not defined = error ?
          }

          // Store AuthenticationKind / AuthenticationName / State:
          let state = pulseLogin.storeAuthentication(AuthenticationKind,
            AuthenticationName, StateRequired, login);

          if ("true" == StateRequired) {
            // TODO : Replace in URL
            //AuthenticationUrl = AuthenticationUrl.replace('%%state%%', state);
            // ? If state not defined = error ?
          }

          window.location.href = AuthenticationUrl;
        });

        // if only ONE way to connect, use it !
        if (!data.UserPasswordAuthentication
          && tmpAuth.length == 1) {
          authImage.click();
        }

        // Later to hope colored displayed
        pulseSvg.inlineBackgroundSvg(authImage);
      }
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }

  }

  pulseComponent.registerElement('x-loginconnection', LoginConnectionComponent);
})();
