// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-XXX
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-initialized> with a single myattr attribute
 */
(function () {

  class XXXComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters
      self._myparameter = undefined;

      self._content = undefined;

      self.methods = {
        publicMethod: self.publicMethod // To define below
      };

      // DOM: never in constructor, use the initialize method instead

      return self;
    }

    get content () { return this._content; }

    /**
     * Associated parameter
     */
    get myparameter () { return this._myparameter; }
    _setMyparameter () { /* ... set here this._myparameter ... */ }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'myattr':
          this._setMyparameter();
          this.start(); // Only if changing this attribute requires to restart the cmoponent.
          break;
        case 'param-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'paramChangeSignal');
            eventBus.EventBus.addEventListener(this, 'paramChangeSignal',
              newVal,
              this.onParamChange.bind(this));
          }
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

      this._setMyparameter();

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
      $(this.element).append(this._content);

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
        this.setError(this.getTranslation('error.missingParam', 'Missing param')); // delayed error message
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
    }

    removeError () {
      // Code here to remove the error message
    }

    mymethod (x) { // only in case a method is added to the x-tag component
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

  pulseComponent.registerElement('x-paraminitialized', XXXComponent, ['myattr', 'param-context']);
})();
