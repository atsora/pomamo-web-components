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

(function () {

  /**
   * `<x-loginchangepassword>` — form to change the current user's password.
   *
   * Renders a disabled user field (pre-filled from `pulseLogin.getLogin()`,
   * or from the `PulseLogin` debug attribute) and three password inputs
   * (old / new / confirm) with a "Change" button. On submit, posts to
   * `<path>ChangePassword` with `{ Login, OldPassword, NewPassword }` via
   * `pulseService.postAjax`. On success: clears the stored login through
   * `pulseLogin.cleanLoginRole`, shows an info dialog (`pulseCustomDialog`),
   * navigates to the login page via `pulseConfig.goToPageLogin` and closes
   * the dialog after 3 s. Error messages from the server, mismatched
   * confirmations, and request failures are surfaced via `displayError`.
   *
   * @element x-loginchangepassword
   * @attr {string} PulseLogin  debug override for the prefilled user name
   * @extends pulseComponent.PulseInitializedComponent
   */
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
        this._loginEdit.disabled = false;
      }
      else { // login is defined
        this._loginEdit.value = login;
        this._loginEdit.disabled = true; // or .readOnly = true;
        //let display = pulseLogin.getLoginDisplay();
        //('Hello ! ' + ('' == display) ? login : display);
      }
    }

    _defineClickButtons () {
      this._changeButton.addEventListener('click', () => {
        this._tryToChangePassword();
      });

      // Changing password hides error message
      this._newPassEdit1.addEventListener('change', () => {
        this.removeError();
      });
      this._newPassEdit2.addEventListener('change', () => {
        this.removeError();
      });

      // Press 'enter' after passwords == press button
      this._newPassEdit2.addEventListener('keyup', (event) => {
        if (event.keyCode == 13) {
          this._changeButton.click();
        }
      });
    }

    _tryToChangePassword () {

      let login = this._loginEdit.value;
      if ('dev' == login || 'Support' == login
        || 'Dev' == login || 'support' == login) {
        // Should never happen. NEVER !!!!
        return;
      }

      let newPass1 = this._newPassEdit1.value;
      if (this._newPassEdit2.value != newPass1) {
        this.displayError('The new passwords should be the same !');
        return;
      }

      let url = this.getConfigOrAttribute('path', '')
        + 'ChangePassword'; // ?Login=' + login;

      let oldPass = this._oldPassEdit.value;
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
      this._infoDialog = pulseCustomDialog.openDialog(
        'Your password has been changed, please reconnect ! ',
        { type: 'Information',
          title: 'Change password success',
          onClose: function () { // close
            // Go to login page
            pulseConfig.goToPageLogin();
          }
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
      this.element.replaceChildren();

      // Create DOM - Loader -> Not needed here

      // Create DOM - LOGIN Content
      this._loginEdit = document.createElement('input');
      this._loginEdit.className = 'loginchangepassword-login-input';
      this._loginEdit.type = 'text';
      let loginLabel = document.createElement('label');
      loginLabel.className = 'loginchangepassword-login-label';
      loginLabel.innerHTML = this.getTranslation('user', 'User:');
      loginLabel.appendChild(this._loginEdit);

      this._oldPassEdit = document.createElement('input');
      this._oldPassEdit.className = 'loginchangepassword-password-input';
      this._oldPassEdit.type = 'password';
      let oldPassLabel = document.createElement('label');
      oldPassLabel.className = 'loginchangepassword-password-label';
      oldPassLabel.innerHTML = this.getTranslation('oldPassword', 'Old password:');
      oldPassLabel.appendChild(this._oldPassEdit);

      this._newPassEdit1 = document.createElement('input');
      this._newPassEdit1.className = 'loginchangepassword-password-input';
      this._newPassEdit1.type = 'password';
      let newPassLabel1 = document.createElement('label');
      newPassLabel1.className = 'loginchangepassword-password-label';
      newPassLabel1.innerHTML = this.getTranslation('newPassword', 'New password:');
      newPassLabel1.appendChild(this._newPassEdit1);

      this._newPassEdit2 = document.createElement('input');
      this._newPassEdit2.className = 'loginchangepassword-password-input';
      this._newPassEdit2.type = 'password';
      let newPassLabel2 = document.createElement('label');
      newPassLabel2.className = 'loginchangepassword-password-label';
      newPassLabel2.innerHTML = this.getTranslation('newPassword', 'New password:');
      newPassLabel2.appendChild(this._newPassEdit2);

      this._changeContent = document.createElement('div');
      this._changeContent.className = 'loginchangepassword-content';
      this._changeContent.appendChild(loginLabel);
      this._changeContent.appendChild(oldPassLabel);
      this._changeContent.appendChild(newPassLabel1);
      this._changeContent.appendChild(newPassLabel2);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      this._messageDiv = document.createElement('div');
      this._messageDiv.className = 'pulse-message-div';
      this._messageDiv.appendChild(this._messageSpan);
      this._changeContent.appendChild(this._messageDiv);

      // Add button AFTER message
      this._changeButton = document.createElement('button');
      this._changeButton.className = 'loginchangepassword-button';
      this._changeButton.innerHTML = 'Change';
      let divBtn = document.createElement('div');
      divBtn.className = 'loginchangepassword-button-div';
      divBtn.appendChild(this._changeButton);
      this._changeContent.appendChild(divBtn);

      this.element.appendChild(this._changeContent);

      // Display login if exist
      this._displayLogin();

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
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }

  }

  pulseComponent.registerElement('x-loginchangepassword', LoginChangePasswordComponent);
})();
