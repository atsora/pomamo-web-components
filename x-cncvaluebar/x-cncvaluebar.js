// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-cncvaluebar
 * @requires module:pulsecomponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:pulseDetailsPopup
 */

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseComponent = require('pulsecomponent');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var state = require('state');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-cncvaluebar> to display a cncvaluebar bar component. This tag gets following attribute : 
 *  machine-id : Integer
 *  height : Integer
 *  period-context : String (optional)
 *  range : String 'begin;end' (optional)
 *  click : action on click (none/details/popup/change)
 *  showdetails: details to display after click - default in config
 *  showpopup: details to display in popup after click - default in config
 */
(function () {

  /**
   * CNC Value slot bar component
   *
   * @extends module:pulseComponent~PulseParamAutoPathRefreshingComponent
   */
  class CncValueBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._messageSpan = undefined;

      // Global configurations
      // - On going refresh rate
      self._refreshRate = 60; // Default

      // Parameters
      self._barwidth = 100; // default

      self._range = undefined;
      self._setRangeFromAttribute();

      self._height = undefined;
      self._setAutoHeight();

      // Internal data
      self._returnedRange = undefined;
      self._data = undefined;

      return self;
    }

    /********** CONTENT **********/
    /**
     * Content div of the component
     *
     * @return {jQuery} Content div of the component
     */
    get content () { return this._content; }

    /********** WIDTH **********/
    /**
     * @return {number} Width of the content
     */
    get barwidth () {
      let width = $(this.content).width();
      if (width) {
        this._barwidth = width;
      }
      return this._barwidth;
    }

    /********** HEIGHT **********/
    /**
    * Minimum height in pixels: 5px
    *
    * @return {number} Minimum height in pixels
    */
    get minHeight () { return 0; }

    /**
     * Default height in pixels: 30px
     *
     * @return {number} Default height in pixels
     */
    get defaultHeight () { return 10; }

    /* Set automatically the _height member from the HTML attribute or the configuration */
    _setAutoHeight () {
      this._height = this.getConfigOrAttribute('height', this.defaultHeight);
      if (!pulseUtility.isNumeric(this._height)) {
        this._height = this.defaultHeight;
      }
      else {
        this._height = Number(this._height);
      }
      if (this._height < this.minHeight) {
        this._height = this.minHeight;
      }
      // Resize content
      let c = this.content;
      if (typeof c !== 'undefined') {
        c.height(this._height);
      }
    }

    /********** RANGE **********/
    _setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._setRangeAndUpdateRefreshRate(range);
        }
      }
    }
    _setRangeAndUpdateRefreshRate (range) {
      this._range = range;
      this._setAutoRefreshRate();
    }

    /********** REFRESH RATE **********/

    _setAutoRefreshRate () {
      let updateSecondsMinimum = Number(this.getConfigOrAttribute('refreshingRate.barMinimumRefreshSeconds', 10));
      let updateSecondsFor1DayDisplay = Number(this.getConfigOrAttribute('refreshingRate.barDailyRefreshSeconds', 60)); // 1 minute ~= each time there is a new pixel

      let durationInHours = parseInt((this._range.upper - this._range.lower) / 1000) / 3600.0;
      this._refreshRate = durationInHours * updateSecondsFor1DayDisplay / 24.0 * 1000;
      if (this._refreshRate < updateSecondsMinimum * 1000) {
        this._refreshRate = updateSecondsMinimum * 1000;
      }
    }

    /**
     * Refresh rate in ms
     *
     * @return {number} Refresh rate in ms
     */
    get refreshRate () {
      if ((this._range.upper < new Date()) && pulseRange.equalsDefault(this._returnedRange, this._range)) { // Past period completed
        let pastRefreshRateInSeconds = 60
          * Number(this.getConfigOrAttribute('refreshingRate.barPastChangingDataRefreshMinutes', 5));

        console.assert(typeof (pastRefreshRateInSeconds) != 'undefined', 'invalid past refresh rate');
        return pastRefreshRateInSeconds * 1000;
      }
      else { // On going or past period not completed
        console.assert(typeof (this._refreshRate) != 'undefined', 'invalid refresh rate');
        return this._refreshRate;
      }
    }

    /**
     * Delay in ms before switching to a transient error.
     * Default is 5 minutes.
     *
     * @return {number} Delay in ms
     */
    get transientErrorDelay () {
      switch (this.stateContext) {
        case 'Load':
        case 'Reload':
          return super.transientErrorDelay;
        default:
          if ((this._range.upper < new Date()) && pulseRange.equalsDefault(this._returnedRange, this._range)) { // Past period completed
            return 60 * Number(this.getConfigOrAttribute('stopRefreshingRate.pastDataFreezeMinutes', 60)) * 1000;
          }
          else {
            return super.transientErrorDelay;
          }
      }
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey (context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState (context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button 'Start'
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    /**
     * @override
     */
    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'machine-id') {
        this.start();
      }
      if (attr == 'height') {
        this._setAutoHeight();
      }
      if (attr == 'range') {
        if (!pulseUtility.isNotDefined(newVal)) {
          this._setRangeFromAttribute();
          this.start();
        }
      }
      if ('period-context' == attr) {
        if (this.isInitialized()) {
          eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
          eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
            newVal,
            this.onDateTimeRangeChange.bind(this));
        }
        this.start();
      }
      if (('machine-context' == attr) && this.isInitialized()) {
        if (this.isInitialized()) {
          if (undefined != oldVal) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          }
          eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal',
            newVal, this.onMachineIdChange.bind(this));
          // Not necessarily to add this.start() because it will be restarted when the machineid will be updated
        }
      }
    }


    /**
     * @override
     */
    getShortUrl () {
      let url = 'CncValueColor?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
      if (this.element.hasAttribute('field-id')) {
        url += '&FieldId=' + this.element.getAttribute('field-id');
      }
      /* To add once done :
      if (this.stateContext == 'Reload') {
        url += '&Cache=No';
      }*/
      return url;
    }

    /**
     * Initialize the component
     */
    initialize () {
      this.addClass('pulse-slotbar');

      this._setAutoHeight();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // create DOM
      // HTML structure - Content
      this._content = $('<div></div>').addClass('cncvaluebar-content pulse-bar-content');
      this._content.height(this._height);
      // HTML structure - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      $(this.element)
        .addClass('cncvaluebar')
        .append(this._content);
      //$(window).resize(() => this.draw());

      // Dispatchers / Listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal', this.element.getAttribute('machine-context'), this.onMachineIdChange.bind(this));
      }

      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      this._messageSpan = undefined;

      // Remove the content div' SVG
      if (typeof this.content !== 'undefined') {
        this.content.find('.cncvaluebar-svg').remove();
      }
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Reset the component
     */
    reset () {
      this.cleanContent();
      this.removeError();

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        console.log('waiting attribute machine-id in CncValueBarComponent.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(Number(this.element.getAttribute('machine-id')))) {
        console.error('invalid attribute machine-id in CncValueBarComponent.element');
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }

      this._setRangeFromAttribute();

      // Check the range is valid
      if (this._range == undefined) {
        console.log('waiting attribute range in CncValueBarComponent.element');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError('missing range');
        return;
      }

      if (this._range.isEmpty()) {
        console.error('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError('empty range');
        return;
      }

      let daysBeforeHide = this.getConfigOrAttribute('cncvaluebar.daysbeforehide', 7);
      let isMoreThanXXXdays = ((moment(this._range.upper).diff(moment(this._range.lower))) >= daysBeforeHide * 24 * 60 * 60 * 1000);
      if (isMoreThanXXXdays) {
        this.content.hide(); // show = when data refresh
        this.switchToContext('Loaded'); // To stop refresh until range change
        return;
      }

      // All the parameters are ok, switch to the next context
      this.switchToNextContext();
    }

    /**
     * @override
     */
    manageSuccess (data) {
      this._returnedRange = pulseRange.createDateRangeFromString(data.Range);
      let range = this._range;

      // Probably not required, but in case the range is not defined, or one of its bound is not valid, get the range from data
      if ((typeof range !== 'undefined') && (range.isEmpty() || isNaN(range.lower) || isNaN(range.upper))) {
        if (data.Range) {
          console.warn(`x-cncvaluebar:refresh - no begin or end in range - get range=${data.Range} from data`);
          range = pulseRange.createDateRangeFromString(data.Range);
        }
        else {
          console.error('x-cncvaluebar:refresh - no range');
          this.switchToKey('Error');
          return;
        }
      }

      this.switchToNextContext(() => this.refreshRangeData(range, data));
    }

    refreshRangeData (range, data) {
      this._data = new Array();
      let barbegin = range.lower;
      let barend = range.upper;

      for (let block of data.Blocks) {
        let blockRange = pulseRange.createDateRangeFromString(block.Range);
        let iBegin = blockRange.lower;
        if ((iBegin == null) || (iBegin < barbegin)) {
          // Manage start before begin of bar AND no begin defined
          iBegin = barbegin
        }
        let iEnd = blockRange.upper;
        let iEndisDate = iEnd instanceof Date;
        if (iEndisDate)
          iEndisDate = (iEnd.toString() != 'Invalid Date');
        if (!iEndisDate || (barend < iEnd)) {
          // Manage end after end of bar AND no end defined
          iEnd = barend;
        }

        let slot = new Object();
        slot.beginPercent = (Math.max(barbegin, iBegin) - barbegin) / (barend - barbegin);
        slot.widthPercent = (Math.min(barend, iEnd) - Math.max(barbegin, iBegin)) / (barend - barbegin);
        slot.durationInSec = (iEnd.valueOf() - iBegin.valueOf()) / 1000;
        slot.range = blockRange;

        slot.color = block.Color;

        this._data.push(slot);
      }
      this.draw();
    }

    cleanContent () {
      if (typeof this.content === 'undefined') {
        return;
      }
      $(this.element).find('.cncvaluebar-svg').remove(); // Remove Old SVG
    }

    /**
     * @draw
     */
    draw () {
      this.cleanContent();

      // HIDE BAR if no data
      if (!this._data || this._data.length == 0) {
        this.content.hide();
        return;
      }
      else {
        this.content.show();
      }

      let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
      //svg.setAttribute('width', this.barwidth); // NO ! for auto-adapt
      svg.setAttribute('height', this._height);
      svg.setAttribute('viewBox', '0 0 '
        + this.barwidth + ' ' + this._height);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'cncvaluebar-svg');
      let contents = this.element.getElementsByClassName('pulse-bar-content');
      if (contents.length > 0) {
        contents[0].prepend(svg); // Before message
      }
      if (this._data) {
        for (let i = 0; i < this._data.length; i++) {

          let range = this._data[i].range;
          let x = this.barwidth * this._data[i].beginPercent;
          let width = this.barwidth * this._data[i].widthPercent;

          // CREATE SVG
          let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
          rect.setAttribute('x', x);
          rect.setAttribute('y', 0);
          rect.setAttribute('width', width);
          rect.setAttribute('height', this._height);
          rect.setAttribute('fill', this._data[i].color);
          rect.setAttribute('range', range.toString(d => d.toISOString()));
          rect.onclick = evt => this.onClick(evt, range);
          svg.appendChild(rect);
        }
      }
    }

    /**
     * @override
     */
    manageError (data) {
      this._returnedRange = undefined;
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure (isTimeout, xhrStatus) {
      this._returnedRange = undefined;
      super.manageFailure(isTimeout, xhrStatus);
    }

    /**
     * @override
     */
    displayError (text) {
      if (typeof text == 'undefined') {
        return; // No message to display, do not display any error
        // This is the case when no date/time range has been received yet
      }
      if (typeof this._messageSpan !== 'undefined') {
        if (this._height > 20)
          $(this._messageSpan).html(text);
      }

      // Remove the content div' SVG
      /*if (typeof this.content !== 'undefined') {
        this.content.find('.cncvaluebar-svg').remove();
      }*/
    }

    /**
     * @override
     */
    removeError () {
      if (typeof this._messageSpan !== 'undefined') {
        $(this._messageSpan).html('');
      }
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the machine id changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      $(this.element).attr('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if (newRange.upper == null) { // No empty end
        newRange.upper = Date();
      }
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._setRangeAndUpdateRefreshRate(newRange);
        this.element.removeAttribute('range'); // To avoid reset in ValidateParameters
        this.start();
      }
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event
     */
    onReload (event) {
      this.switchToContext('Reload');
    }

    // DOM events

    /**
     * DOM event callback triggered on click
     *
     * @param {Event} event - DOM event
     * @param {pulseRange:Range} range - Range
     */
    onClick (event, range) {
      console.log(`onClick: range=${range.toString(d => d.toISOString())}`);
      let applicableRange = pulseRange.intersects(this._range, range);
      pulseDetailsPopup.clickOnBar(this, this._range, applicableRange, event, 'cncvalue');
    }
  }

  pulseComponent.registerElement('x-cncvaluebar', CncValueBarComponent, ['machine-id', 'height', 'range', 'period-context', 'machine-context']);

})();
