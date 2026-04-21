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
   * `<x-performancetarget>` — displays the utilization target percentage for a machine.
   *
   * Fetches `UtilizationTarget/Get?MachineId=<id>` once per load.
   * Renders "Target: X%" when `TargetPercentage > 0`, or hides the value span when undefined/zero.
   *
   * Attributes:
   *   machine-id - (required) integer machine id; restart triggered on change
   *
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('performancetarget-content');
      $(this.element).append(this._content);

      // Prepare span
      let targetSpan = $('<span></span>').html(this.getTranslation('target', 'Target'));
      this._spanDisplay = $('<span></span>').addClass('performancetarget-span')
        .addClass('empty-performancetarget');
      this._content.append(targetSpan);
      this._content.append(this._spanDisplay);

      // Create DOM - (smalltext == NO Loader + NO error message displayed. see .less)
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', ' Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Listener and dispatchers

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      //this._targetIsUpdated = false;

      // DOM
      $(this.element).empty();

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
      $(this._content).hide();
    }

    removeError () {
      $(this._content).show();
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
        this._spanDisplay.removeClass('empty-performancetarget')
          .html(Math.round(100 * this._targetpercentage) + '%');
      }
      else {
        this._spanDisplay.addClass('empty-performancetarget');
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
      this._spanDisplay.addClass('empty-performancetarget');
      super.manageNotApplicable();
    }
    /*
    // Callback events -> Maybe add onMachineIdChange... later*/
  }

  pulseComponent.registerElement('x-performancetarget', performancetargetComponent, ['machine-id']);
})();
