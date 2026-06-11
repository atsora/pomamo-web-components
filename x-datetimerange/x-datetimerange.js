// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-datetimerange
 * @requires module:pulseComponent
 */

import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseRange from 'pulseRange';
import * as pulseSvg from 'pulseSvg';
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';
import * as pulseComponent from 'pulsecomponent';

import 'x-datetimepicker/x-datetimepicker';

(function () {

  /**
   * `<x-datetimerange>` — datetime-range display + zoom/prev/next navigation.
   *
   * Renders the current begin/end of `range` with buttons to zoom in/out and to
   * step to the previous/next period of the same duration. Two display modes:
   * `range` (default, formatted plage with an "In progress" marker for an open
   * upper bound) and `shift` (uses `shift-label`). Clicking the range opens a
   * change-range dialog with two `<x-datetimepicker>` (bounded by `min-begin`,
   * `max-begin`, `min-end`, `max-end`). Dispatches `dateTimeRangeChangeEvent`
   * on `period-context` whenever the range changes; reacts to
   * `askForDateTimeRangeEvent` on the same context to re-emit the current
   * range, and to `dateTimeChangeEvent` on `datetime-context` for red-line
   * updates.
   *
   * @element x-datetimerange
   * @attr {string}  range            ISO datetime range `begin;end`
   * @attr {boolean} not-editable     disables navigation controls and read-only renders the range
   * @attr {boolean} possible-no-end  allows the end bound to be empty
   * @attr {string}  min-begin        ISO datetime bound for the begin input
   * @attr {string}  max-begin        ISO datetime bound for the begin input
   * @attr {string}  min-end          ISO datetime bound for the end input
   * @attr {string}  max-end          ISO datetime bound for the end input
   * @attr {string}  period-context   event-bus context for `dateTimeRangeChangeEvent` (and `askForDateTimeRangeEvent`)
   * @attr {string}  datetime-context event-bus context for `dateTimeChangeEvent`
   * @fires dateTimeRangeChangeEvent  `{ daterange }` on every range change
   * @method openChangeRange          programmatically opens the change-range dialog
   * @method getRangeString           current range as `begin;end` ISO string
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class ParamDateTimeRangeComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._beginDTP = undefined;
      self._endDTP = undefined;
      self._errorMessage = undefined;
      self._warningtext = '';

      self._dateRange = undefined;
      self._lastDispatch = undefined;
      self._nextDispatch = null;
      self._displayMode = 'range'; // 'range' (default, formatted plage with "In progress") | 'shift' (uses shift-label)

      self.methods = {
        'openChangeRange': self.openChangeRange,
        'getRangeString': self.getRangeString
      };

      return self;
    }

    //get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this,
              'askForDateTimeRangeEvent');
            eventBus.EventBus.addEventListener(this,
              'askForDateTimeRangeEvent', newVal,
              this.onAskForDateTimeRangeChange.bind(this));
          }
          break;
        case 'datetime-context': // red line
          eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeChangeEvent');
          eventBus.EventBus.addEventListener(this,
            'dateTimeChangeEvent', newVal,
            this.onDateTimeChange.bind(this));
          break;
        case 'min-begin':
        case 'max-begin':
        case 'min-end':
        case 'max-end':
          this._setBeginEndBound();
          break;
        case 'range':
          if (this.isInitialized()) {
            let newDateRange = pulseRange.createDateRangeFromString(newVal);
            // This code was in _updateDisplayAndDispatch. This method change attr
            if (undefined == this._dateRange
              || (!pulseRange.equals(newDateRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
              this._dateRange = newDateRange;
              this._displayRange();
              this._dispatchSignal();
            }
          }
          break;
        case 'possible-no-end': {
          if (this.isInitialized()) {
            if (this._endDTP != undefined) {
              if ((this.element.hasAttribute('possible-no-end')) &&
                (this.element.getAttribute('possible-no-end').toUpperCase() == 'TRUE')) {
                this._endDTP.setAttribute('nullable', true);
              }
              else {
                this._endDTP.removeAttribute('nullable');
              }
            }
          }
        } break;
        case 'not-editable':
          if (this.isInitialized()) {
            if (newVal == 'true') {
              let editable = this.element.querySelector('.datetimerange-editable');
              if (editable) editable.classList.remove('datetimerange-editable');
            }
            else {
              let display = this.element.querySelector('.datetimerange-display');
              if (display) display.classList.add('datetimerange-editable');
            }
            this._showHideButtons();
          }
          break;
        case 'hide-buttons':
          if (this.isInitialized()) {
            this._showHideButtons();
          }
          break;
        case 'display-mode':
          this._displayMode = newVal || 'range';
          if (this.isInitialized()) {
            this._displayRange();
          }
          break;
        case 'shift-label':
          if (this.isInitialized()) {
            this._displayRange();
          }
          break;
        // 'dialog-title' is read directly when opening the dialog — no live refresh needed
      } // end switch
    } // end attributeChangedWhenConnectedOnce

    initialize () {
      this.addClass('pulse-text');

      let _addButtonToToolbar = function (toolbar, btnClass) {
        let svg = document.createElement('div');
        svg.classList.add('datetimerange-btn', btnClass);
        let btn = document.createElement('li');
        btn.classList.add('datetimerange-li-btn');
        btn.appendChild(svg);
        toolbar.appendChild(btn);
        pulseSvg.inlineBackgroundSvg(svg);
        return btn;
      }

      // Single toolbar laid out as: [<] [date] [>]  [🔍+] [🔍-]
      let toolbar = document.createElement('ol');
      toolbar.classList.add('datetimerange-toolbar');

      // [<] previous
      let prev_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-previous');
      prev_btn.addEventListener('click',
        function () {
          this._clickAndChangeRange('previous');
        }.bind(this));

      // [date] range display wrapped in an <li> so it participates in the flex toolbar
      let rangedisplay = document.createElement('div');
      rangedisplay.classList.add('datetimerange-rangedisplay');

      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      rangedisplay.appendChild(loaderDiv);

      let display = document.createElement('div');
      display.classList.add('datetimerange-display');
      if (this.element.getAttribute('not-editable') != 'true') {
        display.classList.add('datetimerange-editable');
      }
      display.addEventListener('click',
        function (e) {
          if ((!this.element.hasAttribute('not-editable')) &&
            (this.element.getAttribute('not-editable') != 'true')) {
            this._displaySettingDialog();
          }
        }.bind(this)
      );
      rangedisplay.appendChild(display);

      let displayLi = document.createElement('li');
      displayLi.classList.add('datetimerange-li-display');
      displayLi.appendChild(rangedisplay);
      toolbar.appendChild(displayLi);

      // [>] next
      let next_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-next');
      next_btn.addEventListener('click',
        function () {
          this._clickAndChangeRange('next');
        }.bind(this));

      // Visual gap between navigation group and zoom group
      let spacer = document.createElement('li');
      spacer.classList.add('datetimerange-li-spacer');
      toolbar.appendChild(spacer);

      // [🔍+] zoom in
      let zoomin_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-zoomin');
      zoomin_btn.addEventListener('click',
        function () {
          this._clickAndChangeRange('zoomin');
        }.bind(this));

      // [🔍-] zoom out
      let zoomout_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-zoomout');
      zoomout_btn.addEventListener('click',
        function () {
          this._clickAndChangeRange('zoomout');
        }.bind(this));

      let div = document.createElement('div');
      div.classList.add('datetimerange');
      div.appendChild(toolbar);
      this.element.appendChild(div);

      // Listener and dispatchers
      if (this.element.hasAttribute('datetime-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeChangeEvent',
          this.element.getAttribute('datetime-context'),
          this.onDateTimeChange.bind(this));
      }
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'),
          this.onAskForDateTimeRangeChange.bind(this)); // Not Yet
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'askForDateTimeRangeEvent',
          this.onAskForDateTimeRangeChange.bind(this));
      }

      if (this._dateRange != undefined) {
        this._dispatchSignal(); // If not done in validate
      }

      this._showHideButtons();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      //this._dateRange = undefined; NO -> problem in save SN

      // DOM
      this.element.replaceChildren();

      super.clearInitialization();
    }

    validateParameters () {
      // Adopt the initial range if one is provided via the `range` attribute.
      // If neither `_dateRange` nor `range` is set, proceed without error: the
      // range will arrive later via `setAttribute('range', …)` (typical when
      // embedded in x-periodtoolbar, which fetches RangeAround asynchronously)
      // and trigger `attributeChangedWhenConnectedOnce`.
      if (!this._dateRange && this.element.hasAttribute('range')) {
        let newDateRange = pulseRange.createDateRangeFromString(this.element.getAttribute('range'));
        this._dateRange = newDateRange;
        this._displayRange();
        this._dispatchSignal(); // first dispatch — done here, not in initialize
      }
      this.switchToNextContext();
    }

    /**
     * Set an error on the component without displaying it
     *
     * @param {string} message - Error message to set
     */
    setError (message) {
      this._errorMessage = message;
    }

    /**
     * Show the error that has been previously stored
     */
    showError () { // To define because validateParameters is used
      this.displayError(this._errorMessage);
    }

    displayError (message) {
      let display = this.element.querySelector('.datetimerange-display');
      if (display) display.innerHTML = this.getTranslation('errorColon', 'Error: ');
    }
    removeError () {
      let display = this.element.querySelector('.datetimerange-display');
      if (display) display.innerHTML = '';
    }

    /////////////////////
    // Callback events //
    /////////////////////
    onAskForDateTimeRangeChange (event) {
      // (re)send begin/end
      this._dispatchSignal();
    }

    // Red line
    onDateTimeChange (event) {
      this.element.setAttribute('when', event.target.when);
    }

    ////////////////////
    // PUBLIC methods //
    ////////////////////
    openChangeRange (isSplit = false) {
      if (this.element.getAttribute('not-editable') != 'true') {
        this._displaySettingDialog(isSplit);
      }
    }

    getRangeString () {
      if (undefined == this._dateRange) {
        return '';
      }
      return pulseUtility.convertDateRangeForWebService(this._dateRange);
    }

    //////////////////////
    // Internal methods //
    //////////////////////
    /**
     * Show or Hide Buttons
     */
    _showHideButtons () {
      let btns = this.element.querySelectorAll('.datetimerange-li-btn');
      let show = (this.element.getAttribute('hide-buttons') != 'true') &&
        (this.element.getAttribute('not-editable') != 'true') &&
        ((this.element.getAttribute('min-begin') == undefined) || (this.element.getAttribute('min-begin') == null)) &&
        ((this.element.getAttribute('max-end') == undefined) || (this.element.getAttribute('max-end') == null));
      for (let i = 0; i < btns.length; i++) {
        btns[i].style.display = show ? '' : 'none';
      }
    }

    _displayRange () {
      let disp = this.element.querySelector('.datetimerange-display');
      // Read display-mode directly from attribute so the value is always current
      // even if the attribute was set before connection / before initialize().
      let displayMode = this.element.getAttribute('display-mode') || this._displayMode || 'range';
      if (displayMode === 'shift') {
        let shiftLabel = this.element.getAttribute('shift-label') || '';
        if (shiftLabel) {
          let span = document.createElement('span');
          span.className = 'datetimerange-display-shift';
          span.textContent = shiftLabel;
          if (disp != null) {
            disp.replaceChildren(span);
          }
          return;
        }
        // fallback to range format if no shift-label
      }
      if (disp != null) {
        disp.innerHTML = pulseUtility.displayDateRange(this._dateRange);
      }
    }
    /**
      * Dispatch signal, but not too often
      */
    _dispatchSignal () {
      if (!this._dateRange) {
        return;
      }
      if (!this.isInitialized()) {
        return;
      }
      if (this._lastDispatch == undefined) { // First time = do it now
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
            this.element.getAttribute('period-context'),
            {
              daterange: this._dateRange,
              stringrange: pulseUtility.convertDateRangeForWebService(this._dateRange)
            });
        }
        else {
          eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent',
            {
              daterange: this._dateRange,
              stringrange: pulseUtility.convertDateRangeForWebService(this._dateRange)
            });
        }
        this._lastDispatch = new Date();
        return;
      }
      let now = new Date();
      let msSinceLastDispatch = now.getTime() - this._lastDispatch.getTime();
      if (msSinceLastDispatch > 100) {// 0.1 sec
        console.log('x-datetimerange - REAL direct signal ');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
            this.element.getAttribute('period-context'),
            {
              daterange: this._dateRange,
              stringrange: pulseUtility.convertDateRangeForWebService(this._dateRange)
            });
        }
        else {
          eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent',
            {
              daterange: this._dateRange,
              stringrange: pulseUtility.convertDateRangeForWebService(this._dateRange)
            });
        }
        this._lastDispatch = now;
      }
      else {
        if (this._nextDispatch && this._nextDispatch > now) {
          console.log('x-datetimerange - signal already programmed');
          return;
        }
        this._nextDispatch = new Date(this._lastDispatch.getTime() + 100); // 0.1 sec
        let timeBeforeNextDispatch = this._nextDispatch.getTime() - now.getTime();
        // Deferred dispatch — coalesces multiple asks that arrive within the
        // 100ms throttle window (typical when an orchestrator clones N tiles
        // and each child bar dispatches askForDateTimeRangeEvent in sequence).
        // Previously this used a malformed IIFE (`function () { return function () {…}; }`)
        // that setTimeout invoked once, getting back the inner function but
        // never calling it — so any clone created within the throttle window
        // stayed stuck in "Missing range".
        setTimeout(() => {
          if (this.element.hasAttribute('period-context')) {
            eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
              this.element.getAttribute('period-context'),
              {
                daterange: this._dateRange,
                stringrange: pulseUtility.convertDateRangeForWebService(this._dateRange)
              });
          }
          else {
            eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent', {
              daterange: this._dateRange,
              stringrange: pulseUtility.convertDateRangeForWebService(this._dateRange)
            });
          }
          this._lastDispatch = new Date();
          this._nextDispatch = null;
        }, timeBeforeNextDispatch);
      }
    }

    /**
      * Update display of datetime range on widget and dispatch signal with
      * range
    */
    _updateDisplayAndDispatch (newDateRange) {
      // For outside access
      this.element.setAttribute('range',
        pulseUtility.convertDateRangeForWebService(newDateRange));
      // Will call :
      /*if (undefined == this._dateRange
          || (!pulseRange.equals(newDateRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._dateRange = newDateRange;
        this._displayRange();
        this._dispatchSignal();
      }*/
    }

    /**
     * Set MIN / MAX for begin & end DateTimePicker according to attributes
     */
    _setBeginEndBound () {
      // MIN BEGIN pulseUtility.convertDateToMoment().toDate()
      if (this._beginDTP != undefined) {
        // Min begin
        if (this.element.hasAttribute('min-begin')) {
          this._beginDTP.setAttribute('mindatetime', this.element.getAttribute('min-begin'));
        }
        else {
          this._beginDTP.removeAttribute('mindatetime');
        }
        // Max begin
        if (this.element.hasAttribute('max-begin')) {
          this._beginDTP.setAttribute('maxdatetime', this.element.getAttribute('max-begin'));
        }
        else {
          if (this.element.hasAttribute('max-end')) {
            this._beginDTP.setAttribute('maxdatetime', this.element.getAttribute('max-end'));
          }
          else {
            this._beginDTP.removeAttribute('maxdatetime');
          }
        }
      }

      if (this._endDTP != undefined) {
        // Min end
        if (this.element.hasAttribute('min-end')) {
          this._endDTP.setAttribute('mindatetime', this.element.getAttribute('min-end'));
        }
        else {
          if (this.element.hasAttribute('min-begin')) {
            this._endDTP.setAttribute('mindatetime', this.element.getAttribute('min-begin'));
          }
          else {
            this._endDTP.removeAttribute('mindatetime');
          }
        }

        // Max end
        if (this.element.hasAttribute('max-end')) {
          this._endDTP.setAttribute('maxdatetime', this.element.getAttribute('max-end'));
        }
        else {
          this._endDTP.removeAttribute('maxdatetime');
        }
      }
      this._showHideButtons();
    } // end _setBeginEndBound


    /**
      * Click on 1 button and change range according to the button type
      * clickedButton = string 'previous', 'next', 'zoomin' or 'zoomout'
    */
    _clickAndChangeRange (clickedButton) {
      let begin = moment(this._dateRange.lower);
      //begin.local();

      let end = (new Date()).getTime(); // Init default = NOW
      let duration = end - begin; // Init = duration between begin and NOW
      let newEndMoment = moment();
      if (this._dateRange.upper) { // If end exists, use it
        end = moment(this._dateRange.upper);
        duration = end - begin;
        if (clickedButton == 'previous') {
          newEndMoment = moment(begin);
        }
        else if (clickedButton == 'next') {
          newEndMoment = moment((end + duration));
        }
        else if (clickedButton == 'zoomin') {
          if (this.element.hasAttribute('datetime-context')) {
            // Special around red line in details page
            end = pulseUtility.convertDateToMoment(this.element.getAttribute('when')).valueOf();
            newEndMoment = moment(end + (duration / 4));
          }
          else {
            newEndMoment = moment(end - (duration / 4));
          }
        }
        else if (clickedButton == 'zoomout') {
          if (this.element.hasAttribute('datetime-context')) {
            // Special around red line in details page
            end = pulseUtility.convertDateToMoment(this.element.getAttribute('when')).valueOf();
            newEndMoment = moment(end + duration);
          }
          else {
            newEndMoment = moment(end + (duration / 2));
          }
        }
        else {
          // oups ! // should add log here
          return;
        }
      }
      let newBeginMoment = moment();
      if (clickedButton == 'previous') {
        newBeginMoment = moment((begin - duration));
      }
      else if (clickedButton == 'next') {
        newBeginMoment = moment(end);
      }
      else if (clickedButton == 'zoomin') {
        if (this.element.hasAttribute('datetime-context')) {
          // Special around red line in details page
          begin = pulseUtility.convertDateToMoment(this.element.getAttribute('when')).valueOf();
          newBeginMoment = moment(begin - (duration / 4));
        }
        else {
          newBeginMoment = moment(begin + (duration / 4));
        }
      }
      else if (clickedButton == 'zoomout') {
        if (this.element.hasAttribute('datetime-context')) {
          // Special around red line in details page
          begin = pulseUtility.convertDateToMoment(this.element.getAttribute('when')).valueOf();
          newBeginMoment = moment(begin - duration);
        }
        else {
          newBeginMoment = moment(begin - (duration / 2));
        }
      }
      else {
        // oups ! // should add log here
        return;
      }
      let newBeginDate = newBeginMoment.toDate();
      let newEndDate = newEndMoment.toDate();
      let newDateRange = pulseRange.createDefaultInclusivity(newBeginDate, newEndDate);
      this._updateDisplayAndDispatch(newDateRange);
    } // End clickAndChangeRange

    /**
     * Display to change date time range
     */
    _displaySettingDialog (isSplit = false) {
      let possibleNoEnd = (this.element.hasAttribute('possible-no-end')) &&
        (this.element.getAttribute('possible-no-end').toUpperCase() == 'TRUE');

      // Are seconds mandatory ?
      let secondsMandatory = (this._dateRange.lower.getSeconds() != 0)
        || (this._dateRange.upper != null && this._dateRange.upper.getSeconds() != 0);

      // Info div, on top
      this._infotext = document.createElement('span');
      this._infotext.className = 'datetimerange-dialog-span-info';
      let infodiv = document.createElement('div');
      infodiv.className = 'datetimerange-dialog-div-info';
      infodiv.appendChild(this._infotext);
      let infoText = '';
      if (isSplit) {
        if (this.element.hasAttribute('min-begin')) {
          let min = pulseUtility.displayDate(this.element.getAttribute('min-begin'), secondsMandatory);
          if (this.element.hasAttribute('max-end')) {
            let max = pulseUtility.displayDate(this.element.getAttribute('max-end'), secondsMandatory);
            infoText = this.getTranslation('selectBetween', 'Select period between ') + min + this.getTranslation('selectAnd', ' and ') + max;
          }
          else {
            infoText = this.getTranslation('selectFrom', 'Select period from ') + min;
          }
        }
      }
      this._infotext.innerHTML = infoText;

      // Warning message
      this._warningtext = document.createElement('span');
      this._warningtext.className = 'datetimerange-dialog-span-warning';
      let warningdiv = document.createElement('div');
      warningdiv.className = 'datetimerange-dialog-div-warning';
      warningdiv.appendChild(this._warningtext);

      // BEGIN DTP
      let begintimepickerOptions = {};
      begintimepickerOptions.defaultdatetime = pulseUtility.convertDateForWebService(this._dateRange.lower);
      begintimepickerOptions.nullable = false;
      if (this.element.hasAttribute('min-begin')) {
        begintimepickerOptions.mindatetime = this.element.getAttribute('min-begin');
      }
      if (this.element.hasAttribute('max-begin')) {
        begintimepickerOptions.maxdatetime = this.element.getAttribute('max-begin');
      }
      else {
        if (this.element.hasAttribute('max-end')) {
          begintimepickerOptions.maxdatetime = this.element.getAttribute('max-end');
        }
      }
      if (secondsMandatory) {
        begintimepickerOptions.showseconds = 'show-seconds';
      }

      this._beginDTP = pulseUtility.createElementWithAttribute('x-datetimepicker',
        begintimepickerOptions);
      this._beginDTP.addEventListener('change', this.onChangeDateTime.bind(this), false);

      let beginDiv = document.createElement('div');
      beginDiv.className = 'datetimepicker-begindiv';
      beginDiv.appendChild(this._beginDTP);
      let divinputbegin = document.createElement('div');
      divinputbegin.className = 'datetimerange-dialog-divinputbegin';
      divinputbegin.appendChild(beginDiv);

      // END DTP — always has a concrete value; "no end" managed by external checkbox
      let endDefault = (this._dateRange.upper != null)
        ? pulseUtility.convertDateForWebService(this._dateRange.upper)
        : pulseUtility.convertDateForWebService(new Date());
      let endtimepickerOptions = {
        defaultdatetime: endDefault,
        nullable: false
      };
      if (this.element.getAttribute('min-end')) {
        endtimepickerOptions.mindatetime = this.element.getAttribute('min-end');
      }
      else if (this.element.getAttribute('min-begin')) {
        endtimepickerOptions.mindatetime = this.element.getAttribute('min-begin');
      }
      if (this.element.getAttribute('max-end')) {
        endtimepickerOptions.maxdatetime = this.element.getAttribute('max-end');
      }
      if (secondsMandatory) {
        endtimepickerOptions.showseconds = 'show-seconds';
      }

      this._endDTP = pulseUtility.createElementWithAttribute('x-datetimepicker',
        endtimepickerOptions);
      this._endDTP.addEventListener('change', this.onChangeDateTime.bind(this), false);

      let endDiv = document.createElement('div');
      endDiv.className = 'datetimepicker-enddiv';
      endDiv.appendChild(this._endDTP);
      let divinputend = document.createElement('div');
      divinputend.className = 'datetimerange-dialog-divinputend';
      divinputend.appendChild(endDiv);

      // NO-END CHECKBOX — shown only when possible-no-end is set
      this._noEndCheckbox = null;
      let noEndDiv = null;
      if (possibleNoEnd) {
        let isNoEnd = (this._dateRange.upper == null);
        let checkboxId = 'dtr-noend-' + Date.now().toString(36);
        this._noEndCheckbox = document.createElement('input');
        this._noEndCheckbox.type = 'checkbox';
        this._noEndCheckbox.id = checkboxId;
        if (isNoEnd) {
          this._noEndCheckbox.checked = true;
          endDiv.classList.add('datetimerange-dtp-disabled');
        }
        let noEndLabel = document.createElement('label');
        noEndLabel.setAttribute('for', checkboxId);
        noEndLabel.innerHTML = this.getTranslation('noEnd', 'No end date');
        noEndDiv = document.createElement('div');
        noEndDiv.className = 'datetimerange-dialog-noend';
        noEndDiv.appendChild(this._noEndCheckbox);
        noEndDiv.appendChild(noEndLabel);

        this._noEndCheckbox.addEventListener('change', () => {
          let checked = this._noEndCheckbox.checked;
          endDiv.classList.toggle('datetimerange-dtp-disabled', checked);
          this.onChangeDateTime();
        });
      }

      let pickersRow = document.createElement('div');
      pickersRow.className = 'datetimerange-dialog-pickers-row';
      pickersRow.appendChild(divinputbegin);
      pickersRow.appendChild(divinputend);

      let divinput = document.createElement('div');
      divinput.className = 'datetimerange-dialog-divinput';
      divinput.appendChild(infodiv);
      divinput.appendChild(pickersRow);
      if (noEndDiv) {
        divinput.appendChild(noEndDiv);
      }
      divinput.appendChild(warningdiv);

      // ADD BOUNDS
      this._setBeginEndBound();

      let customTitle = this.element.getAttribute('dialog-title');
      this._settingsDialogId = pulseCustomDialog.openDialog(divinput, {
        title: customTitle
          || (isSplit ? this.getTranslation('splitPeriod', 'Split a period')
                      : this.getTranslation('selectPeriod', 'Select a period')),
        onOk: function () {
          if (this._callback_validate_settings()) {
            pulseCustomDialog.close('.datetimerange-dialog-divinput');
          }
        }.bind(this),
        onCancel: function () {
          pulseCustomDialog.close('.datetimerange-dialog-divinput');
        }.bind(this),
        autoClose: false,
        autoDelete: true
      });
    }

    /**
     * Callback called when datetime is modified
     * To display warning message or not
     */
    onChangeDateTime () {
      let isNoEnd = this._noEndCheckbox && this._noEndCheckbox.checked;
      let okBtn = document.querySelector('#' + this._settingsDialogId + ' .customDialogOk');

      if (!this._beginDTP.isValid() || (!isNoEnd && !this._endDTP.isValid())) {
        this._warningtext.innerHTML = this.getTranslation('invalidDatesError', 'Please, input valid dates');
        if (okBtn) okBtn.setAttribute('disabled', 'disabled');
        return;
      }
      if (isNoEnd) {
        this._warningtext.innerHTML = '';
        if (okBtn) okBtn.removeAttribute('disabled');
        return;
      }
      let begin = new Date(this._beginDTP.getISOValue());
      let end = new Date(this._endDTP.getISOValue());
      if (end < begin) {
        this._warningtext.innerHTML = this.getTranslation('endBeforeStartError', 'End date/time is before start date/time');
        if (okBtn) okBtn.setAttribute('disabled', 'disabled');
        return;
      }
      if (end > begin) {
        this._warningtext.innerHTML = '';
        if (okBtn) okBtn.removeAttribute('disabled');
        return;
      }
      else {
        this._warningtext.innerHTML = this.getTranslation('emptyPeriodMessage', 'Warning! Empty period');
        if (okBtn) okBtn.setAttribute('disabled', 'disabled');
        return;
      }
    }

    /**
     * Callback (called after validate button)
     */
    _callback_validate_settings () {
      if (!this._beginDTP.isValid()) {
        pulseCustomDialog.openDialog(this.getTranslation('startNotValidError', 'Start date/time is not valid.'), { type: 'Error' });
        return false;
      }
      if (!this._endDTP.isValid()) {
        pulseCustomDialog.openDialog(this.getTranslation('endNotValidError', 'End date/time is not valid.'), { type: 'Error' });
        return false;
      }

      let beginDateTime = new Date(this._beginDTP.getISOValue());
      let isNoEnd = this._noEndCheckbox && this._noEndCheckbox.checked;
      let endDateTime = isNoEnd ? null : new Date(this._endDTP.getISOValue());

      // Is min date in the limits?
      if (this.element.hasAttribute('min-begin') &&
        this.element.getAttribute('min-begin') !== null) {
        let minBeginDate = new Date(this.element.getAttribute('min-begin'));
        if (beginDateTime < minBeginDate) {
          pulseCustomDialog.openDialog(this.getTranslation('startBeforeMinError', 'Start date/time is before minimum allowed date/time'), { type: 'Error' });
          return false;
        }
      }
      if (this.element.hasAttribute('max-begin') &&
        this.element.getAttribute('max-begin') != null) {
        let maxBeginDate = new Date(this.element.getAttribute('max-begin'));
        if (beginDateTime > maxBeginDate) {
          pulseCustomDialog.openDialog(this.getTranslation('startAfterMaxError', 'Start date/time is after maximum allowed date/time'), { type: 'Error' });
          return false;
        }
      }
      // Is max date in the limits?
      if (this.element.hasAttribute('min-end') &&
        this.element.getAttribute('min-end') != null) {
        let minEndDate = new Date(this.element.getAttribute('min-end'));
        if ((endDateTime) && (endDateTime < minEndDate)) {
          pulseCustomDialog.openDialog(this.getTranslation('endBeforeMinError', 'End date/time is before minimum allowed date/time'), { type: 'Error' });
          return false;
        }
      }
      if (this.element.hasAttribute('max-end') &&
        this.element.getAttribute('max-end') != null) {
        let maxEndDate = new Date(this.element.getAttribute('max-end'));
        if ((endDateTime) && (endDateTime > maxEndDate)) {
          pulseCustomDialog.openDialog(this.getTranslation('endAfterMaxError', 'End date/time is after maximum allowed date/time'), { type: 'Error' });
          return false;
        }
      }

      // Check the range
      if (endDateTime) {
        if (endDateTime < beginDateTime) {
          pulseCustomDialog.openDialog(this.getTranslation('endBeforeStartError', 'End date/time is before start date/time'), { type: 'Error' });
          return false;
        }
        else {
          if (beginDateTime < endDateTime) {
            // Do nothing = it is OK
          }
          else {
            pulseCustomDialog.openDialog(this.getTranslation ('emptyPeriodError', 'Empty period'), { type: 'Error' });
            return false;
          }
        }
      }

      let newDateRange = pulseRange.createDefaultInclusivity(beginDateTime, endDateTime);
      this._updateDisplayAndDispatch(newDateRange);

      return true;
    } // end _callback_validate_settings

  }

  pulseComponent.registerElement('x-datetimerange', ParamDateTimeRangeComponent, ['period-context', 'datetime-context', 'min-begin', 'max-begin',
    'min-end', 'max-end', 'range', 'possible-no-end', 'not-editable', 'hide-buttons',
    'display-mode', 'shift-label']);
})();
