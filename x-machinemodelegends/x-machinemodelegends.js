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
   * `<x-machinemodelegends>` — legend panel for machine mode categories.
   *
   * Fetches `MachineModeCategoryLegend` and renders one legend block with:
   *  - a titled section (`pulse-legend-title`)
   *  - one `pulse-legend-element` per item (SVG icon via `pulseSvg.getMachineModeClass` + label)
   *  - 4 empty filler divs for flexbox alignment
   *
   * After render, triggers a `.legend-content` resize event.
   * `isVisible` is always true so the legend always fetches regardless of scroll position.
   *
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('machinemodelegends');
      $(this.element).append(this._content);

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
      $(this._content).empty();

      let titleSpan = $('<span></span>').html(this.getTranslation('title', 'Machine mode'));
      let divTitle = $('<div></div>').addClass('pulse-legend-title')
        .append(titleSpan);
      let divElements = $('<div></div>').addClass('pulse-legend-elements');
      let divOneLegend = $('<div></div>').addClass('pulse-legend-onelegend')
        .append(divTitle).append(divElements);

      for (let i = 0; i < data.Items.length; i++) {
        let item = data.Items[i];
        let divIcon = $('<div></div>').addClass('pulse-legend-icon');

        // New div for svg
        let svgDiv = $('<div></div>').addClass('machinemodelegends-svg');
        let modeClass = pulseSvg.getMachineModeClass(item.Id);
        svgDiv.addClass(modeClass);
        //svgDiv.css('color', null);
        $(divIcon).append(svgDiv);
        pulseSvg.inlineBackgroundSvg(svgDiv);

        let span = $('<span></span>').html(item.Display);
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

  pulseComponent.registerElement('x-machinemodelegends', machinemodelegendsComponent);
})();
