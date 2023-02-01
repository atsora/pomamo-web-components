// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currenttool
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');

/**
 * Build a custom tag <x-currenttool> to display a currenttool component. This tag gets following attribute : 
 *  machine : Integer
 */
(function () {

  class CurrentToolComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default value
      self._content = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'machine-id') {
        //this.switchToContext('Initialization');
        this.start();
      }
    }

    get maximumElapsedTimeCurrentTool () {
      return 120000; // 2 minutes = 120s
    }

    initialize () {
      this.addClass('pulse-smalltext');

      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in CurrentToolComponent.element');
        this.switchToKey('Error', () => this.displayError('missing machine-id'), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in CurrentToolComponent.element');
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('currenttool-data');
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
      this.displayTextAndTooltip('');
      $(this._content).empty(); // To remove svg

      this.switchToNextContext();
    }

    /**
    * Validate the (event) parameters
    */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in CurrentTool.element');
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
      this.displayTextAndTooltip('');
    }

    removeError () {
      this.displayTextAndTooltip('');
    }

    get refreshRate () { // refresh rate in ms. 
      return 1000.0 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1);
    }

    getShortUrl () {
      return 'CncValue/Current?MachineId=' + this.element.getAttribute('machine-id') +
        '&FieldIds=119'; // == Tool
    }

    displayTextAndTooltip (text, tooltip) {
      let span = $(this._content).find('span');
      if (0 == span.length) {
        span = $('<span></span>').addClass('currenttool-data-span');
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

        //let field = data.ByMachineModule[0].ByField[0];
        //this._lastCncValueDate = field.DateTime;

        //this._fieldDisplay = field.Field.Display;
        //this._unit = field.Field.Unit;
        //this._lastCncValueData = field.Value;

        // draw last field value
        if (this._lastCncValueDate) {
          ///TODO : change this ASAP == when GOOD web service is available
          let text = 'T' + data.ByMachineModule[0].ByField[0].Value;
          this.displayTextAndTooltip(text);
          return;
        }
        else {
          this.displayTextAndTooltip('');
          return;
        }
      }
      else {
        //console.warn('refresh: no data in response');
        this.displayTextAndTooltip('');
        return;
      }
      //this.displayTextAndTooltip('TOOL');
    }

    manageSuccess (data) {
      // Clear
      //$(this._content).css('display', 'inline-block');
      this.displayTextAndTooltip('');
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

        if (this._lastCncValueDate) {
          let delay = moment().diff(moment(this._lastCncValueDate)); //result in s
          if (delay > this.maximumElapsedTimeCurrentTool) {
            //let noDataTooOld = this.getTranslation('noDataTooOld', 'N/A ');
            this.switchToContext('NotAvailable',
              () => this.displayTextAndTooltip('--'
                /*noDataTooOld + ' ' + this._unit, ''*/
              ));
            return;
          }
        }
      }
      this.switchToNextContext(() => this.refresh(data));
    }
  }

  pulseComponent.registerElement('x-currenttool', CurrentToolComponent, ['machine-id']);

})();
