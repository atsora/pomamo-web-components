// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-validatetoken
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
var pulseService = require('pulseService');
var pulseUtility = require('pulseUtility');

(function () {

  /**
   * `<x-validatetoken>` — submits an authentication code for validation.
   *
   * Calls `User/ValidateAuthenticationCode` via `pulseService` with the
   * value of the `code` attribute and (on success) stores the returned
   * session through `pulseLogin` before navigating with
   * `pulseConfig.goToFirstPage(role)`. Errors are surfaced in the
   * `.pulse-message` span.
   *
   * @element x-validatetoken
   * @attr {string} code authentication code to validate
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class ValidateTokenComponent extends pulseComponent.PulseParamInitializedComponent {
    //PulseParamAutoPathSingleRequestComponent { Can not be used ! Only ONE call to service
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM: never in constructor, use the initialize method instead

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'code':
          this.start(); // Only for tests !
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-big display');

      // Update here some internal parameters

      // listeners/dispatchers

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      /*
      this._content = document.createElement('div');
      this._content.className = 'pulse-component-content';
      this.element.appendChild(this._content);*/

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if ('' == this.getConfigOrAttribute('code')) {
        console.error('missing validation code');
        this.setError('missing code'); // delayed error message
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.missingParam', 'Missing param')), () => this.removeError());
        return;
      }

      // Add delay to leave validation state quickly
      this._timeoutId = setTimeout(this._tryValidate.bind(this), 10);

      this.switchToNextContext();
    }

    _tryValidate () {
      let url = this.getConfigOrAttribute('path', '')
        + this.getShortUrl(); // ValidateAuthenticationCode

      let timeout = this.timeout;
      let dataToPost = this.postData();
      pulseService.postAjax(0, url,
        dataToPost,
        timeout,
        this._validateSuccess.bind(this),
        this._validateError.bind(this),
        this._validateFail.bind(this));
    }

    _validateSuccess (token, data) {
      this.refresh(data);
    }

    _validateError (token, error) {
      this.displayError(error.ErrorMessage);
      // Message + go back to login page. See manageErrorStatus
      pulseConfig.setGlobal('loginError', 'Authentication Error. Please retry ('
        + error.ErrorMessage + ')');
      // Clean all cookies linked to login
      pulseLogin.cleanLoginRole();
      // Goto page login with an error message to be displayed
      pulseConfig.goToPageLogin();
    }

    _validateFail (token, url, isTimeout, xhrStatus) {
      this.displayError('Invalid validate');
      // Message + go back to login page. See manageErrorStatus
      pulseConfig.setGlobal('loginError', 'Authentication Error. Please retry');
      // Clean all cookies linked to login
      pulseLogin.cleanLoginRole();
      // Goto page login with an error message to be displayed
      pulseConfig.goToPageLogin();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;
    }

    removeError () {
      this.displayError('');
    }

    // Data linked to URL -> to post data
    // used in _runAjaxWhenIsVisible
    postData () {
      let auth_state = pulseLogin.getAuthenticationState();
      if (auth_state != '') {
        return {
          'AuthenticationKind': pulseLogin.getAuthenticationKind(),
          'AuthenticationName': pulseLogin.getAuthenticationName(),
          'Code': this.getConfigOrAttribute('code'),
          'State': pulseLogin.getAuthenticationState()
        };
      }
      else {
        return {
          'AuthenticationKind': pulseLogin.getAuthenticationKind(),
          'AuthenticationName': pulseLogin.getAuthenticationName(),
          'Code': this.getConfigOrAttribute('code')
        };
      }
    }

    getShortUrl () {
      // debugger is mandatory to test using path in url
      //debugger;  // eslint-disable-line no-debugger
      let url = 'User/ValidateAuthenticationCode';
      return url;
    }

    refresh (data) {
      let role = data.Role;
      if (pulseUtility.isNotDefined(role)
        || ('' == role)) {
        this.displayError('No role defined for this login. Please, change configuration.');
        return;
      }
      role = role.toLowerCase();
      pulseLogin.storeLoginRoleFromRefreshDTO(data, true);

      //TODO : send message ?

      // Go to firstPage (if defined)
      pulseConfig.goToFirstPage(role);
    }

    manageError (data) {
      //super.manageError(data);
      // Go to login page
    }

    // Callback events

  }

  pulseComponent.registerElement('x-validatetoken', ValidateTokenComponent, ['code']);
})();
