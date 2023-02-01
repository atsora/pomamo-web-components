// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-motiontime
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-motiontime> to display an utilization bar component. This tag gets following attribute :
 *  motion-context : String (to get time directly)
 *  machine-id : complete motion-context when using x-grouparray
 *  machine-context : to change machine-id
 * 
 */
(function () {

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

    _display () {
      if (!pulseUtility.isNotDefined(this._motionSec)) {
        $(this._text).html(this._formatSecondsInDDHHMM(this._motionSec));
      }
      else {
        $(this._text).html('');
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
      $(this.element).empty();

      // Create DOM - Loader (?)
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);*/
      // Create DOM - Content
      this._content = $('<div></div>').addClass('motiontime');
      this._text = $('<span></span>').addClass('motiontime-text');
      $(this._content).append(this._text);
      $(this.element).append(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._text = undefined;
      this._content = undefined;
      this._motionSec = null;

      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('motion-context')) {
        console.error('missing attribute motion-context in MotionTime.element');
        this.setError('missing motion-context'); // delayed error message
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    // Callback events
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
