// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currenticonnextstop
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

  class CurrentIconNextStopComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;

      self._dispatchersListenersCreated = false;

      // Server time diff
      self._diffServerTimeMinusNowMSec = 0;
      self._serverNow = null;
      self._refDateTime = null;

      self._untilNextMSec = null; // 0
      self._severity = '';
      self._eventKind = '';

      self._threshold1 = 600;
      self._threshold2 = 180;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start(); // Hope this reloads component 'NOW' --RR
          break;
        case 'active':
          //if (oldValue != newVal)
          {
            if (newVal == 'true') {
              $(this._content).addClass('active');
            }
            else {
              $(this._content).removeClass('active');
            }
            //this.displayStop(); // Refresh with active or not active display
          }
          break;
        /*case 'machine-context':
          if (this._dispatchersListenersCreated) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal,
                             this.onMachineIdChange.bind(this));
          }
          this.start();
          break;*/
        case 'status-context':
          if (this._dispatchersListenersCreated) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'nextStopStatusChange');
            eventBus.EventBus.addEventListener(this,
              'nextStopStatusChange', newVal,
              this.onNextStopStatusChange.bind(this));
          }
          //this.start(); // Why ? Is it useful ? --RR
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-icon');

      let defaultThreshold1 = 600; // in seconds -> same as tagConfig !
      let defaultThreshold2 = 180; // in seconds -> same as tagConfig !
      this._threshold1 = Number(this.getConfigOrAttribute('threshold1', defaultThreshold1));
      this._threshold2 = Number(this.getConfigOrAttribute('threshold2', defaultThreshold2));

      // listeners/dispatchers
      this._createListenersDispatchers();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      this._content = $('<div></div>').addClass('pulse-icon-content');
      $(this.element)//.addClass('XXX')
        .append(this._content);
      if (this.element.hasAttribute('active') &&
        this.element.getAttribute('active') == 'true') {
        $(this._content).addClass('active');
      }
      this.displayStop();

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

    reset () {
      // Clean component
      (this._content).empty();
      // Remove Error
      //this.removeError();

      this.switchToNextContext();
    }

    _createListenersDispatchers () {
      if (false == this._dispatchersListenersCreated) {
        /*if (this.element.hasAttribute('machine-context')) {
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal', this.element.getAttribute('machine-context'), this.onMachineIdChange.bind(this));
        }*/
        if (this.element.hasAttribute('status-context')) {
          eventBus.EventBus.addEventListener(this,
            'nextStopStatusChange',
            this.element.getAttribute('status-context'),
            this.onNextStopStatusChange.bind(this));
        }
        /*if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.addEventListener(this,
            'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
           this.onDateTime RangeChange.bind(this));
        }*/

        this._dispatchersListenersCreated = true;
      }
    }


    displayError (message) {
      // Code here to display the error message
      // For example:
      //$(this._content).html(message);
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
      //this._shouldDisplayStop = false;
      //this.hideStop();
    }

    /*_setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }*/

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // RANGE
      /*this._setRangeFromAttribute();
      // Check the range is valid
      if (this._range == undefined) {
        console.log('undefined range (missing attribute range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        this.setError('missing range'); // delayed error message
        return;
      }
      if (this._range.isEmpty()) {
        console.error('empty range');
        //this.setError('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        this.setError('empty range'); // delayed error message
        return;
      }*/
      if (!this.element.hasAttribute('machine-id')) {
        console.log('waiting attribute machine-id in currenticonnextstop.element');
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in currenticonnextstop.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // All the parameters are ok, switch to the next context
      this.switchToNextContext();
    }

    // Overload to always refresh value
    get isVisible () {
      if (!this._connected) { // == is connected
        return false;
      }
      if ($(this.element).is(':visible')) {
        return true;
      }
      return false;
    }

    get refreshRate () {  // refresh rate in ms.
      return 1000 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1); // +1 to allow refresh from bars
    }

    getShortUrl () {
      let url = 'CycleProgress?MachineId=' +
        + this.element.getAttribute('machine-id') + '&Light=true'
        + '&IncludeEvents=true';
      return url;
    }

    refresh (data) {
      //if ( !data ) { return; }

      // Clear -> done inside to avoid blinking
      //$(this.element).find('.pulse-icon-next-stop').removeClass('activeevent').removeClass('comingevent').removeClass('threshold1').removeClass('threshold2');

      // Check Server time diff
      this._diffServerTimeMinusNowMSec = pulseConfig.getInt('diffServerTimeMinusNowMSec', 0);
      this._serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);

      // FIND remaining/elapsed times
      this._untilNextMSec = null;
      this._refDateTime = null;

      if (data.ActiveEvents && data.ActiveEvents.length > 0) {
        // Manage active events (STOPPED)
        let event = data.ActiveEvents[0];
        this._refDateTime = new Date(event.DateTime);
        if (this._eventKind != 'activeevent') {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._eventKind);
          this._eventKind = 'activeevent';
          $(this.element).find('.pulse-icon-next-stop').addClass(this._eventKind);
        }
        if (this._severity != event.Severity.LevelName) {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._severity);
          this._severity = event.Severity.LevelName;
          $(this.element).find('.pulse-icon-next-stop').addClass(this._severity);
        }
        this._untilNextMSec = this._refDateTime.getTime() - this._serverNow.getTime();

        // Set No Threshold
        $(this.element).find('.pulse-icon-next-stop').removeClass('threshold1');
        $(this.element).find('.pulse-icon-next-stop').removeClass('threshold2');
      }
      else if (data.ComingEvents && data.ComingEvents.length > 0) {
        // Manage coming events (Stop in / End in...)
        let event = data.ComingEvents[0];
        this._refDateTime = new Date(event.DateTime);
        if (this._eventKind != 'comingevent') {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._eventKind);
          this._eventKind = 'comingevent';
          $(this.element).find('.pulse-icon-next-stop').addClass(this._eventKind);
        }
        if (this._severity != event.Severity.LevelName) {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._severity);
          this._severity = event.Severity.LevelName;
          $(this.element).find('.pulse-icon-next-stop').addClass(this._severity);
        }
        this._untilNextMSec = this._refDateTime.getTime() - this._serverNow.getTime();

        if (this._untilNextMSec <= 0) {
          this._untilNextMSec = 0;
        }
        let thresholdClass = '';
        if (this._untilNextMSec / 1000 < this._threshold2) {
          thresholdClass = 'threshold2';
          // Set Threshold1
          $(this.element).find('.pulse-icon-next-stop').removeClass('threshold1');
          $(this.element).find('.pulse-icon-next-stop').addClass('class', thresholdClass);
        }
        else if (this._untilNextMSec / 1000 < this._threshold1) {
          thresholdClass = 'threshold1';
          // Set Threshold2
          $(this.element).find('.pulse-icon-next-stop').removeClass('threshold2');
          $(this.element).find('.pulse-icon-next-stop').addClass('class', thresholdClass);
        }
        else {
          // Set No Threshold
          $(this.element).find('.pulse-icon-next-stop').removeClass('threshold1');
          $(this.element).find('.pulse-icon-next-stop').removeClass('threshold2');
        }

      }
      else { // NO INFO
        if (this._eventKind != '') {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._eventKind);
          this._eventKind = '';
        }
        if (this._severity != '') {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._severity);
          this._severity = '';
        }
        // NO threshold
        $(this.element).find('.pulse-icon-next-stop').removeClass('threshold1');
        $(this.element).find('.pulse-icon-next-stop').removeClass('threshold2');
      }
    }

    /*hideStop () {
      if (this._content != undefined) {
        (this._content).empty();
      }
    }*/

    displayStop () {
      if (this._content != undefined) {
        // Display icon (or not)
        (this._content).empty();
        let image = $('<div></div>').addClass('pulse-icon-next-stop');
        (this._content).append(image);
        pulseSvg.inlineBackgroundSvg(image);

        // Tooltips
        let tooltip = this.getTranslation('iconTooltip', '');
        if (tooltip != '') {
          pulseUtility.addToolTip(this._image, tooltip);
        }
      }
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the machine id changes
     *
     * @param {Object} event
     */
    /*onMachineIdChange (event) {
      //let newMachineId = event.target.newMachineId;
      if (this.element.getAttribute("machine-id") == event.target.newMachineId) {
        this.element.setAttribute("active", "true");
      } else {
        this.element.setAttribute("active", "false");
      }
    }*/

    /**
     * Event bus callback triggered when the next stop status changes in current tab
     *
     * @param {Object} event
     */
    onNextStopStatusChange (event) {
      if (this.element.hasAttribute('active') &&
        this.element.getAttribute('active') == 'true') {

        if (this._eventKind != event.target.eventKind) {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._eventKind);
          this._eventKind = event.target.eventKind;
          $(this.element).find('.pulse-icon-next-stop').addClass(this._eventKind);
        }
        if (this._severity != event.target.severity) {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._severity);
          this._severity = event.target.severity;
          $(this.element).find('.pulse-icon-next-stop').addClass(this._severity);
        }
        if (this._thresholdClass != event.target.thresholdClass) {
          $(this.element).find('.pulse-icon-next-stop').removeClass(this._thresholdClass);
          this._thresholdClass = event.target.thresholdClass;
          $(this.element).find('.pulse-icon-next-stop').addClass(this._thresholdClass);
        }
        /* was /
        if (!pulseUtility.isNotDefined(event.target.untilNextStopMSec)) {
          newShouldDisplayStop = (event.target.untilNextStopMSec < Number(this.getConfigOrAttribute('threshold2', 180)));
        }*/

        this.switchToState('Normal', 'Loading'); // = Should re-start timer and avoid too many un-needed requests to webservice
      }
    }
  }

  pulseComponent.registerElement('x-currenticonnextstop', CurrentIconNextStopComponent, ['machine-id', 'active', 'status-context']);
})();
