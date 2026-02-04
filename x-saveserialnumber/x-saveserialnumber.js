// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-saveserialnumber used to build saveSerialNumber widget. It allow user to enter
 * a serial number or update existing one.
 *
 * @module x-saveserialnumber
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseCustomDialog
 */

var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
//var eventBus = require('eventBus');

require('x-datetimerange/x-datetimerange');

/*
 *This tag is used to save serial number for a given machine. It can take following attribute:
 *  - machine-id : id of given machine
 *  - range :
 *  - datetime : realbegin or end
 *  - is-begin : is datetime == begin
 *  - serial-number :
 */
(function () {

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
          $(this._serialNumberInput).val(newVal);

          //place cursor at end of text when input get focus
          $(this._serialNumberInput).focus(function () {
            this.selectionStart = this.selectionEnd = this.value.length;
          });
          //each time dialog box get focus, focus is send to input text it contents
          try {
            $(this).closest('.dialog').on('dialogfocus', function (event, ui) {
              $(this._serialNumberInput).focus();
            });
          }
          catch (e) {
            // Do nothing
          }
          //Give focus to it input text
          $(this._serialNumberInput).focus();
        } break;
        case 'range': {
          let pos = newVal.indexOf(';');
          let begin = newVal.substr(0, pos);
          let end = newVal.substr(pos + 1, newVal.length - (pos + 1));
          this._setRange(begin, end);
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

        $(this._xdatetimerange).setAttribute(
          'range',
          this._rangeBegin + ';' + this._rangeEnd);
      }
    }

    saveSN () {
      let serialNumber = $(this._serialNumberInput).val();

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
      pulseCustomDialog.openError(data.ErrorMessage, 'Error', close);
    }

    _saveFail (url) {
      let close = function () {
        //DO nothing because of autoclose
        //pulseCustomDialog.close('.lastserialnumber-dialog');
      };
      pulseCustomDialog.openError('Error while saving', 'Error', close);
    }


    initialize () {
      this.addClass('pulse-bigdisplay');

      // Listener

      // In case of clone, need to be empty :
      $(this.element).empty();

      // tmp disable CLEAN this.element -> TO remove in v 7.0
      //$(this.element).addClass('disableDeleteWhenDisconnect');

      // Create DOM - Content
      this._serialNumberInput = $('<input type="text" placeholder="Serial number..." autofocus></input>').val($(this).attr('serial-number'));
      let divinputtext = $('<div></div>').addClass('saveserialnumber-inputtext')
        .append(this._serialNumberInput);

      //place cursor at end of text when input get focus
      //divinputtext.find('input')
      this._serialNumberInput.focus(
        function () {
          this.selectionStart = this.selectionEnd = this.value.length;
        });

      if (!(this._rangeBegin) || !(this._rangeEnd)) {
        if (this.element.hasAttribute('range')) {
          let newVal = this.element.getAttribute('range');
          let pos = newVal.indexOf(';');
          this._rangeBegin = newVal.substr(0, pos);
          this._rangeEnd = newVal.substr(pos + 1, newVal.length - (pos + 1));
        }
      }

      let r = pulseRange.createDateRangeDefaultInclusivity(this._rangeBegin, this._rangeEnd);

      this._xdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'range': pulseUtility.convertDateRangeForWebService(r), // this._rangeBegin + ';' + this._rangeEnd,
        'noteditable': 'true',
        'period-context': 'saveserialnumber' + this.element.getAttribute('machine-id')
      });
      let divdaterange = $('<div></div>').addClass('saveserialnumber-daterange')
        .append(this._xdatetimerange);

      this._content = $('<div></div>').addClass('saveserialnumber')
        .append(divdaterange).append(divinputtext);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      $(this.element).append(this._content);

      // Each time dialog box get focus, focus is send to input text it contents
      try {
        $(this).closest('.dialog').on('dialogfocus', function (event, ui) {
          this._serialNumberInput.focus();
        });
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
      $(this.element).empty();

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
          let pos = newVal.indexOf(';');
          this._rangeBegin = newVal.substr(0, pos);
          this._rangeEnd = newVal.substr(pos + 1, newVal.length - (pos + 1));

          this._xdatetimerange.setAttribute('range',
            this._rangeBegin + ';' + this._rangeEnd);
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
