// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastmachinestatetemplate
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

require('x-savemachinestatetemplate/x-savemachinestatetemplate');
require('x-setupmachine/x-setupmachine');
require('x-revisionprogress/x-revisionprogress');


(function () {

  class LastMachineStateTemplateComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional
      self._messageSpan = undefined;
      self._MST_current = undefined;
      self._since = ''; // ISO since

      self._forceReload = true;
      self._currentMST_display = undefined;
      self._currentMST_id = undefined;
      self._current_MST_range = undefined;
      self._currentMST_category = undefined;

      // Map [revisionid] = {revisionid,range,kind,machineid,initModifications,pendingModifications}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    _orderUsingSince () { // +/- same as setup
      let numberToOrder = 999999999; // default = bottom = more than 2 years in minutes
      if (this._since != '') {
        let since = new Date(this._since);

        let last1January = new Date(((new Date()).getFullYear()), 1, 1, 0, 0, 0, 0);
        numberToOrder = (last1January.getTime() - since.getTime()) / 1000 / 60; // To lower number
      }
      let parentsToOrder = $(this.element).parents('.group-single');
      $(parentsToOrder).css('order', Math.round(numberToOrder));
    }

    /*getSinceISO () {
      let setups = $(this.element).find('x-setupmachine');
      if (setups.length > 0) {
        return setups[0].getSinceISO();
      }
      return this._since;
    }*/

    get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': {
          // CLEAN display
          $(this._MST_current).html('');
          $(this.element).find('x-setupmachine').remove();

          // For progress : update _mapOfModifications
          let modifMgr = $('body').find('x-modificationmanager');
          if (modifMgr.length == 1) {
            this._mapOfModifications = modifMgr[0].getModifications('MST',
              this.element.getAttribute('machine-id'));

            // + REMOVE others with old machineid ? + create progress ? -> TODO later !
          }

          // reload
          this.start();
        } break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal, this.onMachineIdChange.bind(this));
          }
          this.start(); // To re-validate parameters
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-lastbar');

      // Update here some internal parameters

      // listeners/dispatchers

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }
      // Get modifications and create listener
      let modifMgr = $('body').find('x-modificationmanager');
      if (modifMgr.length == 1) {
        this._mapOfModifications = modifMgr[0].getModifications('MST',
          this.element.getAttribute('machine-id'));
      }
      // Create modifications listener
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._MST_current = $('<div></div>')
        .addClass('pulse-cellbar-first')
        .addClass('pulse-cellbar-current-data')
        .addClass('lastmachinestate-current-click') // new class to avoid propagation in setup bar
        .addClass('clickable');
      //this._between = $('<div></div>').addClass('pulse-cellbar-between');
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main')
        .append(this._MST_current); //.append(this._between);

      $(this.element)
        //.addClass('XXX')
        .append(this._content);

      // Clicks
      this._MST_current.click(
        function (e) {
          this.clickOnCurrent(e);
        }.bind(this)
      );

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._MST_current = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._currentMST_display = '';
      this._currentMST_id = null;

      $(this._messageSpan).html(message);
    }

    removeError () {
      this.displayError('');
    }

    get refreshRate () {
      return 1000 * 60 * Number(this.getConfigOrAttribute('refreshingRate.barSlowUpdateMinutes', 10));
    }

    getShortUrl () {
      let url = 'MachineStateTemplateSlots?MachineId='
        + this.element.getAttribute('machine-id');
      if (this._forceReload) {
        url += '&Cache=No';
        this._forceReload = false;
      }
      /* ???
      if (this.stateContext == 'Reload') { // Specific case in case of Reload context
        url += '&Cache=No';
      }*/
      return url;
    }

    refresh (data) {
      // Clean
      $(this._messageSpan).html('');
      $(this.element).find('x-setupmachine').remove();

      // Display data
      if (data.MachineStateTemplateSlots.length >= 1) {
        this._currentMST_display = data.MachineStateTemplateSlots[0].Display;
        this._currentMST_id = data.MachineStateTemplateSlots[0].Id;
        this._current_MST_range = data.MachineStateTemplateSlots[0].Range;
        this._currentMST_category = data.MachineStateTemplateSlots[0].Category;
        // on pourrait vérifier si c'est bien le "courant"
      }
      else {
        this._currentMST_display = '';
        this._currentMST_id = null;
      }

      if (this._currentMST_category != 2) {
        let textToDisplay = this.getTranslation('lastmachinestatetemplate.scheduledStatus', 'Scheduled status:') + ' ';
        textToDisplay += this._currentMST_display;
        $(this._MST_current).html(textToDisplay);
        $(this._content).show();
        $(this.element).find('x-setupmachine').remove();

        this._orderUsingSince();
      }
      else { // hide + show setup
        if ($(this.element).find('x-setupmachine').length == 0) {
          let setupmachine;
          if (this.element.hasAttribute('machine-context')) {
            setupmachine = pulseUtility.createjQueryElementWithAttribute('x-setupmachine', {
              'machine-id': this.element.getAttribute('machine-id'),
              'machine-context': this.element.getAttribute('machine-context')
            });
          }
          else { // NO machine-context
            setupmachine = pulseUtility.createjQueryElementWithAttribute('x-setupmachine', {
              'machine-id': this.element.getAttribute('machine-id')
            });
          }
          $(this.element).append(setupmachine);
        }
        else {
          //$(this.element).find('x-setupmachine').show();
        }
        $(this._content).hide();
      }

      //Set state of "past data" part in widget -> later ?
    }

    // Callback events

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revisionid, machineid, kind, range, 
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

      // First time ?
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
      // else = do nothing (progress en cours) -> géré par la revision progress
    }

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onReload (event) {
      this._forceReload = true;
      $(this.element).find('x-setupmachine').remove();

      this.start();
    }

    /**
      * Event bus callback triggered when the date/time range changes
      *
      * @param {Object} event
      */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * DOM event callback triggered on a click on current data
     *
     * @param {event} e - DOM event
     */
    clickOnCurrent (e) {
      $(this.element).find('x-savemachinestatetemplate').remove();

      let saveMST = pulseUtility.createjQueryElementWithAttribute('x-savemachinestatetemplate', {
        'machine-id': $(this.element).attr('machine-id'),
        //'range': this._current_MST, // NO !
        'mst-id': this._currentMST_id
      });
      $(this.element).append(saveMST);
    }

  }

  pulseComponent.registerElement('x-lastmachinestatetemplate', LastMachineStateTemplateComponent, ['machine-id', 'machine-context']);
})();
