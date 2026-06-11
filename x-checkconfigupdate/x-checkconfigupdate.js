// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkconfigupdate
 * @requires module:pulseComponent
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseConfig from 'pulseConfig';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-checkconfigupdate>` — invisible watcher that detects server-side config changes.
   *
   * Polls `Config/LastUpdate` periodically and stores the first `UpdateDateTime`
   * response as a baseline. When a later response differs, either reloads the page
   * (when the current app context is `live`) or dispatches `showMessageSignal` with
   * a reload link.
   *
   * @element x-checkconfigupdate
   * @attr {number} refreshSeconds  polling interval in seconds (default 300)
   * @fires showMessageSignal       `{ id, message, level: 'info', clickToClose: false, reloadURL }` when the config changes (non-live context)
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
