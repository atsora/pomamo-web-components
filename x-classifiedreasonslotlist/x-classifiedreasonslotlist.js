// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import * as pulseUtility from 'pulseUtility';
import * as pulseRange from 'pulseRange';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseComponent from 'pulsecomponent';
import * as pulseSvg from 'pulseSvg';
import * as eventBus from 'eventBus';
import * as pulseDetailsPopup from 'pulsecomponent-detailspopup';

import 'x-barstack/x-barstack';
import 'x-savereason/x-savereason';
import 'x-reasonslotlist/x-reasonslotlist';
import 'x-revisionprogress/x-revisionprogress';
import 'x-stopclassification/x-stopclassification';
import 'x-tr/x-tr';
import 'x-machinedisplay/x-machinedisplay';
import 'x-unansweredreasonslotlist/x-unansweredreasonslotlist';


(function () {

  /**
   * `<x-classifiedreasonslotlist>` — scrollable list of classified reason slots
   * (manual or overwrite) for a machine over a time range.
   *
   * Fetches `Reason/ManualOrOverwriteSlots/?MachineId=<id>&Range=<range>` on
   * each `machine-id` / `range` change. Renders a fixed header (an
   * `<x-datetimegraduation>` plus an `<x-barstack main-bar="reason">`) followed
   * by a scrollable table of slot rows; each row shows the range, a coloured
   * left border, a `Display` label, and an optional warning icon when
   * `OverwriteRequired`. Long-press (or single click in selection-mode) toggles
   * a checkbox and highlights the row on the bar; tapping a row outside
   * selection-mode opens a stop-classification dialog. A "Define reason" button
   * opens the same dialog for the multi-row selection, and "Advanced" /
   * "Unanswered only" buttons open broader reason dialogs.
   *
   * Reloads itself when a `modificationEvent` of kind `reason` for the same
   * machine completes (`pendingModifications == 0`) and overlaps the current
   * range; in-flight modifications render an inline `<x-revisionprogress>` on
   * each matching row.
   *
   * @element x-classifiedreasonslotlist
   * @attr {number} machine-id      (required) machine id
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string} range           ISO datetime range string (alternative to receiving it via the event bus)
   * @method removeAllSelections    clear all row selections and the highlight bar
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
              'classifiedreasonslotlist',
              this.onDateTimeRangeChange.bind(this));

            // Update machine-id on the barstack (which forwards to children)
            let barstack = this.element.querySelector('x-barstack');
            if (barstack) {
              barstack.setAttribute('machine-id', newVal);
            }
          }

          let modifMgr = document.body.querySelector('x-modificationmanager');
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
        default:
          break;
      }
    }

    cleanTable() {
      if (this._table) this._table.replaceChildren();
    }

    // === GESTION DES DONNÉES ReasonColorSlots ===
    fillTable(classifiedBlocks) {
      // `this._table` is assigned from querySelector in refresh(). After the
      // user saves a reason in x-stopclassification, the parent dialog often
      // closes synchronously, which detaches our host before the modification
      // manager finishes polling. The Reload triggered by `onModificationEvent`
      // still goes through manageSuccess → refresh → fillTable, but the host
      // DOM no longer contains `.classifiedreasonslotlist-data`. Bail silently.
      if (!this._table) return;
      this.cleanTable();
      this._exitSelectionMode(); // Ensures to exit selection mode on reload

      this._numberOfDisplayedItems = 0;
      this._numberOfSelectableItems = 0;
      let evt;

      if (!classifiedBlocks || classifiedBlocks.length == 0) {
        let emptyTr = document.createElement('div');
        emptyTr.className = 'classifiedreasonslotlist-tr';
        emptyTr.style.justifyContent = 'center';
        emptyTr.style.padding = '20px';
        emptyTr.style.fontStyle = 'italic';
        emptyTr.style.opacity = '0.7';
        emptyTr.style.cursor = 'default';

        let message = document.createElement('div');
        message.textContent = this.getTranslation('allPeriodsClassified', 'All stop periods are classified');

        emptyTr.appendChild(message);
        this._table.appendChild(emptyTr);

        this._skipList = false;
        this._firstLoad = false;
        this._updateDefineReasonButtonState();
        return;
      }

      for (let item of classifiedBlocks) {
        this._numberOfDisplayedItems++;

        let rangeString = item.Range;
        let range = pulseRange.createDateRangeFromString(rangeString);
        let displayedRange = pulseUtility.displayDateRange(range);

        let bgColor = item.BgColor ? item.BgColor : '#808080';
        let tr = document.createElement('div');
        tr.className = 'selectable classifiedreasonslotlist-tr';
        tr.style.borderLeft = '8px solid ' + bgColor;

        let attributeTr = {
          'range': rangeString,
          'is-default': 'false',
          'is-selectable': 'true',
          'mode': ''
        };
        Object.entries(attributeTr).forEach(([key, value]) => {
          tr.setAttribute(key, value);
        });

        // Checkbox (Hidden by CSS by default)
        let tdCheck = document.createElement('div');
        tdCheck.className = 'classifiedreasonslotlist-td-check';
        let chkInput = document.createElement('input');
        chkInput.type = 'checkbox';
        chkInput.className = 'table-check';

        // Prevent direct click on checkbox from propagating event to TR
        chkInput.addEventListener('click', function (e) {
          e.stopPropagation();
          this.checkBoxClick(e);
        }.bind(this));

        tdCheck.appendChild(chkInput);

        // Text & Range
        let tdRange = document.createElement('div');
        tdRange.innerHTML = displayedRange;
        tdRange.className = 'classifiedreasonslotlist-td-range';

        // API "Display" (e.g. "Break", "Maintenance", "Unclassified") shown on
        // the right of the range to give context on the current classification.
        let tdDisplay = document.createElement('div');
        tdDisplay.textContent = item.Display || '';
        tdDisplay.className = 'classifiedreasonslotlist-td-display';

        let desc = document.createElement('div');
        desc.className = 'classifiedreasonslotlist-td-desc';
        desc.appendChild(tdRange);
        desc.appendChild(tdDisplay);

        // --- GESTION DES ÉVÉNEMENTS (CLIC vs LONG PRESS) ---
        this._bindRowEvents(tr, rangeString);

        // Add columns to TR. When the slot still requires classification
        // (OverwriteRequired), insert a warning icon just before tdCheck —
        // visual cue that the user is expected to take action.
        tr.appendChild(desc);
        if (item.OverwriteRequired) {
          let tdOverwriteIcon = document.createElement('div');
          tdOverwriteIcon.className = 'classifiedreasonslotlist-overwrite-icon';
          tr.appendChild(tdOverwriteIcon);
          pulseSvg.inlineBackgroundSvg(tdOverwriteIcon);
        }
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
      tr.addEventListener('mousedown', (e) => {
        if (e.which !== 1) return; // Ignore clic droit
        isLongPress = false;

        pressTimer = setTimeout(() => {
          isLongPress = true;
          this._handleLongPress(tr);
        }, LONG_PRESS_DURATION);
      });
      tr.addEventListener('touchstart', (e) => {
        isLongPress = false;

        pressTimer = setTimeout(() => {
          isLongPress = true;
          this._handleLongPress(tr);
        }, LONG_PRESS_DURATION);
      });

      // 2. ANNULATION DU TIMER
      tr.addEventListener('mouseup', (e) => {
        clearTimeout(pressTimer);
      });
      tr.addEventListener('mouseleave', (e) => {
        clearTimeout(pressTimer);
      });
      tr.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
      });
      tr.addEventListener('touchcancel', (e) => {
        clearTimeout(pressTimer);
      });

      // 3. GESTION DU CLIC
      tr.addEventListener('click', (e) => {
        if (isLongPress) return;
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') return; // Handled by input's own event

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
        }
        return;
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
      let selectedCount = this.element.querySelectorAll('.classifiedreasonslotlist-tr.row-selected').length;

      // 1. State management (Grayed or Active) - Existing code
      this._defineReasonButton.disabled = selectedCount === 0;

      // 2. Visibility management (Hidden or Visible) - NEW
      // CSS `.classifiedreasonslotlist-define-button { display: none }` is the
      // hidden-by-default state. `style.display = ''` would clear the inline
      // override and let CSS win → button stays hidden. Force `block` to override.
      if (selectedCount > 0) {
        this._defineReasonButton.style.display = 'block'; // Show if at least 1 item selected
      } else {
        this._defineReasonButton.style.display = 'none'; // Hide if no selection
      }
    }

    _getSelectedRanges() {
      let ranges = [];
      let rows = this.element.querySelectorAll('.classifiedreasonslotlist-tr.row-selected');
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
        }.bind(this)
      });
    }

    getShortUrl() {
      let url = 'Reason/ManualOrOverwriteSlots/?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);

      if (this.stateContext == 'Reload') {
        url += '&Cache=No';
      }
      return url;
    }

    initialize() {
      this.element.className = 'pulse-bigdisplay';

      if (!this.element.hasAttribute('machine-id')) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }
      this._setAutoRange();

      if (this.range == undefined || this.range.isEmpty()) {
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent', this.element.getAttribute('period-context'));
        } else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.switchToKey('Error', () => this.displayError('invalid range'), () => this.removeError());
        return;
      }

      this.element.replaceChildren();

      let contextId = 'classifiedreasonslotlist';
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

      // Listen to native event sent by x-reasonslotbar
      eventBus.EventBus.addEventListener(this, 'clickOnBarEvent', contextId, this.onBarClickEvent.bind(this));

      let barDiv = document.createElement('div');
      barDiv.className = 'classifiedreasonslotlist-bar';
      barDiv.appendChild(xBarstack);
      fixedHeaderDiv.appendChild(barDiv);

      let divdata = document.createElement('div');
      divdata.className = 'classifiedreasonslotlist-data';
      let divScrollable = document.createElement('div');
      divScrollable.className = 'scrollable-content';
      divScrollable.appendChild(divdata);

      let defineReasonButton = document.createElement('button');
      defineReasonButton.type = 'button';
      defineReasonButton.className = 'classifiedreasonslotlist-define-button';
      defineReasonButton.disabled = true;
      let defineReasonLabel = document.createElement('x-tr');
      defineReasonLabel.setAttribute('key', 'classifiedreasonslotlist.defineReason');
      defineReasonLabel.setAttribute('default', 'Define reason');
      defineReasonButton.appendChild(defineReasonLabel);
      defineReasonButton.addEventListener('click', function () {
        this._openStopClassificationForSelection();
      }.bind(this));

      let showAllButton = document.createElement('button');
      showAllButton.type = 'button';
      showAllButton.className = 'classifiedreasonslotlist-showall-button';
      let showAllLabel = document.createElement('x-tr');
      showAllLabel.setAttribute('key', 'classifiedreasonslotlist.advanced');
      showAllLabel.setAttribute('default', 'Advanced');
      showAllButton.appendChild(showAllLabel);

      showAllButton.addEventListener('click', function () {
        this._openAllReasonsDialog();
      }.bind(this));

      let seeUnansweredButton = document.createElement('button');
      seeUnansweredButton.type = 'button';
      seeUnansweredButton.className = 'classifiedreasonslotlist-showall-button';
      let seeUnansweredLabel = document.createElement('x-tr');
      seeUnansweredLabel.setAttribute('key', 'classifiedreasonslotlist.seeUnansweredOnly');
      seeUnansweredLabel.setAttribute('default', 'Unanswered only');
      seeUnansweredButton.appendChild(seeUnansweredLabel);
      seeUnansweredButton.addEventListener('click', function () {
        this._openUnansweredReasonsDialog();
      }.bind(this));

      let defineReasonContainer = document.createElement('div');
      defineReasonContainer.className = 'classifiedreasonslotlist-define-container';
      defineReasonContainer.appendChild(showAllButton);
      defineReasonContainer.appendChild(seeUnansweredButton);
      defineReasonContainer.appendChild(defineReasonButton);
      this._defineReasonButton = defineReasonButton;

      let maindiv = document.createElement('div');
      maindiv.className = 'classifiedreasonslotlist';
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

      let modifMgr = document.body.querySelector('x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('reason',
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
      this._table = this.element.querySelector('.classifiedreasonslotlist div.classifiedreasonslotlist-data');
      if (this._table) {
        this._table.replaceChildren();
        this._table.classList.remove('classifiedreasonslotlist-error');
        this._table.className = 'classifiedreasonslotlist-table  pulse-selection-table-container';
      }

      this._dataReasonsList = data.ReasonManualOrOverwriteSlots;

      if (!this._dataReasonsList || !Array.isArray(this._dataReasonsList)) {
        this.fillTable([]);
        return;
      }

      let classifiedBlocks = this._dataReasonsList;

      classifiedBlocks.sort(function (a, b) {
        let aRange = pulseRange.createDateRangeFromString(a.Range);
        let bRange = pulseRange.createDateRangeFromString(b.Range);
        return bRange.lower.getTime() - aRange.lower.getTime();
      });

      if (classifiedBlocks.length === 0 && !this._firstLoad) {
        let dialogStop = document.querySelector('.dialog-stopclassification');
        let dialogSaveReason = document.querySelector('.dialog-savereason');
        if (dialogStop) {
          pulseCustomDialog.close('.dialog-stopclassification');
        } else if (dialogSaveReason) {
          pulseCustomDialog.close('.dialog-savereason');
        } else {
          document.querySelectorAll('.popup-block').forEach(el => pulseUtility.fadeOut(el));
        }
        return;
      }

      this.fillTable(classifiedBlocks);
    }

    displayError(text) {
      // Ensure the container is visible even if startLoading hid it
      let container = this.element.querySelector('.classifiedreasonslotlist');
      if (container) {
        container.style.display = 'flex';
      }
      this._table = this.element.querySelector('.classifiedreasonslotlist div.classifiedreasonslotlist-data');
      if (this._table) {
        this._table.replaceChildren();
        this._table.classList.remove('classifiedreasonslotlist-table', 'pulse-selection-table-container');
        this._table.className = 'classifiedreasonslotlist-error';
        let errorDiv = document.createElement('div');
        errorDiv.textContent = text;
        this._table.appendChild(errorDiv);
      }
    }

    removeError() {
      this.displayError('');
    }

    startLoading() {
      let container = this.element.querySelector('.classifiedreasonslotlist');
      if (container) {
        container.style.display = 'none';
      }
      super.startLoading();
    }

    endLoading() {
      let container = this.element.querySelector('.classifiedreasonslotlist');
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
      // Bail if our host is no longer in the document. x-modificationmanager
      // polls via setTimeout, so it can dispatch `modificationEvent` after the
      // parent dialog closed and we got detached. With vanilla querySelector
      // returning null on detached subtrees, every downstream DOM call would
      // throw — same scenario jQuery hid behind silent no-ops on empty sets.
      // Pattern matches x-barstack:109.
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
          let rows = this.element.querySelectorAll('.classifiedreasonslotlist-tr');
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
              let descDiv = rows[iRow].querySelector('.classifiedreasonslotlist-td-desc');
              if (descDiv) {
                descDiv.appendChild(newRevisionProgress);
              }
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
          if (highlightBar) {
            highlightBar.cleanRanges();
          }
        }.bind(this)
      });
    }
    _openUnansweredReasonsDialog() {
      let machid = this.element.getAttribute('machine-id');

      let parentDialog = this.element.closest('.customDialog');
      if (parentDialog) {
        pulseCustomDialog.close('#' + parentDialog.id);
      }

      let dialog = document.createElement('div');
      dialog.className = 'dialog-unansweredreasonslotlist';

      let rangeString = this.range ? this.range.toString(d => d.toISOString()) : '';

      let xunansweredreasonslotlist = pulseUtility.createElementWithAttribute('x-unansweredreasonslotlist', {
        'machine-id': machid,
        'range': rangeString
      });
      dialog.appendChild(xunansweredreasonslotlist);

      let unansweredDialogId = pulseCustomDialog.openDialog(dialog, {
        title: this.getTranslation('classifiedreasonslotlist.seeUnansweredOnly', 'Unanswered only'),
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
      let titleElement = document.querySelector('#' + unansweredDialogId + ' .customDialogTitle');
      if (titleElement) {
        titleElement.appendChild(xMachine);
      }
    }

    _openAllReasonsDialog() {
      let machid = this.element.getAttribute('machine-id');

      let parentDialog = this.element.closest('.customDialog');
      if (parentDialog) {
        pulseCustomDialog.close('#' + parentDialog.id);
      }

      let proxyElement = document.createElement('x-classifiedreasonslotlist');
      proxyElement.setAttribute('machine-id', machid);
      let proxyComponent = {
        element: proxyElement,
        getTranslation: this.getTranslation.bind(this)
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
      let rows = this.element.querySelectorAll('.classifiedreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let tdCheck = rows[i].querySelector('input[type=checkbox]');
        if (tdCheck) {
          tdCheck.checked = false;
        }
        rows[i].classList.remove('row-selected');
      }

      let highlightBar = this.element.querySelector('x-highlightperiodsbar');
      if (highlightBar) {
        highlightBar.cleanRanges();
      }
      this._updateDefineReasonButtonState();

      if (this._table) {
        this._table.classList.remove('selection-mode');
      }
    }

    checkBoxClick(e) {
      let target = e.target;
      if (target.tagName !== 'INPUT') {
        let row = target.closest('.classifiedreasonslotlist-tr');
        if (row) {
          target = row.querySelector('input.table-check');
        }
      }

      let row = target.closest('.classifiedreasonslotlist-tr');
      let checked = target.checked;
      let highlightBar = this.element.querySelector('x-highlightperiodsbar');
      let rangeString = row.getAttribute('range');
      let range = pulseRange.createDateRangeFromString(rangeString);

      if (checked) {
        row.classList.add('row-selected');
        if (highlightBar) highlightBar.addRange(range);

        if (!this._table.classList.contains('selection-mode')) {
          this._table.classList.add('selection-mode');
        }
      }
      else {
        row.classList.remove('row-selected');
        if (highlightBar) highlightBar.removeRange(range);
      }

      this._updateDefineReasonButtonState();

      let selectedCount = this.element.querySelectorAll('.classifiedreasonslotlist-tr.row-selected').length;
      if (selectedCount === 0) {
        this._table.classList.remove('selection-mode');
      }
    }

    rowClick(e) {
      let row = e.target.closest('.classifiedreasonslotlist-tr');
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
      let rows = this.element.querySelectorAll('.classifiedreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let rangeString = row.getAttribute('range');
        let rowRange = pulseRange.createDateRangeFromString(rangeString);

        if (pulseRange.overlaps(clickedRange, rowRange)) {
          // 1. Auto-scroll to corresponding row
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 2. Feedback visuel rapide (clignotement)
          let originalBg = getComputedStyle(row).backgroundColor;
          row.style.transition = 'background-color 0.3s';
          row.style.backgroundColor = '#fff3cd'; // Surlignage jaune clair

          setTimeout(() => {
            row.style.backgroundColor = originalBg;
          }, 600);

          // 3. Call action (selection or modal opening)
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

  pulseComponent.registerElement('x-classifiedreasonslotlist', ReasonSlotListComponent, ['machine-id', 'range']);
})();
