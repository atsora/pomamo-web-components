// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Code Review : 2014 nov
 * @module x-reasonslotlist
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
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

require('x-reasonslotbar/x-reasonslotbar');

require('x-savereason/x-savereason');
require('x-datetimerange/x-datetimerange');
require('x-highlightperiodsbar/x-highlightperiodsbar');
require('x-revisionprogress/x-revisionprogress');


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
      self._numberOfSelectableItems = 0;
      self._skipList = false; // If there is a unique period, skip the list and update the reason
      self._firstLoad = true;
      self._xsaveReason = null;

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      self.methods = {
        removeAllSelections: self.removeAllSelections
      };

      return self;
    }

    /**
     * Associated range in native Javascript Date
     *
     * @return {pulseRange:DateRange} Current range in native Javascript Date
     */
    get range() { return this._range; }
    _setAutoRange() {
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
    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': {
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              'RSL' + newVal,
              this.onDateTimeRangeChange.bind(this));
          }

          // For progress : update _mapOfModifications
          let modifMgr = $('body').find('x-modificationmanager');
          if (modifMgr.length == 1) {
            this._mapOfModifications = modifMgr[0].getModifications('reason',
              this.element.getAttribute('machine-id'));

            // + REMOVE others with old machineid ? + create progress ? -> TODO later !
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

    cleanTable(table) {
      this._table.empty();
      if (this._xsaveReason != null) {
        this._xsaveReason[0].cleanReasons();
      }
    }

    fillTable() {
      this.cleanTable();

      if (this._dataReasonsList.length == 0) {
        return;
      }

      let showAllIdle = $(this._allIdleCheckbox).is(':checked');
      let showMotion = $(this._motionCheckbox).is(':checked');

      this._numberOfDisplayedItems = 0;
      this._numberOfSelectableItems = 0;

      let evt; // for selection
      this._dataReasonsList.sort(function (a, b) {
        let aRange = pulseRange.createDateRangeFromString(a.Range);
        let bRange = pulseRange.createDateRangeFromString(b.Range);
        return bRange.lower.getTime() - aRange.lower.getTime(); // Du plus récent au plus ancien
      });
      for (let item of this._dataReasonsList) { // WAS this._dataReasonsList.reverse()) {
        // Filter
        if (item.Running) {
          if (!showMotion) {
            continue; // Hide Motion if asked
          }
        }
        else { // Not running
          if (!item.OverwriteRequired && !showAllIdle) {
            continue; // Hide others idle
          }
        }
        ++this._numberOfDisplayedItems;
        //lastItem = item;
        let rangeString = item.Range;

        if (item.Current == true) { // Bug in webservice? -> remove end
          let tmpRange = pulseRange.createDateRangeFromString(rangeString);
          rangeString = pulseUtility.createDateRangeForWebService(tmpRange.lower);
        }

        let range = pulseRange.createDateRangeFromString(rangeString);
        let display = item.Display;
        let details = item.Details;
        if (details) {
          display += ' (' + details + ')';
        }

        // fill machineModeDisplay
        let machineModeDisplay = '';
        let catId = -2; // Not defined
        for (let mode of item.MachineModes) {
          machineModeDisplay += mode.Display + ',';
          if (catId == -2)
            catId = mode.Category.Id;
          else if (catId != -1 && catId != mode.Category.Id)
            catId = -1; // multiple values
        }
        let len = machineModeDisplay.length;
        if ((machineModeDisplay.length > 0) &&
          (machineModeDisplay.substr(len - 1, 1) == ',')) {
          machineModeDisplay = machineModeDisplay.substring(0, len - 1);
        }
        let tr = $('<div></div>').addClass('selectable').addClass('reasonslotlist-tr');

        let attributeTr = {
          'range': rangeString,
          'reason-text': item.Display,
          'mode': machineModeDisplay,
          'current': item.Current,
          'is-default': item.DefaultReason,
          'is-running': item.Running,
          'is-selectable': item.IsSelectable
        };

        if (item.Details) {
          attributeTr['details'] = item.Details;
        }

        tr.attr(attributeTr);

        //if (item.Current == true) { // range.upper should be null
        let displayedRange = pulseUtility.displayDateRange(range);

        let tdCheck = $('<div></div>').addClass('reasonslotlist-td-check');
        if (item.IsSelectable == undefined || item.IsSelectable) {
          tdCheck.append($("<input type='checkbox'></input>").addClass('table-check'));
        }
        tdCheck.click(
          function (e) {
            this.checkBoxClick(e);
          }.bind(this)
        );

        let tdReasonButton = $('<div></div>').addClass('reasonslotlist-td-icon');
        if (catId > 0) {
          // New div for svg
          let svgDiv = $('<div></div>').addClass('reasonslotlist-reason-svg');
          let modeClass = pulseSvg.getMachineModeClass(catId);
          svgDiv.addClass(modeClass);
          svgDiv.css('color', item.BgColor);
          tdReasonButton.append(svgDiv);
          pulseSvg.inlineBackgroundSvg(svgDiv);
        }
        let tdRange = $('<div></div>').html(displayedRange)
          .addClass('reasonslotlist-td-range')
          .addClass('reasonslotlist-td-click-change');
        let textbox = $('<div></div>').html(display).addClass('reasonslotlist-td-reason')
          .addClass('reasonslotlist-td-click-change')
          .attr('title', machineModeDisplay);
        let desc = $('<div></div>').addClass('reasonslotlist-td-desc').append(tdRange).append(textbox);
        if (item.OverwriteRequired) {
          textbox.addClass('overwrite-required missing');
        }
        tdRange.click(
          function (e) {
            this.rowClick(e);
          }.bind(this)
        );
        textbox.click(
          function (e) {
            this.rowClick(e);
          }.bind(this)
        );

        tr.append(tdReasonButton).append(tdCheck).append(desc);
        this._table.append(tr);

        if (item.IsSelectable) {
          ++this._numberOfSelectableItems;
          if (1 == this._numberOfSelectableItems) {
            evt = { target: tr };
          }
        }

        // Manage progress
        let rangeRow = pulseRange.createDateRangeFromString(rangeString);
        let modif = this._getRangeInModifications(rangeRow);
        if (null != modif) {
          let newRevisionProgress =
            pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
              'revision-id': modif.revisionid,
              'machine-id': modif.machineid,
              'kind': modif.kind,
              'revision-range': pulseUtility.convertDateRangeForWebService(rangeRow),
              'steps': modif.initModifications,
              'remaining': modif.pendingModifications
            });
          $(desc).append(newRevisionProgress);
        }
      }

      this._skipList = false;

      if (1 == this._numberOfSelectableItems) {
        if (//this._firstLoad&&
          this.element.hasAttribute('skip1periodlist')
          && this.element.getAttribute('skip1periodlist')) {
          this._skipList = true;
        }
        // select the only possibility + simulate CLICK
        if (!pulseUtility.isNotDefined(evt)) {
          this.checkBoxClick(evt);
        }
      }
      if (this._xsaveReason != null) {
        this._xsaveReason[0].closeAfterSave(this._skipList);
      }
      this._firstLoad = false;
    }

    _getXSaveReason() {
      if (!pulseUtility.isNotDefined(this._xsaveReason)) {
        return this._xsaveReason;
      }

      if (this.element.hasAttribute('demo'))
        return;

      // create PAGE 2 -> done before for good display
      let dialogbox2 = $('<div></div>').addClass('dialog-savereason-page2')
        .append(`<div class="reasonslotlist-header-label">3. ${this.getTranslation('sectionReasonTitle', 'Apply a reason on the selected period(s)')}</div>`);
      let xsaveReason = pulseUtility.createjQueryElementWithAttribute('x-savereason', {
        'machine-id': $(this.element).attr('machine-id')
      });
      dialogbox2.append(xsaveReason);
      this._xsaveReason = xsaveReason;
      this._xsaveReason[0].closeAfterSave(this._skipList);

      pulseCustomDialog.addPage('.dialog-savereason', dialogbox2);
      return this._xsaveReason;
    }

    _reloadOrClose() {
      if ($('.dialog-savereason').length == 0)
        return; // dialog has been closed. Stop refreshing !

      if (this._skipList) {
        // Close main dialog
        pulseCustomDialog.close('.dialog-savereason');
      }
      else {
        // Go back to first page
        pulseCustomDialog.goToPage('.dialog-savereason', 0);

        $(this.element).find('x-highlightperiodsbar').get(0).cleanRanges();
        this.switchToContext('Reload');
      }
    }

    /**
     * @override
     */
    getShortUrl() {
      let url = 'ReasonOnlySlots?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
      url += '&SelectableOption=true';
      if (this.stateContext == 'Reload') {
        url += '&Cache=No';
      }
      return url;
    }

    /**
     * Initialize the component
     */
    initialize() {
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
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.switchToKey('Error', () => this.displayError('undefined range'), () => this.removeError());
        return;
      }
      if (this.range.isEmpty()) {
        console.error('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }

        this.switchToKey('Error', () => this.displayError('empty range'), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content

      // - x-datetimerange: to leave before all the others (why ?)
      let datetimerangeDiv = $('<div></div>').addClass('reasonslotlist-datetimerange');
      let xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'range': this.range.toString(d => d.toISOString()),
        'period-context': 'RSL' + this.element.getAttribute('machine-id')
        //,'not-editable' : 'true', ???
        //'hide-buttons' :'true' ???
      });
      datetimerangeDiv.append(xdatetimerange);

      let fixedHeaderDiv = $('<div></div>').addClass('fixed-header')
        .append(`<div class="reasonslotlist-header-label">1. ${this.getTranslation('sectionTimeRangeTitle', 'Select a time range')}</div>`)
        .append(datetimerangeDiv)
        .append(`<div class="reasonslotlist-header-label">2. ${this.getTranslation('sectionPeriodTitle', 'Select one or more periods')}</div>`);

      // - x-reasonslotbar + x-highlightperiodsbar
      let reasonBar = pulseUtility.createjQueryElementWithAttribute('x-reasonslotbar', {
        'machine-id': this.element.getAttribute('machine-id'),
        'period-context': 'RSL' + this.element.getAttribute('machine-id'),
        'height': 15,
        'range': this.range.toString(d => d.toISOString()),
        'showoverwriterequired': false,
        'click-to-change-reason': false
      });
      let reasonBorder = $('<div></div>').addClass('pulse-bar-div').append(reasonBar);
      let highlightBar = pulseUtility.createjQueryElementWithAttribute('x-highlightperiodsbar', {
        'period-context': 'RSL' + this.element.getAttribute('machine-id'),
        'height': 6,
        'range': this.range.toString(d => d.toISOString())
      });
      let barDiv = $('<div></div>').addClass('reasonslotlist-bar')
        .append(reasonBorder).append(highlightBar);
      fixedHeaderDiv.append(barDiv);

      // - filter
      this._allIdleCheckbox = $("<input type='checkbox' id='reasonslotlist-allidle-checkbox' name='idle' value='AllIdle'>").html(this.getTranslation('idle', 'Idle'));
      let allIdlelabel = $("<label for='reasonslotlist-allidle-checkbox'></label>")
        .append(this.getTranslation('optionIdentified', 'Show identified idle periods'));
      this._motionCheckbox = $("<input type='checkbox' id='reasonslotlist-motion-checkbox' name='motion' value='AllMotion'>").html(this.getTranslation('motion', 'Motion'));
      let motionlabel = $("<label for='reasonslotlist-motion-checkbox'></label>")
        .append(this.getTranslation('optionRunning', 'Show running periods'));
      // Change check -> Call Fill Table
      this._allIdleCheckbox.change(function () {
        //let checked = $(this.element).is(':checked');
        //this._onlyOverwriteRequired = !checked;
        // Remove selection in bar
        $(this.element).find('x-highlightperiodsbar').get(0).cleanRanges();
        if (this._xsaveReason != null) {
          this._xsaveReason[0].cleanReasons();
        }
        // Fill table (no-load needed)
        this.fillTable();
      }.bind(this));

      this._motionCheckbox.change(function () {
        // Remove selection in bar
        $(this.element).find('x-highlightperiodsbar').get(0).cleanRanges();
        if (this._xsaveReason != null) {
          this._xsaveReason[0].cleanReasons();
        }
        // Fill table (no-load needed)
        this.fillTable();
      }.bind(this));

      let divfilter = $('<div></div>')
        .addClass('reasonslotlist-filter')
        .append(this._allIdleCheckbox).append(allIdlelabel)
        .append(this._motionCheckbox).append(motionlabel);

      let topDiv = $('<div></div>')
        .addClass('reasonslotlist-top-div')
        .append(divfilter);

      // - table
      let divdata = $('<div></div>')
        .addClass('reasonslotlist-data');
      // Scrollable-content
      let divScrollable = $('<div></div>').addClass('scrollable-content')
        .append(divdata);

      // Warning "No selectable periods in the specified range"
      let warningDiv = $('<div></div>').addClass('reasonslotlist-warning').html('No selectable periods on the specified range');

      // - main
      let maindiv = $('<div></div>')
        .addClass('reasonslotlist')
        .append(fixedHeaderDiv)
        .append(topDiv)
        .append(divScrollable)
        .append(warningDiv);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loading', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      $(this.element).append(maindiv);

      // listeners / dispatchers
      eventBus.EventBus.addEventListener(this,
        'dateTimeRangeChangeEvent',
        'RSL' + this.element.getAttribute('machine-id'),
        this.onDateTimeRangeChange.bind(this));

      // Get modifications and create listener
      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('reason',
          this.element.getAttribute('machine-id'));

        // TODO Later + create progress ?
      }
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      this.switchToNextContext();
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      this._allIdleCheckbox = undefined;
      this._motionCheckbox = undefined;
      this._allIdleCheckbox = undefined;
      this._xsaveReason = null;
      //this._messageSpan = undefined;

      super.clearInitialization();
    }

    reset() { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this.?

      this.switchToNextContext();
    }

    /**
     * @override
     */
    refresh(data) {
      let divfilter = $(this.element).find('.reasonslotlist div.reasonslotlist-filter').first();
      divfilter.show();

      this._table = $(this.element).find('.reasonslotlist div.reasonslotlist-data').first();
      this._table.empty()
        .removeClass('reasonslotlist-error')
        .addClass('reasonslotlist-table  pulse-selection-table-container');
      this._dataReasonsList = data.ReasonOnlySlots

      // Prepare the visibility of elements
      let hasSelectableNonIdentified = false;
      let hasSelectableIdentified = false;
      let hasSelectableMotion = false;
      for (let item of this._dataReasonsList) {
        if (item.IsSelectable == undefined || item.IsSelectable) {
          hasSelectableNonIdentified |= (!item.Running && item.OverwriteRequired);
          hasSelectableIdentified |= (!item.Running && !item.OverwriteRequired);
          hasSelectableMotion |= item.Running;
        }
      }

      if (!hasSelectableNonIdentified) {
        $(this._allIdleCheckbox)[0].checked = true;
        if (!hasSelectableIdentified)
          $(this._motionCheckbox)[0].checked = true;
      }

      // Warning "No selectable periods in the specified range"
      if (!hasSelectableNonIdentified && !hasSelectableIdentified && !hasSelectableMotion) {
        $(this.element).find('.reasonslotlist-warning').show();
      }
      else {
        $(this.element).find('.reasonslotlist-warning').hide();
      }

      // Fill the table
      this.fillTable();

      let datetimerangeDiv = $(this.element).find('.reasonslotlist-datetimerange');
      datetimerangeDiv.empty();
      let xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange',
        {
          'range': this.range.toString(d => d.toISOString()),
          'period-context': 'RSL' + this.element.getAttribute('machine-id')
        });
      datetimerangeDiv.append(xdatetimerange);

      // Prepare page 2 if not done
      this._getXSaveReason();
    }

    /**
     * @override
     */
    displayError(text) {
      let divfilter = $(this.element).find('.reasonslotlist div.reasonslotlist-filter').first();
      divfilter.hide();

      this._table = $(this.element).find('.reasonslotlist div.reasonslotlist-data').first();
      this._table.empty()
        .removeClass('reasonslotlist-table pulse-selection-table-container')
        .addClass('reasonslotlist-error');
      this._table.append('<div>' + text + '</div>');
    }

    /**
     * @override
     */
    removeError() {
      this.displayError('');
    }

    /**
     * @override
     */
    startLoading() {
      $(this.element).find('.reasonslotlist').hide();
      super.startLoading();
      //pulseCustomDialogs.showLoadingDialog($(this.component));
    }

    /**
     * @override
     */
    endLoading() {
      //pulseCustomDialogs.hideLoadingDialog($(this.component));
      $(this.element).find('.reasonslotlist').show();
      super.endLoading();
    }

    /** Check if range is in modification list */
    /*_isRangeInModifications (range) {
      for (let modif of this._mapOfModifications) { // kind, machineid == ok
        for (let i = 0; i < modif[1].ranges.length; i++) {
          if (pulseRange.overlaps(modif[1].ranges[i], range)) {
            if (modif[1].pendingModifications != 0)
              return true;
          }
        }
      }
      return false;
    }*/

    /** Check if range is in modification list AND get it ! */
    _getRangeInModifications(range) {
      for (let modif of this._mapOfModifications) { // kind, machineid == ok
        for (let i = 0; i < modif[1].ranges.length; i++) {
          if (pulseRange.overlaps(modif[1].ranges[i], range)) {
            if (modif[1].pendingModifications != 0)
              return modif[1];
          }
        }
      }
      return null;
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;
      // TODO use event.target.range
      if (!pulseRange.equals(newRange, this._range, (a, b) => a.getTime() == b.getTime())) {
        this._range = newRange;

        this.element.setAttribute('skip1periodlist', 'false');
        if (this._xsaveReason != null) {
          this._xsaveReason[0].closeAfterSave(false);
        }

        this.start();
      }
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revisionid, machineid, kind, range, 
     * initModifications: undefined, // pending modifications the first time
     * pendingModifications: undefined // pending modifications 'now'
     */
    onModificationEvent(event) {
      let modif = event.target;
      if (event.target.kind != 'reason') {
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
        // First time -> create progress barS
        for (let iModif = 0; iModif < modif.ranges.length; iModif++) {

          // Find associated range.s
          let rows = $(this.element).find('.reasonslotlist-tr');
          for (let iRow = 0; iRow < rows.length; iRow++) {
            let rangeRowStr = $(rows[iRow]).attr('range');
            let rangeRow = pulseRange.createDateRangeFromString(rangeRowStr);
            if (pulseRange.overlaps(modif.ranges[iModif], rangeRow)) {
              let newRevisionProgress =
                pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
                  'revision-id': modif.revisionid,
                  'machine-id': modif.machineid,
                  'kind': modif.kind,
                  'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[iModif])
                });
              $(rows[iRow]).find('.reasonslotlist-td-desc').append(newRevisionProgress);
            }
          }
        }
      }
      if (event.target.pendingModifications == 0) {
        this._mapOfModifications.delete(modif.revisionid);

        for (let i = 0; i < event.target.ranges.length; i++) {
          if (pulseRange.overlaps(event.target.ranges[i], this._range)) {
            this.switchToContext('Reload');
            return;
          }
        }
      }
      // else = do nothing (progress en cours)
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event
     */
    /*    onReload (event) {
          this._reloadOrClose();
        }*/

    _getRangeWithCurrent(range, current) {
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

    _getRangeFromRowWithCurrent(row) {
      let range = $(row).attr('range');
      let current = $(row).attr('current');
      return this._getRangeWithCurrent(range, current);
    }

    removeAllSelections() {
      let rows = $(this.element).find('.reasonslotlist-tr');

      for (let i = 0; i < rows.length; i++) {
        let tdCheck = $(rows[i]).find('input[type=checkbox]').first();
        if ($(tdCheck).length > 0)
          $(tdCheck)[0].checked = false;

        $(rows[i]).removeClass('row-selected');

        let isDefault = $(rows[i]).attr('is-default');
        if (isDefault == 'false') {
          $(rows[i]).removeClass('row-notdefault-selected');
        }

      }
      let xSR = this._getXSaveReason();
      if (xSR != null) { // No dialog in a testing environment
        xSR[0].cleanReasons();
      }
      let highlightBar = $(this.element).find('x-highlightperiodsbar');
      highlightBar.get(0).cleanRanges();
    }

    // DOM Events

    /**
     * DOM event callback triggered on check box click
     *
     * @param {event} e - DOM event
     */
    checkBoxClick(e) {
      let row = $(e.target).closest('.reasonslotlist-tr');
      let tdCheck = row.find('input[type=checkbox]');//.first();
      if (this._firstLoad) {
        if ($(tdCheck).length > 0)
          $(tdCheck)[0].checked = true; // pour afficher le check
        //checked = true; // fait ci-dessous
      }
      let checked = $(tdCheck).is(':checked');
      let highlightBar = $(this.element).find('x-highlightperiodsbar');
      let rangeString = $(row).attr('range');
      let range = pulseRange.createDateRangeFromString(rangeString);
      let isDefault = $(row).attr('is-default');
      let reasonSelected = {
        range: rangeString,
        reason: $(row).attr('reason-text'),
        mode: $(row).attr('mode'),
      }
      if ($(row).attr('details')) {
        reasonSelected.details = $(row).attr('details');
      }

      if (checked) {
        row.addClass('row-selected');
        highlightBar.get(0).addRange(range);
        let xSR = this._getXSaveReason();
        if (xSR != null) { // No dialog in a testing environment
          xSR[0].addReason(reasonSelected);
          if (isDefault == 'false') {
            row.addClass('row-notdefault-selected');
          }
        }
      }
      else {
        row.removeClass('row-selected');
        highlightBar.get(0).removeRange(range);
        let xSR = this._getXSaveReason();
        if (xSR != null) { // No dialog in a testing environment
          xSR[0].removeReason(reasonSelected);
          if (isDefault == 'false') {
            row.removeClass('row-notdefault-selected');
          }
        }
      }
    }

    /**
     * DOM event callback triggered on a row click
     *
     * @param {event} e - DOM event
     */
    rowClick(e) {
      let row = $(e.target).closest('.reasonslotlist-tr');
      let isSelectable = $(row).attr('is-selectable');
      if (isSelectable == 'false') {
        return;
      }
      // toggle == click on check
      let tdCheck = row.find('input[type=checkbox]').first();
      $(tdCheck).click();
    }

  }

  pulseComponent.registerElement('x-reasonslotlist', ReasonSlotListComponent, ['machine-id', 'range']);
})();
