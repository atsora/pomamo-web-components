// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-datetimepicker
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

/**
 * Build a custom tag <x-datetimepicker> to display a datetime selector. This tag gets following attribute : 
 *  defaultdatetime : String (ISO)
 *  mindatetime : String
 *  maxdatetime : String
 *  showseconds : Boolean
 *  nullable : Boolean
 *  novaluetext : String
 *  disabled
 */
(function () {

  class DateTimePickerComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters - Default values
      self._dateInput = undefined;
      self._timeInput = undefined;
      self._inputNullable = undefined;
      self._inputNullableText = undefined;
      self._inputNullableDiv = undefined;

      self.methods = {
        isValid: self.isValid,
        getISOValue: self.getISOValue,
        getValueAsIs: self.getValueAsIs
      };

      return self;
    }

    //get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'disabled': {
          if (this.isInitialized()) {
            this._enabledisableInput();
          }
        } break;
        case 'defaultdatetime':
          if (this.isInitialized()) {
            this._setDefaultDate();
            this._setDefaultTime();
          }
          break;
        case 'maxdatetime':
          if (this.isInitialized()) {
            this._fillMinMaxDate();
            this._fillMinMaxTime();
          }
          break;
        case 'mindatetime':
          if (this.isInitialized()) {
            this._fillMinMaxDate();
            this._fillMinMaxTime();
          }
          break;
        case 'novaluetext':
          if (this._inputNullable) {
            this._inputNullableText.html(newVal); // OK
          }
          break;
        case 'showseconds':
          // Show seconds or not
          if (this.isInitialized()) {
            if (this.element.hasAttribute('showseconds')) {
              this._timeInput[0].setAttribute('step', 1); // 1 sec == show sec
            }
            else {
              this._timeInput[0].setAttribute('step', 60); // 1 min
            }
          }
          break;
        case 'nullable':
          if (this.isInitialized()) {
            if (newVal) {
              this._inputNullableDiv.show();
            }
            else {
              this._inputNullableDiv.hide();
            }
          }
          break;
        default:
          console.warn('Unhandled attribute : ' + attr);
          break;
      }
    }

    initialize () {
      this.addClass('pulse-bigdisplay');

      // Create DOM - NO Loader
      let datetimeDiv = $('<div></div>').addClass('datetimepicker-datetimediv');
      $(this.element).append(datetimeDiv);

      // DOM - date
      this._dateInput = $('<input type="date"></input>')
        .addClass('datetimepicker-input-date');
      this._timeInput = $('<input type="time"></input>')
        .addClass('datetimepicker-input-time');
      datetimeDiv.append(this._dateInput).append(this._timeInput);

      // With or without seconds
      if (this.element.hasAttribute('showseconds')) {
        this._timeInput[0].setAttribute('step', 1); // 1 sec == show sec
      }
      else {
        this._timeInput[0].setAttribute('step', 60); // 1 min
      }

      // DOM - NULLABLE
      this._inputNullable = $('<input type="checkbox" name="datetime-nullable"></input>')
        .addClass('datetimepicker-input-nullable');
      this._inputNullableText = $('<label for="datetime-nullable"></label>')
        .addClass('datetimepicker-input-nullable-label')
        .html((this.element.hasAttribute('novaluetext')) ? this.element.getAttribute('novaluetext') : 'No value');
      this._inputNullableDiv = $('<div"></div>').addClass('datetimepicker-input-nullable-div')
        .append(this._inputNullable).append(this._inputNullableText);
      datetimeDiv.append(this._inputNullableDiv);
      if ((this.element.hasAttribute('nullable')) == false) {
        this._inputNullableDiv.hide();
      }

      // Fill DateTime
      this._setDefaultDate();
      this._setDefaultTime();

      // Set min/max date
      this._fillMinMaxDate();
      this._fillMinMaxTime();

      // if disabled
      this._enabledisableInput();

      this._dateInput.change(function () {
        // Restore default if empty
        if ('' == this._dateInput[0].value) {
          this._setDefaultDate();
        }
        // Manage min/max time
        this._fillMinMaxTime();

        // Tell parent if needed
        var event = new Event('change');
        this.element.dispatchEvent(event);

      }.bind(this));

      this._timeInput.change(function () {
        // Restore default if empty
        if ('' == this._timeInput[0].value) {
          this._setDefaultTime();
        }
        // Tell parent if needed
        if (typeof this._onChangeCallback === 'function')
          this._onChangeCallback();

      }.bind(this));

      // If user click to set datetime to null
      this._inputNullable.change(function () {
        this._enabledisableInput();
        // Tell parent if needed
        if (typeof this._onChangeCallback === 'function')
          this._onChangeCallback();

      }.bind(this));

      // NO - Listener and dispatcher

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters

      // DOM
      $(this.element).empty();

      this._inputNullable = undefined;
      this._inputNullableText = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters () {
      this.switchToNextContext();
    }

    _enabledisableInput () {
      if (this.element.hasAttribute('disabled')
        && (this.element.getAttribute('disabled') == 'disabled'
          || this.element.getAttribute('disabled') == 'true')) {
        this._dateInput[0].disabled = true;
        this._timeInput[0].disabled = true;
        this._inputNullable[0].disabled = true;
      }
      else {
        if ($(this._inputNullable).is(':checked')) {
          this._dateInput[0].disabled = true;
          this._timeInput[0].disabled = true;
        }
        else {
          this._dateInput[0].disabled = false;
          this._timeInput[0].disabled = false;
        }
        this._inputNullable[0].disabled = false;
      }
    }

    _setDefaultDate () {
      // nullable ?
      if ((this.element.hasAttribute('nullable'))
        && !this.element.hasAttribute('defaultdatetime')) {
        // Set IS NULL
        $(this._inputNullable)[0].checked = true;
      }
      // same as check changed
      this._enabledisableInput();

      // Set default
      let defaultDatetime = this.element.hasAttribute('defaultdatetime')
        ? new Date(this.element.getAttribute('defaultdatetime'))
        : new Date();
      if ('Invalid Date' == defaultDatetime)
        defaultDatetime = new Date();

      let displayedDate = defaultDatetime.getFullYear() + '-'
        + pulseUtility.leadingZero(defaultDatetime.getMonth() + 1) + '-'
        + pulseUtility.leadingZero(defaultDatetime.getDate());

      this._dateInput[0].value = displayedDate;
      //this._dateInput[0].setAttribute('value', displayedDate); //'2018-07-22');
      //this._dateInput[0].defaultValue = displayedDate;
    }

    _setDefaultTime () {
      let defaultDatetime = this.element.hasAttribute('defaultdatetime')
        ? new Date(this.element.getAttribute('defaultdatetime'))
        : new Date();
      if ('Invalid Date' == defaultDatetime)
        defaultDatetime = new Date();

      defaultDatetime.setMilliseconds(0);
      // Remove seconds if not useful
      /*if (!this.element.hasAttribute('showseconds')) {
        defaultDatetime.setSeconds(0);
      }*/

      let displayedTime = defaultDatetime.toLocaleTimeString('en-GB',// And NOT : [],
        { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Remove seconds if not useful - 
      if (!this.element.hasAttribute('showseconds')) {
        displayedTime = defaultDatetime.toLocaleTimeString('en-GB',// And NOT : [],
          { hour: '2-digit', minute: '2-digit' });
      }

      // '2-digit' displays only 1 digit for hour... sometimes
      if (1 == displayedTime.indexOf(':')) {
        displayedTime = '0' + displayedTime;
      }

      this._timeInput[0].value = displayedTime; // Fonctionne pour LAT, mais pas Paragon Metal
      //this._timeInput[0].setAttribute('value', displayedTime); //'08:00');
      //this._timeInput[0].defaultValue = displayedTime;
    }

    _fillMinMaxDate () {
      if (this.element.hasAttribute('mindatetime')) {
        let minDatetime = new Date(this.element.getAttribute('mindatetime'));

        let minDate = minDatetime.getFullYear() + '-'
          + pulseUtility.leadingZero(minDatetime.getMonth() + 1) + '-'
          + pulseUtility.leadingZero(minDatetime.getDate());

        this._dateInput[0].setAttribute('min', minDate);
      }
      if (this.element.hasAttribute('maxdatetime')) {
        let maxDatetime = new Date(this.element.getAttribute('maxdatetime'));

        let maxDate = maxDatetime.getFullYear() + '-'
          + pulseUtility.leadingZero(maxDatetime.getMonth() + 1) + '-'
          + pulseUtility.leadingZero(maxDatetime.getDate());

        this._dateInput[0].setAttribute('max', maxDate);
      }
    }

    _fillMinMaxTime () {
      if (this.element.hasAttribute('mindatetime')) {
        // Check if min date >= value
        let minDate = new Date(this._dateInput[0].getAttribute('min'));
        let crtDate = new Date(this._dateInput[0].value);
        if (minDate < crtDate) {
          this._timeInput[0].removeAttribute('min');
        }
        else {
          let minDatetime = new Date(this.element.getAttribute('mindatetime'));
          // Remove ms, not compatible
          minDatetime.setMilliseconds(0);

          // Find & format min time
          let minTime = minDatetime.toLocaleTimeString();
          // Remove seconds if not useful
          if (!this.element.hasAttribute('showseconds')) {
            minTime = minTime.substring(0, 5); // Hide sec, not compatible
          }
          this._timeInput[0].setAttribute('min', minTime);
        }
      }
      if (this.element.hasAttribute('maxdatetime')) {
        // Check if min date >= value
        let maxDate = new Date(this._dateInput[0].getAttribute('max'));
        let crtDate = new Date(this._dateInput[0].value);
        if (crtDate < maxDate) {
          this._timeInput[0].removeAttribute('max');
        }
        else {
          let maxDatetime = new Date(this.element.getAttribute('maxdatetime'));
          // Remove ms, not compatible
          maxDatetime.setMilliseconds(0);

          // Find & format max time
          let maxTime = maxDatetime.toLocaleTimeString();
          // Remove seconds if not useful
          if (!this.element.hasAttribute('showseconds')) {
            maxTime = maxTime.substring(0, 5); // Hide sec, not compatible
          }

          this._timeInput[0].setAttribute('max', maxTime);
        }
      }
    }

    isValid () {
      if ((this.element.hasAttribute('nullable')) && (this._inputNullable.is(':checked'))) {
        return true;
      }

      let crtDateTime = new Date(this._dateInput[0].value + ' ' + this._timeInput[0].value);
      if (this.element.hasAttribute('mindatetime')) {
        let minDatetime = new Date(this.element.getAttribute('mindatetime'));
        if (crtDateTime < minDatetime)
          return false;

      }
      if (this.element.hasAttribute('maxdatetime')) {
        let maxDatetime = new Date(this.element.getAttribute('maxdatetime'));
        if (crtDateTime > maxDatetime)
          return false;
      }

      return true;
    }

    getISOValue () {
      if ((this.element.hasAttribute('nullable')) && (this._inputNullable.is(':checked'))) {
        return null;
      }
      else {
        let crtDateTime = new Date(this._dateInput[0].value + ' ' + this._timeInput[0].value);
        return crtDateTime.toISOString();
      }
    }

    getValueAsIs () { //'YYYY-MM-DD HH:mm:ss 
      return (this._dateInput[0].value + ' ' + this._timeInput[0].value);
    }

    // Callback events
  }

  pulseComponent.registerElement('x-datetimepicker', DateTimePickerComponent,
    ['defaultdatetime', 'maxdatetime', 'mindatetime', 'novaluetext', 'showseconds', 'nullable', 'disabled']);
})();
