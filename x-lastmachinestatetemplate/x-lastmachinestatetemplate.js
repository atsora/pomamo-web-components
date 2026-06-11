// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-lastmachinestatetemplate
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';

import 'x-savemachinestatetemplate/x-savemachinestatetemplate';
import 'x-setupmachine/x-setupmachine';
import 'x-revisionprogress/x-revisionprogress';


(function () {

  /**
   * `<x-lastmachinestatetemplate>` — current machine state template (MST) for
   * one machine, with optimistic update progress.
   *
   * Polls `MachineStateTemplateSlots?MachineId=<id>` (refresh interval =
   * `refreshingRate.barSlowUpdateMinutes`, default 10 min). When the current
   * MST `Category !== 2`, renders a label "Scheduled status: …" and uses
   * `_orderUsingSince()` to push the surrounding `.group-single` parent down
   * via CSS `order`. When `Category === 2`, hides the label and mounts an
   * `x-setupmachine` child instead. Clicking the label opens a
   * `x-savemachinestatetemplate` dialog (period-context `savemst<machineId>`).
   * Tracks pending modifications via `modificationEvent`: appends an
   * `x-revisionprogress` while a `kind: 'MST'` revision overlaps the current
   * range, then reloads when `pendingModifications === 0`. Reacts to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-lastmachinestatetemplate
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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
      let parentsToOrder = this.element.closest('.group-single');
      if (parentsToOrder) {
        parentsToOrder.style.order = Math.round(numberToOrder);
      }
    }

    /*getSinceISO () {
      let setups = this.element.querySelector('x-setupmachine');
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
          this._MST_current.innerHTML = '';
          let setupmachines = this.element.querySelectorAll('x-setupmachine');
          setupmachines.forEach(el => el.remove());

          // For progress : update _mapOfModifications
          let modifMgr = document.body.querySelector('x-modificationmanager');
          if (modifMgr) {
            this._mapOfModifications = modifMgr.getModifications('MST',
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
      let modifMgr = document.body.querySelector('x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('MST',
          this.element.getAttribute('machine-id'));
      }
      // Create modifications listener
      eventBus.EventBus.addGlobalEventListener(this,
        'modificationEvent', this.onModificationEvent.bind(this));

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._MST_current = document.createElement('div');
      this._MST_current.className = 'pulse-cellbar-first pulse-cellbar-current-data lastmachinestate-current-click clickable';
      //this._between = document.createElement('div');
      //this._between.className = 'pulse-cellbar-between';
      this._content = document.createElement('div');
      this._content.className = 'pulse-cellbar-main';
      this._content.appendChild(this._MST_current);
      //this._content.appendChild(this._between);

      this.element.appendChild(this._content);

      // Clicks
      this._MST_current.addEventListener('click',
        function (e) {
          this.clickOnCurrent(e);
        }.bind(this)
      );

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);
      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

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
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine ID')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._currentMST_display = '';
      this._currentMST_id = null;

      this._messageSpan.innerHTML = message;
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
      this._messageSpan.innerHTML = '';
      let setupmachines = this.element.querySelectorAll('x-setupmachine');
      setupmachines.forEach(el => el.remove());

      // Display data
      if (data.MachineStateTemplateSlots.length >= 1) {
        this._currentMST_display = data.MachineStateTemplateSlots[0].Display;
        this._currentMST_id = data.MachineStateTemplateSlots[0].Id;
        this._current_MST_range = data.MachineStateTemplateSlots[0].Range;
        this._currentMST_category = data.MachineStateTemplateSlots[0].Category;
        // could check if it's really the "current" one
      }
      else {
        this._currentMST_display = '';
        this._currentMST_id = null;
      }

      if (this._currentMST_category != 2) {
        let textToDisplay = this.getTranslation('lastmachinestatetemplate.scheduledStatus', 'Scheduled status:') + ' ';
        textToDisplay += this._currentMST_display;
        this._MST_current.innerHTML = textToDisplay;
        this._content.style.display = '';
        let setupmachines = this.element.querySelectorAll('x-setupmachine');
        setupmachines.forEach(el => el.remove());

        this._orderUsingSince();
      }
      else { // hide + show setup
        if (this.element.querySelector('x-setupmachine') == null) {
          let setupmachine;
          if (this.element.hasAttribute('machine-context')) {
            setupmachine = pulseUtility.createElementWithAttribute('x-setupmachine', {
              'machine-id': this.element.getAttribute('machine-id'),
              'machine-context': this.element.getAttribute('machine-context')
            });
          }
          else { // NO machine-context
            setupmachine = pulseUtility.createElementWithAttribute('x-setupmachine', {
              'machine-id': this.element.getAttribute('machine-id')
            });
          }
          this.element.appendChild(setupmachine);
        }
        else {
          //this.element.querySelector('x-setupmachine').style.display = '';
        }
        this._content.style.display = 'none';
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
              pulseUtility.createElementWithAttribute('x-revisionprogress', {
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
      // else = do nothing (in-progress) -> handled by the revision progress
    }

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onReload (event) {
      this._forceReload = true;
      let setupmachines = this.element.querySelectorAll('x-setupmachine');
      setupmachines.forEach(el => el.remove());

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
      let savemsts = this.element.querySelectorAll('x-savemachinestatetemplate');
      savemsts.forEach(el => el.remove());

      let saveMST = pulseUtility.createElementWithAttribute('x-savemachinestatetemplate', {
        'machine-id': this.element.getAttribute('machine-id'),
        //'range': this._current_MST, // NO !
        'mst-id': this._currentMST_id,
        'period-context': 'savemst' + this.element.getAttribute('machine-id')
      });
      this.element.appendChild(saveMST);
    }

  }

  pulseComponent.registerElement('x-lastmachinestatetemplate', LastMachineStateTemplateComponent, ['machine-id', 'machine-context']);
})();
