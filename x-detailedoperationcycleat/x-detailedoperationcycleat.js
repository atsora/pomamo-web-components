// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedoperationcycleat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {
  class DetailedOperationCycleAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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

      // Title
      let title = this.getTranslation(
        'detailsViewSubTitles.operationcycle', 'cycle');
      let spanTitle = $('<span></span>').addClass('detailedoperationcycleat-title-span')
        .html(title);
      let divTitle = $('<div></div>').addClass('detailed-title').append(spanTitle);
      $(this._content).append(divTitle);

      // detailed content
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
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in detailedoperationcycleat.element');
        // Delayed display :
        this.setError(this.getTranslation('error.missingWhen', 'Missing when'));
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
      return 'OperationCycleAt?MachineId='
        + this.element.getAttribute('machine-id')
        + '&At=' + this.element.getAttribute('when');
    }

    refresh (data) {
      $(this._detailedContent).empty();

      let divRange = $('<div></div>').addClass('detailed-range');

      // RANGE
      let tmpRange = pulseRange.createDateRangeFromString(data.Range);
      pulseUtility.appendDateRangeDisplay(divRange, tmpRange, true);
      // Estimated ?
      if (data.EstimatedStart) {
        divRange.addClass('detailedoperationcycleat-estimated-begin');
      }
      if (data.EstimatedEnd) {
        divRange.addClass('detailedoperationcycleat-estimated-end');
      }
      $(this._detailedContent).append(divRange);

      // DETAILS
      let divDetails = $('<div></div>').addClass('detailed-data')
      //.addClass('detailed-module-content'); ???

      if (!pulseUtility.isNotDefined(data.DeliverablePieces)) {
        for (let i = 0; i < data.DeliverablePieces.length; i++) {
          let display = data.DeliverablePieces[i].Display;
          let divSingleData = $('<div></div>').addClass('detailed-single-data')
          let spanDisplay = $('<span></span>').addClass('detailedoperationcycleat-single-span')
            .html(display);
          $(divSingleData).append(spanDisplay);
          $(divDetails).append(divSingleData);
        }
      }

      $(this._detailedContent).append(divDetails);
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

  pulseComponent.registerElement('x-detailedoperationcycleat', DetailedOperationCycleAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
