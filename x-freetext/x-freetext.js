// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-freetext
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-freetext>` — event-driven free-text display component.
   *
   * Listens to `textChangeEvent` on a context derived from `textchange-context`
   * (via `pulseUtility.getTextChangeContext`) and renders the received text as a `<span>`.
   * Also dispatches `askForTextChangeEvent` on init to request the current value.
   *
   * Exposed method: `cleanDisplay()` — called by x-machineselection to clear on machine change.
   *
   * Attributes:
   *   machine-id         - machine id (used for context computation)
   *   group              - group id (used for context computation)
   *   textchange-context - base context name for the text change event channel
   *
   * @extends pulseComponent.PulseInitializedComponent
   */
  class freetextComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self.methods = {
        cleanDisplay: self.cleanDisplay // exposed for x-machineselection
      };

      // DOM
      self._content = undefined;

      return self;
    }

    /** Clears the displayed text (called externally by machine selection changes). */
    cleanDisplay () {
      $(this._content).empty();
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'group': // Not fully defined yet
          if (this.isInitialized()) {
            // Check 'textchange-context'
            if (this.element.hasAttribute('textchange-context')) {
              let textchangecontext = pulseUtility.getTextChangeContext(this);
              eventBus.EventBus.removeEventListenerBySignal(this,
                'textChangeEvent');
              eventBus.EventBus.addEventListener(this,
                'textChangeEvent', textchangecontext,
                this.onTextChange.bind(this));
            }
            this.start(); // == re load
          } break;
        case 'textchange-context':
          if (this.isInitialized()) {
            let textchangecontext = pulseUtility.getTextChangeContext(this);
            eventBus.EventBus.removeEventListenerBySignal(this,
              'textChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'textChangeEvent', textchangecontext,
              this.onTextChange.bind(this));

            eventBus.EventBus.dispatchToContext('askForTextChangeEvent', textchangecontext);
          }
          //this.start(); // To re-validate parameters
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text'); // Mandatory for loader

      // Update here some internal parameters

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('freetext-content');
      $(this.element).append(this._content);

      // Create DOM - NO Loader / No message

      // listeners/dispatchers
      if (this.element.hasAttribute('textchange-context')) {
        let textchangecontext = pulseUtility.getTextChangeContext(this);
        eventBus.EventBus.addEventListener(this,
          'textChangeEvent', textchangecontext,
          this.onTextChange.bind(this));

        eventBus.EventBus.dispatchToContext('askForTextChangeEvent', textchangecontext);
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

    /**
       * Event bus callback triggered when the text changes
       *
       * @param {Object} event
       */
    onTextChange (event) {
      if ('' == event.target.text) {
        $(this._content).empty();
      }
      else {
        $(this._content).empty();
        $(this._content).append($('<span></span>').html(event.target.text));
      }
    }
  }

  pulseComponent.registerElement('x-freetext', freetextComponent, ['machine-id', 'group', 'textchange-context']);
})();
