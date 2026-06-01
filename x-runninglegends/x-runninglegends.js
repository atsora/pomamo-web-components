// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-runninglegends
 * @requires module:pulseComponent
 */

var pulseSvg = require('pulseSvg');
var pulseComponent = require('pulsecomponent');

(function () {

  /**
   * `<x-runninglegends>` — static Running / Idle activity legend.
   *
   * Performs no AJAX. Renders a single legend group with title "Activity
   * state" then two `.pulse-legend-element` rows — one Running
   * (`pulseSvg.createColoredLegend(null, 'fill-running')`), one Idle
   * (`fill-idle`) — followed by 4 filler divs for flex alignment.
   *
   * @element x-runninglegends
   * @extends pulseComponent.PulseInitializedComponent
   */
  class runninglegendsComponent extends pulseComponent.PulseInitializedComponent {
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

    /**
     * Builds the Running/Idle legend DOM entirely at initialization.
     * No REST request — data is static (hardcoded states).
     */
    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'runninglegends';
      this.element.appendChild(this._content);

      let titleSpan = document.createElement('span');
      titleSpan.innerHTML = this.getTranslation('title', 'Activity state');
      let divTitle = document.createElement('div');
      divTitle.className = 'pulse-legend-title';
      divTitle.appendChild(titleSpan);

      let divElements = document.createElement('div');
      divElements.className = 'pulse-legend-elements';

      let divOneLegend = document.createElement('div');
      divOneLegend.className = 'pulse-legend-onelegend';
      divOneLegend.appendChild(divTitle);
      divOneLegend.appendChild(divElements);

      { // RUNNING
        let divIcon = document.createElement('div');
        divIcon.className = 'pulse-legend-icon';
        let svg = pulseSvg.createColoredLegend(null, 'fill-running');
        if (svg != null) {
          svg.setAttribute('class', 'runninglegends-icon');
          divIcon.appendChild(svg);
        }

        let span = document.createElement('span');
        span.innerHTML = this.getTranslation('textrunning', 'Running');
        let divLabel = document.createElement('div');
        divLabel.className = 'pulse-legend-label';
        divLabel.appendChild(span);

        let divElement = document.createElement('div');
        divElement.className = 'pulse-legend-element';
        divElement.appendChild(divIcon);
        divElement.appendChild(divLabel);
        divElements.appendChild(divElement);
      }
      { // IDLE
        let divIcon = document.createElement('div');
        divIcon.className = 'pulse-legend-icon';
        let svg = pulseSvg.createColoredLegend(null, 'fill-idle');
        if (svg != null) {
          svg.setAttribute('class', 'runninglegends-icon');
          divIcon.appendChild(svg);
        }

        let span = document.createElement('span');
        span.innerHTML = this.getTranslation('textidle', 'Idle');
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

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', ' Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      // Hack for resize legend
      let legendContent = document.querySelector('.legend-content');
      if (legendContent && legendContent.dispatchEvent) {
        legendContent.dispatchEvent(new Event('resize'));
      }

      // Listener and dispatchers

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    displayError (message) {
      if (this._content) {
        this._content.style.display = 'none';
      }
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      if (this._content) {
        this._content.style.display = '';
      }
    }

  }

  pulseComponent.registerElement('x-runninglegends', runninglegendsComponent);
})();
