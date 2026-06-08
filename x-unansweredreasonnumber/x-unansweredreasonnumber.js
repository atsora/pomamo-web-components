// Copyright (C) 2023-2026 Atsora Solutions
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
   * `<x-unansweredreasonnumber>` — single cell showing the count of
   * unanswered stop periods for one machine over a date range.
   *
   * Polls `ReasonUnanswered?MachineId=<id>&Number=True&Range=<range>[&Cache=No]`
   * and renders a past-data cell with "N STOP(s) to be classified" (with
   * `pulse-cellbar-cell-missing` and a question-mark) when unanswered
   * periods exist, or "Past motion status details" otherwise. Clicking
   * the cell opens the reason history dialog via `pulseDetailsPopup`.
   * Pending revisions of `kind: 'reason'` on the current machine trigger
   * a reload once `pendingModifications === 0`. Waits for an initial
   * `dateTimeRangeChangeEvent` on `period-context` before the first
   * request; reacts to `machineIdChangeSignal` on `machine-context` and
   * dispatches `reasonStatusChange` on `status-context`.
   *
   * @element x-unansweredreasonnumber
   * @attr {number} machine-id      (required) machine id
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string} status-context  event-bus context for `reasonStatusChange`
   * @fires reasonStatusChange      `{ status: boolean }` — on `status-context`
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
            let modifMgr = document.body.querySelector('x-modificationmanager');
            if (modifMgr) {
              this._mapOfModifications = modifMgr.getModifications('reason',
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
      this.element.replaceChildren();

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
      let modifMgr = document.body.querySelector('x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      // Create modifications listener
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // Create DOM
      // Reason

      // Past reason
      let pastreasonlabel = document.createElement('span');
      pastreasonlabel.textContent = this.getTranslation('pastReasonData', 'Past motion status details');

      let interrogationPastMark = document.createElement('i');
      interrogationPastMark.setAttribute('class', 'fa-solid fa-circle-question');
      interrogationPastMark.setAttribute('id', 'questionmarkpastcell');
      let divpastreason = document.createElement('div');
      divpastreason.className = 'pulse-cellbar-last pulse-cellbar-past-data';
      divpastreason.appendChild(interrogationPastMark);
      divpastreason.appendChild(pastreasonlabel);

      pulseUtility.addToolTip(divpastreason,
        this.getTranslation('pastTooltip', 'Look or change past reason details'));

      // Red dot = missing data
      pulseSvg.createMissingdata(divpastreason);

      // Main
      this._content = document.createElement('div');
      this._content.className = 'pulse-cellbar-main';
      this._content.appendChild(divpastreason);

      this.element.appendChild(this._content);

      divpastreason.addEventListener('click', (e) => {
        this.clickOnPast(e);
      });

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset() { // Code here to clean the component, for example after a parameter change
      this.removeError();
      // Clean content
      let pastDataCell = this.element.querySelector('.pulse-cellbar-past-data');
      if (pastDataCell) {
        pastDataCell.classList.remove('pulse-cellbar-cell-missing');
      }

      this.switchToNextContext();
    }

    /**
     * Populate `_range` from the optional `range=` attribute, when set.
     * Lets a demo (or any standalone usage) wire a fixed range without going
     * through `period-context` + dateTimeRangeChangeEvent.
     */
    _setRangeFromAttribute() {
      if (this._range || !this.element.hasAttribute('range')) return;
      let attr = this.element.getAttribute('range');
      let range = pulseRange.createDateRangeFromString(attr);
      if (range && !range.isEmpty()) {
        this._range = range;
      }
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
      this._setRangeFromAttribute();
      if (!this._range) {
        return; // Wait for dateTimeRangeChangeEvent — onDateTimeRangeChange will call start()
      }

      this.switchToNextContext();
    }

    displayError(message) {
      if (this._messageSpan) {
        this._messageSpan.innerHTML = message;
      }

      this._requiredReason = null;
      eventBus.EventBus.dispatchToContext('reasonStatusChange',
        this.element.getAttribute('status-context'),
        { status: false })
    }

    removeError() {
      if (this._messageSpan) {
        this._messageSpan.innerHTML = '';
      }
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
      let pastDataCell = this.element.querySelector('.pulse-cellbar-past-data');
      let questionMark = this.element.querySelector('#questionmarkpastcell');
      let pastDataSpan = pastDataCell ? pastDataCell.querySelector('span') : null;

      if (data.IsUnansweredPeriod == true) {
        if (pastDataCell) {
          pastDataCell.classList.add('pulse-cellbar-cell-missing');
        }
        if (questionMark) {
          questionMark.style.display = '';
        }
        let stopNumber = "";
        if (data.IsUnansweredPeriod) {
          stopNumber = data.UnansweredPeriodsNumber.toString();
        }
        if (pastDataSpan) {
          if (data.UnansweredPeriodsNumber <= 1) {
            pastDataSpan.textContent = stopNumber + " " + this.getTranslation('dataToClassified', 'STOP to be classified');
          }
          else {
            pastDataSpan.textContent = stopNumber + " " + this.getTranslation('dataToClassifiedPlural', 'STOPS to be classified');
          }
        }
        status = true;
      }
      else {
        if (pastDataCell) {
          pastDataCell.classList.remove('pulse-cellbar-cell-missing');
        }
        if (questionMark) {
          questionMark.style.display = 'none';
        }
        if (pastDataSpan) {
          pastDataSpan.textContent = this.getTranslation('pastReasonData', 'Past motion status details');
        }
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

  pulseComponent.registerElement('x-unansweredreasonnumber', UnansweredReasonNumberComponent, ['machine-id', 'range', 'period-context', 'machine-context', 'status-context']);
})();
