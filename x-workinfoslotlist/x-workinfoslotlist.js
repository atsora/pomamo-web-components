// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Code Review : 2014 nov
 * @module x-workinfoslotlist
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:pulseCustomDialog
 * @requires module:x-savereason
 * @requires module:x-datetimerange
 * @requires module:x-reasonslotbar
 * @requires module:x-highlightperiodsbar
 */

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
//var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
//var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

//require('x-reasonslotbar/x-reasonslotbar');
require('x-operationslotbar/x-operationslotbar');

//require('x-savereason/x-savereason');
require('x-datetimerange/x-datetimerange');
require('x-highlightperiodsbar/x-highlightperiodsbar');


(function () {
  /**
   * Reason slot list component
   *
   * @extends module:pulseComponent~PulseSingleRequestComponent
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
      //self._xsaveReason = null;

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
      this._table.empty();
      if (this._xsaveReason != null) {
        this._xsaveReason[0].cleanRanges();
      }
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
        return bRange.lower.getTime() - aRange.lower.getTime(); // Du plus récent au plus ancien
      });

      for (let item of this._data.List) {
        // + Filter ?

        ++this._numberOfDisplayedItems;

        /*let tmpRange = item.Range;
        let range = pulseRange.createDateRangeFromString(tmpRange);*/
        let tmpRange = pulseRange.createDateRangeDefaultInclusivity(item.Begin, item.End);

        let tr = $('<div></div>')//.addClass('selectable')
          .addClass('workinfoslotlist-tr')
          .attr({
            'operationslot-id': item.OperationSlotId,
            'begin': item.Begin,
            'end': item.End,
            'range': pulseUtility.convertDateRangeForWebService(tmpRange)
          });

        /*let tdCheck = ($('<div></div>').addClass('workinfoslotlist-td-check'));
        if (item.IsSelectable == undefined || item.IsSelectable) {
          tdCheck.append($("<input type='checkbox'></input>").addClass('table-check'));
        }*/

        /*let tdReasonButton = $('<div></div>').addClass('workinfoslotlist-td-icon');
        if (catId > 0) {
          let svg = pulseSvg.getMachineMode....
        }*/

        let displayedRange = pulseUtility.displayDateRange(tmpRange);
        let tdRange = $('<div></div>').html(displayedRange)
          .addClass('workinfoslotlist-td-range');
        //.addClass('workinfoslotlist-td-click-change');
        let desc = $('<div></div>').addClass('workinfoslotlist-td-desc').append(tdRange);

        for (let workinfo of item.WorkInformations) {
          let textbox = $('<div></div>').attr('kind', workinfo.Kind)
            .addClass('workinfoslotlist-td-workinfo')
            .html('...');
          desc.append(textbox);
        }
        tr.append(desc);
        this._table.append(tr);

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
          tablerow.find('[kind="' + workinformations[0].Kind + '"]')
            .addClass('hasvalue') // selectable')
            .html(firstValue);

          if (lastValue) { //Level 3 has value
            _appendLevel2(tablerow, workinformations);
            tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
              .addClass('hasvalue') // selectable')
              .html(lastValue);
          }
          else { //Level 3 is missing
            if (!_isLevel2Null(workinformations)) { // Some workinformation at level are not null
              _appendLevel2(tablerow, workinformations);

              if (config.OperationFromCnc) { //if operation data comme from CNC
                tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
                  .addClass('nodata')
                  .attr('missing', workinformations[n - 1].Kind)
                  .html('No Operation');
              }
              else { //if operation data comme from Operator
                tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
                  .addClass('missing') // selectable')
                  .attr('missing', workinformations[n - 1].Kind)
                  .html('Missing Operation');
              }
            }
            else {
              if (config.OperationFromCnc) { //if operation data comme from CNC
                tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
                  .addClass('nodata')
                  .attr('missing', workinformations[n - 1].Kind)
                  .html('No Operation');
              }
              else { //if operation data comme from Operator
                tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
                  .addClass('missing') // selectable')
                  .attr('missing', _getLevel2Kind(workinformations).join(',') + ',' + workinformations[n - 1].Kind)
                  .html('Missing Operation');
              }
            }
          }
        }
        else { // Level 1 is missing
          if (lastValue) { //Level 3 has value

            if (!_isLevel2Null(workinformations)) {
              _appendLevel2(tablerow, workinformations);
              tablerow.find('[kind="' + workinformations[0].Kind + '"]')
                .addClass('missing') // selectable')
                .attr('missing', workinformations[0].Kind)
                .html('Missing');
            }
            else if (!config.OnePartPerWorkOrder) { //if not only one part is assigned to a WorkOrder
              _appendLevel2(tablerow, workinformations);
              tablerow.find('[kind="' + workinformations[0].Kind + '"]')
                .addClass('missing') // selectable')
                .attr('missing', workinformations[0].Kind)
                .html('Missing');
            }
            else {
              tablerow.find('[kind="' + workinformations[0].Kind + '"]')
                .addClass('missing') // selectable')
                .attr('missing', workinformations[0].Kind + ',' + _getLevel2Kind(workinformations).join(','))
                .html('Missing');
            }
            tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
              .addClass('hasvalue') // selectable')
              .html(lastValue);
          }
          else { //Level 3 is missing
            let m = workinformations[0].Kind;
            for (let i = 1; i < workinformations.length; i++) {
              m += ',' + workinformations[i].Kind;
            }
            if (config.OperationFromCnc) { //if operation data comme from CNC
              tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
                .addClass('nodata')
                .html('No Operation');
            }
            else { //if operation data come from Operator
              tablerow.find('[kind="' + workinformations[n - 1].Kind + '"]')
                .addClass('missing') // selectable')
                .attr('missing', m)
                .html('Missing Operation');
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
          if (workinformations[i].Value) {
            tablerow.find('[kind="' + workinformations[i].Kind + '"]')
              .addClass('hasvalue') // selectable')
              .html(workinformations[i].Value);
          }
          else {
            tablerow.find('[kind="' + workinformations[i].Kind + '"]')
              .addClass('missing') // selectable')
              .attr('missing', workinformations[i].Kind)
              .html('Missing');
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
        this.switchToKey('Error', () => this.displayError('missing machine-id'), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in ReasonSlotListComponent.element');
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
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
      $(this.element).empty();

      // Create DOM - Content

      // - x-datetimerange: to leave before all the others (why ?)
      let datetimerangeDiv = $('<div></div>').addClass('workinfoslotlist-datetimerange');
      let xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'range': this.range.toString(d => d.toISOString()),
        'period-context': 'WISL' + this.element.getAttribute('machine-id')
        //,'not-editable' : 'true', ???
        //'hide-buttons' :'true' ???
      });
      datetimerangeDiv.append(xdatetimerange);

      let fixedHeaderDiv = $('<div></div>').addClass('fixed-header')
        .append('<div class="workinfoslotlist-header-label">1. Time range</div>')
        //.append('<div class="workinfoslotlist-header-label">1. Select a time range</div>')
        .append(datetimerangeDiv)
        .append('<div class="workinfoslotlist-header-label">2. Work informations periods</div>');
      //.append('<div class="workinfoslotlist-header-label">2. Select one work information periods</div>');

      // - x-operationslotbar + x-highlightperiodsbar
      let operationBar = pulseUtility.createjQueryElementWithAttribute('x-operationslotbar', {
        'machine-id': this.element.getAttribute('machine-id'),
        'period-context': 'WISL' + this.element.getAttribute('machine-id'),
        'height': 15,
        'range': this.range.toString(d => d.toISOString())
      });
      let operationBorder = $('<div></div>').addClass('pulse-bar-div').append(operationBar);
      let barDiv = $('<div></div>').addClass('workinfoslotlist-bar')
        .append(operationBorder);//.append(highlightBar);
      fixedHeaderDiv.append(barDiv);

      // - table
      let divdata = $('<div></div>')
        .addClass('workinfoslotlist-data');
      // Scrollable-content
      let divScrollable = $('<div></div>').addClass('scrollable-content')
        .append(divdata);

      // Warning "No selectable periods in the specified range"
      /*let warningDiv = $('<div></div>').addClass('workinfoslotlist-warning').html('No selectable periods on the specified range');*/

      // - main
      let maindiv = $('<div></div>')
        .addClass('workinfoslotlist')
        .append(fixedHeaderDiv)
        //.append(topDiv)
        .append(divScrollable);
      //.append(warningDiv);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      $(this.element).append(maindiv);

      // listeners / dispatchers
      eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
        'WISL' + this.element.getAttribute('machine-id'),
        this.onDateTimeRangeChange.bind(this));

      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      
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
     * @override
     */
    refresh (data) {
      /* ??? - Should we add this to restore more significant range  ?
      let newRange = pulseRange.createDateRangeDefaultInclusivity(data.Begin, data.End);
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._range = newRange;
      } */
      /*let divfilter = $(this.element).find('.workinfoslotlist div.workinfoslotlist-filter').first();
      divfilter.show();*/

      this._table = $(this.element).find('.workinfoslotlist div.workinfoslotlist-data').first();
      this._table.empty()
        .removeClass('workinfoslotlist-error')
        .addClass('workinfoslotlist-table  pulse-selection-table-container');

      this._data = data;

      // Fill the table
      this.fillTable();

      let datetimerangeDiv = $(this.element).find('.workinfoslotlist-datetimerange');
      datetimerangeDiv.empty();
      let xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange',
        {
          'range': this.range.toString(d => d.toISOString()),
          'period-context': 'WISL' + this.element.getAttribute('machine-id')
        });
      datetimerangeDiv.append(xdatetimerange);
    }

    /**
     * @override
     */
    displayError (text) {
      let divfilter = $(this.element).find('.workinfoslotlist div.workinfoslotlist-filter').first();
      divfilter.hide();

      this._table = $(this.element).find('.workinfoslotlist div.workinfoslotlist-data').first();
      this._table.empty()
        .removeClass('workinfoslotlist-table pulse-selection-table-container')
        .addClass('workinfoslotlist-error');
      this._table.append('<div>' + text + '</div>');
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
      $(this.element).find('.workinfoslotlist').hide();
      super.startLoading();
      //pulseCustomDialogs.showLoadingDialog($(this.component));
    }

    /**
     * @override
     */
    endLoading () {
      //pulseCustomDialogs.hideLoadingDialog($(this.component));
      $(this.element).find('.workinfoslotlist').show();
      super.endLoading();
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
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
      let range = $(row).attr('range');
      let current = $(row).attr('current');
      return this._getRangeWithCurrent(range, current);
    }
  }

  pulseComponent.registerElement('x-workinfoslotlist', ReasonSlotListComponent, ['machine-id', 'range']);
})();
