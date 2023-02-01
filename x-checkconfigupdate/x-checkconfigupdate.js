// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkconfigupdate
 * @requires module:pulseComponent
 * 
 * Check if the config ON THE SERVER changed
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

(function () {

  class checkconfigupdateComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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
      return 1000 * Number(this.getConfigOrAttribute('refreshSeconds', 300));
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'Config/LastUpdate';
    }

    refresh (data) {
      // Update the component
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
