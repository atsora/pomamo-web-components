// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-datepicker
 * @requires module:pulseComponent
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';

(function () {

  /**
   * `<x-datepicker>` — single native `<input type="date">` wrapper.
   *
   * Renders a date input, applies the `defaultdate`, `mindate`, `maxdate`
   * attributes, and dispatches a `change` event on the host element when the
   * value changes. Restores the default date when the user clears the input.
   *
   * @element x-datepicker
   * @attr {string}  defaultdate  initial ISO date string
   * @attr {string}  mindate      minimum selectable ISO date
   * @attr {string}  maxdate      maximum selectable ISO date
   * @attr {boolean} disabled     `'disabled'` / `'true'` disables the input
   * @method isValid              `true` when the current value is a valid date
   * @method getISOValue          current ISO date (yyyy-mm-dd)
   * @method getValueAsIs         raw value of the input
   * @extends pulseComponent.PulseInitializedComponent
   */
  class DatePickerComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters - Default values
      self._dateInput = undefined;

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
            if (this.element.hasAttribute('disabled')
              && (newVal == 'disabled' || newVal == 'true')) {
              this._dateInput.disabled = true;
            }
            else {
              this._dateInput.disabled = false;
            }
          }
        } break;
        case 'defaultdate':
          if (this.isInitialized()) {
            this._setDefaultDate();
          }
          break;
        case 'maxdate':
          if (this.isInitialized()) {
            this._fillMinMaxDate();
          }
          break;
        case 'mindate':
          if (this.isInitialized()) {
            this._fillMinMaxDate();
          }
          break;
        default:
          console.warn('Unhandled attribute : ' + attr);
          break;
      }
    }

    initialize () {
      //this.addClass('pulse-bigdisplay'); -> No

      // Create DOM - NO Loader
      let dateDiv = document.createElement('div');
      dateDiv.className = 'datepicker-datediv';
      this.element.appendChild(dateDiv);

      // DOM - date
      this._dateInput = document.createElement('input');
      this._dateInput.type = 'date';
      this._dateInput.className = 'datepicker-input-date';
      dateDiv.appendChild(this._dateInput);

      // if disabled
      if (this.element.hasAttribute('disabled')
        && (this.element.getAttribute('disabled') == 'disabled'
          || this.element.getAttribute('disabled') == 'true')) {
        this._dateInput.disabled = true;
      }

      // Fill Date
      this._setDefaultDate();

      // Set min/max date
      this._fillMinMaxDate();

      this._dateInput.addEventListener('change', function () {
        // Restore default if empty
        if ('' == this._dateInput.value) {
          this._setDefaultDate();
        }

        // Tell parent if needed
        var event = new Event('change');
        this.element.dispatchEvent(event);

      }.bind(this));

      // NO - Listener and dispatcher

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // DOM
      this.element.replaceChildren();

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    _setDefaultDate () {
      // Set default
      let defaultDate = this.element.hasAttribute('defaultdate')
        ? new Date(this.element.getAttribute('defaultdate'))
        : new Date();

      if (undefined == defaultDate || 'Invalid Date' == defaultDate) {
        defaultDate = new Date();
      }
      let displayedDate = defaultDate.getFullYear() + '-'
        + pulseUtility.leadingZero(defaultDate.getMonth() + 1) + '-'
        + pulseUtility.leadingZero(defaultDate.getDate());

      this._dateInput.value = displayedDate;
      //this._dateInput.setAttribute('value', displayedDate); //'2018-07-22');
      //this._dateInput.defaultValue = displayedDate;
    }

    _fillMinMaxDate () {
      if (this.element.hasAttribute('mindate')) {
        // Use it as is because of cut-off mannagement
        let minDate = this.element.getAttribute('mindate');

        /* let minDateTime = new Date(this.element.getAttribute('mindate'));
        let minDate = minDateTime.getFullYear() + '-'
          + pulseUtility.leadingZero(minDateTime.getMonth() + 1) + '-'
          + pulseUtility.leadingZero(minDateTime.getDate());
        */
        this._dateInput.setAttribute('min', minDate);
      }
      if (this.element.hasAttribute('maxdate')) {
        let maxDate = this.element.getAttribute('maxdate');
        /*
        let maxDateTime = new Date(this.element.getAttribute('maxdate'));

        let maxDate = maxDateTime.getFullYear() + '-'
          + pulseUtility.leadingZero(maxDateTime.getMonth() + 1) + '-'
          + pulseUtility.leadingZero(maxDateTime.getDate());
        */
        this._dateInput.setAttribute('max', maxDate);
      }
    }

    isValid () {
      let crtDate = new Date(this._dateInput.value);
      if (this.element.hasAttribute('mindate')) {
        let minDate = new Date(this.element.getAttribute('mindate'));
        if (crtDate < minDate)
          return false;

      }
      if (this.element.hasAttribute('maxdate')) {
        let maxDate = new Date(this.element.getAttribute('maxdate'));
        if (crtDate > maxDate)
          return false;
      }

      return true;
    }

    getISOValue () {
      return pulseUtility.convertDayForWebService(this._dateInput.value);
    }

    getValueAsIs () { //'YYYY-MM-DD
      return this._dateInput.value;
    }

    // Callback events
  }

  pulseComponent.registerElement('x-datepicker', DatePickerComponent,
    ['defaultdate', 'maxdate', 'mindate', 'disabled']);
})();
