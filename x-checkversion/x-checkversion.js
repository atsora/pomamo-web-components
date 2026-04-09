// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkversion
 * @requires module:pulseComponent
 *
 * Invisible background component that polls the server for software version changes.
 * When a version change is detected, reloads (live mode) or shows a notification.
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-checkversion>` — invisible version-change watcher.
   *
   * Polls `PulseVersions/Get` every hour.
   * On first response, stores the `Versions` baseline.
   * On subsequent responses, if versions have changed:
   *  - **live mode**: reloads the page immediately, appending `pulseVersion` to the URL.
   *  - **other modes**: dispatches a `showMessageSignal` notification with a reload link.
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class checkversionComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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
     * Returns the polling interval: 1 hour in milliseconds.
     *
     * @returns {number} 3 600 000 ms.
     */
    get refreshRate () {
      return 60 * 60 * 1000; // Check every hour
    }

    /**
     * REST endpoint: `PulseVersions/Get`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'PulseVersions/Get';
    }

    /**
     * Compares `data.Versions` against the stored baseline.
     * First call: stores baseline. Subsequent calls: triggers reload or notification on change.
     * On reload, updates `pulseVersion` URL parameter to the new `data.Versions.Pulse` value.
     *
     * @param {{ Versions: { Pulse: string } }} data - Server response.
     */
    refresh (data) {
      if (typeof this._currentVersions == 'undefined') {
        this._currentVersions = data.Versions;
      }
      else {
        let versionsHasChanged = true;
        if (JSON.stringify(this._currentVersions) === JSON.stringify(data.Versions)) {
          versionsHasChanged = false;
        }
        if (versionsHasChanged) { // reload
          let href = window.location.href;
          href = pulseUtility.changeURLParameter(href,
            'pulseVersion', data.Versions.Pulse);

          if ('live' == pulseConfig.getAppContextOrRole()) {
            // direct reload for live
            window.open(href, '_self');
          }
          else {
            // Display a message
            let messageInfo = {
              'id': 'Version',
              'message': 'Version has changed ',
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

  pulseComponent.registerElement('x-checkversion', checkversionComponent);
})();
