// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginpassword
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseService = require('pulseService');
var pulseLogin = require('pulseLogin');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseUtility = require('pulseUtility');

/**
 * Build a custom tag <x-loginpassword> with no attribute
 */
(function () {

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
      this._loginButton.click(
        function () {
          this._ckeckLoginIsValid();
        }.bind(this));

      // Changing password hides error message
      this._passEdit.change(function () {
        this.removeError();
      }.bind(this));

      // Press 'enter' after passwords == press button
      $(this._passEdit).keyup(function (event) {
        if (event.keyCode == 13) {
          $(this._loginButton).click();
        }
      }.bind(this));
    }

    _ckeckLoginIsValid () {
      let useLogin = pulseConfig.getBool('useLogin', false);

      if (!useLogin) {
        if ('dev' == this._loginEdit.val()
          && 'devPassword' == this._passEdit.val()) {
          let data = {
            Login: 'dev',
            Role: 'dev',
            UserName: 'dev'
          };
          this._ckeckLoginSuccess(0, data);
          return;
        }

        if (('Support' == this._loginEdit.val()
          || 'support' == this._loginEdit.val())
          && 'supportPassword' == this._passEdit.val()) {
          let data = {
            Login: 'support',
            Role: 'support',
            UserName: 'Support'
          };
          this._ckeckLoginSuccess(0, data);
          return;
        }
      }

      let login = this._loginEdit.val();
      let pass = this._passEdit.val();

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

        this._infoDialog = pulseCustomDialog.openInfo(
          //'Bad login or password ! Retry',
          this.getTranslation('noRoleError', 'No role defined for this login. Please, change configuration'),
          function () { // close
            // Go to login page
            pulseConfig.goToPageLogin();
          });

        return;
      }

      // Un-log
      pulseLogin.cleanLoginRole();
      // Re-log      
      role = role.toLowerCase();
      
      let useSessionCookie = !this._stayConnectedCheck.is(':checked');
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
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here

      // Create DOM - LOGIN Content
      this._loginEdit = $('<input></input>').addClass('loginpassword-login-input')
        .attr('type', 'text');
      let loginLabel = $('<label></label>').addClass('loginpassword-login-label')
        .html(this.getTranslation('user', 'User:'))
        .append(this._loginEdit);

      this._passEdit = $('<input></input>').addClass('loginpassword-password-input')
        .attr('type', 'password');
      let passLabel = $('<label></label>').addClass('loginpassword-password-label')
        .html(this.getTranslation('password', 'Password:'))
        .append(this._passEdit);

      this._stayConnectedCheck = $('<input type="checkbox" name="stay-connected"></input>')
        .addClass('loginpassword-stay-connected');
      let stayConnectedLabel = $('<label for="stay-connected"></label>')
        .addClass('loginpassword-stay-connected-label')
        .html(this.getTranslation('stayConnected', 'Stay connected'));
      let stayConnectedDiv = $('<div"></div>').addClass('loginpassword-stay-connected-div')
        .append(this._stayConnectedCheck).append(stayConnectedLabel);

      this._changeContent = $('<div></div>').addClass('loginpassword-content')
        .append(loginLabel).append(passLabel).append(stayConnectedDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      this._messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._changeContent).append(this._messageDiv);

      // Add button AFTER message
      this._loginButton = $('<button></button>').addClass('loginpassword-button')
        .html('Login');
      let divBtn = $('<div></div>').addClass('loginpassword-button-div')
        .append(this._loginButton);
      this._changeContent.append(divBtn);

      $(this.element)
        .append(this._changeContent);

      // DO NOT display login

      // Press on buttons
      this._defineClickButtons();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    displayError (message) {
      $(this._messageDiv).show();
      $(this._messageSpan).html(message);
    }

    removeError () {
      $(this._messageDiv).hide();
      $(this._messageSpan).html('');
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
