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
      $(this.element).empty();

      let machid = this.element.getAttribute('machine-id');
      let range = this.element.getAttribute('range') || '';
      let reasonName = this.element.getAttribute('reason-name') || '';
      let detailsRequired = this.element.getAttribute('details-required') === 'true';

      let machineDisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': machid
      });
      let divMachine = $('<div></div>').addClass('reasoncommentdialog-machine')
        .append($('<div></div>').addClass('reasoncommentdialog-label').html(this.getTranslation('machineColon', 'Machine: ')))
        .append(machineDisplay);

      let tagDatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'range': range,
        'hide-buttons': 'true',
        'not-editable': 'true',
        'period-context': 'reasoncomment' + machid
      });
      let divDatetimerange = $('<div></div>').addClass('reasoncommentdialog-period')
        .append($('<div></div>').addClass('reasoncommentdialog-label').html(this.getTranslation('periodColon', 'Period: ')))
        .append(tagDatetimerange);

      let divReason = $('<div></div>').addClass('reasoncommentdialog-reason')
        .append($('<div></div>').addClass('reasoncommentdialog-label').html(this.getTranslation('reasonColon', 'Reason: ')))
        .append($('<span></span>').addClass('reasoncommentdialog-reason-name').html(reasonName));

      this._textarea = $('<textarea name="details-comment" placeholder="Details..."></textarea>').attr('maxlength', 255);
      this._textarea.keydown(function (event) {
        if (event.keyCode == 13) {
          $('a.dialog-button-frame-validate').click();
        }
      });
      let divDetails = $('<div></div>').addClass('reasoncommentdialog-details').append(this._textarea);

      $(this.element)
        .append(divMachine)
        .append(divDatetimerange)
        .append(divReason)
        .append(divDetails);

      if (detailsRequired) {
        let self = this;
        setTimeout(function () {
          let okBtn = $(self.element).closest('.customDialog').find('.customDialogOk');
          okBtn.attr('disabled', 'disabled');
          self._textarea.on('keyup paste input', function () {
            if ($(this).val().length === 0) {
              okBtn.attr('disabled', 'disabled');
            } else {
              okBtn.removeAttr('disabled');
            }
          });
        }, 0);
      }

      this.switchToNextContext();
    }

    /** Current textarea value (user-entered comment). */
    getDetails () {
      return this._textarea ? this._textarea.val() : '';
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-reasoncommentdialog', ReasonCommentDialogComponent);
})();
