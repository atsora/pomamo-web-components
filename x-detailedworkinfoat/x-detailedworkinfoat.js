// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedworkinfoat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseRange from 'pulseRange';
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-detailedworkinfoat>` — detail panel showing the operation slot
   * (work information) at a given point in time for one machine.
   *
   * Fetches
   * `OperationSlots?MachineId=<id>&Range=<single-point-range>&SkipDetails=false`
   * on each `machine-id` / `when` change and renders the operation range and
   * display label. Reacts to `dateTimeChangeEvent` on `datetime-context`
   * (updates `when`) and to `machineIdChangeSignal` on `machine-context`
   * (updates `machine-id`).
   *
   * @element x-detailedworkinfoat
   * @attr {number} machine-id       (required) machine id
   * @attr {string} when             (required) ISO datetime
   * @attr {string} datetime-context event-bus context for `dateTimeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class DetailedWorkinfoAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
      this._detailedContent.replaceChildren();
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
            eventBus.EventBus.removeEventListenerBySignal(this,
              'dateTimeChangeEvent');
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'detailed-main';
      this.element.appendChild(this._content);

      // Title
      let title = this.getTranslation('detailsViewSubTitles.workinfo', 'job');
      let spanTitle = document.createElement('span');
      spanTitle.className = 'detailedworkinfoat-title-span';
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

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in detailedworkinfoat.element');
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
      return 'OperationSlots?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Range=' + pulseUtility.createSingleRangeForWebService(this.element.getAttribute('when'))
        + '&SkipDetails=false'; // range = ONE datetime
    }

    refresh (data) {
      this._detailedContent.replaceChildren();

      if (0 < data.Blocks.length) {
        let divRange = document.createElement('div');
        divRange.className = 'detailed-range';
        let divDetails = document.createElement('div');
        divDetails.className = 'detailed-data';
        // RANGE
        let tmpRange = pulseRange.createDateRangeFromString(data.Blocks[0].Range);
        let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
        let spanRange = document.createElement('span');
        spanRange.className = 'detailedworkinfoat-range-span';
        spanRange.innerHTML = rangeDisplay;
        divRange.appendChild(spanRange);
        // DETAILS
        let display = data.Blocks[0].Display;
        let spanDisplay = document.createElement('span');
        spanDisplay.className = 'detailed-single-data';
        spanDisplay.innerHTML = display;
        divDetails.appendChild(spanDisplay);
        //let w = this._content.clientWidth;
        //w = w - this.element.querySelector(".detailed-title").clientWidth;
        //w = w - divRange.clientWidth;
        //spanDisplay.style.width = (w - 10) + 'px'; // 10 = r-margin

        this._detailedContent.appendChild(divRange);
        this._detailedContent.appendChild(divDetails);
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

  pulseComponent.registerElement('x-detailedworkinfoat', DetailedWorkinfoAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
