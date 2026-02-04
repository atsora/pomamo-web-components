// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastserialnumber
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 * @requires module:pulseCustomDialog
 * @requires module:x-saveserialnumber
 * @requires module:x-cyclesinperiod
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseCustomDialog = require('pulseCustomDialog');
var eventBus = require('eventBus');

require('x-saveserialnumber/x-saveserialnumber');
require('x-cyclesinperiod/x-cyclesinperiod');
require('x-revisionprogress/x-revisionprogress');

/*
 *This tag is used to display current serial number of given machine. It can take following attribute:
 *  - machine-id : id of given machine
 *  - update : time slot between two update of web component
 */
(function () {

  class LastSerialNumberComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': {
          // For progress : update _mapOfModifications
          let modifMgr = $('body').find('x-modificationmanager');
          if (modifMgr.length == 1) {
            this._mapOfModifications = modifMgr[0].getModifications('serialnumber',
              this.element.getAttribute('machine-id'));

            // + REMOVE others with old machineid ? + create progress ? -> TODO later !
          }

          this.start(); // calls reset -> paramvalid...
        } break;
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this,
            'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal',
            newVal,
            this.onMachineIdChange.bind(this));
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-lastbar');

      // Update here some internal parameters

      // listeners/dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // Get modifications and create listener
      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('serialnumber',
          this.element.getAttribute('machine-id'));
      }
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      // current
      this._currentText = $('<span></span>').addClass('lastserialnumber-serialnumber-data');
      this._current = $('<div></div>')
        .addClass('pulse-cellbar-first')
        .addClass('pulse-cellbar-current-data')
        .addClass('clickable') // To change display when hover
        .append($('<span>'
          + this.getTranslation('currentserialnumber', 'Serial Number:')
          + '</span > ')).append(this._currentText);
      // past
      this._pastdata = $('<div></div>')
        .addClass('pulse-cellbar-last')
        .addClass('pulse-cellbar-past-data')
        .append($('<span>'
          + this.getTranslation('pastserialnumber', 'Past Data')
          + '</span>'));

      // Tooltips
      let tooltip = this.getTranslation('currentTooltip', '');
      if (tooltip != '') {
        pulseUtility.addToolTip(this._currentCell, tooltip);
      }
      tooltip = this.getTranslation('pastTooltip', '');
      if (tooltip != '') {
        pulseUtility.addToolTip(this._pastdata, tooltip);
      }

      // Red dot = missing data
      pulseSvg.createMissingdata(this._current);
      pulseSvg.createMissingdata(this._pastdata);

      // main
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main')
        .append(this._current)
        .append(this._pastdata);
      // Append
      $(this.element)
        .append(this._content);

      // Clicks
      this._current.click(
        function (e) {
          this.clickOnCurrent(e);
        }.bind(this)
      );
      this._pastdata.click(
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

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._currentText = undefined;
      this._current = undefined;
      this._pastdata = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Code here to clean the component, for example after a parameter change
      this.removeError();
      // Clean content
      $(this._pastdata).removeClass('pulse-cellbar-cell-missing');
      $(this._current).removeClass('pulse-cellbar-cell-missing pulse-cellbar-cell-nodata');
      $(this._currentText).html('');

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);

      // update internal value of tag
      this._serialnumber = null;
      this._datamissing = null;
      this._begin = null;
      this._end = null;
      this._datetime = null;
      this._isbegin = null;
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      let url = 'GetLastCycleWithSerialNumberV2/'
        + this.element.getAttribute('machine-id');
      return url;
    }

    refresh (data) {

      // update display of 'Past Data' block
      $(this._pastdata).removeClass('pulse-cellbar-cell-missing');
      if (data.DataMissing == true) {
        $(this._pastdata).addClass('pulse-cellbar-cell-missing');
      }

      // update display of 'Serial Number' block
      $(this._current)
        .removeClass('pulse-cellbar-cell-missing pulse-cellbar-cell-nodata');
      if (data.SerialNumber == '0') { //it means that serial number is missing
        $(this._current).addClass('pulse-cellbar-cell-missing');
        $(this._currentText).html('Missing');
      }
      else if (data.SerialNumber == '-1') { //it means that there is no serial number
        $(this._current).addClass('pulse-cellbar-cell-nodata');
        $(this._currentText).html('No Cycle');
      }
      else { //in this case, serial number has a value
        $(this._currentText).html(data.SerialNumber);
      }

      // update internal value of tag
      this._serialnumber = data.SerialNumber;
      this._datamissing = data.DataMissing;
      this._begin = data.Begin;
      this._end = data.End;
      this._datetime = (data.EstimatedBegin) ? data.End : data.Begin;
      this._isbegin = !data.EstimatedBegin;
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
      if (event.target.kind != 'serialnumber') {
        return;
      }
      if (event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }

      let isNew = true;
      if (this._mapOfModifications.has(modif.revisionid))
        isNew = false;
      this._mapOfModifications.set(modif.revisionid, modif);

      if (isNew) {
        // First time -> create progress bar (hope only 1)
        for (let i = 0; i < modif.ranges.length; i++) {
          let newRevisionProgress =
            pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
              //'period-context': NO MAIN RANGE
              //'range': NO MAIN RANGE
              'revision-id': modif.revisionid,
              'machine-id': event.target.machineid,
              'kind': modif.kind,
              'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[i])
            });
          this._content.append(newRevisionProgress);
        }
      }
      if (event.target.pendingModifications == 0) {
        // clean progress bar should be done in x-revisionprogress

        this._mapOfModifications.delete(modif.revisionid);

        this.start(); // or this.switchToContext('Reload');
      }
      //getModifications
      // else = do nothing (progress en cours) -> gere par la revision progress
    }

    /**
     * Event bus callback triggered when machineid changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when SN changes
     *
     * @param {Object} event
     */
    /*onSerialNumberChange (event) {
      this.start();
    }*/

    /**
     * DOM event callback triggered on a click on current data
     *
     * @param {event} e - DOM event
     */
    clickOnCurrent (e) {
      if ($(this._current).hasClass('pulse-cellbar-cell-nodata')) {
        return;
      }

      let dialog = $('<div></div>').addClass('lastserialnumber-dialog');

      let tag = pulseUtility.createjQueryElementWithAttribute('x-saveserialnumber', {
        'machine-id': this.element.getAttribute('machine-id'),
        'datetime': this._datetime,
        'is-begin': this._isbegin,
        'range': this._begin + ';' + this._end
        //'serialnumber-context': 'CIP' -> managed by modification
      });

      let saveDialogId = pulseCustomDialog.initialize(dialog, {
        title: this.getTranslation ('save', 'Save serial number'),
        onOk: function () {
          tag[0].saveSN(tag[0]);
        },
        autoClose: true,
        autoDelete: true
      });

      if (!$(this._current).hasClass('pulse-cellbar-cell-nodata')) {
        tag.attr('serial-number', $(this._currentText).html());
      }
      dialog.append(tag);

      pulseCustomDialog.open('#' + saveDialogId);
    }

    /**
     * DOM event callback triggered on a click on past data
     *
     * @param {event} e - DOM event
     */
    clickOnPast (e) {
      let getDefaultDateRange = function () {
        let m_end = moment().utc();
        let m_begin = m_end.clone();
        m_begin.add(-12, 'hours');
        let result = [];
        result[0] = pulseUtility.convertMomentToDateTimeString(m_begin);
        result[1] = pulseUtility.convertMomentToDateTimeString(m_end);
        return result;
      }

      let dialog = $('<div></div>').addClass('lastserialnumber-dialog');
      let context = new Date().getTime();
      let range = getDefaultDateRange();
      let r = pulseRange.createDateRangeDefaultInclusivity(range[0], range[1]);

      let xcyclesinperiod;
      if (this.element.hasAttribute('period-context')) {
        xcyclesinperiod = pulseUtility.createjQueryElementWithAttribute('x-cyclesinperiod', {
          'period-context': context,
          'machine-id': $(this.element).attr('machine-id'),
          'range': pulseUtility.convertDateRangeForWebService(r) //range[0] + ';' + range[1]
        });
      }
      else {
        xcyclesinperiod = pulseUtility.createjQueryElementWithAttribute('x-cyclesinperiod', {
          'machine-id': $(this.element).attr('machine-id'),
          'range': pulseUtility.convertDateRangeForWebService(r) //range[0] + ';' + range[1]
        });
      }

      let datetimerange_div = $('<div></div>').addClass('lastserialnumber-dialog-datetimerange');
      let xdatetimerange;
      if (this.element.hasAttribute('period-context')) {
        xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
          'period-context': context,
          'range': pulseUtility.convertDateRangeForWebService(r)  //range[0] + ';' + range[1]
        });
      }
      else {
        xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
          'range': pulseUtility.convertDateRangeForWebService(r)  //range[0] + ';' + range[1]
        });
      }
      datetimerange_div.append(xdatetimerange);
      let cyclesinperiod_div = $('<div></div>').addClass('lastserialnumber-cyclesinperiod').append(xcyclesinperiod);
      dialog.append(datetimerange_div).append(cyclesinperiod_div);

      let saveDialogId = pulseCustomDialog.initialize(dialog, {
        title: this.getTranslation ('selectPeriod', 'Select a period'),
        /*onOk: function () {
          self.load();
      },*/
        autoClose: true,
        autoDelete: true,
        okButton: 'hidden'
      });
      pulseCustomDialog.open('#' + saveDialogId);
    }
  }

  pulseComponent.registerElement('x-lastserialnumber', LastSerialNumberComponent, ['machine-id', 'machine-context']);
})();
