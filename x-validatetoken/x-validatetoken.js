// Copyright (C) 2009-2023 Lemoine Automation Technologies
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
      $(this.element).empty();

      // Create DOM - Content
      /*
      this._content = $('<div></div>').addClass('pulse-component-content');
      $(this.element).append(this._content);*/

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

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
        this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
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
      $(this._messageSpan).html(message);
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