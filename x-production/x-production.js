// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-production
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
//var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

require('x-clock/x-clock');

(function () {

  class productionComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      this._range = undefined;

      self._content = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start(); // To re-validate parameters
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('pulse-text');

      // Update here some internal parameters

      // listeners

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }


      // In case of clone, need to be empty :
      this.element.innerHTML = '';

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('production-content');
      // No Work info -> remote
      // No global -> for the moment
      // Shift info : Actual 2 Target 3

      // Actual production
      this._actualDisplay = document.createElement('div');
      this._actualDisplay.classList.add('production-actual-value');

      let contentTextActualDisplay = document.createElement('div');
      contentTextActualDisplay.classList.add('production-content-text-actual');

      let textActualDisplay = document.createElement('span');
      textActualDisplay.classList.add('production-text-actual');
      textActualDisplay.innerText = this.getTranslation('actual', 'Actual');
      contentTextActualDisplay.append(textActualDisplay);

      let clockActualContent = document.createElement('div');
      clockActualContent.classList.add('production-clock-content');

      let prepositionActualDisplay = document.createElement('span');
      prepositionActualDisplay.classList.add('production-preposition-actual');
      prepositionActualDisplay.innerText = this.getTranslation('preposition', 'at');
      clockActualContent.append(prepositionActualDisplay);

      let clockActualDisplay = document.createElement('x-clock');
      clockActualDisplay.setAttribute('display-seconds', 'false');
      clockActualContent.append(clockActualDisplay);

      let separatorActualDisplay = document.createElement('span');
      separatorActualDisplay.classList.add('production-actual-separator');
      separatorActualDisplay.innerText = ": ";
      clockActualContent.append(separatorActualDisplay);

      contentTextActualDisplay.append(clockActualContent);
      this._actualDisplay.append(contentTextActualDisplay);

      let contentActualDisplay = document.createElement('span');
      contentActualDisplay.classList.add('production-number-actual');
      this._actualDisplay.append(contentActualDisplay);

      // Separator
      this._separator = document.createElement('span');
      this._separator.classList.add('production-separator');

      // Target production
      this._targetDisplay = document.createElement('div');
      this._targetDisplay.classList.add('production-target-value');

      let contentTextTargetDisplay = document.createElement('div');
      contentTextTargetDisplay.classList.add('production-content-text-target');

      let textTargetDisplay = document.createElement('span');
      textTargetDisplay.classList.add('production-text-target');
      textTargetDisplay.innerText = this.getTranslation('target', 'Target');
      contentTextTargetDisplay.append(textTargetDisplay);

      let clockTargetContent = document.createElement('div');
      clockTargetContent.classList.add('production-clock-content');


      let prepositionTargetDisplay = document.createElement('span');
      prepositionTargetDisplay.classList.add('production-preposition-target');
      prepositionTargetDisplay.innerText = this.getTranslation('preposition', 'at');
      clockTargetContent.append(prepositionTargetDisplay);

      let clockTargetDisplay = document.createElement('x-clock');
      clockTargetDisplay.setAttribute('display-seconds', 'false');
      clockTargetContent.append(clockTargetDisplay);

      let separatorTargetDisplay = document.createElement('span');
      separatorTargetDisplay.classList.add('production-target-separator');
      separatorTargetDisplay.innerText = ": ";
      clockTargetContent.append(separatorTargetDisplay);

      contentTextTargetDisplay.append(clockTargetContent);
      this._targetDisplay.append(contentTextTargetDisplay);

      let contentTargetDisplay = document.createElement('span');
      contentTargetDisplay.classList.add('production-number-target');
      this._targetDisplay.append(contentTargetDisplay);


      this._percentDisplaySpan = document.createElement('span');
      this._percentDisplaySpan.classList.add('production-percent-span');
      this._percentDisplaySpan.style.display = 'none';
      this._percentDisplay = document.createElement('div');
      this._percentDisplay.classList.add('production-percent');
      this._percentDisplay.append(this._percentDisplaySpan);

      this._content.append(this._actualDisplay, this._separator, this._targetDisplay, this._percentDisplay);
      this.element.append(this._content);

      if (!this._isDisplayManagedExternally()) {
        this._applyProductionDisplayFromConfig();
      }

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.append(loader);
      this._content.append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.append(this._messageSpan);
      this._content.append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      this.element.innerHTML = '';

      this._actualDisplay = undefined;
      this._targetDisplay = undefined;
      this._percentDisplaySpan = undefined;
      this._percentDisplay = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset() { // Optional implementation
      this.removeError();

      this.element.querySelector('.production-number-actual').innerText = '';
      this.element.querySelector('.production-number-target').innerText = '';


      this.element.querySelectorAll('.production-clock-content').forEach(el => {
      if (this._range == undefined) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });;

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('Machine Id has incorrect value in production.element');
        this.setError(this.getTranslation('error.invalidMachineId', 'Invalid machine ID')); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError(message) {
      if (this._content) {
        this._content.style.display = 'none';
      }
      eventBus.EventBus.dispatchToContext('operationChangeEvent',
        this.element.getAttribute('machine-id'), {});
    }

    removeError() {
      if (this._content) {
        this._content.style.display = 'none';
      }
      eventBus.EventBus.dispatchToContext('operationChangeEvent',
        this.element.getAttribute('machine-id'), {});
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl() {
      let url;
      if (this._range != undefined) {
        url = 'Operation/PartProductionRange?GroupId='
          + this.element.getAttribute('machine-id')
          + '&Range='
          + pulseUtility.convertDateRangeForWebService(this._range);
      }
      else {
        url = 'Operation/ProductionMachiningStatus?MachineId=' + this.element.getAttribute('machine-id');
      }

      return url;
    }

    refresh(data) {
      this._data = data;
      this._content.style.display = '';
      let nbPiecesDone = undefined;
      let goal = undefined;
      if (this._range != undefined) {
        if (data.NbPieces != undefined) nbPiecesDone = data.NbPieces;
        if (data.Goal != undefined) goal = Math.floor(data.Goal);
      }
      else {
        if (data.NbPiecesDoneDuringShift != undefined) nbPiecesDone = data.NbPiecesDoneDuringShift;
        if (data.GoalNowShift != undefined) goal = data.GoalNowShift;
      }
      this._hasActualData = (nbPiecesDone != undefined);
      this._hasTargetData = (goal && Number(goal) > 0);
      this._hasPercentData = this._hasActualData && this._hasTargetData;

      if (this._hasActualData) {
        // Trunk with 2 decimal if needed
        let done = Math.floor(nbPiecesDone * 100) / 100;
        this._actualDisplay.querySelector('.production-number-actual').textContent = done;
      }
      else {
        this._actualDisplay.querySelector('.production-number-actual').textContent = '';
      }

      if (this._hasTargetData) {
        // Trunk with 2 decimal if needed
        let goalValue = Math.floor(goal * 100) / 100;
        this._targetDisplay.querySelector('.production-number-target').textContent = goalValue;
      }
      else {
        this._targetDisplay.querySelector('.production-number-target').textContent = '';
      }

      if (this._hasPercentData) {
        let percent = 100.0 * nbPiecesDone / goal;
        // Trunk
        percent = Math.floor(percent);
        this._percentDisplaySpan.textContent = percent + '%';
        //$(this._percentDisplaySpan).show();
      }
      else {
        this._percentDisplaySpan.textContent = '';
        //$(this._percentDisplaySpan).hide();
      }

      this._updateColorEfficiency();

      if (!this._isDisplayManagedExternally()) {
        this._applyProductionDisplayFromConfig();
      }

      // Forward workinfo data to external display
      //if (this.element.hasAttribute('machine-id')) { Always
      if (data.WorkInformations) {
        eventBus.EventBus.dispatchToContext('operationChangeEvent',
          this.element.getAttribute('machine-id'),
          { workinformations: data.WorkInformations });
      }
    }

    _updateColorEfficiency() {
      let nbPiecesDone = undefined;
      let goal = undefined;
      if (this._range != undefined) {
        if (this._data.NbPieces != undefined) nbPiecesDone = this._data.NbPieces;
        if (this._data.Goal != undefined) goal = Math.floor(this._data.Goal);
      }
      else {
        if (this._data.NbPiecesDoneDuringShift != undefined) nbPiecesDone = this._data.NbPiecesDoneDuringShift;
        if (this._data.GoalNowShift != undefined) goal = this._data.GoalNowShift;
      }

      if ((goal != undefined)
        && (Number(goal) > 0)) {
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 60);
        let thresholdtargetproduction = this.getConfigOrAttribute('thresholdtargetproduction', 80);
        // colors and efficiency
        let ratio = nbPiecesDone / goal;
        if (ratio < thresholdredproduction / 100) {
          this._actualDisplay.classList.add('bad-efficiency');
          this._actualDisplay.classList.remove('mid-efficiency', 'good-efficiency');
          this._percentDisplaySpan.classList.add('bad-efficiency');
          this._percentDisplaySpan.classList.remove('mid-efficiency', 'good-efficiency');
        }
        else {
          if (ratio < thresholdtargetproduction / 100) {
            this._actualDisplay.classList.add('mid-efficiency');
            this._actualDisplay.classList.remove('bad-efficiency', 'good-efficiency');
            this._percentDisplaySpan.classList.add('mid-efficiency');
            this._percentDisplaySpan.classList.remove('bad-efficiency', 'good-efficiency');
          }
          else {
            this._actualDisplay.classList.add('good-efficiency');
            this._actualDisplay.classList.remove('mid-efficiency', 'bad-efficiency');
            this._percentDisplaySpan.classList.add('good-efficiency');
            this._percentDisplaySpan.classList.remove('mid-efficiency', 'bad-efficiency');
          }
        }
      }
      else {
        this._actualDisplay.classList.remove('good-efficiency', 'mid-efficiency', 'bad-efficiency');
        this._percentDisplaySpan.classList.remove('good-efficiency', 'mid-efficiency', 'bad-efficiency');
      }
    }

    // Callback events

    /**
      * Event callback in case a config is updated: (re-)start the component
      *
      * @param {*} event
      */
    onConfigChange(event) {
      if (event.target.config === 'thresholdsupdated') {
        if (this._data) this._updateColorEfficiency();
      }
      if (event.target.config == 'productionpercent' && !this._isDisplayManagedExternally()) {
        this._applyProductionDisplayFromConfig();
      }
    }

    _isDisplayManagedExternally() {
      return this.element.hasAttribute('manual-display');
    }

    _applyProductionDisplayFromConfig() {
      const mode = this.getConfigOrAttribute('productionpercent');
      const hasActual = !!this._hasActualData;
      const hasTarget = !!this._hasTargetData;
      const hasPercent = !!this._hasPercentData;

      if ('true' == mode) {
        this._setVisible(this._percentDisplay, hasPercent);
        this._setVisible(this._percentDisplaySpan, hasPercent);
        this._setVisible(this._actualDisplay, false);
        this._setVisible(this._separator, false);
        this._setVisible(this._targetDisplay, false);
      }
      else if ('actualonly' == mode) {
        this._setVisible(this._percentDisplay, false);
        this._setVisible(this._percentDisplaySpan, false);
        this._setVisible(this._actualDisplay, hasActual);
        this._setVisible(this._separator, false);
        this._setVisible(this._targetDisplay, false);
      }
      else { // actual + target (default)
        this._setVisible(this._percentDisplay, false);
        this._setVisible(this._percentDisplaySpan, false);
        this._setVisible(this._actualDisplay, hasActual);
        this._setVisible(this._targetDisplay, hasTarget);
        this._setVisible(this._separator, hasActual && hasTarget);
      }
    }

    _setVisible(element, visible) {
      if (!element) {
        return;
      }
      element.style.display = visible ? '' : 'none';
    }

    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;

      if (!newRange._lower || !newRange._upper) return false;

      const now = new Date();

      const isIncluded = now >= newRange._lower && now < newRange._upper;

      if (!isIncluded) this._range = newRange;
      else this._range = undefined;

      this.start();
    }
  }

  pulseComponent.registerElement('x-production', productionComponent, ['machine-id', 'period-context', 'machine-context']);
})();
