// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-performancebar
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-performancebar> to display a performance bar component. This tag gets following attribute :
 *  machine-id : Integer
 *  height : Integer
 *  period-context : String
 *  range : String 'begin;end'
 *  motion-context
 *
 */
(function () {

  // Create a horizontal gauge
  // width: width of the gauge
  // height: height of the gauge
  // segments: array made of
  // {
  //   minPercent: min position X of the segment
  //   maxPercent: max position X of the segment
  //   color or colors: either a unique color or an array of colors to define a conical gradient (color format #XXXXXX)
  // }
  // ticks: array of values for displaying ticks (in percent), can be null
  // margin: {left: ..., right: ..., top: ..., bottom: ...}
  var gradientNumber = 0;
  function createHorizontalGauge (width, height, segments, ticks, margin) {
    if (segments == null || segments.length == 0)
      return null;

    // Create a svg with the right size
    let svg = pulseSvg.createBase(width, height, 'gauge', null, null);

    // Create a path for each segment
    for (let segmentNumber = 0; segmentNumber < segments.length; segmentNumber++) {
      let segment = segments[segmentNumber];

      // Each segment may be divided into several parts to provide a horizontal gradient
      let colors = [];
      if (segment.color != null) {
        colors.push(segment.color);
        colors.push(null);
      }
      else if (segment.colors != null) {
        for (let i = 0; i < segment.colors.length; i++)
          colors.push(segment.colors[i]);
      }

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      g.setAttribute('filter', 'url(#innerShadow)');
      svg.appendChild(g);
      let subSegmentCount = colors.length - 1;
      for (let colorNumber = 0; colorNumber < subSegmentCount; colorNumber++) {
        let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');

        // Offset
        let offsetLeft = ((segmentNumber > 0 && colorNumber == 0) ? 2 : 0);
        let offsetRight = ((segmentNumber < (segments.length - 1) && colorNumber == subSegmentCount - 1) ? 2 : -1);

        // Percent min, percent max
        let percentMin = ((subSegmentCount - colorNumber) * segment.minPercent + colorNumber * segment.maxPercent) / subSegmentCount;
        let percentMax = ((subSegmentCount - (colorNumber + 1)) * segment.minPercent + (colorNumber + 1) * segment.maxPercent) / subSegmentCount;

        // Points
        let pointAx = margin.left + percentMin * (width - margin.left - margin.right) + offsetLeft;
        let pointAy = margin.top;
        let pointCx = margin.left + percentMax * (width - margin.left - margin.right) - offsetRight;
        let pointCy = height - margin.bottom;

        // Déterminer quels coins doivent être arrondis
        let isFirstSubSegment = (segmentNumber == 0 && colorNumber == 0);
        let isLastSubSegmentOfSegment = (colorNumber == (subSegmentCount - 1));
        let isLastSegment = (segmentNumber == (segments.length - 1));
        let radius = 6;

        // Compute the path with selective rounded corners
        let d = '';
        if (isFirstSubSegment && !isLastSubSegmentOfSegment) {
          // First segment : round only the left corners
          d = 'M ' + (pointAx + radius) + ',' + pointAy;
          d += ' L ' + pointCx + ',' + pointAy;
          d += ' L ' + pointCx + ',' + pointCy;
          d += ' L ' + (pointAx + radius) + ',' + pointCy;
          d += ' Q ' + pointAx + ',' + pointCy + ' ' + pointAx + ',' + (pointCy - radius);
          d += ' L ' + pointAx + ',' + (pointAy + radius);
          d += ' Q ' + pointAx + ',' + pointAy + ' ' + (pointAx + radius) + ',' + pointAy;
        } else if (isLastSegment) {
          // Last segment : round all corners
          d = 'M ' + (pointAx + radius) + ',' + pointAy;
          d += ' L ' + (pointCx - radius) + ',' + pointAy;
          d += ' Q ' + pointCx + ',' + pointAy + ' ' + pointCx + ',' + (pointAy + radius);
          d += ' L ' + pointCx + ',' + (pointCy - radius);
          d += ' Q ' + pointCx + ',' + pointCy + ' ' + (pointCx - radius) + ',' + pointCy;
          d += ' L ' + (pointAx + radius) + ',' + pointCy;
          d += ' Q ' + pointAx + ',' + pointCy + ' ' + pointAx + ',' + (pointCy - radius);
          d += ' L ' + pointAx + ',' + (pointAy + radius);
          d += ' Q ' + pointAx + ',' + pointAy + ' ' + (pointAx + radius) + ',' + pointAy;
        } else if (isLastSubSegmentOfSegment && !isFirstSubSegment) {
          // Last sub-segment of a segment : round only the right corners
          d = 'M ' + pointAx + ',' + pointAy;
          d += ' L ' + (pointCx - radius) + ',' + pointAy;
          d += ' Q ' + pointCx + ',' + pointAy + ' ' + pointCx + ',' + (pointAy + radius);
          d += ' L ' + pointCx + ',' + (pointCy - radius);
          d += ' Q ' + pointCx + ',' + pointCy + ' ' + (pointCx - radius) + ',' + pointCy;
          d += ' L ' + pointAx + ',' + pointCy;
          d += ' z';
        } else {
          // Pas d'arrondi
          d = 'M ' + pointAx + ',' + pointAy;
          d += ' L ' + pointCx + ',' + pointAy;
          d += ' L ' + pointCx + ',' + pointCy;
          d += ' L ' + pointAx + ',' + pointCy;
          d += ' z';
        }
        path.setAttribute('d', d);

        // Apply color
        if (colors[colorNumber + 1] == null) {
          path.setAttribute('fill', colors[colorNumber]);
        }
        else {
          let gradient = document.createElementNS(pulseSvg.get_svgNS(), 'linearGradient');
          g.appendChild(gradient);
          let gradientName = 'gradientLinear-' + (gradientNumber++);
          gradient.setAttribute('id', gradientName);
          gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
          gradient.setAttribute('x1', pointAx);
          gradient.setAttribute('y1', pointAy);
          gradient.setAttribute('x2', pointCx);
          gradient.setAttribute('y2', pointAy);

          let stop1 = document.createElementNS(pulseSvg.get_svgNS(), 'stop');
          stop1.setAttribute('offset', '0%');
          stop1.setAttribute('stop-color', colors[colorNumber]);
          gradient.appendChild(stop1);

          let stop2 = document.createElementNS(pulseSvg.get_svgNS(), 'stop');
          stop2.setAttribute('offset', '100%');
          stop2.setAttribute('stop-color', colors[colorNumber + 1]);
          gradient.appendChild(stop2);

          path.setAttribute('fill', 'url(#' + gradientName + ')');
        }

        g.appendChild(path);
      }
    }

    // Add ticks
    let tickLength = 5; // in px
    if (ticks != null) {
      for (let i = 0; i < ticks.length; i++) {
        // Top
        let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
        svg.appendChild(path);
        path.setAttribute('class', 'tick');
        let d = 'M ' + (margin.left + ticks[i] * (width - margin.left - margin.right)) + ',' + (margin.top);
        d += 'L ' + (margin.left + ticks[i] * (width - margin.left - margin.right)) + ',' + (margin.top - tickLength);
        path.setAttribute('d', d);

        // Bottom
        path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
        svg.appendChild(path);
        path.setAttribute('class', 'tick');
        d = 'M ' + (margin.left + ticks[i] * (width - margin.left - margin.right)) + ',' + (height - margin.bottom);
        d += 'L ' + (margin.left + ticks[i] * (width - margin.left - margin.right)) + ',' + (height - margin.bottom + tickLength);
        path.setAttribute('d', d);
      }
    }

    return svg;
  }

  class PerformanceBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;
      //this._height = // below
      self._barwidth = 100; // Default
      self._targetpercentage = null;
      self._targetIsUpdated = false;

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    get content () { return this._content; } // Optional

    _setRange (range) {
      this._range = range;
      //this.start(); ???
    }

    _setHeight () {
      let minHeight = 5;
      let defaultHeight = 60;

      this._height = this.getConfigOrAttribute('performancebar.height', defaultHeight);
      if (!pulseUtility.isNumeric(this._height)) {
        this._height = defaultHeight;
      }
      else {
        this._height = Number(this._height);
      }
      if (this._height < minHeight) {
        this._height = minHeight;
      }
    }

    _drawEmpty () { /* To clean the bar */
      $(this._content).find('.performancebar-svg').remove(); // Remove Old SVG
    }

    _draw () {
      $(this._content).find('.performancebar-svg').remove(); // Remove Old SVG

      //  Parameters
      let cursorWidth = 8.0;
      let cursorOffsetTop = cursorWidth;
      let cursorOffsetBottom = cursorWidth;
      let tickDivision = 10;
      let width = $(this._content).width();
      if (width) {
        this._barwidth = width;
      }
      else {
        this._barwidth = 100; // Default
      }

      // Colors of the gauge
      let colors = [];
      if (this._targetIsUpdated && !pulseUtility.isNotDefined(this._targetpercentage) && this._targetpercentage > 0) {
        if (this._percent) {
          colors.push({
            minPercent: 0.0,
            maxPercent: this._targetpercentage,
            colors: ['#FF0000', '#FF9010', '#FFFF20']
          });
          colors.push({
            minPercent: this._targetpercentage,
            maxPercent: 1.0,
            color: '#009900'
          });
        }
        else {
          colors.push({
            minPercent: 0.0,
            maxPercent: this._targetpercentage,
            colors: ['#4C4C4C', '#a3a3a3', '#e6e6e6']
          });
          colors.push({
            minPercent: this._targetpercentage,
            maxPercent: 1.0,
            color: '#5a5a5a'
          });
        }
      }
      else {
        if (this._percent) {
          colors.push({
            minPercent: 0.0,
            maxPercent: 1.0,
            colors: ['#FF0000', '#FF9010', '#FFFF20', '#009900']
          });
        }
        else {
          colors.push({
            minPercent: 0.0,
            maxPercent: 1.0,
            colors: ['#4C4C4C', '#a3a3a3', '#e6e6e6', '#5a5a5a']
          });
        }
      }

      // Ticks
      let ticks = [];
      if (tickDivision == 0) {
        ticks = null;
      }
      else {
        for (let i = 0; i <= tickDivision; i++) {
          ticks.push(1.0 * i / tickDivision);
        }
      }

      // Margin
      let margin = {
        left: cursorWidth,
        right: cursorWidth,
        top: Math.max(5.0, cursorOffsetTop), // 5 is the tick length
        bottom: Math.max(5.0, cursorOffsetBottom + 2.0 * cursorWidth) + 2 // +2 for the cursor shadow
      }

      let svg = createHorizontalGauge(this._barwidth, this._height, colors, ticks, margin);
      svg.setAttribute('height', this._height);
      svg.setAttribute('viewBox', '0 0 '
        + this._barwidth + ' ' + this._height);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'performancebar-svg');
      $(this._content).prepend(svg); // Before message

      // Create the cursor
      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      svg.appendChild(g);
      g.setAttribute('filter', 'url(#outerShadow)');

      let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
      g.appendChild(path);
      path.setAttribute('class', 'cursor');

      // Compute the path
      let d = 'M ' + (-cursorWidth / 2) + ',' + (this._height - margin.bottom + cursorOffsetBottom); // Bottom left
      d += ' A ' + (cursorWidth) + ' ' + (cursorWidth) + ' 0 1 0 ' + (cursorWidth / 2) + ',' + (this._height - margin.bottom + cursorOffsetBottom); // Arc to bottom right
      d += ' L 0,' + (margin.top - cursorOffsetTop); // Top
      d += ' z'; // Close the figure
      path.setAttribute('d', d);

      // Translation
      if (this._percent) {
        path.setAttribute('transform', 'translate(' + (margin.left + this._percent * (this._barwidth - margin.left - margin.right)) + ', 0)');
      }
      else {
        path.setAttribute('transform', 'translate(' + margin.left + ', 0)');
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            // Reset Target
            this._targetIsUpdated = false;
            this._targetpercentage = null;

            this.start();
          }
          break;
        case 'motion-context': //'motionChangeEvent'
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));

            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              this.element.getAttribute('period-context'));
          }
          this.start(); // To re-validate parameters
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal,
              this.onMachineIdChange.bind(this));
          } break;
        case 'height':
          this._setHeight();
          break;
        case 'range':
          if (this.isInitialized()) {
            if (this._range == undefined) {
              let attr = newVal;
              let range = pulseRange.createDateRangeFromString(attr);
              if (!range.isEmpty()) {
                this._range = range;
                this.start();
              }
            }
          } break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-slotbar');

      // Update here some internal parameters

      // listeners
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }
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

      this._setHeight();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // HTML structure - Content
      this._content = $('<div></div>').addClass('performancebar-content');
      this._content.height(this._height);
      let div = $('<div></div>').addClass('performancebar')
        .append(this._content);

      // HTML structure - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
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

    _setRangeFromAttribute () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // RANGE
      this._setRangeFromAttribute();

      // Check the range is valid
      if (this._range == undefined) {
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
      /*
    if (((new Date(self._rangeBegin)).getTime() - new Date().getTime()) < 3600 * 1000) { // less than 1h display => refresh more often
      return self._updateDelay / 5 * 1000;
    }else*/

      return 1000 * 60 * Number(this.getConfigOrAttribute('refreshingRate.barSlowUpdateMinutes', 5));
    }

    _perfSuccess (data) {
      this._targetpercentage = data.TargetPercentage;
      this._targetIsUpdated = true;
      this._draw();
    }
    _perfError (errorMessage) {
    }
    _perfFailed (url, isTimeout, xhrStatus) {
    }

    getShortUrl () {
      // Target URL
      if (!this._targetIsUpdated) {
        let urlTarget = this.getConfigOrAttribute('path', '') + 'UtilizationTarget/Get?MachineId=' + this.element.getAttribute('machine-id');

        pulseService.runAjaxSimple(urlTarget,
          this._perfSuccess.bind(this),
          this._perfError.bind(this),
          this._perfFailed.bind(this));
      }

      // Utilization/Get/{MachineId}/{DayRange}
      let url = 'Utilization/Get?MachineId='
        + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
      return url;
    }

    refresh (data) {
      let context = this.element.getAttribute('motion-context');
      if (this.element.hasAttribute('machine-id')) {
        context += '_' + this.element.getAttribute('machine-id');
      }

      // INIT this._percent
      if ((typeof data.MotionDuration != 'undefined') &&
        (typeof data.NotRunningDuration != 'undefined')) { // send message
        if ((data.MotionDuration + data.NotRunningDuration) > 0.0) {
          this._percent = data.MotionDuration / (data.MotionDuration + data.NotRunningDuration);
          eventBus.EventBus.dispatchToContext('motionChangeEvent', context,
            {
              MotionSeconds: data.MotionDuration,
              MotionPercent: this._percent
            });
        }
        else {
          eventBus.EventBus.dispatchToContext('motionChangeEvent', context,
            {
              MotionSeconds: data.MotionDuration
            });
        }
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
        this._range = newRange;
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-performancebar', PerformanceBarComponent, ['machine-id', 'motion-context', 'period-context', 'machine-context', 'height', 'range']);
})();
