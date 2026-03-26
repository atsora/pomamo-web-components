// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-alertdialog
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');

/**
 * Build a custom tag <x-alertdialog> to display a simple alert dialog content.
 * Attributes:
 *   - type: 'Information' | 'Warning' | 'Error' | 'Question' (default: 'Information')
 *   - message: the message to display (can contain HTML)
 */
(function () {

  class AlertDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    initialize () {
      $(this.element).empty();

      let type = this.element.getAttribute('type') || 'Information';
      let message = this.element.getAttribute('message') || '';

      this._icon = $('<div></div>').addClass('alertdialog-icon customDialogIcon customDialogIcon' + type);
      this._message = $('<div></div>').addClass('alertdialog-message').html(message);

      $(this.element).append(this._icon).append(this._message);

      pulseSvg.inlineBackgroundSvg(this._icon[0]);

      this.switchToNextContext();
    }

    displayError (message) {
    }

    removeError () {
    }

    onConfigChange (event) {
    }
  }

  pulseComponent.registerElement('x-alertdialog', AlertDialogComponent);
})();
