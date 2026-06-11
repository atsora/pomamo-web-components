// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productionstatelegends
 * @requires module:pulseComponent
 */

import * as pulseSvg from 'pulseSvg';
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';

(function () {

  /**
   * `<x-productionstatelegends>` — legend panel listing production-state
   * categories.
   *
   * Fetches `ProductionStateLegend` once and renders a single legend
   * group: a "Production state" title, then one `.pulse-legend-element`
   * per item built from a colored square SVG
   * (`pulseSvg.createColoredLegend`) plus a display label and a compact
   * alternate label (CSS class `productionstatelegends-label-alt-<rgb>`).
   * Each element carries a tooltip listing all individual states within
   * the category. Followed by 4 filler divs for flex alignment. Always
   * reports `isVisible === true`.
   *
   * @element x-productionstatelegends
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

    validateParameters () {
      this.switchToNextContext();
    }

    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('productionstatelegends');
      this.element.appendChild(this._content);

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
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    displayError (message) {
      this._content.style.display = 'none';
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      this._content.style.display = '';
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
      this._content.replaceChildren();

      let titleSpan = document.createElement('span');
      titleSpan.innerHTML = this.getTranslation('title', 'Production state');
      let divTitle = document.createElement('div');
      divTitle.classList.add('pulse-legend-title');
      divTitle.appendChild(titleSpan);
      let divElements = document.createElement('div');
      divElements.classList.add('pulse-legend-elements');
      let divOneLegend = document.createElement('div');
      divOneLegend.classList.add('pulse-legend-onelegend');
      divOneLegend.appendChild(divTitle);
      divOneLegend.appendChild(divElements);

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

        let divIcon = document.createElement('div');
        divIcon.classList.add('pulse-legend-icon');
        let svg = pulseSvg.createColoredLegend(item.Color, null);
        if (svg != null) {
          svg.setAttribute('class', 'productionstatelegends-icon');
          // Add Tooltip
          pulseUtility.addToolTip(svg, allGroupsDisplay);
          divIcon.appendChild(svg);
        }

        let span = document.createElement('span');
        span.innerHTML = item.Display;
        span.classList.add('productionstatelegends-label-' + colorWithoutSharp);
        span.setAttribute('title', allGroupsDisplay);
        let divLabel = document.createElement('div');
        divLabel.classList.add('pulse-legend-label');
        divLabel.appendChild(span);

        // To show "Idle" instead of a long string. Used in RTD
        // (To remove if possible after some tests)
        let spanLabelAlt = document.createElement('span');
        spanLabelAlt.classList.add('productionstatelegends-label-alt-' + colorWithoutSharp);
        spanLabelAlt.setAttribute('title', allGroupsDisplay); // tooltip
        divLabel.appendChild(spanLabelAlt);

        let divElement = document.createElement('div');
        divElement.classList.add('pulse-legend-element');
        divElement.appendChild(divIcon);
        divElement.appendChild(divLabel);
        divElements.appendChild(divElement);
      }

      for (let i = 0; i < 4; i++) {
        let divElement = document.createElement('div');
        divElement.classList.add('pulse-legend-empty-element-to-align');
        divElements.appendChild(divElement);
      }

      this._content.appendChild(divOneLegend);

      // Hack for resize legend
      let legendContent = document.querySelector('.legend-content');
      if (legendContent) {
        legendContent.dispatchEvent(new Event('resize'));
      }
    }
  }

  pulseComponent.registerElement('x-productionstatelegends', ProductionStateLegendsComponent);
})();
