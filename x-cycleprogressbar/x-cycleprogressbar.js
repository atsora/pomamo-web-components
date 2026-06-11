// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-cycleprogressbar
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseConfig from 'pulseConfig';
import * as pulseSvg from 'pulseSvg';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-cycleprogressbar>` — horizontal SVG bar for the current cycle's
   * progress, with a next-stop indicator.
   *
   * Polls `CycleProgress?MachineId=<id>&IncludeEvents=true` at
   * `currentRefreshSeconds` interval. Renders a coloured `<rect>` filled to
   * `data.Completion` plus vertical separator lines for each sequence
   * (`Machining` / `NonMachining` / `Stop` / `OptionalStop`) and a "next stop"
   * message + duration text. Status classes (`activeevent` / `comingevent`,
   * severity name, `threshold1` / `threshold2` for the configurable seconds
   * thresholds) are applied to both the fill rect and the next-stop block. The
   * resolved next-stop state (time, threshold, severity, event kind) is also
   * dispatched as `nextStopStatusChange` on `status-context`. Clock drift is
   * corrected via `pulseConfig.diffServerTimeMinusNowMSec`. Reacts to
   * `machineIdChangeSignal` on `machine-context`.
   *
   * @element x-cycleprogressbar
   * @attr {number}  machine-id      (required) machine id
   * @attr {number}  height          bar height in px (default 30, min 5)
   * @attr {number}  threshold1      seconds threshold for the first warning class (default 600)
   * @attr {number}  threshold2      seconds threshold for the urgent warning class (default 180)
   * @attr {string}  machine-context event-bus context for `machineIdChangeSignal`
   * @attr {string}  status-context  event-bus context where `nextStopStatusChange` is dispatched
   * @fires nextStopStatusChange     `{ untilNextStopMSec, thresholdClass, severity, eventKind }`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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
        this._progressbar.style.height = this._height + 'px';
      }
    }

    _drawEmpty () {
      let svg = this._content.querySelector('.cycleprogressbar-svg');
      if (svg) svg.remove(); // Remove Old SVG
      this._spanNextstopMessage.textContent = '';
      this._spanNextstopDuration.textContent = '';

      [...this.element.querySelectorAll('.threshold1')].forEach(el => el.classList.remove('threshold1'));
      [...this.element.querySelectorAll('.threshold2')].forEach(el => el.classList.remove('threshold2'));
      [...this.element.querySelectorAll('.activeevent')].forEach(el => el.classList.remove('activeevent'));
      [...this.element.querySelectorAll('.comingevent')].forEach(el => el.classList.remove('comingevent'));
    }

    _draw () {

      if ((this._content == undefined) || (this._content == null)) {
        //this._content.style.height = this._height + 'px';
        return;
      }
      this._drawEmpty();

      let width = this._content.offsetWidth;
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
          this._content.querySelector('.cycleprogressbar-nextstop').classList.add(...classesToAdd.split(' '));

          this._untilNextMSec = this._refDateTime.getTime() - this._serverNow.getTime();

          // TEXTS
          this._spanNextstopMessage.textContent = event.Message;
          let textDuration = 'NOW';
          if (this._untilNextMSec != 0) {
            textDuration = pulseUtility.getTextDuration(-this._untilNextMSec / 1000);
          }
          this._spanNextstopDuration.textContent = textDuration;
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
          this._content.querySelector('.cycleprogressbar-nextstop').classList.add(...classesToAdd.split(' '));

          this._untilNextMSec = this._refDateTime.getTime() - this._serverNow.getTime();

          if (this._untilNextMSec <= 0) {
            this._untilNextMSec = 0;
          }

          // TEXTS
          this._spanNextstopMessage.textContent = event.Message;
          let textDuration = 'NOW';
          if (this._untilNextMSec != 0) {
            textDuration = pulseUtility.getTextDuration(this._untilNextMSec / 1000);
          }
          this._spanNextstopDuration.textContent = textDuration;
        }
        else { // NO INFO
          this._spanNextstopMessage.textContent = '-';
          this._spanNextstopDuration.textContent = '';
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
            //this._content.querySelector('.cycleprogressbar-nextstop').classList.remove('threshold1');
            this._content.querySelector('.cycleprogressbar-nextstop').classList.add(thresholdClass);
            this._statusClass += ' ' + thresholdClass;
          }
          else if (this._untilNextMSec / 1000 < this._threshold1) {
            thresholdClass = 'threshold1';
            // Change text color
            //this._content.querySelector('.cycleprogressbar-nextstop').classList.remove('threshold2');
            this._content.querySelector('.cycleprogressbar-nextstop').classList.add(thresholdClass);
            this._statusClass += ' ' + thresholdClass;
          }
          else {
            // Change text color
            //this._content.querySelector('.cycleprogressbar-nextstop').classList.remove('threshold1');
            //this._content.querySelector('.cycleprogressbar-nextstop').classList.remove('threshold2');
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
            this._progressbar.appendChild(svg);
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._progressbar = document.createElement('div');
      this._progressbar.classList.add('cycleprogressbar-progressbar');
      this._progressbar.style.height = this._height + 'px';

      this._spanNextstopMessage = document.createElement('span');
      this._spanNextstopMessage.classList.add('cycleprogressbar-nextstop-message');

      this._spanNextstopDuration = document.createElement('span');
      this._spanNextstopDuration.classList.add('cycleprogressbar-nextstop-duration');

      let divNextstop = document.createElement('div');
      divNextstop.classList.add('cycleprogressbar-nextstop');
      divNextstop.appendChild(this._spanNextstopMessage);
      divNextstop.appendChild(this._spanNextstopDuration);

      this._content = document.createElement('div');
      this._content.classList.add('cycleprogressbar-content');
      this._content.classList.add('pulse-cellbar-main'); // To be opacified in case of error
      this._content.appendChild(this._progressbar);
      this._content.appendChild(divNextstop);

      this.element.classList.add('cycleprogressbar');
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

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();
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
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      /*if ('NO_DATA' == statusString) {
      errorMessage = 'No available next stop information';
    } => ?? */
      this._messageSpan.innerHTML = message;

      //this._progressbar.style.display = 'none';
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
        this._progressbar.style.display = '';
        this._draw();
      }
    }

    manageSuccess (data) {
      let barDiv = this.element.parentElement;
      if (barDiv && barDiv.classList.contains('pulse-bar-div')) {
        barDiv.style.display = '';
      }
      this._content.style.display = '';

      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    manageNotApplicable () {
      let barDiv = this.element.parentElement;
      if (barDiv && barDiv.classList.contains('pulse-bar-div')) {
        barDiv.style.display = 'none';
      }

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
