// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-motiontime
 * @requires module:pulseComponent
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-motiontime>` — motion-duration label driven by the event bus.
   *
   * Performs no AJAX. Listens to `motionChangeEvent` on
   * `<motion-context>[_<machine-id>]` and renders `event.target.MotionSeconds`
   * as `Dd HH:MM` (with days, hours zero-padded only with days) or `H:MM`
   * (seconds dropped). Empty when `MotionPercent` is undefined. Reacts to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`,
   * re-binding the motion listener).
   *
   * @element x-motiontime
   * @attr {string} motion-context  (required) base event-bus context for `motionChangeEvent`
   * @attr {number} machine-id      machine id, appended to `motion-context` as `_<id>`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class MotionTimeComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._text = undefined;
      self._motionSec = null;

      return self;
    }

    //get content () { return this._content; }

    /**
     * Formats a duration in seconds as `Dd HH:MM` (with days) or `H:MM` (without days).
     * Seconds are discarded. Minutes are zero-padded.
     *
     * @param {number} seconds
     * @returns {string}
     */
    _formatSecondsInDDHHMM (seconds) {
      let retString = '';

      let min = Math.floor(seconds / 60);
      //let sec = seconds % 60; not displayed

      let hrs = Math.floor(min / 60);
      min = min % 60;

      let days = Math.floor(hrs / 24);
      hrs = hrs % 24;

      // Format
      if (days > 0) {
        retString += days + 'd ';
        retString += (hrs > 9 ? '' + hrs : '0' + hrs);
      }
      else {
        retString += hrs;
      }
      retString += ':' + (min > 9 ? '' + min : '0' + min);
      return retString;
    }

    /**
     * Updates the text span with the formatted duration, or clears it if `_motionSec` is null.
     */
    _display () {
      if (!pulseUtility.isNotDefined(this._motionSec)) {
        this._text.innerHTML = this._formatSecondsInDDHHMM(this._motionSec);
      }
      else {
        this._text.innerHTML = '';
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            let context = this.element.getAttribute('motion-context');
            eventBus.EventBus.removeEventListenerBySignal(this,
              'motionChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'motionChangeEvent',
              context + ((newVal == '') ? '' : ('_' + newVal)),
              this.onMotionChange.bind(this));
            this.start();
          }
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal,
              this.onMachineIdChange.bind(this), this);
          }
          break;
        case 'motion-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'paramChangeSignal');
            let mach = '';
            if (this.element.hasAttribute('machine-id')) {
              mach = '_' + this.element.getAttribute('machine-id');
            }
            eventBus.EventBus.addEventListener(this,
              'paramChangeSignal',
              newVal + mach,
              this.onMotionChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-smalltext');

      // Attributes
      if (!this.element.hasAttribute('motion-context')) {
        console.error('missing attribute motion-context');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('missing attribute motion-context'), () => this.removeError());
        return;
      }

      // Listener and dispatchers
      let context = this.element.getAttribute('motion-context');
      if (this.element.hasAttribute('machine-id')) {
        context += '_' + this.element.getAttribute('machine-id');
      }
      eventBus.EventBus.addEventListener(this,
        'motionChangeEvent', context,
        this.onMotionChange.bind(this));

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Loader (?)
      /*let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);*/
      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'motiontime';
      this._text = document.createElement('span');
      this._text.className = 'motiontime-text';
      this._content.appendChild(this._text);
      this.element.appendChild(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._text = undefined;
      this._content = undefined;
      this._motionSec = null;

      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('motion-context')) {
        console.error('missing attribute motion-context in MotionTime.element');
        this.setError(this.getTranslation('error.missingMotionContext', 'Missing motion context')); // delayed error message
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    /**
     * Event callback when the selected machine changes: updates `machine-id` attribute.
     *
     * @param {{ target: { newMachineId: number } }} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event callback when motion data changes: stores `MotionSeconds` and refreshes the display.
     * Clears `_motionSec` if `MotionPercent` is undefined (no valid motion data).
     *
     * @param {{ target: { MotionPercent?: number, MotionSeconds?: number } }} event
     */
    onMotionChange (event) {
      if (!pulseUtility.isNotDefined(event.target.MotionPercent)) {
        this._motionSec = event.target.MotionSeconds;
        // Hours = Number(event.target.MotionSeconds/3600.0).toFixed(2);
      }
      else {
        this._motionSec = null;
      }
      this._display();
    }
  }

  pulseComponent.registerElement('x-motiontime', MotionTimeComponent, ['machine-id', 'machine-context', 'motion-context']);
})();
