// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-showrunningdialogbutton
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');

(function () {

  /**
   * `<x-showrunningdialogbutton>` — icon button that opens an
   * `x-runningdialog` for a given group or machine.
   *
   * Renders a `.show-running-btn` with an inlined SVG icon and a
   * tooltip. Visibility tracks `pulseConfig.getBool('showRunningButton')`
   * — updated live through `onConfigChange`. Clicking calls
   * `pulseDetailsPopup.openRunningDialog(groupId)` using `group` when
   * present, otherwise `machine-id`.
   *
   * @element x-showrunningdialogbutton
   * @attr {string} group      group id (preferred)
   * @attr {number} machine-id fallback machine id when `group` is absent
   * @extends pulseComponent.PulseInitializedComponent
   */
  class ShowRunningDialogButtonComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        default:
          break;
      }
    }

    /**
     * Builds a `.show-running-btn` div with an inlined SVG icon and a tooltip.
     * Shows or hides the button based on `showRunningButton` config.
     * Click handler resolves `group` or `machine-id` and opens the running dialog.
     */
    initialize () {
      this.addClass('pulse-icon');

      // In case of clone, need to be empty:
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'show-running-btn';
      this.element.appendChild(this._content);

      pulseSvg.inlineBackgroundSvg(this._content);

      pulseUtility.addToolTip(this._content, 'running view');

      // Visibility: show based on config
      if (pulseConfig.getBool('showRunningButton'))
        this._content.style.display = '';
      else
        this._content.style.display = 'none';

      // Click: open running dialog for the configured group or machine
      this._content.addEventListener('click',
        function (e) {
          let groupId;
          if (this.element.hasAttribute('group')) {
            groupId = this.element.getAttribute('group');
          }
          else {
            if (this.element.hasAttribute('machine-id'))
              groupId = this.element.getAttribute('machine-id');
            else
              return; // Oups ! Should never happen
          }
          pulseDetailsPopup.openRunningDialog(groupId);
        }.bind(this));

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
     * Reacts to `showRunningButton` config changes by showing or hiding the button.
     *
     * @param {{ target: { config: string } }} event
     */
    onConfigChange (event) {
      if (event.target.config == 'showRunningButton') {
        if (pulseConfig.getBool('showRunningButton'))
          this._content.style.display = '';
        else
          this._content.style.display = 'none';
      }
    }

  }

  pulseComponent.registerElement('x-showrunningdialogbutton', ShowRunningDialogButtonComponent);
})();
