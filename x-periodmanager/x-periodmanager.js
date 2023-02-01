// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-periodmanager
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
//var state = require('state');
var eventBus = require('eventBus');

(function () {

  class periodmanagerComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;
      self._shiftText = '';

      // DOM -> never in contructor
      self._content = undefined;  // NO content - NO display here

      return self;
    }

    /**
      Replace _runAjaxWhenIsVisible when NO url should be called
      return true if something is done, false if _runAjaxWhenIsVisible should be called
    */
    _runAlternateGetData () {
      if (this.getConfigOrAttribute('displayweekrange', 'false') == 'true') {
        return false;
      }
      if (this.getConfigOrAttribute('displayshiftrange', 'false') == 'true') {
        return false;
      }

      if (this._nbDays >= 1) {
        return false;
      }
      // else displayhoursrange -> NO url - Find range HERE
      let now = moment();
      let m_end = moment(now);
      m_end = m_end.startOf('hour');
      if (this.element.getAttribute('exclude-now') != 'true') {
        m_end = m_end.add(1, 'hours');
      }
      let m_begin = moment(m_end);
      m_begin = m_begin.add(-this._nbHours, 'hours');

      this._range = pulseRange.createDefaultInclusivity(m_begin.toISOString(), m_end.toISOString());
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          {
            daterange: pulseRange.createDateRangeDefaultInclusivity(this._range.lower, this._range.upper),
            stringrange: this._range
          }
        );
      }
      else {
        eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent', {
          daterange: pulseRange.createDateRangeDefaultInclusivity(this._range.lower, this._range.upper),
          stringrange: this._range
        });
      }

      this.switchToNextContext();
      return true;
    }

    initDaysHours () {
      // Default = display 1 day
      let nbDays = this.getConfigOrAttribute('displaydaysrange', '1');
      // Default = 0 hours
      let nbHours = this.getConfigOrAttribute('displayhoursrange', '0');

      if (!pulseUtility.isInteger(nbDays)) {
        nbDays = '1';
        nbHours = '0';
      }
      this._nbDays = Number(nbDays);
      if (this._nbDays < 1) {
        if (!pulseUtility.isInteger(nbHours)) {
          // error = restore default
          this._nbDays = 1;
          nbHours = 0;
        }
      }
      this._nbHours = Number(nbHours);
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'askForDateTimeRangeEvent');
            eventBus.EventBus.addEventListener(this,
              'askForDateTimeRangeEvent', newVal,
              this.onAskForDateTimeChange.bind(this));
          }
          this.start(); // To re-validate parameters
          break;
        case 'textchange-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'askForTextChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'askForTextChangeEvent', newVal,
              this.onAskForTextChange.bind(this));

            eventBus.EventBus.dispatchToContext('textChangeEvent',
              this.element.getAttribute('textchange-context'),
              { text: this._shiftText });
          }
          //this.start(); // To re-validate parameters
          break;
        case 'displayweekrange':
        case 'displayshiftrange':
        case 'displaydaysrange':
        case 'displayhoursrange':
        case 'exclude-now':
          this.initDaysHours();
          this.start(); // Only if changing this attribute requires to restart the component.
          break;
        default:
          break;
      }
    }

    initialize () {
      // Update here some internal parameters
      this.initDaysHours();

      // listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'),
          this.onAskForDateTimeChange.bind(this));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'askForDateTimeRangeEvent',
          this.onAskForDateTimeChange.bind(this));
      }
      if (this.element.hasAttribute('textchange-context')) {
        let newVal = this.element.getAttribute('textchange-context');
        eventBus.EventBus.addEventListener(this,
          'askForTextChangeEvent', newVal,
          this.onAskForTextChange.bind(this));

        if ((this.getConfigOrAttribute('displayshiftrange', 'false') != 'true')
          && (this.getConfigOrAttribute('displayweekrange', 'false') != 'true')) {
          if ((this._nbDays == 1)
            && (this.element.getAttribute('exclude-now') != 'true')) {
            this._shiftText = 'Today';
            eventBus.EventBus.dispatchToContext('textChangeEvent',
              this.element.getAttribute('textchange-context'),
              { text: this._shiftText });
          }
        }
      }

      // Create DOM - Loader -> Nothing
      // Create DOM - Content -> Nothing

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      /* Not mandatory anymore
      if (!this.element.hasAttribute('period-context')) {
        console.error('missing attribute period-context in periodmanager');
        this.setError('missing period-context'); // delayed error message
        return;
      }*/
      // Additional checks with attribute param

      //this._setRangeFromAttribute();
      // Check the range is valid -> NO

      this.switchToNextContext();
    }

    displayError (message) {
      // Forward to x-message ?
    }

    removeError () {
      //this.displayError('');  // Forward to x-message ?
    }

    get refreshRate () {
      // Return here the refresh rate in ms. 
      let now = moment();
      let m_endOfTimer;
      // Manage ShiftDisplay or weekDisplay
      if ((this.getConfigOrAttribute('displayshiftrange', 'false') == 'true')
        || (this.getConfigOrAttribute('displayshiftrange', 'false') == 'true')) {
        m_endOfTimer = moment(this._range.upper);
      }
      else {
        // WARNING ! Yesterday data should be refreshed too
        if (this.element.getAttribute('exclude-now') != 'true') {
          m_endOfTimer = moment(this._range.lower);
        }
        else {
          m_endOfTimer = moment(this._range.upper);
        }
        if (this._nbDays >= 1) {
          while (now.isAfter(m_endOfTimer)) {
            m_endOfTimer = m_endOfTimer.add(1, 'days');
          }
        }
        else if (this._nbHours >= 1) {
          while (now.isAfter(m_endOfTimer)) {
            m_endOfTimer = m_endOfTimer.add(1, 'hours');
          }
        }
      }

      let msUntilEndOfTimer = m_endOfTimer.diff(now, 'milliseconds');
      if (
        // HACK == try to remove it :
        //msUntilEndOfTimer > 60 * 60 * 1000 || // refresh each hour maximum to limit errors
        msUntilEndOfTimer < 0) { // In case of default (== ONE day) for example
        msUntilEndOfTimer = 60 * 60 * 1000;
      }
      return msUntilEndOfTimer;
    }

    // Overload to always refresh value
    get isVisible () {
      return true;
    }

    getShortUrl () { // Return the Web Service URL without path
      // ManageShiftDisplay
      if (this.getConfigOrAttribute('displayshiftrange', 'false') == 'true') {
        let m_around = moment(); // now
        let iso_around = pulseUtility.convertMomentToDateTimeString(m_around);
        let url = 'RangeAround?Around=' + iso_around + '&RangeType=shift&RangeSize=1';
        return url;
      }
      // Manage WEEK Display
      if (this.getConfigOrAttribute('displayweekrange', 'false') == 'true') {
        let m_around = moment(); // now
        if (this.element.getAttribute('exclude-now') == 'true') {
          m_around.add(-7, 'w');
        }
        let iso_around = pulseUtility.convertMomentToDateTimeString(m_around);
        let url = 'RangeAround?Around=' + iso_around + '&RangeType=week&RangeSize=1';
        return url;
      }
      // this.initDaysHours(); -> already done

      if (this._nbDays >= 1) {
        // display full days
        let m_around = moment(); // now
        if (this.element.getAttribute('exclude-now') == 'true') {
          let nbDaysToRemove = Math.floor((this._nbDays + 1) / 2); // Avoid trunk because of Safari
          m_around = m_around.add(-nbDaysToRemove, 'days');
        }
        let iso_around = pulseUtility.convertMomentToDateTimeString(m_around);
        let url = 'RangeAround?Around=' + iso_around + '&RangeType=day&RangeSize=' + this._nbDays;
        return url;
      }

      // else display hours -> should never happens -> log warning ?
      return '';
    }

    beforeReload () { // To override if required
      //this.initDaysHours();
      super.beforeReload();
    }

    refresh (data) {
      // Update the component with data returned by the web service in case of success

      // Store range (to ISO string)
      this._range = pulseRange.createStringRangeFromString(data.DateTimeRange);
      // Send message
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          {
            daterange: pulseRange.createDateRangeDefaultInclusivity(this._range.lower, this._range.upper),
            stringrange: this._range
          });
      }
      else {
        eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent',
          {
            daterange: pulseRange.createDateRangeDefaultInclusivity(this._range.lower, this._range.upper),
            stringrange: this._range
          });
      }

      this._shiftText = '';

      if (this.getConfigOrAttribute('displayshiftrange', 'false') == 'true') {
        if (data.Display) {
          this._shiftText = data.Display;
        }
      }
      else {
        if ((this._nbDays == 1) && (this.element.getAttribute('exclude-now') != 'true')) {
          this._shiftText = 'Today';
        }
      }
      if (this.element.hasAttribute('textchange-context')) {
        eventBus.EventBus.dispatchToContext('textChangeEvent',
          this.element.getAttribute('textchange-context'),
          { text: this._shiftText });
      }

      // _reStartTimerWithGoodTimeout(this);
    }

    manageSuccess (data) {
      // Success:
      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    // Callback events
    /**
     * Event bus callback triggered when the date/time range is asked
     *
     * @param {Object} event
     */
    onAskForDateTimeChange (event) {
      if (this._range) { // To avoid loop and problems
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
            this.element.getAttribute('period-context'),
            {
              daterange: pulseRange.createDateRangeDefaultInclusivity(this._range.lower, this._range.upper),
              stringrange: this._range
            });
        }
        else {
          eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent',
            {
              daterange: pulseRange.createDateRangeDefaultInclusivity(this._range.lower, this._range.upper),
              stringrange: this._range
            });
        }
      }
    }

    /**
    * Event bus callback triggered to warn that the text changes
    *
    * @param {Object} event
    */
    onAskForTextChange (event) {
      eventBus.EventBus.dispatchToContext('textChangeEvent',
        this.element.getAttribute('textchange-context'),
        { text: this._shiftText });
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      if (event.target.config == 'displayshiftrange') {
        this.start();
      }
      if (event.target.config == 'displayweekrange') {
        this.start();
      }
      if (event.target.config == 'displayhoursrange') {
        this.initDaysHours();
        this.start();
      }
      if (event.target.config == 'displaydaysrange') {
        this.initDaysHours();
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-periodmanager', periodmanagerComponent, [
    'period-context', 'textchange-context',
    'displayshiftrange', 'displayweekrange', 'displaydaysrange', 'displayhoursrange',
    'exclude-now']);
})();
