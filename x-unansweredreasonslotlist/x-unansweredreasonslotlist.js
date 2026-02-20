// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

require('x-reasonslotbar/x-reasonslotbar');
require('x-savereason/x-savereason');
require('x-highlightperiodsbar/x-highlightperiodsbar');
require('x-revisionprogress/x-revisionprogress');
require('x-stopclassification/x-stopclassification');
require('x-tr/x-tr');


(function () {
  /**
   * Reason slot list component
   * Hérite de PulseParamAutoPathSingleRequestComponent pour faire sa propre requête
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
      self._xsaveReason = null;
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
              'RSL' + newVal,
              this.onDateTimeRangeChange.bind(this));
          }

          let modifMgr = $('body').find('x-modificationmanager');
          if (modifMgr.length == 1) {
            this._mapOfModifications = modifMgr[0].getModifications('reason',
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
      if (this._table) this._table.empty();
      if (this._xsaveReason != null) {
        this._xsaveReason[0].cleanReasons();
      }
    }

    // === GESTION DES DONNÉES ReasonColorSlots ===
    fillTable(unansweredBlocks) {
      this.cleanTable();

      if (!unansweredBlocks || unansweredBlocks.length == 0) {
        return;
      }

      this._numberOfDisplayedItems = 0;
      this._numberOfSelectableItems = 0;
      let evt;

      for (let item of unansweredBlocks) {
        this._numberOfDisplayedItems++;

        let rangeString = item.Range;
        let range = pulseRange.createDateRangeFromString(rangeString);
        let displayedRange = pulseUtility.displayDateRange(range);

        let tr = $('<div></div>')
          .addClass('selectable unansweredreasonslotlist-tr')
          .css('border-left', '5px solid ' + item.Color);

        let attributeTr = {
          'range': rangeString,
          'is-default': 'false',
          'is-selectable': 'true',
          'mode': '' // Pas de mode avec ReasonColorSlots, mais on crée l'attribut pour la forme
        };
        tr.attr(attributeTr);

        // Checkbox
        let tdCheck = $('<div></div>').addClass('unansweredreasonslotlist-td-check');
        tdCheck.append($("<input type='checkbox'></input>").addClass('table-check'));
        tdCheck.click(function (e) { this.checkBoxClick(e); }.bind(this));

        // Text & Range
        let tdRange = $('<div></div>').html(displayedRange)
          .addClass('unansweredreasonslotlist-td-range')
          .addClass('unansweredreasonslotlist-td-click-change');

        let desc = $('<div></div>').addClass('unansweredreasonslotlist-td-desc').append(tdRange).append(textbox);

        tdRange.click(function (e) { this.rowClick(e); }.bind(this));
        textbox.click(function (e) { this.rowClick(e); }.bind(this));

        tr.append(desc).append(tdCheck);
        this._table.append(tr);

        this._numberOfSelectableItems++;
        if (1 == this._numberOfSelectableItems) {
          evt = { target: tr };
        }

        let modif = this._getRangeInModifications(range);
        if (null != modif) {
          let newRevisionProgress =
            pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
              'revision-id': modif.revisionid,
              'machine-id': modif.machineid,
              'kind': modif.kind,
              'revision-range': pulseUtility.convertDateRangeForWebService(range),
              'steps': modif.initModifications,
              'remaining': modif.pendingModifications
            });
          $(desc).append(newRevisionProgress);
        }
      }

      this._skipList = false;

      if (1 == this._numberOfSelectableItems) {
        if (this.element.hasAttribute('skip1periodlist') && this.element.getAttribute('skip1periodlist')) {
          this._skipList = true;
        }
        if (!pulseUtility.isNotDefined(evt)) {
          this.checkBoxClick(evt);
        }
      }

      this._firstLoad = false;
      this._updateDefineReasonButtonState();
    }

    _updateDefineReasonButtonState() {
      if (pulseUtility.isNotDefined(this._defineReasonButton)) { return; }
      let selectedCount = $(this.element).find('.unansweredreasonslotlist-tr.row-selected').length;
      this._defineReasonButton.prop('disabled', selectedCount === 0);
    }

    _getSelectedRanges() {
      let ranges = [];
      let rows = $(this.element).find('.unansweredreasonslotlist-tr.row-selected');
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
      if ($('.dialog-stopclassification').length > 0) { return; }

      let rangeStrings = ranges.map(range => range.toString(d => d.toISOString()));
      let rangeString = rangeStrings[0];
      let dialog = $('<div></div>').addClass('dialog-stopclassification');
      let stopClassificationDialogId = pulseCustomDialog.initialize(dialog, {
        title: this.getTranslation('stopclassification.title', 'Unplanned stops'),
        onClose: function () {
          $('.popup-block').fadeOut();
          this.removeAllSelections();
          let highlightBar = $(this.element).find('x-highlightperiodsbar');
          if (highlightBar.length) {
            highlightBar.get(0).cleanRanges();
          }
        }.bind(this),
        autoClose: false,
        autoDelete: true,
        okButton: 'hidden',
        cancelButton: 'hidden',
        fullScreenOnSmartphone: true,
        bigSize: true,
        helpName: 'savereason',
        className: 'stopclassification'
      });

      let machid = $(this.element).attr('machine-id');
      let fullRangeString = this.range ? this.range.toString(d => d.toISOString()) : rangeString;
      let xstopclassification = pulseUtility.createjQueryElementWithAttribute('x-stopclassification', {
        'machine-id': machid,
        'range': rangeString,
        'ranges': rangeStrings.join('&'),
        'fullRange': fullRangeString
      });
      dialog.append(xstopclassification);

      if (xstopclassification[0] && xstopclassification[0].closeAfterSave) {
        xstopclassification[0].closeAfterSave(true);
      }

      pulseCustomDialog.open('#' + stopClassificationDialogId);
    }

    // === NOUVEAU GETSHORTURL POUR CIBLER REASONCOLORSLOTS ===
    // URL identique à la barre pour mutualiser le cache du navigateur
    getShortUrl() {
      let url = 'ReasonColorSlots?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);

      if ('true' == this.getConfigOrAttribute('cancelHorizontalSplitInBar', 'false')) {
        url += '&SkipDetails=true';
      }

      if (this.stateContext == 'Reload') {
        url += '&Cache=No';
      }
      return url;
    }

    initialize() {
      this.addClass('pulse-bigdisplay');

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

      $(this.element).empty();

      let contextId = 'RSL' + this.element.getAttribute('machine-id');
      eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent', contextId, this.onDateTimeRangeChange.bind(this));

      let fixedHeaderDiv = $('<div></div>').addClass('fixed-header');

      let datetimeGraduation = pulseUtility.createjQueryElementWithAttribute('x-datetimegraduation', {
        'range': this.range.toString(d => d.toISOString()),
        'period-context': 'RSL' + this.element.getAttribute('machine-id')
      });
      fixedHeaderDiv.append(datetimeGraduation);

      let reasonBar = pulseUtility.createjQueryElementWithAttribute('x-reasonslotbar', {
        'machine-id': this.element.getAttribute('machine-id'),
        'period-context': 'RSL' + this.element.getAttribute('machine-id'),
        'height': 50,
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
      let barDiv = $('<div></div>').addClass('unansweredreasonslotlist-bar')
        .append(reasonBorder).append(highlightBar);
      fixedHeaderDiv.append(barDiv);

      let divdata = $('<div></div>').addClass('unansweredreasonslotlist-data');
      let divScrollable = $('<div></div>').addClass('scrollable-content').append(divdata);

      let defineReasonButton = $('<button type="button"></button>')
        .addClass('unansweredreasonslotlist-define-button')
        .prop('disabled', true);
      let defineReasonLabel = $('<x-tr></x-tr>')
        .attr('key', 'defineReason')
        .attr('default', 'Define reason');
      defineReasonButton.append(defineReasonLabel);
      defineReasonButton.on('click', function () {
        this._openStopClassificationForSelection();
      }.bind(this));
      let defineReasonContainer = $('<div></div>')
        .addClass('unansweredreasonslotlist-define-container')
        .append(defineReasonButton);
      this._defineReasonButton = defineReasonButton;

      let warningDiv = $('<div></div>').addClass('unansweredreasonslotlist-warning').html('No selectable periods on the specified range');

      let maindiv = $('<div></div>')
        .addClass('unansweredreasonslotlist')
        .append(fixedHeaderDiv)
        .append(divScrollable)
        .append(defineReasonContainer)
        .append(warningDiv);

      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loading', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      $(this.element).append(maindiv);

      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('reason',
          this.element.getAttribute('machine-id'));
      }
      eventBus.EventBus.addGlobalEventListener(this, 'modificationEvent', this.onModificationEvent.bind(this));

      this.switchToNextContext();
    }

    clearInitialization() {
      $(this.element).empty();
      this._xsaveReason = null;
      this._defineReasonButton = null;
      super.clearInitialization();
    }

    reset() {
      this.removeError();
      this.switchToNextContext();
    }

    // === GESTION DU REFRESH (API ReasonColorSlots) ===
    refresh(data) {
      this._table = $(this.element).find('.unansweredreasonslotlist div.unansweredreasonslotlist-data').first();
      this._table.empty()
        .removeClass('unansweredreasonslotlist-error')
        .addClass('unansweredreasonslotlist-table  pulse-selection-table-container');

      this._dataReasonsList = data.Blocks; // Extraction des blocs de ReasonColorSlots

      if (!this._dataReasonsList || !Array.isArray(this._dataReasonsList)) {
        return;
      }

      // Filtrer les blocs OverwriteRequired == true
      let unansweredBlocks = [];
      for (let item of this._dataReasonsList) {
        if (item.OverwriteRequired === true) {
          unansweredBlocks.push(item);
        }
      }

      unansweredBlocks.sort(function (a, b) {
        let aRange = pulseRange.createDateRangeFromString(a.Range);
        let bRange = pulseRange.createDateRangeFromString(b.Range);
        return bRange.lower.getTime() - aRange.lower.getTime();
      });

      if (unansweredBlocks.length === 0) {
        $(this.element).find('.unansweredreasonslotlist-warning').show();
      }
      else {
        $(this.element).find('.unansweredreasonslotlist-warning').hide();
      }

      this.fillTable(unansweredBlocks);
    }

    displayError(text) {
      this._table = $(this.element).find('.unansweredreasonslotlist div.unansweredreasonslotlist-data').first();
      this._table.empty()
        .removeClass('unansweredreasonslotlist-table pulse-selection-table-container')
        .addClass('unansweredreasonslotlist-error');
      this._table.append('<div>' + text + '</div>');
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
          let rows = $(this.element).find('.unansweredreasonslotlist-tr');
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
              $(rows[iRow]).find('.unansweredreasonslotlist-td-desc').append(newRevisionProgress);
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

    _getRangeWithCurrent(range, current) {
      let r = (typeof range == 'string') ? pulseRange.createDateRangeFromString(range) : range;
      return (current == 'true') ? pulseRange.createDateRangeDefaultInclusivity(r.lower, null) : r;
    }

    _getRangeFromRowWithCurrent(row) {
      let range = $(row).attr('range');
      let current = $(row).attr('current');
      return this._getRangeWithCurrent(range, current);
    }

    removeAllSelections() {
      let rows = $(this.element).find('.unansweredreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let tdCheck = $(rows[i]).find('input[type=checkbox]').first();
        if ($(tdCheck).length > 0)
          $(tdCheck)[0].checked = false;
        $(rows[i]).removeClass('row-selected');
      }

      let highlightBar = $(this.element).find('x-highlightperiodsbar');
      if (highlightBar.length > 0) {
        highlightBar.get(0).cleanRanges();
      }
      this._updateDefineReasonButtonState();
    }

    checkBoxClick(e) {
      let row = $(e.target).closest('.unansweredreasonslotlist-tr');
      let tdCheck = row.find('input[type=checkbox]');

      if (this._firstLoad) {
        if ($(tdCheck).length > 0)
          $(tdCheck)[0].checked = true;
      }

      let checked = $(tdCheck).is(':checked');
      let highlightBar = $(this.element).find('x-highlightperiodsbar');
      let rangeString = $(row).attr('range');
      let range = pulseRange.createDateRangeFromString(rangeString);

      if (checked) {
        row.addClass('row-selected');
        if (highlightBar.length > 0) highlightBar.get(0).addRange(range);
      }
      else {
        row.removeClass('row-selected');
        if (highlightBar.length > 0) highlightBar.get(0).removeRange(range);
      }

      this._updateDefineReasonButtonState();
    }

    rowClick(e) {
      let row = $(e.target).closest('.unansweredreasonslotlist-tr');
      let isSelectable = $(row).attr('is-selectable');
      if (isSelectable == 'false') {
        return;
      }
      let tdCheck = row.find('input[type=checkbox]').first();
      $(tdCheck).click();
    }

    onDateTimeRangeChange(event) {
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
