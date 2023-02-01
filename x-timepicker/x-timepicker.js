// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-timepicker
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
//var pulseUtility = require('pulseUtility');

/**
 * Build a custom tag <x-timepicker> to display a time selector. This tag gets following attribute : 
 *  defaulttime : String (ISO)
 *  mintime : String
 *  maxtime : String
 *  showseconds : Boolean
 *  disabled
 */
(function () {

  class TimePickerComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters - Default values
      self._timeInput = undefined;

      self.methods = {
        isValid: self.isValid,
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
        case 'defaulttime':
          if (this.isInitialized()) {
            this._setDefaultTime();
          }
          break;
        case 'maxtime':
          if (this.isInitialized()) {
            this._fillMinMaxTime();
          }
          break;
        case 'mintime':
          if (this.isInitialized()) {
            this._fillMinMaxTime();
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
        default:
          console.warn('Unhandled attribute : ' + attr);
          break;
      }
    }

    initialize () {
      this.addClass('pulse-bigdisplay');

      // Create DOM - NO Loader
      let timeDiv = $('<div></div>').addClass('timepicker-timediv');
      $(this.element).append(timeDiv);

      // DOM - date
      this._timeInput = $('<input type="time"></input>')
        .addClass('timepicker-input-time');
      timeDiv.append(this._timeInput);

      // With or without seconds
      if (this.element.hasAttribute('showseconds')) {
        this._timeInput[0].setAttribute('step', 1); // 1 sec == show sec
      }
      else {
        this._timeInput[0].setAttribute('step', 60); // 1 min
      }

      // Fill Time
      this._setDefaultTime();

      // Set min/max time
      this._fillMinMaxTime();

      // if disabled
      this._enabledisableInput();

      this._timeInput.change(function () {
        // Restore default if empty
        if ('' == this._timeInput[0].value) {
          this._setDefaultTime();
        }
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
        this._timeInput[0].disabled = true;
      }
      else {
        this._timeInput[0].disabled = false;
      }
    }

    _setDefaultTime () {
      if (this.element.hasAttribute('defaulttime')) {
        let displayedTime = this.element.getAttribute('defaulttime');
        // else maybe use now ?

        // Remove seconds if not useful  ? Hope it is coherant !

        // '2-digit' displays only 1 digit for hour... sometimes
        if (1 == displayedTime.indexOf(':')) {
          displayedTime = '0' + displayedTime;
        }

        this._timeInput[0].value = displayedTime; // Fonctionne pour LAT, mais pas Paragon Metal
        //this._timeInput[0].setAttribute('value', displayedTime); //'08:00');
        //this._timeInput[0].defaultValue = displayedTime;
      }
    }

    _fillMinMaxTime () {
      if (this.element.hasAttribute('mintime')) {
        // Check if min time >= value
        let minTime = this.element.getAttribute('mintime');

        // Remove seconds if not useful ? Hope no
        /*if (!this.element.hasAttribute('showseconds')) {
          minTime = minTime.substring(0, 5); // Hide sec, not compatible
        }*/
        this._timeInput[0].setAttribute('min', minTime);
      }
      if (this.element.hasAttribute('maxtime')) {
        let maxTime = this.element.getAttribute('maxtime');

        // Remove seconds if not useful ? Hope no
        /*if (!this.element.hasAttribute('showseconds')) {
          maxTime = maxTime.substring(0, 5); // Hide sec, not compatible
        }*/

        this._timeInput[0].setAttribute('max', maxTime);
      }
    }

    isValid () {
      let val = this._timeInput[0].value;
      let hours = val.substring(0, 2);
      let mins = val.substring(3, 5);

      if (this.element.hasAttribute('mintime')) {
        let minTime = this.element.getAttribute('mintime');
        let minHours = minTime.substring(0, 2);
        if (hours < minHours)
          return false;

        let minMins = minTime.substring(3, 5);
        if (mins < minMins)
          return false;

        if (this.element.hasAttribute('showseconds')) {
          let secs = val.substring(6, 8);
          let minSecs = minTime.substring(6, 8);

          if (secs < minSecs)
            return false;
        }
      }
      if (this.element.hasAttribute('maxtime')) {
        let maxTime = this.element.getAttribute('maxtime');
        let maxHours = maxTime.substring(0, 2);
        if (hours > maxHours)
          return false;

        let maxMins = maxTime.substring(3, 5);
        if (mins > maxMins)
          return false;

        if (this.element.hasAttribute('showseconds')) {
          let secs = val.substring(6, 8);
          let maxSecs = maxTime.substring(6, 8);

          if (secs > maxSecs)
            return false;
        }
      }

      return true;
    }

    getValueAsIs () { // HH:mm(:ss)
      return (this._timeInput[0].value);
    }

    // Callback events
  }

  pulseComponent.registerElement('x-timepicker', TimePickerComponent,
    ['defaulttime', 'maxtime', 'mintime', 'showseconds', 'disabled']);
})();
