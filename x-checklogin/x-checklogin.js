// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checklogin
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
var pulseService = require('pulseService');
//var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  class CheckLoginComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      //self._content = undefined;
      self._pendingRefreshToken = false;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      /*switch (attr) {
        default:
          break;
      }*/
    }

    initialize () {
      this.addClass('pulse-nodisplay');
      //this.addClass('pulse-text'); // Mandatory for loader
      
      // Listener and dispatchers
      eventBus.EventBus.addGlobalEventListener(this, 'AuthorizationErrorEvent',
        this.onAuthorizationError.bind(this));

      eventBus.EventBus.addGlobalEventListener(this, 'TokenHasChangedEvent',
        this.onTokenHaschanged.bind(this));

      // In case of clone, need to be empty :
      $(this.element).empty();

      // No DOM

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      super.clearInitialization();
    }

    validateParameters () {
      // If connection not allowed - return to page login

      if (!pulseConfig.isLoginPage()) { // If not in page login or validate
        // FOR Pulse Web App - app context or role is mandatory
        if (pulseConfig.isCurrentApp('PulseWebApp')) {
          if ('' == pulseConfig.getAppContextOrRole()) {
            // Clean all cookies linked to login
            pulseLogin.cleanLoginRole();

            // Role or AppContext is mandatory -> go to page login (if not)
            pulseConfig.goToPageLogin();
            return;
          }
        }

        // FOR ALL apps, check login
        this._checkLoginIsValid();
      }

      this.switchToContext('Loaded'); // To stop refresh 

      // this.switchToNextContext();-> to restore if web service is used
    }

    _checkLoginIsValid () {
      let useLogin = pulseConfig.getBool('useLogin', false);
      if (useLogin) {
        if ('' == pulseLogin.getLogin()) {
          this._disconnectAndGoToPageLogin();
          return;
        }
        else {
          // Check Token expiration
          if (this._checkIfTokenIsExpired()) {
            this._disconnectAndGoToPageLogin();
            return;
          }

          // Start timer to check if another page / tab / app asked for deconnection
          this._checkLoginIsValidTimer = setTimeout(
            this._checkLoginIsValid.bind(this),
            60000); // 1 min
        }
      }
    }

    displayError (message) {
      // Nothing
    }

    removeError () {
      // Nothing
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      //return 'Get...' + this.element.getAttribute('myattr');
      return '';
    }

    refresh (data) {
      // Update the component with data which is returned by the web service in case of success
      // For example:
      //$(this._content).html(data.Name);
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
      // Maybe re start ?
    }

    // Token changed -> prepare timeout for disconnection (useful for static display like reporting)
    onTokenHaschanged (event) {
      if (event.target.kind != 'AccessToken') {
        // Ignore
        return;
      }
      // Check Token expiration
      if (this._checkIfTokenIsExpired()) {
        this._disconnectAndGoToPageLogin();
        return;
      }
    }

    _checkIfTokenIsExpired () {
      let access_token_exp = pulseLogin.getAccessTokenExpiration();
      if (access_token_exp == '') {
        // Nothing to do
        return false;
      }

      let now = new Date();
      let tokenDate = new Date(access_token_exp);

      // Find diff + store
      let diffMSec = tokenDate.getTime() - now.getTime();
      if (diffMSec > 0) {
        return false;
      }
      else {
        return true; // expired
      }
    }

    _disconnectAndGoToPageLogin () {
      // Clean all cookies linked to login
      pulseLogin.cleanLoginRole();

      // Goto page login with an error message to be displayed
      if (!pulseConfig.isLoginPage()) { // If not in page login
        pulseConfig.goToPageLogin();
        return true;
      }
    }

    // Token expired -> GLOBAL refresh token
    onAuthorizationError (event) {
      if (!this._pendingRefreshToken) {
        this._pendingRefreshToken = true;

        let login = pulseLogin.getLogin();
        let refresh_token = pulseLogin.getRefreshToken();

        if (login == '' ||
          refresh_token == '') {
          // Error
          this._renewTokenError.bind(this);
          return;
        }

        let url = this.getConfigOrAttribute('path', '')
          + 'User/RenewToken';

        let timeout = this.timeout;
        pulseService.postAjax(0, url,
          {
            'Login': login,
            'RefreshToken': refresh_token
          },
          timeout,
          this._renewTokenSuccess.bind(this),
          this._renewTokenError.bind(this),
          this._renewTokenFail.bind(this));
      }
    }

    _renewTokenSuccess (token, data) {
      pulseLogin.storeLoginRoleFromRefreshDTO(data, true);
      this._pendingRefreshToken = false;
    }

    _renewTokenError (token, error) {
      pulseConfig.setGlobal('loginError', 'Authentication Error. Please retry');
      // Clean all cookies linked to login
      pulseLogin.cleanLoginRole();

      // Goto page login with an error message to be displayed
      if (!pulseConfig.isLoginPage()) { // If not in page login
        pulseConfig.goToPageLogin();
        return true;
      }
      this._pendingRefreshToken = false;
    }

    _renewTokenFail (token, url, isTimeout, xhrStatus) {
      pulseConfig.setGlobal('loginError', 'Authentication Error. Please retry');
      // Clean all cookies linked to login
      pulseLogin.cleanLoginRole();

      // Goto page login with an error message to be displayed
      if (!pulseConfig.isLoginPage()) { // If not in page login
        pulseConfig.goToPageLogin();
        return true;
      }
      this._pendingRefreshToken = false;
    }

  }

  pulseComponent.registerElement('x-checklogin', CheckLoginComponent);
})();
