// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedsequenceat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-detailedsequenceat>` — detail panel showing the sequence slot(s) at a
   * given point in time for one machine, grouped by machine module.
   *
   * Fetches `SequenceSlots?MachineId=<id>&Range=<single-point-range>` on each
   * `machine-id` / `when` change and renders one block per machine module
   * (range header + sequence display, with the main module highlighted when
   * more than one is returned). Reacts to `dateTimeChangeEvent` on
   * `datetime-context` (updates `when`) and to `machineIdChangeSignal` on
   * `machine-context` (updates `machine-id`).
   *
   * @element x-detailedsequenceat
   * @attr {number} machine-id       (required) machine id
   * @attr {string} when             (required) ISO datetime
   * @attr {string} datetime-context event-bus context for `dateTimeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class DetailedSequenceAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'detailed-main';
      this.element.appendChild(this._content);

      // Title
      let title = this.getTranslation('detailsViewSubTitles.sequence', 'sequence');
      let spanTitle = document.createElement('span');
      spanTitle.className = 'detailedsequenceat-title-span';
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
        console.error('missing attribute when in detailedsequenceat.element');
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
      if (messageSpan) {
        messageSpan.innerHTML = '';
      }
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'SequenceSlots?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Range=' + pulseUtility.createSingleRangeForWebService(this.element.getAttribute('when'));
    }

    refresh (data) {
      this._detailedContent.replaceChildren();

      if (data.ByMachineModule.length > 0) {
        // content
        for (let iModule = 0; iModule < data.ByMachineModule.length; iModule++) {
          let divModuleContent = document.createElement('div');
          divModuleContent.className = 'detailed-module-content';
          // read only 1 data
          if (data.ByMachineModule[iModule].Blocks.length > 0) {
            // range
            let tmpRange = pulseRange.createDateRangeFromString(data.ByMachineModule[iModule].Blocks[0].Range);
            let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
            let spanRange = document.createElement('span');
            spanRange.className = 'detailed-range';
            spanRange.innerHTML = rangeDisplay;

            this._detailedContent.appendChild(spanRange); // NOT divModuleContent for display

            // data
            let divModuleData = document.createElement('div');
            divModuleData.className = 'detailed-module-data';

            // data - Machine module
            // If more than 1 module : display
            if (data.ByMachineModule.length > 1) {
              let moduleDisplay = data.ByMachineModule[iModule].MachineModule.Display;
              let spanModule = document.createElement('span');
              spanModule.className = 'detailedsequenceat-module-span';
              spanModule.innerHTML = moduleDisplay;
              let divModule = document.createElement('div');
              divModule.className = 'detailed-machinemodule';
              divModule.appendChild(spanModule);
              if (data.ByMachineModule[iModule].MachineModule.Main) { // highlight
                spanModule.classList.add('detailed-mainmachinemodule');
              }
              divModuleData.appendChild(divModule);
            }

            // data - sequence
            let display = data.ByMachineModule[iModule].Blocks[0].Display;
            let spanSequence = document.createElement('span');
            spanSequence.className = 'detailedsequenceat-data-sequence';
            spanSequence.innerHTML = display;

            // Tool(s)
            //data.ByMachineModule[iModule].Blocks[0].Details[iTool].Display

            divModuleData.appendChild(spanSequence);
            divModuleContent.appendChild(divModuleData);

            this._detailedContent.appendChild(divModuleContent);
          }
        }
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

  pulseComponent.registerElement('x-detailedsequenceat', DetailedSequenceAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
