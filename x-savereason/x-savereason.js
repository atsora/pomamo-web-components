// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-savereason
 * @requires module:pulseComponent
 */
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseRange = require('pulseRange');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var pulseLogin = require('pulseLogin');
var state = require('state');

require('x-machinedisplay/x-machinedisplay');
require('x-datetimerange/x-datetimerange');

(function () {

  class SaveReasonComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default
      self._rangesList = [];
      self._reasonsSelected = [];
      self._closeAfterSave = false;

      self.methods = {
        'closeAfterSave': self.closeAfterSave,
        'addReason': self.addReason,
        'removeReason': self.removeReason,
        'cleanReasons': self.cleanReasons,
      };

      return self;
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': {
          this.start(); // Call reset
        } break;
        case 'ranges': {
          let ranges = newVal.split('&');
          ranges.forEach(function (element, index, array) {
            let beginEnd = pulseRange.createStringRangeFromString(element);
            this.addReason({
              range: beginEnd,
              reason: null,
              mode: null
            })
          });
          this.start(); // Call reset
        } break;
        default:
          break;
      }
    }

    initialize() {
      // In case of clone, need to be empty :
      $(this.element).empty();

      // HEADER 1 == machine
      // machine -> to hide for "big" screen ( = save page as reasonslotlist
      let machineDisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': this.element.getAttribute('machine-id')
      });
      let divMachine = $('<div></div>').addClass('savereason-machine').append(machineDisplay);
      $(this.element).append(divMachine);

      // HEADER 2 - Information about the selected periods (if any)
      let periodInfo = $('<div></div>').addClass('savereason-infoperiod');

      // Button "split"
      let splitButton = $('<div></div>').addClass('savereason-splitbutton').addClass('pushButton').html(this.getTranslation('split', 'Split'));
      $(splitButton).click(function () {
        this._tagdatetimerange[0].openChangeRange(true);
      }.bind(this));
      periodInfo.append(splitButton);

      // Label
      let periodLabel = $(`<div>${this.getTranslation('selectedPeriodsColon', 'Selected period(s): ')}</div>`).addClass('savereason-periodlabel');
      periodInfo.append(periodLabel);

      // x-datetimerange
      this._tagdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'hide-buttons': 'true',
        'period-context': 'savereason' + this.element.getAttribute('machine-id'),
        //'min-begin':, // To add for split
        //'max-end'; // To add for split
        /*,'not-editable': 'true'*/ // Must be editable otherwise the button 'split' doesn't work
      });
      periodInfo.append(this._tagdatetimerange);

      $(this.element).append(periodInfo);

      // Informations
      let divInfos = $('<div></div>').addClass('savereason-infos');
      divInfos.append($('<div></div>').addClass('savereason-info-reason'));
      divInfos.append($('<div></div>').addClass('savereason-info-modes'));
      $(this.element).append(divInfos);

      // "Applicable reasons" label and default button
      let headerReasons = $('<div></div>').addClass('savereason-reasonsheader')
        .append(`<div class="savereason-reasonslabel">${this.getTranslation('applicableReasons', 'Applicable reasons')}</div>`);
      let defaultButton = $(`<div class="savereason-defaultbutton pushButton">${this.getTranslation('resetReasonButton', 'Back to default')}</div>`);
      defaultButton.click(function () {
        this._saveReason(null); //save -> restore default
      }.bind(this));
      headerReasons.append(defaultButton);
      $(this.element).append(headerReasons);

      // scrollable "BODY"
      this._table = $('<ul></ul>')
        .addClass('savereason-table');
      let divtable = $('<div></div>')
        .addClass('savereason-data')
        .addClass('pulse-selection-table-container')
        .append(this._table);
      let list = $('<div></div>')
        .addClass('savereason-scrollable')
        .append(divtable);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loading', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(list).append(loaderDiv); // -> //TODO : move IN _content

      $(this.element).append(list);

      // FOR DOCS
      if (this.element.hasAttribute('ranges')) {
        let ranges = this.element.getAttribute('ranges').split('&');
        ranges.forEach(function (element, index, array) {
          let beginEnd = pulseRange.createStringRangeFromString(element);
          this.addReason({
            range: beginEnd,
            reason: null,
            mode: null
          });
        });
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      this._reasonsSelected = [];

      // DOM
      $(this.element).empty();

      this._tagdatetimerange = undefined;
      this._table = undefined;
      //this._messageSpan = undefined;
      //this._content = undefined;

      super.clearInitialization();
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey(context) {
      switch (context) {
        case 'NoPeriod':
          return 'Normal'; // Could be 'pipo'
        default:
          return super.getStartKey(context);
      }
    }
    /* NoPeriod STATE description + actions */
    defineState(context, key) {
      switch (context) {
        case 'NoPeriod':
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    displayNoPeriod() { //  if _rangesList = empty
      // Hide the period
      $('.savereason-infoperiod .savereason-periodlabel').html(this.getTranslation('noSelectedPeriod', 'No period is selected'));
      this._tagdatetimerange.hide();
      $('.savereason-infoperiod .savereason-splitbutton').hide();

      // Infos
      $(this.element).find('.savereason-info-reason').html(`${this.getTranslation('currentReasonColon', 'Current reason: ')}-`);
      $(this.element).find('.savereason-info-modes').html(`${this.getTranslation('modesColon', 'Modes: ')}-`);

      // Reasons
      $('.savereason-defaultbutton').hide();
      this._emptyTable();
    }

    hideNoPeriod() { // if _rangesList = NOT empty
      // Prepare infos (will be updated later)
      $(this.element).find('.savereason-info-reason').html(`${this.getTranslation('currentReasonColon: ', 'Current reason')}`);
      $(this.element).find('.savereason-info-modes').html(`${this.getTranslation('modesColon', 'Modes: ')}`);
      $('.savereason-defaultbutton').hide();

      // Period(s) and associated
      if (this._reasonsSelected.length == 1) {
        // ONLY ONE PERIOD SELECTED

        // Configure the datetime picker and show the range
        let strRange = pulseRange.createStringRangeFromString(this._reasonsSelected[0].range);
        let begin = strRange.lower;
        let end = strRange.upper;
        let now = pulseUtility.convertDateForWebService(new Date());
        this._tagdatetimerange.attr('min-begin', begin);
        this._tagdatetimerange.attr('range', this._reasonsSelected[0].range);
        if (pulseUtility.isNotDefined(end)) {
          //this._tagdatetimerange.removeAttr('max-end');
          this._tagdatetimerange.attr('max-end', now);
          this._tagdatetimerange.attr('novaluetext', 'Now');
          this._tagdatetimerange.attr('possible-no-end', true);
        }
        else {
          this._tagdatetimerange.attr('max-end', end);
          this._tagdatetimerange.removeAttr('novaluetext');
          this._tagdatetimerange.attr('possible-no-end', false);
        }
        $('.savereason-infoperiod .savereason-periodlabel').html(this.getTranslation('periodColon', 'Period: '));
        this._tagdatetimerange.show();

        // Show the split button
        $('.savereason-infoperiod .savereason-splitbutton').show();
      }
      else {
        // SEVERAL PERIODS SELECTED

        // Hide the datetime picker and show the number of selected periods
        $('.savereason-infoperiod .savereason-periodlabel').html(this._reasonsSelected.length + ' ' + this.getTranslation('nSelectedPeriods', 'selected periods'));
        this._tagdatetimerange.hide();

        // Hide the split button
        $('.savereason-infoperiod .savereason-splitbutton').hide();
      }
    }

    reset() { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      this.switchToNextContext();
    }

    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        // Delayed display:
        this.setError('missing machine-id');
        return;
      }

      if (this._reasonsSelected.length == 0) {
        this.switchToContext('NoPeriod', // see below in defineState
          () => this.displayNoPeriod(), () => this.hideNoPeriod());
        return;
      }
      else {
        this.hideNoPeriod();

        // Ask for the information
        this._getInfosData();

        this.switchToNextContext();
      }
    }

    displayError(message) {
      // Code here to display the error message
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead

      // silent error
    }

    removeError() { }


    _getInfosData() {
      let divReason = $(this.element).find('.savereason-info-reason');
      let divModes = $(this.element).find('.savereason-info-modes');
      if (this._reasonsSelected.length == 1) {
        // Current reason
        divReason.html(`${this.getTranslation('currentReasonColon', 'Current reason: ')}` + this._reasonsSelected[0].reason);

        if ((typeof (this._reasonsSelected[0].details) != 'undefined') && (this._reasonsSelected[0].details != '')) {
          let spanDetailsReason = $('<span></span>').addClass('savereason-info-reason-details')
            .html(' (' + this._reasonsSelected[0].details + ')');
          divReason.append(spanDetailsReason);
        }

        divModes.html(`${this.getTranslation('modesColon', 'Modes: ')}` + this._reasonsSelected[0].mode);

        $('.savereason-defaultbutton').show();
      }
      else if (this._reasonsSelected.length > 1) {
        let index = 1;
        let reasonDifferent = false;
        let modeDifferent = false;

        while (index < this._reasonsSelected.length && (!reasonDifferent || !modeDifferent)) {
          if (this._reasonsSelected[0].reason != this._reasonsSelected[index].reason) {
            reasonDifferent = true;
          }
          if (this._reasonsSelected[0].mode != this._reasonsSelected[index].mode) {
            modeDifferent = true;
          }
          index++;
        }

        if (!reasonDifferent) {
          divReason.html(`${this.getTranslation('currentReasonColon', 'Current reason: ')}` + this._reasonsSelected[0].reason);
        }
        else {
          divReason.html(`${this.getTranslation('currentReasonColon')}${this.getTranslation('multiple', 'multiple')}`);
        }
        if (!modeDifferent) {
          divModes.html(`${this.getTranslation('modesColon', 'Modes: ')}` + this._reasonsSelected[0].mode);
        }
        else {
          divModes.html(`${this.getTranslation('modesColon')}${this.getTranslation('multiple', 'multiple')}`);
        }
        $('.savereason-defaultbutton').show();
      }
      else {
        divReason.html(`${this.getTranslation('currentReasonColon', 'Current reason: ')}-`);
        divModes.html(`${this.getTranslation('modesColon', 'Modes: ')}-`);
      }
    }

    // Data linked to URL -> to post data
    // used in _runAjaxWhenIsVisible
    postData() {
      let webServiceRangesList = [];
      for (let i = 0; i < this._reasonsSelected.length; i++) {
        webServiceRangesList[i] = this._reasonsSelected[i].range;
      }
      return {
        'Ranges': webServiceRangesList
      };
    }

    getShortUrl() {
      let url = 'ReasonSelection/Post'
        + '?MachineId=' + Number($(this.element).attr('machine-id'));

      let role = pulseLogin.getRole(); 
      
      if (role) {
        url += '&RoleKey=' + role;
      }

      return url;
    }

    // Refresh after ReasonSelection/Post returns a list of reasons to display in table
    refresh(data) {
      // Fill the table
      this._emptyTable();

      // Sort reasons by groups
      let groups = new Object();
      let groupNames = [];
      for (let i = 0; i < data.length; i++) {
        let currentGroupName = data[i].ReasonGroupDisplay;
        if (groupNames.indexOf(currentGroupName) == -1) {
          groups[currentGroupName] = [];
          groupNames.push(currentGroupName);
        }
        groups[currentGroupName].push(data[i]);
      }

      // Order groups
      groupNames.sort();

      // Build the accordion
      for (let i = 0; i < groupNames.length; i++) {
        let group = this._getReasonGroup(groupNames[i]);
        let reasons = groups[groupNames[i]];
        reasons.sort(function (x, y) { return x.Display > y.Display; });
        for (let j = 0; j < reasons.length; j++) {
          this._addReasonInGroup(group, reasons[j]);
        }
      }

      // Collapse / Expand reason groups
      $('.savereason-table > li > span').click(function () {
        $(this).parent().find('ul').toggle();
      });

      // Hide the group names if there is only one group
      if (groupNames.length == 1) {
        $('.savereason-table > li > span').hide();
      }
      else if (groupNames.length > 1 && data.length > 8) {
        // Collapse all groups if there are too many groups
        $('.savereason-table > li > ul').hide();
      }
    }

    // Empty table with reasons OR reasongroups
    _emptyTable() {
      this._table.empty();
    }

    _getReasonGroup(groupName) {
      let group = $('<li></li>')
        .append($('<span></span>').html(groupName))
        .append('<ul></ul>');
      this._table.append(group);
      return group;
    }

    _addReasonInGroup(group, reason) {
      let reasonId;
      let reasonNoDetails = false;

      if (reason.ClassificationId) reasonId = reason.ClassificationId;
      else reasonId = reason.Id;

      if (reason.NoDetails) reasonNoDetails = reason.NoDetails;

      let elt = $('<li></li>')
        .attr('reason-id', reasonId)
        .attr('reason-text', reason.Display)
        .attr('details-required', reason.DetailsRequired);
      elt[0].reasondata = reason.Data;
      if (reason.DetailsRequired) {
        let applyWithComment = $('<div></div>')
          .addClass('applyreasonwithcomment').addClass('pushButton')
          .html(this.getTranslation('applyWithComment', 'Apply with comment'));
        elt.append(applyWithComment);

        applyWithComment.click(
          function (e) {
            this.clickOnComment(e);
          }.bind(this)
        );
      }
      else if (!reasonNoDetails) {
        let applyWithComment = $('<div></div>')
          .addClass('applyreasonwithcomment').addClass('pushButton')
          .html(this.getTranslation('withComment', 'with comment'));
        let apply = $('<div></div>')
          .addClass('applyreason').addClass('pushButton')
          .html(this.getTranslation('apply', 'Apply'));
        elt.append(applyWithComment)
          .append(apply);

        applyWithComment.click(
          function (e) {
            this.clickOnComment(e);
          }.bind(this)
        );
        apply.click(
          function (e) {
            this.clickOnReason(e);
          }.bind(this)
        );
      }
      else {
        let apply = $('<div></div>')
          .addClass('applyreason').addClass('pushButton')
          .html(this.getTranslation('apply', 'Apply'));
        elt.append(applyWithComment)
          .append(apply);

        apply.click(
          function (e) {
            this.clickOnReason(e);
          }.bind(this)
        );
      }
      let spanReason = $('<span></span>').html(reason.Display);
      if (reason.Description != undefined) {
        $(spanReason).attr('title', reason.Description);
      }
      elt.append(spanReason);
      group.find('ul').append(elt);
    }

    /* CLICK - Save reason */
    _saveReason(reasonId, details, reasonData) {
      let machineId = Number($(this.element).attr('machine-id'));
      let rangesList = [];
      for (let i = 0; i < this._reasonsSelected.length; i++) {
        let range = this._reasonsSelected[i].range;
        if (this._reasonsSelected.length == 1) {
          // Check if range have been changed
          range = this._tagdatetimerange[0].getRangeString();
        }
        rangesList[i] = range;
      }

      let url = this.getConfigOrAttribute('path', '') + 'ReasonSave/Post' // was 'SaveReasonV2'
        + '?MachineId=' + machineId;
      if (reasonId != null) {
        url = url + '&ReasonId=' + reasonId;
      }

      if (details) {
        url += '&ReasonDetails=' + details;
      }
      let timeout = this.timeout;
      let machid = this.element.getAttribute('machine-id'); // Should be copied. This.element disappear before request answer
      let postData = { 'Ranges': rangesList };
      if (reasonData) {
        postData.ReasonData = reasonData;
      }
      pulseService.postAjax(0, url,
        postData,
        timeout,
        function (ajaxToken, data) {
          this._saveSuccess(ajaxToken, data, machid);
        }.bind(this),
        this._saveError.bind(this),
        this._saveFail.bind(this));
      // Reload cache -> in savesuccess / progress

      this._savedRangesList = this._reasonsSelected; // To avoid clean when removeAllSelections
      // Remove selection in RSL
      $('.dialog-savereason').find('x-reasonslotlist')[0].removeAllSelections();

      // CLOSE if needed - NOW - To avoid creating unwanted revision progress
      if (this._closeAfterSave) {
        pulseCustomDialog.close('.dialog-savereason');
        return;
      }
    }

    // Called when a reason is successfully saved
    _saveSuccess(ajaxToken, data, machid) {
      // ignore ajaxToken
      console.log('_saveSuccess');
      console.info('Reason revision id=' + data.Revision.Id);

      // Store modification.s :
      let ranges = [];
      for (let i = 0; i < this._savedRangesList.length; i++) {
        ranges.push(pulseRange.createDateRangeFromString(this._savedRangesList[i].range));
      }
      pulseUtility.getOrCreateSingleton('x-modificationmanager')
        .addModification(data.Revision.Id, 'reason',
          machid, ranges);
      this._savedRangesList = null;

      // CLOSE if needed 
      /* if (this._closeAfterSave) {
        pulseCustomDialog.close('.dialog-savereason');
        return;
      } */
    }

    _saveError(ajaxToken, data) {
      // ignore ajaxToken
      let errorMessage = 'Error';
      if (typeof data === 'undefined') {
        errorMessage = 'undefined error data';
      }
      else {
        let status = data.Status;
        if (typeof status === 'undefined') {
          errorMessage = 'undefined error data status';
        }
        else {
          if (typeof (status) != 'undefined') {
            errorMessage = `unknown status ${status}, ${data.ErrorMessage}`;
          }
          else {
            errorMessage = data.ErrorMessage;
          }
        }
      }
      pulseCustomDialog.openError(errorMessage);
      return;
    }

    _saveFail(ajaxToken, url, isTimeout, xhrStatus) {
      // ignore ajaxToken
      if (isTimeout) {
        pulseCustomDialog.openError('Timeout');
      }
      else {
        let message = pulseService.getAjaxErrorMessage(xhrStatus);
        pulseCustomDialog.openError(message);
      }
    }

    /* CLICK - Get details */
    _getDetailsAndSave(reasonId, reasonName, detailsRequired, reasonData) {
      // Machine
      let machineDisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': this.element.getAttribute('machine-id')
      });
      let divMachine = $('<div></div>').addClass('savereason-machine')
        .append($('<div></div>').addClass('savereason-machine-label').html(this.getTranslation('machineColon', 'Machine: ')))
        .append(machineDisplay);

      // Range
      let range = this._tagdatetimerange[0].getRangeString();
      let details_tagdatetimerange = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'range': range,
        'hide-buttons': 'true',
        'not-editable': 'true',
        'period-context': 'savereasondetails' + this.element.getAttribute('machine-id')
      });
      let divdatetimerange = $('<div></div>').addClass('savereason-datetimerange-details')
        .append($('<div></div>').addClass('savereason-datetimerange-label').html(this.getTranslation('periodColon', 'Period: ')))
        .append(details_tagdatetimerange);

      // Reason
      let divlabelReason = $('<div></div>').addClass('savereason-details-label').html(this.getTranslation('reasonColon', 'Reason: '));
      let divNewReasonSpan = $('<span></span>').addClass('savereason-details-span').html(reasonName);
      let divNewReason = $('<div></div>').addClass('savereason-details-input').append(divNewReasonSpan);
      let divReason = $('<div></div>').addClass('savereason-details-reason')
        .append(divlabelReason).append(divNewReason);

      // Details
      let divinput = $('<div></div>').addClass('savereason-details-input');
      let input = $('<textarea name="details-comment" placeholder="Details..."></textarea>');
      $(input).attr('maxlength', 255);
      $(input).keydown(function (event) {
        if (event.keyCode == 13) { // == Enter
          $('a.dialog-button-frame-validate').click();
        }
      });
      divinput.append(input);
      let divDetails = $('<div></div>').addClass('savereason-details').append(divinput)

      let dialogbox = $('<div></div>')
        .addClass('savereason-dialog-details')
        .append(divMachine)
        .append(divdatetimerange)
        .append(divReason)
        .append(divDetails);

      let reasonDetailsTitle = this.getTranslation('reasonDetailsTitle', 'Reason details');

      this._detailsDialogId = pulseCustomDialog.initialize(dialogbox, {
        title: reasonDetailsTitle,
        onOk: function (x_save, reasId, reasData, inputParam) { // to avoid closure
          return function () {
            let details = inputParam.val();
            if ((details == '') && (detailsRequired)) {
              // show error msg -- should never happen if button is disabled
              let pleaseAddComment = x_save.getTranslation('errorNoDetails', 'Please add a comment');
              pulseCustomDialog.openError(pleaseAddComment);
            }
            else {
              x_save._saveReason(reasId, details, reasData);
              pulseCustomDialog.close('#' + x_save._detailsDialogId);
              x_save._detailsDialogId = null;
            }
          }
        }(this, reasonId, reasonData, input), /* end of validate*/
        onCancel: function () {
          pulseCustomDialog.close('#' + this._detailsDialogId);
          this._detailsDialogId = null;
        }.bind(this),
        autoClose: false,
        autoDelete: true,
        helpName: 'savereason'
      });
      pulseCustomDialog.open('#' + this._detailsDialogId);

      // - Enable / Disable the OK button
      if (detailsRequired) { // Disable validateButton
        let okBtn = $('#' + this._detailsDialogId).find('.customDialogOk');
        $(okBtn)[0].setAttribute('disabled', 'disabled');
      }
      var self = this;
      input.on('keyup paste input', notifyTextChanged);
      function notifyTextChanged() {
        if (detailsRequired) { // show / hide validateButton
          if (0 == $(this).val().length) {
            $('#' + self._detailsDialogId + ' .customDialogOk')[0].setAttribute('disabled', 'disabled');
          }
          else {
            $('#' + self._detailsDialogId + ' .customDialogOk').removeAttr('disabled');
          }
        }
      }
    }

    /* CLICKS */

    /**
     * DOM event callback triggered when clicking on reason after selected a reasongroup
     *
     * @param {event} e - DOM event
     */
    clickOnReason(e) {
      let td = e.target;
      let row = $(td).parent();
      let reasonId = Number(row[0].getAttribute('reason-id'));
      let reasonName = row[0].getAttribute('reason-text');
      let detailsRequired = ('true' == row[0].getAttribute('details-required'));
      let reasonData = row[0].reasondata;
      if (detailsRequired)
        this._getDetailsAndSave(reasonId, reasonName, detailsRequired, reasonData);
      else
        this._saveReason(reasonId, undefined, reasonData);
    }

    /**
     * DOM event callback triggered when clicking on details (='comment' on the right of a row)
     *
     * @param {event} e - DOM event
     */
    clickOnComment(e) {
      let td = e.target;
      let row = $(td).parent();

      let reasonId = Number(row[0].getAttribute('reason-id'));
      let reasonName = row[0].getAttribute('reason-text');
      let detailsRequired = ('true' == row[0].getAttribute('details-required'));
      let reasonData = row[0].reasondata;
      this._getDetailsAndSave(reasonId, reasonName, detailsRequired, reasonData);
    }

    /**
     * Event bus callback triggered when a reload message is received -> reason may have change
     *
     * @param {Object} event
     */
    onReload(event) {
      //this.switchToContext('Reload');
      this.start();
    }

    addReason(reason) {
      if (reason) {
        if (reason.range && typeof reason.range != 'string') {
          return;
        }
        else if (reason.reason && typeof reason.reason != 'string') {
          return;
        }
        else if (reason.mode && typeof reason.mode != 'string') {
          return;
        }

        // Check if reason already exists by comparing properties
        let exists = this._reasonsSelected.some(item =>
          item.range === reason.range &&
          item.reason === reason.reason &&
          item.mode === reason.mode &&
          item.details === reason.details
        );

        if (!exists) {
          this._reasonsSelected.push(reason);
          this._reasonsSelected.sort((a, b) => a.range.localeCompare(b.range));
          this.start();
        }
      }
      return;
    }

    removeReason(reason) {
      if (reason) {
        if (reason.range && typeof reason.range != 'string') {
          return;
        }
        else if (reason.reason && typeof reason.reason != 'string') {
          return;
        }
        else if (reason.mode && typeof reason.mode != 'string') {
          return;
        }
        let indexOf = this._reasonsSelected.findIndex(item =>
          item.range === reason.range &&
          item.reason === reason.reason &&
          item.mode === reason.mode &&
          item.details === reason.details
        );
        if (indexOf != -1) {
          this._reasonsSelected.splice(indexOf, 1);
          this.start();
        }
      }
    }



    cleanReasons() {
      this._reasonsSelected = [];
      this.start();
    }

    closeAfterSave(closeAfterSave) {
      this._closeAfterSave = closeAfterSave;
    }
  }

  pulseComponent.registerElement('x-savereason', SaveReasonComponent, ['machine-id', 'range', 'ranges']);
})();
