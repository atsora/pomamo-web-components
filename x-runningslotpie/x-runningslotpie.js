// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-runningslotpie
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
 * Build a custom tag <x-runningslotpie> to display an runningslot pie component. This tag gets following attribute : 
 *  machine-id : Integer
 *  height : Integer
 *  machine-context : String
 *  motion-context : String
 *  period-context : String
 *  textchange-context : String -> elapsed time since yellow for example - special value == 'showPercent', 'DEMO'
 *  range : String 'begin;end'
 */
(function () {

  class RunningSlotPieComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    get content () { return this._content; } // Optional

    //---------------------------------------------------
    // TODO : verif TYPE --------------------------------
    //---------------------------------------------------
    _setRange (range) {
      this._range = range;
      this.start();
    }

    _setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }
    _drawEmpty () { /* To clean the bar */
      $(this._content).find('.runningslotpie-svg').remove(); // Remove Old SVG
    }

    _draw () {
      if ((this._content == undefined) || (this._content == null)) {
        return;
      }
      $(this._content).find('.runningslotpie-svg').remove(); // Remove Old SVG

      //  Used sizes
      let circleRadius = 160;
      let xyPosition = 190; // Center != Rayon ext -> + margin
      let ringWidth = 60;
      let middleRadius = circleRadius - ringWidth / 2;

      // Display pie
      // Main container

      // CREATE SVG
      this._height = 100; // For compatibility (and shadow)
      let svg = pulseSvg.createBase(this._height, this._height,
        'runningslotpie-svg', 2 * xyPosition, 2 * xyPosition);
      $(this._content).prepend(svg); // Before message
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
        null, ringWidth);
      g.appendChild(circleBk);

      // Highlight Begin of the period (useful if an empty period at the beginning)
      //let timeMarkerFormat = "hh:mm A";
      //let timeLabel = pulseUtility.getTimeLabelFrom1IsoDateTime(self._rangeBegin, timeMarkerFormat);

      if (this._runningslots) {
        for (let i = 0; i < this._runningslots.length; i++) {
          let isRunningClass = 'donut-segment'; // Default = never used
          if (this._runningslots[i].running) {
            isRunningClass = 'donut-segment-running';
          }
          else if (this._runningslots[i].notRunning) {
            isRunningClass = 'donut-segment-idle';
          }
          else {
            continue;
          }

          // CREATE SVG segment
          let circleProgress = pulseSvg.createSegmentOnDonut(
            xyPosition, xyPosition, circleRadius,
            'transparent', isRunningClass,
            null, ringWidth, this._runningslots[i].beginPercent,
            this._runningslots[i].widthPercent);
          if (circleProgress != null) {
            g.appendChild(circleProgress);
          }
        } // end for
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
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

            if (!this.element.hasAttribute('range')) {
              eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
                newVal);
            }
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
              'textChangeEvent', textchangecontext,
              this.onTextChangeEvent.bind(this));
          } break;
        case 'range':
          this._setRangeFromAttribute();
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this._setRangeFromAttribute();

      this.addClass('pulse-piegauge');

      // Update here some internal parameters

      // listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
        /* INUTILE :
            if ( !this.element.hasAttribute("range") ) {
              //eventBus.EventBus.dispatchToContext("askForDateTimeRangeEvent", ...);
            }*/
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

      // Height -> removed

      // In case of clone, need to be empty :
      $(this.element).empty();


      // Create DOM - Content
      this._content = $('<div></div>').addClass('runningslotpie-content');
      let div = $('<div></div>').addClass('runningslotpie')
        .append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', ' Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      $(this.element).append(div);

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
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      // RANGE
      this._setRangeFromAttribute();

      // Check the range is valid
      if (this._range == undefined) {
        console.log('waiting attribute range in runningslotComponent.element');
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

    displayError (message) {
      $(this._messageSpan).html(message);
      //this._drawEmpty();
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      let now = moment();
      if (now.isAfter(moment(this._range.upper))) {
        // Only display old data - refresh each *** is enough
        let updatePastSeconds = 60 * Number(this.getConfigOrAttribute('refreshingRate.barPastChangingDataRefreshMinutes', 5));
        return 1000 * updatePastSeconds;
      }
      else {
        let updateSecondsMinimum = Number(this.getConfigOrAttribute('refreshingRate.barMinimumRefreshSeconds', 10));
        let updateSecondsFor1DayDisplay = Number(this.getConfigOrAttribute('refreshingRate.barDailyRefreshSeconds', 60)); // 1 minute ~= each time there is a new pixel

        let durationInHours = parseInt((this._range.upper - this._range.lower) / 1000) / 3600.0;
        let refreshRate = durationInHours * updateSecondsFor1DayDisplay / 24.0 * 1000;
        if (refreshRate < updateSecondsMinimum * 1000) {
          refreshRate = updateSecondsMinimum * 1000;
        }
        return refreshRate;
      }
    }

    getShortUrl () {
      let url = 'RunningSlots?MachineId='
        + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
      return url;
    }

    refresh (data) {
      let barbegin = this._range.lower;
      let barend = this._range.upper;

      if (isNaN(barbegin.getTime()) || isNaN(barend.getTime())) {
        console.warn('x-reasonslotpie:refresh - NO begin OR end');
        if (data.Range != '') {
          this._range = pulseUtility.createDateRangeFromString(data.Range);

          barbegin = new Date(this._range.lower);
          barend = new Date(this._range.upper);
        }
        else {
          console.error('x-runningslotpie:refresh - NO POSSIBLE begin OR end');
          return;
        }
      }

      this._runningslots = new Array();
      for (let i = 0; i < data.Blocks.length; i++) {
        let block = data.Blocks[i];

        let blockdateRange = pulseRange.createDateRangeFromString(block.Range);

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

        let runningSlot = new Object();
        runningSlot.beginPercent = (Math.max(barbegin, iBegin) - barbegin) / (barend - barbegin);
        runningSlot.widthPercent = (Math.min(barend, iEnd) - Math.max(barbegin, iBegin)) / (barend - barbegin);

        runningSlot.running = block.Running;
        runningSlot.notRunning = block.NotRunning;
        runningSlot.details = block.Details;
        //runningSlot.durationInSec = (iEnd.valueOf() - iBegin.valueOf()) / 1000;
        /*runningSlot.durationInSec = 0;
        for(let iDet = 0; iDet < block.Details.length; iDet++) {
          runningSlot.durationInSec += block.Details[iDet].Duration;
        }*/

        runningSlot.isobegin = pulseUtility.convertMomentToDateTimeString(moment(iBegin)); // blockRange.isobegin;
        runningSlot.isoend = pulseUtility.convertMomentToDateTimeString(moment(iEnd)); // blockRange.isoend;

        this._runningslots[i] = runningSlot;
      }
      $(this._content).show();

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
      this._textToDisplay = event.target.elapsedTime;

      let bottomTextToDisplay = '';
      if (this._textToDisplay) {
        bottomTextToDisplay = this._textToDisplay;
      }
      // DISPLAY Time
      $(this.element).find('.time-in-pie').text(bottomTextToDisplay);
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
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._setRange(newRange);
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-runningslotpie', RunningSlotPieComponent, ['machine-id', 'motion-context', 'period-context', 'machine-context', 'textchange-context', 'range']);
})();
