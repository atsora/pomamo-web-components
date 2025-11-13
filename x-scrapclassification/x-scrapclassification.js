// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-scrapclassification
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:eventBus
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

require('x-savescrapreason/x-savescrapreason');

/**
 * Build a custom tag <x-scrapclassification> to display scrap classification information
 * 
 * Attributes:
 *  machine-id : Integer (required)
 */
(function () {

  class ScrapClassificationComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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


      self._parts = 0;
      self._scrap = 0;
      self._unproduced = 0;

      self._dateRange = undefined;
      self._operationRange = undefined;
      self._nextPeriod = 0;

      self.savescrapreason = undefined;

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

      // Initial date range with current date and time
      this._dateRange = pulseUtility.convertDateForWebService(new Date());

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('scrapclassification-content');

      this._buildUI();

      this.element.appendChild(this._content);

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

      // Initialization OK => switch to next context
      this.switchToNextContext();

      return;
    }

    /**
     * Build the user interface with operation, range, parts information and save component
     */
    _buildUI() {
      // Operation content
      let operationContent = document.createElement('div');
      operationContent.classList.add('operation-content');

      let prevBtn = document.createElement('i');
      prevBtn.classList.add('fa-solid', 'fa-chevron-left', 'btn-prev');
      prevBtn.addEventListener('click', () => {
        this._changePeriod(-1, this._operationRange);
      });
      operationContent.appendChild(prevBtn);

      let display = document.createElement('span');
      display.classList.add('operation-name')
      operationContent.appendChild(display);

      let nextBtn = document.createElement('i');
      nextBtn.classList.add('fa-solid', 'fa-chevron-right', 'btn-next');
      nextBtn.addEventListener('click', () => {
        this._changePeriod(1, this._operationRange);
      });
      operationContent.appendChild(nextBtn);

      this._content.appendChild(operationContent);

      // Range content
      let rangeContent = document.createElement('div');
      rangeContent.classList.add('range-content');

      prevBtn = document.createElement('i');
      prevBtn.classList.add('fa-solid', 'fa-chevron-left', 'btn-prev');
      prevBtn.addEventListener('click', () => {
        this._changePeriod(-1, this._dateRange);
      });
      rangeContent.appendChild(prevBtn);

      display = document.createElement('span');
      display.classList.add('range-display')
      rangeContent.appendChild(display);

      nextBtn = document.createElement('i');
      nextBtn.classList.add('fa-solid', 'fa-chevron-right', 'btn-next');
      nextBtn.addEventListener('click', () => {
        this._changePeriod(1, this._dateRange);
      });
      rangeContent.appendChild(nextBtn);

      this._content.appendChild(rangeContent);

      // Parts information content
      let partsContent = document.createElement('div');
      partsContent.classList.add('parts-content');

      // Number of parts
      let numberParts = document.createElement('div');
      numberParts.classList.add('number-parts', 'number-parts-content');

      let partsLabel = document.createElement('span');
      partsLabel.classList.add('parts-label');
      partsLabel.innerHTML = this.getTranslation('partcount', 'Part count: ');
      numberParts.appendChild(partsLabel);

      let partsValue = document.createElement('span');
      partsValue.classList.add('parts-value', 'total-parts');
      numberParts.appendChild(partsValue);

      partsContent.appendChild(numberParts);

      // Number of scrap
      let numberscrap = document.createElement('div');
      numberscrap.classList.add('number-scrap', 'number-parts-content');

      let scrapLabel = document.createElement('span');
      scrapLabel.classList.add('parts-label');
      scrapLabel.innerHTML = this.getTranslation('scrapcount', 'scrap count: ');
      numberscrap.appendChild(scrapLabel);

      let partsscrapValue = document.createElement('span');
      partsscrapValue.classList.add('parts-value', 'total-scrap');
      numberscrap.appendChild(partsscrapValue);

      // Add event listener for ScrapUpdateSignal
      eventBus.EventBus.removeEventListenerBySignal(this, 'ScrapUpdateSignal');
      eventBus.EventBus.addEventListener(this,
        'ScrapUpdateSignal',
        'scrap-context',
        (event) => {
          this._scrap += event.target;
          partsscrapValue.innerHTML = this._scrap;
        });

      partsContent.appendChild(numberscrap);

      // Number of unproduced parts
      let numberUnproduced = document.createElement('div');
      numberUnproduced.classList.add('number-unproduced', 'number-parts-content');

      let unproducedLabel = document.createElement('span');
      unproducedLabel.classList.add('parts-label');
      unproducedLabel.innerHTML = this.getTranslation('unproducedcount', 'Parts unproduced count: ');
      numberUnproduced.appendChild(unproducedLabel);

      let partsUnproducedValue = document.createElement('span');
      partsUnproducedValue.classList.add('parts-value', 'total-unproduced');
      numberUnproduced.appendChild(partsUnproducedValue);

      // Add event listener for UnproducedUpdateSignal
      eventBus.EventBus.removeEventListenerBySignal(this, 'RemachiningUpdateSignal');
      eventBus.EventBus.addEventListener(this,
        'RemachiningUpdateSignal',
        'scrap-context',
        (event) => {
          this._unproduced += event.target;
          partsUnproducedValue.innerHTML = this._unproduced;
        });

      partsContent.appendChild(numberUnproduced);

      this._content.appendChild(partsContent);

      this.savescrapreason = pulseUtility.createjQueryElementWithAttribute('x-savescrapreason', { 'machine-id': this.element.getAttribute('machine-id'), 'range': this._dateRange });
      this._content.appendChild(this.savescrapreason[0]);
    }

    /**
     * Change the displayed period (previous or next)
     * 
     * @param {number} nextPeriod - Direction: -1 for previous, 1 for next
     * @param {Object} range - Current date range object
     */
    _changePeriod(nextPeriod, range) {
      switch (nextPeriod) {
        case -1:
          this._dateRange = pulseUtility.convertDateForWebService(range.lower);
          break;
        case 1:
          this._dateRange = pulseUtility.convertDateForWebService(range.upper);
          break;
        default:
          break;
      }
      this._nextPeriod = nextPeriod;
      this.start();
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
      let url = 'Scrap/At/Get?MachineId=' + this.element.getAttribute('machine-id');
      if (this._dateRange !== undefined) {
        url += '&At=' + this._dateRange + '&NextPeriod=' + this._nextPeriod;
      }
      return url;
    }

    /**
     * Refresh with data from server
     * 
     * @param {Object} data - Server response
     */
    refresh(data) {
      if (data.ScrapCount !== undefined) {
        this._scrap = data.ScrapCount;
        let numberscrap = document.querySelector('.total-scrap');
        if (numberscrap) {
          numberscrap.innerHTML = this._scrap;
        }
      }
      if (data.FixableCount !== undefined) {
        this._unproduced = data.FixableCount;
        let numberUnproduced = document.querySelector('.total-unproduced');
        if (numberUnproduced) {
          numberUnproduced.innerHTML = this._unproduced;
        }
      }
      if (data.TotalCount !== undefined) {
        this._parts = data.TotalCount;
        let numberParts = document.querySelector('.total-parts');
        if (numberParts) {
          numberParts.innerHTML = this._parts;
        }
      }

      if (data.OperationSlot !== undefined && data.OperationSlot.Operation.Name !== undefined) {
        let operationName = document.querySelector('.operation-name');
        if (operationName) {
          operationName.innerHTML = data.OperationSlot.Operation.Name;
        }
      }
      if (data.OperationSlot !== undefined && data.OperationSlot.Range !== undefined) {
        this._operationRange = pulseRange.createDateRangeFromString(data.OperationSlot.Range);
      }

      if (data.Range !== undefined && data.ExtendedRange !== undefined) {
        this._dateRange = pulseRange.createDateRangeFromString(data.ExtendedRange);
        this.savescrapreason[0].setAttribute('range', pulseUtility.convertDateRangeForWebService(this._dateRange));
        let rangeDisplay = document.querySelector('.range-display');
        if (rangeDisplay) {
          rangeDisplay.innerHTML = pulseUtility.displayDateRange(data.Range);
        }
      }

      let btn = document.querySelector('.range-content').querySelector('.btn-next');
      if (data.Current !== undefined && data.Current) {
        btn.style.visibility = 'hidden';
      }
      else {
        btn.style.visibility = 'visible';
      }

      btn = document.querySelector('.operation-content').querySelector('.btn-next');
      if (data.OperationSlot !== undefined && data.OperationSlot.Current) {
        btn.style.visibility = 'hidden';
      }
      else {
        btn.style.visibility = 'visible';
      }

      let sendParts = undefined;
      if (data.ValidCount !== undefined && (data.ValidCount + data.ScrapCount + data.FixableCount) !== 0) {
        sendParts = data.ValidCount;
      } else {
        sendParts = data.TotalCount;
      }
      let sendData = {
        ValidCount: sendParts,
      }

      if (data.ScrapReport) sendData.ScrapReport = data.ScrapReport;


      eventBus.EventBus.dispatchToContext('partsUpdateSignal',
        'scrap-context',
        sendData);
    }

    /**
     * Display error message
     * 
     * @param {string} message - Error message
     */
    displayError(message) {
      this._messageSpan.innerHTML = message;
      console.error('x-scrapclassification : ' + message);
    }

    /**
     * Remove error message
     */
    removeError() {
      this._messageSpan.innerHTML = '';
    }
  }

  pulseComponent.registerElement('x-scrapclassification', ScrapClassificationComponent, ['machine-id']);
})();
