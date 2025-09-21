// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-fieldlegends
 * @requires module:pulseComponent
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

  class fieldlegendsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;

      return self;
    }

    get content () {
      return this._content;
    } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        case 'machine-ids':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text');

      // listeners/dispatchers
      eventBus.EventBus.addGlobalEventListener(this,
        'groupIsReloaded', this.onGroupReloaded.bind(this));

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('fieldlegends');
      $(this.element).append(this._content);

      // Create DOM - Loader - probably not in legends... to verify
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);*/

      // Listener and dispatchers

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      if (this.element.hasAttribute('machine-ids') &&
        (!pulseUtility.isNotDefined(this.element.getAttribute('machine-ids')))) {
        // Success
        this.switchToNextContext();
      }
      else if (this.element.hasAttribute('machine-id') &&
        (!pulseUtility.isNotDefined(this.element.getAttribute('machine-id')))) {
        // Success
        this.switchToNextContext();
      }
      // Delayed display :
      this.setError('missing machine-ids');
      return;
    }

    displayError (message) {
      $(this._content).hide();
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      $(this._content).show();
    }

    // Overload to always refresh value
    get isVisible () {
      return true;
    }

    getShortUrl () { // Return the Web Service URL here without path
      if (this.element.hasAttribute('machine-ids') &&
        (!pulseUtility.isNotDefined(this.element.getAttribute('machine-ids')))) {
        return 'CncValueLegend/Get?MachineIds=' + this.element.getAttribute('machine-ids');
      }
      else if (this.element.hasAttribute('machine-id') &&
        (!pulseUtility.isNotDefined(this.element.getAttribute('machine-id')))) {
        return 'CncValueLegend/Get?MachineIds=' + this.element.getAttribute('machine-id');
      }
      return '';
    }

    refresh (data) {
      $(this._content).empty();

      for (let iField = 0; iField < data.Items.length; iField++) {
        let item = data.Items[iField];

        let titleSpan = $('<span></span>').html(item.Field.Display);
        let divTitle = $('<div></div>').addClass('pulse-legend-title')
          .append(titleSpan);
        let divElements = $('<div></div>').addClass('pulse-legend-elements');
        let divOneLegend = $('<div></div>').addClass('pulse-legend-onelegend')
          .append(divTitle).append(divElements);

        for (let iLegend = 0; iLegend < item.Legends.length; iLegend++) {
          let legend = item.Legends[iLegend];
          let divIcon = $('<div></div>').addClass('pulse-legend-icon');
          let svg = pulseSvg.createColoredLegend(legend.Color);
          if (svg != null) {
            svg.setAttribute('class', 'fieldlegends-icon');
            divIcon.append(svg);
          }

          let span = $('<span></span>').html(legend.Display);
          let divLabel = $('<div></div>').addClass('pulse-legend-label').append(span);

          let divElement = $('<div></div>').addClass('pulse-legend-element');
          divElement.append(divIcon).append(divLabel);

          divElements.append(divElement);
        }
        for (let i = 0; i < 4; i++) {
          let divElement = $('<div></div>').addClass('pulse-legend-empty-element-to-align');
          divElements.append(divElement);
        }

        $(this._content).append(divOneLegend);

        // Hack for resize legend
        $('.legend-content').resize();
      }
    }

    // Callback events

    /**
     * Event bus callback triggered when list of machines changes
     *
     * @param {Object} event
     */
    onGroupReloaded (event) {
      this.element.setAttribute('machine-ids', event.target.newMachinesList);
    }

  }

  pulseComponent.registerElement('x-fieldlegends', fieldlegendsComponent, ['machine-id', 'machine-ids']);
})();