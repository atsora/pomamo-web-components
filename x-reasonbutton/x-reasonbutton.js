// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reasonbutton
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');
const { inlineBackgroundSvg } = require('../libraries/pulse.svg');

(function () {

  /**
   * `<x-reasonbutton>` — live stop-reason coloured button for one machine.
   *
   * Polls `CurrentReason?MachineId=<id>` (with
   * `&Period=running_machinemodecategory&NotRunningOnlyDuration=true`
   * appended when `textchange-context` is set) and paints the host with
   * the reason colour. When `textchange-context` is set, dispatches
   * `textChangeEvent` on the resolved context with the not-running
   * duration; replies to `askForTextChangeEvent` on the same context.
   * Clicking opens the stop-classification or running dialog via
   * `pulseDetailsPopup`. Reacts to `machineIdChangeSignal` on
   * `machine-context` (updates `machine-id`).
   *
   * @element x-reasonbutton
   * @attr {number} machine-id         (required) machine id
   * @attr {string} machine-context    event-bus context for `machineIdChangeSignal`
   * @attr {string} textchange-context base context for `textChangeEvent`
   * @fires textChangeEvent            `{ text: string }` — on the resolved `textchange-context`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class ReasonButtonComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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

      self._reasoncolor = null;
      self._modecategory = null;

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    get content() { return this._content; } // Optional

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            this.start(); // == re load
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
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize() {
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

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();
      this._reasoncolor = null; // To force refresh display
      this._modecategory = null;

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'pulse-icon-content';
      this.element.classList.add('reasonbutton');
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

    clearInitialization() {
      // Parameters
      this._reasoncolor = null; // To force refresh display
      this._modecategory = null; // To force refresh display

      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError(message) {
      this._isoPeriodStart = null;
      this._isoNowFromWebService = null;
      this._dateNow = new Date();

      this._displayIcon(null, null);

      // Remove css in parent too
      let tileParent = this.element.closest('.tile');
      if (tileParent) {
        tileParent.classList.remove('reasonbutton-severity-error');
      }
    }

    get refreshRate() {
      return 1000.0 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl() {
      // Return the Web Service URL here without path
      let url = 'CurrentReason?MachineId=' + this.element.getAttribute('machine-id');
      if (this.element.hasAttribute('textchange-context')) {
        url += '&Period=running_machinemodecategory&NotRunningOnlyDuration=true';
      }
      return url;
    }

    _displayIcon(color, catId) {
      let needToRefreshDisplay = false; // Defined to avoid blinking
      if (this._reasoncolor != color) {
        needToRefreshDisplay = true;
      }
      if (this._modecategory != catId) {
        needToRefreshDisplay = true;
      }

      if (needToRefreshDisplay) {
        if (color) {
          this._reasoncolor = color;
        }
        else {
          this._reasoncolor = null;
        }

        if (catId) {
          this._modecategory = catId;
        }
        else {
          this._modecategory = null;
        }

        let oldSvg = this.element.querySelector('.reasonbutton-svg');
        if (oldSvg) {
          oldSvg.remove();
        }

        // New div for svg
        let svgDiv = document.createElement('div');
        svgDiv.className = 'reasonbutton-svg';
        let modeClass = pulseSvg.getMachineModeClass(this._modecategory);
        if (modeClass) {
          svgDiv.classList.add(modeClass);
        }
        svgDiv.style.color = this._reasoncolor;
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

    refresh(data) {
      if (data.TooOld) { //-> ErrorDTO ?
        this._isoPeriodStart = null;
        this._isoNowFromWebService = null;
        this._dateNow = new Date();

        this._displayIcon(null, null);
        return;
      }

      if (this.element.hasAttribute('textchange-context')) {
        if (pulseUtility.isNotDefined(data.PeriodStart)) {
          this._isoPeriodStart = null;
        }
        else {
          this._isoPeriodStart = data.PeriodStart; //	"2018-10-01T09:27:37Z"
        }
        this._isoNowFromWebService = data.CurrentDateTime; //	"2018-10-01T09:28:17Z"
        this._dateNow = new Date();
      }

      this._displayIcon(data.Reason.Color, data.MachineMode.Category.Id);

      // Change parent to allow css = Add 'reasonbutton-severity-error' in .tile [RAM Precision]
      let tileParent = this.element.closest('.tile');
      if (tileParent) {
        if (!pulseUtility.isNotDefined(data.Severity)) {
          if ('Error' == data.Severity.LevelName) {
            tileParent.classList.add('reasonbutton-severity-error');
          }
          else {
            tileParent.classList.remove('reasonbutton-severity-error');
          }
        }
        else {
          tileParent.classList.remove('reasonbutton-severity-error');
        }
      }

    }

    manageSuccess(data) {
      // Success:
      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onAskForTextChange(event) {
      let textchangecontext = pulseUtility.getTextChangeContext(this);
      eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
        { text: this._yellowSinceText });
    }

    /**
     * Event bus callback triggered when 'machine-id' changes
     *
     * @param {Object} event
     */
    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
  }

  pulseComponent.registerElement('x-reasonbutton', ReasonButtonComponent, ['machine-id', 'textchange-context', 'machine-context']);
})();
