// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-remotedisplay
 * @requires module:pulseComponent
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-remotedisplay> with a single display-context attribute
 */
(function () {

  class RemoteDisplay extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters
      self._display = undefined;

      self._content = undefined;

      return self;
    }

    //get content () { return this._content; }

    /**
     * Associated parameter
     */
    //get myparameter () { return this._myparameter; }
    //_setMyparameter () { /* ... set here this._myparameter ... */ }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'display-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'displayChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'displayChangeEvent', newVal,
              this.onDisplayChange.bind(this));
            this.start();
          } break;
        default:
          break;
      }
    }

    initialize () {
      // Attributes
      if (!this.element.hasAttribute('display-context')) {
        console.error('missing attribute display-context');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('missing attribute display-context'), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('remotedisplay-content');
      $(this.element).append(this._content);

      // No loader / No message

      // Listener
      if (this.element.hasAttribute('display-context')) {
        eventBus.EventBus.addEventListener(this,
          'displayChangeEvent',
          this.element.getAttribute('display-context'),
          this.onDisplayChange.bind(this));
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    // Callback events
    onDisplayChange (event) {
      this._display = event.target.Display;
      if (pulseUtility.isNotDefined(this._display)) {
        $(this._content).html('');
      }
      else {
        $(this._content).html(this._display);
      }
      if (!pulseUtility.isNotDefined(event.target.ClassToAdd)) {
        $(this._content).addClass(event.target.ClassToAdd);
      }
      if (!pulseUtility.isNotDefined(event.target.ClassToRemove)) {
        $(this._content).removeClass(event.target.ClassToRemove);
      }
    }

  }

  pulseComponent.registerElement('x-remotedisplay', RemoteDisplay, ['display-context']);
})();
