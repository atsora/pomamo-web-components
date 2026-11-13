// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-oeegauge used to display a circular gauge of the OEE (TRS),
 * the OOE (TRG) or the TEEP (TRE) of a machine or a group of machines.
 *
 * The data comes from the web service of the plugin Lemoine.Plugin.Oee:
 * `Oee/?GroupId=<id>&Range=<range>&OeeType=<OEE|OOE|TEEP>`
 *
 * @module x-oeegauge
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 * @requires module:eventBus
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';
import * as eventBus from 'eventBus';

(function () {

  /** Supported rate types and their default color thresholds (in %) */
  const OEE_TYPES = {
    oee: { target: 85, red: 60 },
    ooe: { target: 75, red: 50 },
    teep: { target: 60, red: 40 }
  };

  // Gauge geometry
  const EXTERNAL_RADIUS = 120;
  const INTERNAL_RADIUS = EXTERNAL_RADIUS - 30;
  const MIN_RAD = 3.76519; // left
  const MAX_RAD = -0.623599; // right
  const TICK_DIVISION = 10;

  var gradientNumber = 0;

  /**
   * Create a circular gauge SVG element (same drawing as x-productiongauge).
   *
   * @param {number} littleRadius - Internal radius of the gauge in pixels.
   * @param {number} bigRadius - External radius of the gauge in pixels.
   * @param {{minAngle: number, maxAngle: number, color?: string, colors?: string[]}[]} segments - Background arcs.
   * @param {number[]} [ticks] - Angles (in radians) of the ticks.
   * @param {string} gradientPrefix - Unique prefix used to generate gradient ids.
   * @returns {SVGSVGElement}
   */
  function createCircularGauge (littleRadius, bigRadius, segments, ticks, gradientPrefix) {
    if (segments == null || segments.length == 0)
      return null;

    let minX = -1, maxX = 1, minY = 0, maxY = 1;
    for (let i = 0; i < segments.length; i++) {
      minY = Math.min(minY, Math.sin(segments[i].minAngle), Math.sin(segments[i].maxAngle));
    }
    let centerX = bigRadius;
    let centerY = bigRadius;

    let svg = pulseSvg.createBase(bigRadius * (maxX - minX), bigRadius * (maxY - minY), 'gauge', null, null);

    let externalOffset = 2.0 / bigRadius;
    let internalOffset = 2.0 / littleRadius;

    for (let segmentNumber = 0; segmentNumber < segments.length; segmentNumber++) {
      let segment = segments[segmentNumber];

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

        let offsetE1 = ((segmentNumber > 0 && colorNumber == 0) ? externalOffset : 0);
        let offsetE2 = ((segmentNumber < (segments.length - 1) && colorNumber == subSegmentCount - 1) ? externalOffset : -0.01);
        let offsetI1 = ((segmentNumber > 0 && colorNumber == 0) ? internalOffset : 0);
        let offsetI2 = ((segmentNumber < (segments.length - 1) && colorNumber == subSegmentCount - 1) ? internalOffset : -0.01);

        let angleMin = ((subSegmentCount - colorNumber) * segment.minAngle + colorNumber * segment.maxAngle) / subSegmentCount;
        let angleMax = ((subSegmentCount - (colorNumber + 1)) * segment.minAngle + (colorNumber + 1) * segment.maxAngle) / subSegmentCount;

        let pointAx = centerX + bigRadius * Math.cos(angleMin - offsetE1);
        let pointAy = centerY - bigRadius * Math.sin(angleMin - offsetE1);
        let pointBx = centerX + bigRadius * Math.cos(angleMax + offsetE2);
        let pointBy = centerY - bigRadius * Math.sin(angleMax + offsetE2);
        let pointCx = centerX + littleRadius * Math.cos(angleMax + offsetI2);
        let pointCy = centerY - littleRadius * Math.sin(angleMax + offsetI2);
        let pointDx = centerX + littleRadius * Math.cos(angleMin - offsetI1);
        let pointDy = centerY - littleRadius * Math.sin(angleMin - offsetI1);

        let d = 'M ' + pointAx + ',' + pointAy;
        d += ' A ' + bigRadius + ' ' + bigRadius + ' 0 0 1 ' + pointBx + ',' + pointBy;
        d += ' L ' + pointCx + ',' + pointCy;
        d += ' A ' + littleRadius + ' ' + littleRadius + ' 0 0 0 ' + pointDx + ',' + pointDy;
        d += ' z';
        path.setAttribute('d', d);

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

    let tickLength = 5;
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
   * `<x-oeegauge>` — circular gauge showing the OEE (TRS), the OOE (TRG) or
   * the TEEP (TRE) of a machine or a group of machines, from the `Oee` web
   * service of the plugin Lemoine.Plugin.Oee.
   *
   * Period:
   *  - `current-shift` attribute set, or no range received yet: `Range=CurrentShift`
   *    (the current day when there is no shift),
   *  - else the range of the last `dateTimeRangeChangeEvent` of `period-context`.
   *
   * Color thresholds (in %): config keys / attributes `thresholdtarget<type>`
   * and `thresholdred<type>`, for example `thresholdtargetoee` and
   * `thresholdredoee`. The `thresholdsupdated` config change redraws the gauge.
   *
   * @element x-oeegauge
   * @attr {string}  machine-id      (required) machine or group id (sent as GroupId)
   * @attr {string}  oee-type        `oee` (default), `ooe` or `teep`
   * @attr {string}  machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string}  period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @attr {boolean} current-shift   always display the current shift, whatever the period
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class OeeGaugeComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * @param  {...any} args Any arguments passed to the base component
     */
    constructor (...args) {
      const self = super(...args);

      self._range = undefined;
      self._rate = null; // between 0 and 1, null if no data

      // DOM
      self._content = undefined;
      self._label = undefined;
      self._gaugeContainer = undefined;
      self._textDisplay = undefined;
      self._svgGauge = undefined;

      self._instanceId = 'oee-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      return self;
    }

    /**
     * Rate type in lower case: oee, ooe or teep
     * @returns {string}
     */
    get oeeType () {
      let oeeType = (this.element.getAttribute('oee-type') || 'oee').toLowerCase();
      return (oeeType in OEE_TYPES) ? oeeType : 'oee';
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        case 'oee-type':
          if (this.isInitialized()) {
            this._label.textContent = this._getLabel();
            this._redrawGauge();
            this.start();
          }
          break;
        case 'current-shift':
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
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      // Common loading CSS of the gauges (centered circular loader)
      this.addClass('pulse-piegauge');

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

      // In case of clone, need to be empty
      this.element.innerHTML = '';

      this._content = document.createElement('div');
      this._content.classList.add('oeegauge-content');

      this._label = document.createElement('div');
      this._label.classList.add('oeegauge-label');
      this._label.textContent = this._getLabel();
      this._content.appendChild(this._label);

      // Container of the SVG gauge (display: contents: the SVG follows the label
      // in the flow, at a fixed distance). The value is a text of the SVG.
      this._gaugeContainer = document.createElement('div');
      this._gaugeContainer.classList.add('oeegauge-gauge');
      this._content.appendChild(this._gaugeContainer);

      this.element.appendChild(this._content);

      // Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Error message
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      this._redrawGauge();

      this.switchToNextContext();
    }

    clearInitialization () {
      this.element.innerHTML = '';

      this._content = undefined;
      this._label = undefined;
      this._gaugeContainer = undefined;
      this._textDisplay = undefined;
      this._svgGauge = undefined;
      this._messageSpan = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      // machine-id: a machine id or a group id (string ids such as D1 are valid groups)
      if (!this.element.getAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._content.style.display = 'none';
      this._messageSpan.innerHTML = message;
    }

    removeError () {
      this._content.style.display = '';
      this._messageSpan.innerHTML = '';
    }

    /**
     * Refresh rate in milliseconds (config 'refreshingRate.currentRefreshSeconds', default 10s)
     * @returns {number}
     */
    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      let range = 'CurrentShift';
      if (!this.element.hasAttribute('current-shift') && (this._range != undefined)) {
        range = pulseUtility.convertDateRangeForWebService(this._range);
      }
      return 'Oee/?GroupId=' + encodeURIComponent(this.element.getAttribute('machine-id'))
        + '&OeeType=' + this.oeeType.toUpperCase()
        + '&Range=' + range;
    }

    /**
     * @param {{Rate: ?number}} data - response of the Oee web service
     */
    refresh (data) {
      this.removeError();
      this._rate = (data && (typeof data.Rate === 'number')) ? data.Rate : null;
      this._drawNeedle();
      this._updateTextDisplay();
    }

    /**
     * Label of the gauge: OEE / OOE / TEEP (TRS / TRG / TRE in French)
     * @returns {string}
     */
    _getLabel () {
      return this.getTranslation(this.oeeType, this.oeeType.toUpperCase());
    }

    /**
     * Color thresholds of the gauge, between 0 and 1, target > red
     * @returns {{target: number, red: number}}
     */
    _getThresholds () {
      let defaults = OEE_TYPES[this.oeeType];
      let target = Number(this.getConfigOrAttribute('thresholdtarget' + this.oeeType, defaults.target)) / 100;
      let red = Number(this.getConfigOrAttribute('thresholdred' + this.oeeType, defaults.red)) / 100;
      if (isNaN(target) || isNaN(red) || (target <= red) || (red < 0) || (1 < target)) {
        target = defaults.target / 100;
        red = defaults.red / 100;
      }
      return { target: target, red: red };
    }

    _drawNeedle () {
      if (!this._svgGauge) {
        return;
      }
      const oldNeedle = this._svgGauge.querySelector('.needle-group');
      if (oldNeedle) {
        oldNeedle.remove();
      }
      if (this._rate == null) {
        return; // No data: no needle
      }

      let centerRadius = EXTERNAL_RADIUS / 8;
      let centerAngle = 0.4;

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      g.setAttribute('filter', 'url(#outerShadow)');
      g.setAttribute('class', 'needle-group');
      this._svgGauge.appendChild(g);

      let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
      g.appendChild(path);

      let d = 'M ' + (EXTERNAL_RADIUS + centerRadius * Math.cos(centerAngle)) + ',' + (EXTERNAL_RADIUS + centerRadius * Math.sin(centerAngle));
      d += ' A ' + centerRadius + ' ' + centerRadius + ' 0 1 1 ' + (EXTERNAL_RADIUS + centerRadius * Math.cos(centerAngle)) + ',' + (EXTERNAL_RADIUS - centerRadius * Math.sin(centerAngle));
      d += ' L ' + (EXTERNAL_RADIUS + (EXTERNAL_RADIUS + INTERNAL_RADIUS) / 2) + ',' + EXTERNAL_RADIUS;
      d += ' z';
      path.setAttribute('d', d);

      let ratio = Math.max(0, Math.min(1, this._rate));
      let needleAngle = MIN_RAD - (MIN_RAD - MAX_RAD) * ratio;
      path.setAttribute('transform', 'rotate(' + (needleAngle * -360 / 6.28318530718) + ', ' + EXTERNAL_RADIUS + ', ' + EXTERNAL_RADIUS + ')');
      path.setAttribute('class', 'needle');
    }

    _updateTextDisplay () {
      if (!this._textDisplay) {
        return;
      }
      this._textDisplay.classList.remove('oee-poor', 'oee-medium', 'oee-good', 'oee-nodata');
      if (this._rate == null) {
        this._textDisplay.textContent = this.getTranslation('noDataTooOld', 'N/A');
        this._textDisplay.classList.add('oee-nodata');
        return;
      }

      this._textDisplay.textContent = Math.round(this._rate * 100) + '%';

      let thresholds = this._getThresholds();
      if (this._rate < thresholds.red) {
        this._textDisplay.classList.add('oee-poor');
      }
      else if (this._rate < thresholds.target) {
        this._textDisplay.classList.add('oee-medium');
      }
      else {
        this._textDisplay.classList.add('oee-good');
      }
    }

    /**
     * (Re-)draw the gauge background, with the target threshold position, and the needle
     */
    _redrawGauge () {
      if (!this._gaugeContainer) {
        return;
      }
      if (this._svgGauge) {
        this._svgGauge.remove();
      }

      gradientNumber = 0;
      let target = this._getThresholds().target;
      let segments = [];
      if (target > 0 && target < 1) {
        let posRad = MIN_RAD - target * (MIN_RAD - MAX_RAD);
        segments.push({ minAngle: MIN_RAD, maxAngle: posRad, colors: ['#FF0000', '#FF9010', '#FFFF20'] });
        segments.push({ minAngle: posRad, maxAngle: MAX_RAD, color: '#009900' });
      }
      else {
        segments.push({ minAngle: MIN_RAD, maxAngle: MAX_RAD, colors: ['#FF0000', '#FF9010', '#FFFF20', '#009900'] });
      }

      let ticks = [];
      for (let i = 0; i <= TICK_DIVISION; i++) {
        ticks.push(MIN_RAD - i * (MIN_RAD - MAX_RAD) / TICK_DIVISION);
      }

      let svg = createCircularGauge(INTERNAL_RADIUS, EXTERNAL_RADIUS, segments, ticks, this._instanceId);
      svg.setAttribute('class', 'oeegauge-svg');
      let minY = 0;
      for (let i = 0; i < segments.length; i++) {
        minY = Math.min(minY, Math.sin(segments[i].minAngle), Math.sin(segments[i].maxAngle));
      }
      let height = EXTERNAL_RADIUS * (1 - minY);
      svg.setAttribute('viewBox', '0 0 ' + (EXTERNAL_RADIUS * 2) + ' ' + height);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // Value, between the two ends of the arc: part of the SVG so that it keeps
      // its place and its proportion whatever the size of the gauge
      let text = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      text.setAttribute('class', 'oeegauge-text');
      text.setAttribute('x', EXTERNAL_RADIUS);
      text.setAttribute('y', height - 8);
      text.setAttribute('text-anchor', 'middle');
      svg.appendChild(text);
      this._textDisplay = text;

      this._gaugeContainer.appendChild(svg);
      this._svgGauge = svg;

      this._drawNeedle();
      this._updateTextDisplay();
    }

    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    onConfigChange (event) {
      if (event.target.config === 'thresholdsupdated') {
        this._redrawGauge();
        this._updateTextDisplay();
      }
    }

    /**
     * Event bus callback of `dateTimeRangeChangeEvent`: keep the range and restart
     * (ignored with the current-shift attribute)
     *
     * @param {{ target: { daterange: Object } }} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if (!newRange || !newRange._lower || !newRange._upper) {
        return;
      }
      this._range = newRange;
      if (!this.element.hasAttribute('current-shift')) {
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-oeegauge', OeeGaugeComponent, ['machine-id', 'oee-type', 'machine-context', 'period-context', 'current-shift']);
})();
