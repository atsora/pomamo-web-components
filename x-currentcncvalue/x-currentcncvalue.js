// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currentcncvalue
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

import * as pulseUtility from 'pulseUtility';
import * as pulseComponent from 'pulsecomponent';
import * as pulseSvg from 'pulseSvg';

(function () {

  /**
   * `<x-currentcncvalue>` — current CNC field value for one machine.
   *
   * Polls `CncValue/Current?MachineId=<id>[&FieldIds=<id>]` at
   * `currentRefreshSeconds + 1` interval and renders the value with its label
   * and unit. Number / float / boolean / string values are rendered as text;
   * stack-light values (`{ Lights: [...] }`) are rendered as a custom SVG with
   * one slice per light. When the latest value is older than 2 minutes, the
   * component switches to a `NotAvailable` state and displays an "N/A" label.
   *
   * @element x-currentcncvalue
   * @attr {number} machine-id  (required) machine id
   * @attr {number} field-id    CNC field id to filter the query
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class CurrentCncValueComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Default value
      self._content = undefined;
      self._lastCncValueData = undefined;
      self._lastCncValueDate = undefined;
      self._unit = undefined;
      self._fieldDisplay = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'machine-id') {
        //this.switchToContext('Initialization');
        this.start();
      }
    }

    get maximumElapsedTimeCurrentCncvalue () {
      return 120000; // 2 minutes = 120s
    }

    initialize () {
      this.addClass('pulse-smalltext');

      if (!this.element.hasAttribute('machine-id')) {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in CurrentCncValueComponent.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'currentcncvalue-data';
      this.element.appendChild(this._content);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();
      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () {
      this.removeError();

      // Empty content
      this.displayTextAndTooltip('', '');
      this._content.replaceChildren();

      this.switchToNextContext();
    }

    /**
    * Validate the (event) parameters
    */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (text) {
      this._content.replaceChildren();

      let span = document.createElement('span');
      span.className = 'pulse-message';
      span.innerHTML = text;
      this._content.appendChild(span);
    }

    removeError () {
      this.displayError('');
    }

    get refreshRate () {  // refresh rate in ms.
      return 1000.0 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1); // +1 to allow refresh from bars
    }

    getShortUrl () {
      let retVal = 'CncValue/Current?MachineId=' + this.element.getAttribute('machine-id');
      if (this.element.hasAttribute('field-id')) {
        retVal += '&FieldIds=' + this.element.getAttribute('field-id');
      }
      return retVal;
    }

    displayTextAndTooltip (label, text, tooltip) {
      // label + this._fieldDisplay - default hidden
      let lbl = this._content.querySelector('label');
      if (!lbl) {
        lbl = document.createElement('label');
        lbl.className = 'currentcncvalue-data-label';
        this._content.appendChild(lbl);
      }
      lbl.innerHTML = label;

      // value
      let span = this._content.querySelector('span');
      if (!span) {
        span = document.createElement('span');
        span.className = 'currentcncvalue-data-span';
        this._content.appendChild(span);
      }
      span.innerHTML = text;
      if (pulseUtility.isNotDefined(tooltip)) {
        this._content.removeAttribute('title');
      }
      else {
        this._content.setAttribute('title', tooltip);
      }
    }

    refresh (data) {
      if ((!pulseUtility.isNotDefined(data.ByMachineModule)) &&
        (data.ByMachineModule.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField)) &&
        (data.ByMachineModule[0].ByField.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0].Value))) {
        /*
        this._lastCncValueDate = field.DateTime;
        let field = data.ByMachineModule[0].ByField[0];

        this._fieldDisplay = field.Field.Display;
        this._unit = field.Field.Unit;
        this._lastCncValueData = field.Value;
        */

        // draw last field value
        if (this._lastCncValueDate) {
          let text = '';
          if (pulseUtility.isInteger(this._lastCncValueData)) {
            text = Number(this._lastCncValueData) + ' ' + this._unit;
          }
          else {
            if (pulseUtility.isFloat(this._lastCncValueData)) {
              text = parseFloat(this._lastCncValueData).toFixed(2);
              if (text == 'NaN') {
                text = '';
              }
              else {
                text += ' ' + this._unit;
              }
            }
            else {
              if (pulseUtility.isBoolean(this._lastCncValueData)) {
                text = this._lastCncValueData ? 'true' : 'false';
              }
              else {
                if (typeof this._lastCncValueData == 'string') {
                  text = this._lastCncValueData;
                }
                else { //Light
                  let val = this._lastCncValueData.Lights;
                  if (!pulseUtility.isNotDefined(this._lastCncValueData.Lights)) {
                    this.displayTextAndTooltip('', this._fieldDisplay + ': ');

                    let size = 12;
                    let lineWidth = 5;
                    // CREATE SVG
                    let svgValue = pulseSvg.createBase(2 + size * val.length, 2 + size,
                      'stacklight-svg');
                    //, 2+size * val.length, 2+size);

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
                    this._content.appendChild(svgValue);

                    return;
                  } // End of Light
                }
              }
            }
          }
          if (text != '') { // else probably svg
            this.displayTextAndTooltip(this._fieldDisplay, text, this._fieldDisplay);
          }
        }
        else {
          this.displayTextAndTooltip('', '--');
          return;
        }
      }
      else {
        console.warn('refresh: no data in response');
        this.displayTextAndTooltip('', '--');
        return;
      }
    }

    manageSuccess (data) {
      // Clear
      //this._content.style.display = 'inline-block';
      this.displayTextAndTooltip('', '', '');
      this._content.replaceChildren();

      if ((!pulseUtility.isNotDefined(data.ByMachineModule)) &&
        (data.ByMachineModule.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField)) &&
        (data.ByMachineModule[0].ByField.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0].Value))) {

        let field = data.ByMachineModule[0].ByField[0];
        this._lastCncValueDate = field.DateTime;

        this._fieldDisplay = field.Field.Display;
        this._unit = field.Field.Unit;
        this._lastCncValueData = field.Value;

        if (this._lastCncValueDate) {
          let delay = moment().diff(moment(this._lastCncValueDate)); //result in s
          if (delay > this.maximumElapsedTimeCurrentCncvalue) {
            let noDataTooOld = this.getTranslation('noDataTooOld', 'N/A ');
            this.switchToContext('NotAvailable', () => this.displayTextAndTooltip('', noDataTooOld + ' ' + this._unit, ''));
            return;
          }
        }
      }
      this.switchToNextContext(() => this.refresh(data));
    }
  }

  pulseComponent.registerElement('x-currentcncvalue', CurrentCncValueComponent, ['machine-id']);

})();
