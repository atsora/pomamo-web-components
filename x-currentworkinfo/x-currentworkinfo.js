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

      let nbLines = this.getConfigOrAttribute('nblines', 1);
      if (nbLines > 1) {
        $(this._element).css('height', (1.5 * nbLines + 'em')); // Hack for Remmele
        $(this._element).css('word-wrap', 'break-word');
      }
      else { // in CSS ?
        $(this._element).css('white-space', 'nowrap'); // to allow '...'
      }

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
        console.error('missing attribute machine or group id in CurrentWorkInfo');
        this.setError('missing machine or group'); // delayed error message
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

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

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
