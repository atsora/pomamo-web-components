// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-clock
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');


(function () {

  /**
   * `<x-clock>` — live clock displaying local time (or the date).
   *
   * Self-rescheduling `setTimeout` loop in `_startTime()` aligned on the next
   * second boundary (or minute boundary when seconds are hidden) to avoid drift.
   * Time format depends on the current Moment locale: 24h for `fr` / `de`, 12h
   * otherwise. No AJAX.
   *
   * @element x-clock
   * @attr {boolean} display-seconds  `'true'` shows seconds (`HH:mm:ss` / `hh:mm:ss a`); default hides them
   * @attr {boolean} display-date     `'true'` shows the date (`dddd DD/MM/YYYY`, or `dddd MM/DD/YYYY` for `en`) instead of the time
   * @extends pulseComponent.PulseInitializedComponent
   */
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

    /**
     * Builds the DOM: `<div.clock-div>` containing `<div.clock-text>`, then starts the timer loop.
     */
    initialize() {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - No Loader / no error

      // Create DOM - Content
      this._textclock = document.createElement('div');
      this._textclock.className = 'clock-text';
      this._textclock.textContent = '00:00:00';
      this._content = document.createElement('div');
      this._content.className = 'clock-div';
      this._content.appendChild(this._textclock);
      this.element.appendChild(this._content);

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
      this.element.replaceChildren();
      this._textclock = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Formats and renders the current time (or date) into `.clock-text`, then reschedules itself.
     * Waits until the next second boundary; if seconds are hidden, waits until the next minute boundary.
     */
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
      this._textclock.innerHTML = now.format(stringToDisplay);
      this._timerId = setTimeout(this._startTime.bind(this), msBeforeNextChange);
    }
  }

  pulseComponent.registerElement('x-clock', ClockComponent, ['display-seconds', 'display-date']);
})();
