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

(function () {

  /**
   * `<x-remotedisplay>` — passive text display driven by the event bus.
   *
   * Listens to `displayChangeEvent` on `display-context` and renders the
   * payload's `Display` field as HTML (empty string when undefined).
   * Each event may also carry `ClassToAdd` / `ClassToRemove` to toggle a
   * CSS class on the content div. Errors when `display-context` is
   * missing.
   *
   * @element x-remotedisplay
   * @attr {string} display-context (required) event-bus context for `displayChangeEvent`
   * @extends pulseComponent.PulseInitializedComponent
   */
  class RemoteDisplay extends pulseComponent.PulseInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._display = undefined;
      self._content = undefined;

      return self;
    }

    /**
     * Re-subscribes to `displayChangeEvent` when `display-context` attribute changes.
     */
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

    /**
     * Validates `display-context` attribute, builds content div, subscribes to the event bus.
     * Errors immediately if `display-context` is missing.
     */
    initialize () {
      if (!this.element.hasAttribute('display-context')) {
        console.error('missing attribute display-context');
        this.switchToKey('Error', () => this.displayError('missing attribute display-context'), () => this.removeError());
        return;
      }

      // In case of clone, need to be empty:
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('remotedisplay-content');
      $(this.element).append(this._content);

      // Subscribe to display change events
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
      $(this.element).empty();
      this._content = undefined;
      super.clearInitialization();
    }

    /**
     * Updates the content div with the new display HTML.
     * Applies optional CSS class changes from the event data.
     *
     * @param {{ target: { Display: string, ClassToAdd?: string, ClassToRemove?: string } }} event
     */
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
