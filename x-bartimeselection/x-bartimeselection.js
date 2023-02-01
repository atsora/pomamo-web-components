// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-bartimeselection
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-bartimeselection> to display a vertical red line on a bar. This tag gets following attribute : 
 *  height : integer
 *  when : isodatetime
 *  range : isodatetime range
 *  period-context: string (optional)
 *  datetime-context: string
 */
(function () {

  var minHeight = 5;
  var defaultHeight = 30;

  class BarTimeSelectionComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters / Default
      self._height = defaultHeight;
      self._barwidth = 100;
      self._range = undefined;

      // DOM
      self._content = undefined;
      self._messageSpan = undefined;

      return self;
    }

    get content () { return this._content; }

    _setHeight () {
      if (!pulseUtility.isNumeric(this.element.getAttribute('height'))) {
        this._height = defaultHeight;
      }
      else {
        let h = Number(this.element.getAttribute('height'));
        if (h < minHeight) {
          this._height = minHeight;
        }
        else {
          this._height = h;
        }
      }

      if ((this._content != undefined) && (this._content != null)) {
        $(this._content).height(this._height);
      }
      $(this.element).find('.bartimeselection').offset($(this.element).closest('.middle-bar').offset());
      $(this.element).find('.bartimeselection').height(this._height);
    }

    /*_drawEmpty() { // To clean the bar
      if ( (this._content == undefined) || (this._content == null) ){
        return;
      }
      $(this._content).find('.bartimeselection-svg').remove(); // Remove Old SVG
    }*/

    _draw () {
      if ((this._content == undefined) || (this._content == null)) {
        //$(content).height(this._height);
        return;
      }
      $(this._content).find('.bartimeselection-svg').remove(); // Remove Old SVG

      let width = $(this._content).width();
      if (width) {
        this._barwidth = width;
      }
      else {
        this._barwidth = 1200; // Default -- Must be enough to avoid large red line
      }

      let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
      //svg.setAttribute('width', this._barwidth); // NO ! for auto-adapt
      svg.setAttribute('height', this._height);
      svg.setAttribute('viewBox', '0 0 '
        + this._barwidth + ' ' + this._height);
      svg.setAttribute('preserveAspectRatio', 'none');

      svg.setAttribute('class', 'bartimeselection-svg');
      var self = this;
      svg.onclick = function (evt) {
        self._clickOnBar(evt);
      };

      $(this._content).append(svg);

      if (this.element.hasAttribute('when')) {
        let barbegin = new Date(this._range.lower);
        let barend = new Date(this._range.upper);
        if (isNaN(barbegin.getTime()) || isNaN(barend.getTime())) {
          console.warn('x-bartimeselection:refresh - NO begin OR end');
          return;
        }
        let iWhen = new Date(this.element.getAttribute('when'));
        if (isNaN(iWhen.getTime()) ||
          (iWhen < barbegin) ||
          (iWhen > barend)) {
          console.warn('x-bartimeselection:refresh - when is out of range');
          return;
        }
        //let whenPercent = (iWhen - barbegin) / (barend - barbegin);
        let position = this._barwidth * (iWhen - barbegin) / (barend - barbegin);
        // CREATE SVG
        let line = document.createElementNS(pulseSvg.get_svgNS(), 'line');
        line.setAttribute('stroke', 'red');     // color
        line.setAttribute('stroke-width', '2'); // width
        line.setAttribute('x1', position);
        line.setAttribute('y1', '0');
        line.setAttribute('x2', position);
        line.setAttribute('y2', this._height);
        svg.appendChild(line);
      }
    }

    _clickOnBar (evt) {
      // Prepare click for details
      //let e = evt.target;
      //let dim = e.getBoundingClientRect(); REPLACED BY this._barwidth;
      let x = evt.offsetX; // clientX - dim.left; // position = (click position) - (left of svg == 0)
      let d_clickTime = new Date(this._range.lower);
      let barwidth = $(this._content).width()
      if (barwidth > 0) {
        let d_begin = new Date(this._range.lower);
        let d_end = new Date(this._range.upper);
        let duration = d_end - d_begin;
        d_clickTime = new Date(d_begin.getTime() + (duration) * x / barwidth);
      }
      if (this.element.hasAttribute('datetime-context')) {
        let tmpDateRange = pulseRange.createDateRangeDefaultInclusivity(d_clickTime.toISOString(), d_clickTime.toISOString());
        let atDisplay = pulseUtility.displayDateRange(tmpDateRange, true);

        $('.detailed-at-subtitle').html(atDisplay);
        let newWhen = d_clickTime.toISOString();
        // Update red line :
        this.element.setAttribute('when', newWhen);
        // Tell other components
        eventBus.EventBus.dispatchToContext('dateTimeChangeEvent',
          this.element.getAttribute('datetime-context'),
          {
            when: newWhen
          });
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'height':
          this._setHeight();
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));
            /* if ( !this.element.hasAttribute('range') ) {
              eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              this.element.getAttribute('period-context'));
            }*/
          }
          break;
        case 'datetime-context': //  dispatch / 'dateTimeChangeEvent'
          break;
        case 'range':
          if (this.isInitialized()) {
            this._setHeight();
            let newRange = pulseRange.createStringRangeFromString(newVal);
            this._range = newRange;
            this._draw();
          } break;
        case 'when':
          this._draw();
          break;
        default:
          break;
      }
    }

    initialize () {
      // Attributes
      if (this.element.hasAttribute('range')) {
        let newRange =
          pulseRange.createDateRangeFromString(this.element.getAttribute('range'));
        this._range = newRange;
      }

      this._setHeight();

      // Listener
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this, 'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('bartimeselection-content');
      //divcontent.height(this._height);
      let div = $('<div></div>').addClass('bartimeselection')
        .append(this._content);
      div.height(this._height);
      $(this.element).append(div);

      // Create DOM - Loader
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);*/
      // Create DOM - message for error
      /*this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);*/

      // Display now
      this._draw();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      //this._height = defaultHeight;
      //this._barwidth = 100;
      // DOM
      $(this.element).empty();
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      this.switchToNextContext();
    }

    displayError (message) {
      // Do nothing - silent error
    }

    removeError () {
      // Do nothing
    }

    // Callback events
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      this._range = newRange;
      this._draw();
    }

    // 
    /*onDateTimeChange (event) {
      this.element.setAttribute('when', event.target.when);
    }*/
  }

  pulseComponent.registerElement('x-bartimeselection', BarTimeSelectionComponent, ['height', 'period-context', 'datetime-context', 'range', 'when']);
})();
