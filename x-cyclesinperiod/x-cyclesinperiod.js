// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-cyclesinperiod used to build cyclesInPeriod widget. It shows datetime range
 * and table with cycles which occurs during given datetime range.
 *
 * @module x-cyclesinperiod
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:x-saveserialnumber
 */

var pulseUtility = require('pulseUtility');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

require('x-saveserialnumber/x-saveserialnumber');

/*
 *This tag is used to display previous cycles with serial number and workinformations. It can take following attribute:
 *  - machine-id : id of given machine
 *  - range
 */
(function () {

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
      table.empty();
      //loop through list of cycles
      for (let i = 0; i < list.length; i++) {
        //if we have checked to only display cycles without serial number
        //and current cycle in loop has serial number, we continue with
        //following cycle
        if (checked && (list[i].SerialNumber))
          continue;
        //add cycle properties to row attributes
        let tr = $('<tr></tr>').attr({
          'cycleid': list[i].CycleId,
          'begin': list[i].Begin,
          'end': list[i].End,
          'estimated-begin': list[i].EstimatedBegin,
          'estimated-end': list[i].EstimatedEnd,
          'serial-number': list[i].SerialNumber
        })
          .addClass('selectable');
        //display date range of currentcycle
        let tmpRange = pulseRange.createDateRangeDefaultInclusivity(list[i].Begin, list[i].End);
        tr.append($('<td></td>').html(pulseUtility.displayDateRange(tmpRange)));
        //display workinformations of operationslot related to current cycle
        for (let j = 0; j < list[i].WorkInformations.length; j++) {
          if (list[i].WorkInformations[j].Value) {
            tr.append($('<td></td>').html(list[i].WorkInformations[j].Value));
          }
          else {
            tr.append($('<td></td>').html('...'));
          }
        }
        //display serial number of current cycle or 'Missing' if it do not have
        if (list[i].SerialNumber) {
          tr.append($('<td></td>').addClass('serialnumber').html(list[i].SerialNumber));
        }
        else {
          tr.append($('<td></td>').addClass('serialnumber missing').html(this.getTranslation('missing', 'Missing')));
        }
        table.append(tr);

        // Click
        tr.click(
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>')
        .addClass('cyclesinperiod-content');

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      $(this.element)
        //.addClass('cyclesinperiod')
        .append(this._content);

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
      $(this._content).empty();

      $(this._messageSpan).html(message);
    }

    removeError () {
      $(this._messageSpan).html('');
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
      $(this._content).empty()
        .addClass('pulse-selection-table-container');

      let table = $('<table></table>');
      $(this._content).append(table);
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
      let tr = $(td).parent();
      //create x-saveserialnumber component and put it in dialog box
      let dialog = $('<div></div>').addClass('lastserialnumber-dialog');
      let saveDialogId = pulseCustomDialog.initialize(dialog, {
        title: this.getTranslation ('saveSerialNumber', 'Save serial number'),
        onOk: //function (xsaveinperiod, xsaveSNtag) { // to avoid closure
          //return
          function () {
            $(this._saveSNtag)[0].save();
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

      let opts;
      if (!$(tr)[0].hasAttribute('estimated-begin')) {
        opts = {
          'machine-id': this.element.getAttribute('machine-id'),
          'datetime': $(tr)[0].getAttribute('begin'),
          'serial-number': $(tr)[0].getAttribute('serial-number'),
          'range': $(tr)[0].getAttribute('begin') + ';' + $(tr)[0].getAttribute('end'),
          'is-begin': 'is-begin'
          //,'serialnumber-context': 'CIP'  -> managed by modification
        };
      }
      else {
        opts = {
          'machine-id': this.element.getAttribute('machine-id'),
          'datetime': $(tr)[0].getAttribute('end'),
          'serial-number': $(tr)[0].getAttribute('serial-number'),
          'range': $(tr)[0].getAttribute('begin') + ';' + $(tr)[0].getAttribute('end')
          //'serialnumber-context': 'CIP' -> managed by modification
        };
      }

      this._saveSNtag = pulseUtility.createjQueryElementWithAttribute('x-saveserialnumber', opts);
      dialog.append(this._saveSNtag);

      pulseCustomDialog.open('#' + saveDialogId);

    }

  }

  pulseComponent.registerElement('x-cyclesinperiod', CyclesInPeriodComponent, ['machine-context', 'machine-id', 'range']);
})();
