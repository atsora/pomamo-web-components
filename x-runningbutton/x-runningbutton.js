// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-runningbutton
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

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
      $(this.element).empty();
      this._isRunningClass = null; // To force refresh display
      this._modecategory = null;

      // Create DOM - Content
      this._content = $('<div></div>').addClass('pulse-icon-content');
      $(this.element).addClass('runningbutton')
        .append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      this._isRunningClass = null; // To force refresh display
      this._modecategory = null;

      // DOM
      $(this.element).empty();
      
      //this._messageSpan = undefined;
      this._content = undefined;
      
      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in runningbutton.element');
        this.setError('missing machine-id'); // delayed error message
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
        $(this.element).find('.runningbutton-svg').remove(); // Remove Old SVG

        // New div for svg
        let svgDiv = $('<div></div>').addClass('runningbutton-svg');
        let modeClass = pulseSvg.getMachineModeClass(this._modecategory);
        svgDiv.addClass(modeClass);
        //svgDiv.css('color', this._reasoncolor);
        // Add a class for the color
        svgDiv.addClass(this._isRunningClass);
        $(this._content).append(svgDiv);

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
