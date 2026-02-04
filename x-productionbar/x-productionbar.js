// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productionbar
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
 * Build a custom tag <x-productionbar> to display a production bar component. This tag gets following attribute :
 *  machine-id : Integer
 *  height : Integer
 *  period-context : String
 *  machine-context : String
 */
(function () {

  // Create a horizontal bar
  // width: width of the bar
  // height: height of the bar
  // segments: array made of
  // {
  //   minPercent: min position X of the segment
  //   maxPercent: max position X of the segment
  //   color or colors: either a unique color or an array of colors to define a conical gradient (color format #XXXXXX)
  // }
  // ticks: array of values for displaying ticks (in percent), can be null
  // margin: {left: ..., right: ..., top: ..., bottom: ...}
  var gradientNumber = 0;
  function createHorizontalBar(width, height, segments, ticks, margin) {
    if (segments == null || segments.length == 0)
      return null;

    // Create a svg with the right size
    let svg = pulseSvg.createBase(width, height, 'bar', null, null);

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

  class ProductionBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;
      self._barwidth = 100; // Default
      self._targetpercentage = null;
      self._targetIsUpdated = false;

      // DOM -> never in contructor
      self._content = undefined; // Optional
      self._textDisplay = undefined;

      return self;
    }

    get content() { return this._content; } // Optional

    _setRange(range) {
      this._range = range;
    }

    _setHeight() {
      let minHeight = 5;
      let defaultHeight = 60;

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

    _drawEmpty() { /* To clean the bar */
      $(this._content).find('.productionbar-svg').remove(); // Remove Old SVG
    }

    _draw() {
      $(this._content).find('.productionbar-svg').remove(); // Remove Old SVG
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

      // Colors of the bar
      let colors = [];
      let targetPercentage = this._calculateTargetPercentage();

      if (targetPercentage > 0 && targetPercentage < 1) {
        colors.push({
          minPercent: 0.0,
          maxPercent: targetPercentage,
          colors: ['#FF0000', '#FF9010', '#FFFF20']
        });
        colors.push({
          minPercent: targetPercentage,
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

      // create bar container
      let svg = createHorizontalBar(this._barwidth, this._height, colors, ticks, margin);
      svg.setAttribute('height', this._height);
      svg.setAttribute('viewBox', '0 0 '
        + this._barwidth + ' ' + this._height);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'productionbar-svg');
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
      if (this._productionRatio) {
        path.setAttribute('transform', 'translate(' + (margin.left + this._productionRatio * (this._barwidth - margin.left - margin.right)) + ', 0)');
      }
      else {
        path.setAttribute('transform', 'translate(' + margin.left + ', 0)');
      }
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
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
        case 'display-mode':
          if (this.isInitialized()) {
            this._updateTextDisplay();
          }
          break;
        case 'height':
          this._setHeight();
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

    initialize() {
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

            // In case of clone, need to be empty
      this.element.innerHTML = '';

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('productionbar-content');

      // Text display (ratio or percentage)
      this._textDisplay = document.createElement('div');
      this._textDisplay.classList.add('productionbar-text');
      this._content.appendChild(this._textDisplay);

      this.element.appendChild(this._content);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;


    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
      this._textDisplay = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    _updateTextDisplay() {
      // Configuration takes priority over attribute
      let displayMode = 'percent'; // default

      // Check if config exists, otherwise use attribute
      let configShowPercent = this.getConfigOrAttribute('showpercent', null);
      if (configShowPercent !== null) {
        // Config exists, use it
        displayMode = (configShowPercent === true || configShowPercent === 'true') ? 'percent' : 'ratio';
      } else {
        // No config, use attribute
        displayMode = this.element.getAttribute('display-mode') || 'percent';
      }

      let text = '';

      if (displayMode === 'ratio') {
        // Display as fraction: actual/target
        let actual = Math.floor(this._actualProduction * 100) / 100;
        let target = Math.floor(this._targetProduction * 100) / 100;
        text = actual + ' / ' + target;
      } else {
        // Display as percentage
        if (this._targetProduction > 0) {
          let percent = Math.floor((this._actualProduction / this._targetProduction) * 100);
          text = percent + '%';
        } else {
          text = '0%';
        }
      }

      this._textDisplay.textContent = text;

      // Add CSS classes for styling based on performance thresholds
      this._textDisplay.classList.remove('production-poor', 'production-medium', 'production-good');
      if (this._targetProduction > 0) {
        let ratio = this._actualProduction / this._targetProduction;


        // Get thresholds from config
        let redThreshold = this.getConfigOrAttribute('thresholdredproduction', 60) / 100;
        let targetThreshold = this.getConfigOrAttribute('thresholdtargetproduction', 80) / 100;


        if (redThreshold) {
          redThreshold = Math.max(0, redThreshold);
          redThreshold = Math.min(1, redThreshold);
        }
        else {
          redThreshold = 0.6;
        }

        if (targetThreshold) {
          targetThreshold = Math.max(0, targetThreshold);
          targetThreshold = Math.min(1, targetThreshold);
        }
        else {
          targetThreshold = 0.8;
        }

        // Validation: target must be greater than red in percentage mode
        if (targetThreshold <= redThreshold) {
          redThreshold = 0.6;
          targetThreshold = 0.8;
        }


        // Apply CSS classes based on thresholds
        // In both modes, redThreshold < targetThreshold after conversion
        if (ratio < redThreshold) {
          this._textDisplay.classList.add('production-poor');
        } else if (ratio < targetThreshold) {
          this._textDisplay.classList.add('production-medium');
        } else {
          this._textDisplay.classList.add('production-good');
        }
      }
    }

    _setRangeFromAttribute() {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }

    onConfigChange(event) {
      if (event.target.config === 'thresholdsupdated') {
        if (this._actualProduction) {
          this._draw();
          this._updateTextDisplay();
        }
      }
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
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


      this.switchToNextContext();
    }

    displayError(message) {
      $(this._messageSpan).html(message);

      //this._drawEmpty();
    }

    removeError() {
      $(this._messageSpan).html('');
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.barSlowUpdateMinutes', 5));
    }

    _perfSuccess(data) {
      this._targetpercentage = data.TargetPercentage;
      this._targetIsUpdated = true;
      this._draw();
    }
    _perfError(errorMessage) {
    }
    _perfFailed(url, isTimeout, xhrStatus) {
    }

    getShortUrl() {
      let url;
      if (this._range != undefined) {
        url = 'Operation/PartProductionRange?GroupId='
          + this.element.getAttribute('machine-id')
          + '&Range='
          + pulseUtility.convertDateRangeForWebService(this._range);
      }
      else {
        url = 'Operation/ProductionMachiningStatus?MachineId=' + this.element.getAttribute('machine-id');
      }

      return url;
    }

    refresh(data) {
      // Store previous target to detect changes
      let previousTargetProduction = this._targetProduction;

      // Update production data
      if (this._range != undefined) {
        this._actualProduction = (data.NbPieces !== undefined) ? data.NbPieces : 0;
        this._targetProduction = (data.Goal !== undefined) ? Math.floor(data.Goal) : 0;
      }
      else {
        this._actualProduction = (data.NbPiecesDoneDuringShift !== undefined) ? data.NbPiecesDoneDuringShift : 0;
        this._targetProduction = (data.GoalNowShift !== undefined) ? data.GoalNowShift : 0;
      }

      // Calculate ratio (0 to 1, capped at 1 for bar display)
      if (this._targetProduction > 0) {
        this._productionRatio = Math.min(1.0, this._actualProduction / this._targetProduction);
      } else {
        this._productionRatio = 0;
      }

      // if the production goal changed, we need to redraw the entire bar
      // because the target line position depends on the current production goal
      if (previousTargetProduction !== this._targetProduction) {
        this._draw();
      }

      this._updateTextDisplay();
    }

        /**
     * Calculates the target percentage for bar visualization based on the threshold mode.
     *
     * - In 'percentage' mode: target value (0-100) is converted to a ratio (0-1).
     *   Example: target=75 means the target line appears at 75% on the bar.
     *
     * @returns {number} Target percentage between 0 and 1 for bar visualization
     */
    _calculateTargetPercentage() {
      let targetValue = this.getConfigOrAttribute('thresholdtargetproduction', 80);
      let targetPercentage = targetValue / 100;

      // Clamp between 0 and 1
      return Math.max(0, Math.min(1, targetPercentage));
    }


    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._range = newRange;
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-productionbar', ProductionBarComponent, ['machine-id', 'period-context', 'machine-context', 'display-mode']);
})();
