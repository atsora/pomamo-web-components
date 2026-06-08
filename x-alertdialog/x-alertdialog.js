// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-alertdialog
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');

(function () {

  /**
   * `<x-alertdialog>` — static dialog body with an icon and a message side-by-side.
   *
   * Renders a `<div class="alertdialog-icon">` (SVG inlined from background via
   * `pulseSvg.inlineBackgroundSvg`) followed by a `<div class="alertdialog-message">`
   * containing the raw `message` HTML.
   *
   * @element x-alertdialog
   * @attr {string} type     `'Information'` | `'Warning'` | `'Error'` | `'Question'` (default `'Information'`); drives the icon class `customDialogIcon<type>`
   * @attr {string} message  HTML string rendered as the message body
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
      this.element.replaceChildren();

      let type = this.element.getAttribute('type') || 'Information';
      let message = this.element.getAttribute('message') || '';

      this._icon = document.createElement('div');
      this._icon.className = 'alertdialog-icon customDialogIcon customDialogIcon' + type;
      this._message = document.createElement('div');
      this._message.className = 'alertdialog-message';
      this._message.innerHTML = message;

      this.element.appendChild(this._icon);
      this.element.appendChild(this._message);

      pulseSvg.inlineBackgroundSvg(this._icon);

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
