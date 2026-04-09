// Copyright (C) 2009-2023 Lemoine Automation Technologies
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

/**
 * Build a custom tag <x-showrunningdialogbutton> — icon button that opens the running detail dialog.
 *
 * Requires `group` or `machine-id` attribute. Visibility is controlled by the `showRunningButton`
 * config and updated live via `onConfigChange`.
 *
 * Attributes:
 *   group      - group id used to open the running dialog
 *   machine-id - machine id used to open the running dialog (fallback if no group)
 */
(function () {

  /**
   * `<x-showrunningdialogbutton>` — clickable icon that opens a running-view popup.
   *
   * Shown/hidden via `pulseConfig.getBool('showRunningButton')`.
   * Calls `pulseDetailsPopup.openRunningDialog(groupId)` on click.
   *
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class ShowRunningDialogButtonComponent extends pulseComponent.PulseParamInitializedComponent {
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('show-running-btn');
      $(this.element).append(this._content);

      pulseSvg.inlineBackgroundSvg(this._content);

      pulseUtility.addToolTip(this._content, 'running view');

      // Visibility: show based on config
      if (pulseConfig.getBool('showRunningButton'))
        $(this._content).show();
      else
        $(this._content).hide();

      // Click: open running dialog for the configured group or machine
      $(this._content).click(
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
          $(this._content).show();
        else
          $(this._content).hide();
      }
    }

  }

  pulseComponent.registerElement('x-showrunningdialogbutton', ShowRunningDialogButtonComponent);
})();
