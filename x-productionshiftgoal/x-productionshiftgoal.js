// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-productionshiftgoal used to display the goal production of the current shift.
 *
 * @module x-productionshiftgoal
 * @requires module:pulseComponent
 * @requires module:eventBus
 */

var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-productionshiftgoal> to display a period bar component with buttons. This tag gets following attribute :
 *  machine-context : String
 *  machine-id : Integer
 */
(function () {
  class ProductionShiftGoalComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;

      return self;
    }

    /**
     * Callback when an attribute is changed
     *
     * @param {string} attr - The name of the changed attribute.
     * @param {any} oldVal - The previous value of the attribute.
     * @param {any} newVal - The new value of the attribute.
     */
    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        case 'machine-id':
          this.start();
          break;
        default:
          break;
      }
    }

    /**
     * Initializes the component, creates the DOM structure, and adds necessary listeners
     *
     * @returns {void}
     */
    initialize() {
      // In case of clone, need to be empty :
      this.element.innerHTML = '';

      // listeners
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('productionshiftgoal-content');

      let textSpan = document.createElement('span');
      textSpan.innerHTML = this.getTranslation('productionshiftgoal','Production Shift Goal: ');
      this._content.appendChild(textSpan);

      let valueSpan = document.createElement('span');
      valueSpan.classList.add('productionshiftgoal-data');
      this._content.appendChild(valueSpan);

      this.element.appendChild(this._content);

      // create DOM - loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';

      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);

      this.element.appendChild(loaderDiv);

      // create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';

      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);

      this.element.appendChild(messageDiv);

      this.switchToNextContext();
      return;
    }

    /**
     * Validates the component parameters
     *
     * @returns {void}
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('no machine selected');
        return;
      }
      this.switchToNextContext();
    }

    /**
     * Callback when an error occurs
     *
     * @param {string} message - The error message to display
     * @returns {void}
     */
    displayError(message) {
      this._messageSpan.innerHTML = message;
      switch (message) {
        case 'no machine selected':
          console.error('x-productionshiftgoal: missing machine-id attribute');
          break;
        default:
          break;
      }
    }

    /**
     * Callback to remove the error message
     *
     * @returns {void}
     */
    removeError() {
      this._messageSpan.innerHTML = '';
    }

    /**
     * Callback to clear the component before its removal
     *
     * @returns {void}
     */
    clearInitialization() {
      this.element.innerHTML = '';

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Returns the refresh rate of the component in milliseconds
     *
     * @returns {number}
     */
    get refreshRate() {
      return 1000 * 60;
    }

    /**
     * Builds and returns the short URL for the data request
     *
     * @returns {string}
     */
    getShortUrl() {
      let url = 'Operation/OperationCurrentShiftTarget?GroupId=';
      if (this.element.hasAttribute('machine-id')) {
        url += this.element.getAttribute('machine-id');
      }
      return url;
    }

    /**
     * Updates the component display with new received data.
     *
     * @param {object} data - The data to display.
     * @returns {void}
     */
    refresh(data) {
      this._data = data;

      if (this._data && this._data.ShiftGoal !== undefined) {
        let valueSpan = this._content.querySelector('.productionshiftgoal-data');
        valueSpan.innerHTML = Math.ceil(this._data.ShiftGoal);
      }
    }

    /**
     * Callback when the machine ID changes in the context
     *
     * @param {object} event - The event containing the new machine ID.
     * @returns {void}
     */
    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
  }

  pulseComponent.registerElement('x-productionshiftgoal', ProductionShiftGoalComponent, ['machine-context', 'machine-id']);
})();
