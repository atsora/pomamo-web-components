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

/**
 * Build a custom tag <x-reasoncommentdialog> used as the content of a
 * pulseCustomDialog to collect a comment (details) for a reason
 * classification. Used by x-savereason and x-stopclassification.
 *
 * Attributes:
 *   machine-id       - machine id (for x-machinedisplay + period context)
 *   range            - ISO range string for the period being classified
 *   reason-name      - HTML label of the reason being commented
 *   details-required - 'true' disables the parent dialog Ok button until
 *                      the textarea has content
 *
 * Public API (for the opener):
 *   getDetails()     - returns the current textarea value (string)
 */
(function () {

  class ReasonCommentDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      self._textarea = null;
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
