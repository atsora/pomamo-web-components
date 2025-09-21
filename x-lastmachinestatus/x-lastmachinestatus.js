// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastmachinestatus
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


(function () {

  class LastMachineStatusComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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

      self._dateRange = undefined;
      self._beginDate = undefined;

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    // Accessors
    //get reasonText () { return this._reasonText; }
    //get reasonColor () { return this._reasonColor; }
    //get reasonBegin () { return this._lastReasonBegin; }
    //get reasonOverwriteRequired () { return this._reasonOverwriteRequired; }
    //get requiredReason () { return this._requiredReason; }

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

    initialize () {
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
      let reasonlabel = $('<span></span>').addClass('lastmachinestatus-reason-label');
      reasonlabel.html(this.getTranslation('currentReasonColon', 'Current reason:'));
      // display reason OR error message :
      let spanreasondata = $('<span></span>').addClass('lastmachinestatus-reason-data');
      this._currentCell = $('<div></div>').addClass('pulse-cellbar-first')
        .addClass('pulse-cellbar-current-data')
        .addClass('clickable') // To change display when hover
        // + class error if needed
        .append(reasonlabel).append(spanreasondata);
      pulseUtility.addToolTip(this._currentCell,
        this.getTranslation('currentTooltip', 'Change current motion status'));
        
      // Red dot = missing data
      pulseSvg.createMissingdata(this._currentCell);

      // Past reason
      let pastreasonlabel = $('<span></span>');
      pastreasonlabel.append(this.getTranslation('pastReasonData', 'Past reason details'));
      let divpastreason = $('<div></div>').addClass('pulse-cellbar-last')
        .addClass('pulse-cellbar-past-data')
        .append(pastreasonlabel);
      pulseUtility.addToolTip(divpastreason,
        this.getTranslation('pastTooltip', 'Look or change past reason details'));

      // Red dot = missing data
      pulseSvg.createMissingdata(divpastreason);

      // Main
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main')
        .append(this._currentCell)
        .append(divpastreason);

      $(this.element).append(this._content);

      // Clicks
      this._currentCell.click(
        function (e) {
          this.clickOnCurrent(e);
        }.bind(this)
      );
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
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('Loading', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Code here to clean the component, for example after a parameter change
      this.removeError();
      // Clean content
      $(this.element).find('.pulse-cellbar-past-data')
        .removeClass('pulse-cellbar-cell-missing');
      $(this.element).find('.lastmachinestatus-reason-data').html('');

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);

      this._requiredReason = null;
      this._reasonText = null;
      this._reasonColor = null;
      this._lastReasonBegin = null;
      this._reasonOverwriteRequired = null;
      eventBus.EventBus.dispatchToContext('reasonStatusChange',
        this.element.getAttribute('status-context'),
        { status: false })
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      return 1000 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)));
    }

    getShortUrl () {
      let url = 'GetLastMachineStatusV2?Id=' + this.element.getAttribute('machine-id');
      if (!pulseUtility.isNotDefined(this._beginDate)) {
        url += '&Begin=' + this._beginDate;
      }
      if (this._forceReload) {
        url += '&Cache=No';
        this._forceReload = false;
      }
      return url;
    }

    refresh (data) {
      this._reasonText = data.MachineStatus.ReasonSlot.Reason.Text;
      this._reasonColor = data.MachineStatus.ReasonSlot.Reason.Color;
      this._lastReasonBegin = data.MachineStatus.ReasonSlot.Begin;
      this._reasonOverwriteRequired = data.MachineStatus.ReasonSlot.OverwriteRequired;
      this._reasonTooOld = data.ReasonTooOld;

      let status = false;

      $(this.element).find('.pulse-cellbar-current-data')
        .removeClass('pulse-cellbar-cell-missing');

      $(this.element).find('.lastmachinestatus-reason-data')
        .removeClass('lastmachinestatus-reasontooold');

      if (data.ReasonTooOld == true) {
        $(this.element).find('.lastmachinestatus-reason-data').addClass('lastmachinestatus-reasontooold');
        $(this.element).find('.lastmachinestatus-reason-data').html(this.getTranslation('tooOld', 'Reason is too old'));
      }
      else {
        if (data.MachineStatus.ReasonSlot.OverwriteRequired == true) {
          $(this.element).find('.pulse-cellbar-current-data').addClass('pulse-cellbar-cell-missing');
          status = true;
        }
        $(this.element).find('.lastmachinestatus-reason-data').html(this._reasonText);
      }

      //Set state of "past data" part in widget
      this._requiredReason = data.RequiredReason;
      if (data.RequiredReason == true) {
        $(this.element).find('.pulse-cellbar-past-data')
          .addClass('pulse-cellbar-cell-missing');
        status = true;
      }
      else {
        $(this.element).find('.pulse-cellbar-past-data')
          .removeClass('pulse-cellbar-cell-missing');
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

      let now = new Date();
      if (isNew) {
        // First time -> create progress bar
        for (let i = 0; i < modif.ranges.length; i++) {
          if ((modif.ranges[i].lower < now)
            && (modif.ranges[i].upper == null || modif.ranges[i].upper > now)) { // == is Current

            let newRevisionProgress =
              pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
                'revision-id': modif.revisionid,
                'machine-id': event.target.machineid,
                'kind': modif.kind,
                'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[i])
              });
            this._currentCell.append(newRevisionProgress);
          }
        }
      }
      else if (event.target.pendingModifications == 0) {
        // Last time -> reload
        this._mapOfModifications.delete(modif.revisionid);

        for (let i = 0; i < modif.ranges.length; i++) {
          if ((modif.ranges[i].lower < now)
            && (modif.ranges[i].upper == null || modif.ranges[i].upper > now)) {
            this._forceReload = true;
            this.switchToContext('Reload');
            return;
          }
        }
      }
      // else = do nothing (progress en cours)
    }

    /**
     * Event bus callback triggered when needed reload
     *
     * @param {Object} event
     */
    /*onReload (event) {
      this._forceReload = true;
      this.switchToContext('Reload');
    }*/
    /**
     * Event bus callback triggered when machineid changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if ((this._dateRange == undefined) ||
        (!pulseRange.equals(newRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._dateRange = newRange;
        this._beginDate = event.target.begin;
        this.start();
      }
    }

    /**
     * DOM event callback triggered on a click on current data
     *
     * @param {event} e - DOM event
     */
    clickOnCurrent (e) {
      let applicableRange =
        pulseRange.createDateRangeDefaultInclusivity(
          this._lastReasonBegin, this._dateRange.upper);
      // no end == current = KO -> _dateRange.upper
      pulseDetailsPopup.openChangeReasonDialog(this, applicableRange, true);
    }

    /**
     * DOM event callback triggered on a click on past data
     *
     * @param {event} e - DOM event
     */
    clickOnPast (e) {
      pulseDetailsPopup.openChangeReasonDialog(this, this._dateRange, false);
    }
  }

  pulseComponent.registerElement('x-lastmachinestatus', LastMachineStatusComponent, ['machine-id', 'period-context', 'machine-context', 'status-context']);
})();
