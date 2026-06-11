// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
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
import * as pulseComponent from 'pulsecomponent';
import * as pulseRange from 'pulseRange';
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';
import pulseCustomDialog from 'pulseCustomDialog';
import * as eventBus from 'eventBus';

import 'x-saveserialnumber/x-saveserialnumber';
import 'x-cyclesinperiod/x-cyclesinperiod';
import 'x-revisionprogress/x-revisionprogress';

(function () {

  /**
   * `<x-lastserialnumber>` — cell-bar showing the last-cycle serial number and
   * a "Past Data" cell for one machine.
   *
   * Polls `GetLastCycleWithSerialNumberV2/<machine-id>` (interval =
   * `refreshingRate.currentRefreshSeconds`, default 10 s). The current cell
   * shows the serial number, "Missing" (`SerialNumber === '0'`, with
   * `pulse-cellbar-cell-missing`) or "No Cycle" (`SerialNumber === '-1'`,
   * with `pulse-cellbar-cell-nodata`); the past-data cell is flagged with
   * `pulse-cellbar-cell-missing` when `DataMissing` is true. Clicking the
   * current cell opens an `x-saveserialnumber` dialog (via
   * `pulseCustomDialog`); clicking the past cell opens an `x-cyclesinperiod`
   * + `x-datetimerange` dialog over the last 12 hours. Pending revisions of
   * `kind: 'serialnumber'` for the current machine append an
   * `x-revisionprogress`; once `pendingModifications === 0` the component
   * restarts. Reacts to `machineIdChangeSignal` on `machine-context`.
   *
   * @element x-lastserialnumber
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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
          let modifMgr = document.querySelector('body x-modificationmanager');
          if (modifMgr) {
            this._mapOfModifications = modifMgr.getModifications('serialnumber',
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
      let modifMgr = document.querySelector('body x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('serialnumber',
          this.element.getAttribute('machine-id'));
      }
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      // current
      this._currentText = document.createElement('span');
      this._currentText.className = 'lastserialnumber-serialnumber-data';
      this._current = document.createElement('div');
      this._current.className = 'pulse-cellbar-first pulse-cellbar-current-data clickable';
      let currentLabel = document.createElement('span');
      currentLabel.innerHTML = this.getTranslation('currentserialnumber', 'Serial Number:');
      this._current.appendChild(currentLabel);
      this._current.appendChild(this._currentText);
      // past
      this._pastdata = document.createElement('div');
      this._pastdata.className = 'pulse-cellbar-last pulse-cellbar-past-data';
      let pastLabel = document.createElement('span');
      pastLabel.innerHTML = this.getTranslation('pastserialnumber', 'Past Data');
      this._pastdata.appendChild(pastLabel);

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
      this._content = document.createElement('div');
      this._content.className = 'pulse-cellbar-main';
      this._content.appendChild(this._current);
      this._content.appendChild(this._pastdata);
      // Append
      this.element.appendChild(this._content);

      // Clicks
      this._current.addEventListener('click', function (e) {
        this.clickOnCurrent(e);
      }.bind(this));
      this._pastdata.addEventListener('click', function (e) {
        this.clickOnPast(e);
      }.bind(this));

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

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

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
      this._pastdata.classList.remove('pulse-cellbar-cell-missing');
      this._current.classList.remove('pulse-cellbar-cell-missing', 'pulse-cellbar-cell-nodata');
      this._currentText.innerHTML = '';

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
      this._messageSpan.innerHTML = message;

      // update internal value of tag
      this._serialnumber = null;
      this._datamissing = null;
      this._begin = null;
      this._end = null;
      this._datetime = null;
      this._isbegin = null;
    }

    removeError () {
      this._messageSpan.innerHTML = '';
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * REST endpoint: `GetLastCycleWithSerialNumberV2/<machine-id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let url = 'GetLastCycleWithSerialNumberV2/'
        + this.element.getAttribute('machine-id');
      return url;
    }

    /**
     * Updates current and past data cells. Special values: '0' = missing, '-1' = no cycle.
     * Stores internal serial number, range, and timing data for click handlers.
     *
     * @param {{ SerialNumber: string, DataMissing: boolean, Begin: string, End: string, EstimatedBegin: boolean }} data
     */
    refresh (data) {

      // update display of 'Past Data' block
      this._pastdata.classList.remove('pulse-cellbar-cell-missing');
      if (data.DataMissing == true) {
        this._pastdata.classList.add('pulse-cellbar-cell-missing');
      }

      // update display of 'Serial Number' block
      this._current.classList.remove('pulse-cellbar-cell-missing', 'pulse-cellbar-cell-nodata');
      if (data.SerialNumber == '0') { //it means that serial number is missing
        this._current.classList.add('pulse-cellbar-cell-missing');
        this._currentText.innerHTML = 'Missing';
      }
      else if (data.SerialNumber == '-1') { //it means that there is no serial number
        this._current.classList.add('pulse-cellbar-cell-nodata');
        this._currentText.innerHTML = 'No Cycle';
      }
      else { //in this case, serial number has a value
        this._currentText.innerHTML = data.SerialNumber;
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
            pulseUtility.createElementWithAttribute('x-revisionprogress', {
              //'period-context': NO MAIN RANGE
              //'range': NO MAIN RANGE
              'revision-id': modif.revisionid,
              'machine-id': event.target.machineid,
              'kind': modif.kind,
              'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[i])
            });
          this._content.appendChild(newRevisionProgress);
        }
      }
      if (event.target.pendingModifications == 0) {
        // clean progress bar should be done in x-revisionprogress

        this._mapOfModifications.delete(modif.revisionid);

        this.start(); // or this.switchToContext('Reload');
      }
      //getModifications
      // else = do nothing (in-progress) -> handled by the revision progress
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
      if (this._current.classList.contains('pulse-cellbar-cell-nodata')) {
        return;
      }

      let dialog = document.createElement('div');
      dialog.className = 'lastserialnumber-dialog';

      let tag = pulseUtility.createElementWithAttribute('x-saveserialnumber', {
        'machine-id': this.element.getAttribute('machine-id'),
        'datetime': this._datetime,
        'is-begin': this._isbegin,
        'range': this._begin + ';' + this._end
        //'serialnumber-context': 'CIP' -> managed by modification
      });

      if (!this._current.classList.contains('pulse-cellbar-cell-nodata')) {
        tag.setAttribute('serial-number', this._currentText.innerHTML);
      }
      dialog.appendChild(tag);

      let saveDialogId = pulseCustomDialog.openDialog(dialog, {
        title: this.getTranslation ('save', 'Save serial number'),
        onOk: function () {
          tag.saveSN(tag);
        },
        autoClose: true,
        autoDelete: true
      });
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

      let dialog = document.createElement('div');
      dialog.className = 'lastserialnumber-dialog';
      let context = new Date().getTime();
      let range = getDefaultDateRange();
      let r = pulseRange.createDateRangeDefaultInclusivity(range[0], range[1]);

      let xcyclesinperiod;
      if (this.element.hasAttribute('period-context')) {
        xcyclesinperiod = pulseUtility.createElementWithAttribute('x-cyclesinperiod', {
          'period-context': context,
          'machine-id': this.element.getAttribute('machine-id'),
          'range': pulseUtility.convertDateRangeForWebService(r) //range[0] + ';' + range[1]
        });
      }
      else {
        xcyclesinperiod = pulseUtility.createElementWithAttribute('x-cyclesinperiod', {
          'machine-id': this.element.getAttribute('machine-id'),
          'range': pulseUtility.convertDateRangeForWebService(r) //range[0] + ';' + range[1]
        });
      }

      let datetimerange_div = document.createElement('div');
      datetimerange_div.className = 'lastserialnumber-dialog-datetimerange';
      let xdatetimerange;
      if (this.element.hasAttribute('period-context')) {
        xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange', {
          'period-context': context,
          'range': pulseUtility.convertDateRangeForWebService(r)  //range[0] + ';' + range[1]
        });
      }
      else {
        xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange', {
          'range': pulseUtility.convertDateRangeForWebService(r)  //range[0] + ';' + range[1]
        });
      }
      datetimerange_div.appendChild(xdatetimerange);
      let cyclesinperiod_div = document.createElement('div');
      cyclesinperiod_div.className = 'lastserialnumber-cyclesinperiod';
      cyclesinperiod_div.appendChild(xcyclesinperiod);
      dialog.appendChild(datetimerange_div);
      dialog.appendChild(cyclesinperiod_div);

      let saveDialogId = pulseCustomDialog.openDialog(dialog, {
        title: this.getTranslation ('selectPeriod', 'Select a period'),
        /*onOk: function () {
          self.load();
      },*/
        autoClose: true,
        autoDelete: true,
        okButton: 'hidden'
      });
    }
  }

  pulseComponent.registerElement('x-lastserialnumber', LastSerialNumberComponent, ['machine-id', 'machine-context']);
})();
