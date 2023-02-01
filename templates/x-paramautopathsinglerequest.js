// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-XXX
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {

  class XXXComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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

    //get content () { return this._content; } // Optional

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
          this.start(); // Only if changing this attribute requires to restart the component. == validate + send ajax request
          break;
        case 'param-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'paramChangeSignal');
            eventBus.EventBus.addEventListener(this, 'paramChangeSignal',
              newVal, this.onParamChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      //this.addClass('pulse-text'); // Mandatory for loader
      //pulse-text / pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listener and dispatchers
      if (this.element.hasAttribute('param-context')) {
        eventBus.EventBus.addEventListener(this, 'paramChangeSignal',
          this.element.getAttribute('param-context'),
          this.onParamChange.bind(this));
      }

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

    validateParameters () {
      if (!this.element.hasAttribute('param')) {
        console.error('missing attribute param in XXX.element');
        // Delayed display :
        this.setError('missing range');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
      // For example:
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

    get transientErrorDelay () { // Delay in ms before switching to a transient error. To override only if required. Default: 3min
      return super.transientErrorDelay;
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'Get...' + this.element.getAttribute('myattr');
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
    onParamChange (event) {
      this.element.setAttribute('param', event.target.newParam);
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

  pulseComponent.registerElement('x-XXX', XXXComponent, ['myattr', 'param-context']);
})();
