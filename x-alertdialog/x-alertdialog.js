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
 *
 * Renders an icon (SVG inlined from background) and an HTML message side-by-side.
 * Intended to be used as the content of a `pulseCustomDialog`.
 *
 * Attributes:
 *   type    - 'Information' | 'Warning' | 'Error' | 'Question' (default: 'Information')
 *             Controls the CSS class applied to the icon: `customDialogIcon<type>`
 *   message - HTML string to display as the dialog body
 */
(function () {

  /**
   * `<x-alertdialog>` — static alert dialog content with icon and message.
   *
   * @extends pulseComponent.PulseInitializedComponent
   */
  class AlertDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    /**
     * Builds the dialog DOM: an icon div (SVG inlined) and a message div.
     * Icon CSS class is derived from the `type` attribute.
     */
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

    /** No error display — dialog content is always static. */
    displayError (message) {
    }

    /** No error to remove. */
    removeError () {
    }

    /** No config changes affect this static component. */
    onConfigChange (event) {
    }
  }

  pulseComponent.registerElement('x-alertdialog', AlertDialogComponent);
})();
