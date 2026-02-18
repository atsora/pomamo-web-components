// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-savemachinestatetemplate
 * @requires module:pulseComponent
 * @requires pulseUtility
 * @requires pulseRange
 * @requires x-datetimerange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseRange = require('pulseRange');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var pulseLogin = require('pulseLogin');
var eventBus = require('eventBus');

require('x-datetimerange/x-datetimerange');
require('x-modificationmanager/x-modificationmanager');

(function () {

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
      $(this.element).empty();

      // Create DOM - Content
      // Create dialog
      this._dialog = $('<div></div>').addClass('savemachinestatetemplate-dialog');
      let MST_CB = $('<div></div>')
        .addClass('savemachinestatetemplate-dialog-div-select');

      // Combobox
      this._MSTselectCB = document.createElement('ul');
      this._MSTselectCB.classList.add('savemachinestatetemplate-cells-list');
      MST_CB.append(this._MSTselectCB);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(MST_CB).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(MST_CB).append(messageDiv);

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
      this._dtRange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'possible-no-end': (isoend == null),
        'range': pulseUtility.convertDateRangeForWebService(rangeForDisplay),
        'period-context': 'savemst' + this.element.getAttribute('machine-id'),
        'hide-buttons': 'true'
      });

      let svg = $('<div></div>').addClass('savemachinestatetemplate-home-svg');
      let homeBtn = $('<div></div>').addClass('savemachinestatetemplate-home-btn').append(svg);
      pulseSvg.inlineBackgroundSvg(svg);
      pulseUtility.addToolTip(homeBtn, this.getTranslation('homeBtn', 'home'));
      var self = this;
      homeBtn.click(function () {
        self._dtRange[0].setAttribute('range', pulseUtility.convertDateRangeForWebService(rangeForDisplay));
      });

      let rangeDiv = $('<div></div>').addClass('savemachinestatetemplate-dialog-dtp-div').append(homeBtn).append(this._dtRange);

      this._dialog.append(rangeDiv).append(MST_CB);

      this._mstId = this.element.getAttribute('mst-id');

      let title = this.getTranslation('changeMachineStateTitle', 'Change machine state');

      let saveDialogId = pulseCustomDialog.initialize(this._dialog, {
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
      //this._updateOkButtonState();

      pulseCustomDialog.open('#' + saveDialogId);

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
      $(this.element).empty();

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
      $(this._messageSpan).html(message);
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
        pulseCustomDialog.openError('No flow is defined. Please contact support', 'No data');
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

      let boxColor = document.createElement('div');
      boxColor.classList.add('savemachinestatetemplate-cell-box-color');
      boxColor.style.backgroundColor = option.BgColor;
      box.appendChild(boxColor);

      let boxText = document.createElement('div');
      boxText.classList.add('savemachinestatetemplate-cell-box-text');

      let spanText = document.createElement('span');
      spanText.classList.add('savemachinestatetemplate-cell-text');
      spanText.innerHTML = option.Display;
      boxText.appendChild(spanText);

      box.appendChild(boxText);

      cellItem.setAttribute('id', option.Id);

      cellItem.appendChild(box);

      this._MSTselectCB.appendChild(cellItem);
    }

    _save(cell) {
      this._optionSelected = cell.getAttribute('id');
      let range = $(this._dtRange)[0].getRangeString();
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
      let rangeString = $(this._dtRange)[0].getRangeString();
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
      pulseCustomDialog.openError(data.ErrorMessage, 'Error', close);
    }
    _saveFail(url) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openError('Error while saving', 'Error', close);
    }

    onDateTimeRangeChange(event) {
      if (event.target.stringrange) {
        this.element.setAttribute('range', event.target.stringrange);
      }
    }

  }

  pulseComponent.registerElement('x-savemachinestatetemplate', SaveMachineStateTemplateComponent, ['machine-id', 'range', 'period-context']);
})();
