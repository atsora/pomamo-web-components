// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-setupmachine
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

require('x-savemachinestatetemplate/x-savemachinestatetemplate');
require('x-revisionprogress/x-revisionprogress');


/*
 * WARNING for migration : USE
 *
this.disableDeleteWhenDisconnect ();
this.restoreDeleteWhenDisconnect ():
 */

(function () {

  /**
   * `<x-setupmachine>` — current MST + operation display for one machine.
   *
   * Polls `CurrentMachineStateTemplateOperation?MachineId=<id>` (interval =
   * `refreshingRate.currentRefreshSeconds`) and renders the current MST
   * operation on the left and "setup since: <date>" on the right, with
   * good/bad efficiency coloring based on `thresholdinseconds`. Clicking
   * the right (since) block mounts an `x-savemachinestatetemplate`
   * sibling, which opens the MST-change dialog and registers the
   * resulting revision with the global `x-modificationmanager`. Pending
   * revisions of `kind: 'MST'` for the current machine inject an
   * `x-revisionprogress` and trigger a reload once
   * `pendingModifications === 0`. Reacts to `machineIdChangeSignal` on
   * `machine-context`.
   *
   * @element x-setupmachine
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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

      let parentsToOrder = this.element.closest('.group-single');
      if (parentsToOrder) {
        parentsToOrder.style.order = Math.round(numberToOrder);
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            this._operationDiv.replaceChildren();

            // For progress : update _mapOfModifications
            let modifMgr = document.querySelector('body x-modificationmanager');
            if (modifMgr) {
              this._mapOfModifications = modifMgr.getModifications('MST',
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
      this.element.replaceChildren();

      // Create DOM
      this._operationDiv = document.createElement('div');
      this._operationDiv.className = 'pulse-cellbar-first pulse-cellbar-current-data';
      //this._operationDiv.classList.add('clickable'); // To change display when hover - NO = not clickable

      this._sinceSpan = document.createElement('span');
      this._sinceSpan.className = 'setupmachine-since-span';
      this._sinceDiv = document.createElement('div');
      this._sinceDiv.className = 'pulse-cellbar-last pulse-cellbar-past-data';
      this._sinceDiv.appendChild(this._sinceSpan);
      this._sinceDiv.addEventListener('click', function (e) {
        this.clickOnPast(e);
      }.bind(this));

      // Main
      this._content = document.createElement('div');
      this._content.className = 'pulse-cellbar-main';
      this._content.appendChild(this._operationDiv);
      this._content.appendChild(this._sinceDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      this.element.appendChild(this._content);

      // Get modifications and create listener
      let modifMgr = document.querySelector('body x-modificationmanager');
      if (modifMgr) {
        this._mapOfModifications = modifMgr.getModifications('MST',
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
      this.element.replaceChildren();

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
      this._messageSpan.innerHTML = message;

      this._operationDiv.replaceChildren();
      // clean right block
      this._sinceSpan.innerHTML = '';
      this._sinceDiv.classList.remove('bad-efficiency');
      this._sinceDiv.classList.remove('good-efficiency');
    }

    removeError () {
      this._messageSpan.innerHTML = '';
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
      this._sinceSpan.innerHTML = this.getTranslation('setupsince', 'setup since: ')
        + sinceDisplay;

      // colors and efficiency
      let thresholdinseconds = this.getConfigOrAttribute('thresholdinseconds', 60);
      if (thresholdinseconds != 0) {
        let elapsedTime = moment().diff(getSinceMoment, 'seconds');
        if (elapsedTime > thresholdinseconds) {
          this._sinceDiv.classList.add('bad-efficiency');
          this._sinceDiv.classList.remove('good-efficiency');
        }
        else {
          this._sinceDiv.classList.add('good-efficiency');
          this._sinceDiv.classList.remove('bad-efficiency');
          //if (elapsedTime < this._updateDelay) {
          // Re-start timer faster -> done in get refreshRate
        }
      }

      // Left Block = operation
      //if there is no slot, display ???
      this._operationDiv.replaceChildren();
      let spanOperation = document.createElement('span');
      spanOperation.className = 'setupmachine-operation-span';
      spanOperation.innerHTML = this._current_display;
      this._operationDiv.appendChild(spanOperation);

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
      let existing = this.element.querySelector('x-savemachinestatetemplate');
      if (existing) {
        existing.remove();
      }

      let machineId = this.element.getAttribute('machine-id');
      let attrs = {
        'machine-id': machineId,
        'mst-id': this._current_id,
        'period-context': 'savemst' + machineId
      };
      if (this._since) {
        let range = pulseRange.createDateRangeDefaultInclusivity(new Date(this._since), null);
        attrs['range'] = pulseUtility.convertDateRangeForWebService(range);
      }
      let saveMST = pulseUtility.createElementWithAttribute('x-savemachinestatetemplate', attrs);
      this.element.appendChild(saveMST);
    }
  }

  pulseComponent.registerElement('x-setupmachine', SetupMachineComponent, ['machine-id', 'machine-context']);
})();
