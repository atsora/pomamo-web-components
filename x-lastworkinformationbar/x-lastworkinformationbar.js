// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastworkinformationbar
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 * @requires module:detailspopup
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');
var state = require('state');

// Visibility contract:
// This component NEVER sets inline `display` on `this.element` or any ancestor.
// State "no operation tracked for this machine" is signaled by adding the class
// `lwi-no-operation` on the host. CSS in x-lastworkinformationbar.less hides
// the host when this class is present. Pages that wrap the host in
// `.pulse-bar-div` may opt-in to collapse the wrapper via:
//   .pulse-bar-div:has(> x-lastworkinformationbar.lwi-no-operation) { display: none; }

(function () {

  /**
   * `<x-lastworkinformationbar>` — bar-style display of the last work information for a machine.
   *
   * Polls `GetLastWorkInformationV3/<machine-id>` at `currentRefreshSeconds` interval.
   * Renders a cell-bar layout with current work info cells and a "Past Data" cell.
   * Uses a custom `Loaded` (StaticState) context to stop polling when the machine
   * has no operation tracking.
   *
   * `manageSuccess()` adds `lwi-no-operation` class on the host if `MonitoredMachineOperationBar`
   * is 'None'; otherwise removes it and delegates to `refresh(data)`.
   * Clicking "Past Data" opens a change-work-info dialog via `pulseDetailsPopup`.
   *
   * Attributes:
   *   machine-id        - (required) integer machine id; restart on change
   *   machine-context   - (optional) event bus context for machine selection changes
   *   status-context    - (optional) event bus context to dispatch `workinformationStatusChange`
   *   period-context    - (optional) event bus context for `dateTimeRangeChangeEvent`
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class LastWorkInformationBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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
     * Missing values get a red dot and a `missing` attribute; known values are set as HTML.
     */
    _displayWorkInformations (workinformations, config) {
      $(this._content).find('.pulse-cellbar-first').remove();

      for (let i = 0; i < workinformations.length; i++) {
        let div = $('<div></div>').addClass('pulse-cellbar-first')
          .addClass('pulse-cellbar-current-data')
          .attr('kind', workinformations[i].Kind);

        pulseSvg.createMissingdata(div);

        div.click(
          function (e) {
            this.clickOnCurrent(e);
          }.bind(this)
        );

        if (!pulseUtility.isNotDefined(workinformations[i].Value)) {
          div.html(workinformations[i].Value);
        }
        else {
          div.attr('missing', workinformations[i].Kind);
          div.addClass('pulse-cellbar-cell-missing')
            .html(workinformations[i].Kind);
        }
        div.insertBefore(this._between);
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
          $(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove();
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
      $(this.element).empty();

      // Create DOM
      this._between = $('<div></div>').addClass('pulse-cellbar-between');
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main').append(this._between);
      $(this.element).append(this._content);

      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      this.addClass('pulse-lastbar');

      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      $(this.element).empty();

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
      $(this._messageSpan).html(message);

      eventBus.EventBus.dispatchToContext('workinformationStatusChange',
        this.element.getAttribute('status-context'),
        { status: null });
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      return 'GetLastWorkInformationV3/' + this.element.getAttribute('machine-id');
    }

    /**
     * Builds current work info cells and the "Past Data" cell.
     * Dispatches `workinformationStatusChange` with missing status boolean.
     */
    refresh (data) {
      let status = false;
      if (data.SlotMissing) {
        let div = $('<div></div>').addClass('workinformation-slotmissing')
          .append(this._noOperationDisplay);
        $('<div></div>').addClass('pulse-cellbar-first')
          .append(div)
          .insertBefore(this._between);
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

      let pastdiv = $('<div></div>').addClass('pulse-cellbar-last')
        .addClass('pulse-cellbar-past-data')
        .append($('<span>'
          + this.getTranslation('pastdata', 'Past Data')
          + '</span>'));

      let tooltip = this.getTranslation('pastTooltip', '');
      if (tooltip != '') {
        pulseUtility.addToolTip(pastdiv, tooltip);
      }
      pulseSvg.createMissingdata(pastdiv);

      pastdiv.click(
        function (e) {
          this.clickOnPast(e);
        }.bind(this)
      );
      if (data.DataMissing == true) {
        $(pastdiv).addClass('pulse-cellbar-cell-missing');
        status = true;
      }
      pastdiv.insertAfter(this._between);

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
      $(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove();

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

    clickOnCurrent (e) {
      return; // Do nothing
    }

    clickOnPast (e) {
      pulseDetailsPopup.openChangeWorkInfoDialog(this, this._dateRange);
    }

  }

  pulseComponent.registerElement('x-lastworkinformationbar', LastWorkInformationBarComponent, ['machine-id', 'machine-context', 'status-context', 'period-context']);
})();
