// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productionstatelegends
 * @requires module:pulseComponent
 */

var pulseSvg = require('pulseSvg');
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

  /**
   * `<x-productionstatelegends>` — legend panel for production state categories.
   *
   * Identical structure to `x-reasongroups` but uses production state data from `ProductionStateLegend`.
   * Each item: colored square SVG + display label + alternate compact label (RTD use).
   * Tooltip on each element shows all individual production states within the category.
   * Includes 4 empty alignment divs and triggers `.legend-content` resize.
   * `isVisible` is always true so the legend always fetches.
   *
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class ProductionStateLegendsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;

      return self;
    }

    get content () { return this._content; }

    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('productionstatelegends');
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

    displayError (message) {
      $(this._content).hide();
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      $(this._content).show();
    }

    /** Always visible — legend fetches regardless of DOM scroll position. */
    get isVisible () {
      return true;
    }

    /**
     * REST endpoint: `ProductionStateLegend`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'ProductionStateLegend';
    }

    /**
     * Renders the legend: title + one element per production state category.
     * Each element: colored SVG square + display label (with state tooltip) + alternate label.
     * Appends 4 empty filler divs for flexbox alignment, then triggers `.legend-content` resize.
     *
     * @param {{ Items: Array<{ Color: string, Display: string, ProductionStates: Array<{ Display: string }> }> }} data
     */
    refresh (data) {
      $(this._content).empty();

      let titleSpan = $('<span></span>').html(this.getTranslation('title', 'Production state'));
      let divTitle = $('<div></div>').addClass('pulse-legend-title')
        .append(titleSpan);
      let divElements = $('<div></div>').addClass('pulse-legend-elements');
      let divOneLegend = $('<div></div>').addClass('pulse-legend-onelegend')
        .append(divTitle).append(divElements);

      for (let i = 0; i < data.Items.length; i++) {
        let item = data.Items[i];

        let prodStates = new Array();
        for (let iRG = 0; iRG < data.Items[i].ProductionStates.length; iRG++) {
          prodStates.push(data.Items[i].ProductionStates[iRG].Display);
        }
        let allGroupsDisplay = prodStates.join(', ');
        let colorWithoutSharp = item.Color;
        if (colorWithoutSharp.charAt(0) === '#') {
          colorWithoutSharp = colorWithoutSharp.slice(1);
        }

        let divIcon = $('<div></div>').addClass('pulse-legend-icon');
        let svg = pulseSvg.createColoredLegend(item.Color, null);
        if (svg != null) {
          svg.setAttribute('class', 'productionstatelegends-icon');
          // Add Tooltip
          pulseUtility.addToolTip(svg, this.allGroupsDisplay); // Is it working ?
          divIcon.append(svg);
        }

        let span = $('<span></span>').html(item.Display)
          .addClass('productionstatelegends-label-' + colorWithoutSharp)
          .attr('title', allGroupsDisplay);
        let divLabel = $('<div></div>').addClass('pulse-legend-label')
          .append(span);

        // To show "Idle" instead of a long string. Used in RTD
        // (To remove if possible after some tests)
        let spanLabelAlt = $('<span></span>').addClass('productionstatelegends-label-alt-' + colorWithoutSharp)
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

  pulseComponent.registerElement('x-productionstatelegends', ProductionStateLegendsComponent);
})();
