// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workinfo
 * @requires module:pulseComponent
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-workinfo> with a single machine-id attribute
 */
(function () {

  class workinfoComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters
      self._displayedWorkInformations = null;

      self._content = undefined;

      return self;
    }

    //get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'operationChangeEvent');
            eventBus.EventBus.addEventListener(this, 
              'operationChangeEvent', newVal, 
              this.onOperationChange.bind(this));
            this.start(); // To re-validate parameters
          } break;
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
      this.addClass('pulse-text');

      // Attributes
      /*if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('missing attribute machine-id'), () => this.removeError());
        return;
      }*/

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('workinfo-content');
      $(this.element).append(this._content);

      let nbLines = this.getConfigOrAttribute('nblines', 1);
      if (nbLines > 1) {
        $(this._element).css('height', (1.5 * nbLines + 'em')); // Hack for Remmele
        $(this._element).css('word-wrap', 'break-word');
      }
      else { // To restore in CSS ASAP !!!
        $(this._element).css('white-space', 'nowrap'); // to allow '...'
      }

      // Create DOM - Loader -> Not needed here
      //let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      //let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      //$(this.element).append(loaderDiv);

      // Create DOM - message for error -> Not here
      // this._messageSpan 

      // Listener
      eventBus.EventBus.addEventListener(this, 
        'operationChangeEvent',
        this.element.getAttribute('machine-id'),
        this.onOperationChange.bind(this));

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id');
        return;
      }
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

    displayError (message) {
      $(this._content).empty();
      this._displayedWorkInformations = null;
      console.error('x-workinfo: ' + message);
    }

    // Callback events
    onOperationChange (event) {
      if (pulseUtility.isNotDefined(event.target.workinformations)) {
        $(this._content).empty();
        this._displayedWorkInformations = null;
        return;
      }
      // 1 - Verify if display need to be changed
      let needToRefresh = (this._displayedWorkInformations == null);
      if (!needToRefresh) {
        needToRefresh = (this._displayedWorkInformations.length != event.target.workinformations.length);
      }
      let index = 0;
      while ((!needToRefresh) && (index < event.target.workinformations.length)) {
        if (this._displayedWorkInformations[index].Kind != event.target.workinformations[index].Kind) {
          needToRefresh = true;
        }
        else if (this._displayedWorkInformations[index].Value != event.target.workinformations[index].Value) {
          needToRefresh = true;
        }
        index++;
      }

      if (needToRefresh) {
        $(this._content).empty();
        let operationDisplay = ''; // Will be changed with operationslot.display ASAP
        for (const workInformation of event.target.workinformations) {
          if (workInformation.Value) {
            operationDisplay += workInformation.Value + ' ';
          }
        } // end for
        // SINGLE display for all kind
        let div = $('<div></div>').addClass('workinfo-singledata')
          .html(operationDisplay);
        $(this._content).append(div);
        this._displayedWorkInformations = event.target.workinformations;
      }
    }

    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);

      eventBus.EventBus.removeEventListenerBySignal(this, 'operationChangeEvent');
      eventBus.EventBus.addEventListener(this,
        'operationChangeEvent',
        this.element.getAttribute('machine-id'),
        this.onOperationChange.bind(this));
    }
  }

  pulseComponent.registerElement('x-workinfo', workinfoComponent, ['machine-id', 'machine-context']);
})();
