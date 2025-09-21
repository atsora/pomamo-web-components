// Copyright (C) 2009-2023 Lemoine Automation Technologies
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
      $(this._reasonContent).empty();
      $(this._modeContent).empty();
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
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
      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      // Create modifications listener
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>')
        .addClass('detailed-main');
      $(this.element).append(this._content);

      { // Reasons
        let title = this.getTranslation('detailsViewSubTitles.reason', 'motion status');
        let spanTitle = $('<span></span>').addClass('detailedreasonat-title-span')
          .html(title);
        let divTitle = $('<div></div>').addClass('detailed-title').append(spanTitle);
        this._reasonContent = $('<div></div>').addClass('detailed-content');
        this._divReason = $('<div></div>').addClass('detailedreasonat')
          .append(divTitle).append(this._reasonContent);
        $(this._content).append(this._divReason);

        // Create DOM - Loader
        let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
        let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
        $(this._divReason).append(loaderDiv);

        // Create DOM - message for error - no need to store, can be removed
        let messageSpan = $('<span></span>')
          .addClass('pulse-message').html('');
        let messageDiv = $('<div></div>')
          .addClass('pulse-message-div')
          .append(messageSpan);
        $(this._reasonContent).append(messageDiv);
      }
      { // Machine Mode
        let title = this.getTranslation('detailsViewSubTitles.machinemode', 'machine mode');
        let spanTitle = $('<span></span>').addClass('detailedmodeat-title-span')
          .html(title);
        let divTitle = $('<div></div>').addClass('detailed-title').append(spanTitle);
        this._modeContent = $('<div></div>').addClass('detailed-content');
        this._divMode = $('<div></div>').addClass('detailedmodeat')
          .append(divTitle).append(this._modeContent);
        $(this._content).append(this._divMode);

        // Create DOM - Loader below
        let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
        $(this._divMode).append(loader);
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      this._dateRange = undefined;

      // DOM
      $(this.element).empty();

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
        this.setError('missing machine-id');
        return;
      }

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in detailedreasonat.element');
        // Delayed display :
        this.setError('missing when');
        return;
      }

      if (!this.element.hasAttribute('range')) {
        console.error('missing range in detailedreasonat.element');
        // Delayed display :
        this.setError('missing range');

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

      let messageSpan = $(this.element).find('.pulse-message');
      if (messageSpan.length == 0) {
        // Create DOM - message for error
        messageSpan = $('<span></span>')
          .addClass('pulse-message');
        let messageDiv = $('<div></div>')
          .addClass('pulse-message-div')
          .append(messageSpan);
        $(this._reasonContent).append(messageDiv);
      }
      $(messageSpan).html(message);
    }

    removeError () {
      $(this.element).find('.pulse-message').html('');
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
      $(this.element).find('.detailed-content').empty(); // = Both

      if (0 < data.ReasonOnlySlots.length) {
        let divRange = $('<div></div>').addClass('detailed-range');
        this._divReasonDisplay = $('<div></div>').addClass('detailed-data');
        // RANGE
        //??? = data.ReasonOnlySlots[0].Range; // Not useful
        this._singleReasonRange = pulseRange.createDateRangeFromString(data.ReasonOnlySlots[0].Range);
        let rangeDisplay = pulseUtility.displayDateRange(this._singleReasonRange, true);
        let spanRange = $('<span></span>').addClass('detailedreasonat-range-span')
          .html(rangeDisplay);
        $(divRange).append(spanRange);

        // reason (...)
        let reasonDisplay = data.ReasonOnlySlots[0].Display;
        if ((typeof (data.ReasonOnlySlots[0].Details) != 'undefined') &&
          (data.ReasonOnlySlots[0].Details != '')) {
          reasonDisplay += ' (' + data.ReasonOnlySlots[0].Details + ')';
        }

        let role = pulseConfig.getAppContextOrRole();
        if (role == 'dev') {
          let score = data.ReasonOnlySlots[0].Score;
          // Show score for DEV only
          reasonDisplay = '(Score:' + score + ') ' + reasonDisplay;
        }

        let spanReason = $('<span></span>').addClass('detailedreasonat-reason')
          .html(reasonDisplay);
        $(this._divReasonDisplay).append(spanReason);

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
              let moreReasonTextSpan = $('<span></span>').html(moreReasonText);
              moreReasonTextSpan.attr('title', this.getTranslation('seeAllReasons', 'Click to see all reasons'));
              let moreReasonTextButton = $('<div></div>').addClass('detailed-more-auto-reason')
                .append(moreReasonTextSpan);

              // Sub details for reason (in popup)
              $(moreReasonTextButton).click(function (evt) {
                let reasonsubdetails = pulseUtility.createjQueryElementWithAttribute('x-reasonsubdetails', {
                  'machine-id': this.element.getAttribute('machine-id'),
                  'when': this.element.getAttribute('when'),
                  'clientX': evt.clientX,
                  'clientY': evt.clientY
                });
                $(this.element).append(reasonsubdetails);
              }.bind(this));

              $(this._divReasonDisplay).append(moreReasonTextButton);
            }
          }
        }

        // Button "Change"
        if ((data.ReasonOnlySlots[0].IsSelectable) &&
          ('false' == this.getConfigOrAttribute('detailedreasonat.hideChangeReasonButton', 'false'))) {
          // Add button = before text display -> float right
          let changeText = this.getTranslation('changebutton', 'Change');
          let changeButton = $('<a></a>').addClass('detailed-button')
            .html(changeText);
          //let saveTitle = this.getTranslation('savereason.saveReasonTitle', 'Set reason');
          let self = this;
          $(changeButton).click(function (e) {
            // Hide Popup
            $('.popup-block').fadeOut(); // Never called. But to keep in case of display in popup
            // Open Save Dlg
            pulseDetailsPopup.openChangeReasonDialog(self, self._singleReasonRange, //self._dateRange,
              true);
          });
          $(this._divReasonDisplay).append(changeButton);
        }
        
        // Append
        $(this._reasonContent)
          .append(divRange).append(this._divReasonDisplay);

        // MODES
        $(this._modeContent).empty();
        $(this._divMode).hide();
        let isoWhen = this.element.getAttribute('when');
        let rangeWhen = pulseRange.createDateRangeDefaultInclusivity(isoWhen, isoWhen);
        for (let iMode = 0; iMode < data.ReasonOnlySlots[0].MachineModes.length; iMode++) {
          let isoRangeMode = data.ReasonOnlySlots[0].MachineModes[iMode].Range;
          let rangeMode = pulseRange.createDateRangeFromString(isoRangeMode);
          if (pulseRange.overlaps(rangeMode, rangeWhen)) {
            $(this._divMode).show();
            let divRangeMode = $('<div></div>').addClass('detailed-range');
            let divMode = $('<div></div>').addClass('detailed-data');
            // RANGE
            this._rangeMode = isoRangeMode;
            let tmpRange = pulseRange.createDateRangeFromString(isoRangeMode);
            let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
            let spanRange = $('<span></span>').addClass('detailedmodeat-range-span')
              .html(rangeDisplay);
            $(divRangeMode).append(spanRange);

            // Mode
            let modeDisplay = data.ReasonOnlySlots[0].MachineModes[iMode].Display;
            let spanMode = $('<span></span>').addClass('detailedmodeat-modes')
              .html(modeDisplay);
            $(divMode).append(spanMode);

            // Append
            $(this._modeContent)
              .append(divRangeMode).append(divMode);
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
              pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
                'revision-id': modif.revisionid,
                'machine-id': event.target.machineid,
                'kind': modif.kind,
                'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[i])
              });
            this._divReasonDisplay.append(newRevisionProgress);
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

  pulseComponent.registerElement('x-detailedreasonat', DetailedReasonAtComponent, ['machine-id', 'when', 'datetime-context', 'period-context', 'machine-context']);
})();
