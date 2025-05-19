// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-savemachinestatetemplate
 * @requires module:pulseComponent
 * @requires pulseUtility
 * @requires pulseRange
 * @requires x-datetimerange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseRange = require('pulseRange');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');

require('x-datetimerange/x-datetimerange');

(function () {

  class SaveMachineStateTemplateComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      //this._content = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start(); // == validate + send ajax request
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-bigdisplay'); // Mandatory for loader

      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listeners

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      // Create dialog
      this._dialog = $('<div></div>').addClass('savemachinestatetemplate-dialog');
      //$(this.element).append(this._dialog);
      let switchLabel = $('<div></div>').addClass('savemachinestatetemplate-dialog-label')
        .html(this.getTranslation('switch', 'Switch to  '));
      let MST_CB = $('<div></div>')
        //.addClass('savemachinestatetemplate-dialog-label')
        .addClass('savemachinestatetemplate-dialog-div-select');

      // Combobox
      //this._MSTselectCB = $('<select name=MST_CB size=' + data.MachineStateTemplates.length + '></select>');
      this._MSTselectCB = $('<select name=MST_CB ></select>');
      MST_CB.append(this._MSTselectCB);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(MST_CB).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(MST_CB).append(messageDiv);

      //let nowISO = pulseUtility.convertMomentToDateTimeString(moment());
      //let isobegin = nowISO;
      let rangeForDisplay = pulseRange.createDefaultInclusivity(new Date(), null);
      if (this.element.hasAttribute('range')) { // Hope No
        rangeForDisplay = pulseRange.createStringRangeFromString(this.element.getAttribute('range'));
      }
      // Check nullable end
      let isoend = null;
      if ((rangeForDisplay.upper != null) &&
        (rangeForDisplay.upper != '') &&
        (moment(rangeForDisplay.upper).isValid()) &&
        (moment(rangeForDisplay.upper) < moment())) {
        isoend = rangeForDisplay.upper; // no possible "no end"
      }

      // Check if Begin is EMPTY -> replace with "now"
      if ((rangeForDisplay.lower == null) ||
        (rangeForDisplay.lower == '') ||
        (!moment(rangeForDisplay.lower).isValid())) {
        rangeForDisplay.lower = pulseUtility.convertMomentToDateTimeString(moment());
      }
      // FROM / TO = datetimerange
      this._dtRange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'possible-no-end': (isoend == null),
        'range': pulseUtility.convertDateRangeForWebService(rangeForDisplay),
        'period-context': 'savemst' + this.element.getAttribute('machine-id'),
        'hide-buttons': 'true'
      });
      let rangeDiv = $('<div></div>').addClass('savemachinestatetemplate-dialog-dtp-div').append(this._dtRange);

      this._dialog.append(switchLabel).append(MST_CB).append(rangeDiv);

      let title = this.getTranslation('changeMachineStateTitle', 'Change machine state');

      let saveDialogId = pulseCustomDialog.initialize(this._dialog, {
        title: title,
        onOk: function (x_save) { // to avoid closure
          return function () {
            //let begin = $(dtRange)[0].getBegin();
            //let end = $(dtRange)[0].getEnd();     // can be null

            let range = $(x_save._dtRange)[0].getRangeString();
            let newMST = x_save._MSTselectCB[0].options[x_save._MSTselectCB[0].selectedIndex].value;
            let machid = x_save.element.getAttribute('machine-id'); // Should be copied. This.element disappear before request answer
            let url = x_save.getConfigOrAttribute('path', '') + 'MachineStateTemplateMachineAssociation/Save?MachineId=' + machid
              + '&Range=' + range + '&MachineStateTemplateId=' + newMST + '&RevisionId=-1';
            // revision=-1 : to force new revision creation
            /*&UserId=&ShiftId=&Force=*/
            return pulseService.runAjaxSimple(url,
              function (data) {
                this._saveSuccess(data, machid);
              }.bind(x_save),
              x_save._saveError.bind(x_save),
              x_save._saveFail.bind(x_save));
          }
        }(this),
        autoClose: true,
        autoDelete: true
      });
      pulseCustomDialog.open('#' + saveDialogId);

      /* // This DO NOT WORK [TODO] find a way to reload parent
        onClose :
          //$(this).parent().reload(); // to find x-lastmachinestatetemplate ???  -> msg ? */

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._dialog = undefined;
      this._MSTselectCB = undefined;
      this._dtRange = undefined;
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
        console.error('missing attribute machine-id in saveMST.element');
        // Delayed display :
        this.setError('missing machine-id');
        // or
        // Immediat display :
        //this.switchToKey('Error', () => this.displayError('invalid param'), () => this.removeError());
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);
    }

    removeError () {
      this.displayError('');
    }

    getShortUrl () {
      // Always current data = no range

      let url = 'NextMachineStateTemplate?'
      let nbParam = 0;
      if (this.element.hasAttribute('mst-id')) {
        url += 'CurrentMachineStateTemplateId=' + this.element.getAttribute('mst-id');
        nbParam++;
      }

      url += (nbParam == 0) ? '' : '&';
      let role = pulseLogin.getRole(); // or getAppContextOrRole ?
      ///TODO : change and use 'rolekey=' + role WHEN READY in pulse
      if (role == 'manager')
        url += 'RoleId=5'; // manager
      else
        url += 'RoleId=1'; // operator

      return url;
    }

    refresh (data) {
      // Combobox
      $(this._MSTselectCB).empty();

      $(this._MSTselectCB).attr('size', data.MachineStateTemplates.length);
      for (let index = 0; index < data.MachineStateTemplates.length; index++) {
        let MSToptionCB;
        if (index == 0) {
          MSToptionCB = $('<option value=' + data.MachineStateTemplates[index].Id + ' selected></option>').html(data.MachineStateTemplates[index].Display);
        }
        else {
          MSToptionCB = $('<option value=' + data.MachineStateTemplates[index].Id + '></option>').html(data.MachineStateTemplates[index].Display);
        }
        MSToptionCB.addClass('savemachinestatetemplate-option');
        this._MSTselectCB.append(MSToptionCB).addClass('savemachinestatetemplate-select');
      }
      if (0 == data.MachineStateTemplates.length) {
        pulseCustomDialog.openError('No flow is defined. Please contact support', 'No data');
      }
    }

    _saveSuccess (data, machid) {
      console.log('_saveSuccess');

      let revisionId = null;
      if (data.Revision) {
        revisionId = data.Revision.Id;
      }
      else {
        console.assert('NO revisionId');
        //revisionId = data.Id;
        return;
      }
      console.info('MOS revision id=' + revisionId);

      // Store modification
      let rangeString = $(this._dtRange)[0].getRangeString();
      let range = pulseRange.createDateRangeFromString(rangeString);
      let ranges = [];
      ranges.push(range);
      pulseUtility.getOrCreateSingleton('x-modificationmanager')
        .addModification(data.Revision.Id, 'MST',
          machid, ranges);
    }

    _saveError (data) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openError(data.ErrorMessage, 'Error', close);
    }
    _saveFail (url) {
      let close = function () {
        // DO nothing because of autoclose
      };
      //close(); // ???
      pulseCustomDialog.openError('Error while saving', 'Error', close);
    }

  }

  pulseComponent.registerElement('x-savemachinestatetemplate', SaveMachineStateTemplateComponent, ['machine-id']);
})();
