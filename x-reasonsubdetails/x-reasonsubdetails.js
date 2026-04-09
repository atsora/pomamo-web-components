// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reasonsubdetails
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseUtility = require('pulseUtility');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');

(function () {

  /**
   * `<x-reasonsubdetails>` — headless component that fetches all reasons at a given point in time
   * and opens a popup with the list of alternative reasons via `pulseDetailsPopup.openGenericPopup`.
   *
   * Fetches `Reason/AllAt/Get?MachineId=<id>&At=<when>` once (single request).
   * Skips the first reason in `ReasonAllAtItems` (assumed to be the current primary reason).
   * Displays `Display`, `Details`, and (in `dev` role) scoring/source metadata per reason.
   *
   * Attributes:
   *   machine-id - (required) integer machine id
   *   when       - (required) ISO datetime string for the `At` parameter
   *   clientX    - X position for popup placement (forwarded to `pulseDetailsPopup`)
   *   clientY    - Y position for popup placement
   *
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class ReasonSubDetailsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      //this._content
      self._event = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-bigdisplay'); // Mandatory for loader

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listener and dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      /*this._popup = $('<div></div>').addClass('pulse-reasonsubdetails-popup');
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._popup).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._popup).append(messageDiv);

      $(this.element)
        .addClass('reasonsubdetails')
        .append(this._popup);*/

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      //this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      /* Should add :
      if ( undefined 'clientX' /  'clientY'
        this.setError('search position'); // Should never happens
        return;
      }*/
      if (!this.element.hasAttribute('machine-id')) {
        //this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      if (!this.element.hasAttribute('when')) {
        console.error('missing attribute when in ReasonSubDetails.element');
        // Delayed display :
        //this.setError('missing date');
        // or
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.missingWhen', 'Missing when')), () => this.removeError());
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
      // For example:
      $(this._content).html(message);
      pulseCustomDialog.openDialog(message, { type: 'Error', title: 'Error', onClose: this._close.bind(this) });
    }
    _close () {
      // Close popup

      // Remove component
      $(this.element).remove();
    }

    removeError () {
      // Code here to remove the error message. Only required if displayError is implemented
      // For example:
      this.displayError('');
    }

    /**
     * REST endpoint: `Reason/AllAt/Get?MachineId=<id>&At=<when>`.
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      return 'Reason/AllAt/Get?MachineId=' + this.element.getAttribute('machine-id')
        + '&At=' + this.element.getAttribute('when');
    }

    /**
     * Builds the popup content from `data.ReasonAllAtItems` (skipping index 0) and opens it
     * via `pulseDetailsPopup.openGenericPopup` at the `clientX`/`clientY` position.
     *
     * @param {{ ReasonAllAtItems: Array<{ Display: string, Details?: string, Color?: string, Score: number, Source: { Default: boolean, Auto: boolean, Manual: boolean, UnsafeAutoReasonNumber?: number, UnsafeManualFlag?: boolean } }> }} data
     */
    refresh (data) {

      var fillMethod = function (popup, data) {
        let role = pulseConfig.getAppContextOrRole();
        // Fill popup
        let popup_content = $('<div></div>').addClass('reasonsubdetails-popupcontent');

        // Update the component with data which is returned by the web service in case of success
        for (let i = 1 /* Do not display 1st */;
          i < data.ReasonAllAtItems.length; i++) {

          let onereason = $('<div></div>').addClass('reasonsubdetails-onereason');

          //For everybody
          let display = $('<div></div>').addClass('reasonsubdetails-display')
            .html(data.ReasonAllAtItems[i].Display);
          onereason.append(display);

          if (!pulseUtility.isNotDefined(data.ReasonAllAtItems[i].Details)) {
            let details = $('<div></div>').addClass('reasonsubdetails-details')
              .html(data.ReasonAllAtItems[i].Details);
            onereason.append(details);
          }

          // AVAILABLE too :
          //data.ReasonAllAtItems[i].Color;
          //data.ReasonAllAtItems[i].Source.UnsafeAutoReasonNumber;
          //data.ReasonAllAtItems[i].Source.UnsafeManualFlag;

          // For dev only :
          let score = $('<span></span>').addClass('reasonsubdetails-score')
            .html(data.ReasonAllAtItems[i].Score + ' ');
          let def = $('<span></span>').addClass('reasonsubdetails-default')
            .html(data.ReasonAllAtItems[i].Source.Default ? 'default ' : 'notDefault ');
          let auto = $('<span></span>').addClass('reasonsubdetails-auto')
            .html(data.ReasonAllAtItems[i].Source.Auto ? 'Auto ' : 'NotAuto ');
          let manu = $('<span></span>').addClass('reasonsubdetails-manual')
            .html(data.ReasonAllAtItems[i].Source.Manual ? 'Manual ' : 'NotManual ');
          let dev = $('<div></div>').addClass('reasonsubdetails-dev')
            .append(score).append(def).append(auto).append(manu);
          onereason.append(dev);

          $(popup_content).append(onereason);

          if (role != 'dev')
            dev.hide();
        }
        popup.append(popup_content);
      } // end fillMethod

      // Event for position
      let event = {
        clientX: this.element.getAttribute('clientX'),
        clientY: this.element.getAttribute('clientY')
      };
      pulseDetailsPopup.openGenericPopup((popup => fillMethod(popup, data)),
        event);
    } // end refresh
  }

  pulseComponent.registerElement('x-reasonsubdetails', ReasonSubDetailsComponent);
})();
