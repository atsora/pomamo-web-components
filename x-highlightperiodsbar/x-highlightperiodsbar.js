// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-highlightperiodsbar
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */

var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-highlightperiodsbar> to highlight periods in a bar component. This tag gets following attribute :
 *  height : Integer
 *  range : String '[begin,end]' or 'begin;end'
 *  period-context
 */
(function () {

  class HighlightPeriodsBarComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters
      self._barwidth = 100; // default

      self._range = undefined;
      self._setAutoRange();

      self._height = undefined;
      self._setAutoHeight();

      // Internal data
      self._periods = [];
      self.methods = {
        'addRange': self.addRange,
        'removeRange': self.removeRange,
        'cleanRanges': self.cleanRanges
      };

      return self;
    }

    get content () { return $(this.element).find('.highlightperiodsbar-content'); }

    /**
     * Associated native Javascript Date range
     *
     * @return {pulseRange:DateRange} Current range in native Javascript Date
     */
    get range () { return this._range; }
    _setAutoRange () {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = pulseRange.createDateRangeFromString(attr);
        }
      }
    }

    get barwidth () {
      let width = $(this.content).width();
      if (width) {
        this._barwidth = width;
      }
      return this._barwidth;
    }
    set barwidth (w) { this._barwidth = w; }

    get minHeight () { return 2; }
    get defaultHeight () { return 5; }
    get height () { return this._height; }
    set height (h) {
      if (h < this.minHeight) {
        this._height = this.minHeight;
      }
      else {
        this._height = h;
      }
      let c = this.content;
      if (typeof c !== 'undefined') {
        c.height(this._height);
      }
    }
    _setAutoHeight () {
      if (this.element.hasAttribute('height')) {
        let heightAttribute = this.element.getAttribute('height');
        if (pulseUtility.isNumeric(heightAttribute)) {
          let h = Number(heightAttribute);
          this.height = h;
          return;
        }
      }
      if (tagConfig && tagConfig.highlightperiodsbar && tagConfig.highlightperiodsbar.height) {
        this.height = tagConfig.highlightperiodsbar.height;
      }
      else {
        this.height = this.defaultHeight;
      }
      return;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'height':
          this._setAutoHeight();
          break;
        case 'range':
          this._setAutoRange();
          this.start();
          break;
        default:
          break;
      }

      if ('period-context' == attr) {
        if (this.isInitialized()) {
          eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
          eventBus.EventBus.addEventListener(this,
            'dateTimeRangeChangeEvent',
            newVal,
            this.onDateTimeRangeChange.bind(this));
        }
        this.start();
      }
    }

    initialize () {
      this._setAutoHeight();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      let divcontent = $('<div></div>').addClass('highlightperiodsbar-content');
      divcontent.height(this.height);
      $(this.element)
        .addClass('highlightperiodsbar')
        .append(divcontent);
      /*$(window).resize(() => this._draw());
      divcontent.resize(() => this._draw());*/

      // Listeners
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

      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Clean component
      this._cleanContent(); // = remove svg
      this.cleanRanges();   // == this._periods = [];

      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      //this._content = undefined;

      super.clearInitialization();
    }

    reset () {
      // Clean component
      this._cleanContent();
      this.cleanRanges();
      // Remove Error
      //this.removeError();

      this.switchToNextContext();
    }

    validateParameters () {
      this._setAutoRange(); // Get attribute if any

      // Check the range is valid
      // (from attribute or onDateTimeRangeChange)
      if (this.range == undefined) {
        console.error('undefined range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError(this.getTranslation('error.missingRange', 'Missing range'));
        return;
      }
      if (this.range.isEmpty()) {
        console.error('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError(this.getTranslation('error.emptyRange', 'Empty range'));
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      // TODO
    }

    removeError () {
    }

    _cleanContent () {
      if (typeof this.content == 'undefined') {
        return;
      }
      $(this.element).find('.highlightperiodsbar-svg').remove(); // Remove old SVG
    }

    _draw () {
      this._cleanContent();

      let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
      //svg.setAttribute('width', this.barwidth); // NO ! for auto-adapt
      svg.setAttribute('height', this.height);
      svg.setAttribute('viewBox', '0 0 '
        + this.barwidth + ' ' + this._height);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'highlightperiodsbar-svg');
      let contents = this.element.getElementsByClassName('highlightperiodsbar-content');
      if (contents.length > 0) {
        contents[0].appendChild(svg);
      }

      //let highlightColor = '#EDEDED'; // @textcolor-base = color white little dark - Make it configurable

      if (this._periods) {
        for (let period of this._periods) {
          let lower = this.range.lower > period.lower ? this.range.lower : period.lower; // Max
          let upper = (period.upper == null) ? new Date() //now
            : (period.upper < this.range.upper ? period.upper : this.range.upper); // Min
          let duration = this.range.upper - this.range.lower;
          let beginPos = (lower - this.range.lower) / duration;
          let endPos = (upper - lower) / duration;

          let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
          rect.setAttribute('x', this.barwidth * beginPos);
          rect.setAttribute('y', 0);
          rect.setAttribute('width', this.barwidth * endPos);
          rect.setAttribute('height', this.height);
          //rect.setAttribute('fill', highlightColor);
          rect.setAttribute('class', 'highlight-fill-color');
          svg.appendChild(rect);
        }
      }
    }

    // Callback events
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if (!pulseRange.equals(newRange, this._range, (a, b) => a.getTime() == b.getTime())) {
        this._range = newRange;
        this.element.removeAttribute('range'); // To avoid reset in ValidateParameters
        this.cleanRanges(); // To clean display
        this.start();
      }
    }

    _comparePeriods (a, b) {
      if (a.lower < b.lower) {
        return -1;
      }
      else if (a.lower > b.lower) {
        return 1;
      }
      else {
        return 0;
      }
    }

    _findIndexOf (range) {
      let index = 0;
      while (index < this._periods.length) {
        let period = this._periods[index];
        if (pulseRange.equals(period, range, (a, b) => a.getTime() == b.getTime())) {
          return index;
        }
        index++;
      }
      return -1;
    }

    /** Add a period
     * @param {string|Date} start - Lower value
     * @param {string|Date} end - Upper value
     */
    /*add*Period (start, end) {
      this.addRange(pulseRange.createDateRangeDefaultInclusivity(start, end));
    }*/

    /** Add a range (either in native Date range, or in Iso string) */
    addRange (range) {
      let r;
      if (typeof range == 'string') {
        r = pulseRange.createDateRangeFromString(range);
      }
      else {
        r = range;
      }

      let index = this._findIndexOf(r);
      if (index == -1) {
        this._periods[this._periods.length] = r;
        this._periods = this._periods.sort(this._comparePeriods);
      }
      if (this.stateContext == 'Initialized') {
        this._draw();
      }
    }

    /** Remove a period
     * @param {string|Date} start - Lower value
     * @param {string|Date} end - Upper value
     */
    /*
    remove*Period (start, end) {
      this.removeRange(pulseRange.createDateRangeDefaultInclusivity(start, end));
    }*/

    /**
     * Remove a range, either in native Javascript Date, or in Iso string
     */
    removeRange (range) {
      let r;
      if (typeof range == 'string') {
        r = pulseRange.createDateRangeFromString(range);
      }
      else {
        r = range;
      }
      let index = this._findIndexOf(r);
      if (index != -1) {
        this._periods.splice(index, 1);
        this._periods = this._periods.sort(this._comparePeriods);
      }
      if (this.stateContext == 'Initialized') {
        this._draw();
      }
    }

    cleanRanges () {
      this._periods = [];
      if (this.stateContext == 'Initialized') {
        this._draw();
      }
    }
  }

  pulseComponent.registerElement('x-highlightperiodsbar', HighlightPeriodsBarComponent, ['height', 'range']);
})();
