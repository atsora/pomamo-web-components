// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reasonsubdetails
 * @requires module:pulseComponent
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseConfig from 'pulseConfig';
import * as pulseUtility from 'pulseUtility';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseDetailsPopup from 'pulsecomponent-detailspopup';

(function () {

  /**
   * `<x-reasonsubdetails>` — headless lookup that opens an alternative-
   * reasons popup at a click position.
   *
   * Fetches `Reason/AllAt/Get?MachineId=<id>&At=<when>` once and opens a
   * popup via `pulseDetailsPopup.openGenericPopup` positioned at
   * (`clientX`, `clientY`). Each entry in `ReasonAllAtItems` is rendered
   * with `Display` and `Details`; the first item is skipped (treated as
   * the current primary reason). When the active role is `dev`,
   * scoring/source metadata is appended to each row.
   *
   * @element x-reasonsubdetails
   * @attr {number} machine-id (required) machine id
   * @attr {string} when       (required) ISO datetime
   * @attr {number} clientX    popup X position
   * @attr {number} clientY    popup Y position
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
      this.element.replaceChildren();

      // Create DOM - Content
      /*this._popup = document.createElement('div');
      this._popup.className = 'pulse-reasonsubdetails-popup';
      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._popup.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._popup.appendChild(messageDiv);

      this.element.className = 'reasonsubdetails';
      this.element.appendChild(this._popup);*/

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

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
      if (this._content) {
        this._content.innerHTML = message;
      }
      pulseCustomDialog.openDialog(message, { type: 'Error', title: 'Error', onClose: this._close.bind(this) });
    }
    _close () {
      // Close popup

      // Remove component
      this.element.remove();
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
        let showReasonScore = pulseConfig.getBool('reasonsubdetails.showReasonScore', false);
        // Fill popup
        let popup_content = document.createElement('div');
        popup_content.className = 'reasonsubdetails-popupcontent';

        // Update the component with data which is returned by the web service in case of success
        for (let i = 1 /* Do not display 1st */;
          i < data.ReasonAllAtItems.length; i++) {

          let onereason = document.createElement('div');
          onereason.className = 'reasonsubdetails-onereason';

          //For everybody
          let display = document.createElement('div');
          display.className = 'reasonsubdetails-display';
          display.innerHTML = data.ReasonAllAtItems[i].Display;
          onereason.appendChild(display);

          if (!pulseUtility.isNotDefined(data.ReasonAllAtItems[i].Details)) {
            let details = document.createElement('div');
            details.className = 'reasonsubdetails-details';
            details.innerHTML = data.ReasonAllAtItems[i].Details;
            onereason.appendChild(details);
          }

          // AVAILABLE too :
          //data.ReasonAllAtItems[i].Color;
          //data.ReasonAllAtItems[i].Source.UnsafeAutoReasonNumber;
          //data.ReasonAllAtItems[i].Source.UnsafeManualFlag;

          // For dev only :
          let score = document.createElement('span');
          score.className = 'reasonsubdetails-score';
          score.innerHTML = data.ReasonAllAtItems[i].Score + ' ';
          let def = document.createElement('span');
          def.className = 'reasonsubdetails-default';
          def.innerHTML = data.ReasonAllAtItems[i].Source.Default ? 'default ' : 'notDefault ';
          let auto = document.createElement('span');
          auto.className = 'reasonsubdetails-auto';
          auto.innerHTML = data.ReasonAllAtItems[i].Source.Auto ? 'Auto ' : 'NotAuto ';
          let manu = document.createElement('span');
          manu.className = 'reasonsubdetails-manual';
          manu.innerHTML = data.ReasonAllAtItems[i].Source.Manual ? 'Manual ' : 'NotManual ';
          let dev = document.createElement('div');
          dev.className = 'reasonsubdetails-dev';
          dev.appendChild(score);
          dev.appendChild(def);
          dev.appendChild(auto);
          dev.appendChild(manu);
          onereason.appendChild(dev);

          popup_content.appendChild(onereason);

          if (!showReasonScore)
            dev.style.display = 'none';
        }
        popup.appendChild(popup_content);
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
