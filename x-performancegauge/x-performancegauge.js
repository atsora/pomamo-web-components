// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-performancegauge
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
 * Build a custom tag <x-performancegauge> to display a performance bar component. This tag gets following attribute : 
 *  machine-id : Integer
 *  radius : Integer
 *  period-context : String
 *  range : String 'begin;end'
 *  motion-context
 * 
 */
(function () {

  // Create a circular gauge
  // littleRadius: is the internal radius of the gauge (in px)
  // bigRadius: is the external radius of the gauge (in px)
  // segments: array made of
  // {
  //   minAngle: minimum angle around the center, in radian
  //   maxAngle: maximum angle around the center, in radian
  //   color or colors: either a unique color or an array of colors to define a conical gradient (color format #XXXXXX)
  // }
  // ticks: array of values for displaying ticks (in radian), can be null
  var gradientNumber = 0;
  function createCircularGauge (littleRadius, bigRadius, segments, ticks) {
    if (segments == null || segments.length == 0)
      return null;

    // Define limits and center
    let minX = -1, maxX = 1, minY = 0, maxY = 1;
    for (let i = 0; i < segments.length; i++) {
      minY = Math.min(minY, Math.sin(segments[i].minAngle), Math.sin(segments[i].maxAngle));
    }
    let centerX = bigRadius;
    let centerY = bigRadius;

    // Create a svg with the right size
    let svg = pulseSvg.createBase(bigRadius * (maxX - minX), bigRadius * (maxY - minY), 'gauge', null, null);

    // Compute the angles resulting in an arc of 3px (external and internal radius)
    let externalOffset = 2.0 / bigRadius;
    let internalOffset = 2.0 / littleRadius;

    // Create a path for each segment
    for (let segmentNumber = 0; segmentNumber < segments.length; segmentNumber++) {
      let segment = segments[segmentNumber];

      // Each segment may be divided into several parts to provide a circular gradient
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
        let offsetE1 = ((segmentNumber > 0 && colorNumber == 0) ? externalOffset : 0);
        let offsetE2 = ((segmentNumber < (segments.length - 1) && colorNumber == subSegmentCount - 1) ? externalOffset : -0.01);
        let offsetI1 = ((segmentNumber > 0 && colorNumber == 0) ? internalOffset : 0);
        let offsetI2 = ((segmentNumber < (segments.length - 1) && colorNumber == subSegmentCount - 1) ? internalOffset : -0.01);

        // Angle min, angle max
        let angleMin = ((subSegmentCount - colorNumber) * segment.minAngle + colorNumber * segment.maxAngle) / subSegmentCount;
        let angleMax = ((subSegmentCount - (colorNumber + 1)) * segment.minAngle + (colorNumber + 1) * segment.maxAngle) / subSegmentCount;

        // Points
        let pointAx = centerX + bigRadius * Math.cos(angleMin - offsetE1);
        let pointAy = centerY - bigRadius * Math.sin(angleMin - offsetE1);
        let pointBx = centerX + bigRadius * Math.cos(angleMax + offsetE2);
        let pointBy = centerY - bigRadius * Math.sin(angleMax + offsetE2);
        let pointCx = centerX + littleRadius * Math.cos(angleMax + offsetI2);
        let pointCy = centerY - littleRadius * Math.sin(angleMax + offsetI2);
        let pointDx = centerX + littleRadius * Math.cos(angleMin - offsetI1);
        let pointDy = centerY - littleRadius * Math.sin(angleMin - offsetI1);

        // Compute the path
        let d = 'M ' + pointAx + ',' + pointAy; // Initial position
        d += ' A ' + bigRadius + ' ' + bigRadius + ' 0 0 1 ' + pointBx + ',' + pointBy; // First arc
        d += ' L ' + pointCx + ',' + pointCy; // First segment
        d += ' A ' + littleRadius + ' ' + littleRadius + ' 0 0 0 ' + pointDx + ',' + pointDy; // Second arc
        d += ' z'; // Close the figure
        path.setAttribute('d', d);

        // Apply color
        if (colors[colorNumber + 1] == null) {
          path.setAttribute('fill', colors[colorNumber]);
        }
        else {
          let gradient = document.createElementNS(pulseSvg.get_svgNS(), 'linearGradient');
          g.appendChild(gradient);
          let gradientName = 'gradientConical-' + (gradientNumber++);
          gradient.setAttribute('id', gradientName);
          gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
          gradient.setAttribute('x1', pointDx);
          gradient.setAttribute('y1', pointDy);
          gradient.setAttribute('x2', pointCx);
          gradient.setAttribute('y2', pointCy);

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
        let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
        svg.appendChild(path);
        path.setAttribute('class', 'tick');

        let d = 'M ' + (bigRadius + littleRadius * Math.cos(ticks[i])) + ',' + ((bigRadius - littleRadius * Math.sin(ticks[i])));
        d += 'L ' + (bigRadius + (littleRadius - tickLength) * Math.cos(ticks[i])) + ',' + ((bigRadius - (littleRadius - tickLength) * Math.sin(ticks[i])));
        path.setAttribute('d', d);
      }
    }

    return svg;
  }

  class PerformanceGaugeComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default
      self._range = undefined;
      self._targetpercentage = null;
      self._targetIsUpdated = false;

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
      //this.start(); ???
    }

    _drawEmpty () { // To clean the bar
      $(this._content).find('.performancegauge-svg').remove(); // Remove Old SVG
    }

    _draw () {
      $(this._content).find('.performancegauge-svg').remove(); // Remove Old SVG

      this._radius = 30; // For Compatibility and shadow
      //  Used sizes
      let externalRadius = Math.max(200, this._radius) * 0.6;
      let internalRadius = externalRadius - 30;
      let minRad = 3.76519; // left
      let maxRad = -0.623599; // right
      let tickDivision = 10;

      // CREATE SVG

      // Colors of the gauge
      let colors = [];
      if (this._targetIsUpdated
        && !pulseUtility.isNotDefined(this._targetpercentage)
        && this._targetpercentage > 0) {
        let posRad = minRad - this._targetpercentage * (minRad - maxRad);
        if (this._percent) {
          colors.push({
            minAngle: minRad,
            maxAngle: posRad,
            colors: ['#FF0000', '#FF9010', '#FFFF20']
          });
          colors.push({
            minAngle: posRad,
            maxAngle: maxRad,
            color: '#009900'
          });
        }
        else {
          colors.push({
            minAngle: minRad,
            maxAngle: posRad,
            colors: ['#4C4C4C', '#a3a3a3', '#e6e6e6']
          });
          colors.push({
            minAngle: posRad,
            maxAngle: maxRad,
            color: '#5a5a5a'
          });
        }
      }
      else {
        if (this._percent) {
          colors.push({
            minAngle: minRad,
            maxAngle: maxRad,
            colors: ['#FF0000', '#FF9010', '#FFFF20', '#009900']
          });
        }
        else {
          colors.push({
            minAngle: minRad,
            maxAngle: maxRad,
            colors: ['#A5A4C4C4C5A5', '#a3a3a3', '#e6e6e6', '#5a5a5a']
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
          ticks.push(minRad - i * (minRad - maxRad) / tickDivision);
        }
      }

      let svg = createCircularGauge(internalRadius, externalRadius, colors, ticks);

      svg.setAttribute('class', 'performancegauge-svg');
      let minX = -1, maxX = 1, minY = 0, maxY = 1;
      for (let i = 0; i < colors.length; i++) {
        minY = Math.min(minY, Math.sin(colors[i].minAngle), Math.sin(colors[i].maxAngle));
      }
      svg.setAttribute('viewBox', '0 0 ' + (externalRadius * (maxX - minX)) + ' ' + (externalRadius * (maxY - minY)));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      $(this._content).prepend(svg); // Before message

      // Create the needle
      let centerRadius = externalRadius / 8;
      let centerAngle = 0.4;

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      svg.appendChild(g);
      g.setAttribute('filter', 'url(#outerShadow)');

      let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
      g.appendChild(path);

      // Compute the path
      let d = 'M ' + (externalRadius + centerRadius * Math.cos(centerAngle)) + ',' + (externalRadius + centerRadius * Math.sin(centerAngle)); // Initial position
      d += ' A ' + centerRadius + ' ' + centerRadius + ' 0 1 1 ' + (externalRadius + centerRadius * Math.cos(centerAngle)) + ',' + (externalRadius - centerRadius * Math.sin(centerAngle));
      d += ' L ' + (externalRadius + (externalRadius + internalRadius) / 2) + ',' + externalRadius;
      d += ' z'; // Close the figure
      path.setAttribute('d', d);

      // Rotation & color
      if (this._percent) {
        path.setAttribute('transform', 'rotate(' + ((minRad - (minRad - maxRad) * this._percent) * -360 / 6.28318530718) + ', ' + externalRadius + ', ' + externalRadius + ')');
        path.setAttribute('class', 'needle');
      }
      else {
        path.setAttribute('transform', 'rotate(' + (minRad * -360 / 6.28318530718) + ', ' + externalRadius + ', ' + externalRadius + ')');
        path.setAttribute('class', 'needle');
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
          eventBus.EventBus.removeEventListenerBySignal(this,
            'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal', newVal,
            this.onMachineIdChange.bind(this));
          break;
        case 'range':
          this._setRange(newVal);
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-piegauge');

      // Update here some internal parameters

      // listeners/dispatchers
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

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('performancegauge-content');
      let div = $('<div></div>').addClass('performancegauge')
        .append(this._content);

      // Create DOM - Loader
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

      // RESIZE ??? ??????????????????
      // ???????????????????????????????
      /*var self = this;
        $(window).resize(function () {
          _drawEmpty(self);
          _draw(self);
        });
        divcontent.resize(function () {
          _draw(self);
        });*/

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
        console.log('waiting attribute range in performance gaugeComponent.element');
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

        let urlTarget = this.getConfigOrAttribute('path', '')
          + 'UtilizationTarget/Get?MachineId='
          + this.element.getAttribute('machine-id');

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
        this._setRange(newRange);
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-performancegauge', PerformanceGaugeComponent, ['machine-id', 'motion-context', 'period-context', 'machine-context', 'range']);
})();
