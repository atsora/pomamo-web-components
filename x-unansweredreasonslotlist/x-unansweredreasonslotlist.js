// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');

require('x-barstack/x-barstack');
require('x-savereason/x-savereason');
require('x-reasonslotlist/x-reasonslotlist');
require('x-revisionprogress/x-revisionprogress');
require('x-stopclassification/x-stopclassification');
require('x-classifiedreasonslotlist/x-classifiedreasonslotlist');
require('x-tr/x-tr');
require('x-machinedisplay/x-machinedisplay');


(function () {

  /**
   * `<x-unansweredreasonslotlist>` — list of unanswered (overwrite-required)
   * reason slots for one machine in a date range, with inline editing.
   *
   * Fetches
   * `Reason/OverwriteRequiredSlots/?MachineId=<id>&Range=<range>&SelectableOption=true`
   * and renders one row per slot that still requires a reason. Selecting
   * one or more rows mounts an `x-stopclassification` to edit them;
   * already-classified slots are summarised via an
   * `x-classifiedreasonslotlist`. An embedded `x-barstack` and
   * `x-machinedisplay` provide the surrounding context. Pending
   * revisions of `kind: 'reason'` for the current machine append an
   * `x-revisionprogress` over the affected sub-range. Reacts to
   * `dateTimeRangeChangeEvent` on `period-context` and to
   * `machineIdChangeSignal` on `machine-context`.
   *
   * @element x-unansweredreasonslotlist
   * @attr {number} machine-id      (required) machine id
   * @attr {string} range           ISO datetime range `begin;end`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @method removeAllSelections    clear the selection from the slot list
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class ReasonSlotListComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;
      self._setAutoRange();

      self._numberOfDisplayedItems = undefined;
      self._numberOfSelectableItems = 0;
      self._skipList = false;
      self._firstLoad = true;
      self._defineReasonButton = null;

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

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': {
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              'unansweredreasonslotlist',
              this.onDateTimeRangeChange.bind(this));

            // Update machine-id on the barstack (which forwards to children)
            let barstack = this.element.querySelector('x-barstack');
            if (barstack) barstack.setAttribute('machine-id', newVal);
          }

          let modifMgrEl = document.body.querySelector('x-modificationmanager');
          if (modifMgrEl) {
            this._mapOfModifications = modifMgrEl.getModifications('reason',
              this.element.getAttribute('machine-id'));
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

    cleanTable() {
      if (this._table) this._table.replaceChildren();
    }

    // === GESTION DES DONNÉES ReasonColorSlots ===
    fillTable(unansweredBlocks) {
      // Same race as in x-classifiedreasonslotlist: a Reload triggered by
      // `modificationEvent` can fire after the parent dialog closed and our
      // host was detached. `this._table` would be null then — bail silently.
      if (!this._table) return;
      this.cleanTable();
      this._exitSelectionMode(); // Ensures exit selection mode on reload

      this._numberOfDisplayedItems = 0;
      this._numberOfSelectableItems = 0;
      let evt;

      if (!unansweredBlocks || unansweredBlocks.length == 0) {
        let emptyTr = document.createElement('div');
        emptyTr.classList.add('unansweredreasonslotlist-tr');
        emptyTr.style.justifyContent = 'center';
        emptyTr.style.padding = '20px';
        emptyTr.style.fontStyle = 'italic';
        emptyTr.style.opacity = '0.7';
        emptyTr.style.cursor = 'default';

        let message = document.createElement('div');
        message.textContent = this.getTranslation('classifiedreasonslotlist.allPeriodsClassified', 'All stop periods are classified');

        emptyTr.appendChild(message);
        this._table.appendChild(emptyTr);

        this._skipList = false;
        this._firstLoad = false;
        this._updateDefineReasonButtonState();
        return;
      }

      for (let item of unansweredBlocks) {
        this._numberOfDisplayedItems++;

        let rangeString = item.Range;
        let range = pulseRange.createDateRangeFromString(rangeString);
        let displayedRange = pulseUtility.displayDateRange(range);

        let tr = document.createElement('div');
        tr.classList.add('selectable', 'unansweredreasonslotlist-tr');
        tr.style.borderLeft = '8px solid ' + item.Color;

        tr.setAttribute('range', rangeString);
        tr.setAttribute('is-default', 'false');
        tr.setAttribute('is-selectable', 'true');
        tr.setAttribute('mode', '');

        // Checkbox (Hidden by CSS by default)
        let tdCheck = document.createElement('div');
        tdCheck.classList.add('unansweredreasonslotlist-td-check');
        let chkInput = document.createElement('input');
        chkInput.type = 'checkbox';
        chkInput.classList.add('table-check');

        // Prevent direct checkbox click from propagating event to TR
        chkInput.addEventListener('click', function (e) {
          e.stopPropagation();
          this.checkBoxClick(e);
        }.bind(this));

        tdCheck.appendChild(chkInput);

        // Text & Range
        let tdRange = document.createElement('div');
        tdRange.innerHTML = displayedRange;
        tdRange.classList.add('unansweredreasonslotlist-td-range');

        let desc = document.createElement('div');
        desc.classList.add('unansweredreasonslotlist-td-desc');
        desc.appendChild(tdRange);

        // --- GESTION DES ÉVÉNEMENTS (CLIC vs LONG PRESS) ---
        this._bindRowEvents(tr, rangeString);

        // Add columns to TR
        tr.appendChild(desc);
        tr.appendChild(tdCheck);
        this._table.appendChild(tr);

        this._numberOfSelectableItems++;
        if (1 == this._numberOfSelectableItems) {
          evt = { target: tr };
        }

        let modif = this._getRangeInModifications(range);
        if (null != modif) {
          let newRevisionProgress =
            pulseUtility.createElementWithAttribute('x-revisionprogress', {
              'revision-id': modif.revisionid,
              'machine-id': modif.machineid,
              'kind': modif.kind,
              'revision-range': pulseUtility.convertDateRangeForWebService(range),
              'steps': modif.initModifications,
              'remaining': modif.pendingModifications
            });
          desc.appendChild(newRevisionProgress);
        }
      }

      this._skipList = false;

      this._firstLoad = false;
      this._updateDefineReasonButtonState();
    }

    // --- NOUVELLES MÉTHODES POUR GESTION CLIC / LONG PRESS ---
    _bindRowEvents(tr, rangeString) {
      let pressTimer;
      let isLongPress = false;
      const LONG_PRESS_DURATION = 500; // ms

      // 1. DÉMARRAGE DU TIMER
      const onMouseDownTouchStart = (e) => {
        if (e.type === 'mousedown' && e.which !== 1) return; // Ignore clic droit
        isLongPress = false;

        pressTimer = setTimeout(() => {
          isLongPress = true;
          this._handleLongPress(tr);
        }, LONG_PRESS_DURATION);
      };
      tr.addEventListener('mousedown', onMouseDownTouchStart);
      tr.addEventListener('touchstart', onMouseDownTouchStart);

      // 2. ANNULATION DU TIMER
      const onMouseUpMouseLeave = (e) => {
        clearTimeout(pressTimer);
      };
      tr.addEventListener('mouseup', onMouseUpMouseLeave);
      tr.addEventListener('mouseleave', onMouseUpMouseLeave);
      tr.addEventListener('touchend', onMouseUpMouseLeave);
      tr.addEventListener('touchcancel', onMouseUpMouseLeave);

      // 3. GESTION DU CLIC
      tr.addEventListener('click', (e) => {
        if (isLongPress) return;
        if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') return; // Handled by input's own event

        this._handleRowSimpleClick(tr, rangeString);
      });

      // 4. SUPPRESSION DU MENU CONTEXTUEL NATIF
      // Long-press on touch devices (and right-click on desktop) trigger the
      // browser's native context menu, which would surface alongside our own
      // long-press handler that shows the selection checkbox. Cancel it.
      tr.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }

    _handleLongPress(tr) {
      // `this._table` is assigned by refresh()/displayError() via querySelector.
      // It can be null if the click event fires before the first refresh has
      // populated the DOM (typically right after a re-validation cycle).
      if (!this._table) return;
      if (!this._table.classList.contains('selection-mode')) {
        this._table.classList.add('selection-mode');
        if (navigator.vibrate) navigator.vibrate(50); // Feedback tactile
      }

      let checkbox = tr.querySelector('input.table-check');
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        this.checkBoxClick({ target: checkbox });
      }
    }

    _handleRowSimpleClick(tr, rangeString) {
      if (!this._table) return;
      if (this._table.classList.contains('selection-mode')) {
        let checkbox = tr.querySelector('input.table-check');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          this.checkBoxClick({ target: checkbox });
          return;
        }
      }

      this._openStopClassificationForSingleRange(rangeString);
    }

    _exitSelectionMode() {
      if (this._table) {
        this._table.classList.remove('selection-mode');
      }
      this.removeAllSelections();
    }
    // ---------------------------------------------------------

    _updateDefineReasonButtonState() {
      if (pulseUtility.isNotDefined(this._defineReasonButton)) { return; }

      // Count number of selected rows
      let selectedCount = this.element.querySelectorAll('.unansweredreasonslotlist-tr.row-selected').length;

      // 1. State management (Grayed out or Active) - Existing code
      this._defineReasonButton.disabled = selectedCount === 0;

      // 2. Visibility management (Hidden or Visible) - [ADDED]
      // CSS `.unansweredreasonslotlist-define-button { display: none }` is the
      // hidden-by-default state. `style.display = ''` would clear the inline
      // override and let CSS win → button stays hidden. Force `block` to override.
      if (selectedCount > 0) {
        this._defineReasonButton.style.display = 'block'; // Shows if at least 1 item selected
      } else {
        this._defineReasonButton.style.display = 'none'; // Hides if no selection
      }
    }

    _getSelectedRanges() {
      let ranges = [];
      let rows = this.element.querySelectorAll('.unansweredreasonslotlist-tr.row-selected');
      for (let i = 0; i < rows.length; i++) {
        let range = this._getRangeFromRowWithCurrent(rows[i]);
        if (range && typeof range.isEmpty === 'function' && !range.isEmpty()) {
          ranges.push(range);
        }
      }
      return ranges;
    }

    _openStopClassificationForSelection() {
      let ranges = this._getSelectedRanges();
      if (ranges.length === 0) { return; }

      pulseDetailsPopup.openChangeStopClassificationDialog(this, ranges[0], {
        useClickedRange: true,
        fullRange: this.range,
        ranges: ranges,
        noadvanced: true,
        closeAfterSave: true,
        onCloseExtra: function () {
          this.removeAllSelections();
          let highlightBar = this.element.querySelector('x-highlightperiodsbar');
          if (highlightBar) {
            highlightBar.cleanRanges();
          }
        }
      });
    }

    getShortUrl() {
      let url = 'Reason/OverwriteRequiredSlots/?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);

      if (this.stateContext == 'Reload') {
        url += '&Cache=No';
      }
      return url;
    }

    initialize() {
      this.addClass('pulse-bigdisplay');

      // Validation must happen here — initialize() runs BEFORE
      // validateParameters() in the state machine, and the DOM build below
      // dereferences this.range via this.range.toString().
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
        } else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.switchToKey('Error', () => this.displayError('invalid range'), () => this.removeError());
        return;
      }

      this.element.replaceChildren();

      let contextId = 'unansweredreasonslotlist';
      eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent', contextId, this.onDateTimeRangeChange.bind(this));

      let fixedHeaderDiv = document.createElement('div');
      fixedHeaderDiv.className = 'fixed-header';

      let datetimeGraduation = pulseUtility.createElementWithAttribute('x-datetimegraduation', {
        'range': this.range.toString(d => d.toISOString()),
        'period-context': contextId
      });
      fixedHeaderDiv.appendChild(datetimeGraduation);

      let xBarstack = pulseUtility.createElementWithAttribute('x-barstack', {
        'machine-id': this.element.getAttribute('machine-id'),
        'period-context': contextId,
        'main-bar': 'reason',
        'range': this.range.toString(d => d.toISOString()),
        'mainbar-showoverwriterequired': 'false',
        'mainbar-click': 'dispatch'
      });
      xBarstack.style.cursor = 'pointer';

      // Listens to native event sent by x-reasonslotbar
      eventBus.EventBus.addEventListener(this, 'clickOnBarEvent', contextId, this.onBarClickEvent.bind(this));

      let barDiv = document.createElement('div');
      barDiv.className = 'unansweredreasonslotlist-bar';
      barDiv.appendChild(xBarstack);
      fixedHeaderDiv.appendChild(barDiv);

      let divdata = document.createElement('div');
      divdata.className = 'unansweredreasonslotlist-data';
      let divScrollable = document.createElement('div');
      divScrollable.className = 'scrollable-content';
      divScrollable.appendChild(divdata);

      let defineReasonButton = document.createElement('button');
      defineReasonButton.type = 'button';
      defineReasonButton.className = 'unansweredreasonslotlist-define-button';
      defineReasonButton.disabled = true;
      let defineReasonLabel = document.createElement('x-tr');
      defineReasonLabel.setAttribute('key', 'unansweredreasonslotlist.defineReason');
      defineReasonLabel.setAttribute('default', 'Define reason');
      defineReasonButton.appendChild(defineReasonLabel);
      defineReasonButton.addEventListener('click', function () {
        this._openStopClassificationForSelection();
      }.bind(this));

      let advancedButton = document.createElement('button');
      advancedButton.type = 'button';
      advancedButton.className = 'unansweredreasonslotlist-showall-button';
      let advancedLabel = document.createElement('x-tr');
      advancedLabel.setAttribute('key', 'unansweredreasonslotlist.advanced');
      advancedLabel.setAttribute('default', 'Advanced');
      advancedButton.appendChild(advancedLabel);
      advancedButton.addEventListener('click', function () {
        this._openAdvancedDialog();
      }.bind(this));

      let seeAllReasonsButton = document.createElement('button');
      seeAllReasonsButton.type = 'button';
      seeAllReasonsButton.className = 'unansweredreasonslotlist-showall-button';
      let seeAllReasonsLabel = document.createElement('x-tr');
      seeAllReasonsLabel.setAttribute('key', 'unansweredreasonslotlist.seeAllReasons');
      seeAllReasonsLabel.setAttribute('default', 'See all reasons');
      seeAllReasonsButton.appendChild(seeAllReasonsLabel);
      seeAllReasonsButton.addEventListener('click', function () {
        this._openClassifiedReasonsDialog();
      }.bind(this));

      let defineReasonContainer = document.createElement('div');
      defineReasonContainer.className = 'unansweredreasonslotlist-define-container';
      defineReasonContainer.appendChild(advancedButton);
      defineReasonContainer.appendChild(seeAllReasonsButton);
      defineReasonContainer.appendChild(defineReasonButton);
      this._defineReasonButton = defineReasonButton;

      let maindiv = document.createElement('div');
      maindiv.className = 'unansweredreasonslotlist';
      maindiv.appendChild(fixedHeaderDiv);
      maindiv.appendChild(divScrollable);
      maindiv.appendChild(defineReasonContainer);

      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      this.element.appendChild(maindiv);

      let modifMgrEl = document.body.querySelector('x-modificationmanager');
      if (modifMgrEl) {
        this._mapOfModifications = modifMgrEl.getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      eventBus.EventBus.addGlobalEventListener(this, 'modificationEvent', this.onModificationEvent.bind(this));

      this.switchToNextContext();
    }

    clearInitialization() {
      this.element.replaceChildren();
      this._defineReasonButton = null;
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
        } else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.switchToKey('Error', () => this.displayError('invalid range'), () => this.removeError());
        return;
      }
      this.switchToNextContext();
    }

    refresh(data) {
      this._table = this.element.querySelector('.unansweredreasonslotlist div.unansweredreasonslotlist-data');
      if (this._table) {
        this._table.replaceChildren();
        this._table.classList.remove('unansweredreasonslotlist-error');
        this._table.classList.add('unansweredreasonslotlist-table', 'pulse-selection-table-container');
      }

      this._dataReasonsList = data.ReasonOverwriteRequiredSlots;

      if (!this._dataReasonsList || !Array.isArray(this._dataReasonsList)) {
        this.fillTable([]);
        return;
      }

      let unansweredBlocks = this._dataReasonsList;

      unansweredBlocks.sort(function (a, b) {
        let aRange = pulseRange.createDateRangeFromString(a.Range);
        let bRange = pulseRange.createDateRangeFromString(b.Range);
        return bRange.lower.getTime() - aRange.lower.getTime();
      });

      if (unansweredBlocks.length === 0 && !this._firstLoad) {
        if (document.querySelector('.dialog-stopclassification') != null) {
          pulseCustomDialog.close('.dialog-stopclassification');
        } else if (document.querySelector('.dialog-savereason') != null) {
          pulseCustomDialog.close('.dialog-savereason');
        } else {
          document.querySelectorAll('.popup-block').forEach(el => pulseUtility.fadeOut(el));
        }
        return;
      }

      this.fillTable(unansweredBlocks);
    }

    displayError(text) {
      // Ensure the container is visible even if startLoading hid it
      let container = this.element.querySelector('.unansweredreasonslotlist');
      if (container) {
        container.style.display = 'flex';
      }
      this._table = this.element.querySelector('.unansweredreasonslotlist div.unansweredreasonslotlist-data');
      if (!this._table) return;
      this._table.replaceChildren();
      this._table.classList.remove('unansweredreasonslotlist-table', 'pulse-selection-table-container');
      this._table.classList.add('unansweredreasonslotlist-error');
      let msg = document.createElement('div');
      msg.textContent = text;
      this._table.appendChild(msg);
    }

    removeError() {
      this.displayError('');
    }

    startLoading() {
      let container = this.element.querySelector('.unansweredreasonslotlist');
      if (container) {
        container.style.display = 'none';
      }
      super.startLoading();
    }

    endLoading() {
      let container = this.element.querySelector('.unansweredreasonslotlist');
      if (container) {
        container.style.display = 'flex';
      }
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

    onModificationEvent(event) {
      // Bail if our host is no longer in the document. Same race as
      // x-classifiedreasonslotlist: x-modificationmanager polls via setTimeout
      // and can dispatch this event after the parent dialog closed and we got
      // detached. Vanilla querySelector returns null on detached subtrees, so
      // every downstream DOM call would throw. Match x-barstack:109 pattern.
      if (!this.element || !this.element.isConnected) return;
      let modif = event.target;
      if (event.target.kind != 'reason' || event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }

      let isNew = true;
      if (this._mapOfModifications.has(modif.revisionid))
        isNew = false;
      this._mapOfModifications.set(modif.revisionid, modif);

      if (isNew) {
        for (let iModif = 0; iModif < modif.ranges.length; iModif++) {
          let rows = this.element.querySelector('.unansweredreasonslotlist-tr');
          for (let iRow = 0; iRow < rows.length; iRow++) {
            let rangeRowStr = rows[iRow].getAttribute('range');
            let rangeRow = pulseRange.createDateRangeFromString(rangeRowStr);
            if (pulseRange.overlaps(modif.ranges[iModif], rangeRow)) {
              let newRevisionProgress =
                pulseUtility.createElementWithAttribute('x-revisionprogress', {
                  'revision-id': modif.revisionid,
                  'machine-id': modif.machineid,
                  'kind': modif.kind,
                  'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[iModif])
                });
              let tdDesc = rows[iRow].querySelector('.unansweredreasonslotlist-td-desc');
              if (tdDesc) tdDesc.appendChild(newRevisionProgress);
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
    }

    _openStopClassificationForSingleRange(rangeString) {
      let range = pulseRange.createDateRangeFromString(rangeString);

      pulseDetailsPopup.openChangeStopClassificationDialog(this, range, {
        useClickedRange: true,
        fullRange: this.range,
        ranges: [range],
        noadvanced: true,
        closeAfterSave: true,
        onCloseExtra: function () {
          this.removeAllSelections();
          let highlightBar = this.element.querySelector('x-highlightperiodsbar');
          if (highlightBar.length) {
            highlightBar.get(0).cleanRanges();
          }
        }
      });
    }
    _openClassifiedReasonsDialog() {
      let machid = this.element.getAttribute('machine-id');

      let parentDialog = this.element.closest('.customDialog');
      if (parentDialog != null) {
        pulseCustomDialog.close('#' + parentDialog.getAttribute('id'));
      }

      let dialog = document.createElement('div');
      dialog.className = 'dialog-classifiedreasonslotlist';

      let rangeString = this.range ? this.range.toString(d => d.toISOString()) : '';

      let xclassifiedreasonslotlist = pulseUtility.createElementWithAttribute('x-classifiedreasonslotlist', {
        'machine-id': machid,
        'range': rangeString
      });
      dialog.appendChild(xclassifiedreasonslotlist);

      let classifiedDialogId = pulseCustomDialog.openDialog(dialog, {
        title: this.getTranslation('unansweredreasonslotlist.allReasons', 'All reasons'),
        onClose: function () {
          document.querySelectorAll('.popup-block').forEach(el => pulseUtility.fadeOut(el));
        }.bind(this),
        autoClose: false,
        autoDelete: true,
        okButton: 'hidden',
        cancelButton: 'hidden',
        fullScreenOnSmartphone: true,
        bigSize: true,
        helpName: 'savereason'
      });

      let xMachine = pulseUtility.createElementWithAttribute('x-machinedisplay', {
        'machine-id': machid
      });
      let titleEl = document.querySelector('#' + classifiedDialogId + ' .customDialogTitle');
      if (titleEl) titleEl.appendChild(xMachine);
    }

    _openAdvancedDialog() {
      let machid = this.element.getAttribute('machine-id');

      let parentDialog = this.element.closest('.customDialog');
      if (parentDialog != null) {
        pulseCustomDialog.close('#' + parentDialog.getAttribute('id'));
      }

      let proxyElement = document.createElement('x-unansweredreasonslotlist');
      proxyElement.setAttribute('machine-id', machid);
      let proxyComponent = {
        element: proxyElement,
        getTranslation: this.getTranslation
      };

      pulseDetailsPopup.openChangeReasonDialog(proxyComponent, this.range, true, true);
    }

    _getRangeWithCurrent(range, current) {
      let r = (typeof range == 'string') ? pulseRange.createDateRangeFromString(range) : range;
      return (current == 'true') ? pulseRange.createDateRangeDefaultInclusivity(r.lower, null) : r;
    }

    _getRangeFromRowWithCurrent(row) {
      let range = row.getAttribute('range');
      let current = row.getAttribute('current');
      return this._getRangeWithCurrent(range, current);
    }

    removeAllSelections() {
      let rows = this.element.querySelectorAll('.unansweredreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let tdCheck = rows[i].querySelector('input[type=checkbox]');
        if (tdCheck != null) tdCheck.checked = false;
        rows[i].classList.remove('row-selected');
      }

      let highlightBar = this.element.querySelector('x-highlightperiodsbar');
      if (highlightBar != null && highlightBar.cleanRanges) {
        highlightBar.cleanRanges();
      }
      this._updateDefineReasonButtonState();

      if (this._table) {
        this._table.classList.remove('selection-mode');
      }
    }

    checkBoxClick(e) {
      let target = e.target;
      if (!target.matches('input')) {
        let parentRow = target.closest('.unansweredreasonslotlist-tr');
        target = parentRow ? parentRow.querySelector('input.table-check') : null;
        if (target == null) return;
      }

      let row = target.closest('.unansweredreasonslotlist-tr');
      let checked = target.checked;
      let highlightBar = this.element.querySelector('x-highlightperiodsbar');
      let rangeString = row.getAttribute('range');
      let range = pulseRange.createDateRangeFromString(rangeString);

      if (checked) {
        row.classList.add('row-selected');
        if (highlightBar != null && highlightBar.addRange) highlightBar.addRange(range);

        if (this._table && !this._table.classList.contains('selection-mode')) {
          this._table.classList.add('selection-mode');
        }
      }
      else {
        row.classList.remove('row-selected');
        if (highlightBar != null && highlightBar.removeRange) highlightBar.removeRange(range);
      }

      this._updateDefineReasonButtonState();

      let selectedCount = this.element.querySelectorAll('.unansweredreasonslotlist-tr.row-selected').length;
      if (selectedCount === 0 && this._table) {
        this._table.classList.remove('selection-mode');
      }
    }

    rowClick(e) {
      let row = e.target.closest('.unansweredreasonslotlist-tr');
      let isSelectable = row.getAttribute('is-selectable');
      if (isSelectable == 'false') {
        return;
      }

      this._handleRowSimpleClick(row, row.getAttribute('range'));
    }

    onBarClickEvent(event) {
      if (!this.element || !this.element.isConnected) return;
      if (event.target && event.target.range) {
        this._onBarClick(event.target.range);
      }
    }

    _onBarClick(clickedRange) {
      let rows = this.element.querySelectorAll('.unansweredreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let rangeString = row.getAttribute('range');
        let rowRange = pulseRange.createDateRangeFromString(rangeString);

        if (pulseRange.overlaps(clickedRange, rowRange)) {
          // 1. Auto-scroll to matching row
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 2. Quick visual feedback (flash)
          let originalBg = getComputedStyle(row).backgroundColor;
          row.style.transition = 'background-color 0.3s';
          row.style.backgroundColor = '#fff3cd'; // Surlignage jaune clair

          setTimeout(() => {
            row.style.backgroundColor = originalBg;
          }, 600);

          // 3. Call your action (selection or modal opening)
          this._handleRowSimpleClick(row, rangeString);
          return;
        }
      }
    }

    onDateTimeRangeChange(event) {
      if (!this.element || !this.element.isConnected) return;
      let newRange = event.target.daterange;
      if (!pulseRange.equals(newRange, this._range, (a, b) => a.getTime() == b.getTime())) {
        this._range = newRange;
        this.element.setAttribute('skip1periodlist', 'false');
        this.start();
      }
    }

  }

  pulseComponent.registerElement('x-unansweredreasonslotlist', ReasonSlotListComponent, ['machine-id', 'range']);
})();
