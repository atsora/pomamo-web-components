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
var pulseDetailsPopup = require('pulsecomponent-detailspopup');

require('x-reasonslotbar/x-reasonslotbar');
require('x-savereason/x-savereason');
require('x-reasonslotlist/x-reasonslotlist');
require('x-highlightperiodsbar/x-highlightperiodsbar');
require('x-revisionprogress/x-revisionprogress');
require('x-stopclassification/x-stopclassification');
require('x-tr/x-tr');
require('x-machinedisplay/x-machinedisplay');


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

            // Update children contexts
            let contextId = 'RSL' + newVal;
            $(this.element).find('x-reasonslotbar').attr('machine-id', newVal).attr('period-context', contextId);
            $(this.element).find('x-highlightperiodsbar').attr('period-context', contextId);
            $(this.element).find('x-datetimegraduation').attr('period-context', contextId);
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
    }

    // === GESTION DES DONNÉES ReasonColorSlots ===
    fillTable(classifiedBlocks) {
      this.cleanTable();
      this._exitSelectionMode(); // S'assure de quitter le mode sélection au rechargement

      this._numberOfDisplayedItems = 0;
      this._numberOfSelectableItems = 0;
      let evt;

      if (!classifiedBlocks || classifiedBlocks.length == 0) {
        let emptyTr = $('<div></div>')
          .addClass('classifiedreasonslotlist-tr')
          .css({
            'justify-content': 'center',
            'padding': '20px',
            'font-style': 'italic',
            'opacity': '0.7',
            'cursor': 'default'
          });

        let message = $('<div></div>')
          .text(this.getTranslation('allPeriodsClassified', 'All stop periods are classified'));

        emptyTr.append(message);
        this._table.append(emptyTr);

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

        let overwriteColor = item.OverwriteRequired ? '#FF6347' : '#4CAF50';
        let tr = $('<div></div>')
          .addClass('selectable classifiedreasonslotlist-tr')
          .css('border-left', '8px solid ' + overwriteColor);

        let attributeTr = {
          'range': rangeString,
          'is-default': 'false',
          'is-selectable': 'true',
          'mode': ''
        };
        tr.attr(attributeTr);

        // Checkbox (Cachée par le CSS par défaut)
        let tdCheck = $('<div></div>').addClass('classifiedreasonslotlist-td-check');
        let chkInput = $("<input type='checkbox'></input>").addClass('table-check');

        // Empêcher le clic direct sur la checkbox de propager l'event au TR
        chkInput.click(function (e) {
          e.stopPropagation();
          this.checkBoxClick(e);
        }.bind(this));

        tdCheck.append(chkInput);

        // Text & Range
        let tdRange = $('<div></div>').html(displayedRange)
          .addClass('classifiedreasonslotlist-td-range');

        let desc = $('<div></div>').addClass('classifiedreasonslotlist-td-desc').append(tdRange);

        // --- GESTION DES ÉVÉNEMENTS (CLIC vs LONG PRESS) ---
        this._bindRowEvents(tr, rangeString);

        // Ajout des colonnes au TR
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

      this._firstLoad = false;
      this._updateDefineReasonButtonState();
    }

    // --- NOUVELLES MÉTHODES POUR GESTION CLIC / LONG PRESS ---
    _bindRowEvents(tr, rangeString) {
      let pressTimer;
      let isLongPress = false;
      const LONG_PRESS_DURATION = 500; // ms

      // 1. DÉMARRAGE DU TIMER
      tr.on('mousedown touchstart', (e) => {
        if (e.type === 'mousedown' && e.which !== 1) return; // Ignore clic droit
        isLongPress = false;

        pressTimer = setTimeout(() => {
          isLongPress = true;
          this._handleLongPress(tr);
        }, LONG_PRESS_DURATION);
      });

      // 2. ANNULATION DU TIMER
      tr.on('mouseup mouseleave touchend touchcancel', (e) => {
        clearTimeout(pressTimer);
      });

      // 3. GESTION DU CLIC
      tr.on('click', (e) => {
        if (isLongPress) return;
        if ($(e.target).is('input[type=checkbox]')) return; // Géré par l'event propre à l'input

        this._handleRowSimpleClick(tr, rangeString);
      });
    }

    _handleLongPress(tr) {
      if (!this._table.hasClass('selection-mode')) {
        this._table.addClass('selection-mode');
        if (navigator.vibrate) navigator.vibrate(50); // Feedback tactile
      }

      let checkbox = tr.find('input.table-check');
      if (!checkbox.is(':checked')) {
        checkbox.prop('checked', true);
        this.checkBoxClick({ target: checkbox[0] });
      }
    }

    _handleRowSimpleClick(tr, rangeString) {
      if (this._table.hasClass('selection-mode')) {
        let checkbox = tr.find('input.table-check');
        checkbox.prop('checked', !checkbox.prop('checked'));
        this.checkBoxClick({ target: checkbox[0] });
        return;
      }

      this._openStopClassificationForSingleRange(rangeString);
    }

    _exitSelectionMode() {
      if (this._table) {
        this._table.removeClass('selection-mode');
      }
      this.removeAllSelections();
    }
    // ---------------------------------------------------------

    _updateDefineReasonButtonState() {
      if (pulseUtility.isNotDefined(this._defineReasonButton)) { return; }

      // Compte le nombre de lignes sélectionnées
      let selectedCount = $(this.element).find('.classifiedreasonslotlist-tr.row-selected').length;

      // 1. Gestion de l'état (Grisé ou Actif) - Code existant
      this._defineReasonButton.prop('disabled', selectedCount === 0);

      // 2. Gestion de la visibilité (Caché ou Visible) - AJOUT
      if (selectedCount > 0) {
        this._defineReasonButton.show(); // Affiche si au moins 1 item sélectionné
      } else {
        this._defineReasonButton.hide(); // Cache s'il n'y a pas de sélection
      }
    }

    _getSelectedRanges() {
      let ranges = [];
      let rows = $(this.element).find('.classifiedreasonslotlist-tr.row-selected');
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
      if (xstopclassification[0] && xstopclassification[0].hideAdvancedOptions) {
        xstopclassification[0].hideAdvancedOptions(true);
      }

      pulseCustomDialog.open('#' + stopClassificationDialogId);
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
        'click': 'dispatch'
      });
      reasonBar.css('cursor', 'pointer');

      // Écoute de l'événement natif envoyé par x-reasonslotbar
      eventBus.EventBus.addEventListener(this, 'clickOnBarEvent', contextId, this.onBarClickEvent.bind(this));

      let reasonBorder = $('<div></div>').addClass('pulse-bar-div').append(reasonBar);
      let highlightBar = pulseUtility.createjQueryElementWithAttribute('x-highlightperiodsbar', {
        'period-context': 'RSL' + this.element.getAttribute('machine-id'),
        'height': 6,
        'range': this.range.toString(d => d.toISOString())
      });
      let barDiv = $('<div></div>').addClass('classifiedreasonslotlist-bar')
        .append(reasonBorder).append(highlightBar);
      fixedHeaderDiv.append(barDiv);

      let divdata = $('<div></div>').addClass('classifiedreasonslotlist-data');
      let divScrollable = $('<div></div>').addClass('scrollable-content').append(divdata);

      let defineReasonButton = $('<button type="button"></button>')
        .addClass('classifiedreasonslotlist-define-button')
        .prop('disabled', true);
      let defineReasonLabel = $('<x-tr></x-tr>')
        .attr('key', 'defineReason')
        .attr('default', 'Define reason');
      defineReasonButton.append(defineReasonLabel);
      defineReasonButton.on('click', function () {
        this._openStopClassificationForSelection();
      }.bind(this));

      let showAllButton = $('<button type="button"></button>')
        .addClass('classifiedreasonslotlist-showall-button');
      let showAllLabel = $('<x-tr></x-tr>')
        .attr('key', 'advanced')
        .attr('default', 'Advanced');
      showAllButton.append(showAllLabel);

      showAllButton.on('click', function () {
        this._openAllReasonsDialog();
      }.bind(this));


      let defineReasonContainer = $('<div></div>')
        .addClass('classifiedreasonslotlist-define-container')
        .append(showAllButton)
        .append(defineReasonButton);
      this._defineReasonButton = defineReasonButton;

      let maindiv = $('<div></div>')
        .addClass('classifiedreasonslotlist')
        .append(fixedHeaderDiv)
        .append(divScrollable)
        .append(defineReasonContainer);

      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
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
      this._defineReasonButton = null;
      super.clearInitialization();
    }

    reset() {
      this.removeError();
      this.switchToNextContext();
    }

    refresh(data) {
      this._table = $(this.element).find('.classifiedreasonslotlist div.classifiedreasonslotlist-data').first();
      this._table.empty()
        .removeClass('classifiedreasonslotlist-error')
        .addClass('classifiedreasonslotlist-table  pulse-selection-table-container');

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
        if ($('.dialog-stopclassification').length > 0) {
          pulseCustomDialog.close('.dialog-stopclassification');
        } else if ($('.dialog-savereason').length > 0) {
          pulseCustomDialog.close('.dialog-savereason');
        } else {
          $('.popup-block').fadeOut();
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
      this._table = $(this.element).find('.classifiedreasonslotlist div.classifiedreasonslotlist-data').first();
      this._table.empty()
        .removeClass('classifiedreasonslotlist-table pulse-selection-table-container')
        .addClass('classifiedreasonslotlist-error');
      this._table.append('<div>' + text + '</div>');
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
          let rows = $(this.element).find('.classifiedreasonslotlist-tr');
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
              $(rows[iRow]).find('.classifiedreasonslotlist-td-desc').append(newRevisionProgress);
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
      if ($('.dialog-stopclassification').length > 0) { return; }

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
        'ranges': rangeString,
        'fullRange': fullRangeString
      });
      dialog.append(xstopclassification);

      if (xstopclassification[0] && xstopclassification[0].closeAfterSave) {
        xstopclassification[0].closeAfterSave(true);
      }
      if (xstopclassification[0] && xstopclassification[0].hideAdvancedOptions) {
        xstopclassification[0].hideAdvancedOptions(true);
      }

      pulseCustomDialog.open('#' + stopClassificationDialogId);
    }
    _openAllReasonsDialog() {
      let machid = $(this.element).attr('machine-id');

      let parentDialog = $(this.element).closest('.customDialog');
      if (parentDialog.length > 0) {
        pulseCustomDialog.close('#' + parentDialog.attr('id'));
      }

      let proxyElement = document.createElement('x-classifiedreasonslotlist');
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
      let range = $(row).attr('range');
      let current = $(row).attr('current');
      return this._getRangeWithCurrent(range, current);
    }

    removeAllSelections() {
      let rows = $(this.element).find('.classifiedreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let tdCheck = $(rows[i]).find('input[type=checkbox]').first();
        if ($(tdCheck).length > 0)
          $(tdCheck).prop('checked', false);
        $(rows[i]).removeClass('row-selected');
      }

      let highlightBar = $(this.element).find('x-highlightperiodsbar');
      if (highlightBar.length > 0) {
        highlightBar.get(0).cleanRanges();
      }
      this._updateDefineReasonButtonState();

      if (this._table) {
        this._table.removeClass('selection-mode');
      }
    }

    checkBoxClick(e) {
      let target = $(e.target);
      if (!target.is('input')) {
        target = target.closest('.classifiedreasonslotlist-tr').find('input.table-check');
      }

      let row = target.closest('.classifiedreasonslotlist-tr');
      let checked = target.is(':checked');
      let highlightBar = $(this.element).find('x-highlightperiodsbar');
      let rangeString = row.attr('range');
      let range = pulseRange.createDateRangeFromString(rangeString);

      if (checked) {
        row.addClass('row-selected');
        if (highlightBar.length > 0) highlightBar.get(0).addRange(range);

        if (!this._table.hasClass('selection-mode')) {
          this._table.addClass('selection-mode');
        }
      }
      else {
        row.removeClass('row-selected');
        if (highlightBar.length > 0) highlightBar.get(0).removeRange(range);
      }

      this._updateDefineReasonButtonState();

      let selectedCount = $(this.element).find('.classifiedreasonslotlist-tr.row-selected').length;
      if (selectedCount === 0) {
        this._table.removeClass('selection-mode');
      }
    }

    rowClick(e) {
      let row = $(e.target).closest('.classifiedreasonslotlist-tr');
      let isSelectable = $(row).attr('is-selectable');
      if (isSelectable == 'false') {
        return;
      }

      this._handleRowSimpleClick(row, $(row).attr('range'));
    }

    onBarClickEvent(event) {
      if (event.target && event.target.range) {
        this._onBarClick(event.target.range);
      }
    }

    _onBarClick(clickedRange) {
      let rows = $(this.element).find('.classifiedreasonslotlist-tr');
      for (let i = 0; i < rows.length; i++) {
        let row = $(rows[i]);
        let rangeString = row.attr('range');
        let rowRange = pulseRange.createDateRangeFromString(rangeString);

        if (pulseRange.overlaps(clickedRange, rowRange)) {
          // 1. Scroll automatique vers la ligne correspondante
          row.get(0).scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 2. Feedback visuel rapide (clignotement)
          let originalBg = row.css('background-color');
          row.css('transition', 'background-color 0.3s');
          row.css('background-color', '#fff3cd'); // Surlignage jaune clair

          setTimeout(() => {
            row.css('background-color', originalBg);
          }, 600);

          // 3. Appel de ton action (sélection ou ouverture modale)
          this._handleRowSimpleClick(row, rangeString);
          return;
        }
      }
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

  pulseComponent.registerElement('x-classifiedreasonslotlist', ReasonSlotListComponent, ['machine-id', 'range']);
})();
