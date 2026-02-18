// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
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

/**
 * Build a custom tag <x-datetimegraduation> to display an datetimegraduation component. This tag gets following attribute :
 * height : Integer
 * range : String 'begin;end'
 */
(function () {

  class DateTimeGraduationComponent extends pulseComponent.PulseParamInitializedComponent {
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
      self._resizeObserver = undefined; // Ajout pour la gestion du redimensionnement

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
      // clear svg
      let svg = $(this._content).find('.datetimegraduation-svg');
      d3.selectAll(svg.toArray()).remove();
      $(this.element).remove('.datetimegraduation-svg');
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

      this._width = this._mainDiv.width();
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

      if ($(this.element).attr('bottom') == 'true') {
        let xAxis = d3.axisBottom(x).tickFormat(customTickFormat);
        if (nbTicks < 10) {
          xAxis.ticks(nbTicks);
        }
        let svg = d3.selectAll(this._content.toArray()).append('svg')
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
        let svg = d3.selectAll(this._content.toArray()).append('svg')
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('datetimegraduation-content');

      this._mainDiv = $('<div></div>').addClass('datetimegraduation')
        .append(this._content);
      $(this.element).append(this._mainDiv);

      // 1st DRAW
      this._draw(); // Before resize

      // --- NOUVELLE GESTION DU RESIZE ---
      var self = this;

      // 1. Sur changement de taille globale de la fenêtre
      $(window).resize(function () {
        self._draw();
      });

      // 2. Sur changement de la div elle-même (ex: affichage de la popup)
      if (typeof ResizeObserver === 'function') {
        this._resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            // Dès qu'on a une vraie largeur (fin du display:none)
            if (entry.contentRect.width > 0) {
              window.requestAnimationFrame(() => {
                self._draw();
              });
            }
          }
        });
        this._resizeObserver.observe(this._mainDiv[0]);
      } else {
        // Fallback de sécurité si vieux navigateur (remplace ton vieux hack)
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
      // Déconnecter l'observer proprement pour éviter les fuites mémoire
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = undefined;
      }

      // Parameters
      this._range = undefined;
      // DOM
      $(this.element).empty();
      this._mainDiv = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters() {
      this.switchToNextContext();
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
