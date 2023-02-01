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
 * Build a custom tag <x-showrunningdialogbutton> with group or machine-id attribute
 */
(function () {

  class ShowRunningDialogButtonComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
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

    initialize () {
      this.addClass('pulse-icon');

      // Listeners and dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('show-running-btn');
      $(this.element).append(this._content);

      // Color :
      pulseSvg.inlineBackgroundSvg(this._content);

      // Tooltip
      //this._content.attr('tooltip', 'running view');
      pulseUtility.addToolTip(this._content, 'running view');

      // Visibility : display according to config
      if (pulseConfig.getBool('showRunningButton'))
        $(this._content).show();
      else
        $(this._content).hide();

      // Click
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

    // Callback events
    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
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
