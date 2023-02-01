// Copyright (C) 2009-2023 Lemoine Automation Technologies
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
//var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

//const d3 = require('d3');

/**
 * Build a custom tag <x-datetimegraduation> to display an datetimegraduation component. This tag gets following attribute : 
 *  height : Integer
 *  range : String 'begin;end'
 */
(function () {

  //var margin = {top: 0, right: 24, bottom: 0, left: 24}; // left + right pour ne pas couper le texte // get from CSS ?
  //var margin = {top: 0, right: 0, bottom: 0, left: 0}; // left + right pour ne pas couper le texte // get from CSS ?

  class DateTimeGraduationComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
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

      self.methods = {
        load: self.load // Should be... loadDTG
      };

      return self;
    }

    get content () { return this._content; }

    load () { // To resize (old-name to keep compatibility)
      if (this.isInitialized()) {
        this._drawEmpty();
        this._draw();
      }
    }

    /*_setRange (isoBegin, isoEnd) {
      this._range = newRange;
      this._draw();
    }*/

    _drawEmpty () { // For resize
      if (this._content == undefined) {
        return;
      }
      // clear svg
      let svg = $(this._content).find('.datetimegraduation-svg');
      d3.selectAll(svg.toArray()).remove();
      $(this.element).remove('.datetimegraduation-svg');
    }

    _draw () {
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
      let bar_height = total_height; // - margin.top - margin.bottom;

      let nbTicks = Math.round(total_width / 70); /* 70 = single text width */
      if (nbTicks < 3)
        nbTicks = 3;

      // re-draw svg (with good range)
      let x = d3.scaleTime()
        .domain([new Date(this._range.lower), new Date(this._range.upper)])
        .range([0, bar_width]); /* +0 - CHROME */
      //.range([0, bar_width+1]); /* +1 to draw last tick inside the border - FIREFOX*/

      if ($(this.element).attr('bottom') == 'true') {
        let xAxis = d3.axisBottom(x);
        if (nbTicks < 10) {
          xAxis.ticks(nbTicks);
        }
        let svg = d3.selectAll(this._content.toArray()).append('svg')
          .attr('width', total_width)
          .attr('height', total_height)
          .attr('class', 'datetimegraduation-svg')
          .append('g') // utile pour les marges
          .attr('transform', 'translate(' + marginleft + ',' + '1)'); //1 to see horizontal line

        svg.append('g')
          .attr('class', 'datetimegraduation-axis')
          .attr('transform', 'translate(0,0)') //= ajoute 1 trait plein
          .call(xAxis);
      }
      else {
        let xAxis = d3.axisTop(x);
        if (nbTicks < 10) {
          xAxis.ticks(nbTicks);
        }
        let svg = d3.selectAll(this._content.toArray()).append('svg')
          .attr('width', total_width)
          .attr('height', total_height)
          .attr('class', 'datetimegraduation-svg')
          .append('g') // utile pour les marges
          .attr('transform', 'translate(' + marginleft + ',' + 0 + ')'); /*0 was margin.top */
        //.on("click", click);
        // On click, update the x-axis.
        //function click() {
        //          x.domain([new Date(2014, 05, 20), new Date(2014, 06, 20)]);
        //          var t = svg.transition().duration(750);
        //          t.select(".x.axis").call(xAxis);
        //          }

        svg.append('g')
          .attr('class', 'datetimegraduation-axis')
          .attr('transform', 'translate(0,' + (bar_height - 1) + ')') //= ajoute 1 trait plein (-1 for Chrome display)
          .call(xAxis);
      }


      /*.showToday() -> to show a line for NOW */
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'bottom':
          if (this.isInitialized()) {
            this._draw();
          } break;
        case 'range':
          if (this.isInitialized()) {
            //_setRangeFromAttribute () {
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

    initialize () {

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

      //if (this._range == 'undefined' ) {
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
        // DO NOT return; // = wait for range
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('datetimegraduation-content');
      //this._content.height(this._height);
      // Create DOM - Loader
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);*/
      // Create DOM - message for error
      /*this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);*/

      this._mainDiv = $('<div></div>').addClass('datetimegraduation')
        .append(this._content);
      $(this.element).append(this._mainDiv);

      // 1st DRAW - NO NEED TO CALL _drawEmpty();
      this._draw(); // Before resize

      // Resize
      var self = this;
      $(window).resize(function () {
        self._draw();
      });
      $(this._mainDiv).resize(function () {
        self._draw();
      });
      // It is not the best way but works most of the time.
      setTimeout(function () {
        //self._draw(); == not enough
        self.load()
      }, 1500); // 250 ms is not enough -- To display graduation with good width (ManagerWebApp / LineWA)

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      this._range = undefined;
      // DOM
      $(this.element).empty();
      this._mainDiv = undefined;
      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
    }

    removeError () {
      // Code here to remove the error message
    }

    // Callback events
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      this._range = newRange;
      this._draw();
    }
  }

  pulseComponent.registerElement('x-datetimegraduation', DateTimeGraduationComponent, ['bottom', 'range', 'period-context']);
})();
