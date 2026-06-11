// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-runningbutton
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-runningbutton>` — live running/not-running status button for one
   * machine.
   *
   * Polls `CurrentMachineMode?MachineId=<id>` (with
   * `&Period=running_machinemodecategory&NotRunningOnlyDuration=true`
   * when `textchange-context` is set) and paints the host with the mode
   * category class (running / not-running). When `textchange-context` is
   * set, dispatches `textChangeEvent` with the not-running duration and
   * replies to `askForTextChangeEvent` on the same context. Clicking the
   * button opens a running-view dialog (`x-runningdialog`) via
   * `pulseDetailsPopup`. Reacts to `machineIdChangeSignal` on
   * `machine-context`.
   *
   * @element x-runningbutton
   * @attr {number} machine-id         (required) machine id
   * @attr {string} machine-context    event-bus context for `machineIdChangeSignal`
   * @attr {string} textchange-context base context for `textChangeEvent`
   * @fires textChangeEvent            `{ text: string }` — on the resolved `textchange-context`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class RunningButtonComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Default values
      //this._range = undefined;
      self._isoPeriodStart = null;
      self._isoNowFromWebService = null;
      self._dateNow = new Date();
      self._yellowSinceText = '';

      self._isRunningClass = null;
      self._modecategory = null;

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            this.start(); // == re-load
          } break;
        case 'textchange-context':
          if (this.isInitialized()) {
            let textchangecontext = pulseUtility.getTextChangeContext(this);
            eventBus.EventBus.removeEventListenerBySignal(this, 'askForTextChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'askForTextChangeEvent', textchangecontext,
              this.onAskForTextChange.bind(this));

            eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
              { text: this._yellowSinceText });
          }
          this.start(); // To re-validate parameters
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-icon');

      // Update here some internal parameters

      // listeners/dispatchers
      if (this.element.hasAttribute('textchange-context')) {
        let textchangecontext = pulseUtility.getTextChangeContext(this);
        eventBus.EventBus.addEventListener(this,
          'askForTextChangeEvent', textchangecontext,
          this.onAskForTextChange.bind(this));

        eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
          { text: this._yellowSinceText });
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();
      this._isRunningClass = null; // To force refresh display
      this._modecategory = null;

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'pulse-icon-content';
      this.element.classList.add('runningbutton');
      this.element.appendChild(this._content);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', ' Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      this._isRunningClass = null; // To force refresh display
      this._modecategory = null;

      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      this._isoPeriodStart = null;
      this._isoNowFromWebService = null;
      this._dateNow = new Date();

      this._displayIcon(null, null);
    }

    get refreshRate () {
      return 1000.0 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let url = 'CurrentMachineMode?MachineId=' + this.element.getAttribute('machine-id');
      if (this.element.hasAttribute('textchange-context')) {
        url += '&Period=running_machinemodecategory&NotRunningOnlyDuration=true';
      }
      return url;
    }

    _displayIcon (isRunningClass, category) {
      let needToRefreshDisplay = false; // Define to avoid blinking
      if (this._isRunningClass != isRunningClass) {
        needToRefreshDisplay = true;
        this._isRunningClass = isRunningClass;
      }
      if (this._modecategory != category) {
        needToRefreshDisplay = true;
        this._modecategory = category;
      }
      if (needToRefreshDisplay) {
        let oldSvg = this.element.querySelector('.runningbutton-svg');
        if (oldSvg) {
          oldSvg.remove();
        }

        // New div for svg
        let svgDiv = document.createElement('div');
        svgDiv.className = 'runningbutton-svg';
        let modeClass = pulseSvg.getMachineModeClass(this._modecategory);
        // Guard null/empty tokens: classList.add(null) silently adds literal
        // "null" class; classList.add('') throws DOMException. Both happen
        // when _displayIcon(null, null) fires via displayError.
        if (modeClass) svgDiv.classList.add(modeClass);
        //svgDiv.style.color = this._reasoncolor;
        // Add a class for the color
        if (this._isRunningClass) svgDiv.classList.add(this._isRunningClass);
        this._content.appendChild(svgDiv);

        pulseSvg.inlineBackgroundSvg(svgDiv);
      }

      // Send text to show elapsed time since 'yellow' ?
      if (this.element.hasAttribute('textchange-context')) {
        if (this._isoPeriodStart == null) {
          this._yellowSinceText = '';
        }
        else {
          let durationSinceYellowInMSec = (new Date(this._isoNowFromWebService)).getTime()
            - (new Date(this._isoPeriodStart)).getTime();
          // Format display
          this._yellowSinceText = pulseUtility.getHoursMinutesDuration(durationSinceYellowInMSec / 1000);
        }
        let textchangecontext = pulseUtility.getTextChangeContext(this);
        eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
          { text: this._yellowSinceText });
      }
    }

    refresh (data) {
      let isRunningClass = ''; // Default = never used
      if (data.MachineMode.Running) {
        isRunningClass = 'fill-running';
      }
      else {
        isRunningClass = 'fill-idle';
      } /* else { continue; } */
      if (this.element.hasAttribute('textchange-context')) {
        this._isoPeriodStart = data.PeriodStart; //	"2018-10-01T09:27:37Z"
        this._isoNowFromWebService = data.CurrentDateTime; //	"2018-10-01T09:28:17Z"
        this._dateNow = new Date();
      }
      this._displayIcon(isRunningClass, data.MachineMode.Category.Id);
    }

    manageSuccess (data) {
      //TODO ???
      //if (data.TooOld) { -> ErrorDTO -> How should we manage it ?

      // Success:
      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onAskForTextChange (event) {
      let textchangecontext = pulseUtility.getTextChangeContext(this);
      eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
        { text: this._yellowSinceText });
    }
  }

  pulseComponent.registerElement('x-runningbutton', RunningButtonComponent, ['machine-id', 'textchange-context']);
})();
