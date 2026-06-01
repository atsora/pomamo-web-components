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

  /**
   * `<x-lastshift>` — displays the current shift label for one machine.
   *
   * Polls `GetLastShift?MachineId=<id>` (interval = `update` attribute in ms
   * when set, otherwise `refreshingRate.currentRefreshSeconds` * 1000,
   * default 10 s) and renders `data.Shift.Display` into
   * `.lastshift-shiftlabel`. Renders an empty label when no shift is active.
   *
   * @element x-lastshift
   * @attr {number} machine-id (required) machine id
   * @attr {number} update     polling interval in ms (overrides the config)
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class LastShiftComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * @param {...any} args
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

    /**
     * Builds the DOM: `<div.lastshift>` wrapping `<a.lastshift-linkreport>` with `<span.lastshift-shiftlabel>`.
     * The `<a>` is kept for optional future report linking (`target="_blank"`).
     */
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
      this.element.replaceChildren();

      // Create DOM - Content
      let linkReport = document.createElement('a');
      linkReport.classList.add('lastshift-linkreport'); // Keep <a> it to quickly restore any link here
      linkReport.setAttribute('target', '_blank'); // To open in a new tab
      let span = document.createElement('span');
      span.classList.add('lastshift-shiftlabel');
      span.textContent = ' ';
      linkReport.appendChild(span);
      let divShift = document.createElement('div');
      divShift.classList.add('lastshift-shift');
      divShift.appendChild(linkReport);
      this._content = document.createElement('div');
      this._content.classList.add('lastshift');
      this._content.textContent = ' ';
      this._content.appendChild(divShift);
      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      this.element.appendChild(this._content);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      // Hide crt shift
      let label = this.element.querySelector('.lastshift-shiftlabel');
      if (label) label.innerHTML = '';
    }

    removeError () {
      // Code here to remove the error message. Only required if displayError is implemented
      // For example:
      this.displayError('');
    }

    /**
     * Polling interval: `update` attribute in ms if valid integer, otherwise `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      if ((this.element.hasAttribute('update'))
        && pulseUtility.isInteger(this.element.getAttribute('update'))) {
        return this.element.getAttribute('update');
      }
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * REST endpoint: `GetLastShift?MachineId=<id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'GetLastShift?MachineId='
        + this.element.getAttribute('machine-id');
    }

    /**
     * Renders the shift display name, or empty string if no shift is active.
     *
     * @param {{ Shift?: { Display: string } }} data
     */
    refresh (data) {
      this._content.innerHTML = data.Name;


      let label = this.element.querySelector('.lastshift-shiftlabel');
      if (label) {
        if (data.Shift && data.Shift.Display) {
          label.innerHTML = data.Shift.Display;
        }
        else {
          label.innerHTML = ''; // 'Out of shift');
        }
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
