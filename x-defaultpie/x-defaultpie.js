// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
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

  /**
   * `<x-defaultpie>` — dispatcher that creates the right pie sub-component
   * based on the server's `Machine/Pie` config.
   *
   * Polls `Machine/Pie?GroupId=<group-or-machine-id>` and instantiates an
   * `<x-<PieType>>` (`cycleprogresspie`, `operationprogresspie`,
   * `partproductionstatuspie`, or `reasonslotpie`) with the same `machine-id`
   * and `textchange-context` forwarded. When `data.Permanent` is true, switches
   * to a `Loaded` `StaticState` to stop polling.
   *
   * @element x-defaultpie
   * @attr {number} machine-id          machine id (takes priority over `group`)
   * @attr {string} group               group id (alternative to `machine-id`)
   * @attr {string} machine-context     event-bus context for `machineIdChangeSignal`
   * @attr {string} textchange-context  forwarded to the chosen sub-component
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('defaultpie-content');
      this.element.appendChild(this._content);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

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
      this.element.replaceChildren();
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')
        && !this.element.hasAttribute('group')) {
        this.setError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines')); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      //this._content.innerHTML = message;
      this._messageSpan.innerHTML = message;
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      this.displayError('');
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * REST endpoint: `Machine/Pie?GroupId=<group-or-machine-id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
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

    /**
     * Instantiates the correct sub-component based on `data.PieType`.
     * Clears any previously created sub-component before creating the new one.
     * No-ops if `PieType` is undefined or `machine-id` is absent.
     *
     * @param {{ PieType?: string, Permanent: boolean }} data
     */
    refresh (data) {
      if (pulseUtility.isNotDefined(data.PieType)) {
        // Clean any present xtag
        this._content.replaceChildren();
      }
      else {
        let xtagType = 'x-' + data.PieType;
        let findXtag = this.element.querySelector(xtagType);
        if (findXtag != null) {
          // Clean any present xtag
          this._content.replaceChildren();
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
        let xtag = pulseUtility.createElementWithAttribute(xtagType,
          attributes);
        this._content.appendChild(xtag);
      }
    }

    /**
     * If `data.Permanent`, renders once and switches to `Loaded` (static) to stop polling.
     * Otherwise delegates to the base class which calls `refresh(data)` and continues polling.
     *
     * @param {*} data
     */
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
