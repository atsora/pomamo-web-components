// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-revisionprogress
 * @requires module:pulseComponent
 */

import * as pulseRange from 'pulseRange';
import * as pulseComponent from 'pulsecomponent';
import * as pulseSvg from 'pulseSvg';
import * as eventBus from 'eventBus';
import * as pulseUtility from 'pulseUtility';

(function () {

  var revisionProgressMaxId = 0; // Global variable to generate unique id

  /**
   * `<x-revisionprogress>` — animated SVG progress bar tracking one pending
   * modification revision.
   *
   * Listens to `modificationEvent` globally and only reacts to events
   * matching `revision-id`; updates `_percent` from
   * `(initModifications - pendingModifications) / initModifications` and
   * animates the bar fill towards that value. The bar covers either the
   * full host width (no `range` attribute) or the sub-range
   * `revision-range` projected over `range`; the projection is refreshed
   * on `dateTimeRangeChangeEvent` (on `period-context` or globally).
   * `kind`, `revision-id` and `revision-range` are forwarded to whoever
   * inspects the element via attributes.
   *
   * @element x-revisionprogress
   * @attr {string} range          ISO datetime range `begin;end` for the full bar width
   * @attr {string} period-context event-bus context for `dateTimeRangeChangeEvent`
   * @attr {number} revision-id    revision id of the pending modification
   * @attr {string} kind           modification kind (e.g. `'reason'`, `'MST'`, `'serialnumber'`)
   * @attr {string} revision-range datetime range of the modified data
   * @attr {number} steps          test-only initial steps value
   * @attr {number} remaining      test-only initial remaining value
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class RevisionProgressComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Default parameters
      self._steps = 0;
      self._beginPosition = 0;
      self._widthPosition = 1; // == 100%

      self._percent = null; // NOT 0, else error if undefined is never received
      self._displayedPercent = 0;
      self._smallDisplay = false;

      // DOM
      self._content = undefined;
      self._positionSVG = undefined;
      self._progressSVG = undefined;

      // FOR SVG
      self._width = 10000;
      self._height = 600;

      //
      self._smallestMovingBar = 30; // Less = problem with pattern

      return self;
    }

    initialize () {
      // Attributes
      if (this.element.hasAttribute('range')) {
        this._range = this._getRangeFromString(this.element.getAttribute('range'));
      }

      // Listener and dispatchers
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this), this);
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }
      eventBus.EventBus.addGlobalEventListener(this, 'modificationEvent', this.onModificationEvent.bind(this));

      // In the case of a clone, empty first
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'pulse-revisionprogress-content';
      this.element.appendChild(this._content);

      // DRAW
      // Compute the left and right position of the progress bar
      this._position();
      // Current progress
      if (this.element.hasAttribute('steps')) {
        let totalSteps = parseInt(this.element.getAttribute('steps'));
        if (this.element.hasAttribute('remaining')) {
          let remaining = parseInt(this.element.getAttribute('remaining'));
          this._progress(totalSteps, remaining);
        }
      }

      // Initialization OK → switch to the next context. We do this whether or
      // not `steps` is set: progress can also arrive later via modificationEvent.
      this.switchToNextContext();
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'revision-id':
        case 'machine-id':
        case 'kind':
        case 'revision-range':
          // nothing
          break;
        case 'steps':
          {
            let totalSteps = parseInt(newVal);
            this._progress(totalSteps, this.element.getAttribute('remaining'));
          } break;
        case 'remaining':
          if (this.element.hasAttribute('steps')) {
            this._progress(this.element.getAttribute('steps'), parseInt(newVal));
          } break;
        case 'range':
          {
            if (!pulseUtility.isNotDefined(newVal)) {
              let newRange = this._getRangeFromString(newVal);
              if (this._range != newRange) {
                this._range = newRange;
                this._position();
              }
            }
          } break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));

            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              this.element.getAttribute('period-context'));
          }
          //this._position(); -> not here
          break;
        default:
          break;
      }
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute param in RevisionProgress.element: machine-id');
        this.setError(this.getTranslation('error.missingParam', 'Missing param')); // delayed error message
        return;
      }
      if (!this.element.hasAttribute('revision-id')) {
        console.error('missing attribute param in RevisionProgress.element: revision-id');
        this.setError(this.getTranslation('error.missingParam', 'Missing param')); // delayed error message
        return;
      }
      if (!this.element.hasAttribute('revision-range')) {
        console.error('missing attribute param in RevisionProgress.element: revision-range');
        this.setError(this.getTranslation('error.missingParam', 'Missing param')); // delayed error message
        return;
      }
      if (!this.element.hasAttribute('kind')) {
        console.error('missing attribute param in RevisionProgress.element: kind');
        this.setError(this.getTranslation('error.missingParam', 'Missing param')); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError () {
      if (this.element != null)
        this.element.remove();
    }

    _removeSVG () {
      let svg = this._content.querySelector('.revision-svg');
      if (svg) {
        svg.remove();
      }
      this._positionSVG = undefined;
      this._progressSVG = undefined;
    }

    // beginPercent, widthPercent == POSITION
    _drawSVG () {
      // SVG container
      let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
      svg.setAttribute('viewBox', '0 0 ' + this._width + ' ' + this._height);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'revision-svg');
      //this._content.append(svg);

      // Create moving lines
      let def = document.createElementNS(pulseSvg.get_svgNS(), 'defs');

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      let anim = document.createElementNS(pulseSvg.get_svgNS(), 'animateTransform');
      anim.setAttribute('attributeName', 'transform');
      anim.setAttribute('type', 'translate');
      anim.setAttribute('from', '0');
      anim.setAttribute('to', '100');
      anim.setAttribute('begin', '0s');
      anim.setAttribute('dur', '1s');
      anim.setAttribute('repeatCount', 'indefinite');
      g.appendChild(anim);

      let size = 30;
      let line = document.createElementNS(pulseSvg.get_svgNS(), 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', 100);
      line.setAttribute('x2', 100);
      line.setAttribute('y2', 0);
      line.setAttribute('stroke-width', size);
      line.setAttribute('class', 'progress-line');
      g.appendChild(line);

      let line2 = document.createElementNS(pulseSvg.get_svgNS(), 'line');
      line2.setAttribute('x1', -100);
      line2.setAttribute('y1', 100);
      line2.setAttribute('x2', 100);
      line2.setAttribute('y2', -100);
      line2.setAttribute('stroke-width', size);
      line2.setAttribute('class', 'progress-line');
      g.appendChild(line2);

      let line3 = document.createElementNS(pulseSvg.get_svgNS(), 'line');
      line3.setAttribute('x1', 0);
      line3.setAttribute('y1', 200);
      line3.setAttribute('x2', 200);
      line3.setAttribute('y2', 0);
      line3.setAttribute('stroke-width', size);
      line3.setAttribute('class', 'progress-line');
      g.appendChild(line3);

      let pattern = document.createElementNS(pulseSvg.get_svgNS(), 'pattern');
      pattern.setAttribute('id', 'progress-pattern-' + revisionProgressMaxId);
      pattern.setAttribute('x', 6);
      pattern.setAttribute('y', 6);
      pattern.setAttribute('width', 100);
      pattern.setAttribute('height', 100);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.appendChild(g);

      def.appendChild(pattern);
      svg.appendChild(def);

      // CREATE SVG rect for position
      this._positionSVG = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      this._positionSVG.setAttribute('x', this._width * this._beginPosition);
      this._positionSVG.setAttribute('y', 0);
      this._positionSVG.setAttribute('width', this._width * this._widthPosition);
      this._positionSVG.setAttribute('height', this._height);
      this._positionSVG.setAttribute('class', 'revision-position');
      svg.appendChild(this._positionSVG);

      // Create SVG for progress
      this._progressSVG = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      this._progressSVG.setAttribute('x', this._width * this._beginPosition);
      this._progressSVG.setAttribute('y', (this._height / 3.0));
      this._smallDisplay = ((this._content.offsetWidth * this._widthPosition) <= this._smallestMovingBar);
      if (this._smallDisplay)
        this._progressSVG.setAttribute('width', this._width * this._widthPosition * 1);
      else
        this._progressSVG.setAttribute('width', this._width * this._widthPosition * (null == this._percent) ? 0 : this._percent);
      this._progressSVG.setAttribute('height', (this._height / 3.0));
      this._progressSVG.setAttribute('class', 'revision-progress');
      this._progressSVG.setAttribute('fill', 'url(#progress-pattern-' + revisionProgressMaxId + ')');

      revisionProgressMaxId++;

      svg.appendChild(this._progressSVG);
      this._content.appendChild(svg);
    }

    _position () {
      if ((this._range == undefined)
        || (!this.element.hasAttribute('revision-range'))
        || (undefined == this.element.getAttribute('revision-range'))) {
        // 100% width
        this._beginPosition = 0;
        this._widthPosition = 1; // 100%
      }
      else {
        // Compute the left and right position of the progress bar
        let revisionRange = this._getRangeFromString(this.element.getAttribute('revision-range'));
        if (revisionRange != undefined) {
          // Get the position of the revision range, relative to _range
          this._beginPosition = (revisionRange.lower - this._range.lower) / (this._range.upper - this._range.lower);
          let upper = revisionRange.upper;
          if ((null == upper) || (this._range.upper < upper)) {
            upper = this._range.upper;
          }
          let lower = revisionRange.lower;
          if ((null == lower) || (this._range.lower > lower)) {
            lower = this._range.lower;
          }
          this._widthPosition = (upper - lower) / (this._range.upper - this._range.lower);

          if (this._beginPosition < 0) {
            this._widthPosition += this._beginPosition;
            this._beginPosition = 0;
          }
          else if (this._widthPosition > 1) {
            this._widthPosition = 1;
          }

          if (1 < this._beginPosition || 0 > this._widthPosition) { // Out of range
            this._removeSVG();
            return;
          }
        }
      }

      // Draw
      if (undefined == this._positionSVG) {
        this._drawSVG();
      }
      else {
        this._positionSVG.setAttribute('x', this._width * this._beginPosition);
        this._positionSVG.setAttribute('width', this._width * this._widthPosition);

        this._progressSVG.setAttribute('x', this._width * this._beginPosition);
      }

      this._smallDisplay = ((this._content.offsetWidth * this._widthPosition) <= this._smallestMovingBar);
      if (this._smallDisplay) { // Display 100%
        //this._progressBar.style.width = '100%'; // == NOW
        this._progressSVG.setAttribute('width', this._width * this._widthPosition); // NOW. No need to animate
      }
      else {
        //this._progressSVG.style.width = (this._width * this._widthPosition * this._displayedPercent) + 'px'; // == NOW
        this._progressSVG.setAttribute('width', this._width * this._widthPosition * this._displayedPercent); // NOW ! No need to animate
      }
    }

    _progress (total, remaining) {
      if (100 == this._percent)
        return; // Nothing to do anymore

      /*if (!$(this.element).is(':visible')) {
        return; // For example in closed dialog
      }*/

      if ((undefined != total)
        && (undefined != remaining)) {

        let percent = 0;
        if (0 == total) {
          percent = 1; // == Cancel. Job done very quickly. Can happen.
        }
        else {
          percent = (total - remaining) / total;
        }

        if ((0 == remaining) || (percent == 1)) {
          if (undefined != this._progressSVG) { // small or not. GO TO 100% with animation
            // 100 %
            // animate width via CSS transition (replaces jQuery .animate)
            this._progressSVG.style.transition = 'width 500ms';
            this._progressSVG.style.width = (this._width * this._widthPosition * 1) + 'px';
          }

          this._percent = percent;
          setTimeout(function () {
            if (this.element != null)
              this.element.remove();
          }.bind(this), 1000);
        }
        else {
          // Small display == always like 100% -> not here
          if (undefined != this._progressSVG) {
            this._smallDisplay = ((this._content.offsetWidth * this._widthPosition) <= this._smallestMovingBar);
            if (this._smallDisplay) {
              this._progressSVG.style.transition = '';
              this._progressSVG.style.width = (this._width * this._widthPosition * 1) + 'px';
            }
            else {
              if (percent != this._percent) {
                this._progressSVG.style.transition = '';
                this._progressSVG.style.width = (this._width * this._widthPosition * percent) + 'px';

                // Store previous for simulated progress
                this._percent = percent;
                this._displayedPercent = percent; // Reset
              }
              // Simulate progression
              let simulatedDurationInSec = 10; // 5 is too fast for MST
              let modificationmanager_refreshRate = 1; // 1 sec
              // 1- Next progression step (Warning, remaining can be float)
              let nextStepPercent = (Math.trunc(total - remaining) + 1) / total;
              // 2- 1/5 progression since last display (refresh rate 1 sec in modificationmanager)
              let realNextPercent = this._displayedPercent
                + (nextStepPercent - this._displayedPercent) / simulatedDurationInSec;
              // 3- animate width via CSS transition (replaces jQuery .animate)
              this._progressSVG.style.transition = 'width ' + (1000 * modificationmanager_refreshRate) + 'ms';
              this._progressSVG.style.width = (this._width * this._widthPosition * realNextPercent) + 'px';

              // 4- store real display %
              this._displayedPercent = realNextPercent;
            }
          }
        }

      }
      /*else { DO nothing == starting
        //$(this._progressSVG).width(0);
        //$(this._progressBar).animate({ 'width': '0%' }, 'fast');
      }*/
    }

    _getRangeFromString (attr) {
      let range = pulseRange.createDateRangeFromString(attr);
      return range.isEmpty() ? undefined : range;
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      if (null == this.element)
        return;

      let newRange = event.target.daterange;
      if (newRange.upper == null) { // No empty end
        newRange.upper = Date();
      }
      if ((this._range == undefined) || (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._range = newRange;
        this.element.removeAttribute('range'); // To avoid reset in ValidateParameters

        this._position();
      }
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revisionid, machineid, kind, range,
     * initModifications: undefined, // pending modifications the first time
     * pendingModifications: undefined // pending modifications 'now'
     */
    onModificationEvent (event) {
      if (null == this.element)
        return;

      if (event.target.kind != this.element.getAttribute('kind') ||
        event.target.machineid != this.element.getAttribute('machine-id') ||
        event.target.revisionid != this.element.getAttribute('revision-id')) {
        return;
      }

      this._progress(event.target.initModifications, event.target.pendingModifications);
    }
  }

  pulseComponent.registerElement('x-revisionprogress', RevisionProgressComponent, ['revision-id', 'machine-id', 'kind', 'revision-range', 'steps', 'remaining', 'range', 'period-context']);
})();
