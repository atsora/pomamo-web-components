// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedcncvaluesat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-detailedcncvaluesat>` — detail panel showing the CNC field values active
   * at a given point in time for one machine.
   *
   * Fetches `CncValueAt?MachineId=<id>&At=<when>` on each `machine-id` / `when`
   * change and renders one row per field with its display, value, and unit.
   * Reacts to `dateTimeChangeEvent` on `datetime-context` (updates `when`) and
   * to `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-detailedcncvaluesat
   * @attr {number} machine-id       (required) machine id
   * @attr {string} when             (required) ISO datetime
   * @attr {string} datetime-context event-bus context for `dateTimeChangeEvent`
   * @attr {string} machine-context  event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class DetailedCNCValuesAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
            this.start(); // requires to restart the component.
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
      let title = this.getTranslation('detailsViewSubTitles.cncvalue', 'cncvalues');
      let spanTitle = document.createElement('span');
      spanTitle.className = 'detailedcncvaluesat-title-span';
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
        console.error('missing attribute when in detailedcncvaluesat.element');
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
      if (messageSpan == null) {
        // Create DOM - message for error
        messageSpan = document.createElement('span');
        messageSpan.className = 'pulse-message';
        let messageDiv = document.createElement('div');
        messageDiv.className = 'pulse-message-div';
        messageDiv.appendChild(messageSpan);
        this._detailedContent.appendChild(messageDiv);
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
      // Return the Web Service URL here without path
      return 'CncValueAt?MachineId='
        + this.element.getAttribute('machine-id')
        + '&At=' + this.element.getAttribute('when');
    }

    refresh (data) {
      this._detailedContent.replaceChildren();

      if (data.ByMachineModule.length <= 0) {
        this._content.style.display = 'none';
      }
      else {
        this._content.style.display = '';

        // Empty range - to allow "table-like" display
        let divRange = document.createElement('div');
        divRange.className = 'detailed-range';
        let spanRange = document.createElement('span');
        spanRange.className = 'detailedcncvaluesat-range-span';
        spanRange.innerHTML = '';
        divRange.appendChild(spanRange);

        this._detailedContent.appendChild(divRange);

        for (let iModule = 0; iModule < data.ByMachineModule.length; iModule++) {
          // machinemodule content
          let divWholeModule = document.createElement('div');
          divWholeModule.className = 'detailed-module-content';
          // If more than 1 module : display
          if (data.ByMachineModule.length > 1) {
            // Machine module
            let moduleDisplay = data.ByMachineModule[iModule].MachineModule.Display;
            let spanModule = document.createElement('span');
            spanModule.className = 'detailedcncvaluesat-module-span';
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
          let divData = document.createElement('div');
          divData.className = 'detailed-module-data';
          for (let iField = 0; iField < data.ByMachineModule[iModule].ByField.length; iField++) {
            let fieldDisplay = data.ByMachineModule[iModule].ByField[iField].Field.Display + ': ';
            let fieldValue = data.ByMachineModule[iModule].ByField[iField].Value;
            let spanField = document.createElement('span');
            spanField.className = 'detailedcncvaluesat-field';
            spanField.innerHTML = fieldDisplay;
            let spanValue = document.createElement('span');
            spanValue.className = 'detailedcncvaluesat-value';
            let svgValue = null;
            if (pulseUtility.isInteger(fieldValue)) {
              spanValue.innerHTML = fieldValue;
            }
            else {
              if (pulseUtility.isFloat(fieldValue)) {
                spanValue.innerHTML = fieldValue.toFixed(2);
              }
              else {
                if (pulseUtility.isBoolean(fieldValue)) {
                  spanValue.innerHTML = fieldValue ? this.getTranslation('true', 'true') : this.getTranslation('false', 'false');
                }
                else {
                  if (typeof fieldValue == 'string') {
                    spanValue.innerHTML = fieldValue;
                  }
                  else {
                    spanValue.innerHTML = '';
                    let val = fieldValue.Lights;
                    if (!pulseUtility.isNotDefined(fieldValue.Lights)) {

                      let size = 12;
                      let lineWidth = 5;
                      // CREATE SVG +2 all around to show grey stroke
                      svgValue = pulseSvg.createBase(2 + size * val.length, 2 + size,
                        'stacklight-svg');
                      //, 2 + size * val.length, 2+size);

                      // 1px on each border to show grey stroke
                      let top = 1;
                      let bottom = top + size;

                      // Slices
                      for (let i = 0; i < val.length; i++) {
                        // val.Status == "on" "flashing" "off" // fill-opacity = 1 or less or animate
                        let sliceClasses = 'stacklight-slice' + ' '
                          + 'stacklight-' + val[i].Status + ' '
                          + 'stacklight-color-' + val[i].Color;

                        let slice = document.createElementNS(pulseSvg.get_svgNS(), 'path');
                        slice.setAttribute('d',
                          'M' + (1 + i * size) + ',' + bottom +
                          ' L' + (1 + i * size + lineWidth) + ',' + bottom +
                          ' L' + (1 + i * size + size) + ',' + top +
                          ' L' + (1 + i * size + size - lineWidth) + ',' + top +
                          ' L' + (1 + i * size) + ',' + bottom +
                          ' L' + (1 + i * size + lineWidth) + ',' + bottom); // Redraw a line to show good corner with stroke
                        slice.setAttribute('class', sliceClasses);

                        svgValue.appendChild(slice);
                      }
                    } // End of Light
                  }
                }
              }
            }

            let divDetails = document.createElement('div');
            divDetails.className = 'detailed-single-data';
            divDetails.appendChild(spanField);
            if (svgValue != null)
              divDetails.appendChild(svgValue);
            else
              divDetails.appendChild(spanValue);
            divData.appendChild(divDetails);

            //data.ByMachineModule[iModule].ByField[iField].Color
            //data.ByMachineModule[iModule].ByField[iField].PerformanceField //bool
          }
          divWholeModule.appendChild(divData);

          this._detailedContent.appendChild(divWholeModule);
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

  pulseComponent.registerElement('x-detailedcncvaluesat', DetailedCNCValuesAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
