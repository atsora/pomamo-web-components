// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currentcncvalue
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');

/**
 * Build a custom tag <x-currentcncvalue> to display an currentcncvalue bar component. This tag gets following attribute : 
 *  machine : Integer
 */
(function () {

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
        console.error('missing attribute machine-id in CurrentCncValueComponent.element');
        this.switchToKey('Error', () => this.displayError('missing machine-id'), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in CurrentCncValueComponent.element');
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('currentcncvalue-data');
      $(this.element).append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () {
      this.removeError();

      // Empty content
      this.displayTextAndTooltip('', '');
      $(this._content).empty(); // To remove svg

      this.switchToNextContext();
    }

    /**
    * Validate the (event) parameters
    */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in CurrentCNCValue.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (text) {
      $(this._content).empty(); // To remove svg

      let span = $('<span></span>').addClass('pulse-message')
        .html(text);
      $(this._content).append(span);
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
      let lbl = $(this._content).find('label');
      if (0 == lbl.length) {
        lbl = $('<label></label>').addClass('currentcncvalue-data-label');
        $(this._content).append(lbl);
      }
      lbl.html(label);

      // value
      let span = $(this._content).find('span');
      if (0 == span.length) {
        span = $('<span></span>').addClass('currentcncvalue-data-span');
        $(this._content).append(span);
      }
      span.html(text);
      if (pulseUtility.isNotDefined(tooltip)) {
        $(this._content).removeAttr('title');
      }
      else {
        $(this._content).attr('title', tooltip);
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
                      // val.Status == "on" "flashing" "off" // fill-opacity = 1 ou moins ou animate
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
                    (this._content).append(svgValue);

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
      //$(this._content).css('display', 'inline-block');
      this.displayTextAndTooltip('', '', '');
      $(this._content).empty(); // To remove svg

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
