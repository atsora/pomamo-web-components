// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailedsequenceat
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  class DetailedSequenceAtComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;

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
      let title = this.getTranslation('detailsViewSubTitles.sequence', 'sequence');
      let spanTitle = $('<span></span>').addClass('detailedsequenceat-title-span')
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
        console.error('missing attribute when in detailedsequenceat.element');
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
      return 'SequenceSlots?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Range=' + pulseUtility.createSingleRangeForWebService(this.element.getAttribute('when'));
    }

    refresh (data) {
      $(this._detailedContent).empty();

      if (data.ByMachineModule.length > 0) {
        // content
        for (let iModule = 0; iModule < data.ByMachineModule.length; iModule++) {
          let divModuleContent = $('<div></div>').addClass('detailed-module-content');
          // read only 1 data
          if (data.ByMachineModule[iModule].Blocks.length > 0) {
            // range
            let tmpRange = pulseRange.createDateRangeFromString(data.ByMachineModule[iModule].Blocks[0].Range);
            let rangeDisplay = pulseUtility.displayDateRange(tmpRange, true);
            let spanRange = $('<span></span>').addClass('detailed-range')
              .html(rangeDisplay);

            $(this._detailedContent).append(spanRange); // NOT $(divModuleContent) for display

            // data
            let divModuleData = $('<div></div>').addClass('detailed-module-data');

            // data - Machine module
            // If more than 1 module : display
            if (data.ByMachineModule.length > 1) {
              let moduleDisplay = data.ByMachineModule[iModule].MachineModule.Display;
              let spanModule = $('<span></span>').addClass('detailedsequenceat-module-span')
                .html(moduleDisplay);
              let divModule = $('<div></div>').addClass('detailed-machinemodule')
                .append(spanModule);
              if (data.ByMachineModule[iModule].MachineModule.Main) { // highlight
                spanModule.addClass('detailed-mainmachinemodule');
              }
              $(divModuleData).append(divModule);
            }

            // data - sequence
            let display = data.ByMachineModule[iModule].Blocks[0].Display;
            let spanSequence = $('<span></span>').addClass('detailedsequenceat-data-sequence')
              .html(display);

            // Tool(s)
            //data.ByMachineModule[iModule].Blocks[0].Details[iTool].Display

            $(divModuleData).append(spanSequence);
            $(divModuleContent).append(divModuleData);

            $(this._detailedContent).append(divModuleContent);
          }
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

  pulseComponent.registerElement('x-detailedsequenceat', DetailedSequenceAtComponent, ['machine-id', 'when', 'datetime-context', 'machine-context']);
})();
