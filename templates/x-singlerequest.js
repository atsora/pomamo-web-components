// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-XXX
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');

(function () {

  class XXXComponent extends pulseComponent.PulseSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;

      self.methods = {
        publicMethod: self.publicMethod // To define below
      };

      // DOM: never in constructor, use the initialize method instead

      return self;
    }

    get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'myattr':
          // ... for example, update an internal parameter from the attribute myattr
          this.start(); // Only if changing this attribute requires to restart the component.
          break;
        default:
          break;
      }
    }

    initialize () {
      //this.addClass('pulse-text');
      //pulse-text / pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Attributes
      if (!this.element.hasAttribute('myattr')) {
        console.error('missing attribute myattr');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('missing attribute myattr'), () => this.removeError());
        return;
      }

      // Update here some internal parameters

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('pulse-XXX-content');
      $(this.element)
        .addClass('XXX')
        .append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

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
      this._myparameter = undefined;
      // DOM
      $(this.element).empty();
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
      // For example:      
      $(this._content).html(message);
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      // Code here to remove the error message. Only required if displayError is implemented
      // For example:
      this.displayError('');
    }

    get timeout () { // Timeout in ms. To override only if required. Default: undefined is returned
      return super.timeout;
    }

    get delayRate () { // Delay in ms to wait in case of a delay error. To override only if required. Default: 10s
      return super.delayRate;
    }

    get transientErrorDelay () { // Delay in ms before switching to a transient error. To override only if required. Default: 3min
      return super.transientErrorDelay;
    }

    get url () {
      // Return the Web Service URL here
      return this.element.getAttribute('path') // OR maybe this.getConfigOrAttribute('path', '')
        + '...' + this.element.getAttribute('myattr');
    }

    enterTransientErrorState () { // To override only if required. By default, add the CSS class .pulse-component-warning
      super.enterTransientErrorState();
    }

    exitTransientErrorState () { // To override only if required
      super.exitTransientErrorState();
    }

    beforeReload () { // To override if required
      super.beforeReload();
    }

    refresh (data) {
      // Update the component with data which is returned by the web service in case of success
      // For example:
      $(this._content).html(data.Name);
    }

    manageSuccess (data) {
      // Override it only if you need to handle here some error cases.
      // Else it is sufficient to implement the refresh method

      if (data.VerySpecificErrorToHandle) {
        console.error('very specific error');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('very specific error'), () => this.removeError());
        return;
      }

      // Success:
      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    manageNotApplicable () {
      // Override if required. By default switch to context NotApplicable and add the class pulse-component-not-applicable
      super.manageNotApplicable();
    }

    manageOldNoData (message) {
      // To be overriden if one of the following services is used:
      // GetListOfShiftSlotService, GetMachineStatusByIWP, GetShiftAround/After/Before, GetFieldLegendsForMachine
      // GetMachinePerformanceDay(V2), GetModeColor, GetMachineStatus, GetReasonSlots(V3)
      super.manageOldNoData(message);
    }

    startLoading () {
      super.startLoading();
      // Code here to display a loading message
      // For example:
      $(this._content).html('...');
      // Note that you can use the CSS class .pulse-component-loading instead
    }

    endLoading () {
      // Code here to remove the loading message. Only required if startLoading is implemented
      // For example:
      $(this._content).html('');
      super.endLoading();
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
      // Example :
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }
  }

  pulseComponent.registerElement('x-singlerequest', XXXComponent, ['myattr']);
})();
