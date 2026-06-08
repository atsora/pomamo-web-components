// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastworkinformation
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');
var state = require('state');

// Visibility contract:
// This component NEVER sets inline `display` on `this.element` or any ancestor.
// State "no operation tracked for this machine" is signaled by adding the class
// `lwi-no-operation` on the host. CSS in x-lastworkinformation.less hides
// the host when this class is present.

(function () {

  /**
   * `<x-lastworkinformation>` — inline current work-information cells for one
   * machine (no past-data block, no click handlers).
   *
   * Polls `GetLastWorkInformationV3/<machine-id>` (interval =
   * `refreshingRate.currentRefreshSeconds`, default 10 s) and renders one
   * `.pulse-cellbar-first` per work-information item, flagging cells with
   * missing values via `pulse-cellbar-cell-missing`. When `SlotMissing` is
   * true, inserts a single placeholder cell using the `noOperation`
   * translation. When the response carries `MonitoredMachineOperationBar ===
   * 'None'`, adds the `lwi-no-operation` class on the host (CSS hides it)
   * and switches to a `Loaded` `StaticState` to stop polling. Reacts to
   * `machineIdChangeSignal` on `machine-context` and to
   * `dateTimeRangeChangeEvent` on `period-context` (just tracks the range).
   *
   * @element x-lastworkinformation
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string} status-context  event-bus context for `workinformationStatusChange`
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @fires workinformationStatusChange `{ status: boolean | null }` — on `status-context`; `null` on error / no-operation, `true` when any cell is missing
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class LastWorkInformationComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      self._noOperationDisplay =
        self.getTranslation('noOperation', ''); // Default empty

      // DOM -> never in constructor
      self._between = undefined;
      self._messageSpan = undefined;
      self._content = undefined;

      return self;
    }

    get content () { return this._content; }

    /**
     * Builds and inserts `.pulse-cellbar-first` cells for each work information item.
     */
    _displayWorkInformations (workinformations, config) {
      [...this._content.querySelectorAll('.pulse-cellbar-first')].forEach(el => el.remove());

      for (let i = 0; i < workinformations.length; i++) {
        let div = document.createElement('div');
        div.className = 'pulse-cellbar-first pulse-cellbar-current-data';
        div.setAttribute('kind', workinformations[i].Kind);

        pulseSvg.createMissingdata(div);

        if (!pulseUtility.isNotDefined(workinformations[i].Value)) {
          div.innerHTML = workinformations[i].Value;
        }
        else {
          div.setAttribute('missing', workinformations[i].Kind);
          div.classList.add('pulse-cellbar-cell-missing');
          div.innerHTML = workinformations[i].Kind;
        }
        this._content.insertBefore(div, this._between);
      }
    }

    getStartKey (context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    defineState (context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          [...this._content.querySelectorAll('.pulse-cellbar-first')].forEach(el => el.remove());
          this.element.classList.remove('lwi-no-operation');
          this.start();
          break;
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal',
            newVal,
            this.onMachineIdChange.bind(this));
          break;
        case 'status-context':
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
        eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
        eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
      }

      // In case of clone, need to be empty
      this.element.replaceChildren();

      // Create DOM
      this._between = document.createElement('div');
      this._between.className = 'pulse-cellbar-between';
      this._content = document.createElement('div');
      this._content.className = 'pulse-cellbar-main';
      this._content.appendChild(this._between);
      this.element.appendChild(this._content);

      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      this.addClass('pulse-text');

      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      this.element.replaceChildren();

      this._between = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;

      eventBus.EventBus.dispatchToContext('workinformationStatusChange',
        this.element.getAttribute('status-context'),
        { status: null });
    }

    removeError () {
      this._messageSpan.innerHTML = '';
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      return 'GetLastWorkInformationV3/' + this.element.getAttribute('machine-id');
    }

    /**
     * Builds current work info cells (inline text mode, no past-data block).
     * Dispatches `workinformationStatusChange` with missing status boolean.
     */
    refresh (data) {
      let status = false;
      if (data.SlotMissing) {
        let div = document.createElement('div');
        div.className = 'workinformation-slotmissing';
        div.innerHTML = this._noOperationDisplay;
        let cellDiv = document.createElement('div');
        cellDiv.className = 'pulse-cellbar-first';
        cellDiv.appendChild(div);
        this._content.insertBefore(cellDiv, this._between);
      }
      else {
        let kinds = [];
        for (let i = 0; i < data.WorkInformations.length; i++) {
          kinds[i] = data.WorkInformations[i].Kind;
          status = status || ((pulseUtility.isNotDefined(data.WorkInformations[i].Value)) ? true : false);
        }
        this._kind = kinds;
        this._begin = data.Begin;
        this._end = data.End;
        this._iseditable = data.Config.IsEditable;
        this._displayWorkInformations(data.WorkInformations, data.Config);
      }

      if (data.DataMissing == true) {
        status = true;
      }

      eventBus.EventBus.dispatchToContext('workinformationStatusChange',
        this.element.getAttribute('status-context'),
        { status: status });
    }

    /**
     * Overrides base success handler: clears current cells, signals "no operation"
     * via host class if `MonitoredMachineOperationBar == 'None'` (and stops polling),
     * otherwise clears the signal and delegates to `refresh(data)`.
     */
    manageSuccess (data) {
      [...this._content.querySelectorAll('.pulse-cellbar-first')].forEach(el => el.remove());

      if (data.MonitoredMachineOperationBar == 'None') {
        console.info('No operation for this machine : '
          + this.element.getAttribute('machine-id'));
        this.element.classList.add('lwi-no-operation');

        eventBus.EventBus.dispatchToContext('workinformationStatusChange',
          this.element.getAttribute('status-context'),
          { status: null });

        this.switchToContext('Loaded'); // stop polling
        return;
      }

      this.element.classList.remove('lwi-no-operation');
      super.manageSuccess(data); // calls refresh(data) via the state machine
    }

    // Callback events

    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if ((this._dateRange == undefined) ||
        (!pulseRange.equals(newRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._dateRange = newRange;
      }
    }

  }

  pulseComponent.registerElement('x-lastworkinformation', LastWorkInformationComponent, ['machine-id', 'machine-context', 'status-context', 'period-context']);
})();
