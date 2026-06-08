// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-grouparray
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseLogin = require('pulseLogin');
var pulseConfig = require('pulseConfig');
var state = require('state');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-grouparray>` — paginated grid of machine items with optional page
   * rotation, built by cloning a DOM template per machine.
   *
   * Source resolution: when only `machine` is configured (no `group`), the
   * id list is used as-is and the component switches to a static `Loaded`
   * context. With a `group`, fetches `MachinesFromGroups?GroupIds=<group>`;
   * static groups (`Dynamic=false` or `forcestaticlist='true'`) freeze in
   * `Loaded`, dynamic groups keep polling.
   *
   * Renders one `<li class="group-single">` per machine inside an
   * `<ol class="group-main">`, cloning the element identified by `templateid`
   * (default `'boxtoclone'`) and stamping `machine-id`. Items get a
   * `li-page-N` class derived from `column`/`row`; when `allowpagerotation`
   * is `'true'` the visible page cycles every `rotation` seconds and
   * `#pulse-pagination` is updated with `current / total`. A single-machine
   * list hides the `#grouparray` panel via `hidden-content`. When
   * `donotwarngroupreload !== 'true'` a `groupIsReloaded` event is dispatched
   * after every rebuild; when `textchange-context` is set, the last-update
   * timestamp is dispatched on `textChangeEvent`.
   *
   * @element x-grouparray
   * @attr {string}  templateid           id of the DOM element to clone per machine (default `'boxtoclone'`)
   * @attr {string}  machine              comma-separated machine id list (takes priority over `group`)
   * @attr {string}  group                group id(s)
   * @attr {number}  column               number of columns per page
   * @attr {number}  row                  number of rows per page (default `2`)
   * @attr {boolean} allowpagerotation    `'true'` enables automatic page cycling
   * @attr {number}  rotation             page rotation delay in seconds (default `90`)
   * @attr {number}  refreshrate          fallback refresh interval in seconds when no rotation
   * @attr {boolean} donotwarngroupreload `'true'` suppresses the `groupIsReloaded` dispatch
   * @attr {boolean} forcestaticlist      `'true'` treats dynamic groups as static (stops polling)
   * @attr {string}  textchange-context   event-bus context for the `textChangeEvent` dispatch
   * @fires groupIsReloaded                `{ newMachinesList: string }` — after each list rebuild
   * @fires textChangeEvent                `{ text: string }` — last-update timestamp on `textchange-context`
   * @method getMachinesList               current machine id list, comma-separated
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class GroupComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // Default
      self._lastUpdateDate = undefined;

      // DOM -> never in contructor
      self._content = undefined;
      self._dynamic = false;
      self._currentDisplayedPage = 1;
      self._nbPagesTotal = 1;
      self._showHideTimer = null;

      self._machineIdsArray = [];
      self.methods = {
        'getMachinesList': self.getMachinesList
      };

      return self;
    }

    // Overload to always refresh value
    get isVisible() {
      if (!this._connected) { // == is connected
        return false;
      }
      return true;
    }

    /** Get list of machines as string
     */
    getMachinesList() {
      return this._machineIdsArray.join();
    }

    get content() {
      return this._content;
    }

    /**
     * Rebuilds the `<ol>` list of machine items from `_machineIdsArray`.
     * Removes items no longer in the list, reuses or creates `<li class="group-single">` elements.
     * Assigns `li-page-N` classes and `width`/`height` CSS based on `column`/`row` configs.
     * Hides `#grouparray` panel when only one machine is present.
     * Activates the first `x-machinetab` if none is active.
     * Dispatches `groupIsReloaded` and initiates page rotation via `_dealWithRotation()`.
     */
    _displayOrUpdateMachineList() {
      //this._content already not emptied

      if ((false == this._dynamic)
        && (this._machineIdsArray.length == 0)) {
        let noMachines = document.createElement('div');
        noMachines.className = 'no-machines';
        noMachines.innerHTML = this.getTranslation('groupArray.noMachine', 'No machine in selection');
        this._content.appendChild(noMachines);
      }
      else {
        let noMachineEl = this._content.querySelector('.no-machines');
        if (noMachineEl) {
          noMachineEl.remove();
        }
      }

      // init possible rotation
      this._currentDisplayedPage = 1;

      // Get the box to clone element from DOM
      let boxtocloneid = this.element.getAttribute('templateid');
      if (pulseUtility.isNotDefined(boxtocloneid))
        boxtocloneid = 'boxtoclone';

      // Calculate width for multi-column
      let column_width = null;
      let row_height = null;
      let nbColumnToDisplay = this.getConfigOrAttribute('column');
      let nbRowToDisplay = this.getConfigOrAttribute('row', 2);

      if (!pulseUtility.isNotDefined(nbColumnToDisplay)) {
        column_width = 100.0 / nbColumnToDisplay + '%';
      }

      // Update the component with data returned by the web service
      function machineIdIsInList(machineId, List) {
        for (let i = 0; i < List.length; i++) {
          if (Number(machineId) == Number(List[i]))
            return true;
        }
        return false;
      }

      // REMOVE machine not in list anymore
      let self = this;
      let groupSingles = this.element.querySelectorAll('.group-single');
      [...groupSingles].forEach(function (el) {
        let machineId = el.getAttribute('machine-id');
        if (false == machineIdIsInList(machineId, self._machineIdsArray)) {
          el.remove();
        }
        else {
          let allChildren = el.querySelectorAll('*');
          [...allChildren].forEach(function(child) {
            child.classList.add('disableDeleteWhenDisconnect');
          });
        }
      });

      // Reset pages
      for (let i = 1; i <= this._nbPagesTotal; i++) {
        let page_class = 'li-page-' + i;
        let pageEls = this.element.querySelectorAll('.' + page_class);
        [...pageEls].forEach(el => el.classList.remove(page_class));
      }

      //let allElems = this.element.querySelectorAll('*'); [...allElems].forEach(el => el.classList.add('disableDeleteWhenDisconnect'));

      // Update list of machines - Add ROWS
      const panel = document.getElementById("grouparray"); // Hide when only one machine
      if (panel != null) {
        if (this._machineIdsArray.length == 1) {
          if (!panel.classList.contains("hidden-content")) {
            panel.classList.add("hidden-content");
          }
        }
        else if (this._machineIdsArray.length > 1 && panel.classList.contains("hidden-content")) {
          panel.classList.remove("hidden-content");
        }
      }

      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let singleid = this._machineIdsArray[i];
        let li;

        // Find if already exists
        let machineRow = this._content.querySelector(".group-single[machine-id='" + singleid + "']");
        // NO remove ELSE display can become not smooth enough
        if (machineRow) { // if exists
          // disableDeleteWhenDisconnect
          //machineRow.querySelectorAll('*').forEach(el => el.classList.add('disableDeleteWhenDisconnect'));

          // Move at end of the list to order all
          //this._content.appendChild(machineRow);
          li = machineRow;
        }
        else {
          // Else Create NEW = copy the element and its child nodes
          let copy = pulseUtility.cloneWithNewMachineId(boxtocloneid, singleid);

          // Append the cloned element to the list
          li = document.createElement('li');
          li.className = 'group-single';
          li.setAttribute('machine-id', singleid);
          li.appendChild(copy);
        }

        if (nbColumnToDisplay != 0 && nbRowToDisplay != 0) {
          // Add page class to ease page rotation
          let page_class = 'li-page-' + Math.ceil((i + 1) / (nbColumnToDisplay * nbRowToDisplay));
          li.classList.add(page_class);

          // Set height / width
          if (null != column_width)
            li.style.width = column_width;
          if (null != row_height)
            li.style.height = row_height;
        }

        this._content.appendChild(li);

      }
      let tabs = this._content.querySelectorAll('x-machinetab');
      if (tabs && tabs.length > 0) {
        let activeTab = this._content.querySelector('x-machinetab[active="true"]');
        if (tabs.length > 0 && !activeTab) {
          tabs[0].setAttribute('active', 'true');
        }
      }

      //let disableEls = this.element.querySelectorAll('.disableDeleteWhenDisconnect'); [...disableEls].forEach(el => el.classList.remove('disableDeleteWhenDisconnect')); // too early

      // Announce that the machine list has changed
      if ('false' == this.getConfigOrAttribute('donotwarngroupreload', 'false')) {
        eventBus.EventBus.dispatchToAll('groupIsReloaded', {
          newMachinesList: this._machineIdsArray.join(',')
        });
      }

      this._dealWithRotation();

      // TIMEOUT to be sure that all is cleared
      // (else the mecanism is not working as it should)
      let rotationDelay = Number(this.getConfigOrAttribute('rotation', '90'));
      setTimeout(this._removeDisable.bind(this),
        rotationDelay / 2 * 1000);

    } // _displayOrUpdateMachineList

    /** Removes the `disableDeleteWhenDisconnect` guard class from all descendant elements. */
    _removeDisable() {
      let els = this.element.querySelectorAll('.disableDeleteWhenDisconnect');
      [...els].forEach(el => el.classList.remove('disableDeleteWhenDisconnect'));
    }

    /**
     * Computes the total page count from `_machineIdsArray.length`, `column`, and `row` configs.
     * Resets `_currentDisplayedPage` to 1 and delegates to `_rotationAndProgressDisplay()`.
     */
    _dealWithRotation() {
      let nbColumnToDisplay = Number(this.getConfigOrAttribute('column', '3'));
      let nbRowToDisplay = Number(this.getConfigOrAttribute('row', '2'));

      this._currentDisplayedPage = 1; //re-init

      let allowpagerotation = this.getConfigOrAttribute('allowpagerotation', 'false');
      if (allowpagerotation == 'true' &&
        nbColumnToDisplay > 0 &&
        nbRowToDisplay > 0) {

        //this._currentDisplayedPage = 1; //re-init
        let nbMachine = this._machineIdsArray.length;
        this._nbPagesTotal = Math.ceil(nbMachine / (nbColumnToDisplay * nbRowToDisplay));
        if (this._nbPagesTotal == 0)
          this._nbPagesTotal = 1; // To avoid too log refresh rate
      }
      else { // NO rotation
        this._nbPagesTotal = 1;
      }
      this._rotationAndProgressDisplay();
    }

    /**
     * Shows the current page, updates `#pulse-pagination` text, and schedules the next page rotation.
     * Clears any existing rotation timer before setting a new one to prevent duplicates.
     * No-ops (single page) when `_nbPagesTotal <= 1` or `allowpagerotation !== 'true'`.
     */
    _rotationAndProgressDisplay() {
      // Clear timer if exist ! To avoid many living timers
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }

      let allowpagerotation = this.getConfigOrAttribute('allowpagerotation', 'false');
      if (allowpagerotation == 'true') {
        this._showHidePages();

        if (this._nbPagesTotal > 1) {
          let rotationDelay = Number(this.getConfigOrAttribute('rotation', '90'));

          // Display pagination
          let paginationEl = document.getElementById('pulse-pagination');
          if (paginationEl) {
            paginationEl.innerHTML = (this._currentDisplayedPage) + ' / ' + this._nbPagesTotal;
          }

          // Prepare next page rotation
          this._currentDisplayedPage++;
          if (this._currentDisplayedPage > this._nbPagesTotal) {
            this._currentDisplayedPage = 1;
          }
          this._showHideTimer = setTimeout(function () {
            this._rotationAndProgressDisplay();
          }.bind(this), rotationDelay * 1000);
        }
        else { // 1 page only
          // Reset rotation
          let paginationEl = document.getElementById('pulse-pagination');
          if (paginationEl) {
            paginationEl.innerHTML = '';
          }
        }
      }
    }

    /**
     * Shows the `<li>` items belonging to `_currentDisplayedPage` and hides all others.
     * Also calls `.load()` on any `x-datetimegraduation` elements in the visible page
     * so they can measure their width correctly after being revealed.
     */
    _showHidePages() {
      // Hide or show pages
      for (let index_page = 1; index_page <= this._nbPagesTotal; index_page++) {
        let page_class = 'li-page-' + index_page.toString();
        let lis = this.element.querySelectorAll('.' + page_class);
        if (index_page == this._currentDisplayedPage) {
          // display = 'inline-block'; //NO ! Because of ManagerWiew Page
          [...lis].forEach(li => li.style.display = '');
          let datetimeGraduations = [...lis].flatMap(li => li.querySelectorAll('x-datetimegraduation'));
          [...datetimeGraduations].forEach(el => {
            if (typeof el.load === 'function') {
              el.load();
            }
          });
        }
        else {
          [...lis].forEach(li => li.style.display = 'none');
        }
      } // end for
    }

    /**
     * @override
     *
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey(context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     *
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState(context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button 'Start'
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'templateid':
        case 'group':
        case 'machine':
        case 'column':
        case 'row':
        case 'allowpagerotation':
          //case 'rotation':
          //case 'refreshrate':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('pulse-bigdisplay');

      // Update here some internal parameters

      // listeners

      // Empty display if already filled
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('ol');
      this._content.className = 'group-main';
      this.element.classList.add('group');
      this.element.appendChild(this._content);
      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // STOP timer
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }

      // Parameters
      // DOM
      this.element.replaceChildren();

      this.removeError();
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /*reset () { // Optional implementation - REMOVED else too many refreshs on LCTR and memory grows endlessly
      // Code here to clean the component when the component has been initialized for example after a parameter change
      /*this.removeError();
      // Empty this._content
      $(this.content).empty();

      // STOP timer
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }

      this.switchToNextContext();
    }*/

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      let groups = this.getConfigOrAttribute('group');
      let machines = this.getConfigOrAttribute('machine');
      if ((groups == null || groups == '') &&
        (machines == null || machines == '')) {
        /*missingConfigs.push({
          selector: 'x-machineselection, #editmachines',
          message: 'Please select at least one machine before launching the page.'
        }); */
        console.warn('missing attribute groups or machines in x-grouparray');
        // Delayed display :
        //this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines')), () => this.removeError());
        return;
      }

      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError(message) {
      this._messageSpan.innerHTML = message;

      let els = document.querySelectorAll('.grouparray-dependant');
      [...els].forEach(el => el.classList.add('grouparray-in-error'));

      // STOP timer
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }
    }

    removeError() {
      this._messageSpan.innerHTML = '';

      let els = document.querySelectorAll('.grouparray-dependant');
      [...els].forEach(el => el.classList.remove('grouparray-in-error'));
    }

    /**
     * Refresh interval in ms.
     * Priority: rotation delay × total pages; then `refreshrate` attribute; then 1 hour.
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate() {
      if (this._nbPagesTotal >= 1) {
        let rotationDelay = Number(this.getConfigOrAttribute('rotation', '90'));
        return rotationDelay * this._nbPagesTotal * 1000;
      }
      else if (this.element.hasAttribute('refreshrate')) {
        return 1000 * this.element.getAttribute('refreshrate');
      }
      else {
        return 1000 * 60 * 60; // 1 hr
      }
    }

    /**
     * Handles the machine-only case (no `group` config) without an AJAX call.
     * Splits `machine` config by comma, rebuilds the list, and transitions to `Loaded`.
     * Returns false when a `group` is configured, deferring to the REST path.
     *
     * @returns {boolean} `true` when handled locally, `false` to trigger the REST request.
     */
    _runAlternateGetData() {
      let groups = this.getConfigOrAttribute('group'); //this.element.getAttribute('groups');
      if ((pulseUtility.isNotDefined(groups)) ||
        (groups == '')) {

        this.removeError();

        this._dynamic = false;
        // Manage list of machines NOW
        let machines = this.getConfigOrAttribute('machine');
        this._machineIdsArray = machines.split(',');
        this._displayOrUpdateMachineList();

        this._lastUpdateDate = Date();
        if (this.element.hasAttribute('textchange-context')) {
          // Send empty string
          eventBus.EventBus.dispatchToContext('textChangeEvent',
            this.element.getAttribute('textchange-context'),
            { text: '' });
        }

        // BECAUSE this._dynamic == false; // STOP calling Ajax request
        this.switchToContext('Loaded');
        // AND NOT this.switchToNextContext();
        return true;
      }
      // else Call WebService
      return false;
    }

    /**
     * REST endpoint: `MachinesFromGroups?GroupIds=<group>`.
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl() {
      let groups = this.getConfigOrAttribute('group');
      return 'MachinesFromGroups?GroupIds=' + groups;
    }

    /**
     * Delegates to `_displayOrUpdateMachineList()` using the already-stored `_machineIdsArray`.
     *
     * @param {*} data - REST response (unused; data was stored in `manageSuccess`).
     */
    refresh(data) {
      this._displayOrUpdateMachineList();
    }

    /**
     * Stores `MachineIds` and `Dynamic` flag from the REST response.
     * Dispatches `textChangeEvent` with last-update timestamp when `textchange-context` attribute is set.
     * Static groups (`Dynamic=false` or `forcestaticlist='true'`) rebuild the list and transition to `Loaded`.
     * Dynamic groups call `super.manageSuccess()` to schedule the next polling cycle via `refresh()`.
     *
     * @param {{ MachineIds: number[], Dynamic: boolean }} data
     */
    manageSuccess(data) {
      this.removeError();

      this._machineIdsArray = data.MachineIds;
      this._dynamic = data.Dynamic;
      if (this.getConfigOrAttribute('forcestaticlist') == 'true' ||
        this.getConfigOrAttribute('forcestaticlist') == true) {
        this._dynamic = false;
      }
      this._lastUpdateDate = Date();
      if (this.element.hasAttribute('textchange-context')) {
        let textToSend = '';
        if (this._dynamic) {
          // Format Date and send
          let _lastMoment = pulseUtility.convertDateToMoment(this._lastUpdateDate);
          textToSend = _lastMoment.format('LTS')
        }
        eventBus.EventBus.dispatchToContext('textChangeEvent',
          this.element.getAttribute('textchange-context'),
          { text: textToSend });
      }

      if (false == this._dynamic) {
        this._displayOrUpdateMachineList();

        // STOP calling Ajax request
        this.switchToContext('Loaded');
      }
      else {
        // Success:
        super.manageSuccess(data);
        // or this.switchToNextContext(() => this.refresh(data));
      }
    }

    // Callback events

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange(event) {
      if ((event.target.config == 'machine')
        || (event.target.config == 'group')) {
        this.start();
      }
      if ((event.target.config == 'row')
        || (event.target.config == 'column')) {
        this._displayOrUpdateMachineList();
      }
      if (event.target.config == 'rotation') {
        this._currentDisplayedPage = 1;
        this._rotationAndProgressDisplay();
      }
    }

  }

  pulseComponent.registerElement('x-grouparray', GroupComponent, ['templateid', 'group', 'machine', 'column', 'row', 'allowpagerotation']);
})();
