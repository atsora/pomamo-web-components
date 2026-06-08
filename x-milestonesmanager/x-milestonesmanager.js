// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-milestonesmanager
 * @requires module:pulseComponent
 */

var pulseCustomDialog = require('pulseCustomDialog');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var eventBus = require('eventBus');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');

require('x-datetimepicker/x-datetimepicker');
require('x-datetimerange/x-datetimerange');
require('x-milestonesadd/x-milestonesadd');
//require('x-machineselector/x-machineselector');

(function () {

  /**
   * `<x-milestonesmanager>` — table of milestones for one machine or group
   * with inline add/remove and a range filter.
   *
   * Renders a header (machine label + `x-datetimerange` bound to an
   * internal `milestones-context-<rand>` context) and a table whose rows
   * come from `MilestonesGet?GroupId=<id>[&Range=<range>]&Cache=No`. Each
   * row shows machine name, day, message, and a remove button which calls
   * `MilestonesRemove?Id=<id>`. The "+" header button opens an
   * `x-milestonesadd` inside a `pulseCustomDialog`. Reacts to
   * `dateTimeRangeChangeEvent` on its own range context, to
   * `milestonesChangeEvent` globally (after adds), and to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-milestonesmanager
   * @attr {number} machine-id      (required) machine or group id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class MilestonesManagerComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;
      self._beginDTP = undefined;
      self._endDTP = undefined;
      //self._errorMessage = undefined;

      // Others
      self._warningtext = '';
      self._selectedMachine = undefined;
      self._dateRange = undefined;

      // Local
      let randomValue = Math.round(10000 * Math.random());
      self._myPeriodContext = 'milestones-context-' + randomValue;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      /*switch (attr) {
        default:
          break;
      }*/
    }

    initialize () {
      this.addClass('pulse-bigdisplay'); // Mandatory for loader
      //pulse-text / pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Listener and dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // period-context
      eventBus.EventBus.addEventListener(this,
        'dateTimeRangeChangeEvent',
        this._myPeriodContext,
        this.onDateTimeRangeChange.bind(this));

      eventBus.EventBus.addGlobalEventListener(this,
        'milestonesChangeEvent',
        this.onMilestonesChange.bind(this));
      1
      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('milestonesmanager-content');
      this.element.appendChild(this._content);

      // Machines
      // was x-machineselector
      // OR
      this._machinesDisplay = document.createElement('div');
      this._machinesDisplay.classList.add('milestonesmanager-machines-div');
      // Keep id for demo
      if (!this.element.hasAttribute('machine-id')) {
        this._machinesDisplay.innerHTML = this.element.getAttribute('machine-id');
      }

      // -> in header
      let header = document.createElement('div');
      header.classList.add('milestonesmanager-header');
      header.appendChild(this._machinesDisplay);
      this._content.appendChild(header);

      // Range
      this._rangeDisplay = pulseUtility.createElementWithAttribute('x-datetimerange',
        {
          'period-context': this._myPeriodContext
        });
      let rangediv = document.createElement('div');
      rangediv.classList.add('milestonesmanager-range-div');
      rangediv.appendChild(this._rangeDisplay);
      this._content.appendChild(rangediv);
      //let div = document.createElement('div'); div.className = 'daterange'; div.appendChild(rangediv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      // Table
      this._table = document.createElement('div'); //.className = 'pulse-table';
      this._table.classList.add('milestonesmanager-table');
      this._tableScroll = document.createElement('div');
      this._tableScroll.classList.add('milestonesmanager-table-scroll');
      this._tableScroll.appendChild(this._table);
      this._tableDiv = document.createElement('div');
      this._tableDiv.classList.add('milestonesmanager-table-div');
      this._tableDiv.appendChild(this._tableScroll);
      this._content.appendChild(this._tableDiv);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
      * Clear anything that was done during intialization, so that initialize can be called once again.
      * Remove all the dispatchers and listeners.
      * Please note that no state switch is done here
    */
    clearInitialization () {
      // Parameters
      //this._myparameter = undefined;

      // DOM
      this.element.replaceChildren();
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      // Check machine-id (could be 'display all')
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id')))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat error display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;
    }

    removeError () {
      this.displayError('');
    }

    getShortUrl () {
      let url = 'MilestonesGet?GroupId=';
      let firstParam = false; //true;

      if (this.element.hasAttribute('machine-id')) {
        url += this.element.getAttribute('machine-id');
      }
      else {
        url += 'ALL';
      }
      // RANGE
      let rangeStr = this._rangeDisplay.getRangeString();
      if (rangeStr != undefined
        && '' != this.rangeStr) {
        url += firstParam ? '?' : '&';
        url += 'Range=' + rangeStr;
        //firstParam = false;
      }
      url += '&Cache=No';

      return url;
    }

    refresh (data) {
      // Compare data.Range / local range
      let stringRange = data.Range;
      this._dateRange = pulseRange.createDateRangeFromString(data.Range);

      // Update display if needed
      this._rangeDisplay.setAttribute('range', stringRange);

      // Fill Table
      this._table.replaceChildren();

      // Header
      let header = document.createElement('div');
      header.classList.add('pulse-row');
      header.classList.add('header');
      header.classList.add('milestonesmanager-row-header');
      this._table.appendChild(header);

      let hRemove = document.createElement('div');
      hRemove.classList.add('pulse-td');
      hRemove.classList.add('header');
      hRemove.classList.add('milestonesmanager-td-remove');
      header.appendChild(hRemove);
      let hMachine = document.createElement('div');
      hMachine.classList.add('pulse-td');
      hMachine.classList.add('header');
      hMachine.classList.add('milestonesmanager-td-machine');
      hMachine.innerHTML = this.getTranslation ('machine', 'Machine');
      header.appendChild(hMachine);
      let hDay = document.createElement('div');
      hDay.classList.add('pulse-td');
      hDay.classList.add('header');
      hDay.classList.add('milestonesmanager-td-day');
      hDay.innerHTML = this.getTranslation('day', 'Day');
      header.appendChild(hDay);
      let hText = document.createElement('div');
      hText.classList.add('pulse-td');
      hText.classList.add('header');
      hText.classList.add('milestonesmanager-td-milestone');
      hText.innerHTML = this.getTranslation ('description', 'Description');
      header.appendChild(hText);

      // ADD
      this._addButton = document.createElement('div');
      this._addButton.classList.add('milestonesmanager-add-button');
      let btnDiv = document.createElement('div');
      btnDiv.classList.add('milestonesmanager-add-div');
      btnDiv.appendChild(this._addButton);
      hText.appendChild(btnDiv);

      pulseSvg.inlineBackgroundSvg(this._addButton); // To use good background

      // Rows
      for (let iMach = 0; iMach < data.Machines.length; iMach++) {
        // Reverse order
        for (let iMil = data.Machines[iMach].Milestones.length - 1; iMil >= 0; iMil--) {
          let row = document.createElement('div');
          row.classList.add('pulse-row');
          row.classList.add('milestonesmanager-row');
          this._table.appendChild(row);

          let removeButton = document.createElement('div');
          removeButton.classList.add('milestonesmanager-td-remove-button'); // remove-button
          //removeButton.setAttribute('machineid', data.Machines[iMach].Id);
          removeButton.setAttribute('id', data.Machines[iMach].Milestones[iMil].Id);
          let remove = document.createElement('div');
          remove.classList.add('pulse-td');
          remove.classList.add('milestonesmanager-td-remove'); // remove-button
          //remove.setAttribute('machineid', data.Machines[iMach].Id);
          remove.setAttribute('id', data.Machines[iMach].Milestones[iMil].Id);
          remove.appendChild(removeButton);
          row.appendChild(remove);
          let machine = document.createElement('div');
          machine.classList.add('pulse-td');
          machine.classList.add('milestonesmanager-td-machine');
          machine.innerHTML = data.Machines[iMach].Display;
          row.appendChild(machine);

          pulseSvg.inlineBackgroundSvg(removeButton); // To use good background

          let datetime = document.createElement('div');
          datetime.classList.add('pulse-td');
          datetime.classList.add('milestonesmanager-td-datetime');
          datetime.innerHTML = pulseUtility.displayDate(
            data.Machines[iMach].Milestones[iMil].DateTime, false);
          row.appendChild(datetime);
          let text = document.createElement('div');
          text.classList.add('pulse-td');
          text.classList.add('milestonesmanager-td-milestone');
          text.innerHTML = data.Machines[iMach].Milestones[iMil].Message;
          row.appendChild(text);
        }
      }

      // Click on remove
      let removeButtons = this.element.querySelectorAll('.milestonesmanager-td-remove-button');
      removeButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
          let rem = e.target.closest('.milestonesmanager-td-remove-button');

          let id = rem.getAttribute('id');

          // Call ajax
          let url = this.getConfigOrAttribute('path', '')
            + 'MilestonesRemove?Id=' + id;

            pulseService.runAjaxSimple(url,
            this._removeSuccess.bind(this),
            this._removeError.bind(this),
            this._removeFail.bind(this));
        }.bind(this));
      });

      // Click on add
      this.element.querySelector('.milestonesmanager-add-button').addEventListener('click', function (e) {
          let milestonesAdd =
            pulseUtility.createElementWithAttribute('x-milestonesadd', {
              //'machine-context': this._myMachineContext
              'machine-id': this.element.getAttribute('machine-id')
            });
          let addPosition = document.createElement('div');
          addPosition.classList.add('milestonesmanager-add-div');
          addPosition.appendChild(milestonesAdd);

          let dialogId = pulseCustomDialog.openDialog(addPosition, {
            title: this.getTranslation ('add', 'Add milestone'),
            cancelButton: 'hidden',
            okButton: 'hidden',
            autoClose: true,
            autoDelete: true,
            fullScreenOnSmartphone: true,
            smallSize: true
          });

        }.bind(this));
    }

    _removeSuccess (data) {
      // Manage progress bar ???

      // Clean display
      this._table.replaceChildren();

      // relaod
      this.start();
    }

    _removeError (errorMessage) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openDialog(errorMessage.ErrorMessage, { type: 'Error', title: 'Error', onClose: close });
    }
    _removeFail (url, isTimeout, xhrStatus) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openDialog(this.getTranslation('errorRemove', 'Error in removing'), { type: 'Error', title: 'Error', onClose: close });
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    onDateTimeRangeChange (event) {
      if (null == this.element)
        return;

      let newRange = event.target.daterange;
      if (newRange.upper == null) { // No empty end
        newRange.upper = Date();
      }
      if ((this._dateRange == undefined) || (!pulseRange.equals(newRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._dateRange = newRange;

        this._table.replaceChildren();
        this.start();
      }
    }

    onMilestonesChange (event) {
      this.start();
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
      // Example :
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }

  }

  pulseComponent.registerElement('x-milestonesmanager', MilestonesManagerComponent, []);
})();
