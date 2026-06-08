// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedreasonat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseDetailsPopup
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var pulseConfig = require('pulseConfig');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

require('x-reasonsubdetails/x-reasonsubdetails');

(function () {

  /**
   * `<x-detailedreasonat>` — detail panel showing the reason slot and overlapping
   * machine modes at a given point in time for one machine.
   *
   * Fetches `ReasonOnlySlots?MachineId=<id>&Range=<single-point-range>` (with
   * `&SelectableOption=…&Cache=No`, optional `&ExtendLimitRange=`) on each
   * `machine-id` / `when` change and renders the reason (color, display,
   * details, optional auto-reason count, optional "Change" button opening
   * `pulseDetailsPopup.openChangeReasonDialog`) plus the matching machine
   * modes. Inserts `x-reasonsubdetails` on click of the auto-reason count and
   * `x-revisionprogress` while pending modifications are running. Reacts to
   * `dateTimeChangeEvent` on `datetime-context` (updates `when`),
   * `dateTimeRangeChangeEvent` on `period-context` (updates the extend-limit
   * range), `machineIdChangeSignal` on `machine-context` (updates `machine-id`),
   * and `modificationEvent` (refreshes when a `reason` modification on the same
   * machine overlaps `when`).
   *
   * @element x-detailedreasonat
   * @attr {number} machine-id       (required) machine id
   * @attr {string} when             (required) ISO datetime
   * @attr {string} range            ISO datetime range `begin;end` used as extend-limit
   * @attr {string} datetime-context event-bus context for `dateTimeChangeEvent`
   * @attr {string} period-context   event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class DetailedReasonAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._dateRange = undefined;

      // DOM - not filled here
      self._divReason = undefined;
      self._divReasonDisplay = undefined;
      self._reasonContent = undefined;
      self._divMode = undefined;
      self._modeContent = undefined;
      self._content = undefined;

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    get content () { return this._content; } // Optional

    _cleanDisplay () {
      this._reasonContent.replaceChildren();
      this._modeContent.replaceChildren();
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            // For progress : update _mapOfModifications
            let modifMgr = document.querySelector('body x-modificationmanager');
            if (modifMgr) {
              this._mapOfModifications = modifMgr.getModifications('reason',
                this.element.getAttribute('machine-id'));

              // + REMOVE others with old machineid ? + create progress ? -> TODO later !
            }

            this._cleanDisplay();
            this.start(); // requires to restart the component.
          } break;
        case 'when':
          this._cleanDisplay();
          this.start(); // requires to restart the component.
          break;
        case 'datetime-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeChangeEvent',
              newVal,
              this.onDateTimeChange.bind(this));
          }
          break;
        case 'period-context': // range is first given in attribute to go faster
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));

            // + NO dispatch
            //eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            //this.element.getAttribute('period-context'));
          }
          this.start(); // To re-validate parameters
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
      if (this.element.hasAttribute('range')) {
        this._dateRange = pulseRange.createDateRangeFromString(
          this.element.getAttribute('range'));
      }

      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this, 'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }

      if (this._dateRange == undefined) {
        if (this.element.hasAttribute('period-context')) {
          // + dispatch
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
      }

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

      // Get modifications and create listener
      let modifMgr = document.querySelector('body x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      // Create modifications listener
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'detailed-main';
      this.element.appendChild(this._content);

      { // Reasons
        let title = this.getTranslation('detailsViewSubTitles.reason', 'motion status');
        let spanTitle = document.createElement('span');
        spanTitle.className = 'detailedreasonat-title-span';
        spanTitle.innerHTML = title;
        let divTitle = document.createElement('div');
        divTitle.className = 'detailed-title';
        divTitle.appendChild(spanTitle);
        this._reasonContent = document.createElement('div');
        this._reasonContent.className = 'detailed-content';
        this._divReason = document.createElement('div');
        this._divReason.className = 'detailedreasonat';
        this._divReason.appendChild(divTitle);
        this._divReason.appendChild(this._reasonContent);
        this._content.appendChild(this._divReason);

        // Create DOM - Loader
        let loader = document.createElement('div');
        loader.className = 'pulse-loader';
        loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
        loader.style.display = 'none';
        let loaderDiv = document.createElement('div');
        loaderDiv.className = 'pulse-loader-div';
        loaderDiv.appendChild(loader);
        this._divReason.appendChild(loaderDiv);

        // Create DOM - message for error - no need to store, can be removed
        let messageSpan = document.createElement('span');
        messageSpan.className = 'pulse-message';
        messageSpan.innerHTML = '';
        let messageDiv = document.createElement('div');
        messageDiv.className = 'pulse-message-div';
        messageDiv.appendChild(messageSpan);
        this._reasonContent.appendChild(messageDiv);
      }
      { // Machine Mode
        let title = this.getTranslation('detailsViewSubTitles.machinemode', 'machine mode');
        let spanTitle = document.createElement('span');
        spanTitle.className = 'detailedmodeat-title-span';
        spanTitle.innerHTML = title;
        let divTitle = document.createElement('div');
        divTitle.className = 'detailed-title';
        divTitle.appendChild(spanTitle);
        this._modeContent = document.createElement('div');
        this._modeContent.className = 'detailed-content';
        this._divMode = document.createElement('div');
        this._divMode.className = 'detailedmodeat';
        this._divMode.appendChild(divTitle);
        this._divMode.appendChild(this._modeContent);
        this._content.appendChild(this._divMode);

        // Create DOM - Loader below
        let loader = document.createElement('div');
        loader.className = 'pulse-loader';
        loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
        loader.style.display = 'none';
        this._divMode.appendChild(loader);
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      this._dateRange = undefined;

      // DOM
      this.element.replaceChildren();

      this._divReason = undefined;
      this._reasonContent = undefined;
      this._divMode = undefined;
      this._modeContent = undefined;
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
        return;
      }

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in detailedreasonat.element');
        // Delayed display :
        this.setError(this.getTranslation('error.missingWhen', 'Missing when'));
        return;
      }

      if (!this.element.hasAttribute('range')) {
        console.error('missing range in detailedreasonat.element');
        // Delayed display :
        this.setError(this.getTranslation('error.missingRange', 'Missing range'));

        if (this._dateRange == undefined) {
          if (this.element.hasAttribute('period-context')) {
            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              this.element.getAttribute('period-context'));
          }
          else {
            eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
          }
        }

        //return;
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
        this._reasonContent.appendChild(messageDiv);
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
      let url = 'ReasonOnlySlots?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Range=' + pulseUtility.createSingleRangeForWebService(this.element.getAttribute('when'))
        + '&NoPeriodExtension=false'; // range = ONE datetime

      if ('false' == this.getConfigOrAttribute('detailedreasonat.hideChangeReasonButton', 'false')) {
        url += '&SelectableOption=true'  // to display "Change" or not when needed
      }
      else {
        url += '&SelectableOption=false'  // do not display "Change"
      }
      url += '&Cache=No'; // To allow refresh

      if (this._dateRange != undefined) {
        url += '&ExtendLimitRange='
          + pulseUtility.convertDateRangeForWebService(this._dateRange);
      }

      return url;
    }

    refresh (data) {
      let contents = this.element.querySelectorAll('.detailed-content');
      contents.forEach(c => c.replaceChildren());

      if (0 < data.ReasonOnlySlots.length) {
        let divRange = document.createElement('div');
        divRange.className = 'detailed-range';
        this._divReasonDisplay = document.createElement('div');
        this._divReasonDisplay.className = 'detailed-data';
        // RANGE
        //??? = data.ReasonOnlySlots[0].Range; // Not useful
        this._singleReasonRange = pulseRange.createDateRangeFromString(data.ReasonOnlySlots[0].Range);
        let rangeDisplay = pulseUtility.displayDateRange(this._singleReasonRange, true);
        let spanRange = document.createElement('span');
        spanRange.className = 'detailedreasonat-range-span';
        spanRange.innerHTML = rangeDisplay;
        divRange.appendChild(spanRange);

        // reason (...)
        let reasonDisplay = data.ReasonOnlySlots[0].Display;
        if ((typeof (data.ReasonOnlySlots[0].Details) != 'undefined') &&
          (data.ReasonOnlySlots[0].Details != '')) {
          reasonDisplay += ' (' + data.ReasonOnlySlots[0].Details + ')';
        }

        if (pulseConfig.getBool('detailedreasonat.showReasonScore', false)) {
          let score = data.ReasonOnlySlots[0].Score;
          reasonDisplay = '(Score:' + score + ') ' + reasonDisplay;
        }

        let spanReason = document.createElement('span');
        spanReason.className = 'detailedreasonat-reason';
        spanReason.innerHTML = reasonDisplay;
        this._divReasonDisplay.appendChild(spanReason);

        if ((reasonDisplay != 'Motion')
          || ('true' == this.getConfigOrAttribute('showAutoReasonsWhenMotion'))) {
          // Add '+2' button = before text display -> float right
          if (!pulseUtility.isNotDefined(data.ReasonOnlySlots[0].AutoReasonNumber)) {

            let number = Number(data.ReasonOnlySlots[0].AutoReasonNumber);
            let moreReasonText = '+';
            if (false == data.ReasonOnlySlots[0].Source.UnsafeAutoReasonNumber) { // display '+' or '+2'
              if (data.ReasonOnlySlots[0].Source.Auto == true
                && data.ReasonOnlySlots[0].Source.Manual == false) {
                number = number - 1;
                moreReasonText += number.toString();
              }
            }
            if (number >= 1) {
              let moreReasonTextSpan = document.createElement('span');
              moreReasonTextSpan.innerHTML = moreReasonText;
              moreReasonTextSpan.title = this.getTranslation('seeAllReasons', 'Click to see all reasons');
              let moreReasonTextButton = document.createElement('div');
              moreReasonTextButton.classList.add('detailed-more-auto-reason');
              moreReasonTextButton.appendChild(moreReasonTextSpan);

              // Sub details for reason (in popup)
              moreReasonTextButton.addEventListener('click', function (evt) {
                let reasonsubdetails = pulseUtility.createElementWithAttribute('x-reasonsubdetails', {
                  'machine-id': this.element.getAttribute('machine-id'),
                  'when': this.element.getAttribute('when'),
                  'clientX': evt.clientX,
                  'clientY': evt.clientY
                });
                this.element.appendChild(reasonsubdetails);
              }.bind(this));

              this._divReasonDisplay.appendChild(moreReasonTextButton);
            }
          }
        }

        // Button "Change"
        if ((data.ReasonOnlySlots[0].IsSelectable) &&
          ('false' == this.getConfigOrAttribute('detailedreasonat.hideChangeReasonButton', 'false'))) {
          // Add button = before text display -> float right
          let changeText = this.getTranslation('changebutton', 'Change');
          let changeButton = document.createElement('a');
          changeButton.classList.add('detailed-button');
          changeButton.innerHTML = changeText;
          //let saveTitle = this.getTranslation('savereason.saveReasonTitle', 'Set reason');
          let self = this;
          changeButton.addEventListener('click', function (e) {
            // Hide Popup
            document.querySelectorAll('.popup-block').forEach(el => pulseUtility.fadeOut(el)); // Never called. But to keep in case of display in popup
            // Open Save Dlg - displayMode="force-all" to show all slots for context
            pulseDetailsPopup.openChangeReasonDialog(self, self._singleReasonRange, //self._dateRange,
              true, undefined, 'force-all');
          });
          this._divReasonDisplay.appendChild(changeButton);
        }

        // Append
        this._reasonContent.appendChild(divRange);
        this._reasonContent.appendChild(this._divReasonDisplay);

        // MODES
        this._modeContent.replaceChildren();
        this._divMode.style.display = 'none';
        let isoWhen = this.element.getAttribute('when');
        let rangeWhen = pulseRange.createDateRangeDefaultInclusivity(isoWhen, isoWhen);
        for (let iMode = 0; iMode < data.ReasonOnlySlots[0].MachineModes.length; iMode++) {
          let isoRangeMode = data.ReasonOnlySlots[0].MachineModes[iMode].Range;
          let rangeMode = pulseRange.createDateRangeFromString(isoRangeMode);
          if (pulseRange.overlaps(rangeMode, rangeWhen)) {
            this._divMode.style.display = '';
            let divRangeMode = document.createElement('div');
            divRangeMode.classList.add('detailed-range');
            let divMode = document.createElement('div');
            divMode.classList.add('detailed-data');
            // RANGE
            this._rangeMode = isoRangeMode;
            let tmpRange = pulseRange.createDateRangeFromString(isoRangeMode);
            let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
            let spanRange = document.createElement('span');
            spanRange.classList.add('detailedmodeat-range-span');
            spanRange.innerHTML = rangeDisplay;
            divRangeMode.appendChild(spanRange);

            // Mode
            let modeDisplay = data.ReasonOnlySlots[0].MachineModes[iMode].Display;
            let spanMode = document.createElement('span');
            spanMode.classList.add('detailedmodeat-modes');
            spanMode.innerHTML = modeDisplay;
            divMode.appendChild(spanMode);

            // Append
            this._modeContent.appendChild(divRangeMode);
            this._modeContent.appendChild(divMode);
          }
        }
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
      if (event.target.kind != 'reason') {
        return;
      }
      if (event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }

      // First time ?
      let isNew = true;
      if (this._mapOfModifications.has(modif.revisionid))
        isNew = false;
      this._mapOfModifications.set(modif.revisionid, modif);

      let isoWhen = this.element.getAttribute('when');
      let rangeWhen = pulseRange.createDateRangeDefaultInclusivity(isoWhen, isoWhen);

      if (isNew) {
        // First time -> create progress bar
        // Do not work for the moment 2020-02 because details is created after change
        for (let i = 0; i < modif.ranges.length; i++) {
          if (pulseRange.overlaps(modif.ranges[i], rangeWhen)) {
            // includes 'WHEN' -> show progress
            let newRevisionProgress =
              pulseUtility.createElementWithAttribute('x-revisionprogress', {
                'revision-id': modif.revisionid,
                'machine-id': event.target.machineid,
                'kind': modif.kind,
                'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[i])
              });
            this._divReasonDisplay.appendChild(newRevisionProgress);
          }
        }
      }
      if (event.target.pendingModifications == 0) {
        // Last time -> reload
        this._mapOfModifications.delete(modif.revisionid);

        for (let i = 0; i < modif.ranges.length; i++) {
          if (pulseRange.overlaps(modif.ranges[i], rangeWhen)) {
            this.switchToContext('Reload');
            return;
          }
        }
      }
      // else = do nothing (progress en cours)
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event
     */
    onReload (event) {
      this._cleanDisplay();

      this.switchToContext('Reload');
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    // Callback events
    onDateTimeChange (event) {
      this.element.setAttribute('when', event.target.when);
    }

    /**
     * Event bus callback triggered when the date/time range changes -> usefull for ExtendLimitRange=???
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if ((this._dateRange == undefined) ||
        (!pulseRange.equals(newRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._dateRange = newRange; // event.target.range?? one day;
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-detailedreasonat', DetailedReasonAtComponent, ['machine-id', 'range', 'when', 'datetime-context', 'period-context', 'machine-context']);
})();
