// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginchangepasswordbutton
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseLogin = require('pulseLogin');
var pulseConfig = require('pulseConfig');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseSvg = require('pulseSvg');

require('x-loginchangepassword/x-loginchangepassword');

/**
 * Build a custom tag <x-loginchangepasswordbutton> with no attribute
 */
(function () {

  class LoginChangePasswordButtonComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);
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

    _showHide () {
      if (this.getConfigOrAttribute('loginchangepasswordbutton.changepasswordallowed',
        'false') == 'false') {
        this._changeButton.hide();
      }
      else {
        let login = pulseLogin.getLoginForWebService();
        if ('' == login) {
          this._changeButton.hide();
        }
        else {
          this._changeButton.show();
        }
      }
    }

    _defineClickButtons () {
      this._changeButton.click(
        function () {
          this._openDialog();
        }.bind(this));
    }

    _openDialog () {
      let chgePass = pulseUtility.createjQueryElementWithAttribute('x-loginchangepassword', {});

      let dialogId = pulseCustomDialog.initialize(chgePass, {
        title: this.getTranslation ('changePassword', 'Change password'),
        cancelButton: 'hidden',
        okButton: 'hidden',
        autoClose: true,
        autoDelete: true,
        fullScreenOnSmartphone: true,
        smallSize: true,
        helpName: 'loginchange'
      });
      pulseCustomDialog.open('#' + dialogId);
    }

    initialize () {
      // Attributes

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here

      // Create DOM - BUTTON
      this._changeSpan = $('<span></span>').addClass('loginchangepasswordbutton-span')
        .html('Change password');
      //this._changeIcon = $('<span></span>').addClass('loginchangepasswordbutton-icon');
      this._changeButton = $('<div></div>').addClass('loginchangepasswordbutton-button')
        .append(this._changeSpan);//.append(this._changeIcon);
      this._changeButton.attr('title', 'Change password');

      $(this.element).append(this._changeButton);

      //pulseSvg.inlineBackgroundSvg('.loginchangepasswordbutton-icon');
      // Create DOM - NO message for error

      // Always as test for the moment... but could be changed later
      /*if ( this.getConfigOrAttribute('showastext', 'false') == 'true'){
        this._changeSpan.show();
        this._changeIcon.hide();
      }
      else {
        this._changeSpan.hide();
        this._changeIcon.show();
      }*/

      // Display login if exist
      this._showHide();

      // Press on buttons
      this._defineClickButtons();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    displayError (message) {
    }

    removeError () {
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

  pulseComponent.registerElement('x-loginchangepasswordbutton', LoginChangePasswordButtonComponent);
})();
