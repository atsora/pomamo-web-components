// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-motionpercentage
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-motionpercentage>` — utilization percentage label driven by the
   * event bus.
   *
   * Performs no AJAX. Listens to `motionChangeEvent` on
   * `<motion-context>[_<machine-id>]` and renders `event.target.MotionPercent * 100`
   * rounded to 0 decimals, suffixed with `%` (empty when the value is
   * absent). Reacts to `machineIdChangeSignal` on `machine-context`
   * (updates `machine-id`, which also re-binds the motion listener).
   *
   * @element x-motionpercentage
   * @attr {string} motion-context  (required) base event-bus context for `motionChangeEvent`
   * @attr {number} machine-id      machine id, appended to `motion-context` as `_<id>`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class MotionPercentageComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      // default
      //self._svg = null;
      self._textSpan = undefined;
      self._motionpercentage = undefined;


      return self;
    }

    //get content () { return this._content; }

    /**
     * Updates the text span with the current percentage, or clears it if undefined.
     */
    _display () {
      let display = '';
      if (pulseUtility.isNumeric(this._motionpercentage) == true) {
        display = this._motionpercentage.toFixed(0) + '%';
      }
      this._textSpan.innerHTML = display;

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
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
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
      this._content.className = 'motionpercentage';
      this.element.appendChild(this._content);

      // + Text span
      this._textSpan = document.createElement('span');
      this._textSpan.className = 'motionpercentage-text';
      this._content.appendChild(this._textSpan);


      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._textSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('motion-context')) {
        console.error('missing attribute motion-context in MotionPercentage.element');
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
     * Event callback when motion data changes: stores `MotionPercent * 100` and updates the display.
     *
     * @param {{ target: { MotionPercent?: number } }} event
     */
    onMotionChange (event) {
      if (!pulseUtility.isNotDefined(event.target.MotionPercent)) {
        this._motionpercentage = Number(event.target.MotionPercent * 100);
      }
      else {
        this._motionpercentage = null;
      }
      this._display();
    }
  }

  pulseComponent.registerElement('x-motionpercentage', MotionPercentageComponent, ['machine-id', 'machine-context', 'motion-context']);
})();
