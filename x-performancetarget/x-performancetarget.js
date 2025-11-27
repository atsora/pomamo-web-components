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

  class performancetargetComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      //self._targetIsUpdated = false;

      // DOM - not here
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
        console.error('missing attribute param in PerformanceTarget.element');
        // Delayed display :
        this.setError('missing machine-id');
        return;
      }
      if (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id')))) {
        this.setError('bad machine-id');
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

    getShortUrl () {
      return 'UtilizationTarget/Get?MachineId=' + this.element.getAttribute('machine-id');
    }

    refresh (data) {
      //this._targetIsUpdated = true;
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
      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    manageNotApplicable () {
      this._spanDisplay.addClass('empty-performancetarget');
      // Override if required. By default switch to key Not_applicable
      super.manageNotApplicable();
    }
    /*
    // Callback events -> Maybe add onMachineIdChange... later*/
  }

  pulseComponent.registerElement('x-performancetarget', performancetargetComponent, ['machine-id']);
})();
