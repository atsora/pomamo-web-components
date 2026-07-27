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
   * Fetches `NextMachineStateTemplate?MachineId=<id>[&CurrentMachineStateTemplateId=<mst-id>]`
   * to populate the list of allowed MSTs, plus an `x-datetimerange` for
   * the target slot. On confirm, POSTs the assignment via
   * `pulseService.runAjaxSimple` and registers the returned revision id
   * with the sibling `x-modificationmanager`. Listens to
   * `dateTimeRangeChangeEvent` on the internal `period-context`
   * (`savemst<machine-id>`).
   *
   * @element x-savemachinestatetemplate
   * @attr {number} machine-id (required) machine id
   * @attr {number} mst-id     current machine state template id (filters the next-MST list)
   * @attr {string} range      ISO datetime range `begin;end` of the target slot
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class SaveMachineStateTemplateComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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

      return self;
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
        case 'range':
          if (pulseUtility.convertDateRangeForWebService(this._initalDate) != newVal) {
            this._mstId = this.element.getAttribute('mst-id');
            this.element.removeAttribute('mst-id');
          }
          else this.element.setAttribute('mst-id', this._mstId);
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
      // FROM / TO = datetimerange
      this._dtRange = pulseUtility.createElementWithAttribute('x-datetimerange', {
        'possible-no-end': (isoend == null),
        'range': pulseUtility.convertDateRangeForWebService(rangeForDisplay),
        'period-context': 'savemst' + this.element.getAttribute('machine-id'),
        'hide-buttons': 'true'
      });

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
      });

      let rangeDiv = document.createElement('div');
      rangeDiv.className = 'savemachinestatetemplate-dialog-dtp-div';
      rangeDiv.appendChild(homeBtn);
      rangeDiv.appendChild(this._dtRange);

      this._dialog.appendChild(rangeDiv);
      this._dialog.appendChild(MST_CB);

      this._mstId = this.element.getAttribute('mst-id');

      let title = this.getTranslation('changeMachineStateTitle', 'Change machine state');

      let saveDialogId = pulseCustomDialog.openDialog(this._dialog, {
        title: title,
        autoClose: true,
        autoDelete: true,
        bigSize: true,
        okButton: 'hidden',
        helpName: 'savemachinestatetemplate',
        className: 'machinestatetemplate'
      });

      // Store the dialog ID for later use
      this._saveDialogId = saveDialogId;

      // Disable OK button initially
      //this._updateOkButtonState()

      /* // This DO NOT WORK [TODO] find a way to reload parent
        onClose :
          //$(this).parent().reload(); // to find x-lastmachinestatetemplate ???  -> msg ? */

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
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

    getShortUrl() {
      let url = 'NextMachineStateTemplate?'
      let nbParam = 0;
      if (this.element.hasAttribute('mst-id')) {
        url += 'CurrentMachineStateTemplateId=' + this.element.getAttribute('mst-id');
        url += '&';
      }
      else if (this.element.hasAttribute('range')) {
        let range = pulseUtility.convertDateForWebService(pulseRange.createDateRangeFromString(this.element.getAttribute('range'))._lower);
        url += 'At=' + range;
        nbParam++;
        if (this.element.hasAttribute('machine-id')) {
          url += '&MachineId=' + this.element.getAttribute('machine-id');
          url += '&';
        }
      }

      let role = pulseLogin.getRole(); // or getAppContextOrRole ?
      //TODO : change and use 'rolekey=' + role WHEN READY in pulse
      if (role == 'manager')
        url += 'RoleId=5'; // manager
      else
        url += 'RoleId=1'; // operator

      return url;
    }

    refresh(data) {
      // Combobox
      this._MSTselectCB.innerHTML = '';

      for (let index = 0; index < data.MachineStateTemplates.length; index++) {
        this._drawCell(data.MachineStateTemplates[index]);
      }
      if (0 == data.MachineStateTemplates.length) {
        pulseCustomDialog.openDialog('No flow is defined. Please contact support', { type: 'Error', title: 'No data' });
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
      let range;
      if (this.element.hasAttribute('auto-open')) {
        range = pulseUtility.convertDateRangeForWebService(pulseRange.createDefaultInclusivity(new Date(), null))
      }
      else {
        range = this._dtRange.getRangeString();
      }
      let newMST = this._optionSelected;
      let machid = this.element.getAttribute('machine-id'); // Should be copied. This.element disappear before request answer
      let url = this.getConfigOrAttribute('path', '') + 'MachineStateTemplateMachineAssociation/Save?MachineId=' + machid
        + '&Range=' + range + '&MachineStateTemplateId=' + newMST + '&RevisionId=-1';
      return pulseService.runAjaxSimple(url,
        function (data) {
          this._saveSuccess(data, machid);
        }.bind(this),
        this._saveError.bind(this),
        this._saveFail.bind(this));
    }

    _saveSuccess(data, machid) {
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

      // Store modification
      let rangeString = this._dtRange.getRangeString();
      let range = pulseRange.createDateRangeFromString(rangeString);
      let ranges = [];
      ranges.push(range);

      let modificationManager = pulseUtility.getOrCreateSingleton('x-modificationmanager');
      modificationManager.addModification(data.Revision.Id, 'MST', machid, ranges);

      pulseCustomDialog.close('.customeDialog-machinestatetemplate');
    }

    _saveError(data) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openDialog(data.ErrorMessage, { type: 'Error', title: 'Error', onClose: close });
    }
    _saveFail(url) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openDialog('Error while saving', { type: 'Error', title: 'Error', onClose: close });
    }

    onDateTimeRangeChange(event) {
      if (event.target.stringrange) {
        this.element.setAttribute('range', event.target.stringrange);
      }
    }

  }

  pulseComponent.registerElement('x-savemachinestatetemplate', SaveMachineStateTemplateComponent, ['machine-id', 'range', 'period-context']);
})();
