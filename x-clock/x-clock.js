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
*  display-24h : Boolean
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


      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'display-seconds':
        case 'display-24h':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
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

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      this._textclock = undefined;
      this._content = undefined;
      
      super.clearInitialization();
    }

    _startTime () {
      let now = moment();

      let stringToDisplay = '';
      let msBeforeNextChange = 1000 - now.millisecond();
      if (this.element.getAttribute('display-seconds') == 'true'
        || this.element.getAttribute('display-seconds') == true) {
        if (this.element.getAttribute('display-24h') == 'true'
          || this.element.getAttribute('display-24h') == true) {
          stringToDisplay = now.format('HH:mm:ss');
        }
        else {
          stringToDisplay = now.format('hh:mm:ss a');
        }
      }
      else { //let stringToDisplay = now.format('LT');
        if (this.element.getAttribute('display-24h') == 'true'
          || this.element.getAttribute('display-24h') == true) {
          stringToDisplay = now.format('HH:mm');
        }
        else {
          stringToDisplay = now.format('hh:mm a');
        }
        msBeforeNextChange += 1000 * (60 - now.second());
      }
      this._textclock.html(stringToDisplay);
      setTimeout(this._startTime.bind(this), msBeforeNextChange);
    }
  }

  pulseComponent.registerElement('x-clock', ClockComponent, ['display-seconds', 'display-24h']);
})();
