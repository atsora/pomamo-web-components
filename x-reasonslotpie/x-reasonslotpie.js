// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reasonslotpie
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-reasonslotpie> to display an runningslot pie component. This tag gets following attribute : 
 *  machine-id : Integer
 *  height : Integer - removed
 *  motion-context : String
 *  period-context : String
 *  textchange-context : String -> elapsed time since yellow for example - special value == 'showPercent', 'DEMO'
 *  range : String 'begin;end'
 */
(function () {
  // Height AND width -> removed
  //var minHeight = 100;
  //var defaultHeight = 200;

  class ReasonSlotPieComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._dateRange = undefined;

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    //get content () { return this._content; } // Optional

    _setRange (range) {
      this._dateRange = range;
      this.start();
    }

    _drawEmpty () { /* To clean the bar */
      $(this._content).find('.reasonslotpie-svg').remove(); // Remove Old SVG
    }

    _draw () {
      $(this._content).find('.reasonslotpie-svg').remove(); // Remove Old SVG

      // Define pie main color -> this._statusColor

      //  Used sizes
      let circleRadius = 160;
      let xyPosition = 190; // Center != Rayon ext -> + margin
      let ringWidth = 60;
      let middleRadius = circleRadius - ringWidth / 2;

      // Display pie
      // Main container

      // CREATE SVG
      this._height = 150; // for compatibility -> to remove
      let svg = pulseSvg.createBase(this._height, this._height,
        'reasonslotpie-svg', 2 * xyPosition, 2 * xyPosition);
      $(this._pie).prepend(svg); // Before message
      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      svg.appendChild(g);

      // PIE - rotate
      $(g).css('transform-origin', 'center');
      $(g).css('transform', 'rotate(-90deg)');

      // Circle in the middle (to allow writing something)
      let circleMiddle = pulseSvg.createCircle(xyPosition, xyPosition,
        middleRadius, 'transparent', 'donut-hole');
      g.appendChild(circleMiddle);

      if (this.element.hasAttribute('textchange-context')) {
        let bottomTextToDisplay = '';
        if ('DEMO' == this.element.getAttribute('textchange-context')) {
          bottomTextToDisplay = 'CH eck';
        }
        else {
          if ('showPercent' == this.element.getAttribute('textchange-context')) {
            bottomTextToDisplay = '';
            if (this._motionpercentage != null)
              bottomTextToDisplay = this._motionpercentage.toFixed(0) + '%';
          }
          else {
            if (this._textToDisplay) {
              bottomTextToDisplay = this._textToDisplay;
            }
          }
        }
        // DISPLAY Time + position
        let middleAvailableWidth = Math.sqrt(2 * middleRadius * middleRadius);
        let bottomTextWidth = middleAvailableWidth;
        let bottomTextHeight = middleAvailableWidth / 3;
        let bottomTextBottom = xyPosition + middleAvailableWidth / 4 * 1.15;
        if (this.element.hasAttribute('textchange-context')
          && ('showPercent' == this.element.getAttribute('textchange-context'))) {
          bottomTextBottom = xyPosition + bottomTextHeight / 2; // ->  Vertical center
        }
        let bottomTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');

        let rectBottom = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
        rectBottom.setAttribute('x', xyPosition - bottomTextWidth / 2);
        rectBottom.setAttribute('y', bottomTextBottom - bottomTextHeight);
        rectBottom.setAttribute('width', bottomTextWidth);
        rectBottom.setAttribute('height', bottomTextHeight);
        rectBottom.setAttribute('fill', 'transparent');
        bottomTextGroup.appendChild(rectBottom);

        // Text bottom
        let displayBottom = document.createElementNS(pulseSvg.get_svgNS(), 'text');
        displayBottom.setAttribute('x', '50%');
        displayBottom.setAttribute('y', bottomTextBottom);
        displayBottom.setAttribute('text-anchor', 'middle');
        displayBottom.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
        displayBottom.setAttribute('font-weight', 'bold');
        displayBottom.setAttribute('font-size', bottomTextHeight);
        displayBottom.setAttribute('class', 'time-in-pie');
        displayBottom.textContent = bottomTextToDisplay;
        bottomTextGroup.appendChild(displayBottom);

        // Append
        svg.appendChild(bottomTextGroup);
      }

      // circle = background
      let circleBk = pulseSvg.createCircle(xyPosition, xyPosition,
        circleRadius, 'transparent', 'donut-ring-background',
        null,
        ringWidth);
      g.appendChild(circleBk);

      if (this._reasonslots) {
        for (let i = 0; i < this._reasonslots.length; i++) {
          if ((!this._reasonslots[i].Details) || (this._reasonslots[i].Details.length == 1)) { // Always here
            //let color = '#000000'; // Default = never used
            let color = this._reasonslots[i].mainColor;
            // CREATE SVG
            let circleProgress = pulseSvg.createSegmentOnDonut(xyPosition, xyPosition,
              circleRadius,
              'transparent', 'donut-segment',
              color, ringWidth, this._reasonslots[i].beginPercent,
              this._reasonslots[i].widthPercent);
            if (circleProgress != null) {
              g.appendChild(circleProgress);
            }
          }
          else { // Many colors in the same width -> NEVER
            console.warn('x-reasonslotpie:refresh - SPLIT not done');
          }
        } // end for
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'group': // Not fully defined yet
          if (this.isInitialized()) {

            // Check 'textchange-context'
            if (this.element.hasAttribute('textchange-context')) {
              let textchangecontext = pulseUtility.getTextChangeContext(this);
              eventBus.EventBus.removeEventListenerBySignal(this, 'textChangeEvent');
              eventBus.EventBus.addEventListener(this,
                'textChangeEvent',
                textchangecontext,
                this.onTextChangeEvent.bind(this));
            }

            this.start();
          } break;
        case 'motion-context':
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));

            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              newVal);
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
        case 'textchange-context':
          if (this.isInitialized()) {
            let textchangecontext = pulseUtility.getTextChangeContext(this);
            eventBus.EventBus.removeEventListenerBySignal(this, 'textChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'textChangeEvent',
              textchangecontext,
              this.onTextChangeEvent.bind(this));
          } break;
        case 'range':
          this._setRangeFromAttribute();
          this.start();
          break;
        /*if (name == 'height') {
            _setHeight(this);
            //this.load(); NOT NEEDED
          }*/
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-piegauge');

      // Update here some internal parameters

      // listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
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
      if (this.element.hasAttribute('textchange-context')) {
        let textchangecontext = pulseUtility.getTextChangeContext(this);
        eventBus.EventBus.addEventListener(this,
          'textChangeEvent',
          textchangecontext,
          this.onTextChangeEvent.bind(this));
      }

      //this._setHeight();

      // In case of clone, need to be empty :
      $(this.element).empty();


      // Create DOM - Content
      this._pie = $('<div></div>').addClass('reasonslotpie-pie');
      this._content = $('<div></div>').addClass('reasonslotpie-content').append(this._pie);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._pie).append(messageDiv);

      $(this.element).append(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._pie = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    _setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._dateRange = range;
        }
      }
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (pulseUtility.isNotDefined(this.element.hasAttribute('group'))) {
        // machine-id
        if (!this.element.hasAttribute('machine-id')) {
          console.error('missing attribute machine-id in ReasonSlotPie.element');
          this.setError('missing machine-id'); // delayed error message
          return;
        }
        if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
          //'Machine Id has incorrect value', 'BAD_ID');
          // Immediat display :
          this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
          return;
        }
      }

      // RANGE
      this._setRangeFromAttribute();

      // Check the range is valid
      if (this._dateRange == undefined) {
        console.log('waiting attribute range in XXXComponent.element');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        // Delayed display :
        this.setError('missing range');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }

      if (this._dateRange.isEmpty()) {
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

    displayError (message) {
      $(this._messageSpan).html(message);

      //this._drawEmpty();
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      let now = moment();
      if (now.isAfter(moment(this._dateRange.upper))) {
        // Only display old data - refresh each *** is enough
        let updatePastSeconds = 60 * Number(this.getConfigOrAttribute('refreshingRate.barPastChangingDataRefreshMinutes', 5));
        return 1000 * updatePastSeconds;
      }
      else {
        let updateSecondsMinimum = Number(this.getConfigOrAttribute('refreshingRate.barMinimumRefreshSeconds', 10));
        let updateSecondsFor1DayDisplay = Number(this.getConfigOrAttribute('refreshingRate.barDailyRefreshSeconds', 60)); // 1 minute ~= each time there is a new pixel

        let durationInHours = parseInt((this._dateRange.upper - this._dateRange.lower) / 1000) / 3600.0;
        let refreshRate = durationInHours * updateSecondsFor1DayDisplay / 24.0 * 1000;
        if (refreshRate < updateSecondsMinimum * 1000) {
          refreshRate = updateSecondsMinimum * 1000;
        }
        return refreshRate;
      }
    }

    getShortUrl () {
      let url = 'ReasonColorSlots?MachineId=';
      if (this.element.hasAttribute('machine-id')) {
        if (pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
          url += this.element.getAttribute('machine-id');
        }
      }
      else if (this.element.hasAttribute('group')) {
        url += this.element.getAttribute('group');
      }

      url += '&Range='
        + pulseUtility.convertDateRangeForWebService(this._dateRange);
      /*if ( this._forceReload ){
          url += '&Cache=No';
          this._forceReload = false;
        }*/
      //Option to cancel the horizontal split in reason bar NOT available here
      url += '&SkipDetails=true';
      return url;
    }

    refresh (data) {
      let barbegin = this._dateRange.lower;
      let barend = this._dateRange.upper;

      if (isNaN(barbegin.getTime()) || isNaN(barend.getTime())) {
        console.warn('x-reasonslotpie:refresh - NO begin OR end');
        if (data.Range != '') {
          this._dateRange = pulseUtility.createDateRangeFromString(data.Range);
          barbegin = new Date(this._dateRange.lower);
          barend = new Date(this._dateRange.upper);
        }
        else {
          console.error('x-reasonslotpie:refresh - NO POSSIBLE begin OR end');
          return;
        }
      }

      this._reasonslots = new Array();
      for (let i = 0; i < data.Blocks.length; i++) {
        let blockdateRange = pulseRange.createDateRangeFromString(data.Blocks[i].Range);

        let iBegin = (blockdateRange.lower == null) ? barbegin : new Date(blockdateRange.lower); // Manage -oo
        if (isNaN(iBegin.getTime()) ||
          (iBegin < barbegin)) {
          iBegin = barbegin; // Manage start before begin of bar
        }
        let iEnd = (blockdateRange.upper == null) ? new Date() : new Date(blockdateRange.upper); // Manage +oo == NOW
        if (isNaN(iEnd.getTime()) ||
          (iEnd > barend)) {
          iEnd = barend; // Manage end after end of bar
        }

        let reasonSlot = new Object();
        reasonSlot.beginPercent = (Math.max(barbegin, iBegin) - barbegin) / (barend - barbegin);
        reasonSlot.widthPercent = (Math.min(barend, iEnd) - Math.max(barbegin, iBegin)) / (barend - barbegin);
        reasonSlot.durationInSec = (iEnd.valueOf() - iBegin.valueOf()) / 1000;
        //reasonSlot.List = data.Blocks[i].ReasonSlotsList;
        reasonSlot.Details = data.Blocks[i].Details;

        // To use if Details is not defined
        reasonSlot.mainColor = data.Blocks[i].Color;
        reasonSlot.overwriteRequired = data.Blocks[i].OverwriteRequired;

        reasonSlot.range = blockdateRange;
        this._reasonslots[i] = reasonSlot;
      }

      let context = this.element.getAttribute('motion-context');
      if (this.element.hasAttribute('machine-id')) {
        context += '_' + this.element.getAttribute('machine-id');
      }
      if ((typeof data.MotionDuration != 'undefined') &&
        (typeof data.NotRunningDuration != 'undefined')) { // send message
        if ((data.MotionDuration + data.NotRunningDuration) > 0.0) {
          let percent = data.MotionDuration / (data.MotionDuration + data.NotRunningDuration);
          eventBus.EventBus.dispatchToContext('motionChangeEvent', context,
            {
              MotionSeconds: data.MotionDuration,
              MotionPercent: percent
            });
          this._motionpercentage = Number(percent * 100);
        }
        else {
          eventBus.EventBus.dispatchToContext('motionChangeEvent', context,
            {
              MotionSeconds: data.MotionDuration
            });
          this._motionpercentage = null;
        }
      }
      else {
        this._motionpercentage = null;
      }

      this._draw();
    }

    /**
     * @override
     */
    manageError (data) {
      // Reset %
      let context = this.element.getAttribute('motion-context');
      if (this.element.hasAttribute('machine-id')) {
        context += '_' + this.element.getAttribute('machine-id');
      }
      eventBus.EventBus.dispatchToContext('motionChangeEvent', context, {});
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure (isTimeout, xhrStatus) {
      if (!isTimeout) {
        // Reset %
        let context = this.element.getAttribute('motion-context');
        if (this.element.hasAttribute('machine-id')) {
          context += '_' + this.element.getAttribute('machine-id');
        }
        eventBus.EventBus.dispatchToContext('motionChangeEvent', context, {});
      }
      super.manageFailure(isTimeout, xhrStatus);
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onTextChangeEvent (event) {
      this._textToDisplay = event.target.text;
      // DISPLAY Time
      $(this._content).find('.time-in-pie').text(this._textToDisplay);
    }

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if ((this._dateRange == undefined) ||
        (!pulseRange.equals(newRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._setRange(newRange);
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-reasonslotpie', ReasonSlotPieComponent, ['machine-id', 'group', 'motion-context', 'period-context', 'machine-context', 'textchange-context', 'range']);
})();
