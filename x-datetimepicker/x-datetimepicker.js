// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-datetimepicker
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

  /**
   * `<x-datetimepicker>` — date + time selector wrapping native
   * `<input type="date">` and `<input type="time">`.
   *
   * Applies `defaultdatetime`, clamps to `mindatetime` / `maxdatetime`, and
   * adjusts the time-input step (`60` or `1`) based on `showseconds`. When
   * `nullable` is set, shows a "no value" checkbox tied to `novaluetext` that
   * clears the inputs. Dispatches a `change` event on the host element when the
   * value changes.
   *
   * @element x-datetimepicker
   * @attr {string}  defaultdatetime  initial ISO datetime string
   * @attr {string}  mindatetime      minimum selectable ISO datetime
   * @attr {string}  maxdatetime      maximum selectable ISO datetime
   * @attr {boolean} showseconds      show seconds in the time input
   * @attr {boolean} nullable         allow clearing the value via a "no value" checkbox
   * @attr {string}  novaluetext      label rendered next to the nullable checkbox
   * @attr {boolean} disabled         disable both inputs
   * @method isValid                  `true` when the current value is a valid ISO datetime
   * @method getISOValue              current ISO datetime
   * @method getValueAsIs             raw value (may be empty when nullable+unchecked)
   * @extends pulseComponent.PulseInitializedComponent
   */
  class DateTimePickerComponent extends pulseComponent.PulseInitializedComponent {
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
              this._timeInput.setAttribute('step', 1); // 1 sec == show sec
            }
            else {
              this._timeInput.setAttribute('step', 60); // 1 min
            }
          }
          break;
        case 'nullable':
          if (this.isInitialized()) {
            this._inputNullableDiv.style.display = newVal ? '' : 'none';
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
      let datetimeDiv = document.createElement('div');
      datetimeDiv.classList.add('datetimepicker-datetimediv');
      this.element.appendChild(datetimeDiv);

      // DOM - date
      this._dateInput = document.createElement('input');
      this._dateInput.type = 'date';
      this._dateInput.classList.add('datetimepicker-input-date');

      this._timeInput = document.createElement('input');
      this._timeInput.type = 'time';
      this._timeInput.classList.add('datetimepicker-input-time');
      datetimeDiv.appendChild(this._dateInput);
      datetimeDiv.appendChild(this._timeInput);

      // With or without seconds
      if (this.element.hasAttribute('showseconds')) {
        this._timeInput.setAttribute('step', 1); // 1 sec == show sec
      }
      else {
        this._timeInput.setAttribute('step', 60); // 1 min
      }

      // DOM - NULLABLE
      this._inputNullable = document.createElement('input');
      this._inputNullable.type = 'checkbox';
      this._inputNullable.name = 'datetime-nullable';
      this._inputNullable.classList.add('datetimepicker-input-nullable');

      this._inputNullableText = document.createElement('label');
      this._inputNullableText.htmlFor = 'datetime-nullable';
      this._inputNullableText.classList.add('datetimepicker-input-nullable-label');
      this._inputNullableText.innerHTML = (this.element.hasAttribute('novaluetext')) ? this.element.getAttribute('novaluetext') : 'No value';

      this._inputNullableDiv = document.createElement('div');
      this._inputNullableDiv.classList.add('datetimepicker-input-nullable-div');
      this._inputNullableDiv.appendChild(this._inputNullable);
      this._inputNullableDiv.appendChild(this._inputNullableText);
      datetimeDiv.appendChild(this._inputNullableDiv);
      if ((this.element.hasAttribute('nullable')) == false) {
        this._inputNullableDiv.style.display = 'none';
      }

      // Fill DateTime
      this._setDefaultDate();
      this._setDefaultTime();

      // Set min/max date
      this._fillMinMaxDate();
      this._fillMinMaxTime();

      // if disabled
      this._enabledisableInput();

      this._dateInput.addEventListener('change', function () {
        // Restore default if empty
        if ('' == this._dateInput.value) {
          this._setDefaultDate();
        }
        // Manage min/max time
        this._fillMinMaxTime();

        // Tell parent if needed
        var event = new Event('change');
        this.element.dispatchEvent(event);

      }.bind(this));

      this._timeInput.addEventListener('change', function () {
        // Restore default if empty
        if ('' == this._timeInput.value) {
          this._setDefaultTime();
        }
        // Tell parent if needed
        if (typeof this._onChangeCallback === 'function')
          this._onChangeCallback();

      }.bind(this));

      // If user click to set datetime to null
      this._inputNullable.addEventListener('change', function () {
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
      this.element.replaceChildren();

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

    _enabledisableInput () {
      if (this.element.hasAttribute('disabled')
        && (this.element.getAttribute('disabled') == 'disabled'
          || this.element.getAttribute('disabled') == 'true')) {
        this._dateInput.disabled = true;
        this._timeInput.disabled = true;
        this._inputNullable.disabled = true;
      }
      else {
        if (this._inputNullable.checked) {
          this._dateInput.disabled = true;
          this._timeInput.disabled = true;
        }
        else {
          this._dateInput.disabled = false;
          this._timeInput.disabled = false;
        }
        this._inputNullable.disabled = false;
      }
    }

    _setDefaultDate () {
      // nullable ?
      if ((this.element.hasAttribute('nullable'))
        && !this.element.hasAttribute('defaultdatetime')) {
        // Set IS NULL
        this._inputNullable.checked = true;
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

      this._dateInput.value = displayedDate;
      //this._dateInput.setAttribute('value', displayedDate); //'2018-07-22');
      //this._dateInput.defaultValue = displayedDate;
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

      this._timeInput.value = displayedTime; // Works for LAT, but not Paragon Metal
      //this._timeInput.setAttribute('value', displayedTime); //'08:00');
      //this._timeInput.defaultValue = displayedTime;
    }

    _fillMinMaxDate () {
      if (this.element.hasAttribute('mindatetime')) {
        let minDatetime = new Date(this.element.getAttribute('mindatetime'));

        let minDate = minDatetime.getFullYear() + '-'
          + pulseUtility.leadingZero(minDatetime.getMonth() + 1) + '-'
          + pulseUtility.leadingZero(minDatetime.getDate());

        this._dateInput.setAttribute('min', minDate);
      }
      if (this.element.hasAttribute('maxdatetime')) {
        let maxDatetime = new Date(this.element.getAttribute('maxdatetime'));

        let maxDate = maxDatetime.getFullYear() + '-'
          + pulseUtility.leadingZero(maxDatetime.getMonth() + 1) + '-'
          + pulseUtility.leadingZero(maxDatetime.getDate());

        this._dateInput.setAttribute('max', maxDate);
      }
    }

    _fillMinMaxTime () {
      if (this.element.hasAttribute('mindatetime')) {
        // Check if min date >= value
        let minDate = new Date(this._dateInput.getAttribute('min'));
        let crtDate = new Date(this._dateInput.value);
        if (minDate < crtDate) {
          this._timeInput.removeAttribute('min');
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
          this._timeInput.setAttribute('min', minTime);
        }
      }
      if (this.element.hasAttribute('maxdatetime')) {
        // Check if min date >= value
        let maxDate = new Date(this._dateInput.getAttribute('max'));
        let crtDate = new Date(this._dateInput.value);
        if (crtDate < maxDate) {
          this._timeInput.removeAttribute('max');
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

          this._timeInput.setAttribute('max', maxTime);
        }
      }
    }

    isValid () {
      if ((this.element.hasAttribute('nullable')) && (this._inputNullable.checked)) {
        return true;
      }

      let crtDateTime = new Date(this._dateInput.value + ' ' + this._timeInput.value);
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
      if ((this.element.hasAttribute('nullable')) && (this._inputNullable.checked)) {
        return null;
      }
      else {
        let crtDateTime = new Date(this._dateInput.value + ' ' + this._timeInput.value);
        return crtDateTime.toISOString();
      }
    }

    getValueAsIs () { //'YYYY-MM-DD HH:mm:ss
      return (this._dateInput.value + ' ' + this._timeInput.value);
    }

    // Callback events
  }

  pulseComponent.registerElement('x-datetimepicker', DateTimePickerComponent,
    ['defaultdatetime', 'maxdatetime', 'mindatetime', 'novaluetext', 'showseconds', 'nullable', 'disabled']);
})();
