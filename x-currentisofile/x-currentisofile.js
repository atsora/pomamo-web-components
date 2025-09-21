// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currentisofile
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');

/**
 * Build a custom tag <x-currentisofile> to display an currentisofile bar component. This tag gets following attribute : 
 *  machine : Integer
 */
(function () {

  class CurrentIsoFileComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default value
      self._content = undefined;
      self._lastCncValueData = undefined;
      self._lastCncValueDate = undefined;
      self._fieldDisplay = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'machine-id') {
        //this.switchToContext('Initialization');
        this.start();
      }
    }

    get maximumElapsedTimeCurrentIsoFile () {
      return 120000; // 2 minutes = 120s
    }

    initialize () {
      this.addClass('pulse-smalltext');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('currentisofile-data');
      $(this.element).append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
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
      $(this._content).empty(); // To remove svg

      this.switchToNextContext();
    }

    /**
    * Validate the (event) parameters
    */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (text) {
      $(this._content).empty(); // To remove svg

      let span = $('<span></span>').addClass('pulse-message')
        .html(text);
      $(this._content).append(span);
    }

    removeError () {
      this.displayError('');
    }

    get refreshRate () {  // refresh rate in ms. 
      return 1000.0 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1); // +1 to allow refresh from bars
    }

    getShortUrl () {
      return 'IsoFile/Current?MachineId=' + this.element.getAttribute('machine-id');
    }

    displayTextAndTooltip (text, tooltip) {
      let span = $(this._content).find('span');
      if (0 == span.length) {
        span = $('<span></span>').addClass('currentisofile-data-span');
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
      let isoFiles = '--';
      if (!pulseUtility.isNotDefined(data.IsoFiles)) {
        isoFiles = data.IsoFiles;
      }
      this.displayTextAndTooltip(isoFiles);
    }

    manageSuccess (data) {
      // Clear
      //$(this._content).css('display', 'inline-block');
      this.displayTextAndTooltip('');
      //$(this._content).empty(); // To clean

      if (data.TooOld == true) {
        let noDataTooOld = this.getTranslation('noDataTooOld', 'N/A ');
        this.switchToContext('NotAvailable', () => this.displayTextAndTooltip(noDataTooOld));
        return;
      }
      this.switchToNextContext(() => this.refresh(data));
    }
  }

  pulseComponent.registerElement('x-currentisofile', CurrentIsoFileComponent, ['machine-id']);

})();
