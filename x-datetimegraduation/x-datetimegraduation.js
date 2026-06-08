// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-datetimegraduation
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');
const locales = {
  'fr': require('d3-time-format/locale/fr-FR.json'),
  'en': require('d3-time-format/locale/en-US.json'),
  'de': require('d3-time-format/locale/de-DE.json'),
  'es': require('d3-time-format/locale/es-ES.json'),
};

(function () {

  /**
   * `<x-datetimegraduation>` — SVG time-axis ruler.
   *
   * Renders a horizontal graduation axis for `range` using `d3-time-format`,
   * with a fixed 25 px height and a tick density computed from the container
   * width (~one tick per 70 px, min 3). Date/time formatting locale is selected
   * from `moment.locale()` (`fr` / `en` / `de` / `es`). A `ResizeObserver` on
   * the host element triggers a redraw on width changes.
   *
   * @element x-datetimegraduation
   * @attr {string} range  ISO datetime range `begin;end`
   * @method load          force a redraw at the current width
   * @extends pulseComponent.PulseInitializedComponent
   */
  class DateTimeGraduationComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters
      self._height = 25; // Fixed
      self._width = undefined;

      self._content == undefined;

      self._mainDiv = undefined;
      self._content = undefined;
      self._range = undefined;
      self._resizeObserver = undefined; // Added for resize management

      self.methods = {
        load: self.load // Should be... loadDTG
      };

      return self;
    }

    get content() { return this._content; }

    load() { // To resize (old-name to keep compatibility)
      if (this.isInitialized()) {
        this._drawEmpty();
        this._draw();
      }
    }

    _drawEmpty() { // For resize
      if (this._content == undefined) {
        return;
      }
      // clear all existing svg(s) — multiple may accumulate if _draw is called
      // before the previous one finished (e.g. rapid resize + attribute change).
      this._content.querySelectorAll('.datetimegraduation-svg').forEach(el => el.remove());
    }

    _draw() {
      if (this._content == undefined) {
        return;
      }
      // clear svg
      this._drawEmpty();

      if (this._range == undefined) {
        return;
      }

      // calculate new width
      let marginleft = 1;
      let marginright = 1;

      // Use the inner _content width (no padding) — equivalent to jQuery `.width()`.
      // `_mainDiv.offsetWidth` includes the host's padding and would overshoot the
      // drawable area, making the SVG extend past the container.
      this._width = this._content.offsetWidth;
      let total_width = this._width + marginleft + marginright;
      let total_height = this._height;
      let bar_width = total_width - marginleft - marginright;
      let bar_height = total_height;

      let nbTicks = Math.round(total_width / 70); /* 70 = single text width */
      if (nbTicks < 3)
        nbTicks = 3;

      // re-draw svg (with good range)
      let x = d3.scaleTime()
        .domain([new Date(this._range.lower), new Date(this._range.upper)])
        .range([0, bar_width]);

      const language = moment.locale();
      let localeData = locales[language];

      const d3TimeFormat = require('d3-time-format');
      const locale = d3TimeFormat.timeFormatLocale(localeData);

      const formatDay = locale.format('%a %d');
      let formatHour;
      if (language === 'en') {
        formatHour = locale.format('%I %p');
      }
      else {
        formatHour = locale.format('%H:%M');
      }

      function customTickFormat(date) {
        if (date.getHours() === 0 && date.getMinutes() === 0) {
          return formatDay(date);
        } else {
          return formatHour(date);
        }
      }

      if (this.element.getAttribute('bottom') == 'true') {
        let xAxis = d3.axisBottom(x).tickFormat(customTickFormat);
        if (nbTicks < 10) {
          xAxis.ticks(nbTicks);
        }
        let svg = d3.select(this._content).append('svg')
          .attr('width', total_width)
          .attr('height', total_height)
          .attr('class', 'datetimegraduation-svg')
          .append('g')
          .attr('transform', 'translate(' + marginleft + ',' + '1)');

        svg.append('g')
          .attr('class', 'datetimegraduation-axis')
          .attr('transform', 'translate(0,0)')
          .call(xAxis);
      }
      else {
        let xAxis = d3.axisTop(x).tickFormat(customTickFormat);
        if (nbTicks < 10) {
          xAxis.ticks(nbTicks);
        }
        let svg = d3.select(this._content).append('svg')
          .attr('width', total_width)
          .attr('height', total_height)
          .attr('class', 'datetimegraduation-svg')
          .append('g')
          .attr('transform', 'translate(' + marginleft + ',' + 0 + ')');

        svg.append('g')
          .attr('class', 'datetimegraduation-axis')
          .attr('transform', 'translate(0,' + (bar_height - 1) + ')')
          .call(xAxis);
      }
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'bottom':
          if (this.isInitialized()) {
            this._draw();
          } break;
        case 'range':
          if (this.isInitialized()) {
            let range = pulseRange.createDateRangeFromString(newVal);
            if (!range.isEmpty()) {
              this._range = range;
              this._draw();
            }
          } break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              newVal,
              this.onDateTimeRangeChange.bind(this));

            if (!this.element.hasAttribute('range')) {
              eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
                this.element.getAttribute('period-context'));
            }
          }
          break;
        default:
          break;
      }
    }

    initialize() {

      // Listener and dispatchers
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

      if (this.element.hasAttribute('range')) {
        this._range = pulseRange.createStringRangeFromString(
          this.element.getAttribute('range'));
      }
      else {
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'datetimegraduation-content';

      this._mainDiv = document.createElement('div');
      this._mainDiv.className = 'datetimegraduation';
      this._mainDiv.appendChild(this._content);
      this.element.appendChild(this._mainDiv);

      // 1st DRAW
      this._draw(); // Before resize

      // --- NOUVELLE GESTION DU RESIZE ---
      var self = this;

      // 1. On global window size change
      window.addEventListener('resize', () => {
        self._draw();
      });

      // 2. On div itself change (e.g: popup display)
      if (typeof ResizeObserver === 'function') {
        this._resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            // As soon as we have real width (end of display:none)
            if (entry.contentRect.width > 0) {
              window.requestAnimationFrame(() => {
                self._draw();
              });
            }
          }
        });
        this._resizeObserver.observe(this._mainDiv);
      } else {
        // Fallback for old browser (replaces old hack)
        setTimeout(function () {
          self.load();
        }, 500);
      }
      // ----------------------------------

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Properly disconnect observer to avoid memory leaks
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = undefined;
      }

      // Parameters
      this._range = undefined;
      // DOM
      this.element.replaceChildren();
      this._mainDiv = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    displayError(message) {
      // Code here to display the error message
    }

    removeError() {
      // Code here to remove the error message
    }

    // Callback events
    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;
      this._range = newRange;
      this._draw();
    }
  }

  pulseComponent.registerElement('x-datetimegraduation', DateTimeGraduationComponent, ['bottom', 'range', 'period-context']);
})();
