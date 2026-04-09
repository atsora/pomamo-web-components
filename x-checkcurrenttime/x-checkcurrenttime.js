// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkcurrenttime
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-checkcurrenttime> to check server/client time synchronization.
 *
 * Invisible component. On each poll, computes the difference between server UTC time
 * and local `Date.now()`, stores it in `pulseConfig` as `diffServerTimeMinusNowMSec`,
 * and emits a warning notification if the discrepancy exceeds `seconds` threshold.
 *
 * Attributes:
 *   seconds - allowed clock drift in seconds before warning (default: 30)
 */
(function () {

  /**
   * `<x-checkcurrenttime>` — invisible server/client clock drift monitor.
   *
   * Polls `CurrentTime/` once per day (86 400 000 ms).
   * Stores `diffServerTimeMinusNowMSec` globally in `pulseConfig` so other components
   * can apply server-time corrections.
   * Dispatches `showMessageSignal` if `|drift| > seconds`.
   *
   * Attributes:
   *   seconds - maximum allowed absolute drift (default: 30)
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class CheckCurrentTimeComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    initialize () {
      this.addClass('pulse-nodisplay');

      // Update here some internal parameters

      // listeners

      // In case of clone, need to be empty :
      //$(this.element).empty();

      // Create DOM - NO DOM

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      this.switchToNextContext();
    }

    /**
     * Overrides the base `isVisible` to always return true.
     * The component must poll even when not visually connected.
     */
    get isVisible () {
      return true;
    }

    /**
     * Returns the polling interval: once per day.
     *
     * @returns {number} 86 400 000 ms.
     */
    get refreshRate () {
      return 1000 * 60 * 60 * 24; // 1 day
    }

    /**
     * REST endpoint: `CurrentTime/`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let url = 'CurrentTime/';
      return url;
    }

    /**
     * Computes `serverTime - now` and stores it globally as `diffServerTimeMinusNowMSec`.
     * Emits `showMessageSignal` (warning, permanent) if the absolute drift exceeds
     * the configured `seconds` threshold.
     *
     * @param {{ Utc: string }} data - Server response containing UTC timestamp.
     */
    refresh (data) {
      let now = new Date();
      let serverDate = new Date(data.Utc);

      // Find diff + store
      let diffServerTimeMinusNowMSec = serverDate.getTime() - now.getTime();
      pulseConfig.setGlobal('diffServerTimeMinusNowMSec', diffServerTimeMinusNowMSec);

      // default 30 seconds (can be overload)
      let allowedDiff = this.getConfigOrAttribute('seconds', '30');
      if (Math.abs(diffServerTimeMinusNowMSec) > allowedDiff * 1000) {
        let messageInfo = {
          'id': 'Current Time',
          'message': this.getTranslation('syncTime',
            'Please synchonize date and time '),
          'level': 'warning',
          'clickToClose': true
        };
        //messageInfo.id = id;
        // 'permanent' -> NO messageInfo.time
        messageInfo.clickToClose = false;
        eventBus.EventBus.dispatchToAll('showMessageSignal',
          messageInfo);
      }
    }
  }

  pulseComponent.registerElement('x-checkcurrenttime',
    CheckCurrentTimeComponent);
})();
