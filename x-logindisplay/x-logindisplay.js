// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-logindisplay
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
var pulseSvg = require('pulseSvg');

/**
 * Build a custom tag <x-logindisplay> 
 */
(function () {

  class LoginDisplayComponent extends pulseComponent.PulseInitializedComponent {
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
    }

    _fillDisplay () {
      if (pulseConfig.currentRoleOrAppContextIsDefined()) {
        $(this._span).html(pulseConfig.getCurrentUserDisplay());
        $(this._content).show();
      }
      else {
        // Disable the navigation panel, a role must be chosen first
        $(this._content).hide();
      }
    }

    _defineClick () {
      // Logout button
      $(this._content).click(function (e) {
        // Remove the current role
        pulseLogin.cleanLoginRole();

        pulseConfig.goToPageLogin();
      });
    }

    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here

      // Create DOM - Content
      this._span = $('<span></span>').addClass('logindisplay-span');
      this._icon = $('<span></span>').addClass('logindisplay-icon');
      this._content = $('<div></div>').addClass('logindisplay-content')
        .append(this._span).append(this._icon);
      $(this.element).append(this._content);

      this._fillDisplay();

      this._defineClick();

      // Create DOM - message for error -> Not needed here
      
      // Disable inline for reporting - the latest to hope displaying colors always
      if ( this.getConfigOrAttribute('donotuseinline', 'false') == 'false' ){
        // inline icon
        pulseSvg.inlineBackgroundSvg(this._icon);
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    displayError (message) {
      // Code here to display the error message
    }

    removeError () {
      // Code here to remove the error message
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
      // Example :
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }

  }

  pulseComponent.registerElement('x-logindisplay', LoginDisplayComponent, []);
})();
