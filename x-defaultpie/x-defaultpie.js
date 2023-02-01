// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-defaultpie
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');
var state = require('state');

require('x-cycleprogresspie/x-cycleprogresspie');
require('x-operationprogresspie/x-operationprogresspie');
require('x-partproductionstatuspie/x-partproductionstatuspie');
require('x-reasonslotpie/x-reasonslotpie');

(function () {

  class DefaultPieComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined;
      self._messageSpan = undefined;

      return self;
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey (context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState (context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button 'Start'
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'group': // Not group-id because of url compatibility
        case 'machine-id':
          this.start();
          break;
        case 'machine-context':
          {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          } break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-piegauge');

      // Update here some internal parameters

      // listeners/dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('defaultpie-content');
      $(this.element).append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
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

    /**
      * Clear anything that was done during intialization, so that initialize can be called once again.
      * Remove all the dispatchers and listeners.
      * Please note that no state switch is done here
    */
    clearInitialization () {
      // Parameters

      // DOM
      $(this.element).empty();
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')
        && !this.element.hasAttribute('group')) {
        console.error('missing attribute machine or group id in DefaultPie.element');
        this.setError('missing machine'); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      //$(this._content).html(message);
      $(this._messageSpan).html(message);
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      this.displayError('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let url = 'Machine/Pie?GroupId=';
      if (this.element.hasAttribute('group')) {
        url += this.element.getAttribute('group');
      }
      else {
        if (this.element.hasAttribute('machine-id')) {
          url += this.element.getAttribute('machine-id');
        }
      }
      return url;
    }

    refresh (data) {
      if (pulseUtility.isNotDefined(data.PieType)) {
        // Clean any present xtag
        $(this._content).empty();
      }
      else {
        let xtagType = 'x-' + data.PieType;
        let findXtag = $(this.element).find(xtagType);
        if (findXtag.length != 0) {
          // Clean any present xtag
          $(this._content).empty();
        }
        // Create xtag with attributes
        let attributes;
        if (this.element.hasAttribute('group')) {
          attributes = {
            'group': this.element.getAttribute('group')
          };
        }
        //else {
        if (this.element.hasAttribute('machine-id')) {
          attributes = {
            'machine-id': this.element.getAttribute('machine-id')
          };
        }
        else {
          return;
        }
        //}
        // Attributes to transfer
        if (this.element.hasAttribute('textchange-context')) {
          attributes['textchange-context'] = this.element.getAttribute('textchange-context');
        }

        // Create xtag
        let xtag = pulseUtility.createjQueryElementWithAttribute(xtagType,
          attributes);
        $(this._content).append(xtag);
      }
    }

    manageSuccess (data) {
      if (data.Permanent) {
        this.refresh(data);
        // STOP calling Ajax request
        this.switchToContext('Loaded');
      }
      else {
        // Success:
        super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
      }
    }

    // Callback events

    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

  }

  pulseComponent.registerElement('x-defaultpie', DefaultPieComponent, ['group', 'machine-id', 'machine-context']);
})();
