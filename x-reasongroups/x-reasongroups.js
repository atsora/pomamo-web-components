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

  /**
   * `<x-reasongroups>` — legend panel listing reason groups.
   *
   * Fetches `ReasonGroupLegend` once and renders a single legend group:
   * a title, then one `.pulse-legend-element` per item built from a
   * colored square SVG (`pulseSvg.createColoredLegend`) plus the display
   * label and a compact alternate label, with a tooltip listing the
   * individual reasons in the category. Followed by 4 filler divs for
   * flex alignment. Always reports `isVisible === true`.
   *
   * @element x-reasongroups
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class reasongroupsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;

      return self;
    }

    get content() { return this._content; }

    initialize() {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('reasongroups');
      this.element.appendChild(this._content);

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
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    displayError(message) {
      this._content.style.display = 'none';
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError() {
      this._content.style.display = '';
    }

    /** Always visible — legend fetches regardless of DOM scroll position. */
    get isVisible() {
      return true;
    }

    /**
     * REST endpoint: `ReasonGroupLegend`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl() {
      return 'ReasonGroupLegend';
    }

    /**
     * Renders the legend: title + one element per reason category.
     * Each element: colored SVG square + display label (with reason-group tooltip) + alternate label.
     * Appends 4 empty filler divs for flexbox alignment, then triggers `.legend-content` resize.
     *
     * @param {{ Items: Array<{ Color: string, Display: string, ReasonGroups: Array<{ Display: string }> }> }} data
     */
    refresh(data) {
      this._content.replaceChildren();

      let titleSpan = document.createElement('span');
      titleSpan.innerHTML = this.getTranslation('title', 'Reason');
      let divTitle = document.createElement('div');
      divTitle.className = 'pulse-legend-title';
      divTitle.appendChild(titleSpan);
      let divElements = document.createElement('div');
      divElements.className = 'pulse-legend-elements';
      let divOneLegend = document.createElement('div');
      divOneLegend.className = 'pulse-legend-onelegend';
      divOneLegend.appendChild(divTitle);
      divOneLegend.appendChild(divElements);

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

        let divIcon = document.createElement('div');
        divIcon.className = 'pulse-legend-icon';
        let svg = pulseSvg.createColoredLegend(item.Color, null);
        if (svg != null) {
          svg.setAttribute('class', 'reasongroups-icon');
          // Add Tooltip
          pulseUtility.addToolTip(svg, this.allGroupsDisplay);
          divIcon.appendChild(svg);
        }

        let span = document.createElement('span');
        span.innerHTML = item.Display;
        span.className = 'reasongroups-label-' + colorWithoutSharp;
        span.setAttribute('title', allGroupsDisplay);
        let divLabel = document.createElement('div');
        divLabel.className = 'pulse-legend-label';
        divLabel.appendChild(span);

        // To show "Idle" instead of a long string. Used in RTD
        // (To remove if possible after some tests)
        let spanLabelAlt = document.createElement('span');
        spanLabelAlt.className = 'reasongroups-label-alt-' + colorWithoutSharp;
        spanLabelAlt.setAttribute('title', allGroupsDisplay);
        if (colorWithoutSharp.toUpperCase() === 'FFFF00') {
          spanLabelAlt.innerHTML = this.getTranslation('idleTime', 'Idle time');
        }
        divLabel.appendChild(spanLabelAlt);

        let divElement = document.createElement('div');
        divElement.className = 'pulse-legend-element';
        divElement.appendChild(divIcon);
        divElement.appendChild(divLabel);
        divElements.appendChild(divElement);
      }

      for (let i = 0; i < 4; i++) {
        let divElement = document.createElement('div');
        divElement.className = 'pulse-legend-empty-element-to-align';
        divElements.appendChild(divElement);
      }

      this._content.appendChild(divOneLegend);

      // Hack for resize legend
      let legendContent = document.querySelector('.legend-content');
      if (legendContent && legendContent.dispatchEvent) {
        legendContent.dispatchEvent(new CustomEvent('resize'));
      }
    }
  }

  pulseComponent.registerElement('x-reasongroups', reasongroupsComponent);
})();
