// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastworkinformation
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 * @requires module:detailspopup
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');
var state = require('state');

(function () {

  class LastWorkInformationComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._noOperationDisplay =
        self.getTranslation('noOperation', ''); // Default empty

      // DOM -> never in contructor
      self._between = undefined;
      self._messageSpan = undefined;
      self._content = undefined;

      return self;
    }

    get content () { return this._content; } // Optional

    /*reload () {
      this.start();
    }*/

    /**
    *Update display of workinformation data
    *
    *@param workinformations list of workinformation
    *@param config
    */
    _displayWorkInformations (workinformations, config) {
      $(this._content).find('.pulse-cellbar-first').remove();

      for (let i = 0; i < workinformations.length; i++) {
        let div = $('<div></div>').addClass('pulse-cellbar-first')
          .addClass('pulse-cellbar-current-data')
          //.addClass('clickable') // To change display when hover
          .attr('kind', workinformations[i].Kind);

        // Red dot = missing data
        pulseSvg.createMissingdata(div);

        div.click(
          function (e) {
            this.clickOnCurrent(e);
          }.bind(this)
        );

        if (!pulseUtility.isNotDefined(workinformations[i].Value)) { // workinformation value is defined
          div
            //.addClass('clickable')
            .html(workinformations[i].Value);
        }
        else { // workinformation value is missing
          div.attr('missing', workinformations[i].Kind);
          if (config.OperationFromCnc) {
            div.addClass('pulse-cellbar-cell-missing')
              .html(workinformations[i].Kind); // was ('Missing');
            // .html(this._noOperationDisplay); // = Empty (default) Oups !!!
          }
          else { //if operation data come from Operator
            div.addClass('pulse-cellbar-cell-missing') // + .addClass('clickable') ???
              .html(workinformations[i].Kind); // was ('Missing'); // or ('Missing Operation'); ?
          }
        }
        div.insertBefore(this._between);

        // if not only one part is assigned to a WorkOrder
        // if (!config.OnePartPerWorkOrder) -> does it change  anything ?
        // else first_div.attr({ 'missing': workinformations[0].Kind + "," + _getKindOfIntermediateWorkinformations(workinformations).join(",") }); // workinformations[i].Kind;
      }
    }

    /**
      * @override
      * 
      * @param {!string} context - Context
      * @return {!string} key
      */
    getStartKey (context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState (context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'cancel-bar-style':
          if (newVal) {
            this.removeClass('pulse-lastbar');
            this.addClass('pulse-text');
          }
          else {
            this.removeClass('pulse-text');
            this.addClass('pulse-lastbar');
          }
          this.start();
          break;
        case 'machine-id':
          $(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove(); // == empty excepted message and loaded

          // Restore display here instead of in manage success :
          $(this.element).parent('.pulse-bar-div').show();

          this.start();
          break;
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal',
            newVal,
            this.onMachineIdChange.bind(this));
          break;
        case 'status-context': //'workinformationStatusChange'
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
        default:
          break;
      }
    }

    initialize () {
      // Update here some internal parameters

      // listeners
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

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      this._between = $('<div></div>').addClass('pulse-cellbar-between');
      // Main
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main').append(this._between);

      $(this.element).append(this._content);

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

      // Attribute
      if (this.element.hasAttribute('cancel-bar-style')
        && this.element.getAttribute('cancel-bar-style')) {
        this.addClass('pulse-text');
      }
      else {
        this.addClass('pulse-lastbar');
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._between = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // machine-id
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
      //$(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove(); // == empty excepted message and loaded

      $(this._messageSpan).html(message);

      eventBus.EventBus.dispatchToContext('workinformationStatusChange',
        this.element.getAttribute('status-context'),
        { status: null });
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let url = 'GetLastWorkInformationV3/'
        + this.element.getAttribute('machine-id');
      return url;
    }

    refresh (data) {
      // Done in manageSuccess
      //$(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove(); // == empty excepted message and loaded

      let status = false;
      //if there is no slot, display in workinformation bar a text 'Slot missing'
      if (data.SlotMissing) {
        let div = $('<div></div>').addClass('workinformation-slotmissing')
          .append(this._noOperationDisplay);
        $('<div></div>').addClass('pulse-cellbar-first')
          .append(div)
          .insertBefore(this._between);
      }
      else { //refresh display of interface
        let kinds = new Array();
        for (let i = 0; i < data.WorkInformations.length; i++) {
          kinds[i] = data.WorkInformations[i].Kind;
          status = status || ((pulseUtility.isNotDefined(data.WorkInformations[i].Value)) ? true : false);
        }
        this._kind = kinds;
        this._begin = data.Begin;
        this._end = data.End;
        this._iseditable = data.Config.IsEditable;
        this._displayWorkInformations(data.WorkInformations, data.Config);
      }

      //update past data block

      if (!this.element.hasAttribute('cancel-bar-style')
        || (this.element.getAttribute('cancel-bar-style') == 'false')) {
        let pastdiv = $('<div></div>').addClass('pulse-cellbar-last')
          .addClass('pulse-cellbar-past-data')
          .append($('<span>'
            + this.getTranslation('pastdata', 'Past Data')
            + '</span>'));

        // Tooltips
        let tooltip = this.getTranslation('pastTooltip', '');
        if (tooltip != '') {
          pulseUtility.addToolTip(pastdiv, tooltip);
        }
        // Red dot = missing data
        pulseSvg.createMissingdata(pastdiv);

        pastdiv.click(
          function (e) {
            this.clickOnPast(e);
          }.bind(this)
        );
        if (data.DataMissing == true) {
          $(pastdiv).addClass('pulse-cellbar-cell-missing');
          status = true;
        }
        pastdiv.insertAfter(this._between);
      }

      eventBus.EventBus.dispatchToContext('workinformationStatusChange',
        this.element.getAttribute('status-context'),
        { status: status });
    }

    manageSuccess (data) {
      $(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove(); // == empty excepted message and loaded

      //check if given machine do not manage Operation
      //if so, hide component
      if (data.MonitoredMachineOperationBar == 'None') {
        console.info('No operation for this machine : '
          + this.element.getAttribute('machine-id'));
        if (this.element.hasAttribute('cancel-bar-style')
          && this.element.getAttribute('cancel-bar-style')) {
          $(this.element).hide();
        }
        else {
          $(this._content).hide();
          $(this.element).parent('.pulse-bar-div').hide();
        }
        eventBus.EventBus.dispatchToContext('workinformationStatusChange',
          this.element.getAttribute('status-context'),
          { status: null });

        this.switchToContext('Loaded'); // to STOP calling Ajax request -> NotApplicable ?
        return;
      }

      // else Success:
      if (this.element.hasAttribute('cancel-bar-style')
        && this.element.getAttribute('cancel-bar-style')) {
        $(this.element).show();
      }
      else {
        $(this.element).parent('.pulse-bar-div').show();
        $(this._content).show();
      }

      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
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
        this._dateRange = newRange; // event.target.range?? one day;
        //this.start();
      }
    }

    /**
     * DOM event callback triggered on a click on current data
     *
     * @param {event} e - DOM event
     */
    clickOnCurrent (e) {
      return; // Do nothing
    } // end click on current

    /**
     * DOM event callback triggered on a click on past data
     *
     * @param {event} e - DOM event
     */
    clickOnPast (e) {
      if (this.element.hasAttribute('cancel-bar-style')
        && this.element.getAttribute('cancel-bar-style')) {
        return; // Do nothing
      }

      pulseDetailsPopup.openChangeWorkInfoDialog(this, this._dateRange);
    }

  }

  pulseComponent.registerElement('x-lastworkinformation', LastWorkInformationComponent, ['cancel-bar-style', 'machine-id', 'machine-context', 'status-context', 'period-context']);
})();
