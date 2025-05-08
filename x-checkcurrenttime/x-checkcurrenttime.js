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
 * Build a custom tag <x-checkcurrenttime> to check currenttime.  
 */
(function () {

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

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      this.switchToNextContext();
    }

    // Overload to always refresh value
    get isVisible () {
      return true;
    }

    get refreshRate () {
      // Return here the refresh rate in ms. 
      return 1000 * 60 * 60 * 24; // 1 day
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let url = 'CurrentTime/';
      return url;
    }

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

    // Callback events
  }

  pulseComponent.registerElement('x-checkcurrenttime',
    CheckCurrentTimeComponent);
})();
