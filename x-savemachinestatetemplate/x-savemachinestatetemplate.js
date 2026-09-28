// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-savemachinestatetemplate
 * @requires module:pulseComponent
 * @requires pulseUtility
 * @requires pulseRange
 * @requires x-datetimerange
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseService from 'pulseService';
import * as pulseRange from 'pulseRange';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseConfig from 'pulseConfig';
import * as pulseSvg from 'pulseSvg';
import * as pulseLogin from 'pulseLogin';
import * as eventBus from 'eventBus';

import 'x-datetimerange/x-datetimerange';
import 'x-modificationmanager/x-modificationmanager';

(function () {

  /**
   * `<x-savemachinestatetemplate>` — form to assign a machine state
   * template (MST) to a time slot for one machine.
   *
   * Polls `NextMachineStateTemplate?MachineId=<id>&At=<begin>&Cache=No`
   * to populate the list of allowed MSTs: the ones that may follow the MST
   * of the machine at the begin of the period displayed in its
   * `x-datetimerange` ('now' in the 'From now on' mode). The list is
   * reloaded when the period changes, and refreshed regularly (same rate as
   * x-lastmachinestatetemplate), since the MST at the begin may change.
   * On confirm, POSTs the assignment via `pulseService.runAjaxSimple` and
   * registers the returned revision id with the sibling
   * `x-modificationmanager`. Listens to `dateTimeRangeChangeEvent` on the
   * internal `period-context` (`savemst<machine-id>`).
   * Closing the dialog removes the element (which stops the refresh), and
   * removing the element closes the dialog.
   *
   * @element x-savemachinestatetemplate
   * @attr {number} machine-id (required) machine id
   * @attr {number} mst-id     not used any more: the MST at the begin of the period is used
   * @attr {string} range      ISO datetime range `begin;end` of the target slot
   * @attr {boolean} auto-open  set when the dialog opened on its own: the range
   *                            starts in the x-datetimerange 'From now on' mode
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class SaveMachineStateTemplateComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      //this._content = undefined;
      self._optionSelected = null;
      self._listSignature = null; // Displayed list, to redraw it only when it changes
      self._keepElementOnClose = false;

      self.methods = {
        'closeDialog': self.closeDialog
      };

      return self;
    }

    /**
     * Close the dialog of this component, with the period dialog of its
     * x-datetimerange if it is open over it. Nothing if already closed.
     */
    closeDialog() {
      if (this._dtRange && this._dtRange._webComponent) {
        let periodDialogId = this._dtRange._webComponent._settingsDialogId;
        if (periodDialogId && (document.getElementById(periodDialogId) != null)) {
          pulseCustomDialog.close('#' + periodDialogId);
        }
      }
      if (this._saveDialogId && (document.getElementById(this._saveDialogId) != null)) {
        pulseCustomDialog.close('#' + this._saveDialogId);
      }
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            this.element.setAttribute('period-context', 'savemst' + newVal);
          }
          this.start();
          break;
        case 'range': // New period: new begin, so possibly new next MSTs
          this.start();
          break;
        case 'period-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
          eventBus.EventBus.addEventListener(this,
            'dateTimeRangeChangeEvent',
            this.element.getAttribute('period-context'),
            this.onDateTimeRangeChange.bind(this));
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('pulse-bigdisplay'); // Mandatory for loader

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      // Create dialog
      this._dialog = document.createElement('div');
      this._dialog.className = 'savemachinestatetemplate-dialog';
      let MST_CB = document.createElement('div');
      MST_CB.className = 'savemachinestatetemplate-dialog-div-select';

      // Combobox
      this._MSTselectCB = document.createElement('ul');
      this._MSTselectCB.classList.add('savemachinestatetemplate-cells-list');
      MST_CB.appendChild(this._MSTselectCB);
      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      MST_CB.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      MST_CB.appendChild(messageDiv);

      let rangeForDisplay = pulseRange.createDefaultInclusivity(new Date(), null);
      if (this.element.hasAttribute('range')) {
        rangeForDisplay = pulseRange.createStringRangeFromString(this.element.getAttribute('range'));
      }
      // Check nullable end
      let isoend = null;
      if ((rangeForDisplay.upper != null) &&
        (rangeForDisplay.upper != '') &&
        (moment(rangeForDisplay.upper).isValid()) &&
        (moment(rangeForDisplay.upper) < moment())) {
        isoend = rangeForDisplay.upper; // no possible "no end"
      }

      // Check if Begin is EMPTY -> replace with "now"
      if ((rangeForDisplay.lower == null) ||
        (rangeForDisplay.lower == '') ||
        (!moment(rangeForDisplay.lower).isValid())) {
        rangeForDisplay.lower = pulseUtility.convertMomentToDateTimeString(moment());
      }
      this._initalDate = rangeForDisplay;

      // Opened on its own because the machine is stopped: the dialog may stay
      // open a long time, so rather than a range whose begin would be frozen at
      // the opening time, x-datetimerange is in its 'From now on' mode, until a
      // range is picked in it
      let fromNow = this.element.hasAttribute('auto-open');

      // FROM / TO = datetimerange
      let dtRangeAttributes = {
        'possible-no-end': (isoend == null),
        'range': pulseUtility.convertDateRangeForWebService(rangeForDisplay),
        'period-context': 'savemst' + this.element.getAttribute('machine-id'),
        'hide-buttons': 'true'
      };
      if (fromNow) {
        dtRangeAttributes['from-now'] = 'true';
      }
      this._dtRange = pulseUtility.createElementWithAttribute('x-datetimerange', dtRangeAttributes);

      let svg = document.createElement('div');
      svg.className = 'savemachinestatetemplate-home-svg';
      let homeBtn = document.createElement('div');
      homeBtn.className = 'savemachinestatetemplate-home-btn';
      homeBtn.appendChild(svg);
      pulseSvg.inlineBackgroundSvg(svg);
      pulseUtility.addToolTip(homeBtn, this.getTranslation('homeBtn', 'home'));
      var self = this;
      homeBtn.addEventListener('click', function () {
        self._dtRange.setAttribute('range', pulseUtility.convertDateRangeForWebService(rangeForDisplay));
        if (fromNow) {
          self._dtRange.setAttribute('from-now', 'true');
        }
        // The x-datetimerange does not dispatch any change when back to the
        // 'From now on' mode: reload the list for its begin
        self.start();
      });

      let rangeDiv = document.createElement('div');
      rangeDiv.className = 'savemachinestatetemplate-dialog-dtp-div';
      rangeDiv.appendChild(homeBtn);
      rangeDiv.appendChild(this._dtRange);

      this._dialog.appendChild(rangeDiv);
      this._dialog.appendChild(MST_CB);

      let title = this.getTranslation('changeMachineStateTitle', 'Change machine state');

      let element = this.element; // this.element is reset when the component is destroyed
      let saveDialogId = pulseCustomDialog.openDialog(this._dialog, {
        title: title,
        autoClose: true,
        autoDelete: true,
        bigSize: true,
        okButton: 'hidden',
        helpName: 'savemachinestatetemplate',
        className: 'machinestatetemplate',
        // Once the dialog is closed, the component has nothing more to do:
        // removing it stops the refresh of the list
        onClose: function () {
          if (!this._keepElementOnClose) {
            element.remove();
          }
        }.bind(this)
      });

      // Store the dialog ID for later use
      this._saveDialogId = saveDialogId;

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // The dialog is outside the element: close it, else it would stay
      // without any component behind it (element removed, re-initialization)
      this._keepElementOnClose = true;
      try {
        this.closeDialog();
      }
      finally {
        this._keepElementOnClose = false;
      }

      // Parameters
      this._listSignature = null;

      // DOM
      this.element.replaceChildren();

      this._dialog = undefined;
      this._MSTselectCB = undefined;
      this._dtRange = undefined;
      this._messageSpan = undefined;
      this._content = undefined;
      this._saveDialogId = undefined;

      super.clearInitialization();
    }

    reset() {
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        // Delayed display :
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError(message) {
      this._messageSpan.innerHTML = message;
    }

    removeError() {
      this.displayError('');
    }

    get refreshRate() {
      // Same rate as x-lastmachinestatetemplate
      return 1000 * 6 * Number(this.getConfigOrAttribute('refreshingRate.barSlowUpdateMinutes', 10));
    }

    /**
     * Begin of the period displayed in the x-datetimerange: 'now' in the
     * 'From now on' mode. Until the x-datetimerange has its range, the range
     * of this component is used.
     *
     * @returns {?Date} begin, null if unknown
     */
    _getBegin() {
      let rangeString = this._dtRange ? this._dtRange.getRangeString() : '';
      if (!rangeString) {
        rangeString = this.element.hasAttribute('range')
          ? this.element.getAttribute('range')
          : pulseUtility.convertDateRangeForWebService(this._initalDate);
      }
      if (!rangeString) {
        return null;
      }
      return pulseRange.createDateRangeFromString(rangeString).lower;
    }

    getShortUrl() {
      // The next MSTs are the ones that may follow the MST of the machine at
      // the begin of the period
      let url = 'NextMachineStateTemplate?MachineId=' + this.element.getAttribute('machine-id');
      let begin = this._getBegin();
      if (begin) {
        url += '&At=' + pulseUtility.convertDateForWebService(begin);
      }

      let role = pulseLogin.getRole(); // or getAppContextOrRole ?
      //TODO : change and use 'rolekey=' + role WHEN READY in pulse
      if (role == 'manager')
        url += '&RoleId=5'; // manager
      else
        url += '&RoleId=1'; // operator

      // Changes with the MST at the begin, and At changes at each request in
      // the 'From now on' mode: nothing to take from or to put in the cache
      url += '&Cache=No';

      return url;
    }

    refresh(data) {
      // Redraw the list only when it changes, not to lose a tap during a
      // refresh
      let signature = JSON.stringify(data.MachineStateTemplates
        .map(mst => [mst.Id, mst.Display, mst.BgColor]));
      if (signature == this._listSignature) {
        return;
      }
      let wasEmpty = (this._listSignature == '[]');
      this._listSignature = signature;

      // Combobox
      this._MSTselectCB.innerHTML = '';

      for (let index = 0; index < data.MachineStateTemplates.length; index++) {
        this._drawCell(data.MachineStateTemplates[index]);
      }
      if ((0 == data.MachineStateTemplates.length) && !wasEmpty) { // Once, not at each refresh
        pulseCustomDialog.openDialog(
          this.getTranslation('error.noFlowDefined', 'No flow is defined. Please contact support'),
          { type: 'Error', title: this.getTranslation('error.noData', 'No data') });
      }
    }

    _drawCell(option) {
      let cellItem = document.createElement('li');
      cellItem.classList.add('savemachinestatetemplate-cell-item');
      cellItem.addEventListener('click', (e) => {
        this._save(cellItem);
      });

      let box = document.createElement('div');
      box.classList.add('savemachinestatetemplate-cell-box');
      box.style.borderLeftColor = option.BgColor;

      let spanText = document.createElement('span');
      spanText.classList.add('savemachinestatetemplate-cell-text');
      spanText.innerHTML = option.Display;

      box.appendChild(spanText);

      cellItem.setAttribute('id', option.Id);
      cellItem.appendChild(box);

      this._MSTselectCB.appendChild(cellItem);
    }

    _save(cell) {
      this._optionSelected = cell.getAttribute('id');
      // In the 'From now on' mode, the range starts at the time of this click
      let range = this._dtRange.getRangeString();
      let newMST = this._optionSelected;
      let machid = this.element.getAttribute('machine-id'); // Should be copied. This.element disappear before request answer
      let dialogId = this._saveDialogId; // Same: cleared if the component is re-initialized before the answer
      let url = this.getConfigOrAttribute('path', '') + 'MachineStateTemplateMachineAssociation/Save?MachineId=' + machid
        + '&Range=' + range + '&MachineStateTemplateId=' + newMST + '&RevisionId=-1';
      return pulseService.runAjaxSimple(url,
        function (data) {
          this._saveSuccess(data, machid, range, dialogId);
        }.bind(this),
        this._saveError.bind(this),
        this._saveFail.bind(this));
    }

    _saveSuccess(data, machid, rangeString, dialogId) {
      console.log('_saveSuccess');

      let revisionId = null;
      if (data.Revision) {
        revisionId = data.Revision.Id;
      }
      else {
        console.assert('NO revisionId');
        return;
      }
      console.info('MOS revision id=' + revisionId);

      // Store modification, on the range that was actually saved
      let range = pulseRange.createDateRangeFromString(rangeString);
      let ranges = [];
      ranges.push(range);

      let modificationManager = pulseUtility.getOrCreateSingleton('x-modificationmanager');
      modificationManager.addModification(data.Revision.Id, 'MST', machid, ranges);

      // Close the dialog of this component, not the first dialog of this class
      // in the page: another one may still be there. It may also have been
      // closed by the user in the meantime.
      if (dialogId && (document.getElementById(dialogId) != null)) {
        pulseCustomDialog.close('#' + dialogId);
      }
    }

    _saveError(data) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openDialog(data.ErrorMessage, { type: 'Error', title: this.getTranslation('errorTitle', 'Error'), onClose: close });
    }
    _saveFail(url) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openDialog(this.getTranslation('errorWhileSaving', 'Error while saving'), { type: 'Error', title: this.getTranslation('errorTitle', 'Error'), onClose: close });
    }

    onDateTimeRangeChange(event) {
      if (event.target.stringrange) {
        this.element.setAttribute('range', event.target.stringrange);
      }
    }

  }

  pulseComponent.registerElement('x-savemachinestatetemplate', SaveMachineStateTemplateComponent, ['machine-id', 'range', 'period-context']);
})();
