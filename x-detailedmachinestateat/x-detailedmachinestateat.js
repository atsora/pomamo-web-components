// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedmachinestateat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-detailedmachinestateat>` — detail panel showing the machine-state-template
   * slot active at a given point in time for one machine.
   *
   * Fetches `MachineStateTemplateSlots?MachineId=<id>&Range=<single-point-range>&NoPeriodExtension=false`
   * on each `machine-id` / `when` change and renders the slot range and
   * template display. Reacts to `dateTimeChangeEvent` on `datetime-context`
   * (updates `when`) and to `machineIdChangeSignal` on `machine-context`
   * (updates `machine-id`).
   *
   * @element x-detailedmachinestateat
   * @attr {number} machine-id       (required) machine id
   * @attr {string} when             (required) ISO datetime
   * @attr {string} datetime-context event-bus context for `dateTimeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class DetailedMachineStateAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

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

      // MST title
      let title = this.getTranslation('detailsViewSubTitles.machinestatetemplate', 'scheduled status');
      let spanTitle = document.createElement('span');
      spanTitle.className = 'detailedmachinestateat-title-span';
      spanTitle.innerHTML = title;
      let divTitle = document.createElement('div');
      divTitle.className = 'detailed-title';
      divTitle.appendChild(spanTitle);
      this._content.appendChild(divTitle);

      // MST detailed content
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
        console.error('missing attribute when in detailedmachinestateat.element');
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
      if (messageSpan == null) {
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
      let ms = this.element.querySelector('.pulse-message');
      if (ms) ms.innerHTML = '';
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'MachineStateTemplateSlots?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Range=' + pulseUtility.createSingleRangeForWebService(this.element.getAttribute('when'))
        + '&NoPeriodExtension=false'; // range = ONE datetime
    }

    refresh (data) {
      this._detailedContent.replaceChildren();

      if (0 < data.MachineStateTemplateSlots.length) {
        let divRange = document.createElement('div');
        divRange.className = 'detailed-range';
        let divDetails = document.createElement('div');
        divDetails.className = 'detailed-data';
        // RANGE display
        let tmpRange = pulseRange.createDateRangeFromString(data.MachineStateTemplateSlots[0].Range);
        let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
        let spanRange = document.createElement('span');
        spanRange.className = 'detailedmachinestateat-range-span';
        spanRange.innerHTML = rangeDisplay;
        divRange.appendChild(spanRange);
        // range store
        this._dateRange = pulseRange.createDateRangeFromString(data.MachineStateTemplateSlots[0].Range);

        // DETAILS
        this._machineStateTemplateId = data.MachineStateTemplateSlots[0].Id;
        let display = data.MachineStateTemplateSlots[0].Display;
        let spanDisplay = document.createElement('span');
        spanDisplay.className = 'detailedmachinestateat-reason';
        spanDisplay.innerHTML = display;
        divDetails.appendChild(spanDisplay);

        /*if ('false' == this.getConfigOrAttribute('detailedmachinestateat.hideButton', 'false')) {
          // Add button = before text display -> float right
          let changeText = this.getTranslation('changebutton', 'Change');
          let changeButton = document.createElement('a');
          changeButton.className = 'detailed-button';
          changeButton.innerHTML = changeText;

          let self = this;
          changeButton.addEventListener('click', function (e) {
            // Hide Popup
            document.querySelectorAll('.popup-block').forEach(el => pulseUtility.fadeOut(el));
            // Open Save Dlg
            let saveMST = pulseUtility.createElementWithAttribute('x-savemachinestatetemplate', {
              'machine-id': self.element.getAttribute('machine-id'),
              'range': pulseUtility.convertDateRangeForWebService(this._dateRange),
              'mst-id': self._machineStateTemplateId
            });
            self.element.appendChild(saveMST);
          });
          divDetails.appendChild(changeButton);
        }*/

        this._detailedContent.appendChild(divRange);
        this._detailedContent.appendChild(divDetails);
      }
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revisionid, machineid, kind, range,
     * initModifications: undefined, // pending modifications the first time
     * pendingModifications: undefined // pending modifications 'now'
     */
    onModificationEvent (event) {
      let modif = event.target;
      if (event.target.kind != 'MST') {
        return;
      }
      if (event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }
      let isNew = true;
      if (this._mapOfModifications.has(modif.revisionid))
        isNew = false;
      this._mapOfModifications.set(modif.revisionid, modif);

      //event.target.ranges
      if (isNew) {
        // First time -> TODO create progress bar
      }
      if (event.target.pendingModifications == 0) {
        this.switchToContext('Reload');
      }
      // else = do nothing (progress en cours)
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

  pulseComponent.registerElement('x-detailedmachinestateat', DetailedMachineStateAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
