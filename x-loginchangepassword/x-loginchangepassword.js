// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginchangepassword
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseService = require('pulseService');
var pulseLogin = require('pulseLogin');
var pulseCustomDialog = require('pulseCustomDialog');

/**
 * Build a custom tag <x-loginchangepassword> with no attribute
 */
(function () {

  class LoginChangePasswordComponent extends pulseComponent.PulseInitializedComponent {
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

    _displayLogin () {
      // Find if login is stored
      let login = this._getLogin();
      if ('' == login) {
        // Probably never excepted for tests
        this._loginEdit[0].disabled = false;
      }
      else { // login is defined
        this._loginEdit.val(login);
        this._loginEdit[0].disabled = true; // or .readOnly = true;
        //let display = pulseLogin.getLoginDisplay();
        //('Hello ! ' + ('' == display) ? login : display);
      }
    }

    _defineClickButtons () {
      this._changeButton.click(
        function () {
          this._tryToChangePassword();
        }.bind(this));

      // Changing password hides error message
      this._newPassEdit1.change(function () {
        this.removeError();
      }.bind(this));
      this._newPassEdit2.change(function () {
        this.removeError();
      }.bind(this));

      // Press 'enter' after passwords == press button
      $(this._newPassEdit2).keyup(function (event) {
        if (event.keyCode == 13) {
          $(this._changeButton).click();
        }
      }.bind(this));
    }

    _tryToChangePassword () {

      let login = this._loginEdit.val();
      if ('dev' == login || 'Support' == login
        || 'Dev' == login || 'support' == login) {
        // Should never happen. NEVER !!!!
        return;
      }

      let newPass1 = this._newPassEdit1.val();
      if (this._newPassEdit2.val() != newPass1) {
        this.displayError('The new passwords should be the same !');
        return;
      }

      let url = this.getConfigOrAttribute('path', '')
        + 'ChangePassword'; // ?Login=' + login;

      let oldPass = this._oldPassEdit.val();
      let timeout = this.timeout;
      pulseService.postAjax(0, url,
        {
          'Login': login,
          'OldPassword': oldPass,
          'NewPassword': newPass1
        },
        timeout,
        this._changeSuccess.bind(this),
        this._changeError.bind(this),
        this._changeFail.bind(this));
    }

    _changeSuccess (token, data) {
      // Un-log
      pulseLogin.cleanLoginRole();

      // Display splash screen
      this._infoDialog = pulseCustomDialog.openInfo(
        'Your password has been changed, please reconnect ! ',
        'Change password success',
        function () { // close
          // Go to login page
          pulseConfig.goToPageLogin();
        });

      // Close 
      this._showHideTimer = setTimeout(function () {
        pulseCustomDialog.close('#' + this._infoDialog);
      }.bind(this), 3000); // 3 sec
    }

    _changeError (token, error) {
      this.displayError('Error: ' + error.ErrorMessage);
    }

    _changeFail (token, url, isTimeout, xhrStatus) {
      this.displayError('Invalid password');
    }

    initialize () {
      // Attributes

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here

      // Create DOM - LOGIN Content
      this._loginEdit = $('<input></input>').addClass('loginchangepassword-login-input')
        .attr('type', 'text');
      let loginLabel = $('<label></label>').addClass('loginchangepassword-login-label')
        .html(pulseConfig.pulseTranslate('loginpassword.User', 'User:'))
        .append(this._loginEdit);

      this._oldPassEdit = $('<input></input>').addClass('loginchangepassword-password-input')
        .attr('type', 'password');
      let oldPassLabel = $('<label></label>').addClass('loginchangepassword-password-label')
        .html(pulseConfig.pulseTranslate('loginpassword.OldPassword', 'Old password:'))
        .append(this._oldPassEdit);

      this._newPassEdit1 = $('<input></input>').addClass('loginchangepassword-password-input')
        .attr('type', 'password');
      let newPassLabel1 = $('<label></label>').addClass('loginchangepassword-password-label')
        .html(pulseConfig.pulseTranslate('loginpassword.NewPassword', 'New password:'))
        .append(this._newPassEdit1);

      this._newPassEdit2 = $('<input></input>').addClass('loginchangepassword-password-input')
        .attr('type', 'password');
      let newPassLabel2 = $('<label></label>').addClass('loginchangepassword-password-label')
        .html(pulseConfig.pulseTranslate('loginpassword.NewPassword', 'New password:'))
        .append(this._newPassEdit2);

      this._changeContent = $('<div></div>').addClass('loginchangepassword-content')
        .append(loginLabel).append(oldPassLabel)
        .append(newPassLabel1).append(newPassLabel2);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      this._messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._changeContent).append(this._messageDiv);

      // Add button AFTER message
      this._changeButton = $('<button></button>').addClass('loginchangepassword-button')
        .html('Change');
      let divBtn = $('<div></div>').addClass('loginchangepassword-button-div')
        .append(this._changeButton);
      this._changeContent.append(divBtn);

      $(this.element)
        .append(this._changeContent);

      // Display login if exist
      this._displayLogin();

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
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }

  }

  pulseComponent.registerElement('x-loginchangepassword', LoginChangePasswordComponent);
})();
