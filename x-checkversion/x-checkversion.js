// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkversion
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

(function () {

  class checkversionComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    initialize () {
      this.addClass('pulse-nodisplay');
      
      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }
    
    validateParameters () {
      this.switchToNextContext();
    }

    displayError (message) {
      // Do nothing
    }

    removeError () {
      // Do nothing
      this.displayError('');
    }

    get refreshRate () {
      // Return here the refresh rate in ms.
      return 60 * 60 * 1000; // Check every hour
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'PulseVersions/Get';
    }

    refresh (data) {
      // Update the component
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
