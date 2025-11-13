// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reasongroups
 * @requires module:pulseComponent
 */

var pulseSvg = require('pulseSvg');
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

  class reasongroupsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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

    get content() { return this._content; } // Optional

    initialize() {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('reasongroups');
      $(this.element).append(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters() {
      this.switchToNextContext();
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    displayError(message) {
      $(this._content).hide();
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError() {
      $(this._content).show();
    }

    // Overload to always refresh value
    get isVisible() {
      return true;
    }

    getShortUrl() { // Return the Web Service URL here without path
      return 'ReasonGroupLegend';
    }

    refresh(data) {
      $(this._content).empty();

      let titleSpan = $('<span></span>').html(this.getTranslation('title', 'Reason'));
      let divTitle = $('<div></div>').addClass('pulse-legend-title')
        .append(titleSpan);
      let divElements = $('<div></div>').addClass('pulse-legend-elements');
      let divOneLegend = $('<div></div>').addClass('pulse-legend-onelegend')
        .append(divTitle).append(divElements);

      for (let i = 0; i < data.Items.length; i++) {
        let item = data.Items[i];

        let reasons = new Array();
        for (let iRG = 0; iRG < data.Items[i].ReasonGroups.length; iRG++) {
          reasons.push(data.Items[i].ReasonGroups[iRG].Display);
        }
        let allGroupsDisplay = reasons.join(', ');
        let colorWithoutSharp = item.Color;
        if (colorWithoutSharp.charAt(0) === '#') {
          colorWithoutSharp = colorWithoutSharp.slice(1);
        }

        let divIcon = $('<div></div>').addClass('pulse-legend-icon');
        let svg = pulseSvg.createColoredLegend(item.Color, null);
        if (svg != null) {
          svg.setAttribute('class', 'reasongroups-icon');
          // Add Tooltip
          pulseUtility.addToolTip(svg, this.allGroupsDisplay); // Is it working ?
          divIcon.append(svg);
        }

        let span = $('<span></span>').html(item.Display)
          .addClass('reasongroups-label-' + colorWithoutSharp)
          .attr('title', allGroupsDisplay);
        let divLabel = $('<div></div>').addClass('pulse-legend-label')
          .append(span);

        // To show "Idle" instead of a long string. Used in RTD
        // (To remove if possible after some tests)
        let spanLabelAlt = $('<span></span>').addClass('reasongroups-label-alt-' + colorWithoutSharp)
          .attr('title', allGroupsDisplay); // tooltip
        divLabel.append(spanLabelAlt);

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

  pulseComponent.registerElement('x-reasongroups', reasongroupsComponent);
})();
