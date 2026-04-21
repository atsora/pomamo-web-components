// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currentworkinfo
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 * @requires module:detailspopup
 */
var pulseComponent = require('pulsecomponent');

(function () {

  /**
   * `<x-currentworkinfo>` — displays current work information for a machine or group.
   *
   * Polls `GetLastWorkInformationV3/<id-or-group>` at `currentRefreshSeconds` interval.
   * `manageSuccess()` hides the component when `MonitoredMachineOperationBar` is 'None'.
   * `refresh(data)` builds a single concatenated display of all `WorkInformations` values,
   * but only re-renders if the data has changed (compared against `_displayedWorkInformations`).
   *
   * Attributes:
   *   machine-id - integer machine id (takes priority over group)
   *   group      - group id (used if machine-id absent)
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class CurrentWorkInfoComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._displayedWorkInformations = null;

      self._content = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text');

      // Update here some internal parameters

      // In case of clone, need to be empty :
      $(this.element).empty();
      this._displayedWorkInformations = null;

      // Create DOM - Content
      this._content = $('<div></div>').addClass('workinfo-content');
      $(this.element).append(this._content);

      // Create DOM - message for error
      /*this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);*/

      // Create DOM - Loader
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);*/

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }


    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      this._displayedWorkInformations = null;

      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')
        && !this.element.hasAttribute('group')) {
        this.setError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines')); // delayed error message
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._content).empty();
      this._displayedWorkInformations = null;
    }

    removeError () {
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * REST endpoint: `GetLastWorkInformationV3/<group-or-machine-id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let url = 'GetLastWorkInformationV3/'
      if (this.element.hasAttribute('group')) {
        url += this.element.getAttribute('group');
      }
      else {
        url += this.element.getAttribute('machine-id');
      }
      return url;
    }

    /**
     * Re-renders the work info display only if the data has changed.
     * Concatenates all `WorkInformations[].Value` into a single line.
     * Clears the display if `SlotMissing` is true.
     *
     * @param {{ SlotMissing: boolean, WorkInformations: Array<{ Kind: string, Value: string }>, MonitoredMachineOperationBar: string }} data
     */
    refresh (data) {
      if (data.SlotMissing) {
        $(this._content).empty();
        this._displayedWorkInformations = null;
        return;
      }

      let needToRefresh = (this._displayedWorkInformations == null);
      if (!needToRefresh) {
        needToRefresh = (this._displayedWorkInformations.length != data.WorkInformations.length);
      }
      let index = 0;
      while ((!needToRefresh) && (index < data.WorkInformations.length)) {
        if (this._displayedWorkInformations[index].Kind != data.WorkInformations[index].Kind) {
          needToRefresh = true;
        }
        else if (this._displayedWorkInformations[index].Value != data.WorkInformations[index].Value) {
          needToRefresh = true;
        }
        index++;
      }

      if (needToRefresh) {
        $(this._content).empty();
        let operationDisplay = ''; // Will be changed with operationslot.display ASAP
        for (const workInformation of data.WorkInformations) {
          if (workInformation.Value) {
            operationDisplay += workInformation.Value + ' ';
          }
        } // end for
        // SINGLE display for all kind
        let div = $('<div></div>').addClass('workinfo-singledata')
          .html(operationDisplay);
        $(this._content).append(div);
        this._displayedWorkInformations = data.WorkInformations;
      }
    }

    /**
     * Overrides base success handler: hides the component and switches to `NotApplicable`
     * when `MonitoredMachineOperationBar` is 'None' (machine has no operation tracking).
     * Otherwise delegates to `refresh(data)`.
     *
     * @param {*} data
     */
    manageSuccess (data) {
      //check if given machine do not manage Operation
      //if so, hide component
      if (data.MonitoredMachineOperationBar == 'None') {
        console.info('No operation for this machine : '
          + this.element.getAttribute('machine-id'));
        $(this.element).hide();

        this.switchToContext('NotApplicable');
        return;
      }

      $(this.element).show();

      super.manageSuccess(data);
    }

  }

  pulseComponent.registerElement('x-currentworkinfo', CurrentWorkInfoComponent, ['machine-id']);
})();
