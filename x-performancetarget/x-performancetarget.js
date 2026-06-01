// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-performancetarget
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

  /**
   * `<x-performancetarget>` — utilization target label for one machine.
   *
   * Fetches `UtilizationTarget/Get?MachineId=<id>` and renders a static
   * "Target" word followed by `Math.round(TargetPercentage * 100) + '%'`.
   * The value span carries the `empty-performancetarget` class while the
   * target is undefined / zero or when the endpoint reports not-applicable.
   *
   * @element x-performancetarget
   * @attr {number} machine-id (required) machine id
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class performancetargetComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;
      self._spanDisplay = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          //this._targetIsUpdated = false;
          this.start(); // == validate + send ajax request
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-smalltext');

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'performancetarget-content';
      this.element.appendChild(this._content);

      // Prepare span
      let targetSpan = document.createElement('span');
      targetSpan.innerHTML = this.getTranslation('target', 'Target');
      this._spanDisplay = document.createElement('span');
      this._spanDisplay.className = 'performancetarget-span empty-performancetarget';
      this._content.appendChild(targetSpan);
      this._content.appendChild(this._spanDisplay);

      // Create DOM - (smalltext == NO Loader + NO error message displayed. see .less)
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', ' Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Listener and dispatchers

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      //this._targetIsUpdated = false;

      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;
      this._spanDisplay = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        return;
      }
      if (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id')))) {
        this.setError(this.getTranslation('error.invalidMachineId', 'Invalid machine ID'));
        return;
      }
      this.switchToNextContext();
    }

    displayError (message) {
      this._content.style.display = 'none';
    }

    removeError () {
      this._content.style.display = '';
    }

    /**
     * REST endpoint: `UtilizationTarget/Get?MachineId=<id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'UtilizationTarget/Get?MachineId=' + this.element.getAttribute('machine-id');
    }

    /**
     * Renders the target percentage: removes `empty-performancetarget` class and sets text
     * to `"X%"` (rounded) when `TargetPercentage > 0`. Adds `empty-performancetarget` otherwise.
     *
     * @param {{ TargetPercentage: number }} data
     */
    refresh (data) {
      this._targetpercentage = data.TargetPercentage;
      if (!pulseUtility.isNotDefined(this._targetpercentage) && this._targetpercentage > 0) {
        this._spanDisplay.classList.remove('empty-performancetarget');
        this._spanDisplay.innerHTML = Math.round(100 * this._targetpercentage) + '%';
      }
      else {
        this._spanDisplay.classList.add('empty-performancetarget');
      }
    }

    manageSuccess (data) {
      super.manageSuccess(data);
    }

    /**
     * Applies `empty-performancetarget` when the endpoint returns not-applicable,
     * then delegates to the base implementation.
     */
    manageNotApplicable () {
      this._spanDisplay.classList.add('empty-performancetarget');
      super.manageNotApplicable();
    }
    /*
    // Callback events -> Maybe add onMachineIdChange... later*/
  }

  pulseComponent.registerElement('x-performancetarget', performancetargetComponent, ['machine-id']);
})();
