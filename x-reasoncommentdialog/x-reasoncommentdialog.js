// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reasoncommentdialog
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

require('x-machinedisplay/x-machinedisplay');
require('x-datetimerange/x-datetimerange');

(function () {

  /**
   * `<x-reasoncommentdialog>` — dialog body to collect a comment for a
   * reason classification.
   *
   * Renders four labelled rows inside its host: machine
   * (`x-machinedisplay`), period (`x-datetimerange` in read-only mode),
   * reason name, and a 255-char `<textarea>` placeholder "Details...".
   * Pressing Enter on the textarea clicks the parent dialog's
   * `.dialog-button-frame-validate`. When `details-required === 'true'`,
   * disables the parent dialog's `.customDialogOk` button until the
   * textarea is non-empty.
   *
   * @element x-reasoncommentdialog
   * @attr {number}  machine-id       machine id, forwarded to `x-machinedisplay` and used to build the period context
   * @attr {string}  range            ISO range `begin;end` for the period being classified
   * @attr {string}  reason-name      HTML label of the reason
   * @attr {boolean} details-required `'true'` disables the parent dialog OK button while the textarea is empty
   * @method getDetails               current textarea value (string)
   * @extends pulseComponent.PulseInitializedComponent
   */
  class ReasonCommentDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      self._textarea = null;
      self.methods = {
        getDetails: self.getDetails
      };
      return self;
    }

    initialize () {
      this.element.replaceChildren();

      let machid = this.element.getAttribute('machine-id');
      let range = this.element.getAttribute('range') || '';
      let reasonName = this.element.getAttribute('reason-name') || '';
      let detailsRequired = this.element.getAttribute('details-required') === 'true';

      let machineDisplay = pulseUtility.createElementWithAttribute('x-machinedisplay', {
        'machine-id': machid
      });
      let divMachine = document.createElement('div');
      divMachine.classList.add('reasoncommentdialog-machine');
      let machineLabel = document.createElement('div');
      machineLabel.classList.add('reasoncommentdialog-label');
      machineLabel.innerHTML = this.getTranslation('machineColon', 'Machine: ');
      divMachine.appendChild(machineLabel);
      divMachine.appendChild(machineDisplay);

      let tagDatetimerange = pulseUtility.createElementWithAttribute('x-datetimerange', {
        'range': range,
        'hide-buttons': 'true',
        'not-editable': 'true',
        'period-context': 'reasoncomment' + machid
      });
      let divDatetimerange = document.createElement('div');
      divDatetimerange.classList.add('reasoncommentdialog-period');
      let periodLabel = document.createElement('div');
      periodLabel.classList.add('reasoncommentdialog-label');
      periodLabel.innerHTML = this.getTranslation('periodColon', 'Period: ');
      divDatetimerange.appendChild(periodLabel);
      divDatetimerange.appendChild(tagDatetimerange);

      let divReason = document.createElement('div');
      divReason.classList.add('reasoncommentdialog-reason');
      let reasonLabel = document.createElement('div');
      reasonLabel.classList.add('reasoncommentdialog-label');
      reasonLabel.innerHTML = this.getTranslation('reasonColon', 'Reason: ');
      divReason.appendChild(reasonLabel);
      let reasonName_span = document.createElement('span');
      reasonName_span.classList.add('reasoncommentdialog-reason-name');
      reasonName_span.innerHTML = reasonName;
      divReason.appendChild(reasonName_span);

      this._textarea = document.createElement('textarea');
      this._textarea.setAttribute('name', 'details-comment');
      this._textarea.setAttribute('placeholder', 'Details...');
      this._textarea.setAttribute('maxlength', '255');
      this._textarea.addEventListener('keydown', function (event) {
        if (event.keyCode == 13) {
          let btn = document.querySelector('a.dialog-button-frame-validate');
          if (btn) btn.click();
        }
      });
      let divDetails = document.createElement('div');
      divDetails.classList.add('reasoncommentdialog-details');
      divDetails.appendChild(this._textarea);

      this.element.appendChild(divMachine);
      this.element.appendChild(divDatetimerange);
      this.element.appendChild(divReason);
      this.element.appendChild(divDetails);

      if (detailsRequired) {
        let self = this;
        setTimeout(function () {
          let customDialog = self.element.closest('.customDialog');
          let okBtn = customDialog ? customDialog.querySelector('.customDialogOk') : null;
          if (okBtn) {
            okBtn.setAttribute('disabled', 'disabled');
            self._textarea.addEventListener('keyup', updateButtonState);
            self._textarea.addEventListener('paste', updateButtonState);
            self._textarea.addEventListener('input', updateButtonState);
          }
          function updateButtonState() {
            // Trim so whitespace-only input (spaces, tabs, newlines) is rejected
            // like an empty comment instead of enabling the OK button.
            if (self._textarea.value.trim().length === 0) {
              okBtn.setAttribute('disabled', 'disabled');
            } else {
              okBtn.removeAttribute('disabled');
            }
          }
        }, 0);
      }

      this.switchToNextContext();
    }

    /** Current textarea value (user-entered comment). */
    getDetails () {
      return this._textarea ? this._textarea.value : '';
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-reasoncommentdialog', ReasonCommentDialogComponent);
})();
