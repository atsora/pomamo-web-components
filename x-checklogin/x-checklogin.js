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

  /**
   * `<x-checklogin>` — invisible authentication guard component.
   *
   * On `validateParameters`:
   *  - If not on a login page and app is `PulseWebApp`: redirects to login if role/context is missing.
   *  - Checks login validity: empty login → redirect to login; expired token → redirect to login.
   *  - Schedules a 60-second timer to re-check validity while the session is active.
   *
   * Listens to:
   *  - `AuthorizationErrorEvent` — triggers a token refresh via `User/RenewToken` (POST).
   *  - `TokenHasChangedEvent` (AccessToken kind) — re-validates token expiration.
   *
   * No DOM is rendered (`pulse-nodisplay`). No REST polling (transitions to `Loaded` immediately).
   *
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
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

    /**
     * Checks if the current login is still valid.
     * If `useLogin` config is enabled: verifies that a non-empty login exists and the token is not expired.
     * On failure, redirects to the login page. On success, reschedules itself every 60 seconds.
     */
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

    /**
     * Event callback when the access token changes.
     * Immediately checks if the new token is expired and redirects to login if so.
     *
     * @param {{ target: { kind: string } }} event
     */
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

    /**
     * Returns `true` if the access token expiration date is in the past, `false` otherwise.
     * Returns `false` (not expired) if no expiration date is stored.
     *
     * @returns {boolean}
     */
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

    /**
     * Clears login cookies/storage and redirects to the login page (unless already there).
     *
     * @returns {boolean|undefined}
     */
    _disconnectAndGoToPageLogin () {
      // Clean all cookies linked to login
      pulseLogin.cleanLoginRole();

      // Goto page login with an error message to be displayed
      if (!pulseConfig.isLoginPage()) { // If not in page login
        pulseConfig.goToPageLogin();
        return true;
      }
    }

    /**
     * Global event callback when an HTTP 401 authorization error occurs.
     * Posts to `User/RenewToken` with the stored refresh token (only one request at a time).
     * On success: stores the renewed token. On error/fail: clears login and redirects.
     *
     * @param {*} event
     */
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

    /**
     * Token renewal success: stores the new login/role data and clears the pending flag.
     *
     * @param {*} token
     * @param {*} data
     */
    _renewTokenSuccess (token, data) {
      pulseLogin.storeLoginRoleFromRefreshDTO(data, true);
      this._pendingRefreshToken = false;
    }

    /**
     * Token renewal error (server-side rejection): sets a login error message, clears login, redirects.
     *
     * @param {*} token
     * @param {*} error
     */
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

    /**
     * Token renewal network failure (timeout or XHR error): sets error message, clears login, redirects.
     *
     * @param {*} token
     * @param {string} url
     * @param {boolean} isTimeout
     * @param {number} xhrStatus
     */
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
