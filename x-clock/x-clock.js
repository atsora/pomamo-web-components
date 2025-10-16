// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-clock
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');


/**
 * Build a custom tag <x-clock> to display an clock component. This tag gets following attribute : 
*  display-seconds : Boolean
*  display-date : Boolean
 */
(function () {

  class ClockComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._textclock = undefined;
      self._content = undefined;

      self._timerId = null;


      return self;
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'display-seconds':
        case 'display-date':
          this.start();
          break;
        default:
          break;
      }
    }

    /**
     * Determines if 24-hour format should be used based on the current locale.
     * @returns {boolean} true for 24h format, false for 12h format
     */
    _shouldUse24HourFormat() {
      const locale = moment.locale();
      // Use 24h format for French and German locales
      return locale === 'fr' || locale === 'de' || locale.startsWith('fr-') || locale.startsWith('de-');
    }

    initialize() {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - No Loader / no error

      // Create DOM - Content
      this._textclock = $('<div>00:00:00</div>').addClass('clock-text');
      this._content = $('<div></div>').addClass('clock-div')
        .append(this._textclock);
      $(this.element).append(this._content);

      this._startTime();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = null;
      }
      $(this.element).empty();
      this._textclock = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    _startTime() {
      let now = moment();
      let stringToDisplay = '';
      let msBeforeNextChange = 1000 - now.millisecond();

      // Determine if 24h format should be used based on locale
      let use24HourFormat = this._shouldUse24HourFormat();

      if (this.element.hasAttribute('display-date')) {
        if (this.element.getAttribute('display-date') === 'true'
          || this.element.getAttribute('display-date') === true) {
          if (moment.locale() === 'en') {
            stringToDisplay += "dddd MM/DD/YYYY ";
          }
          else {
            stringToDisplay += "dddd DD/MM/YYYY ";
          }
        }
      }
      else {
        if (this.element.getAttribute('display-seconds') == 'true'
          || this.element.getAttribute('display-seconds') == true) {
          if (use24HourFormat) {
            stringToDisplay += 'HH:mm:ss';
          }
          else {
            stringToDisplay += 'hh:mm:ss a';
          }
        }
        else {
          if (use24HourFormat) {
            stringToDisplay += 'HH:mm';
          }
          else {
            stringToDisplay += 'hh:mm a';
          }

          msBeforeNextChange += 1000 * (60 - now.second());
        }
      }
      this._textclock.html(now.format(stringToDisplay));
      this._timerId = setTimeout(this._startTime.bind(this), msBeforeNextChange);
    }
  }

  pulseComponent.registerElement('x-clock', ClockComponent, ['display-seconds', 'display-date']);
})();
