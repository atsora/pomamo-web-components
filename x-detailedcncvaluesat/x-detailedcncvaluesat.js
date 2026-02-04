// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedcncvaluesat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

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
      $(this._detailedContent).empty();
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>')
        .addClass('detailed-main');
      $(this.element).append(this._content);

      // Title
      let title = this.getTranslation('detailsViewSubTitles.cncvalue', 'cncvalues');
      let spanTitle = $('<span></span>').addClass('detailedcncvaluesat-title-span')
        .html(title);
      let divTitle = $('<div></div>').addClass('detailed-title').append(spanTitle);
      $(this._content).append(divTitle);

      // Detailed content
      this._detailedContent = $('<div></div>').addClass('detailed-content');
      $(this._content).append(this._detailedContent);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error - no need to store, can be removed
      let messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(messageSpan);
      $(this._detailedContent).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this._cleanDisplay();
      $(this.element).empty();

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

      let messageSpan = $(this.element).find('.pulse-message');
      if (messageSpan.length == 0) {
        // Create DOM - message for error
        messageSpan = $('<span></span>')
          .addClass('pulse-message');
        let messageDiv = $('<div></div>')
          .addClass('pulse-message-div')
          .append(messageSpan);
        $(this._detailedContent).append(messageDiv);
      }
      $(messageSpan).html(message);
    }

    removeError () {
      $(this.element).find('.pulse-message').html('');
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'CncValueAt?MachineId='
        + this.element.getAttribute('machine-id')
        + '&At=' + this.element.getAttribute('when');
    }

    refresh (data) {
      $(this._detailedContent).empty();

      if (data.ByMachineModule.length <= 0) {
        $(this._content).hide();
      }
      else {
        $(this._content).show();

        // Empty range - to allow "table-like" display
        let divRange = $('<div></div>').addClass('detailed-range');
        let spanRange = $('<span></span>').addClass('detailedcncvaluesat-range-span').html('');
        $(divRange).append(spanRange);

        $(this._detailedContent).append(divRange);

        for (let iModule = 0; iModule < data.ByMachineModule.length; iModule++) {
          // machinemodule content
          let divWholeModule = $('<div></div>').addClass('detailed-module-content');
          // If more than 1 module : display
          if (data.ByMachineModule.length > 1) {
            // Machine module
            let moduleDisplay = data.ByMachineModule[iModule].MachineModule.Display;
            let spanModule = $('<span></span>').addClass('detailedcncvaluesat-module-span')
              .html(moduleDisplay);
            let divModule = $('<div></div>').addClass('detailed-machinemodule')
              .append(spanModule);
            if (data.ByMachineModule[iModule].MachineModule.Main) { // highlight
              spanModule.addClass('detailed-mainmachinemodule');
            }
            $(divWholeModule).append(divModule);
          }

          // DATA
          let divData = $('<div></div>').addClass('detailed-module-data');
          for (let iField = 0; iField < data.ByMachineModule[iModule].ByField.length; iField++) {
            let fieldDisplay = data.ByMachineModule[iModule].ByField[iField].Field.Display + ': ';
            let fieldValue = data.ByMachineModule[iModule].ByField[iField].Value;
            let spanField = $('<span></span>').addClass('detailedcncvaluesat-field')
              .html(fieldDisplay);
            let spanValue = $('<span></span>').addClass('detailedcncvaluesat-value');
            let svgValue = null;
            if (pulseUtility.isInteger(fieldValue)) {
              $(spanValue).html(fieldValue);
            }
            else {
              if (pulseUtility.isFloat(fieldValue)) {
                $(spanValue).html(fieldValue.toFixed(2));
              }
              else {
                if (pulseUtility.isBoolean(fieldValue)) {
                  $(spanValue).html(fieldValue ? this.getTranslation('true', 'true') : this.getTranslation('false', 'false'));
                }
                else {
                  if (typeof fieldValue == 'string') {
                    $(spanValue).html(fieldValue);
                  }
                  else {
                    $(spanValue).html('');
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
                    } // End of Light
                  }
                }
              }
            }

            let divDetails = $('<div></div>').addClass('detailed-single-data');
            $(divDetails).append(spanField);
            if (svgValue != null)
              $(divDetails).append(svgValue);
            else
              $(divDetails).append(spanValue);
            $(divData).append(divDetails);

            //data.ByMachineModule[iModule].ByField[iField].Color
            //data.ByMachineModule[iModule].ByField[iField].PerformanceField //bool
          }
          $(divWholeModule).append(divData);

          $(this._detailedContent).append(divWholeModule);
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
