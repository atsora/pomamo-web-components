// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedalarmsat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-detailedalarmsat>` — detail panel listing the CNC alarms active at a
   * given point in time for one machine.
   *
   * Fetches `CncAlarm/At?MachineId=<id>&At=<when>` (extended with
   * `&IncludeIgnored=true` when `showIgnoredAlarm` config is `'true'`) on each
   * `machine-id` / `when` change and renders one row per alarm. Reacts to
   * `dateTimeChangeEvent` on `datetime-context` (updates `when`) and to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-detailedalarmsat
   * @attr {number} machine-id       (required) machine id
   * @attr {string} when             (required) ISO datetime
   * @attr {string} datetime-context event-bus context for `dateTimeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class DetailedAlarmsAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;
      self._detailedContent = undefined;

      return self;
    }

    get content () { return this._content; } // Optional

    _cleanDisplay () {
      this._detailedContent.replaceChildren();
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'when':
          if (this.isInitialized()) {
            this._cleanDisplay();
            this.start(); // requires to restart the component
          } break;
        case 'datetime-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeChangeEvent',
              newVal,
              this.onDateTimeChange.bind(this));
          }
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

    initialize () {
      this.addClass('pulse-details'); // Mandatory for loader

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listener and dispatchers
      if (this.element.hasAttribute('datetime-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeChangeEvent',
          this.element.getAttribute('datetime-context'),
          this.onDateTimeChange.bind(this));
      }
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'detailed-main';
      this.element.appendChild(this._content);

      // Title
      let title = this.getTranslation('detailsViewSubTitles.cncalarms', 'CNC alarms');
      let spanTitle = document.createElement('span');
      spanTitle.className = 'detailedalarmsat-title-span';
      spanTitle.innerHTML = title;
      let divTitle = document.createElement('div');
      divTitle.className = 'detailed-title';
      divTitle.appendChild(spanTitle);
      this._content.appendChild(divTitle);

      // Detailed content
      this._detailedContent = document.createElement('div');
      this._detailedContent.className = 'detailed-content';
      this._content.appendChild(this._detailedContent);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Create DOM - message for error - no need to store, can be removed
      let messageSpan = document.createElement('span');
      messageSpan.className = 'pulse-message';
      messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(messageSpan);
      this._detailedContent.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this._cleanDisplay();
      this.element.replaceChildren();

      this._detailedContent = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters () {
      if ((!this.element.hasAttribute('machine-id'))
        || (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id'))))) {
        // Delayed display :
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in detailedalarmsat.element');
        // Delayed display :
        this.setError(this.getTranslation('error.missingWhen', 'Missing when'));
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._cleanDisplay();

      let messageSpan = this.element.querySelector('.pulse-message');
      if (!messageSpan) {
        // Create DOM - message for error
        messageSpan = document.createElement('span');
        messageSpan.className = 'pulse-message';
        let messageDiv = document.createElement('div');
        messageDiv.className = 'pulse-message-div';
        messageDiv.appendChild(messageSpan);
        this._detailedContent.appendChild(messageDiv);
        this._content.style.display = '';
      }
      messageSpan.innerHTML = message;
    }

    removeError () {
      let messageSpan = this.element.querySelector('.pulse-message');
      if (messageSpan) {
        messageSpan.innerHTML = '';
      }
    }

    getShortUrl () {
      let url = 'CncAlarm/At?MachineId='
        + this.element.getAttribute('machine-id')
        + '&At=' + this.element.getAttribute('when');

      if ('true' == this.getConfigOrAttribute('showIgnoredAlarm', 'false')) {
        url += '&IncludeIgnored=true';
      }
      else {
        if ('false' == this.getConfigOrAttribute('showUnknownAlarm', 'true')) {
          url += '&KeepFocusOnly=true';
        }
      }
      return url;
    }

    refresh (data) {
      this._detailedContent.replaceChildren();

      if (data.ByMachineModule.length > 0) {

        // Empty range - to allow "table-like" display
        let spanRange = document.createElement('span');
        spanRange.className = 'detailedalarmsat-range-span';
        spanRange.innerHTML = '';
        let divRange = document.createElement('div');
        divRange.className = 'detailed-range';
        divRange.appendChild(spanRange);

        this._detailedContent.appendChild(divRange);

        let alarmIsEmpty = true;
        for (let iModule = 0; iModule < data.ByMachineModule.length; iModule++) {
          // machinemodule content
          let divWholeModule = document.createElement('div');
          divWholeModule.className = 'detailed-module-content';
          // If more than 1 module : display
          if (data.ByMachineModule.length > 1) {
            // Machine module
            let moduleDisplay = data.ByMachineModule[iModule].MachineModule.Display;
            let spanModule = document.createElement('span');
            spanModule.className = 'detailedalarmsat-module-span';
            spanModule.innerHTML = moduleDisplay;
            let divModule = document.createElement('div');
            divModule.className = 'detailed-machinemodule';
            divModule.appendChild(spanModule);
            if (data.ByMachineModule[iModule].MachineModule.Main) { // highlight
              spanModule.classList.add('detailed-mainmachinemodule');
            }
            divWholeModule.appendChild(divModule);
          }

          // DATA
          let spanFocused = document.createElement('span');
          spanFocused.className = 'detailed-module-span-focused detailed-module-span';
          spanFocused.innerHTML = this.getTranslation('focused', 'Focused');
          let divDataFocused = document.createElement('div');
          divDataFocused.className = 'detailed-module-data-focused';
          divDataFocused.appendChild(spanFocused);

          let spanUnknown = document.createElement('span');
          spanUnknown.className = 'detailed-module-span-unknown detailed-module-span';
          spanUnknown.innerHTML = this.getTranslation('unknown', 'Unknown');
          let divDataUnknown = document.createElement('div');
          divDataUnknown.className = 'detailed-module-data-unknown';
          divDataUnknown.appendChild(spanUnknown);

          let spanIgnored = document.createElement('span');
          spanIgnored.className = 'detailed-module-span-ignored detailed-module-span';
          spanIgnored.innerHTML = this.getTranslation('ignored', 'Ignored');
          let divDataIgnored = document.createElement('div');
          divDataIgnored.className = 'detailed-module-data-ignored';
          divDataIgnored.appendChild(spanIgnored);

          let hasFocused = false;
          let hasUnknown = false;
          let hasIgnored = false;
          let moduleIsEmpty = false;
          for (let iAlarms = 0; iAlarms < data.ByMachineModule[iModule].CncAlarms.length; iAlarms++) {
            let range = data.ByMachineModule[iModule].CncAlarms[iAlarms].Range;
            let color = data.ByMachineModule[iModule].CncAlarms[iAlarms].Color;
            //let type = data.ByMachineModule[iModule].CncAlarms[iAlarms].Type; // ex: CRITICAL
            //let severity = data.ByMachineModule[iModule].CncAlarms[iAlarms].Severity; // ex: 'Critical'
            //let severityDescription = data.ByMachineModule[iModule].CncAlarms[iAlarms].SeverityDescription; // == horrible string
            //let stop = data.ByMachineModule[iModule].CncAlarms[iAlarms].Stop;
            let focus = data.ByMachineModule[iModule].CncAlarms[iAlarms].Focus;
            let display = data.ByMachineModule[iModule].CncAlarms[iAlarms].Display;

            // range display
            let rangeDisplayDiv = document.createElement('div');
            rangeDisplayDiv.className = 'detailedalarmsat-range';
            let tmpDateRange = pulseRange.createDateRangeFromString(range);
            let rangeDisplay = pulseUtility.displayDateRange(tmpDateRange, true);
            let spanRange = document.createElement('span');
            spanRange.className = 'detailedalarmsat-range-span';
            spanRange.innerHTML = rangeDisplay;
            rangeDisplayDiv.appendChild(spanRange);

            // Color + text display
            // color
            let colorDisplay = document.createElement('div');
            colorDisplay.className = 'detailedalarmsat-color';
            let svg = pulseSvg.createRect(0, 0, 10, 10, color, 'detailedalarmsat-color-svg');
            if (svg != null) {
              colorDisplay.appendChild(svg);
            }
            // span
            let spanDisplay = document.createElement('span');
            spanDisplay.className = 'detailedalarmsat-value';
            spanDisplay.innerHTML = display;
            let divDetails = document.createElement('div');
            divDetails.className = 'detailed-single-data';
            divDetails.appendChild(colorDisplay);
            divDetails.appendChild(spanDisplay);
            if (true == focus) {
              divDataFocused.appendChild(rangeDisplayDiv);
              divDataFocused.appendChild(divDetails);
              hasFocused = true;
            }
            else if (false == focus) {
              divDataIgnored.appendChild(rangeDisplayDiv);
              divDataIgnored.appendChild(divDetails);
              hasIgnored = true;
            }
            else {
              divDataUnknown.appendChild(rangeDisplayDiv);
              divDataUnknown.appendChild(divDetails);
              hasUnknown = true;
            }
          } // end for
          let divData = document.createElement('div');
          divData.className = 'detailed-module-data';
          if (hasFocused) {
            divData.appendChild(divDataFocused);
            moduleIsEmpty = false;
          }
          if (hasUnknown
            && ('true' == this.getConfigOrAttribute('showUnknownAlarm'), 'true')) {
            divData.appendChild(divDataUnknown);
            moduleIsEmpty = false;
          }
          if (hasIgnored
            && ('true' == this.getConfigOrAttribute('showIgnoredAlarm', 'false'))) {
            divData.appendChild(divDataIgnored);
            moduleIsEmpty = false;
          }
          if (false == moduleIsEmpty) {
            divWholeModule.appendChild(divData);
            this._detailedContent.appendChild(divWholeModule);
            alarmIsEmpty = false;
          }
        }

        if (false == alarmIsEmpty) {
          this._content.style.display = '';
        }
        else {
          this._content.style.display = 'none';
        }
      }
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
    // Callback events
    onDateTimeChange (event) {
      this.element.setAttribute('when', event.target.when);
    }
  }

  pulseComponent.registerElement('x-detailedalarmsat', DetailedAlarmsAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
