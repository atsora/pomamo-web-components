// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-scrapclassification
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:eventBus
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseRange from 'pulseRange';
import * as eventBus from 'eventBus';

import 'x-savescrapreason/x-savescrapreason';

(function () {

  /**
   * `<x-scrapclassification>` — current scrap count for one machine with
   * an inline "edit scrap reason" dialog.
   *
   * Fetches `Scrap/At/Get?MachineId=<id>[&At=<date/time>&NextPeriod=<n>]` (no At: the
   * current period, the latest cycles) and
   * renders the produced / scrap / unproduced / set-up counts, with an embedded
   * `x-savescrapreason` to record the reasons. The previous / next buttons
   * navigate between the periods (of the scrap reports, and of the operations).
   * Opened by `pulseDetailsPopup.openChangeScrapClassificationDialog()`
   * (x-scrapstatus), with the machine-id of the page: no period or machine context.
   *
   * @element x-scrapclassification
   * @attr {number} machine-id      (required) machine id
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
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
      self._setup = 0;

      self._dateRange = undefined;
      self._operationRange = undefined;
      // Date/time of the requested period (At parameter), undefined for the current period (the latest cycles)
      self._at = undefined;
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
          this._at = undefined;
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

      // Initially the current period (the latest cycles): no At
      this._dateRange = undefined;
      this._at = undefined;

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

      // Add event listener for FixableUpdateSignal (reasons of category Fixable)
      eventBus.EventBus.removeEventListenerBySignal(this, 'FixableUpdateSignal');
      eventBus.EventBus.addEventListener(this,
        'FixableUpdateSignal',
        'scrap-context',
        (event) => {
          this._unproduced += event.target;
          partsUnproducedValue.innerHTML = this._unproduced;
        });

      partsContent.appendChild(numberUnproduced);

      // Number of set-up parts (for example sent to metrology before the validation of the set-up)
      let numberSetup = document.createElement('div');
      numberSetup.classList.add('number-setup', 'number-parts-content');

      let setupLabel = document.createElement('span');
      setupLabel.classList.add('parts-label');
      setupLabel.innerHTML = this.getTranslation('setupcount', 'Set-up parts: ');
      numberSetup.appendChild(setupLabel);

      let partsSetupValue = document.createElement('span');
      partsSetupValue.classList.add('parts-value', 'total-setup');
      numberSetup.appendChild(partsSetupValue);

      // Add event listener for SetupUpdateSignal (reasons of category Setup)
      eventBus.EventBus.removeEventListenerBySignal(this, 'SetupUpdateSignal');
      eventBus.EventBus.addEventListener(this,
        'SetupUpdateSignal',
        'scrap-context',
        (event) => {
          this._setup += event.target;
          partsSetupValue.innerHTML = this._setup;
        });

      partsContent.appendChild(numberSetup);

      this._content.appendChild(partsContent);

      this.savescrapreason = pulseUtility.createElementWithAttribute('x-savescrapreason', { 'machine-id': this.element.getAttribute('machine-id'), 'range': this._dateRange });
      this._content.appendChild(this.savescrapreason);
    }

    /**
     * Change the displayed period (previous or next)
     *
     * @param {number} nextPeriod - Direction: -1 for previous, 1 for next
     * @param {Object} range - Current date range object
     */
    _changePeriod(nextPeriod, range) {
      // Scrap/At returns the period at the date/time At (NextPeriod is ignored by the web service):
      // just before the lower bound (excluded) for the previous period,
      // just after the upper bound for the next one (a scrap report (lower,upper] includes its upper bound)
      switch (nextPeriod) {
        case -1:
          if (range && range.lower) {
            this._at = pulseUtility.convertDateForWebService(new Date(range.lower.getTime() - 1000));
          }
          break;
        case 1:
          if (range && range.upper) {
            this._at = pulseUtility.convertDateForWebService(new Date(range.upper.getTime() + (range.upperInclusive ? 1000 : 0)));
          }
          else { // Open period: the current one
            this._at = undefined;
          }
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
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        return;
      }

      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
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
      // No At for the current period: the latest cycles
      if (this._at !== undefined) {
        url += '&At=' + this._at + '&NextPeriod=' + this._nextPeriod;
      }
      return url;
    }

    /**
     * Refresh with data from server
     *
     * @param {Object} data - Server response
     */
    refresh(data) {
      // Counters of the existing report, 0 when the period has no report yet
      this._scrap = data.ScrapCount || 0;
      this._unproduced = data.FixableCount || 0;
      this._setup = data.SetupCount || 0;
      const setCounter = (selector, value) => {
        let element = this.element.querySelector(selector);
        if (element) {
          element.innerHTML = value;
        }
      };
      setCounter('.total-scrap', this._scrap);
      setCounter('.total-unproduced', this._unproduced);
      setCounter('.total-setup', this._setup);
      if (data.TotalCount !== undefined) {
        this._parts = data.TotalCount;
        let numberParts = this.element.querySelector('.total-parts');
        if (numberParts) {
          numberParts.innerHTML = this._parts;
        }
      }

      // OperationDTO of the web service: Display (Name in older versions)
      let operationDisplay = (data.OperationSlot && data.OperationSlot.Operation)
        ? (data.OperationSlot.Operation.Display || data.OperationSlot.Operation.Name)
        : undefined;
      if (operationDisplay !== undefined) {
        let operationName = this.element.querySelector('.operation-name');
        if (operationName) {
          operationName.innerHTML = operationDisplay;
        }
      }
      if (data.OperationSlot !== undefined && data.OperationSlot.Range !== undefined) {
        this._operationRange = pulseRange.createDateRangeFromString(data.OperationSlot.Range);
      }

      // ExtendedRange: range of the report to save, and of the navigation. Range: the cycles, for the display
      // (empty when there is no completed cycle to declare)
      if (data.ExtendedRange) {
        this._dateRange = pulseRange.createDateRangeFromString(data.ExtendedRange);
        this.savescrapreason.setAttribute('range', pulseUtility.convertDateRangeForWebService(this._dateRange));
      }
      else {
        this.savescrapreason.removeAttribute('range');
      }
      let rangeDisplay = this.element.querySelector('.range-display');
      if (rangeDisplay) {
        rangeDisplay.innerHTML = data.Range ? pulseUtility.displayDateRange(data.Range) : '';
      }

      let btn = this.element.querySelector('.range-content').querySelector('.btn-next');
      if (data.Current !== undefined && data.Current) {
        btn.style.visibility = 'hidden';
      }
      else {
        btn.style.visibility = 'visible';
      }

      btn = this.element.querySelector('.operation-content').querySelector('.btn-next');
      if (data.OperationSlot !== undefined && data.OperationSlot.Current) {
        btn.style.visibility = 'hidden';
      }
      else {
        btn.style.visibility = 'visible';
      }

      let sendParts = undefined;
      if (data.ValidCount !== undefined && (data.ValidCount + (data.ScrapCount || 0) + (data.FixableCount || 0) + (data.SetupCount || 0)) !== 0) {
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
