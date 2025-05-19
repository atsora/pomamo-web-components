// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-datetimerange is used to display datetime range.
 * This tag allow <em>zoom in</em> and <em>zoom out</em> through current datetime range.
 * It is also possible to go to previous or next period.
 * 
 * @module x-datetimerange
 * @requires module:pulseComponent
 */

var pulseCustomDialog = require('pulseCustomDialog');
var pulseRange = require('pulseRange');
var pulseSvg = require('pulseSvg');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');
var pulseComponent = require('pulsecomponent');

require('x-datetimepicker/x-datetimepicker');

/**
 * Build a custom tag <x-datetimerange> with attributes
 */
(function () {

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
                this._endDTP[0].setAttribute('nullable', true);
              }
              else {
                this._endDTP[0].removeAttribute('nullable');
              }
            }
          }
        } break;
        case 'not-editable':
          if (this.isInitialized()) {
            if (newVal == 'true') {
              let editable = $(this.element).find('datetimerange-editable');
              editable.removeClass('datetimerange-editable');
            }
            else {
              let display = $(this.element).find('datetimerange-display');
              display.addClass('datetimerange-editable');
            }
            this._showHideButtons();
          }
          break;
        case 'hide-buttons':
          if (this.isInitialized()) {
            this._showHideButtons();
          }
          break;
      } // end switch
    } // end attributeChangedWhenConnectedOnce

    initialize () {
      this.addClass('pulse-text');

      // 1. TOOLBAR
      let _addButtonToToolbar = function (toolbar, btnClass) {
        let svg = $('<div></div>').addClass('datetimerange-btn').addClass(btnClass);
        let btn = $('<li></li>').addClass('datetimerange-li-btn').append(svg);
        toolbar.append(btn);
        pulseSvg.inlineBackgroundSvg(svg);
        return btn;
      }

      // Create container
      let toolbar = $('<ol></ol>').addClass('datetimerange-toolbar');

      // Button previous
      let prev_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-previous');
      prev_btn.click(
        function () {
          this._clickAndChangeRange('previous');
        }.bind(this));

      // Button zoom in
      let zoomin_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-zoomin');
      zoomin_btn.click(
        function () {
          this._clickAndChangeRange('zoomin');
        }.bind(this));

      // Button zoom out
      let zoomout_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-zoomout');
      zoomout_btn.click(
        function () {
          this._clickAndChangeRange('zoomout');
        }.bind(this));

      // Button next
      let next_btn = _addButtonToToolbar(toolbar, 'datetimerange-button-next');
      next_btn.click(
        function () {
          this._clickAndChangeRange('next');
        }.bind(this));

      // 2. RANGE DISPLAY

      // Create container
      let rangedisplay = $('<div></div>').addClass('datetimerange-rangedisplay');

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      rangedisplay.append(loaderDiv);
      // Create DOM - message for error
      /*this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      rangedisplay.append(messageDiv);*/

      // Display
      let display = $('<div></div>').addClass('datetimerange-display');
      if (this.element.getAttribute('not-editable') != 'true') {
        display.addClass('datetimerange-editable');
      }
      display.click(
        function (e) {
          if ((!this.element.hasAttribute('not-editable')) &&
            (this.element.getAttribute('not-editable') != 'true')) {
            this._displaySettingDialog();
          }
        }.bind(this)
      );
      rangedisplay.append(display);

      // 3. FULL DATETIME RANGE
      let div = $('<div></div>').addClass('datetimerange')
        .append(rangedisplay).append(toolbar);
      $(this.element).append(div);

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
      $(this.element).empty();

      super.clearInitialization();
    }

    validateParameters () {
      if (!this._dateRange) {
        if (this.element.hasAttribute('range')) {
          let newDateRange = pulseRange.createDateRangeFromString(this.element.getAttribute('range'));
          // == this._updateDisplayAndDispatch (newDateRange); without dispatch
          if (undefined == this._dateRange
            || (!pulseRange.equals(newDateRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
            this._dateRange = newDateRange;
            this._displayRange();
            this._dispatchSignal(); // can not be done in validate (no dispatcher created yet)
          }
        }
        else {
          console.error('missing range in datetime range');
          this.displayError('missing range'); // delayed error message
          return;
        }
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
      $(this.element).find('datetimerange-display').html('Error');
    }
    removeError () {
      $(this.element).find('datetimerange-display').html('');
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
      /* let prev_btn = $(this.element).find('.datetimerange-button-previous');
      let next_btn = $(this.element).find('.datetimerange-button-next');
      let zoomout_btn = $(this.element).find('.datetimerange-button-zoomout');
      let zoomin_btn = $(this.element).find('.datetimerange-button-zoomin');*/

      if ((this.element.getAttribute('hide-buttons') != 'true') &&
        (this.element.getAttribute('not-editable') != 'true') &&
        ((this.element.getAttribute('min-begin') == undefined) || (this.element.getAttribute('min-begin') == null)) &&
        ((this.element.getAttribute('max-end') == undefined) || (this.element.getAttribute('max-end') == null))) {
        // Show Btns
        $(this.element).find('.datetimerange-li-btn').show();
      }
      else {
        // Hide Btns
        $(this.element).find('.datetimerange-li-btn').hide();
      }
    }

    _displayRange () {
      //$(this.element).find('.datetimerange-display').html(pulseUtility.displayDateRange(this._dateRange));
      let text = pulseUtility.displayDateRange(this._dateRange);
      let disp = $(this.element).find('.datetimerange-display');
      $(disp).html(text);
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
        console.log('x-datetimerange - signal in ' + timeBeforeNextDispatch + 'msec');
        setTimeout(function () { // to avoid closure
          return function () {
            console.log('x-datetimerange - REAL signal ');

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
          };
        }.bind(this)
          , timeBeforeNextDispatch);
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
          this._beginDTP[0].setAttribute('mindatetime', this.element.getAttribute('min-begin'));
        }
        else {
          this._beginDTP[0].removeAttribute('mindatetime');
        }
        // Max begin
        if (this.element.hasAttribute('max-begin')) {
          this._beginDTP[0].setAttribute('maxdatetime', this.element.getAttribute('max-begin'));
        }
        else {
          if (this.element.hasAttribute('max-end')) {
            this._beginDTP[0].setAttribute('maxdatetime', this.element.getAttribute('max-end'));
          }
          else {
            this._beginDTP[0].removeAttribute('maxdatetime');
          }
        }
      }

      if (this._endDTP != undefined) {
        // Min end
        if (this.element.hasAttribute('min-end')) {
          this._endDTP[0].setAttribute('mindatetime', this.element.getAttribute('min-end'));
        }
        else {
          if (this.element.hasAttribute('min-begin')) {
            this._endDTP[0].setAttribute('mindatetime', this.element.getAttribute('min-begin'));
          }
          else {
            this._endDTP[0].removeAttribute('mindatetime');
          }
        }

        // Max end
        if (this.element.hasAttribute('max-end')) {
          this._endDTP[0].setAttribute('maxdatetime', this.element.getAttribute('max-end'));
        }
        else {
          this._endDTP[0].removeAttribute('maxdatetime');
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
      //let dialogbox = $('<div></div>').addClass('datetimerange-dialog');

      // Are seconds mandatory ?
      let secondsMandatory = (this._dateRange.lower.getSeconds() != 0)
        || (this._dateRange.upper.getSeconds() != 0);

      // Info div, on top      
      this._infotext = $('<span></span>').addClass('datetimerange-dialog-span-info');
      let infodiv = $('<div></div>').addClass('datetimerange-dialog-div-info')
        .append(this._infotext);
      let infoText = '';
      if (isSplit) {
        if (this.element.hasAttribute('min-begin')) {
          let min = pulseUtility.displayDate(this.element.getAttribute('min-begin'), secondsMandatory);
          if (this.element.hasAttribute('max-end')) {
            let max = pulseUtility.displayDate(this.element.getAttribute('max-end'), secondsMandatory);
            infoText = this.getTranslation ('selectBetween', 'Select period between ') + min + this.getTranslation ('selectAnd', ' and ') + max;
          }
          else {
            infoText = this.getTranslation ('selectFrom', 'Select period from ') + min;
          }
        }
      }
      this._infotext.html(infoText);

      // Warning message      
      this._warningtext = $('<span></span>').addClass('datetimerange-dialog-span-warning');
      let warningdiv = $('<div></div>').addClass('datetimerange-dialog-div-warning')
        .append(this._warningtext);

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

      this._beginDTP = pulseUtility.createjQueryElementWithAttribute('x-datetimepicker',
        begintimepickerOptions);
      this._beginDTP[0].addEventListener('change', this.onChangeDateTime.bind(this), false);

      let beginDiv = $('<div"></div>').addClass('datetimepicker-begindiv')
        .append(this._beginDTP);
      let divinputbegin = $('<div></div>')
        .addClass('datetimerange-dialog-divinputbegin')
        .append(beginDiv);

      // END DTP
      let endtimepickerOptions = {};
      if ((this.element.hasAttribute('possible-no-end')) &&
        (this.element.getAttribute('possible-no-end').toUpperCase() == 'TRUE')) {
        endtimepickerOptions.defaultdatetime = pulseUtility.convertDateForWebService(this._dateRange.upper);
        endtimepickerOptions.nullable = true;
        endtimepickerOptions.novaluetext = 'No end';
      }
      else {
        endtimepickerOptions.defaultdatetime = pulseUtility.convertDateForWebService(this._dateRange.upper);
        endtimepickerOptions.nullable = false;
      }

      if (this.element.getAttribute('min-end')) {
        endtimepickerOptions.mindatetime = this.element.getAttribute('min-end');
      }
      else {
        if (this.element.getAttribute('min-begin')) {
          endtimepickerOptions.mindatetime = this.element.getAttribute('min-begin');
        }
      }
      if (this.element.getAttribute('max-end')) {
        endtimepickerOptions.maxdatetime = this.element.getAttribute('max-end');
      }
      if (secondsMandatory) {
        endtimepickerOptions.showseconds = 'show-seconds';
      }

      this._endDTP = pulseUtility.createjQueryElementWithAttribute('x-datetimepicker',
        endtimepickerOptions);
      this._endDTP[0].addEventListener('change', this.onChangeDateTime.bind(this), false);

      let endDiv = $('<div"></div>').addClass('datetimepicker-enddiv')
        .append(this._endDTP);
      let divinputend = $('<div></div>').addClass('datetimerange-dialog-divinputend')
        .append(endDiv);

      let divinput = $('<div></div>').addClass('datetimerange-dialog-divinput')
        .append(infodiv)
        .append(divinputbegin).append(divinputend)
        .append(warningdiv);

      // ADD BOUNDS
      this._setBeginEndBound();

      this._settingsDialogId = pulseCustomDialog.initialize(divinput, {
        title: isSplit ? this.getTranslation ('splitPeriod', 'Split a period') : this.getTranslation ('selectPeriod', 'Select a period'),
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
      pulseCustomDialog.open('#' + this._settingsDialogId);
    }

    /**
     * Callback called when datetime is modified
     * To display warning message or not
     */
    onChangeDateTime () {
      if (!this._beginDTP[0].isValid() || !this._endDTP[0].isValid()) {
        this._warningtext.html('Please, input valid dates');
        $('#' + this._settingsDialogId + ' .customDialogOk')[0].setAttribute('disabled', 'disabled');
        return;
      }
      if (null == this._endDTP[0].getISOValue()) {
        this._warningtext.html('');
        $('#' + this._settingsDialogId + ' .customDialogOk').removeAttr('disabled');
        return;
      }
      let begin = new Date(this._beginDTP[0].getISOValue());
      let end = new Date(this._endDTP[0].getISOValue());
      if (end < begin) {
        this._warningtext.html('WARNING ! Begin of period is after end');
        $('#' + this._settingsDialogId + ' .customDialogOk')[0].setAttribute('disabled', 'disabled');
        return;
      }
      if (end > begin) { // '==' not implemented
        this._warningtext.html(''); // == Normal
        $('#' + this._settingsDialogId + ' .customDialogOk').removeAttr('disabled');
        return;
      }
      else {
        this._warningtext.html('WARNING ! Empty period');
        $('#' + this._settingsDialogId + ' .customDialogOk')[0].setAttribute('disabled', 'disabled');
        return;
      }
    }

    /**
     * Callback (called after validate button)
     */
    _callback_validate_settings () {
      if (!this._beginDTP[0].isValid()) {
        pulseCustomDialog.openError('Start date/time is not valid.');
        return false;
      }
      if (!this._endDTP[0].isValid()) {
        pulseCustomDialog.openError('End date/time is not valid.');
        return false;
      }

      let beginDateTime = new Date(this._beginDTP[0].getISOValue());
      let endDateTime = (null == this._endDTP[0].getISOValue())
        ? null : new Date(this._endDTP[0].getISOValue());

      // Is min date in the limits?
      if (this.element.hasAttribute('min-begin') &&
        this.element.getAttribute('min-begin') !== null) {
        let minBeginDate = new Date(this.element.getAttribute('min-begin'));
        if (beginDateTime < minBeginDate) {
          pulseCustomDialog.openError('Start date/time is before the minimum date/time.');
          return false;
        }
      }
      if (this.element.hasAttribute('max-begin') &&
        this.element.getAttribute('max-begin') != null) {
        let maxBeginDate = new Date(this.element.getAttribute('max-begin'));
        if (beginDateTime > maxBeginDate) {
          pulseCustomDialog.openError('Start date/time is after the maximum date/time.');
          return false;
        }
      }
      // Is max date in the limits?
      if (this.element.hasAttribute('min-end') &&
        this.element.getAttribute('min-end') != null) {
        let minEndDate = new Date(this.element.getAttribute('min-end'));
        if ((endDateTime) && (endDateTime < minEndDate)) {
          pulseCustomDialog.openError('End date/time is before the minimum date/time.');
          return false;
        }
      }
      if (this.element.hasAttribute('max-end') &&
        this.element.getAttribute('max-end') != null) {
        let maxEndDate = new Date(this.element.getAttribute('max-end'));
        if ((endDateTime) && (endDateTime > maxEndDate)) {
          pulseCustomDialog.openError('End date/time is after the maximum date/time.');
          return false;
        }
      }

      // Check the range
      if (endDateTime) {
        if (endDateTime < beginDateTime) {
          pulseCustomDialog.openError('End date/time is before start date/time.');
          return false;
        }
        else {
          if (beginDateTime < endDateTime) {
            // Do nothing = it is OK
          }
          else {
            pulseCustomDialog.openError('Empty period.');
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
    'min-end', 'max-end', 'range', 'possible-no-end', 'not-editable', 'hide-buttons']);
})();
