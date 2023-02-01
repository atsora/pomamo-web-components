// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastshift
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

  class LastShiftComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._range = undefined;

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        // TOOD add contexts ?
        case 'update':
          // Do nothing - automatic
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text'); // NOT lastbar');

      // Update here some internal parameters

      // listeners
      /*if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDate TimeRangeChange.bind(this));
      } else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDate TimeRangeChange.bind(this));
      }*/

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      let linkReport = $('<a></a>').addClass('lastshift-linkreport'); // Keep <a> it to quickly restore any link here
      linkReport.attr('target', '_blank'); // To open in a new tab
      linkReport.append($('<span> </span>').addClass('lastshift-shiftlabel'));
      let divShift = $('<div></div>')
        .addClass('lastshift-shift')
        .append(linkReport);
      this._content = $('<div> </div>').addClass('lastshift')
        .append(divShift);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      $(this.element).append(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in LastShift.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      // Hide crt shift
      $(this.element).find('.lastshift-shiftlabel').html('');
    }

    removeError () {
      // Code here to remove the error message. Only required if displayError is implemented
      // For example:
      this.displayError('');
    }

    get refreshRate () {
      if ((this.element.hasAttribute('update'))
        && pulseUtility.isInteger(this.element.getAttribute('update'))) {
        return this.element.getAttribute('update');
      }
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      return 'GetLastShift?MachineId='
        + this.element.getAttribute('machine-id');
    }

    refresh (data) {
      // Update the component with data which is returned by the web service in case of success
      // For example:
      $(this._content).html(data.Name);


      if (data.Shift && data.Shift.Display) {
        $(this.element).find('.lastshift-shiftlabel').html(data.Shift.Display);
      }
      else {
        $(this.element).find('.lastshift-shiftlabel').html(''); // 'Out of shift');
      }
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
  }

  pulseComponent.registerElement('x-lastshift', LastShiftComponent, ['machine-id', 'update']);
})();
