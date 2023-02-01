// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginpasswordbutton
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseLogin = require('pulseLogin');
//var pulseConfig = require('pulseConfig');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseSvg = require('pulseSvg');

require('x-loginpassword/x-loginpassword');

/**
 * Build a custom tag <x-loginpasswordbutton> with no attribute
 */
(function () {

  class LoginPasswordButtonComponent extends pulseComponent.PulseInitializedComponent {
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

    _defineClickButtons () {
      this._loginButton.click(
        function () {
          this._openDialog();
        }.bind(this));
    }

    _openDialog () {
      let chgePass = pulseUtility.createjQueryElementWithAttribute('x-loginpassword', {});

      let dialogId = pulseCustomDialog.initialize(chgePass, {
        title: 'Login',
        cancelButton: 'hidden',
        okButton: 'hidden',
        autoClose: true,
        autoDelete: true,
        fullScreenOnSmartphone: true,
        smallSize: true,
        helpName: 'loginpassword'
      });
      pulseCustomDialog.open('#' + dialogId);
    }

    initialize () {
      // Attributes

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here

      // Create DOM - BUTTON
      this._loginSpan = $('<span></span>').addClass('loginpasswordbutton-span')
        .html('Login with user/password');
      //this._loginIcon = $('<span></span>').addClass('loginpasswordbutton-icon');
      this._loginButton = $('<div></div>').addClass('loginpasswordbutton-button')
        .append(this._loginSpan);//.append(this._loginIcon);
      this._loginButton.attr('title', 'Login Password');

      $(this.element).append(this._loginButton);

      //pulseSvg.inlineBackgroundSvg('.loginpasswordbutton-icon');
      // Create DOM - NO message for error

      // Always as test for the moment... but could be changed later
      /*if ( this.getConfigOrAttribute('showastext', 'false') == 'true'){
        this._loginSpan.show();
        this._loginIcon.hide();
      }
      else {
        this._loginSpan.hide();
        this._loginIcon.show();
      }*/

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

  pulseComponent.registerElement('x-loginpasswordbutton', LoginPasswordButtonComponent);
})();
