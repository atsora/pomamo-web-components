// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-XXX
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  class XXXComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;

      self._content = undefined; // Optional

      self.methods = {
        publicMethod: self.publicMethod // To define below
      };

      // DOM: never in constructor, use the initialize method instead

      return self;
    }

    get content () {
      return this._content;
    } // Optional

    /**
      Replace _runAjaxWhenIsVisible when NO url should be called
      return true if something is done, false if _runAjaxWhenIsVisible should be called
    */
    _runAlternateGetData () {
      return false;
    } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'myattr':
          // ... for example, update an internal parameter from the attribute myattr
          this.start(); // Only if changing this attribute requires to restart the component.
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));

            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent', newVal);
          }
          this.start(); // To re-validate parameters
          break;
        case 'param-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'paramChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'paramChangeSignal', newVal,
            this.onParamChange.bind(this));
          break;
        default:
          break;
      }
    }

    initialize () {
      //this.addClass('pulse-text'); // or pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Update here some internal parameters

      // listeners/dispatchers
      if (this.element.hasAttribute('param-context')) {
        eventBus.EventBus.addEventListener(this, 'paramChangeSignal',
          this.element.getAttribute('param-context'),
          this.onParamChange.bind(this));
      }
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this, 'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('pulse-component-content');

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

    _setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('param')) {
        console.error('missing attribute param in XXX.element');
        this.setError('missing param'); // delayed error message
        return;
      }
      // Additional checks with attribute param
      // Immediat display :
      //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());

      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id')))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat error display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      // RANGE
      this._setRangeFromAttribute();

      // Check the range is valid
      if (this._range == undefined) {
        console.log('waiting attribute range in XXXComponent.element');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        // Delayed display :
        this.setError('missing range');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      if (this._range.isEmpty()) {
        console.error('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError('empty range');
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
      // For example:      
      //$(this._content).html(message);
      $(this._messageSpan).html(message);
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
      // You may want to consider here the current context
      // For example:
      switch (this.stateContext) {
        case 'Load':
        case 'Reload':
          return super.transientErrorDelay;
        default:
          return super.transientErrorDelay; // Another delay rate that may depend on the already returned set of data
      }
    }


    get refreshRate () {
      // Return here the refresh rate in ms. You may want to consider the returned set of data here
      // Example :
      // return 1000*Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds',10));
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let url = 'Get...' + this.element.getAttribute('myattr');
      if (this.stateContext == 'Reload') { // Specific case in case of Reload context
        url += '&Cache=No';
      }
      return url;
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

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onParamChange (event) {
      this.element.setAttribute('param', event.target.newParam);
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._setRangeAndUpdateRefreshRate(newRange);
        this.start();
      }
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

  pulseComponent.registerElement('x-XXX', XXXComponent, ['myattr', 'period-context', 'param-context']);
})();