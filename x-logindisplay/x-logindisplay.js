// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-logindisplay
 * @requires module:pulseComponent
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseConfig from 'pulseConfig';
import * as pulseLogin from 'pulseLogin';
import * as pulseSvg from 'pulseSvg';

(function () {

  /**
   * `<x-logindisplay>` — current user label that doubles as a logout button.
   *
   * Renders `pulseConfig.getCurrentUserDisplay()` next to an inlined SVG
   * icon. The host stays hidden while `pulseConfig.currentRoleOrAppContextIsDefined()`
   * is false. Clicking the host calls `pulseLogin.cleanLoginRole()` then
   * `pulseConfig.goToPageLogin()`. SVG background inlining is skipped when
   * `donotuseinline === 'true'`.
   *
   * @element x-logindisplay
   * @attr {boolean} donotuseinline `'true'` skips SVG background inlining
   * @extends pulseComponent.PulseInitializedComponent
   */
  class LoginDisplayComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);
      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    /**
     * Populates the user display span and shows/hides the element.
     * Hidden when no role or AppContext is defined (forces role selection first).
     */
    _fillDisplay () {
      if (pulseConfig.currentRoleOrAppContextIsDefined()) {
        this._span.innerHTML = pulseConfig.getCurrentUserDisplay();
        this._content.style.display = '';
      }
      else {
        // Disable the navigation panel, a role must be chosen first
        this._content.style.display = 'none';
      }
    }

    /**
     * Binds the click handler: cleans the login role and redirects to the login page.
     */
    _defineClick () {
      this._content.addEventListener('click', (e) => {
        pulseLogin.cleanLoginRole();
        pulseConfig.goToPageLogin();
      });
    }

    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Loader -> Not needed here

      // Create DOM - Content
      this._span = document.createElement('span');
      this._span.className = 'logindisplay-span';
      this._icon = document.createElement('span');
      this._icon.className = 'logindisplay-icon';
      this._content = document.createElement('div');
      this._content.className = 'logindisplay-content';
      this._content.appendChild(this._span);
      this._content.appendChild(this._icon);
      this.element.appendChild(this._content);

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
