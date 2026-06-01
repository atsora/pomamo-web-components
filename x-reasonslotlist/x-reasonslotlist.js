// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
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

require('x-barstack/x-barstack');

require('x-savereason/x-savereason');
require('x-datetimerange/x-datetimerange');
require('x-revisionprogress/x-revisionprogress');


(function () {

  /**
   * `<x-reasonslotlist>` — scrollable list of reason slots for one machine
   * in a date range, with per-slot reason editing.
   *
   * Fetches `ReasonOnlySlots?MachineId=<id>&Range=<range>&SelectableOption=true`
   * and renders one row per slot with a color indicator, duration and
   * reason label. Selecting one or more rows opens an `x-savereason`
   * dialog (via `pulseCustomDialog`) to change the reason; when a single
   * slot is in range the list step is skipped and the dialog opens
   * directly. Display mode (`only-overwrite-required` / `force-all` /
   * default) filters which slots are listed. Pending revisions of
   * `kind: 'reason'` for the current machine append an
   * `x-revisionprogress` over the affected sub-range. Reacts to
   * `dateTimeRangeChangeEvent` on `period-context` and to
   * `machineIdChangeSignal` on `machine-context`.
   *
   * @element x-reasonslotlist
   * @attr {number} machine-id      (required) machine id
   * @attr {string} range           ISO datetime range `begin;end`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @method removeAllSelections    clear the selection from the slot list
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
      self._numberOfSelectableItems = 0;
      self._skipList = false; // If there is a unique period, skip the list and update the reason
      self._firstLoad = true;
      self._xsaveReason = null;
      self._displayMode = undefined; // display mode: "only-overwrite-required", "force-all", or undefined
      self._displayModeInitialized = false;

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      self._mapOfModifications = new Map();

      self.methods = {
        removeAllSelections: self.removeAllSelections
      };

      return self;
    }

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
              'reasonslotlist',
              this.onDateTimeRangeChange.bind(this));
          }

          let modifMgr = document.querySelector('body x-modificationmanager');
          if (modifMgr) {
            this._mapOfModifications = modifMgr.getModifications('reason',
              this.element.getAttribute('machine-id'));
          }

          this.start();
        } break;
        case 'range': {
          this._setAutoRange();
          this.start();
        } break;
        case 'display-mode': {
          this._displayMode = newVal;
          if (this.isInitialized()) {
            this._applyDisplayMode();
          }
        } break;
        default:
          break;
      }
    }

    cleanTable(table) {
      this._table.replaceChildren();
      if (this._xsaveReason != null) {
        this._xsaveReason.cleanReasons();
      }
    }

    _isForceAllEnabled() {
      return this._displayMode === 'force-all';
    }

    _applyDisplayMode() {
      if (!this._allIdleCheckbox) {
        return;
      }

      if (this._displayModeInitialized) {
        return;
      }

      if (this._displayMode === 'force-all') {
        // Initialization only: start with all shown
        this._allIdleCheckbox.checked = true;
      } else if (this._displayMode === 'only-overwrite-required') {
        // Initialization only: start with non-classified only
        this._allIdleCheckbox.checked = false;
      }

      // Checkbox must always remain user-accessible
      this._allIdleCheckbox.disabled = false;
      this._displayModeInitialized = true;
    }

    fillTable() {
      this.cleanTable();

      let showAllIdle = this._allIdleCheckbox.checked;
      let showMotion = this._motionCheckbox.checked;

      this._numberOfDisplayedItems = 0;
      this._numberOfSelectableItems = 0;

      let evt;
      this._dataReasonsList.sort(function (a, b) {
        let aRange = pulseRange.createDateRangeFromString(a.Range);
        let bRange = pulseRange.createDateRangeFromString(b.Range);
        return bRange.lower.getTime() - aRange.lower.getTime();
      });
      for (let item of this._dataReasonsList) {
        if (item.Running) {
          if (!showMotion) {
            continue;
          }
        }
        else {
          if (!item.OverwriteRequired && !showAllIdle) {
            continue;
          }
        }
        ++this._numberOfDisplayedItems;
        let rangeString = item.Range;

        if (item.Current == true) {
          let tmpRange = pulseRange.createDateRangeFromString(rangeString);
          rangeString = pulseUtility.createDateRangeForWebService(tmpRange.lower);
        }

        let range = pulseRange.createDateRangeFromString(rangeString);
        let display = item.Display;
        let details = item.Details;
        if (details) {
          display += ' (' + details + ')';
        }

        let machineModeDisplay = '';
        let catId = -2;
        for (let mode of item.MachineModes) {
          machineModeDisplay += mode.Display + ',';
          if (catId == -2)
            catId = mode.Category.Id;
          else if (catId != -1 && catId != mode.Category.Id)
            catId = -1;
        }
        let len = machineModeDisplay.length;
        if ((machineModeDisplay.length > 0) &&
          (machineModeDisplay.substr(len - 1, 1) == ',')) {
          machineModeDisplay = machineModeDisplay.substring(0, len - 1);
        }
        let tr = document.createElement('div');
        tr.className = 'selectable reasonslotlist-tr';

        tr.setAttribute('range', rangeString);
        tr.setAttribute('reason-text', item.Display);
        tr.setAttribute('mode', machineModeDisplay);
        tr.setAttribute('current', item.Current);
        tr.setAttribute('is-default', item.DefaultReason);
        tr.setAttribute('is-running', item.Running);
        tr.setAttribute('is-selectable', item.IsSelectable);

        if (item.Details) {
          tr.setAttribute('details', item.Details);
        }

        let displayedRange = pulseUtility.displayDateRange(range);

        let tdCheck = document.createElement('div');
        tdCheck.className = 'reasonslotlist-td-check';
        if (item.IsSelectable == undefined || item.IsSelectable) {
          let checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'table-check';
          tdCheck.appendChild(checkbox);
        }
        tdCheck.addEventListener('click', function (e) {
          this.checkBoxClick(e);
        }.bind(this));

        let tdReasonButton = document.createElement('div');
        tdReasonButton.className = 'reasonslotlist-td-icon';
        if (catId > 0) {
          let svgDiv = document.createElement('div');
          svgDiv.className = 'reasonslotlist-reason-svg';
          let modeClass = pulseSvg.getMachineModeClass(catId);
          svgDiv.classList.add(modeClass);
          svgDiv.style.color = item.BgColor;
          tdReasonButton.appendChild(svgDiv);
          pulseSvg.inlineBackgroundSvg(svgDiv);
        }
        let tdRange = document.createElement('div');
        tdRange.innerHTML = displayedRange;
        tdRange.className = 'reasonslotlist-td-range reasonslotlist-td-click-change';
        let textbox = document.createElement('div');
        textbox.innerHTML = display;
        textbox.className = 'reasonslotlist-td-reason reasonslotlist-td-click-change';
        textbox.setAttribute('title', machineModeDisplay);
        let desc = document.createElement('div');
        desc.className = 'reasonslotlist-td-desc';
        desc.appendChild(tdRange);
        desc.appendChild(textbox);
        if (item.OverwriteRequired) {
          textbox.classList.add('overwrite-required', 'missing');
        }
        tdRange.addEventListener('click', function (e) {
          this.rowClick(e);
        }.bind(this));
        textbox.addEventListener('click', function (e) {
          this.rowClick(e);
        }.bind(this));

        tr.appendChild(tdReasonButton);
        tr.appendChild(tdCheck);
        tr.appendChild(desc);
        this._table.appendChild(tr);

        if (item.IsSelectable) {
          ++this._numberOfSelectableItems;
          if (1 == this._numberOfSelectableItems) {
            evt = { target: tr };
          }
        }

        let rangeRow = pulseRange.createDateRangeFromString(rangeString);
        let modif = this._getRangeInModifications(rangeRow);
        if (null != modif) {
          let newRevisionProgress =
            pulseUtility.createElementWithAttribute('x-revisionprogress', {
              'revision-id': modif.revisionid,
              'machine-id': modif.machineid,
              'kind': modif.kind,
              'revision-range': pulseUtility.convertDateRangeForWebService(rangeRow),
              'steps': modif.initModifications,
              'remaining': modif.pendingModifications
            });
          desc.appendChild(newRevisionProgress);
        }
      }
      if (this._numberOfDisplayedItems === 0) {
        let emptyTr = document.createElement('div');
        emptyTr.className = 'reasonslotlist-tr';
        emptyTr.style.justifyContent = 'center';
        emptyTr.style.padding = '20px';
        emptyTr.style.fontStyle = 'italic';
        emptyTr.style.opacity = '0.7';
        emptyTr.style.cursor = 'default';

        let message = document.createElement('div');
        message.textContent = this.getTranslation('allPeriodsClassified', 'All stop periods are classified');

        emptyTr.appendChild(message);
        this._table.appendChild(emptyTr);
      }

      this._skipList = false;

      if (1 == this._numberOfSelectableItems) {
        if (this.element.hasAttribute('skip1periodlist')
          && this.element.getAttribute('skip1periodlist')) {
          this._skipList = true;
        }
        if (!pulseUtility.isNotDefined(evt)) {
          this.checkBoxClick(evt);
        }
      }
      if (this._xsaveReason != null) {
        this._xsaveReason.closeAfterSave(this._skipList);
      }
      this._firstLoad = false;
    }

    _getXSaveReason() {
      if (!pulseUtility.isNotDefined(this._xsaveReason)) {
        return this._xsaveReason;
      }

      if (this.element.hasAttribute('demo'))
        return;

      let dialogbox2 = document.createElement('div');
      dialogbox2.className = 'dialog-savereason-page2';
      let header = document.createElement('div');
      header.className = 'reasonslotlist-header-label';
      header.innerHTML = `3. ${this.getTranslation('sectionReasonTitle', 'Apply a reason on the selected period(s)')}`;
      dialogbox2.appendChild(header);

      let xsaveReason = pulseUtility.createElementWithAttribute('x-savereason', {
        'machine-id': this.element.getAttribute('machine-id')
      });
      dialogbox2.appendChild(xsaveReason);
      this._xsaveReason = xsaveReason;
      this._xsaveReason.closeAfterSave(this._skipList);

      if (document.querySelector('.dialog-savereason')) {
        // LE COMPOSANT NATIF S'OCCUPE DE CREER LA PAGE 2
        pulseCustomDialog.addPage('.dialog-savereason', dialogbox2);
      }

      return this._xsaveReason;
    }

    _reloadOrClose() {
      if (!document.querySelector('.dialog-savereason'))
        return;

      if (this._skipList) {
        pulseCustomDialog.close('.dialog-savereason');
      }
      else {
        pulseCustomDialog.goToPage('.dialog-savereason', 0);
        let hpb = this.element.querySelector('x-highlightperiodsbar');
        if (hpb) hpb.cleanRanges();
        this.switchToContext('Reload');
      }
    }

    getShortUrl() {
      let url = 'ReasonOnlySlots?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
      url += '&SelectableOption=true';
      if (this.stateContext == 'Reload') {
        url += '&Cache=No';
      }
      return url;
    }

    initialize() {
      this.addClass('pulse-bigdisplay');

      // Validation must happen here — initialize() runs BEFORE
      // validateParameters() in the state machine (Initialization → ParamValidation),
      // and the DOM build below dereferences this.range.
      if (!this.element.hasAttribute('machine-id')) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')),
          () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in ReasonSlotListComponent.element');
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')),
          () => this.removeError());
        return;
      }
      this._setAutoRange();

      const askForRange = () => {
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
      };
      if (this.range == undefined) {
        console.error('undefined range');
        askForRange();
        this.switchToKey('Error', () => this.displayError('undefined range'), () => this.removeError());
        return;
      }
      if (this.range.isEmpty()) {
        console.error('empty range');
        askForRange();
        this.switchToKey('Error', () => this.displayError('empty range'), () => this.removeError());
        return;
      }

      this.element.replaceChildren();

      let datetimerangeDiv = document.createElement('div');
      datetimerangeDiv.className = 'reasonslotlist-datetimerange';
      let xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange', {
        'range': this.range.toString(d => d.toISOString()),
        'period-context': 'reasonslotlist'
      });
      datetimerangeDiv.appendChild(xdatetimerange);

      let fixedHeaderDiv = document.createElement('div');
      fixedHeaderDiv.className = 'fixed-header';
      let hdr1 = document.createElement('div');
      hdr1.className = 'reasonslotlist-header-label';
      hdr1.innerHTML = `1. ${this.getTranslation('sectionTimeRangeTitle', 'Select a time range')}`;
      fixedHeaderDiv.appendChild(hdr1);
      fixedHeaderDiv.appendChild(datetimerangeDiv);
      let hdr2 = document.createElement('div');
      hdr2.className = 'reasonslotlist-header-label';
      hdr2.innerHTML = `2. ${this.getTranslation('sectionPeriodTitle', 'Select one or more periods')}`;
      fixedHeaderDiv.appendChild(hdr2);

      let xBarstack = pulseUtility.createElementWithAttribute('x-barstack', {
        'machine-id': this.element.getAttribute('machine-id'),
        'period-context': 'reasonslotlist',
        'main-bar': 'reason',
        'range': this.range.toString(d => d.toISOString()),
        'mainbar-showoverwriterequired': 'false',
        'mainbar-click-to-change-reason': 'false'
      });
      let barDiv = document.createElement('div');
      barDiv.className = 'reasonslotlist-bar';
      barDiv.appendChild(xBarstack);
      fixedHeaderDiv.appendChild(barDiv);

      this._allIdleCheckbox = document.createElement('input');
      this._allIdleCheckbox.type = 'checkbox';
      this._allIdleCheckbox.id = 'reasonslotlist-allidle-checkbox';
      this._allIdleCheckbox.name = 'idle';
      this._allIdleCheckbox.value = 'AllIdle';

      let allIdlelabel = document.createElement('label');
      allIdlelabel.htmlFor = 'reasonslotlist-allidle-checkbox';
      allIdlelabel.innerHTML = this.getTranslation('optionIdentified', 'Show identified idle periods');

      this._motionCheckbox = document.createElement('input');
      this._motionCheckbox.type = 'checkbox';
      this._motionCheckbox.id = 'reasonslotlist-motion-checkbox';
      this._motionCheckbox.name = 'motion';
      this._motionCheckbox.value = 'AllMotion';

      let motionlabel = document.createElement('label');
      motionlabel.htmlFor = 'reasonslotlist-motion-checkbox';
      motionlabel.innerHTML = this.getTranslation('optionRunning', 'Show running periods');

      this._allIdleCheckbox.addEventListener('change', function () {
        let hpb = this.element.querySelector('x-highlightperiodsbar');
        if (hpb) hpb.cleanRanges();
        if (this._xsaveReason != null) {
          this._xsaveReason.cleanReasons();
        }
        this.fillTable();
      }.bind(this));

      this._motionCheckbox.addEventListener('change', function () {
        let hpb = this.element.querySelector('x-highlightperiodsbar');
        if (hpb) hpb.cleanRanges();
        if (this._xsaveReason != null) {
          this._xsaveReason.cleanReasons();
        }
        this.fillTable();
      }.bind(this));

      let divfilter = document.createElement('div');
      divfilter.className = 'reasonslotlist-filter';
      divfilter.appendChild(this._allIdleCheckbox);
      divfilter.appendChild(allIdlelabel);
      divfilter.appendChild(this._motionCheckbox);
      divfilter.appendChild(motionlabel);

      let topDiv = document.createElement('div');
      topDiv.className = 'reasonslotlist-top-div';
      topDiv.appendChild(divfilter);

      let divdata = document.createElement('div');
      divdata.className = 'reasonslotlist-data';
      let divScrollable = document.createElement('div');
      divScrollable.className = 'scrollable-content';
      divScrollable.appendChild(divdata);

      let warningDiv = document.createElement('div');
      warningDiv.className = 'reasonslotlist-warning';
      warningDiv.innerHTML = this.getTranslation('noPeriod', 'No selectable periods on the specified range');

      let maindiv = document.createElement('div');
      maindiv.className = 'reasonslotlist';
      maindiv.appendChild(fixedHeaderDiv);
      maindiv.appendChild(divScrollable);
      maindiv.appendChild(topDiv);
      maindiv.appendChild(warningDiv);

      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      this.element.appendChild(maindiv);

      eventBus.EventBus.addEventListener(this,
        'dateTimeRangeChangeEvent',
        'reasonslotlist',
        this.onDateTimeRangeChange.bind(this));

      let modifMgr = document.body.querySelector('x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      this.switchToNextContext();
    }

    clearInitialization() {
      this.element.replaceChildren();

      this._allIdleCheckbox = undefined;
      this._motionCheckbox = undefined;
      this._xsaveReason = null;
      this._displayModeInitialized = false;

      super.clearInitialization();
    }

    reset() {
      this.removeError();
      this.switchToNextContext();
    }

    /**
     * Validates `machine-id` (required, integer) and `range` (required, non-empty).
     * Same checks as initialize() — kept in sync intentionally because the
     * state machine calls initialize() FIRST (and initialize() needs the
     * params validated to build the DOM safely), then validateParameters().
     */
    validateParameters() {
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

    refresh(data) {
      let divfilter = this.element.querySelector('.reasonslotlist div.reasonslotlist-filter');
      if (divfilter) divfilter.style.display = '';

      this._table = this.element.querySelector('.reasonslotlist div.reasonslotlist-data');
      if (this._table) {
        this._table.replaceChildren();
        this._table.classList.remove('reasonslotlist-error');
        this._table.classList.add('reasonslotlist-table');
        this._table.classList.add('pulse-selection-table-container');
      }

      // Initialize display mode from attribute if not already set
      if (!this._displayMode && this.element.hasAttribute('display-mode')) {
        this._displayMode = this.element.getAttribute('display-mode');
      }

      this._dataReasonsList = data.ReasonOnlySlots

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

      if (!hasSelectableNonIdentified && !hasSelectableIdentified && !hasSelectableMotion) {
        let wd = this.element.querySelector('.reasonslotlist-warning');
        if (wd) wd.style.display = '';
      }
      else {
        let wd = this.element.querySelector('.reasonslotlist-warning');
        if (wd) wd.style.display = 'none';
      }

      // Apply display mode if set
      if (this._displayMode) {
        this._applyDisplayMode();
      }

      this.fillTable();

      let datetimerangeDiv = this.element.querySelector('.reasonslotlist-datetimerange');
      if (datetimerangeDiv) {
        datetimerangeDiv.replaceChildren();
        let xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange',
          {
            'range': this.range.toString(d => d.toISOString()),
            'period-context': 'reasonslotlist'
          });
        datetimerangeDiv.appendChild(xdatetimerange);
      }

      this._getXSaveReason();
    }

    displayError(text) {
      let divfilter = this.element.querySelector('.reasonslotlist div.reasonslotlist-filter');
      if (divfilter) divfilter.style.display = 'none';

      this._table = this.element.querySelector('.reasonslotlist div.reasonslotlist-data');
      if (this._table) {
        this._table.replaceChildren();
        this._table.classList.remove('reasonslotlist-table');
        this._table.classList.remove('pulse-selection-table-container');
        this._table.classList.add('reasonslotlist-error');
        let div = document.createElement('div');
        div.innerHTML = text;
        this._table.appendChild(div);
      }
    }

    removeError() {
      this.displayError('');
    }

    startLoading() {
      let rl = this.element.querySelector('.reasonslotlist');
      if (rl) rl.style.display = 'none';
      super.startLoading();
    }

    endLoading() {
      let rl = this.element.querySelector('.reasonslotlist');
      if (rl) rl.style.display = 'flex';
      super.endLoading();
    }

    _getRangeInModifications(range) {
      for (let modif of this._mapOfModifications) {
        for (let i = 0; i < modif[1].ranges.length; i++) {
          if (pulseRange.overlaps(modif[1].ranges[i], range)) {
            if (modif[1].pendingModifications != 0)
              return modif[1];
          }
        }
      }
      return null;
    }

    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;
      if (!pulseRange.equals(newRange, this._range, (a, b) => a.getTime() == b.getTime())) {
        this._range = newRange;

        this.element.setAttribute('skip1periodlist', 'false');
        if (this._xsaveReason != null) {
          this._xsaveReason.closeAfterSave(false);
        }

        this.start();
      }
    }

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
        for (let iModif = 0; iModif < modif.ranges.length; iModif++) {
          let rows = this.element.querySelectorAll('.reasonslotlist-tr');
          rows.forEach(row => {
            let rangeRowStr = row.getAttribute('range');
            let rangeRow = pulseRange.createDateRangeFromString(rangeRowStr);
            if (pulseRange.overlaps(modif.ranges[iModif], rangeRow)) {
              let newRevisionProgress =
                pulseUtility.createElementWithAttribute('x-revisionprogress', {
                  'revision-id': modif.revisionid,
                  'machine-id': modif.machineid,
                  'kind': modif.kind,
                  'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[iModif])
                });
              let desc = row.querySelector('.reasonslotlist-td-desc');
              if (desc) desc.appendChild(newRevisionProgress);
            }
          });
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
    }

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
      let range = row.getAttribute('range');
      let current = row.getAttribute('current');
      return this._getRangeWithCurrent(range, current);
    }

    removeAllSelections() {
      let rows = this.element.querySelectorAll('.reasonslotlist-tr');

      rows.forEach(row => {
        let tdCheck = row.querySelector('input[type=checkbox]');
        if (tdCheck)
          tdCheck.checked = false;

        row.classList.remove('row-selected');

        let isDefault = row.getAttribute('is-default');
        if (isDefault == 'false') {
          row.classList.remove('row-notdefault-selected');
        }
      });

      let xSR = this._getXSaveReason();
      if (xSR != null) {
        xSR.cleanReasons();
      }
      let highlightBar = this.element.querySelector('x-highlightperiodsbar');
      if (highlightBar) {
        highlightBar.cleanRanges();
      }
    }

    checkBoxClick(e) {
      let row = e.target.closest('.reasonslotlist-tr');
      let tdCheck = row.querySelector('input[type=checkbox]');
      if (this._firstLoad) {
        if (tdCheck)
          tdCheck.checked = true;
      }
      let checked = tdCheck && tdCheck.checked;
      let highlightBar = this.element.querySelector('x-highlightperiodsbar');
      let rangeString = row.getAttribute('range');
      let range = pulseRange.createDateRangeFromString(rangeString);
      let isDefault = row.getAttribute('is-default');
      let reasonSelected = {
        range: rangeString,
        reason: row.getAttribute('reason-text'),
        mode: row.getAttribute('mode'),
      }
      let details = row.getAttribute('details');
      if (details) {
        reasonSelected.details = details;
      }

      if (checked) {
        row.classList.add('row-selected');
        if (highlightBar) highlightBar.addRange(range);
        let xSR = this._getXSaveReason();
        if (xSR != null) {
          xSR.addReason(reasonSelected);
          if (isDefault == 'false') {
            row.classList.add('row-notdefault-selected');
          }
        }
      }
      else {
        row.classList.remove('row-selected');
        if (highlightBar) highlightBar.removeRange(range);
        let xSR = this._getXSaveReason();
        if (xSR != null) {
          xSR.removeReason(reasonSelected);
          if (isDefault == 'false') {
            row.classList.remove('row-notdefault-selected');
          }
        }
      }
    }

    rowClick(e) {
      let row = e.target.closest('.reasonslotlist-tr');
      let isSelectable = row.getAttribute('is-selectable');
      if (isSelectable == 'false') {
        return;
      }
      let tdCheck = row.querySelector('input[type=checkbox]');
      if (tdCheck) tdCheck.click();
    }

  }

  pulseComponent.registerElement('x-reasonslotlist', ReasonSlotListComponent, ['machine-id', 'range', 'display-mode']);
})();
