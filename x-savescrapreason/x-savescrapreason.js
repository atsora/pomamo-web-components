// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-savescrapreason
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:x-periodtoolbar
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseCustomDialog = require('pulseCustomDialog');
var eventBus = require('eventBus');

require('x-machinedisplay/x-machinedisplay');

/**
 * Build a custom tag <x-savescrapreason> to display a scrap reason.
 * 
 * Attributes:
 *  machine-id : Integer (required)
 */
(function () {

  class SaveScrapReasonComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    // Ajout : prise en compte de la valeur à la perte de focus
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM references
      self._content = undefined;
      self._messageSpan = undefined;

      self._validParts = 0;

      return self;
    }

    /**
     * Callback when an attribute changes after connection
     * 
     * @param {string} attr - Attribute name
     * @param {string} oldVal - Old value
     * @param {string} newVal - New value
     */
    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        default:
          break;
      }
    }

    /**
     * Initialize the component
     */
    initialize() {
      // Clear element in case of clone
      this.element.innerHTML = '';

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('savescrapreason-content');
      this.element.appendChild(this._content);

      this._buildUI();

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Create DOM - Message for errors
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Listener
      eventBus.EventBus.removeEventListenerBySignal(this, 'partsUpdateSignal');
      eventBus.EventBus.addEventListener(this,
        'partsUpdateSignal',
        'scrap-context',
        this._updateUI.bind(this));

      // Initialization OK => switch to next context
      this.switchToNextContext();

      return;
    }

    /**
     * Build the user interface with reason list and action buttons
     */
    _buildUI() {

      let panel = document.createElement('div');
      panel.classList.add('savescrapreason-panel');

      let cellsList = document.createElement('ul');
      cellsList.classList.add('savescrapreason-cells-list');
      panel.appendChild(cellsList);

      this._content.appendChild(panel);

      let buttonContent = document.createElement('div');
      buttonContent.classList.add('savescrapreason-button-content');

      let submitButton = document.createElement('button');
      submitButton.classList.add('savescrapreason-submit-button');
      submitButton.innerHTML = this.getTranslation('submitbutton', 'Submit');
      submitButton.addEventListener('click', (e) => {
        this._savereasons();
      });
      buttonContent.appendChild(submitButton);

      let detailsButton = document.createElement('button');
      detailsButton.classList.add('savescrapreason-details-button');
      detailsButton.innerHTML = this.getTranslation('detailsbutton', 'With details');
      detailsButton.addEventListener('click', (e) => {
        this._getDetailsAndSave();
      });
      buttonContent.appendChild(detailsButton);

      this._content.appendChild(buttonContent);
    }

    /**
    * Post the selected reason to ReasonSave/Post for the active range
    * 
    * @param {string} [details] - Optional details/comments for the scrap reasons
    */
    _savereasons(details) {
      let machineId = Number(this.element.getAttribute('machine-id'));

      let range = this.element.getAttribute('range');

      let url = this.getConfigOrAttribute('path', '') + '/Scrap/ScrapSave/Post/'
        + '?MachineId=' + machineId;


      let timeout = this.timeout;
      let reasons = [];
      let postData = { 'Range': range, 'ValidCount': document.getElementById('savescrapreason-validcount-input').value };
      if (details) postData.Details = details;

      document.querySelectorAll('.savescrapreason-cell-box').forEach((box) => {
        let input = box.querySelector('input.savescrapreason-cell-input');
        let count = parseInt(input.value) || 0;
        if (box.hasAttribute('reason-id')) {
          if (count > 0) {
            reasons.push({
              'Id': box.getAttribute('reason-id'),
              'Number': count
            });
          }
        }
      });

      postData.Reasons = reasons;

      if (this._screapReportId) {
        postData.Id = this._screapReportId;
      }

      pulseService.postAjax(0, url,
        postData,
        timeout,
        function (ajaxToken, data) {
          this._saveSuccess(ajaxToken, data, machineId);
        }.bind(this),
        this._saveError.bind(this),
        this._saveFail.bind(this));

      pulseCustomDialog.close('.customeDialog-scrapclassification');

    }

    /**
     * Open a dialog to collect details then save the reasons
     */
    _getDetailsAndSave() {
      // Machine display
      let machineDisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': this.element.getAttribute('machine-id')
      });

      let divMachine = document.createElement('div');
      divMachine.classList.add('savereason-machine');

      let machineLabel = document.createElement('div');
      machineLabel.classList.add('savereason-machine-label');
      machineLabel.innerHTML = this.getTranslation('machineColon', 'Machine: ');
      divMachine.appendChild(machineLabel);
      divMachine.appendChild(machineDisplay[0]);

      // Reason label
      let divlabelReason = document.createElement('div');
      divlabelReason.classList.add('savereason-details-label');
      divlabelReason.innerHTML = this.getTranslation('reasonColon', 'Reason: ');

      let divNewReasonSpan = document.createElement('span');
      divNewReasonSpan.classList.add('savereason-details-span');
      divNewReasonSpan.innerHTML = this.getTranslation('scrapreasons', 'scrap classification');

      let divNewReason = document.createElement('div');
      divNewReason.classList.add('savereason-details-input');
      divNewReason.appendChild(divNewReasonSpan);

      let divReason = document.createElement('div');
      divReason.classList.add('savereason-details-reason');
      divReason.appendChild(divlabelReason);
      divReason.appendChild(divNewReason);

      // Details textarea
      let textarea = document.createElement('textarea');
      textarea.name = 'details-comment';
      textarea.placeholder = 'Details...';
      textarea.maxLength = 255;
      textarea.addEventListener('keydown', (event) => {
        if (event.keyCode === 13) { // Enter key
          event.preventDefault();
          let okButton = document.querySelector('#' + this._detailsDialogId + ' .customDialogOk');
          if (okButton && !okButton.disabled) {
            okButton.click();
          }
        }
      });

      let divinput = document.createElement('div');
      divinput.classList.add('savereason-details-input');
      divinput.appendChild(textarea);

      let divDetails = document.createElement('div');
      divDetails.classList.add('savereason-details');
      divDetails.appendChild(divinput);

      // Dialog box container
      let dialogbox = document.createElement('div');
      dialogbox.classList.add('savereason-dialog-details');
      dialogbox.appendChild(divMachine);
      dialogbox.appendChild(divReason);
      dialogbox.appendChild(divDetails);

      let reasonDetailsTitle = this.getTranslation('reasonDetailsTitle', 'Reason details');

      // Wrap the DOM element in jQuery for pulseCustomDialog
      this._detailsDialogId = pulseCustomDialog.initialize($(dialogbox), {
        title: reasonDetailsTitle,
        onOk: () => {
          let details = textarea.value.trim();
          if (details) {
            this._savereasons(details);
            pulseCustomDialog.close('#' + this._detailsDialogId);
            this._detailsDialogId = null;
          } else {
            // Show error if details are empty
            let pleaseAddComment = this.getTranslation('errorNoDetails', 'Please add a comment');
            pulseCustomDialog.openError(pleaseAddComment);
          }
        },
        onCancel: () => {
          pulseCustomDialog.close('#' + this._detailsDialogId);
          this._detailsDialogId = null;
        },
        autoClose: false,
        autoDelete: true,
        helpName: 'savereason'
      });

      pulseCustomDialog.open('#' + this._detailsDialogId);

      // Disable OK button initially, enable when text is entered
      let okBtn = document.querySelector('#' + this._detailsDialogId + ' .customDialogOk');
      if (okBtn) {
        okBtn.disabled = true;
      }

      // Enable/disable OK button based on textarea content
      textarea.addEventListener('input', () => {
        if (okBtn) {
          okBtn.disabled = textarea.value.trim().length === 0;
        }
      });
    }


    /**
     * Handle successful save operation and record modification
     * 
     * @param {number} ajaxToken - Token identifying the request
     * @param {Object} data - Response data containing revision information
     * @param {number} machid - Machine ID
     */
    _saveSuccess(ajaxToken, data, machid) {
      console.log('_saveSuccess');
      console.info('Reason revision id=' + data.Revision.Id);

      // Store modification (align with x-savereason)
      if (this._savedRangeString) {
        let rangeObj = pulseRange.createDateRangeFromString(this._savedRangeString);
        try {
          pulseUtility.getOrCreateSingleton('x-modificationmanager')
            .addModification(data.Revision.Id, 'reason', machid, [rangeObj]);
        } catch (e) {
          console.warn('x-stopclassification: unable to push modification', e);
        }
        this._savedRangeString = null;
      }
    }

    /**
     * Handle error response from save operation
     * 
     * @param {number} ajaxToken - Token identifying the request
     * @param {Object} data - Error response data
     */
    _saveError(ajaxToken, data) {
      let errorMessage = 'Error';
      if (typeof data === 'undefined') {
        errorMessage = 'undefined error data';
      }
      else {
        let status = data.Status;
        if (typeof status === 'undefined') {
          errorMessage = 'undefined error data status';
        }
        else {
          if (typeof (status) != 'undefined') {
            errorMessage = `unknown status ${status}, ${data.ErrorMessage}`;
          }
          else {
            errorMessage = data.ErrorMessage;
          }
        }
      }
      pulseCustomDialog.openError(errorMessage);
      return;
    }

    /**
     * Handle network or transport failure from save operation
     * 
     * @param {number} ajaxToken - Token identifying the request
     * @param {string} url - URL that was being requested
     * @param {boolean} isTimeout - Whether the failure was due to timeout
     * @param {string} xhrStatus - XHR status code/message
     */
    _saveFail(ajaxToken, url, isTimeout, xhrStatus) {
      if (isTimeout) {
        pulseCustomDialog.openError('Timeout');
      }
      else {
        let message = pulseService.getAjaxErrorMessage(xhrStatus);
        pulseCustomDialog.openError(message);
      }
    }

    /**
     * Update the UI when parts data changes (triggered by event bus)
     * 
     * @param {Object} event - Event containing parts count and scrap report data
     */
    _updateUI(event) {
      document.querySelectorAll('.savescrapreason-cell-input').forEach((input) => {
        input.value = '0';
      });
      let validCount = document.getElementById('savescrapreason-validcount-input');
      validCount.value = event.target.ValidCount;
      this._validParts = event.target.ValidCount;

      if (event.target.ScrapReport) {
        this._screapReportId = event.target.ScrapReport.Id;
        let reason = undefined;
        for (reason of event.target.ScrapReport.Reasons) {
          let reasonInput = document.getElementById(reason.Id);
          if (reasonInput) {
            reasonInput.value = reason.Number;
            reasonInput.setAttribute('oldValue', reason.Number);
          }
        }
      }
    }

    /**
     * Clear initialization
     */
    clearInitialization() {
      // Clear DOM
      this.element.innerHTML = '';

      this._content = undefined;
      this._messageSpan = undefined;

      super.clearInitialization();
    }

    /**
     * Validate required parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id');
        return;
      }

      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    /**
     * Get the URL for data request
     * 
     * @returns {string} URL
     */
    getShortUrl() {
      let url = 'ReasonScrapSelection/Name?MachineId=' + this.element.getAttribute('machine-id');
      return url;
    }

    /**
     * Refresh with data from server
     * 
     * @param {Object} data - Server response
     */
    refresh(data) {
      this._data = data;
      this._drawReasons();
    }

    /**
     * Draw all reason tiles including valid parts counter
     */
    _drawReasons() {
      let cellsList = this._content.querySelector('.savescrapreason-cells-list');

      let cellItem = document.createElement('li');
      cellItem.classList.add('savescrapreason-cell-item');

      let box = document.createElement('div');
      box.classList.add('savescrapreason-cell-box');

      let boxColor = document.createElement('div');
      boxColor.classList.add('savescrapreason-cell-box-color');
      boxColor.style.backgroundColor = 'green';
      box.appendChild(boxColor);

      let boxText = document.createElement('div');
      boxText.classList.add('savescrapreason-cell-box-text');

      let spanText = document.createElement('span');
      spanText.classList.add('savescrapreason-cell-text');
      spanText.innerHTML = this.getTranslation('validparts', 'Valid parts');
      boxText.appendChild(spanText);

      box.appendChild(boxText);

      let boxInput = document.createElement('div');
      boxInput.classList.add('savescrapreason-cell-box-input');

      let input = document.createElement('input');
      input.type = 'number';
      input.readOnly = true;
      input.classList.add('savescrapreason-cell-input');
      input.setAttribute('id', 'savescrapreason-validcount-input');
      input.value = '0';
      boxInput.appendChild(input);

      box.appendChild(boxInput);

      cellItem.appendChild(box);

      cellsList.appendChild(cellItem);

      for (const reason of this._data) {
        this._drawCell(reason, false);
      }
    }

    /**
     * Render a single tile cell (group or reason)
     * @param {Object} reason
     */
    _drawCell(reason) {
      let cellsList = this._content.querySelector('.savescrapreason-cells-list');

      let cellItem = document.createElement('li');
      cellItem.classList.add('savescrapreason-cell-item');

      let box = document.createElement('div');
      box.classList.add('savescrapreason-cell-box');

      let boxColor = document.createElement('div');
      boxColor.classList.add('savescrapreason-cell-box-color');
      boxColor.style.backgroundColor = reason.NonConformanceColor;
      box.appendChild(boxColor);

      let boxText = document.createElement('div');
      boxText.classList.add('savescrapreason-cell-box-text');

      let spanText = document.createElement('span');
      spanText.classList.add('savescrapreason-cell-text');
      spanText.innerHTML = reason.NonConformanceDisplay;
      boxText.appendChild(spanText);

      box.appendChild(boxText);

      let boxInput = document.createElement('div');
      boxInput.classList.add('savescrapreason-cell-box-input');

      let minus = document.createElement('i');
      minus.classList.add('fa-solid', 'fa-minus');
      minus.addEventListener('click', (e) => {
        let currentValue = parseInt(input.value) || 0;
        if (currentValue > 0) {
          input.value = currentValue - 1;
          input.setAttribute('oldValue', input.value);
          this._updateValidParts(1, reason.NonConformanceCategory);
        }
      });
      boxInput.appendChild(minus);

      let input = document.createElement('input');
      input.type = 'number';
      input.classList.add('savescrapreason-cell-input');
      input.value = '0';
      input.setAttribute('id', reason.NonConformanceReasonId);
      input.setAttribute('oldValue', 0);
      input.addEventListener('change', (e) => {
        let currentValue = parseInt(e.target.value) || 0;
        if (currentValue < 0) {
          input.value = 0;
          this._updateValidParts(parseInt(input.getAttribute('oldValue')), reason.NonConformanceCategory);
        }
        else if (currentValue > this._validParts && currentValue > parseInt(input.getAttribute('oldValue'))) {
          input.value = parseInt(input.getAttribute('oldValue')) + this._validParts;
          this._updateValidParts(-this._validParts, reason.NonConformanceCategory);
        }
        else if (currentValue > parseInt(input.getAttribute('oldValue'))) {
          this._updateValidParts(-(currentValue - parseInt(input.getAttribute('oldValue'))), reason.NonConformanceCategory);
        }
        else {
          this._updateValidParts(parseInt(input.getAttribute('oldValue')) - currentValue, reason.NonConformanceCategory);
        }
        input.setAttribute('oldValue', input.value);
      });
      boxInput.appendChild(input);

      let plus = document.createElement('i');
      plus.classList.add('fa-solid', 'fa-plus');
      plus.addEventListener('click', (e) => {
        let currentValue = parseInt(input.value) || 0;
        if (this._validParts > 0) {
          input.value = currentValue + 1;
          input.setAttribute('oldValue', input.value);
          this._updateValidParts(-1, reason.NonConformanceCategory);
        }
      });
      boxInput.appendChild(plus);

      box.appendChild(boxInput);

      box.setAttribute('reason-id', reason.NonConformanceReasonId);
      box.setAttribute('reason-text', reason.NonConformanceDisplay);

      cellItem.appendChild(box);

      cellsList.appendChild(cellItem);
    }

    /**
     * Clear all tiles from the panel
     */
    _clearPanel() {
      let cellsList = this._content.querySelector('.savescrapreason-cells-list');
      cellsList.innerHTML = '';
    }

    /**
     * Update the valid parts count and dispatch event to other components
     * 
     * @param {number} value - Amount to add/subtract from valid parts count
     * @param {string} category - Non-conformance category for event dispatching
     */
    _updateValidParts(value, category) {
      let validCount = document.getElementById('savescrapreason-validcount-input');
      this._validParts += value;
      validCount.value = this._validParts;

      let signal = category + 'UpdateSignal';
      eventBus.EventBus.dispatchToContext(signal,
        'scrap-context',
        -value);
    }

    /**
     * Display error message
     * 
     * @param {string} message - Error message
     */
    displayError(message) {
      this._messageSpan.innerHTML = message;
      console.error('x-savescrapreason : ' + message);
    }

    /**
     * Remove error message
     */
    removeError() {
      this._messageSpan.innerHTML = '';
    }
  }

  pulseComponent.registerElement('x-savescrapreason', SaveScrapReasonComponent, ['machine-id']);
})();
