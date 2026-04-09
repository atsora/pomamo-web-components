// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currentsequence
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
//var pulseRange = require('pulseRange');

/**
 * Build a custom tag <x-currentsequence> to display the current sequence for a machine.
 *
 * Attributes:
 *   machine-id - (required) integer machine id
 */
(function () {

  /**
   * `<x-currentsequence>` — displays the current operation sequence name for a machine.
   *
   * Polls `Operation/CurrentSequence/?MachineId=<id>` at `currentRefreshSeconds + 1` seconds.
   * Renders the `Display` of the first machine module's `Sequence`, or '-' if data is too old.
   * Supports single-module data only — multi-module case not handled.
   *
   * `displayTextAndTooltip(text, tooltip)` manages a lazily created `<span>` inside the content div.
   *
   * Attributes:
   *   machine-id - (required) integer machine id; restart triggered on change
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class CurrentSequenceComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'machine-id') {
        //this.switchToContext('Initialization');
        this.start();
      }
    }

    initialize () {
      this.addClass('pulse-smalltext');

      if (!this.element.hasAttribute('machine-id')) {
        this.switchToKey('Error', () => this.displayError('missing machine-id'), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in CurrentSequenceComponent.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('currentsequence-data');
      $(this.element).append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Initialization OK => switch to the next context
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

    reset () {
      this.removeError();

      // Empty content
      this.displayTextAndTooltip('');
      $(this._content).empty();

      this.switchToNextContext();
    }

    displayError (text) {
      this.displayTextAndTooltip('');
    }

    removeError () {
      this.displayTextAndTooltip('');
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config + 1 second (default ~11s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      return 1000.0 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1);
    }

    /**
     * REST endpoint: `Operation/CurrentSequence/?MachineId=<id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let url = 'Operation/CurrentSequence/?MachineId='
        + this.element.getAttribute('machine-id');
      return url;
    }

    /**
     * Updates the text and optional tooltip on the content span.
     * Creates the span lazily if it doesn't exist yet.
     *
     * @param {string} text    - HTML string to display.
     * @param {string} [tooltip] - Tooltip string; removes `title` attribute if undefined.
     */
    displayTextAndTooltip (text, tooltip) {
      let span = $(this._content).find('span');
      if (0 == span.length) {
        span = $('<span></span>').addClass('currentsequence-data-span');
        $(this._content).append(span);
      }
      span.html(text);
      if (pulseUtility.isNotDefined(tooltip)) {
        $(this._content).removeAttr('title');
      }
      else {
        $(this._content).attr('title', tooltip);
      }
    }

    /**
     * Renders the sequence display: '-' if data is too old, otherwise
     * the `Display` of the first machine module's `Sequence`.
     *
     * @param {{ TooOld: boolean, ByMachineModule: Array<{ Sequence?: { Display: string } }> }} data
     */
    refresh (data) {
      $(this._content).empty();

      let display = '';
      if (data.TooOld) {
        display = this.getTranslation('noDataTooOld', '-'); // was N/A
      }
      else {
        if (data.ByMachineModule.length == 1) {
          let iModule = 0;
          // read only 1 data
          if (typeof data.ByMachineModule[iModule].Sequence != 'undefined') {
            // data - sequence
            display = data.ByMachineModule[iModule].Sequence.Display;
          }
        }
      }

      this.displayTextAndTooltip(display);
    }
  }

  pulseComponent.registerElement('x-currentsequence', CurrentSequenceComponent, ['machine-id']);

})();
