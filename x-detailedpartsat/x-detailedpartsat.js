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

  /**
   * `<x-detailedpartsat>` — detail panel showing parts production for one
   * machine/group over a date range.
   *
   * Fetches `Operation/PartProductionRange?GroupId=<id>&Range=<range>` on each
   * `machine-id` / `range` change. Range may come from the `range` attribute or
   * be received via `dateTimeRangeChangeEvent` on `period-context`. Reacts to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-detailedpartsat
   * @attr {number} machine-id       (required) machine or group id
   * @attr {string} range            ISO datetime range `begin;end`
   * @attr {string} period-context   event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
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
      this._detailedContent.replaceChildren();
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'detailed-main';
      this.element.appendChild(this._content);

      // Title
      let title = this.getTranslation('detailsViewSubTitles.partgoal', 'Nb pieces');
      let spanTitle = document.createElement('span');
      spanTitle.className = 'detailedpartsat-title-span';
      spanTitle.innerHTML = title;
      let divTitle = document.createElement('div');
      divTitle.className = 'detailed-title';
      divTitle.appendChild(spanTitle);
      this._content.appendChild(divTitle);

      // Detailed content
      this._detailedContent = document.createElement('div');
      this._detailedContent.className = 'detailed-content';
      this._content.appendChild(this._detailedContent);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Create DOM - message for error - no need to store, can be removed
      let messageSpan = document.createElement('span');
      messageSpan.className = 'pulse-message';
      messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(messageSpan);
      this._detailedContent.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this._cleanDisplay();
      this.element.replaceChildren();

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
        this.setError(this.getTranslation('error.missingRange', 'Missing range'));
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._cleanDisplay();

      let messageSpan = this.element.querySelector('.pulse-message');
      if (!messageSpan) {
        // Create DOM - message for error
        messageSpan = document.createElement('span');
        messageSpan.className = 'pulse-message';
        let messageDiv = document.createElement('div');
        messageDiv.className = 'pulse-message-div';
        messageDiv.appendChild(messageSpan);
        this._detailedContent.appendChild(messageDiv);
      }
      messageSpan.innerHTML = message;
    }

    removeError () {
      let messageSpan = this.element.querySelector('.pulse-message');
      if (messageSpan) messageSpan.innerHTML = '';
    }

    getShortUrl () {
      let url = 'Operation/PartProductionRange?GroupId='
        + this.element.getAttribute('machine-id')
        + '&Range='
        + pulseUtility.convertDateRangeForWebService(this._range);
      return url;
    }

    refresh (data) {
      this._detailedContent.replaceChildren();

      // if data.InProgress == true -> reload ?

      let divRange = document.createElement('div');
      divRange.className = 'detailed-range';
      let divDetails = document.createElement('div');
      divDetails.className = 'detailed-data';

      // RANGE
      let tmpRange = pulseRange.createDateRangeFromString(data.Range);
      let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
      let spanRange = document.createElement('span');
      spanRange.className = 'detailedpartsat-range-span';
      spanRange.innerHTML = rangeDisplay;
      divRange.appendChild(spanRange);

      // DETAILS
      let display = Math.round(100 * data.NbPieces) / 100;
      if (!pulseUtility.isNotDefined(data.Goal)) {
        display += ' / ' + (Math.round(100 * data.Goal) / 100);
      }
      let spanDisplay = document.createElement('span');
      spanDisplay.className = 'detailed-single-data';
      spanDisplay.innerHTML = display;
      divDetails.appendChild(spanDisplay);

      this._detailedContent.appendChild(divRange);
      this._detailedContent.appendChild(divDetails);
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
