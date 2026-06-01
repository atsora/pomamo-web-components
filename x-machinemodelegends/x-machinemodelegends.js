// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machinemodelegends
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');

(function () {

  /**
   * `<x-machinemodelegends>` — legend panel listing machine-mode categories.
   *
   * Fetches `MachineModeCategoryLegend` once and renders a single legend
   * group: a "Machine mode" title, then one `.pulse-legend-element` per
   * item built from a per-mode SVG icon (`pulseSvg.getMachineModeClass(item.Id)`
   * + `pulseSvg.inlineBackgroundSvg`) plus the display label, followed by
   * 4 filler divs for flex alignment. Always reports `isVisible === true`.
   *
   * @element x-machinemodelegends
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class machinemodelegendsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'machinemodelegends';
      this.element.appendChild(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      this.switchToNextContext();
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
     * REST endpoint: `MachineModeCategoryLegend`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'MachineModeCategoryLegend';
    }

    /**
     * Renders the legend: title + one element per item (SVG icon + display label).
     * Appends 4 empty filler divs for flexbox alignment, then triggers `.legend-content` resize.
     *
     * @param {{ Items: Array<{ Id: number, Display: string }> }} data
     */
    refresh (data) {
      this._content.replaceChildren();

      let titleSpan = document.createElement('span');
      titleSpan.innerHTML = this.getTranslation('title', 'Machine mode');
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
        let divIcon = document.createElement('div');
        divIcon.className = 'pulse-legend-icon';

        // New div for svg
        let svgDiv = document.createElement('div');
        svgDiv.className = 'machinemodelegends-svg';
        let modeClass = pulseSvg.getMachineModeClass(item.Id);
        svgDiv.classList.add(modeClass);
        //svgDiv.css('color', null);
        divIcon.appendChild(svgDiv);
        pulseSvg.inlineBackgroundSvg(svgDiv);

        let span = document.createElement('span');
        span.innerHTML = item.Display;
        let divLabel = document.createElement('div');
        divLabel.className = 'pulse-legend-label';
        divLabel.appendChild(span);

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
      if (legendContent) {
        legendContent.dispatchEvent(new Event('resize'));
      }
    }
  }

  pulseComponent.registerElement('x-machinemodelegends', machinemodelegendsComponent);
})();
