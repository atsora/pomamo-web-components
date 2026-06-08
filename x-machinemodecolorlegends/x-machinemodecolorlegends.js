// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machinemodecolorlegends
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');

(function () {

  /**
   * `<x-machinemodecolorlegends>` — legend panel listing machine-mode colors.
   *
   * Fetches `MachineModeColorLegend/Get` once and renders a single legend
   * group: a "Machine mode" title, then one `.pulse-legend-element` per
   * item built from a colored square SVG (`pulseSvg.createColoredLegend(item.Color)`)
   * plus the display label, followed by 4 filler divs for flex alignment.
   * Always reports `isVisible === true`.
   *
   * @element x-machinemodecolorlegends
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class machinemodecolorlegendsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
      this._content.className = 'machinemodecolorlegends';
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
     * REST endpoint: `MachineModeColorLegend/Get`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'MachineModeColorLegend/Get';
    }

    // No parameter validation needed — legend renders the same shape for every
    // machine. Stub silences the "validateParameters is not defined" warning
    // and lets the state machine advance.
    validateParameters () {
      this.switchToNextContext();
    }

    /**
     * Renders the legend: title + one element per item (colored square SVG + display label).
     * Appends 4 empty filler divs for flexbox alignment, then triggers `.legend-content` resize.
     *
     * @param {{ Items: Array<{ Color: string, Display: string }> }} data
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
        let svg = pulseSvg.createColoredLegend(item.Color);
        if (svg != null) {
          svg.setAttribute('class', 'machinemodecolorlegends-icon');
          divIcon.appendChild(svg);
        }

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

  pulseComponent.registerElement('x-machinemodecolorlegends', machinemodecolorlegendsComponent);
})();
