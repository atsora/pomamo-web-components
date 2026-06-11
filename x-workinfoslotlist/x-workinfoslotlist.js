// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workinfoslotlist
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:x-datetimerange
 * @requires module:x-highlightperiodsbar
 */

import * as pulseUtility from 'pulseUtility';
import * as pulseRange from 'pulseRange';
//var pulseCustomDialog = require('pulseCustomDialog');
import * as pulseComponent from 'pulsecomponent';
//var pulseSvg = require('pulseSvg');
import * as eventBus from 'eventBus';

//require('x-reasonslotbar/x-reasonslotbar');
import 'x-operationslotbar/x-operationslotbar';

//require('x-savereason/x-savereason');
import 'x-datetimerange/x-datetimerange';
import 'x-highlightperiodsbar/x-highlightperiodsbar';


(function () {

  /**
   * `<x-workinfoslotlist>` — scrollable list of operation slots (work
   * info) for one machine over a date range.
   *
   * Fetches `GetListOfOperationSlotV2?Id=<machine-id>&Begin=<begin>&End=<end>`
   * and renders one row per operation slot with work order, component and
   * operation labels. An embedded `x-operationslotbar` provides a visual
   * summary, and `x-highlightperiodsbar` shows the currently-hovered
   * slot. Reacts to `dateTimeRangeChangeEvent` on `period-context` and
   * to `machineIdChangeSignal` on `machine-context`.
   *
   * @element x-workinfoslotlist
   * @attr {number} machine-id      (required) machine id
   * @attr {string} range           ISO datetime range `begin;end`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class ReasonSlotListComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;
      self._setAutoRange();

      self._numberOfDisplayedItems = undefined;
      //self._numberOfSelectableItems = 0;
      //self._skipList = false; // If there is a unique period, skip the list and update the reason
      self._firstLoad = true;

      return self;
    }

    /**
     * Associated range in native Javascript Date
     *
     * @return {pulseRange:DateRange} Current range in native Javascript Date
     */
    get range () { return this._range; }
    _setAutoRange () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }

    /**
     * @override
     */
    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': {
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this,
              'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              'WISL' + newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          this.start();
        } break;
        case 'range': {
          this._setAutoRange();
          this.start();
        } break;
        default:
          break;
      }
    }

    cleanTable (table) {
      this._table.replaceChildren();
    }

    fillTable () {
      this.cleanTable();

      if (this._data.List.length == 0) {
        return;
      }

      /* Filters :
      let showAllIdle = $(this._allIdleCheckbox).is(':checked');
      let showMotion = $(this._motionCheckbox).is(':checked');*/

      this._numberOfDisplayedItems = 0;
      //this._numberOfSelectableItems = 0;

      //let evt; // for selection

      this._data.List.sort(function (a, b) {
        let aRange = pulseRange.createDateRangeDefaultInclusivity(a.Begin, a.End);
        //pulseRange.createDateRangeFromString(a.Range);
        let bRange = pulseRange.createDateRangeDefaultInclusivity(b.Begin, b.End);
        //pulseRange.createDateRangeFromString(b.Range);
        return bRange.lower.getTime() - aRange.lower.getTime(); // From most recent to oldest
      });

      for (let item of this._data.List) {
        // + Filter ?

        ++this._numberOfDisplayedItems;

        /*let tmpRange = item.Range;
        let range = pulseRange.createDateRangeFromString(tmpRange);*/
        let tmpRange = pulseRange.createDateRangeDefaultInclusivity(item.Begin, item.End);

        let tr = document.createElement('div');
        tr.className = 'workinfoslotlist-tr';
        tr.setAttribute('operationslot-id', item.OperationSlotId);
        tr.setAttribute('begin', item.Begin);
        tr.setAttribute('end', item.End);
        tr.setAttribute('range', pulseUtility.convertDateRangeForWebService(tmpRange));

        /*let tdCheck = document.createElement('div');
        tdCheck.className = 'workinfoslotlist-td-check';
        if (item.IsSelectable == undefined || item.IsSelectable) {
          let checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'table-check';
          tdCheck.appendChild(checkbox);
        }*/

        /*let tdReasonButton = document.createElement('div');
        tdReasonButton.className = 'workinfoslotlist-td-icon';
        if (catId > 0) {
          let svg = pulseSvg.getMachineMode....
        }*/

        let displayedRange = pulseUtility.displayDateRange(tmpRange);
        let tdRange = document.createElement('div');
        tdRange.innerHTML = displayedRange;
        tdRange.className = 'workinfoslotlist-td-range';
        let desc = document.createElement('div');
        desc.className = 'workinfoslotlist-td-desc';
        desc.appendChild(tdRange);

        for (let workinfo of item.WorkInformations) {
          let textbox = document.createElement('div');
          textbox.setAttribute('kind', workinfo.Kind);
          textbox.className = 'workinfoslotlist-td-workinfo';
          textbox.innerHTML = '...';
          desc.appendChild(textbox);
        }
        tr.appendChild(desc);
        this._table.appendChild(tr);

        this._displayWorkInformations(tr, item.WorkInformations, this._data.Config);
      }

      this._firstLoad = false;
    }

    // Used by Fill Table
    _displayWorkInformations (tablerow, workinformations, config) {
      //tablerow.empty();
      if (workinformations.length > 0) {
        let n = workinformations.length;

        let firstValue = workinformations[0].Value;
        let lastValue = workinformations[n - 1].Value;

        if (firstValue) { //Level 1 has value
          let elem = tablerow.querySelector('[kind="' + workinformations[0].Kind + '"]');
          elem.classList.add('hasvalue');
          elem.innerHTML = firstValue;

          if (lastValue) { //Level 3 has value
            _appendLevel2(tablerow, workinformations);
            let elem2 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
            elem2.classList.add('hasvalue');
            elem2.innerHTML = lastValue;
          }
          else { //Level 3 is missing
            if (!_isLevel2Null(workinformations)) { // Some workinformation at level are not null
              _appendLevel2(tablerow, workinformations);

              if (config.OperationFromCnc) { //if operation data comme from CNC
                let elem3 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
                elem3.classList.add('nodata');
                elem3.setAttribute('missing', workinformations[n - 1].Kind);
                elem3.innerHTML = 'No Operation';
              }
              else { //if operation data comme from Operator
                let elem3 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
                elem3.classList.add('missing');
                elem3.setAttribute('missing', workinformations[n - 1].Kind);
                elem3.innerHTML = 'Missing Operation';
              }
            }
            else {
              if (config.OperationFromCnc) { //if operation data comme from CNC
                let elem3 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
                elem3.classList.add('nodata');
                elem3.setAttribute('missing', workinformations[n - 1].Kind);
                elem3.innerHTML = 'No Operation';
              }
              else { //if operation data comme from Operator
                let elem3 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
                elem3.classList.add('missing');
                elem3.setAttribute('missing', _getLevel2Kind(workinformations).join(',') + ',' + workinformations[n - 1].Kind);
                elem3.innerHTML = 'Missing Operation';
              }
            }
          }
        }
        else { // Level 1 is missing
          if (lastValue) { //Level 3 has value

            if (!_isLevel2Null(workinformations)) {
              _appendLevel2(tablerow, workinformations);
              let elem4 = tablerow.querySelector('[kind="' + workinformations[0].Kind + '"]');
              elem4.classList.add('missing');
              elem4.setAttribute('missing', workinformations[0].Kind);
              elem4.innerHTML = 'Missing';
            }
            else if (!config.OnePartPerWorkOrder) { //if not only one part is assigned to a WorkOrder
              _appendLevel2(tablerow, workinformations);
              let elem4 = tablerow.querySelector('[kind="' + workinformations[0].Kind + '"]');
              elem4.classList.add('missing');
              elem4.setAttribute('missing', workinformations[0].Kind);
              elem4.innerHTML = 'Missing';
            }
            else {
              let elem4 = tablerow.querySelector('[kind="' + workinformations[0].Kind + '"]');
              elem4.classList.add('missing');
              elem4.setAttribute('missing', workinformations[0].Kind + ',' + _getLevel2Kind(workinformations).join(','));
              elem4.innerHTML = 'Missing';
            }
            let elem5 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
            elem5.classList.add('hasvalue');
            elem5.innerHTML = lastValue;
          }
          else { //Level 3 is missing
            let m = workinformations[0].Kind;
            for (let i = 1; i < workinformations.length; i++) {
              m += ',' + workinformations[i].Kind;
            }
            if (config.OperationFromCnc) { //if operation data comme from CNC
              let elem6 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
              elem6.classList.add('nodata');
              elem6.innerHTML = 'No Operation';
            }
            else { //if operation data come from Operator
              let elem6 = tablerow.querySelector('[kind="' + workinformations[n - 1].Kind + '"]');
              elem6.classList.add('missing');
              elem6.setAttribute('missing', m);
              elem6.innerHTML = 'Missing Operation';
            }
          }
        }
      }

      // Inside  _displayWorkInformations
      function _getLevel2Kind (workinformations) {
        let array = new Array();
        for (let i = 1; i < workinformations.length - 1; i++) {
          array[i - 1] = workinformations[i].Kind;
        }
        return array;
      }
      // Inside  _displayWorkInformations
      function _isLevel2Null (workinformations) {
        for (let i = 1; i < workinformations.length - 1; i++) {
          if (workinformations[i].Value) {
            return false;
          }
        }
        return true;
      }
      // Inside  _displayWorkInformations
      function _appendLevel2 (tablerow, workinformations) {
        for (let i = 1; i < (workinformations.length - 1); i++) {
          let elem = tablerow.querySelector('[kind="' + workinformations[i].Kind + '"]');
          if (workinformations[i].Value) {
            elem.classList.add('hasvalue');
            elem.innerHTML = workinformations[i].Value;
          }
          else {
            elem.classList.add('missing');
            elem.setAttribute('missing', workinformations[i].Kind);
            elem.innerHTML = 'Missing';
          }
        }
      }
    }

    /**
     * @override
     */
    getShortUrl () {
      let url = 'GetListOfOperationSlotV2?Id=' + this.element.getAttribute('machine-id');
      url += '&Begin='
        + pulseUtility.convertDateForWebService(this._range.lower);
      if (this._range.upper) {
        url += '&End='
          + pulseUtility.convertDateForWebService(this._range.upper);
      }
      /*url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);*/
      return url;
    }

    /**
     * Initialize the component
     */
    initialize () {
      this.addClass('pulse-bigdisplay');

      if (!this.element.hasAttribute('machine-id')) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in ReasonSlotListComponent.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }
      this._setAutoRange(); // init _range from attribute

      // Check the range is valid
      if (this.range == undefined) {
        console.error('undefined range');
        //if (this.element.hasAttribute('period-context')) { // NO !!!
        eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'));
        //}
        this.switchToKey('Error', () => this.displayError('undefined range'), () => this.removeError());
        return;
      }
      if (this.range.isEmpty()) {
        console.error('empty range');
        //if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'));
        //}
        this.switchToKey('Error', () => this.displayError('empty range'), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content

      // - x-datetimerange: to leave before all the others (why ?)
      let datetimerangeDiv = document.createElement('div');
      datetimerangeDiv.className = 'workinfoslotlist-datetimerange';
      let xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange', {
        'range': this.range.toString(d => d.toISOString()),
        'period-context': 'WISL' + this.element.getAttribute('machine-id')
        //,'not-editable' : 'true', ???
        //'hide-buttons' :'true' ???
      });
      datetimerangeDiv.appendChild(xdatetimerange);

      let fixedHeaderDiv = document.createElement('div');
      fixedHeaderDiv.className = 'fixed-header';
      let headerLabel1 = document.createElement('div');
      headerLabel1.className = 'workinfoslotlist-header-label';
      headerLabel1.innerHTML = '1. Time range';
      fixedHeaderDiv.appendChild(headerLabel1);
      fixedHeaderDiv.appendChild(datetimerangeDiv);
      let headerLabel2 = document.createElement('div');
      headerLabel2.className = 'workinfoslotlist-header-label';
      headerLabel2.innerHTML = '2. Work informations periods';
      fixedHeaderDiv.appendChild(headerLabel2);

      // - x-operationslotbar + x-highlightperiodsbar
      let operationBar = pulseUtility.createElementWithAttribute('x-operationslotbar', {
        'machine-id': this.element.getAttribute('machine-id'),
        'period-context': 'WISL' + this.element.getAttribute('machine-id'),
        'height': 15,
        'range': this.range.toString(d => d.toISOString())
      });
      let operationBorder = document.createElement('div');
      operationBorder.className = 'pulse-bar-div';
      operationBorder.appendChild(operationBar);
      let barDiv = document.createElement('div');
      barDiv.className = 'workinfoslotlist-bar';
      barDiv.appendChild(operationBorder);
      fixedHeaderDiv.appendChild(barDiv);

      // - table
      let divdata = document.createElement('div');
      divdata.className = 'workinfoslotlist-data';
      // Scrollable-content
      let divScrollable = document.createElement('div');
      divScrollable.className = 'scrollable-content';
      divScrollable.appendChild(divdata);

      // - main
      let maindiv = document.createElement('div');
      maindiv.className = 'workinfoslotlist';
      maindiv.appendChild(fixedHeaderDiv);
      maindiv.appendChild(divScrollable);

      // Create DOM - Loader
      // Original jQuery: `$(this._content).append(loaderDiv)` — `this._content`
      // has never been assigned, so jQuery turned this into a silent no-op.
      // Vanilla `.appendChild` throws on undefined, so we attach the loader to
      // the host element directly (same pattern as x-reasonslotlist).
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      this.element.appendChild(maindiv);

      // listeners / dispatchers
      eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
        'WISL' + this.element.getAttribute('machine-id'),
        this.onDateTimeRangeChange.bind(this));

      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    /**
     * Validates `machine-id` (required, integer) and `range` (required, non-empty).
     * Same checks as initialize() — kept in sync intentionally because the
     * state machine calls initialize() FIRST (and initialize() needs the
     * params validated to build the DOM safely), then validateParameters().
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')),
          () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')),
          () => this.removeError());
        return;
      }
      this._setAutoRange();
      if (this.range == undefined || this.range.isEmpty()) {
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.switchToKey('Error', () => this.displayError('invalid range'), () => this.removeError());
        return;
      }
      this.switchToNextContext();
    }

    /**
     * @override
     */
    refresh (data) {
      /* ??? - Should we add this to restore more significant range  ?
      let newRange = pulseRange.createDateRangeDefaultInclusivity(data.Begin, data.End);
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._range = newRange;
      } */
      /*let divfilter = this.element.querySelector('.workinfoslotlist div.workinfoslotlist-filter').first();
      divfilter.show();*/

      this._table = this.element.querySelector('.workinfoslotlist div.workinfoslotlist-data');
      this._table.replaceChildren();
      this._table.classList.remove('workinfoslotlist-error');
      this._table.classList.add('workinfoslotlist-table');
      this._table.classList.add('pulse-selection-table-container');

      this._data = data;

      // Fill the table
      this.fillTable();

      let datetimerangeDiv = this.element.querySelector('.workinfoslotlist-datetimerange');
      datetimerangeDiv.replaceChildren();
      let xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange',
        {
          'range': this.range.toString(d => d.toISOString()),
          'period-context': 'WISL' + this.element.getAttribute('machine-id')
        });
      datetimerangeDiv.appendChild(xdatetimerange);
    }

    /**
     * @override
     */
    displayError (text) {
      let divfilter = this.element.querySelector('.workinfoslotlist div.workinfoslotlist-filter');
      if (divfilter) divfilter.style.display = 'none';

      this._table = this.element.querySelector('.workinfoslotlist div.workinfoslotlist-data');
      this._table.replaceChildren();
      this._table.classList.remove('workinfoslotlist-table');
      this._table.classList.remove('pulse-selection-table-container');
      this._table.classList.add('workinfoslotlist-error');
      let div = document.createElement('div');
      div.innerHTML = text;
      this._table.appendChild(div);
    }

    /**
     * @override
     */
    removeError () {
      this.displayError('');
    }

    /**
     * @override
     */
    startLoading () {
      let wisl = this.element.querySelector('.workinfoslotlist');
      if (wisl) wisl.style.display = 'none';
      super.startLoading();
      //pulseCustomDialogs.showLoadingDialog(this.component);
    }

    /**
     * @override
     */
    endLoading () {
      //pulseCustomDialogs.hideLoadingDialog(this.component);
      let wisl = this.element.querySelector('.workinfoslotlist');
      if (wisl) wisl.style.display = '';
      super.endLoading();
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      // Bail if our host is no longer in the document — see x-classifiedreasonslotlist
      // for the full rationale (zombie listener race between dialog close and
      // dispatched event). Match x-barstack:109 convention.
      if (!this.element || !this.element.isConnected) return;
      let newRange = event.target.daterange;

      if (!pulseRange.equals(newRange, this._range, (a, b) => a.getTime() == b.getTime())) {
        this._range = newRange;
        // this.start(); NO ! No need to call intitialize again
        this.switchToContext('Reload');
      }
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event
     */
    /*onReload (event) {
      this._reloadOrClose();
    }*/

    _getRangeWithCurrent (range, current) {
      let r;
      if (typeof range == 'string') {
        r = pulseRange.createDateRangeFromString(range);
      }
      else {
        r = range;
      }
      if (current == 'true') {
        return pulseRange.createDateRangeDefaultInclusivity(r.lower, null);
      }
      else {
        return r;
      }
    }

    _getRangeFromRowWithCurrent (row) {
      let range = row.getAttribute('range');
      let current = row.getAttribute('current');
      return this._getRangeWithCurrent(range, current);
    }
  }

  pulseComponent.registerElement('x-workinfoslotlist', ReasonSlotListComponent, ['machine-id', 'range']);
})();
