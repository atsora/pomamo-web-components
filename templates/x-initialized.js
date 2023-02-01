// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-XXX
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');


/**
 * Build a custom tag <x-initialized> with a single myattr attribute
 */
(function () {

  class XXXComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

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
          this.start(); // Only if changing this attribute requires to restart the component.
          break;
        default:
          break;
      }
    }

    initialize () {
      //this.addClass('pulse-text'); pulse-text / pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Attributes
      if (!this.element.hasAttribute('myattr')) {
        console.error('missing attribute myattr');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('missing attribute myattr'), () => this.removeError());
        return;
      }

      this._setMyparameter();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here
      //var loader = $("<div></div>").addClass("pulse-loader").html('Loading...').css('display', 'none');
      //$(this._content).append(loader);
      // Create DOM - Content
      this._content = $('<div></div>').addClass('pulse-XXX-content');
      $(this.element)
        .addClass('XXX')
        .append(this._content);

      // Create DOM - message for error
      /*this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);*/

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
    }

    removeError () {
      // Code here to remove the error message
    }

    mymethod (x) { // only in case a method is added to the x-tag component
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

  pulseComponent.registerElement('x-initialized', XXXComponent, ['myattr']);
})();
