// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedobservationstateat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {
  class DetailedObservationStateAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
        case 'when':
          if (this.isInitialized()) {
            this._cleanDisplay();
            this.start(); // requires to restart the component.
          } break;
        case 'datetime-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeChangeEvent');
            eventBus.EventBus.addEventListener(this, 
              'dateTimeChangeEvent',
              newVal,
              this.onDateTimeChange.bind(this));
          }
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 
              'machineIdChangeSignal',
              newVal,
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

      // Listener and dispatchers
      if (this.element.hasAttribute('datetime-context')) {
        eventBus.EventBus.addEventListener(this, 
          'dateTimeChangeEvent',
          this.element.getAttribute('datetime-context'),
          this.onDateTimeChange.bind(this));
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

      // OS - title
      let title = this.getTranslation(
        'detailsViewSubTitles.observationstate', 'machine state');
      let spanTitle = $('<span></span>').addClass('detailedobservationstateat-title-span')
        .html(title);
      let divTitle = $('<div></div>').addClass('detailed-title').append(spanTitle);
      $(this._content).append(divTitle);
      // OS - detailed content
      this._detailedContent = $('<div></div>').addClass('detailed-content');
      $(this._content).append(this._detailedContent);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
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
        console.error('missing attribute machine-id in detailedobservationstateat.element');
        // Delayed display :
        this.setError('missing machine-id');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in detailedobservationstateat.element');
        // Delayed display :
        this.setError('missing when');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
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
      // Return the Web Service URL here without path
      return 'ObservationStateSlots?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Range=' + pulseUtility.createSingleRangeForWebService(this.element.getAttribute('when'));
    }

    refresh (data) {
      $(this._detailedContent).empty();

      if (0 < data.ObservationStateSlots.length) {
        let divRange = $('<div></div>').addClass('detailed-range');
        let divDetails = $('<div></div>').addClass('detailed-data');

        // RANGE
        let tmpRange = pulseRange.createDateRangeFromString(data.ObservationStateSlots[0].Range);
        let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
        let spanRange = $('<span></span>').addClass('detailedobservationstateat-range-span')
          .html(rangeDisplay);
        $(divRange).append(spanRange);

        // DETAILS
        let display = data.ObservationStateSlots[0].Display;
        let spanDisplay = $('<span></span>').addClass('detailed-single-data')
          .html(display);
        $(divDetails).append(spanDisplay);

        $(this._detailedContent).append(divRange)
          .append(divDetails);
      }
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    // Callback events
    onDateTimeChange (event) {
      this.element.setAttribute('when', event.target.when);
    }
  }

  pulseComponent.registerElement('x-detailedobservationstateat', DetailedObservationStateAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
