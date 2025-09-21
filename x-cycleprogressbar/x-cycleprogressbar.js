// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-cycleprogressbar
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

  class CycleProgressBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined;
      self._progressbar = undefined;
      self._spanNextstopMessage = undefined;
      self._spanNextstopDuration = undefined;
      self._messageSpan = undefined;
      self._content = undefined;

      self._height = 30; //defaultHeight);
      self._barwidth = 100; // Default

      return self;
    }

    get content () { return this._content; } // Optional

    _setHeight () {
      this._height = this.getConfigOrAttribute('height', 30); // == defaultHeight);
      if (!pulseUtility.isNumeric(this._height)) {
        this._height = 30; // == defaultHeight;
      }
      else {
        this._height = Number(this._height);
        if (this._height < 5) { // minHeight) {
          this._height = 5; // == minHeight;
        }
      }
      if (this._progressbar != undefined) {
        $(this._progressbar).height(this._height);
      }
    }

    _drawEmpty () {
      $(this._content).find('.cycleprogressbar-svg').remove(); // Remove Old SVG
      $(this._spanNextstopMessage).html('');
      $(this._spanNextstopDuration).html('');

      $(this.element).find('.threshold1').removeClass('threshold1');
      $(this.element).find('.threshold2').removeClass('threshold2');
      $(this.element).find('.activeevent').removeClass('activeevent');
      $(this.element).find('.comingevent').removeClass('comingevent');
    }

    _draw () {

      if ((this._content == undefined) || (this._content == null)) {
        //$(content).height(this._height);
        return;
      }
      this._drawEmpty();

      let width = $(this._content).width();
      if (width) {
        this._barwidth = width;
      }
      else {
        this._barwidth = 100; // Default
      }

      // Check Server time diff
      this._diffServerTimeMinusNowMSec = pulseConfig.getInt('diffServerTimeMinusNowMSec', 0);
      this._serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);

      // Display "Next Stop" text
      this._untilNextMSec = null;
      this._severity = '';

      if (this._data) {
        this._refDateTime = null;
        //this._untilNextMSec = null;
        this._statusClass = 'cycleprogress-fill';
        let eventKind = '';

        if (this._data.ActiveEvents && this._data.ActiveEvents.length > 0) {
          // Manage active events (STOPPED)
          let event = this._data.ActiveEvents[0];
          this._refDateTime = new Date(event.DateTime);
          this._increase = true;
          this._severity = event.Severity.LevelName;
          eventKind = 'activeevent';
          let classesToAdd = eventKind + ' ' + this._severity;
          this._statusClass += ' ' + classesToAdd;
          $(this._content).find('.cycleprogressbar-nextstop').addClass(classesToAdd);

          this._untilNextMSec = this._refDateTime.getTime() - this._serverNow.getTime();

          // TEXTS
          $(this._spanNextstopMessage).html(event.Message);
          let textDuration = 'NOW';
          if (this._untilNextMSec != 0) {
            textDuration = pulseUtility.getTextDuration(-this._untilNextMSec / 1000);
          }
          $(this._spanNextstopDuration).html(textDuration);
        }
        else if (this._data.ComingEvents && this._data.ComingEvents.length > 0) {
          // Manage coming events (Stop in / End in...)
          let event = this._data.ComingEvents[0];
          this._refDateTime = new Date(event.DateTime);
          this._increase = false;
          this._severity = event.Severity.LevelName;
          eventKind = 'comingevent';
          let classesToAdd = eventKind + ' ' + this._severity;
          this._statusClass += ' ' + classesToAdd;
          $(this._content).find('.cycleprogressbar-nextstop').addClass(classesToAdd);

          this._untilNextMSec = this._refDateTime.getTime() - this._serverNow.getTime();

          if (this._untilNextMSec <= 0) {
            this._untilNextMSec = 0;
          }

          // TEXTS
          $(this._spanNextstopMessage).html(event.Message);
          let textDuration = 'NOW';
          if (this._untilNextMSec != 0) {
            textDuration = pulseUtility.getTextDuration(this._untilNextMSec / 1000);
          }
          $(this._spanNextstopDuration).html(textDuration);
        }
        else { // NO INFO
          $(this._spanNextstopMessage).html('-');
          $(this._spanNextstopDuration).html('');
        }

        let thresholdClass = '';
        // Find Status Color
        if (!this._increase) {
          if (this._untilNextMSec <= 0) { // STOP or cycle ends
            this._untilNextMSec = 0; // Forced
          }
          if (this._untilNextMSec / 1000 < this._threshold2) {
            thresholdClass = 'threshold2';
            // Change text color
            //$(this._content).find('.cycleprogressbar-nextstop').removeClass('threshold1');
            $(this._content).find('.cycleprogressbar-nextstop').addClass('class', thresholdClass);
            this._statusClass += ' ' + thresholdClass;
          }
          else if (this._untilNextMSec / 1000 < this._threshold1) {
            thresholdClass = 'threshold1';
            // Change text color
            //$(this._content).find('.cycleprogressbar-nextstop').removeClass('threshold2');
            $(this._content).find('.cycleprogressbar-nextstop').addClass('class', thresholdClass);
            this._statusClass += ' ' + thresholdClass;
          }
          else {
            // Change text color
            //$(this._content).find('.cycleprogressbar-nextstop').removeClass('threshold1');
            //$(this._content).find('.cycleprogressbar-nextstop').removeClass('threshold2');
          }
        }

        // Dispatch message for machine-tab
        eventBus.EventBus.dispatchToContext('nextStopStatusChange',
          this.element.getAttribute('status-context'), {
            'untilNextStopMSec': this._untilNextMSec,
            'thresholdClass': thresholdClass,
            'severity': this._severity,
            'eventKind': eventKind
          });

        // Display Bar
        if (this._data.Completion) {

          // CREATE SVG 
          let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
          //svg.setAttribute('width', this._barwidth); // NO ! for auto-adapt
          svg.setAttribute('height', this._height);
          svg.setAttribute('viewBox', '0 0 '
            + this._barwidth + ' ' + this._height);
          svg.setAttribute('preserveAspectRatio', 'none');
          svg.setAttribute('fill', '#000000');
          svg.setAttribute('class', 'cycleprogressbar-svg');

          if (this._progressbar != undefined) {
            $(this._progressbar).append(svg);
          }

          //(MAIN colored rect)
          let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
          rect.setAttribute('x', 0); // from left
          rect.setAttribute('y', 0);
          // TODO : use module completion ?? no
          rect.setAttribute('width', this._barwidth * this._data.Completion);
          rect.setAttribute('height', this._height);
          rect.setAttribute('class', this._statusClass);
          svg.appendChild(rect);

          // Vertical small lines - split bar by sequence duration percentage
          //for (let iMod = 0; iMod < this._data.ByMachineModule.length; iMod++) {
          if (1 == this._data.ByMachineModule.length) { // Only for 1 Module
            let iMod = 0;
            for (let iSeq = 0; iSeq < this._data.ByMachineModule[iMod].Sequences.length; iSeq++) {
              /*this._data.ByMachineModule[iMod].Sequences[iSeq].IsCurrent
              this._data.ByMachineModule[iMod].Sequences[iSeq].IsCompleted*/
              let xPos = this._barwidth * this._data.ByMachineModule[iMod].Sequences[iSeq].EndPercent;

              let aLine = document.createElementNS(pulseSvg.get_svgNS(), 'line');
              aLine.setAttribute('x1', xPos);
              aLine.setAttribute('y1', 0);
              aLine.setAttribute('x2', xPos);
              aLine.setAttribute('y2', this._height);
              //aLine.setAttribute('stroke-width', w);

              let seq = this._data.ByMachineModule[iMod].Sequences[iSeq];
              if (seq.Kind == 'Stop') {
                aLine.setAttribute('class', 'line-stop');
              }
              else if (seq.Kind == 'OptionalStop') {
                aLine.setAttribute('class', 'line-optional-stop');
              }
              else { // Machining or NonMachining
                aLine.setAttribute('class', 'line-default'); // = border color
                //aLine.setAttribute('stroke-dasharray', '3');
              }
              svg.appendChild(aLine);
            } // end for
          } // end for 
        }
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this._drawEmpty();
          this.start();
          break;
        case 'height':
          this._setHeight();
          break;
        case 'threshold1':
          if (pulseUtility.isInteger(newVal)) {
            this._threshold1 = Number(newVal);
          }
          if (this._threshold2 > this._threshold1) {
            let inter = this._threshold2
            this._threshold2 = this._threshold1;
            this._threshold1 = inter;
          }
          //this.start();
          break;
        case 'threshold2':
          if (pulseUtility.isInteger(newVal)) {
            this._threshold1 = Number(newVal);
          }
          if (this._threshold2 > this._threshold1) {
            let inter = this._threshold2
            this._threshold2 = this._threshold1;
            this._threshold1 = inter;
          }
          //this.start();
          break;
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal',
            newVal,
            this.onMachineIdChange.bind(this));
          break;
        case 'status-context': // 'nextStopStatusChange'
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-lastbar');

      let defaultThreshold1 = 600; // in seconds -> same as tagConfig !
      let defaultThreshold2 = 180; // in seconds -> same as tagConfig !
      this._threshold1 = Number(this.getConfigOrAttribute('threshold1', defaultThreshold1));
      this._threshold2 = Number(this.getConfigOrAttribute('threshold2', defaultThreshold2));
      if (this._threshold2 > this._threshold1) {
        let inter = this._threshold2
        this._threshold2 = this._threshold1;
        this._threshold1 = inter;
      }

      // Update here some internal parameters
      this._setHeight();

      // listeners
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._progressbar = $('<div></div>').addClass('cycleprogressbar-progressbar');
      this._progressbar.height(this._height);
      this._spanNextstopMessage = $('<span></span>').addClass('cycleprogressbar-nextstop-message');
      this._spanNextstopDuration = $('<span></span>').addClass('cycleprogressbar-nextstop-duration');
      let divNextstop = $('<div></div>').addClass('cycleprogressbar-nextstop').append(this._spanNextstopMessage).append(this._spanNextstopDuration);

      this._content = $('<div></div>').addClass('cycleprogressbar-content')
        .addClass('pulse-cellbar-main') // To be opacified in case of error
        .append(this._progressbar)
        .append(divNextstop);

      $(this.element)
        .addClass('cycleprogressbar')
        .append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      this._progressbar = undefined;
      this._spanNextstopMessage = undefined;
      this._spanNextstopDuration = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
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

      this.switchToNextContext();
    }

    displayError (message) {
      /*if ('NO_DATA' == statusString) {
      errorMessage = 'No available next stop information';
    } => ?? */
      $(this._messageSpan).html(message);

      //$(this._progressbar).hide();
    }

    removeError () {
      this.displayError('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let url = 'CycleProgress?MachineId='
        + this.element.getAttribute('machine-id')
        + '&IncludeEvents=true';
      return url;
    }

    refresh (data) {
      this._data = data;
      if (data.NoEffectiveOperation || data.InvalidCycle) {
        // No useful data
        this._drawEmpty();
      }
      else {
        $(this._progressbar).show();
        this._draw();
      }
    }

    manageSuccess (data) {
      $(this.element).parent('.pulse-bar-div').show(); // To cancel NotApplicable
      $(this._content).show();

      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    manageNotApplicable () {
      $(this.element).parent('.pulse-bar-div').hide();

      eventBus.EventBus.dispatchToContext('nextStopStatusChange',
        this.element.getAttribute('status-context'), {});

      super.manageNotApplicable(); // To hide
    }

    /**
     * @override
     */
    manageError (data) {
      // Reset
      eventBus.EventBus.dispatchToContext('nextStopStatusChange',
        this.element.getAttribute('status-context'), {});
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure (isTimeout, xhrStatus) {
      if (!isTimeout) {
        // Reset
        eventBus.EventBus.dispatchToContext('nextStopStatusChange',
          this.element.getAttribute('status-context'), {});
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
  }

  pulseComponent.registerElement('x-cycleprogressbar', CycleProgressBarComponent, ['machine-id', 'height', 'threshold1', 'threshold2', 'machine-context', 'status-context']);
})();
