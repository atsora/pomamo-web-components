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

  class runninglegendsComponent extends pulseComponent.PulseInitializedComponent {
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

    get content () { return this._content; } // Optional

    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('runninglegends');
      $(this.element).append(this._content);

      let titleSpan = $('<span></span>').html(this.getTranslation('title', 'Activity state'));
      let divTitle = $('<div></div>').addClass('pulse-legend-title')
        .append(titleSpan);
      let divElements = $('<div></div>').addClass('pulse-legend-elements');
      let divOneLegend = $('<div></div>').addClass('pulse-legend-onelegend')
        .append(divTitle).append(divElements);

      { // RUNNING
        let divIcon = $('<div></div>').addClass('pulse-legend-icon');
        let svg = pulseSvg.createColoredLegend(null, 'fill-running');
        if (svg != null) {
          svg.setAttribute('class', 'runninglegends-icon');
          divIcon.append(svg);
        }

        let span = $('<span></span>').html(
          this.getTranslation('textrunning', 'Running'));
        let divLabel = $('<div></div>').addClass('pulse-legend-label').append(span);

        let divElement = $('<div></div>').addClass('pulse-legend-element');
        divElement.append(divIcon).append(divLabel);
        divElements.append(divElement);
      }
      { // IDLE
        let divIcon = $('<div></div>').addClass('pulse-legend-icon');
        let svg = pulseSvg.createColoredLegend(null, 'fill-idle');
        if (svg != null) {
          svg.setAttribute('class', 'runninglegends-icon');
          divIcon.append(svg);
        }

        let span = $('<span></span>').html(
          this.getTranslation('textidle', 'Idle'));
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

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', ' Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      // Hack for resize legend
      $('.legend-content').resize();

      // Listener and dispatchers

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
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

  }

  pulseComponent.registerElement('x-runninglegends', runninglegendsComponent);
})();
