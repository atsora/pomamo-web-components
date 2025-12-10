// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedpartsat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  class DetailedPartsAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;
      self._detailedContent = undefined;

      // Default
      this._range = undefined;

      return self;
    }

    get content () { return this._content; } // Optional

    _cleanDisplay () {
      $(this._detailedContent).empty();
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'range':
          if (this.isInitialized()) {
            this._cleanDisplay();
            this.start(); // requires to restart the component.
          } break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-details'); // Mandatory for loader

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        this._range = pulseRange.createDateRangeFromString(attr);
      }

      // Listener and dispatchers
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>')
        .addClass('detailed-main');
      $(this.element).append(this._content);

      // Title
      let title = this.getTranslation('detailsViewSubTitles.partgoal', 'Nb pieces');
      let spanTitle = $('<span></span>').addClass('detailedpartsat-title-span')
        .html(title);
      let divTitle = $('<div></div>').addClass('detailed-title').append(spanTitle);
      $(this._content).append(divTitle);

      // Detailed content
      this._detailedContent = $('<div></div>').addClass('detailed-content');
      $(this._content).append(this._detailedContent);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error - no need to store, can be removed
      let messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(messageSpan);
      $(this._detailedContent).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this._cleanDisplay();
      $(this.element).empty();

      this._detailedContent = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters () {
      if ((!this.element.hasAttribute('machine-id'))
        || (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id'))))) {
        // Delayed display :
        this.setError('missing machine-id');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      if (this._range == undefined) {
        console.log('waiting attribute range in detailedpartsat.element');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }

        // Delayed display :
        this.setError('missing range');
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._cleanDisplay();

      let messageSpan = $(this.element).find('.pulse-message');
      if (messageSpan.length == 0) {
        // Create DOM - message for error
        messageSpan = $('<span></span>')
          .addClass('pulse-message');
        let messageDiv = $('<div></div>')
          .addClass('pulse-message-div')
          .append(messageSpan);
        $(this._detailedContent).append(messageDiv);
      }
      $(messageSpan).html(message);
    }

    removeError () {
      $(this.element).find('.pulse-message').html('');
    }

    getShortUrl () {
      let url = 'Operation/PartProductionRange?GroupId='
        + this.element.getAttribute('machine-id')
        + '&Range='
        + pulseUtility.convertDateRangeForWebService(this._range);
      return url;
    }

    refresh (data) {
      $(this._detailedContent).empty();

      // if data.InProgress == true -> reload ?

      let divRange = $('<div></div>').addClass('detailed-range');
      let divDetails = $('<div></div>').addClass('detailed-data');

      // RANGE
      let tmpRange = pulseRange.createDateRangeFromString(data.Range);
      let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
      let spanRange = $('<span></span>').addClass('detailedpartsat-range-span')
        .html(rangeDisplay);
      $(divRange).append(spanRange);

      // DETAILS
      let display = Math.round(100 * data.NbPieces) / 100;
      if (!pulseUtility.isNotDefined(data.Goal)) {
        display += ' / ' + (Math.round(100 * data.Goal) / 100);
      }
      let spanDisplay = $('<span></span>').addClass('detailed-single-data')
        .html(display);
      $(divDetails).append(spanDisplay);

      $(this._detailedContent)
        .append(divRange)
        .append(divDetails);
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    // Callback events
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      this._range = newRange;
      this.start();
    }
  }

  pulseComponent.registerElement('x-detailedpartsat', DetailedPartsAtComponent, ['machine-id', 'range', 'period-context', 'machine-context']);
})();
