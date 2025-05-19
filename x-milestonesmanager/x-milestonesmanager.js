// Copyright (C) 2009-2023 Lemoine Automation Technologies
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('milestonesmanager-content');
      $(this.element).append(this._content);

      // Machines
      // was x-machineselector
      // OR
      this._machinesDisplay = $('<div></div>').addClass('milestonesmanager-machines-div');
      // Fill machines selection display
      //$('x-machineselection').get(0).fillExternalSummaryDisplay(this._machinesDisplay);
      // REMOVED !!! -> external
      // Keep id for demo
      if (!this.element.hasAttribute('machine-id')) {
        this._machinesDisplay.html(this.element.getAttribute('machine-id'));
      }

      // -> in header 
      let header = $('<div></div>').addClass('milestonesmanager-header')
        .append(this._machinesDisplay);
      $(this._content).append(header);

      // Range
      this._rangeDisplay = pulseUtility.createjQueryElementWithAttribute('x-datetimerange',
        {
          'period-context': this._myPeriodContext
        });
      let rangediv = $('<div></div>').addClass('milestonesmanager-range-div')
        .append(this._rangeDisplay);
      $(this._content).append(rangediv);
      //let div = $('<div></div>').addClass('daterange').append(rangediv)

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      // Table
      this._table = $('<div></div>')//.addClass('pulse-table')
        .addClass('milestonesmanager-table');
      this._tableScroll = $('<div></div>').addClass('milestonesmanager-table-scroll')
        .append(this._table);
      this._tableDiv = $('<div></div>').addClass('milestonesmanager-table-div')
        .append(this._tableScroll);
      $(this._content).append(this._tableDiv);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

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
      $(this.element).empty();
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      // Check machine-id (could be 'display all')
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in milestonesmanager.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id')))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat error display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);
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
      let rangeStr = this._rangeDisplay[0].getRangeString();
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
      this._rangeDisplay[0].setAttribute('range', stringRange);

      // Fill Table
      $(this._table).empty();

      // Header
      let header = $('<div></div>').addClass('pulse-row')
        .addClass('header')
        .addClass('milestonesmanager-row-header');
      $(this._table).append(header);

      let hRemove = $('<div></div>').addClass('pulse-td')
        .addClass('header')
        .addClass('milestonesmanager-td-remove');
      $(header).append(hRemove);
      let hMachine = $('<div></div>').addClass('pulse-td')
        .addClass('header')
        .addClass('milestonesmanager-td-machine')
        .html(this.getTranslation ('machine', 'Machine'));
      $(header).append(hMachine);
      let hDay = $('<div></div>').addClass('pulse-td')
        .addClass('header')
        .addClass('milestonesmanager-td-day')
        .html(this.getTranslation('day', 'Day'));
      $(header).append(hDay);
      let hText = $('<div></div>').addClass('pulse-td')
        .addClass('header')
        .addClass('milestonesmanager-td-milestone')
        .html(this.getTranslation ('description', 'Description'));
      $(header).append(hText);

      // ADD
      this._addButton = $('<div></div>').addClass('milestonesmanager-add-button');
      let btnDiv = $('<div></div>').addClass('milestonesmanager-add-div')
        .append(this._addButton);
      hText.append(btnDiv);
      
      pulseSvg.inlineBackgroundSvg(this._addButton); // To use good background

      // Rows
      for (let iMach = 0; iMach < data.Machines.length; iMach++) {
        // Reverse order
        for (let iMil = data.Machines[iMach].Milestones.length - 1; iMil >= 0; iMil--) {
          let row = $('<div></div>').addClass('pulse-row')
            .addClass('milestonesmanager-row');
          $(this._table).append(row);

          let removeButton = $('<div></div>')
            .addClass('milestonesmanager-td-remove-button') // remove-button
            //.attr('machineid', data.Machines[iMach].Id)
            .attr('id', data.Machines[iMach].Milestones[iMil].Id);
          let remove = $('<div></div>').addClass('pulse-td')
            .addClass('milestonesmanager-td-remove') // remove-button
            //.attr('machineid', data.Machines[iMach].Id)
            .attr('id', data.Machines[iMach].Milestones[iMil].Id)
            .append(removeButton);
          $(row).append(remove);
          let machine = $('<div></div>').addClass('pulse-td')
            .addClass('milestonesmanager-td-machine')
            .html(data.Machines[iMach].Display);
          $(row).append(machine);

          pulseSvg.inlineBackgroundSvg(removeButton); // To use good background

          let datetime = $('<div></div>').addClass('pulse-td')
            .addClass('milestonesmanager-td-datetime')
            .html(pulseUtility.displayDate(
              data.Machines[iMach].Milestones[iMil].DateTime, false));
          $(row).append(datetime);
          let text = $('<div></div>').addClass('pulse-td')
            .addClass('milestonesmanager-td-milestone')
            .html(data.Machines[iMach].Milestones[iMil].Message);
          $(row).append(text);
        }
      }

      // Click on remove
      $(this.element).find('.milestonesmanager-td-remove-button').click(
        function (e) {
          let rem = $(e.target).closest('.milestonesmanager-td-remove-button');

          let id = rem[0].getAttribute('id');

          // Call ajax
          let url = this.getConfigOrAttribute('path', '')
            + 'MilestonesRemove?Id=' + id;

            pulseService.runAjaxSimple(url,
            this._removeSuccess.bind(this),
            this._removeError.bind(this),
            this._removeFail.bind(this));
        }.bind(this));

      // Click on add
      $(this.element).find('.milestonesmanager-add-button').click(
        function (e) {
          let milestonesAdd =
            pulseUtility.createjQueryElementWithAttribute('x-milestonesadd', {
              //'machine-context': this._myMachineContext
              'machine-id': this.element.getAttribute('machine-id')
            });
          let addPosition = $('<div></div>').addClass('milestonesmanager-add-div')
            .append(milestonesAdd);

          let dialogId = pulseCustomDialog.initialize(addPosition, {
            title: this.getTranslation ('add', 'Add milestone'),
            cancelButton: 'hidden',
            okButton: 'hidden',
            autoClose: true,
            autoDelete: true,
            fullScreenOnSmartphone: true,
            smallSize: true
          });
          pulseCustomDialog.open('#' + dialogId);

        }.bind(this));
    }

    _removeSuccess (data) {
      // Manage progress bar ???

      // Clean display
      $(this._table).empty();

      // relaod
      this.start();
    }

    _removeError (errorMessage) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openError(errorMessage.ErrorMessage, 'Error', close);
    }
    _removeFail (url, isTimeout, xhrStatus) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openError(this.getTranslation('errorRemove', 'Error in removing'), 'Error', close);
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

        $(this._table).empty();
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
