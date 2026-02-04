// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-setupmachine
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseCustomDialog
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

require('x-datetimepicker/x-datetimepicker');
require('x-revisionprogress/x-revisionprogress');


/*
 * WARNING for migration : USE
 *
this.disableDeleteWhenDisconnect ();
this.restoreDeleteWhenDisconnect ():
 */

(function () {

  class SetupMachineComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional
      self._since = ''; // ISO since

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    get content () { return this._content; } // Optional

    /*getSinceMoment () {
      return moment(this._since, moment.ISO_8601);
    }*/

    /*getSinceISO () { // Called by lastmachinestatetemplate ?
      return this._since;
    }*/

    _orderUsingSince () { // +/- same as lastMST
      let since = new Date(this._since);

      let last1January = new Date(((new Date()).getFullYear()), 1, 1, 0, 0, 0, 0);
      let numberToOrder = (since.getTime() - last1January.getTime()) / 1000 / 60; // To lower number

      let parentsToOrder = $(this.element).parents('.group-single');
      $(parentsToOrder).css('order', Math.round(numberToOrder));
    }

    _saveFail (url, isTimeout, xhrStatus) {
      // Do Nothing
    }
    _saveError (data) {
      // Do Nothing
    }
    _saveSuccess (data, machid) {
      let revisionId = null;
      if (data.Revision) {
        revisionId = data.Revision.Id;
      }
      else {
        console.assert('NO revisionId');
        //revisionId = data.Id;
        return;
      }

      // Manage progress bar
      let ranges = [];
      let range = pulseRange.createDateRangeDefaultInclusivity(this._savedBegin, null);
      ranges.push(range);
      pulseUtility.getOrCreateSingleton('x-modificationmanager')
        .addModification(revisionId, 'MST',
          machid, ranges);
    }

    _findProductionCategoryFail (url, isTimeout, xhrStatus) {
      // Do nothing
    }
    _findProductionCategoryError (data) {
      // Do nothing
    }
    _findProductionCategorySuccess (data) {
      let dialog = $('<div></div>').addClass('setupmachine-dialog');

      let switchLabel = $('<div></div>').addClass('setupmachine-dialog-label')
        .html(this.getTranslation('switchTo', 'Switch to  '));
      let MST_CB = $('<div></div>').addClass('setupmachine-dialog-div-select');
      //if( 1! value)  MST_CB.html('production'); -> Removed
      // Combobox
      this._MST_CB_select = $('<select name=MST_CB ></select>');
      for (let index = 0;
        index < data.MachineStateTemplates.length; index++) {

        let MST_CB_option;
        if (index == 0) {
          MST_CB_option = $('<option value=' + data.MachineStateTemplates[index].Id + ' selected></option>').html(data.MachineStateTemplates[index].Display);
        }
        else {
          MST_CB_option = $('<option value=' + data.MachineStateTemplates[index].Id + '></option>').html(data.MachineStateTemplates[index].Display);
        }
        this._MST_CB_select.append(MST_CB_option);
      }
      MST_CB.append(this._MST_CB_select);

      let fromLabel = $('<div></div>').addClass('setupmachine-dialog-label')
        .html('from ');

      let nowISO = pulseUtility.convertMomentToDateTimeString(moment());
      let dtp = pulseUtility.createjQueryElementWithAttribute('x-datetimepicker', {
        'showseconds': 'show-seconds',
        'defaultdatetime': nowISO,
        'maxdatetime': nowISO,
        'mindatetime': this._since
      });
      let dtpDiv = $('<div></div>').addClass('setupmachine-dialog-dtp-div').append(dtp);

      //dialog.append(switchLabel).append(MST_CB).append(fromLabel).append(dtpDiv);
      let saveDialogId = pulseCustomDialog.initialize(dialog, {
        title: this.getTranslation('switchToproduction', 'Switch to production'),
        onOk: function () { // Validate
          let begin = $(dtp)[0].getISOValue();
          let range = pulseUtility.createDateRangeForWebService(begin);
          this._savedBegin = begin;
          let newMST = this._MST_CB_select[0].options[this._MST_CB_select[0].selectedIndex].value;
          let machid = this.element.getAttribute('machine-id'); // Should be copied. This.element disappear before request answer
          let url = this.getConfigOrAttribute('path', '') + 'MachineStateTemplateMachineAssociation/Save?MachineId=' + machid
            + '&Range=' + range + '&MachineStateTemplateId=' + newMST + '&RevisionId=-1';

          pulseService.runAjaxSimple(url,
            function (data) {
              this._saveSuccess(data, machid);
            }.bind(this),
            this._saveError.bind(this),
            this._saveFail.bind(this));
        }.bind(this),
        autoClose: true,
        autoDelete: true
      });
      // Append after
      dialog.append(switchLabel).append(MST_CB).append(fromLabel).append(dtpDiv);

      pulseCustomDialog.open('#' + saveDialogId);
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            $(this._operationDiv).empty();

            // For progress : update _mapOfModifications
            let modifMgr = $('body').find('x-modificationmanager');
            if (modifMgr.length == 1) {
              this._mapOfModifications = modifMgr[0].getModifications('MST',
                this.element.getAttribute('machine-id'));

              // + REMOVE others with old machineid ? + create progress ? -> TODO later !
            }

            this.start();
          } break;
        case 'machine-context': {
          eventBus.EventBus.removeEventListenerBySignal(this,
            'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal',
            newVal,
            this.onMachineIdChange.bind(this));
        } break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-lastbar');

      // Update here some internal parameters

      // listeners
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      this._operationDiv = $('<div></div>')
        .addClass('pulse-cellbar-first')
        .addClass('pulse-cellbar-current-data');
      //.addClass('clickable'); // To change display when hover - NO = not clickable

      this._sinceSpan = $('<span></span>')
        .addClass('setupmachine-since-span');
      this._sinceDiv = $('<div></div>')
        .addClass('pulse-cellbar-last')
        .addClass('pulse-cellbar-past-data')
        .append(this._sinceSpan);
      this._sinceDiv.click(
        function (e) {
          this.clickOnPast(e);
        }.bind(this)
      );

      // Main
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main') // was pulse-component-main
        .append(this._operationDiv).append(this._sinceDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      $(this.element).append(this._content);

      // Get modifications and create listener
      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('MST',
          this.element.getAttribute('machine-id'));

        // TODO Later + create progress ?
      }
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._operationDiv = undefined;
      this._sinceSpan = undefined;
      this._sinceDiv = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);

      $(this._operationDiv).empty();
      // clean right block
      $(this._sinceSpan).html('');
      $(this._sinceDiv).removeClass('bad-efficiency')
        .removeClass('good-efficiency');
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      let updateSeconds = Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));

      let getSinceMoment = moment(this._since, moment.ISO_8601);
      let elapsedSeconds = moment().diff(getSinceMoment, 'seconds');
      if (elapsedSeconds < updateSeconds) // Re-start timer faster
        return 1000 * elapsedSeconds;

      return 1000 * updateSeconds;
    }

    getShortUrl () {
      let url = 'CurrentMachineStateTemplateOperation?MachineId='
        + this.element.getAttribute('machine-id');
      return url;
    }

    refresh (data) {
      this._current_id = data.MachineStateTemplate.Id;
      this._current_display = this.getTranslation('noOperation', 'No Operation');
      if (data.Operation && data.Operation.Display) {
        this._current_display = data.Operation.Display;
      }

      //update right block = since
      this._since = data.Since;
      let getSinceMoment = moment(this._since, moment.ISO_8601);
      let sinceDisplay = getSinceMoment.format('lll');
      $(this._sinceSpan).html(
        this.getTranslation('setupsince', 'setup since: ')
        + sinceDisplay);

      // colors and efficiency
      let thresholdinseconds = this.getConfigOrAttribute('thresholdinseconds', 60);
      if (thresholdinseconds != 0) {
        let elapsedTime = moment().diff(getSinceMoment, 'seconds');
        if (elapsedTime > thresholdinseconds) {
          $(this._sinceDiv).addClass('bad-efficiency')
            .removeClass('good-efficiency');
        }
        else {
          $(this._sinceDiv).addClass('good-efficiency')
            .removeClass('bad-efficiency');
          //if (elapsedTime < this._updateDelay) {
          // Re-start timer faster -> done in get refreshRate
        }
      }

      // Left Block = operation
      //if there is no slot, display ???
      $(this._operationDiv).empty();
      let spanOperation = $('<span></span>')
        .addClass('setupmachine-operation-span')
        .html(this._current_display);
      $(this._operationDiv).append(spanOperation);

      this._orderUsingSince();
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revision-id, machineid, kind, range,
     * initModifications: undefined, // pending modifications the first time
     * pendingModifications: undefined // pending modifications 'now'
     */
    onModificationEvent (event) {
      let modif = event.target;
      if (event.target.kind != 'MST') {
        return;
      }
      if (event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }

      let isNew = true;
      if (this._mapOfModifications.has(modif.revisionid))
        isNew = false;
      this._mapOfModifications.set(modif.revisionid, modif);

      let now = new Date();
      if (isNew) {
        // First time -> create progress bar
        for (let i = 0; i < modif.ranges.length; i++) {
          if ((modif.ranges[i].lower < now)
            && (modif.ranges[i].upper == null || modif.ranges[i].upper > now)) { // == is Current
            let newRevisionProgress =
              pulseUtility.createjQueryElementWithAttribute('x-revisionprogress', {
                //'period-context': NO MAIN RANGE
                //'range': NO MAIN RANGE
                'revision-id': modif.revisionid,
                'machine-id': event.target.machineid,
                'kind': modif.kind,
                'revision-range': pulseUtility.convertDateRangeForWebService(modif.ranges[i])
              });
            this._content.append(newRevisionProgress);
          }
        }
      }
      if (event.target.pendingModifications == 0) {
        // clean progress bar is done in x-revisionprogress

        this._mapOfModifications.delete(modif.revisionid);

        for (let i = 0; i < modif.ranges.length; i++) {
          if ((modif.ranges[i].lower < now)
            && (modif.ranges[i].upper == null || modif.ranges[i].upper > now)) {
            this.switchToContext('Reload');
          }
        }
      }
      //getModifications
      // else = do nothing (progress en cours) -> gere par la revision progress
    }

    // Callback events

    /**
     * Event bus callback triggered when machine-id changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * DOM event callback triggered on a click on PAST button
     */
    clickOnPast () {
      let url = this.getConfigOrAttribute('path', '') + 'NextMachineStateTemplate?CurrentMachineStateTemplateId=' + this._current_id;
      // + RoleId=1 - operator

      pulseService.runAjaxSimple(url,
        this._findProductionCategorySuccess.bind(this),
        this._findProductionCategoryError.bind(this),
        this._findProductionCategoryFail.bind(this));
    }
  }

  pulseComponent.registerElement('x-setupmachine', SetupMachineComponent, ['machine-id', 'machine-context']);
})();
