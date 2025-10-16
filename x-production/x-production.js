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

      //this._range = undefined;

      // DOM -> never in contructor
      self._content = undefined; // Optional

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

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('production-content');
      // No Work info -> remote
      // No global -> for the moment
      // Shift info : Actual 2 Target 3

      // Actual production
      this._actualDisplay = $('<div></div>').addClass('production-actual-value');

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
      this._separator = $('<span></span>').addClass('production-separator');

      // Target production
      this._targetDisplay = $('<div></div>').addClass('production-target-value');

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


      this._2on3Display = $('<div></div>').addClass('production-2-on-3')
        .append(this._actualDisplay).append(this._separator).append(this._targetDisplay);

      this._percentDisplaySpan = $('<span></span>').addClass('production-percent-span').hide();
      this._percentDisplay = $('<div></div>').addClass('production-percent').append(this._percentDisplaySpan);

      this._content.append(this._2on3Display).append(this._percentDisplay);
      $(this.element).append(this._content);

      if ('true' == this.getConfigOrAttribute('productionpercent')) {
        $(this._percentDisplay).show();
        $(this._percentDisplaySpan).show();
        $(this._2on3Display).hide();
      }
      else if ('actualonly' == this.getConfigOrAttribute('productionpercent')) {
        $(this._percentDisplay).hide();
        $(this._2on3Display).show();
        this._separator.hide();
        this._targetDisplay.hide();
      }
      else { // actual + target (default)
        $(this._percentDisplay).hide();
        $(this._2on3Display).show();
        this._separator.show();
        this._targetDisplay.show();
      }

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      this._actualDisplay = undefined;
      this._targetDisplay = undefined;
      this._percentDisplaySpan = undefined;
      this._percentDisplay = undefined;
      this._2on3Display = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset() { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    /*_setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }*/

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('Machine Id has incorrect value in production.element');
        this.setError('bad machine-id'); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError(message) {
      $(this._content).hide();
      eventBus.EventBus.dispatchToContext('operationChangeEvent',
        this.element.getAttribute('machine-id'), {});
    }

    removeError() {
      $(this._content).hide();
      eventBus.EventBus.dispatchToContext('operationChangeEvent',
        this.element.getAttribute('machine-id'), {});
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl() {
      let url = 'Operation/ProductionMachiningStatus?MachineId=' + this.element.getAttribute('machine-id');
      /* To restore if global in needed... maybe one day or never
      if (!hideglobal) {  url += '&Option=' + 'TrackTask'; }*/
      return url;
    }

    refresh(data) {
      $(this._content).show();
      if (data.NbPiecesDoneDuringShift != undefined) {
        $(this._actualDisplay).show();
        // Trunk with 2 decimal if needed
        let done = Math.floor(data.NbPiecesDoneDuringShift * 100) / 100;
        this._actualDisplay.find('.production-number-actual').text(done);
      }
      else {
        $(this._actualDisplay).hide();
      }

      if (data.GoalNowShift != undefined) {
        // Trunk with 2 decimal if needed
        let goal = Math.floor(data.GoalNowShift * 100) / 100;
        this._targetDisplay.find('.production-number-target').text(goal);
      }

      if ((data.NbPiecesDoneDuringShift != undefined)
        && (data.GoalNowShift != undefined)
        && (Number(data.GoalNowShift) > 0)) {
        let percent = 100.0 * data.NbPiecesDoneDuringShift / data.GoalNowShift;
        // Trunk
        percent = Math.floor(percent);
        $(this._percentDisplaySpan).text(percent + '%');
        //$(this._percentDisplaySpan).show();
      }
      else {
        $(this._percentDisplaySpan).text('');
        //$(this._percentDisplaySpan).hide();
      }

      if ((data.GoalNowShift != undefined)
        && (Number(data.GoalNowShift) > 0)) {
        let thresholdunitispart = this.getConfigOrAttribute('thresholdunitispart', 'true');
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 0);
        let thresholdorangeproduction = this.getConfigOrAttribute('thresholdorangeproduction', 0);
        // colors and efficiency
        let diff = data.GoalNowShift - data.NbPiecesDoneDuringShift;
        let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / data.GoalNowShift);
        if ((diff * multiplier) > thresholdredproduction) {
          $(this._content).addClass('bad-efficiency').removeClass('mid-efficiency').removeClass('good-efficiency');
        }
        else {
          if ((diff * multiplier) > thresholdorangeproduction) {
            $(this._content).addClass('mid-efficiency').removeClass('bad-efficiency').removeClass('good-efficiency');
          }
          else {
            $(this._content).addClass('good-efficiency').removeClass('mid-efficiency').removeClass('bad-efficiency');
          }
        }
      }
      else {
        $(this._content).removeClass('good-efficiency').removeClass('mid-efficiency').removeClass('bad-efficiency');
      }

      // Forward workinfo data to external display
      //if (this.element.hasAttribute('machine-id')) { Always
      eventBus.EventBus.dispatchToContext('operationChangeEvent',
        this.element.getAttribute('machine-id'),
        { workinformations: data.WorkInformations });
    }

    // Callback events

    /**
      * Event callback in case a config is updated: (re-)start the component
      * 
      * @param {*} event 
      */
    onConfigChange(event) {
      if (event.target.config == 'productionpercent') {
        if ('true' == this.getConfigOrAttribute('productionpercent')) {
          $(this._percentDisplay).show();
          $(this._percentDisplaySpan).show();
          $(this._2on3Display).hide();
        }
        else if ('actualonly' == this.getConfigOrAttribute('productionpercent')) {
          $(this._percentDisplay).hide();
          $(this._2on3Display).show();
          this._separator.hide();
          this._targetDisplay.hide();
        }
        else {
          $(this._percentDisplay).hide();
          $(this._2on3Display).show();
          this._separator.show();
          this._targetDisplay.show();
        }
      }
      if ((event.target.config == 'thresholdunitispart')
        || (event.target.config == 'thresholdredproduction')
        || (event.target.config == 'thresholdorangeproduction')) {
        this.start();
      }
    }

    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
  }

  pulseComponent.registerElement('x-production', productionComponent, ['machine-id']);
})();
