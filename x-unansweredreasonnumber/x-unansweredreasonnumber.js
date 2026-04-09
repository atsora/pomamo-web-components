// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-unansweredreasonnumber
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:pulseComponent
 * @requires module:pulsecomponent-detailspopup
 */

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseComponent = require('pulsecomponent');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var eventBus = require('eventBus');
var pulseSvg = require('pulseSvg');

require('x-datetimerange/x-datetimerange');
require('x-savereason/x-savereason');
require('x-reasonslotlist/x-reasonslotlist');
require('x-revisionprogress/x-revisionprogress');
require('x-stopclassification/x-stopclassification');

(function () {

  /**
   * `<x-unansweredreasonnumber>` — bar-style display of the count of unanswered stop periods.
   *
   * Polls `ReasonUnanswered?MachineId=<id>&Number=True&Range=<range>[&Cache=No]`.
   * Renders a single past-data cell showing "N STOP(s) to be classified" when unanswered periods exist,
   * or "Past motion status details" when all stops are classified.
   * Clicking the cell opens a reason history dialog via `pulseDetailsPopup`.
   *
   * Integrates with `x-modificationmanager` for pending reason modifications.
   * Waits for a `dateTimeRangeChangeEvent` before its first request (`_range` must be set).
   *
   * Attributes:
   *   machine-id      - (required) integer machine id
   *   period-context  - (optional) event bus context for `dateTimeRangeChangeEvent`
   *   machine-context - (optional) event bus context for machine selection changes
   *   status-context  - (optional) event bus context to dispatch `reasonStatusChange`
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class UnansweredReasonNumberComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._messageSpan = undefined;
      self._content = undefined;

      self._range = undefined;

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    // Accessors
    //get requiredReason () { return this._requiredReason; }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            // For progress : update _mapOfModifications
            let modifMgr = $('body').find('x-modificationmanager');
            if (modifMgr.length == 1) {
              this._mapOfModifications = modifMgr[0].getModifications('reason',
                this.element.getAttribute('machine-id'));

              // + REMOVE others with old machineid ? + create progress ? -> TODO later !
            }

            this.start(); // calls reset -> paramvalid...
          }
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          this.start(); // To re-validate parameters
          break;
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal',
            newVal,
            this.onMachineIdChange.bind(this));
          break;
        case 'status-context': //'reasonStatusChange'
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('pulse-lastbar');

      // Update here some internal parameters

      // In case of clone, need to be empty :
      $(this.element).empty();

      // listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
        // + dispatch
        eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));

        eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
      }

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // Get modifications and create listener
      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      // Create modifications listener
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // Create DOM
      // Reason

      // Past reason
      let pastreasonlabel = $('<span></span>');
      pastreasonlabel.append(this.getTranslation('pastReasonData', 'Past motion status details'));

      let interrogationPastMark = document.createElement('i');
      interrogationPastMark.setAttribute('class', 'fa-solid fa-circle-question');
      interrogationPastMark.setAttribute('id', 'questionmarkpastcell');
      let divpastreason = $('<div></div>').addClass('pulse-cellbar-last')
        .addClass('pulse-cellbar-past-data')
        .append(interrogationPastMark)
        .append(pastreasonlabel);

      pulseUtility.addToolTip(divpastreason,
        this.getTranslation('pastTooltip', 'Look or change past reason details'));

      // Red dot = missing data
      pulseSvg.createMissingdata(divpastreason);

      // Main
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main')
        .append(divpastreason);

      $(this.element).append(this._content);

      divpastreason.click(
        function (e) {
          this.clickOnPast(e);
        }.bind(this)
      );

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset() { // Code here to clean the component, for example after a parameter change
      this.removeError();
      // Clean content
      $(this.element).find('.pulse-cellbar-past-data')
        .removeClass('pulse-cellbar-cell-missing');

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }
      if (!this._range) {
        return; // Wait for dateTimeRangeChangeEvent — onDateTimeRangeChange will call start()
      }

      this.switchToNextContext();
    }

    displayError(message) {
      $(this._messageSpan).html(message);

      this._requiredReason = null;
      eventBus.EventBus.dispatchToContext('reasonStatusChange',
        this.element.getAttribute('status-context'),
        { status: false })
    }

    removeError() {
      $(this._messageSpan).html('');
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate() {
      return 1000 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)));
    }

    /**
     * REST endpoint: `ReasonUnanswered?MachineId=<id>&Number=True&Range=<range>[&Cache=No]`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl() {
      let url = `ReasonUnanswered?MachineId=${this.element.getAttribute('machine-id')}&Number=True&Range=${pulseUtility.convertDateRangeForWebService(this._range)}`;
      if (this._forceReload) {
        url += '&Cache=No';
        this._forceReload = false;
      }
      return url;
    }

    /**
     * Updates the past-data cell: shows count of unanswered stop periods or "all classified" label.
     * Dispatches `reasonStatusChange` with missing status boolean to `status-context`.
     *
     * @param {{ IsUnansweredPeriod: boolean, UnansweredPeriodsNumber: number }} data
     */
    refresh(data) {
      let status = false;

      //Set state of "past data" part in widget
      this._requiredReason = data.IsUnansweredPeriod;
      if (data.IsUnansweredPeriod == true) {
        $(this.element).find('.pulse-cellbar-past-data')
          .addClass('pulse-cellbar-cell-missing')
        $(this.element).find('#questionmarkpastcell').show();
        let stopNumber = "";
        if (data.IsUnansweredPeriod) {
          stopNumber = data.UnansweredPeriodsNumber.toString();
        }
        if (data.UnansweredPeriodsNumber <= 1) {
          this.element.querySelector('.pulse-cellbar-past-data span').textContent = stopNumber + " " + this.getTranslation('dataToClassified', 'STOP to be classified');
        }
        else {
          this.element.querySelector('.pulse-cellbar-past-data span').textContent = stopNumber + " " + this.getTranslation('dataToClassifiedPlural', 'STOPS to be classified');
        }
        status = true;
      }
      else {
        $(this.element).find('.pulse-cellbar-past-data')
          .removeClass('pulse-cellbar-cell-missing')
        $(this.element).find('#questionmarkpastcell').hide();
        this.element.querySelector('.pulse-cellbar-past-data span').textContent = this.getTranslation('pastReasonData', 'Past motion status details');
      }
      eventBus.EventBus.dispatchToContext('reasonStatusChange',
        this.element.getAttribute('status-context'),
        { status: status });
    }

    // Callback events
    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revisionid, machineid, kind, range,
     * initModifications: undefined, // pending modifications the first time
     * pendingModifications: undefined // pending modifications 'now'
     */
    onModificationEvent(event) {
      let modif = event.target;
      if (event.target.kind != 'reason') {
        return;
      }
      if (event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }

      // TODO: reload more often ?

      if (event.target.pendingModifications == 0) {
        this.switchToContext('Reload');
      }
    }

    /**
     * Event bus callback triggered when machineid changes
     *
     * @param {Object} event
     */
    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange(event) {
      this._range = event.target.daterange;
      this.start();
    }

    /**
     * DOM event callback triggered on a click on past data
     *
     * @param {event} e - DOM event
     */
    clickOnPast(e) {
      pulseDetailsPopup.openChangeReasonDialog(this, this._range, false);
    }
  }

  pulseComponent.registerElement('x-unansweredreasonnumber', UnansweredReasonNumberComponent, ['machine-id', 'period-context', 'machine-context', 'status-context']);
})();
