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
 * Build a custom tag <x-currentsequence> to display a currentsequence component. This tag gets following attribute : 
 *  machine : Integer
 */
(function () {

  class CurrentSequenceComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default value
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
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
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

    get refreshRate () { // refresh rate in ms. 
      return 1000.0 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1);
    }

    getShortUrl () {
      let url = 'Operation/CurrentSequence/?MachineId='
        + this.element.getAttribute('machine-id');
      return url;
    }

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
