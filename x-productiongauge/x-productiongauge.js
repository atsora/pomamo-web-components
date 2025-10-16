// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-productiongauge used to display a circular gauge of the production performance
 * of the current shift for the selected machine.
 *
 * @module x-productiongauge
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 * @requires module:eventBus
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-productiongauge> to display a production performance gauge. This tag gets following attributes:
 *  machine-id : Integer
 *  machine-context : String
 *  display-mode : 'ratio' (35/70) or 'percent' (50%) - defaults to 'percent'
 */
(function () {

  // Create a circular gauge
  var gradientNumber = 0;
  /**
   * Create a circular gauge SVG element.
   *
  * @typedef {Object} GaugeSegment
  * @property {number} minAngle - Segment start angle in radians.
  * @property {number} maxAngle - Segment end angle in radians.
  * @property {string} [color] - Solid color for the whole segment.
  * @property {string[]} [colors] - Gradient colors for the segment (two or more entries).
  *
  * @param {number} littleRadius - Internal radius of the gauge in pixels.
  * @param {number} bigRadius - External radius of the gauge in pixels.
  * @param {GaugeSegment[]} segments - List of segments describing the background arcs and their color(s).
  * @param {number[]} [ticks] - List of angles (in radians) where ticks are drawn. Can be null/undefined for no ticks.
  * @param {string} gradientPrefix - Unique prefix used to generate gradient ids.
  * @returns {SVGSVGElement} The constructed SVG element containing the gauge.
   */
  function createCircularGauge(littleRadius, bigRadius, segments, ticks, gradientPrefix) {
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
          let gradientName = gradientPrefix + '-gradientConical-' + (gradientNumber++);
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

  /**
   * Custom element <x-productiongauge>
   *
   * Attributes:
   * - machine-id: number (required) => target machine for which the production is displayed
   * - machine-context: string (optional) => event bus context to listen for machine changes
   * - display-mode: 'ratio' | 'percent' (optional, default 'percent') => text rendering mode
   */
  class ProductionGaugeComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * @param  {...any} args Any arguments passed to the base component
     */
    constructor(...args) {
      const self = super(...args);

      // Production data
      self._actualProduction = 0;
      self._targetProduction = 0;
      self._productionRatio = 0; // between 0 and 1 (capped at 1 for gauge display)

      // DOM
      self._content = undefined;
      self._gaugeContainer = undefined;
      self._textDisplay = undefined;

      return self;
    }

    /**
     * Callback when an attribute is changed after the component is connected once.
     * Triggers start or UI updates based on the changed attribute.
     * @param {string} attr - Changed attribute name
     * @param {string|null} oldVal - Previous value
     * @param {string|null} newVal - New value
     */
    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
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
        case 'display-mode':
          if (this.isInitialized()) {
            this._updateTextDisplay();
          }
          break;
        default:
          break;
      }
    }

    /**
     * Initializes the component, builds the DOM structure and draws the static gauge background.
     * The SVG gauge (background and ticks) is created once.
     * @returns {void}
     */
    initialize() {
      // listeners
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty
      this.element.innerHTML = '';

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('productiongauge-content');

      // Gauge container
      this._gaugeContainer = document.createElement('div');
      this._gaugeContainer.classList.add('productiongauge-gauge');
      this._content.appendChild(this._gaugeContainer);

      // Text display (ratio or percentage)
      this._textDisplay = document.createElement('div');
      this._textDisplay.classList.add('productiongauge-text');
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

      // --- Draw the static gauge SVG (without needle) ---
      gradientNumber = 0;
      let externalRadius = 120;
      let internalRadius = externalRadius - 30;
      let minRad = 3.76519; // left
      let maxRad = -0.623599; // right
      let tickDivision = 10;
      
      // Get target percentage from config based on threshold mode
      // Note: In piece mode, this will use default 75% initially since we don't have production data yet
      let targetPercentage = this._calculateTargetPercentage();

      // Colors of the gauge with target
      let colors = [];
      if (targetPercentage > 0 && targetPercentage < 1) {
        let posRad = minRad - targetPercentage * (minRad - maxRad);
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
      } else {
        // Fallback if target is 0 or 100%
        colors.push({
          minAngle: minRad,
          maxAngle: maxRad,
          colors: ['#FF0000', '#FF9010', '#FFFF20', '#009900']
        });
      }
      let ticks = [];
      for (let i = 0; i <= tickDivision; i++) {
        ticks.push(minRad - i * (minRad - maxRad) / tickDivision);
      }
      let svg = createCircularGauge(internalRadius, externalRadius, colors, ticks, 'prod');
      svg.setAttribute('class', 'productiongauge-svg');
      let minX = -1, maxX = 1, minY = 0, maxY = 1;
      for (let i = 0; i < colors.length; i++) {
        minY = Math.min(minY, Math.sin(colors[i].minAngle), Math.sin(colors[i].maxAngle));
      }
      svg.setAttribute('viewBox', '0 0 ' + (externalRadius * (maxX - minX)) + ' ' + (externalRadius * (maxY - minY)));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this._gaugeContainer.appendChild(svg);
      this._svgGauge = svg;

      this.switchToNextContext();
      return;
    }

    /**
     * Clears the component DOM and internal references before removal or re-initialization.
     * @returns {void}
     */
    clearInitialization() {
      // DOM
      this.element.innerHTML = '';

      this._gaugeContainer = undefined;
      this._textDisplay = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validates required parameters and switches to next context when ready.
     * @returns {void}
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id');
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('Machine Id has incorrect value in productiongauge.element');
        this.setError('bad machine-id');
        return;
      }

      this.switchToNextContext();
    }

    /**
     * Displays an error message and hides the main content area.
     * @param {string} message - The error message to display
     * @returns {void}
     */
    displayError(message) {
      this._content.style.display = 'none';
      this._messageSpan.innerHTML = message;
    }

    /**
     * Removes any displayed error and shows the main content area.
     * @returns {void}
     */
    removeError() {
      this._content.style.display = 'block';
      this._messageSpan.innerHTML = '';
    }

    /**
     * Refresh rate in milliseconds.
     * Value comes from config 'refreshingRate.currentRefreshSeconds' (default 10s).
     * @returns {number}
     */
    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * Builds and returns the short URL for the data request.
     * @returns {string}
     */
    getShortUrl() {
      let url = 'Operation/ProductionMachiningStatus?MachineId=' + this.element.getAttribute('machine-id');
      return url;
    }

  /**
   * @typedef {Object} ProductionStatusData
   * @property {number} [NbPiecesDoneDuringShift] - Number of pieces produced during the current shift.
   * @property {number} [GoalNowShift] - Current target pieces for the shift.
   */
  /**
   * Updates the component with fresh data:
   * - Computes production ratio (capped to 1.0 for needle angle)
   * - Redraws the needle
   * - Updates the textual display (ratio or percent)
   * - In piece mode: redraws gauge if production goal changes (affects target visualization)
   * @param {ProductionStatusData} data
   * @returns {void}
   */
    refresh(data) {
      // Store previous target to detect changes
      let previousTargetProduction = this._targetProduction;
      
      // Update production data
      this._actualProduction = (data.NbPiecesDoneDuringShift !== undefined) ? data.NbPiecesDoneDuringShift : 0;
      this._targetProduction = (data.GoalNowShift !== undefined) ? data.GoalNowShift : 0;

      // Calculate ratio (0 to 1, capped at 1 for gauge display)
      if (this._targetProduction > 0) {
        this._productionRatio = Math.min(1.0, this._actualProduction / this._targetProduction);
      } else {
        this._productionRatio = 0;
      }

      // In piece mode, if the production goal changed, we need to redraw the entire gauge
      // because the target line position depends on the current production goal
      let thresholdMode = this.getConfigOrAttribute('productiongauge.thresholdmode', 'percentage');
      if (thresholdMode === 'piece' && previousTargetProduction !== this._targetProduction) {
        this._redrawGauge();
      } else {
        // Update only the needle
        this._drawNeedle();
      }
      
      this._updateTextDisplay();
    }

    /**
     * Calculates the target percentage for gauge visualization based on the threshold mode.
     * 
     * - In 'percentage' mode: target value (0-100) is converted to a ratio (0-1).
     *   Example: target=75 means the target line appears at 75% on the gauge.
     * 
     * - In 'piece' mode: target value represents expected piece count, converted to ratio
     *   based on current production goal (GoalNowShift).
     *   Example: target=50 pieces, current goal=100 pieces → target line at 50% (50/100).
     *   If goal is 200 pieces → target line at 25% (50/200).
     * 
     * @returns {number} Target percentage between 0 and 1 for gauge visualization
     */
    _calculateTargetPercentage() {
      let thresholdMode = this.getConfigOrAttribute('productiongauge.thresholdmode', 'percentage');
      let targetValue = this.getConfigOrAttribute('productiongauge.target', 70);
      let targetPercentage;

      if (thresholdMode === 'piece') {
        // In piece mode, target represents the number of pieces expected
        // The gauge should show where this target sits relative to the current production goal
        if (this._targetProduction > 0) {
          // targetPercentage = target pieces / current goal
          targetPercentage = targetValue / this._targetProduction;
        } else {
          // No production data yet, use 70% as default
          targetPercentage = 0.70;
        }
      } else {
        // Percentage mode: direct percentage value
        targetPercentage = targetValue / 100;
      }

      // Clamp between 0 and 1
      return Math.max(0, Math.min(1, targetPercentage));
    }

    /**
     * Draws or updates the needle on top of the static gauge.
     * @returns {void}
     */
    _drawNeedle() {
      // Remove old needle if exists
      const oldNeedle = this._svgGauge.querySelector('.needle-group');
      if (oldNeedle) {
        oldNeedle.remove();
      }

      // Gauge parameters (must match those in initialize)
      let externalRadius = 120;
      let internalRadius = externalRadius - 30;
      let centerRadius = externalRadius / 8;
      let centerAngle = 0.4;
      let minRad = 3.76519;
      let maxRad = -0.623599;

      // Create the needle group
      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      g.setAttribute('filter', 'url(#outerShadow)');
      g.setAttribute('class', 'needle-group');
      this._svgGauge.appendChild(g);

      let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
      g.appendChild(path);

      // Compute the path
      let d = 'M ' + (externalRadius + centerRadius * Math.cos(centerAngle)) + ',' + (externalRadius + centerRadius * Math.sin(centerAngle));
      d += ' A ' + centerRadius + ' ' + centerRadius + ' 0 1 1 ' + (externalRadius + centerRadius * Math.cos(centerAngle)) + ',' + (externalRadius - centerRadius * Math.sin(centerAngle));
      d += ' L ' + (externalRadius + (externalRadius + internalRadius) / 2) + ',' + externalRadius;
      d += ' z';
      path.setAttribute('d', d);

      // Rotation based on production ratio (capped at 1.0)
      let needleAngle = minRad - (minRad - maxRad) * this._productionRatio;
      path.setAttribute('transform', 'rotate(' + (needleAngle * -360 / 6.28318530718) + ', ' + externalRadius + ', ' + externalRadius + ')');
      path.setAttribute('class', 'needle');
    }

    /**
     * Updates the text display based on the selected display mode:
     * - 'ratio': shows actual/target
     * - 'percent': shows percent(%) rounded down
     * Also toggles CSS classes (production-poor/medium/good) based on configurable thresholds.
     * @returns {void}
     */
    _updateTextDisplay() {
      // Configuration takes priority over attribute
      let displayMode = 'percent'; // default

      // Check if config exists, otherwise use attribute
      let configShowPercent = this.getConfigOrAttribute('productiongauge.showpercent', null);
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

        // Get threshold mode (percentage or piece)
        let thresholdMode = this.getConfigOrAttribute('productiongauge.thresholdmode', 'percentage');
        
        // Get thresholds from config
        let redThreshold, orangeThreshold;
        
        if (thresholdMode === 'piece') {
          // Piece mode: values represent number of pieces below target
          // In piece mode: higher piece values = worse performance (more pieces missing)
          // red > orange (e.g., red=5, orange=2 means red when ≤5 from target, orange when ≤2 from target)
          let redPieces = this.getConfigOrAttribute('productiongauge.red', 5);
          let orangePieces = this.getConfigOrAttribute('productiongauge.orange', 2);
          
          // Validation: red must be greater than orange in piece mode
          if (redPieces <= orangePieces) {
            // Fallback values
            redPieces = 5;
            orangePieces = 2;
          }
          
          // Convert to ratios
          // Example: target=10, red=5 → redThreshold = 0.5 (applies when actual ≤ 5)
          // Example: target=10, orange=2 → orangeThreshold = 0.8 (applies when actual ≤ 8)
          redThreshold = Math.max(0, (this._targetProduction - redPieces) / this._targetProduction);
          orangeThreshold = Math.max(0, (this._targetProduction - orangePieces) / this._targetProduction);
        } else {
          // Percentage mode: values are percentages (0-100)
          // In percentage mode: orange > red (e.g., orange=80, red=50)
          redThreshold = this.getConfigOrAttribute('productiongauge.red', 50) / 100;
          orangeThreshold = this.getConfigOrAttribute('productiongauge.orange', 80) / 100;

          if (redThreshold || redThreshold === 0) {
            redThreshold = Math.max(0, redThreshold);
            redThreshold = Math.min(0.95, redThreshold);
          }
          else {
            redThreshold = 0.5;
          }

          if (orangeThreshold || orangeThreshold === 0) {
            orangeThreshold = Math.max(0, orangeThreshold);
            orangeThreshold = Math.min(0.95, orangeThreshold);
          }
          else {
            orangeThreshold = 0.8;
          }
          
          // Validation: orange must be greater than red in percentage mode
          if (orangeThreshold <= redThreshold) {
            redThreshold = 0.5;
            orangeThreshold = 0.8;
          }
        }

        // Apply CSS classes based on thresholds
        // In both modes, redThreshold < orangeThreshold after conversion
        if (ratio < redThreshold) {
          this._textDisplay.classList.add('production-poor');
        } else if (ratio < orangeThreshold) {
          this._textDisplay.classList.add('production-medium');
        } else {
          this._textDisplay.classList.add('production-good');
        }
      }
    }

    // Callback events
    /**
     * Event bus callback triggered when the machine id changes in the given context.
     * @param {{target:{newMachineId:number}}} event
     * @returns {void}
     */
    onMachineIdChange(event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    onConfigChange(event) {
      if (event.target.config === 'productiongauge') {
        this._redrawGauge();
        this._updateTextDisplay();
      }
    }

    /**
     * Redraws the entire gauge (background + needle) when configuration changes
     * @returns {void}
     */
    _redrawGauge() {
      // Remove old SVG
      if (this._svgGauge) {
        this._svgGauge.remove();
      }

      // Redraw the gauge with new target
      gradientNumber = 0;
      let externalRadius = 120;
      let internalRadius = externalRadius - 30;
      let minRad = 3.76519; // left
      let maxRad = -0.623599; // right
      let tickDivision = 10;

      // Get target percentage from config based on threshold mode
      let targetPercentage = this._calculateTargetPercentage();

      // Colors of the gauge with target
      let colors = [];
      if (targetPercentage > 0 && targetPercentage < 1) {
        let posRad = minRad - targetPercentage * (minRad - maxRad);
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
      } else {
        // Fallback if target is 0 or 100%
        colors.push({
          minAngle: minRad,
          maxAngle: maxRad,
          colors: ['#FF0000', '#FF9010', '#FFFF20', '#009900']
        });
      }

      let ticks = [];
      for (let i = 0; i <= tickDivision; i++) {
        ticks.push(minRad - i * (minRad - maxRad) / tickDivision);
      }

      let svg = createCircularGauge(internalRadius, externalRadius, colors, ticks, 'prod');
      svg.setAttribute('class', 'productiongauge-svg');
      let minX = -1, maxX = 1, minY = 0, maxY = 1;
      for (let i = 0; i < colors.length; i++) {
        minY = Math.min(minY, Math.sin(colors[i].minAngle), Math.sin(colors[i].maxAngle));
      }
      svg.setAttribute('viewBox', '0 0 ' + (externalRadius * (maxX - minX)) + ' ' + (externalRadius * (maxY - minY)));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this._gaugeContainer.appendChild(svg);
      this._svgGauge = svg;

      // Redraw needle
      this._drawNeedle();
    }
  }


  pulseComponent.registerElement('x-productiongauge', ProductionGaugeComponent, ['machine-id', 'machine-context', 'display-mode']);
})();