// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkconfigupdate
 * @requires module:pulseComponent
 *
 * Invisible background component that polls the server for config changes.
 * When a change is detected, reloads the page (live mode) or shows a notification (other modes).
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-checkconfigupdate>` — invisible config-change watcher.
   *
   * Polls `Config/LastUpdate` at a configurable interval (default: every 5 minutes).
   * On first response, stores the `UpdateDateTime` baseline.
   * On subsequent responses, if the timestamp has changed:
   *  - **live mode**: immediately reloads the page via `window.open`.
   *  - **other modes**: dispatches a `showMessageSignal` notification with a reload link.
   *
   * Attributes:
   *   refreshSeconds - polling interval in seconds (default: 300)
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class checkconfigupdateComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /** Adds `pulse-nodisplay` class — this component has no visible DOM. */
    initialize () {
      this.addClass('pulse-nodisplay');

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      this.switchToNextContext();
    }

    /** No visible error display for invisible component. */
    displayError (message) {
      // Do nothing
    }

    removeError () {
      // Do nothing
      this.displayError('');
    }

    /**
     * Returns the polling interval in milliseconds.
     * Reads `refreshSeconds` config/attribute (default: 300 s = 5 min).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshSeconds', 300));
    }

    /**
     * REST endpoint: `Config/LastUpdate`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'Config/LastUpdate';
    }

    /**
     * Compares `data.UpdateDateTime` against the stored baseline.
     * First call: stores the baseline. Subsequent calls: triggers reload or notification on change.
     *
     * @param {{ UpdateDateTime: * }} data - Server response.
     */
    refresh (data) {
      if (typeof this._updateDateTime == 'undefined') {
        this._updateDateTime = data.UpdateDateTime;
      }
      else {
        let configHasChanged = true;
        if (JSON.stringify(this._updateDateTime) === JSON.stringify(data.UpdateDateTime)) {
          configHasChanged = false;
        }
        if (configHasChanged) {
          let href = window.location.href;
          if ('live' == pulseConfig.getAppContextOrRole()) {
            // reload for live
            window.open(href, '_self');
          }
          else {
            // Display a message
            let messageInfo = {
              'id': 'CONFIG Server',
              'message': 'Configuration on server has changed ',
              'level': 'info',
              'clickToClose': false,
              'reloadURL': href
            };
            eventBus.EventBus.dispatchToAll('showMessageSignal',
              messageInfo);
          }
        }
      }
    }
  }

  pulseComponent.registerElement('x-checkconfigupdate', checkconfigupdateComponent);
})();
