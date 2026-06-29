// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-saveserialnumber
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseCustomDialog
 */

import * as pulseUtility from 'pulseUtility';
import * as pulseService from 'pulseService';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseComponent from 'pulsecomponent';
import * as pulseRange from 'pulseRange';
//var eventBus = require('eventBus');

import 'x-datetimerange/x-datetimerange';

(function () {

  /**
   * `<x-saveserialnumber>` — form to enter or update the serial number
   * of one machine cycle.
   *
   * Renders an editable serial-number input. Calling `saveSN(this)`
   * POSTs the new value via `pulseService`; the request identifies the
   * cycle by `machine-id`, `range`, `datetime` and `is-begin`.
   * Receiving an updated `serial-number` attribute refreshes the input
   * value and re-focuses it when the host dialog regains focus.
   *
   * @element x-saveserialnumber
   * @attr {number}  machine-id    (required) machine id
   * @attr {string}  range         ISO datetime range `begin;end` of the cycle
   * @attr {string}  datetime      datetime within the cycle
   * @attr {boolean} is-begin      `'true'` when `datetime` is the cycle begin
   * @attr {string}  serial-number initial serial-number value
   * @method saveSN               submit the current input value
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class SaveSerialNumberComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self.methods = {
        'saveSN': self.saveSN
      };

      return self;
    }

    //get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        case 'serial-number': {
          this._serialNumberInput.value = newVal;

          //place cursor at end of text when input get focus
          this._serialNumberInput.addEventListener('focus', function () {
            this.selectionStart = this.selectionEnd = this.value.length;
          });
          //each time dialog box get focus, focus is send to input text it contents
          try {
            let dialog = this.element.closest('.dialog');
            if (dialog) {
              dialog.addEventListener('dialogfocus', (event, ui) => {
                this._serialNumberInput.focus();
              });
            }
          }
          catch (e) {
            // Do nothing
          }
          //Give focus to it input text
          this._serialNumberInput.focus();
        } break;
        case 'range': {
          let r = pulseRange.createDateRangeFromString(newVal);
          this._setRange(
            r.lower ? r.lower.toISOString() : '',
            r.upper ? r.upper.toISOString() : ''
          );
        } break;
        default:
          break;
      }
    }

    _setRange (isoBegin, isoEnd) {
      if ((this._rangeBegin != isoBegin) ||
        (this._rangeEnd != isoEnd)) {
        this._rangeBegin = isoBegin;
        this._rangeEnd = isoEnd;

        let r = pulseRange.createDateRangeDefaultInclusivity(this._rangeBegin, this._rangeEnd);
        this._xdatetimerange.setAttribute(
          'range',
          pulseUtility.convertDateRangeForWebService(r));
      }
    }

    saveSN () {
      let serialNumber = this._serialNumberInput.value;

      let machid = this.element.getAttribute('machine-id'); // Should be copied. This.element disappear before request answer
      let url = this.getConfigOrAttribute('path', '')
        + 'SaveSerialNumberV5?MachineId=' + machid
        + '&DateTime=' + this.element.getAttribute('datetime')
        + '&IsBegin=' + this.element.hasAttribute('is-begin')
        + '&SerialNumber=' + serialNumber;

        pulseService.runAjaxSimple(url,
        function (data) {
          this._saveSuccess(data, machid);
        }.bind(this),
        this._saveError.bind(this),
        this._saveFail.bind(this));
    }

    _saveSuccess (data, machid) {
      // Manage progress bar
      let ranges = [];
      let range = '[' + this.element.getAttribute('datetime') + ','
        + this.element.getAttribute('datetime') + ')';
      ranges.push(pulseRange.createDateRangeFromString(range));
      pulseUtility.getOrCreateSingleton('x-modificationmanager')
        .addModification(data.Revision.Id, 'serialnumber',
          machid, ranges);
    }

    _saveError (data) {
      let close = function () {
        //DO nothing because of autoclose
        //pulseCustomDialog.close('.lastserialnumber-dialog');
      };
      pulseCustomDialog.openDialog(data.ErrorMessage, { type: 'Error', title: 'Error', onClose: close });
    }

    _saveFail (url) {
      let close = function () {
        //DO nothing because of autoclose
        //pulseCustomDialog.close('.lastserialnumber-dialog');
      };
      pulseCustomDialog.openDialog('Error while saving', { type: 'Error', title: 'Error', onClose: close });
    }


    initialize () {
      this.addClass('pulse-bigdisplay');

      // Listener

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // tmp disable CLEAN this.element -> TO remove in v 7.0
      //this.element.classList.add('disableDeleteWhenDisconnect');

      // Create DOM - Content
      this._serialNumberInput = document.createElement('input');
      this._serialNumberInput.type = 'text';
      this._serialNumberInput.placeholder = 'Serial number...';
      this._serialNumberInput.autofocus = true;
      this._serialNumberInput.value = this.element.getAttribute('serial-number') || '';
      let divinputtext = document.createElement('div');
      divinputtext.className = 'saveserialnumber-inputtext';
      divinputtext.appendChild(this._serialNumberInput);

      //place cursor at end of text when input get focus
      this._serialNumberInput.addEventListener('focus', function () {
        this.selectionStart = this.selectionEnd = this.value.length;
      });

      if (!(this._rangeBegin) || !(this._rangeEnd)) {
        if (this.element.hasAttribute('range')) {
          let r0 = pulseRange.createDateRangeFromString(this.element.getAttribute('range'));
          this._rangeBegin = r0.lower ? r0.lower.toISOString() : '';
          this._rangeEnd = r0.upper ? r0.upper.toISOString() : '';
        }
      }

      let r = pulseRange.createDateRangeDefaultInclusivity(this._rangeBegin, this._rangeEnd);

      this._xdatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange', {
        'range': pulseUtility.convertDateRangeForWebService(r), // this._rangeBegin + ';' + this._rangeEnd,
        'noteditable': 'true',
        'period-context': 'saveserialnumber' + this.element.getAttribute('machine-id')
      });
      let divdaterange = document.createElement('div');
      divdaterange.className = 'saveserialnumber-daterange';
      divdaterange.appendChild(this._xdatetimerange);

      this._content = document.createElement('div');
      this._content.className = 'saveserialnumber';
      this._content.appendChild(divdaterange);
      this._content.appendChild(divinputtext);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      this.element.appendChild(this._content);

      // Each time dialog box get focus, focus is send to input text it contents
      try {
        let dialog = this.element.closest('.dialog');
        if (dialog) {
          dialog.addEventListener('dialogfocus', (event, ui) => {
            this._serialNumberInput.focus();
          });
        }
      }
      catch (e) {
        // Do nothing
      }
      //Give focus to it input text
      this._serialNumberInput.focus();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._serialNumberInput = undefined;
      this._xdatetimerange = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        //this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }
      if (!(this._rangeBegin) || !(this._rangeEnd)) {
        if (this.element.hasAttribute('range')) {
          let newVal = this.element.getAttribute('range');
          let r = pulseRange.createDateRangeFromString(newVal);
          this._rangeBegin = r.lower ? r.lower.toISOString() : '';
          this._rangeEnd = r.upper ? r.upper.toISOString() : '';
          this._xdatetimerange.setAttribute('range',
            pulseUtility.convertDateRangeForWebService(r));
        }
        else {
          //this.setError('missing range'); // delayed
          return;
        }
      }

      this.switchToNextContext();
    }

  }

  pulseComponent.registerElement('x-saveserialnumber', SaveSerialNumberComponent, ['machine-id', 'serial-number', 'range']);
})();
