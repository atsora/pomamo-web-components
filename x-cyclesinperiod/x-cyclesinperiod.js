// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-cyclesinperiod
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:x-saveserialnumber
 */

import * as pulseUtility from 'pulseUtility';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseComponent from 'pulsecomponent';
import * as pulseRange from 'pulseRange';
import * as eventBus from 'eventBus';

import 'x-saveserialnumber/x-saveserialnumber';

(function () {

  /**
   * `<x-cyclesinperiod>` — table of one machine's cycles within a datetime range.
   *
   * Fetches `GetCyclesWithWorkInformationsInPeriodV2?Id=<machine-id>&Begin=<begin>&End=<end>`
   * on each `machine-id` / `range` change and renders one `<tr>` per cycle with
   * its range, the work-information values, and a serial-number cell (`Missing`
   * marker when absent). Clicking a row opens an `<x-saveserialnumber>` dialog
   * via `pulseCustomDialog` to edit/save the cycle's serial. Reacts to
   * `dateTimeRangeChangeEvent` on `period-context` (or globally) and to
   * `machineIdChangeSignal` on `machine-context`.
   *
   * @element x-cyclesinperiod
   * @attr {number} machine-id       (required) machine id
   * @attr {string} range            ISO datetime range `begin;end`
   * @attr {string} period-context   event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class CyclesInPeriodComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._messageSpan = undefined;
      self._range = undefined;
      self._saveSNtag = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-context':
          {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          } break;
        case 'machine-id':
          {
            this.start();
          } break;
        case 'range':
          {
            let pos = newVal.indexOf(';');
            let begin = newVal.substr(0, pos);
            let end = newVal.substr(pos + 1, newVal.length - (pos + 1));
            let newRange = pulseRange.createDateRangeDefaultInclusivity(begin, end);
            this._setRange(newRange);
          } break;
        default:
          break;
      }
    }

    _setRange (newRange) {
      if (this._range != newRange) {
        this._range = newRange;
        // force re-load or init
        this.start();
      }
    }

    /**
    * @function _fillTable
    * Fill table that display list of cycles
    * @param {jQuery} table jQuery element that display cycles information
    * @param {Array} list List of CyclesWithWorkInformationsDTOs to display
    * @param {Boolean} checked if true only cycles with missing serial number is displayed, otherwise all cycles is displayed
    *
    */
    _fillTable (table, list, checked) {
      table.replaceChildren();
      //loop through list of cycles
      for (let i = 0; i < list.length; i++) {
        //if we have checked to only display cycles without serial number
        //and current cycle in loop has serial number, we continue with
        //following cycle
        if (checked && (list[i].SerialNumber))
          continue;
        //add cycle properties to row attributes
        let tr = document.createElement('tr');
        tr.setAttribute('cycleid', list[i].CycleId);
        tr.setAttribute('begin', list[i].Begin);
        tr.setAttribute('end', list[i].End);
        tr.setAttribute('estimated-begin', list[i].EstimatedBegin);
        tr.setAttribute('estimated-end', list[i].EstimatedEnd);
        tr.setAttribute('serial-number', list[i].SerialNumber);
        tr.className = 'selectable';
        //display date range of currentcycle
        let tmpRange = pulseRange.createDateRangeDefaultInclusivity(list[i].Begin, list[i].End);
        let td1 = document.createElement('td');
        td1.innerHTML = pulseUtility.displayDateRange(tmpRange);
        tr.appendChild(td1);
        //display workinformations of operationslot related to current cycle
        for (let j = 0; j < list[i].WorkInformations.length; j++) {
          let td = document.createElement('td');
          if (list[i].WorkInformations[j].Value) {
            td.innerHTML = list[i].WorkInformations[j].Value;
          }
          else {
            td.innerHTML = '...';
          }
          tr.appendChild(td);
        }
        //display serial number of current cycle or 'Missing' if it do not have
        let tdSn = document.createElement('td');
        tdSn.className = 'serialnumber';
        if (list[i].SerialNumber) {
          tdSn.innerHTML = list[i].SerialNumber;
        }
        else {
          tdSn.classList.add('missing');
          tdSn.innerHTML = this.getTranslation('missing', 'Missing');
        }
        tr.appendChild(tdSn);
        table.appendChild(tr);

        // Click
        tr.addEventListener('click',
          function (e) {
            this.clickOnRow(e);
          }.bind(this)
        );
      }
    }


    initialize () {
      this.addClass('pulse-bigdisplay'); // Mandatory for loader

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listener
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
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this, 'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'cyclesinperiod-content';

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      this.element.appendChild(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        console.log('waiting attribute machine-id in CncValueBarComponent.element');
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in CncValueBarComponent.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      if (!this._range) {
        if (this.element.getAttribute('range')) {
          let newValue = this.element.getAttribute('range');
          let newRange = pulseRange.createDateRangeFromString(newValue);
          if (!newRange.isEmpty()) {
            this._range = newRange;
          }
          // Do not call setRange here !
        }
        else {
          if (this.element.getAttribute('period-context')) {
            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              this.element.getAttribute('period-context'));
          }
          else {
            eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
          }
          // Delayed display :
          this.setError(this.getTranslation('error.missingRange', 'Missing range'));
          return;
        }

      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      this._content.replaceChildren();

      this._messageSpan.innerHTML = message;
    }

    removeError () {
      this._messageSpan.innerHTML = '';
    }

    getShortUrl () {
      if (this._range) {
        let url = 'GetCyclesWithWorkInformationsInPeriodV2?Id='
          + this.element.getAttribute('machine-id');
        if (this._range.lower) {
          url += '&Begin=' + pulseUtility.convertDateForWebService(this._range.lower);
          if (this._range.upper) {
            url += '&End=' + pulseUtility.convertDateForWebService(this._range.upper);
          }
        }
        return url;
      }
      return '';
    }

    refresh (data) {
      /*Do not call _setRange(isoBegin, isoEnd); */
      this._range = pulseRange.createDateRangeDefaultInclusivity(data.Begin, data.End);

      //remove table which display information of cycles
      this._content.replaceChildren();
      this._content.classList.add('pulse-selection-table-container');

      let table = document.createElement('table');
      this._content.appendChild(table);
      //if data contains cycles, we build table to display them
      if (data.List.length > 0) {
        this._fillTable(table, data.List, false);
      }
    }


    // Callback events
    onDateTimeRangeChange (event) {
      this._setRange(event.target.daterange);
    }
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
    onSerialNumberChange (event) {
      // Reload
      this.start();
    }


    /**
     * DOM event callback triggered on a click on row
     *
     * @param {event} e - DOM event
     */
    clickOnRow (e) {
      let td = e.target;
      let tr = td.parentElement;
      //create x-saveserialnumber component and put it in dialog box
      let dialog = document.createElement('div');
      dialog.className = 'lastserialnumber-dialog';

      let opts;
      if (!tr.hasAttribute('estimated-begin')) {
        opts = {
          'machine-id': this.element.getAttribute('machine-id'),
          'datetime': tr.getAttribute('begin'),
          'serial-number': tr.getAttribute('serial-number'),
          'range': tr.getAttribute('begin') + ';' + tr.getAttribute('end'),
          'is-begin': 'is-begin'
          //,'serialnumber-context': 'CIP'  -> managed by modification
        };
      }
      else {
        opts = {
          'machine-id': this.element.getAttribute('machine-id'),
          'datetime': tr.getAttribute('end'),
          'serial-number': tr.getAttribute('serial-number'),
          'range': tr.getAttribute('begin') + ';' + tr.getAttribute('end')
          //'serialnumber-context': 'CIP' -> managed by modification
        };
      }

      this._saveSNtag = pulseUtility.createElementWithAttribute('x-saveserialnumber', opts);
      dialog.appendChild(this._saveSNtag);

      pulseCustomDialog.openDialog(dialog, {
        title: this.getTranslation ('saveSerialNumber', 'Save serial number'),
        onOk: //function (xsaveinperiod, xsaveSNtag) { // to avoid closure
          //return
          function () {
            this._saveSNtag.save();
            //this.load(); -> sn-context after progress in ssn
          }.bind(this), //(this, this._saveSNtag), /* end of onOk */
        onCancel: //function (xsaveinperiod) { // to avoid closure
          //return
          function () {
            pulseCustomDialog.close('.lastserialnumber-dialog');
          }.bind(this),
        //}(this), /* end of onOk */
        autoClose: false,
        autoDelete: true
      });


    }

  }

  pulseComponent.registerElement('x-cyclesinperiod', CyclesInPeriodComponent, ['machine-context', 'machine-id', 'range']);
})();
