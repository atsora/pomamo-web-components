// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-operationcyclebar
 * @requires module:pulsecomponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:pulseDetailsPopup
 */

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseComponent = require('pulsecomponent');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-operationcyclebar> to display an operationcyclebar bar component. This tag gets following attribute : 
 *  machine-id : Integer
 *  height : Integer
 *  period-context : String
 *  range : String 'begin;end' (optional)
 *  click : action on click (none/details/popup/change)
 *  showdetails: details to display after click - default in config
 *  showpopup: details to display in popup after click - default in config
 */
(function () {

  /**
   * Operation slot bar component
   *
   * @extends module:pulseComponent~PulseParamAutoPathRefreshingComponent
   */
  class OperationCycleBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Global configurations
      // - On going refresh rate
      self._refreshRate = 60; // Default

      // Parameters
      self._barwidth = 100; // default

      self._range = undefined;

      self._height = undefined;

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
    get minHeight () { return 5; }

    /**
     * Default height in pixels: 20px
     *
     * @return {number} Default height in pixels
     */
    get defaultHeight () { return 20; }

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
          if (undefined != oldVal) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
          }
          eventBus.EventBus.addEventListener(this,
            'dateTimeRangeChangeEvent', newVal,
            this.onDateTimeRangeChange.bind(this));
        }
        this.start();
      }
      if (('machine-context' == attr) && this.isInitialized()) {
        if (this.isInitialized()) {
          if (undefined != oldVal) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          }
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal', newVal,
            this.onMachineIdChange.bind(this));
          // No need to add this.start() because it will be restarted when the machineid will be updated
        }
      }
    }


    /**
     * @override
     */
    getShortUrl () {
      let url = 'OperationCycleSlots?MachineId=' + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
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

      this._setRangeFromAttribute();
      this._setAutoHeight();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // create DOM
      // HTML structure - Content
      this._content = $('<div></div>').addClass('operationcyclebar-content pulse-bar-content');
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
        .addClass('operationcyclebar')
        .append(this._content);
      //$(window).resize(() => this.draw());

      // Dispatchers
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this), this);
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }
      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.cleanContent(); // clean svg
      $(this.element).empty();

      this._messageSpan = undefined;
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
        console.log('waiting attribute machine-id in OperationcycleBarComponent.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in OperationCycleBarComponent.element');
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }

      this._setRangeFromAttribute();

      // Check the range is valid
      if (this._range == undefined) {
        console.log('waiting attribute range in OperationCycleBarComponent.element');
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

      // All the parameters are ok, switch to the next context
      this.switchToNextContext();
    }
    
    manageNotApplicable () {
      //$(this.element)...hide();
      super.manageNotApplicable(); // To hide
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
          console.warn(`x-operationcyclebar:refresh - no begin or end in range - get range=${data.Range} from data`);
          range = pulseRange.createDateRangeFromString(data.Range);
        }
        else {
          console.error('x-operationcyclebar:refresh - no range');
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

        slot.display = block.Display;
        slot.bgColor = block.BgColor;
        slot.fgColor = block.FgColor;

        this._data.push(slot);
      }
      this.draw();
    }

    cleanContent () {
      if (typeof this.content === 'undefined') {
        return;
      }
      $(this.element).find('.operationcyclebar-svg').remove(); // Remove Old SVG
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
      svg.setAttribute('class', 'operationcyclebar-svg');
      let contents = this.element.getElementsByClassName('pulse-bar-content');
      if (contents.length > 0) {
        contents[0].prepend(svg); // Before message
      }
      if (this._data) {
        for (let i = 0; i < this._data.length; i++) {
          let range = this._data[i].range;
          let x = this.barwidth * this._data[i].beginPercent;
          let width = this.barwidth * this._data[i].widthPercent;

          // CREATE GROUP (to display rect AND text)
          let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
          g.setAttribute('width', width);
          g.setAttribute('height', this._height);
          g.setAttribute('range', range.toString(d => d.toISOString()));
          g.onclick = evt => this.onClick(evt, range);

          // CREATE SVG
          let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
          rect.setAttribute('x', x);
          rect.setAttribute('y', 0);
          rect.setAttribute('width', width);
          rect.setAttribute('height', this._height);
          rect.setAttribute('fill', this._data[i].bgColor);
          /*rect.setAttribute('range', range.toString(d => d.toISOString()));
          rect.onclick = evt => this.onClick(evt, range);*/
          g.appendChild(rect);

          // Add Text
          let textToDisplay = this._data[i].display;

          let display = document.createElementNS(pulseSvg.get_svgNS(), 'text');
          display.setAttribute('x', x + width / 2);
          display.setAttribute('y', 0 + this._height * 0.58); //* 0.66=OK for all browsers excepted Safari / 0.5 = best value for Safari
          display.setAttribute('fill', this._data[i].fgColor);
          display.setAttribute('text-anchor', 'middle');
          display.setAttribute('alignment-baseline', 'central');
          display.setAttribute('font-size', this._height / 2);
          display.setAttribute('font-weight', 'bold');
          //display.setAttribute('preserveAspectRatio','xMidYMid meet');
          //display.innerHTML = textToDisplay; // Mozilla&Chrome = OK - IE11=KO
          display.textContent = textToDisplay;

          g.appendChild(display);
          svg.appendChild(g);

          // Resize displayed text
          let textLength = display.getComputedTextLength();
          if (textLength > width) {
            //display.setAttribute('textLength', width); // Etend le texte sur toute la largeur
            //display.setAttribute('lengthAdjust','spacing');

            if (width < 25 || textToDisplay.length < 6) {
              textToDisplay = '';
              display.textContent = textToDisplay;
            }
            // Add "..."
            while (textLength > width && textToDisplay.length > 6) {
              textToDisplay = textToDisplay.slice(0, textToDisplay.length - 2);
              if (textToDisplay.length < 6) {
                textToDisplay = '';
                //display.innerHTML = textToDisplay;
                display.textContent = textToDisplay;
              }
              else {
                textToDisplay = textToDisplay.slice(0, textToDisplay.length - 3);
                //display.innerHTML = textToDisplay + '...';
                display.textContent = textToDisplay + '...';
              }
              textLength = display.getComputedTextLength();
            }
          }
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
        this.content.find('.operationcyclebar-svg').remove();
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
      pulseDetailsPopup.clickOnBar(this, this._range, applicableRange, event, 'operation');
    }
  }

  pulseComponent.registerElement('x-operationcyclebar', OperationCycleBarComponent,
    ['machine-id', 'height', 'range', 'period-context', 'machine-context']);
})();
