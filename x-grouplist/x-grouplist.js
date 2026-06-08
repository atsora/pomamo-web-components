// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-grouplist
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var state = require('state');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-grouplist>` — autonomous single-column renderer for a list of machines.
   *
   * Source resolution: reads `group` and `machine` config (via `getConfigOrAttribute`).
   * With only `machine` set, the id list is used as-is and the component switches
   * to a static `Loaded` context. With a `group`, fetches
   * `MachinesFromGroups?GroupIds=<group>` via the standard refresh framework;
   * static groups (`Dynamic=false` or `forcestaticlist='true'`) freeze in
   * `Loaded`, dynamic groups keep polling at `refreshrate` (default 30 s).
   *
   * Renders one `<div class="group-single">` per machine inside a
   * `<div class="group-main">`, cloning the element identified by `templateid`
   * (default `'boxtoclone'`) and stamping `machine-id`. Reuses existing rows
   * and marks them with `disableDeleteWhenDisconnect` during reordering so the
   * framework keeps the `_webComponent` reference alive (removed 500 ms later).
   * Activates the first `x-machinetab` if none is active. On the
   * `updateVisibleMachines` event (context `'PAGE'`), shows/hides rows based
   * on the carried id list and sets the `--visible-count` CSS custom property.
   * Listening to `updateVisibleMachines` is skipped when
   * `forcestaticlist === 'true'` or the `no-rotation` attribute is present.
   * Shows a "No machine in selection" message when the resolved id list is empty.
   *
   * @element x-grouplist
   * @attr {string}  templateid      id of the element to clone per machine (default `'boxtoclone'`)
   * @attr {string}  group           group id(s) — comma-separated for multi-group
   * @attr {string}  machine         comma-separated machine id list (used when no `group`)
   * @attr {boolean} forcestaticlist `'true'` treats dynamic groups as static (stops polling)
   * @attr {boolean} no-rotation     presence opts out of the `updateVisibleMachines` listener
   * @attr {number}  refreshrate     refresh interval in seconds (default `30`)
   * @method getMachinesList         current machine id list, comma-separated
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class GroupComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._machineIdsArray = [];
      self._dynamic = false;

      self.methods = {
        'getMachinesList': self.getMachinesList
      };

      return self;
    }

    get isVisible() {
      return !!this._connected;
    }

    /** Get list of machines as string */
    getMachinesList() {
      return this._machineIdsArray.join();
    }

    get content() {
      return this._content;
    }

    /** True when the `updateVisibleMachines` listener should be skipped. */
    _isStandalone() {
      if (this.element.hasAttribute('no-rotation')) return true;
      let forceStatic = this.getConfigOrAttribute('forcestaticlist', 'false');
      return (forceStatic === 'true' || forceStatic === true);
    }

    /** Reconcile the DOM with the current `_machineIdsArray` (idempotent). */
    _buildItems() {
      let boxtocloneid = this.element.getAttribute('templateid') || 'boxtoclone';

      let singles = this.element.querySelectorAll('.group-single');
      singles.forEach(el => {
        let machineId = String(el.getAttribute('machine-id')).trim();
        let found = this._machineIdsArray.some(id => String(id).trim() === machineId);
        if (!found) {
          el.remove();
        } else {
          let allDescendants = el.querySelectorAll('*');
          allDescendants.forEach(desc => desc.classList.add('disableDeleteWhenDisconnect'));
        }
      });

      if (this._machineIdsArray.length === 0) {
        this.displayError(this.getTranslation('groupArray.noMachine', 'No machine in selection'));
        return;
      }
      this.removeError();

      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let singleid = String(this._machineIdsArray[i]).trim();
        let machineRow = this._content.querySelector(".group-single[machine-id='" + singleid + "']");
        if (machineRow) {
          let groupSingles = this._content.querySelectorAll('.group-single');
          if (groupSingles[i] !== machineRow) {
            this._content.appendChild(machineRow);
          }
        } else {
          let copy = pulseUtility.cloneWithNewMachineId(boxtocloneid, singleid);
          let li = document.createElement('div');
          li.classList.add('group-single');
          li.setAttribute('machine-id', singleid);
          li.appendChild(copy);
          this._content.appendChild(li);
        }
      }

      let tabs = this._content.querySelectorAll('x-machinetab');
      if (tabs && tabs.length > 0) {
        let activeTab = this._content.querySelector('x-machinetab[active="true"]');
        if (!activeTab) {
          tabs[0].setAttribute('active', 'true');
        }
      }

      setTimeout(this._removeDisable.bind(this), 500);
    }

    _removeDisable() {
      let elements = this.element.querySelectorAll('.disableDeleteWhenDisconnect');
      elements.forEach(el => el.classList.remove('disableDeleteWhenDisconnect'));
    }

    /**
     * `updateVisibleMachines` callback: show/hide rows based on the carried
     * id list and update the `--visible-count` CSS custom property.
     */
    onUpdateVisibility(event) {
      if (this._isStandalone()) return;

      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;
      let visibleStrIds = visibleIds.map(id => String(id).trim());

      this.element.style.setProperty('--visible-count', visibleStrIds.length);

      let singles = this._content.querySelectorAll('.group-single');
      singles.forEach(el => {
        let id = String(el.getAttribute('machine-id')).trim();
        if (visibleStrIds.includes(id)) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr === 'templateid' || attr === 'group' || attr === 'machine') {
        this.start();
      }
    }

    /**
     * @override — adds the `Loaded` context (used after a static-group resolve
     * or a machine-only list, to freeze the state machine and stop polling).
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
     * @override — defines the `Loaded` context as a no-refresh static state.
     */
    defineState(context, key) {
      switch (context) {
        case 'Loaded':
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    initialize() {
      this.addClass('pulse-bigdisplay');
      this.element.replaceChildren();

      this._content = document.createElement('div');
      this._content.classList.add('group-main');
      this.element.classList.add('group');
      this.element.appendChild(this._content);

      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.textContent = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.textContent = '';
      this._messageDiv = document.createElement('div');
      this._messageDiv.classList.add('pulse-message-div');
      this._messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(this._messageDiv);

      if (!this._isStandalone() && eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility.bind(this));
      }

      this.switchToNextContext();
    }

    clearInitialization() {
      this.element.replaceChildren();
      this.removeError();
      this._messageSpan = undefined;
      this._messageDiv = undefined;
      this._content = undefined;
      // Reset the cached id list — the DOM has just been wiped, so the
      // `listChanged` short-circuit in manageSuccess() must rebuild on the
      // next success even if the new ids happen to match the previous run.
      this._machineIdsArray = [];
      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters.
     * Requires at least one of `group` or `machine` to be set.
     */
    validateParameters() {
      let groups = this.getConfigOrAttribute('group');
      let machines = this.getConfigOrAttribute('machine');
      if ((groups == null || groups == '') && (machines == null || machines == '')) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines')),
          () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError(message) {
      this._messageSpan.textContent = message;
      if (this._messageDiv) this._messageDiv.classList.add('force-visibility');
    }

    removeError() {
      this._messageSpan.textContent = '';
      if (this._messageDiv) this._messageDiv.classList.remove('force-visibility');
    }

    /**
     * Refresh interval in ms (default 30 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshrate', 30));
    }

    /**
     * Handles the machine-only case (no `group` config) without an AJAX call.
     * Splits `machine` config by comma, rebuilds the list, and transitions to `Loaded`.
     *
     * @returns {boolean} `true` when handled locally, `false` to trigger the REST request.
     */
    _runAlternateGetData() {
      let groups = this.getConfigOrAttribute('group');
      if (pulseUtility.isNotDefined(groups) || groups == '') {
        this.removeError();

        this._dynamic = false;
        let machines = this.getConfigOrAttribute('machine');
        this._machineIdsArray = (machines || '').split(',').filter(s => s !== '');
        this._buildItems();

        // Static list: stop polling
        this.switchToContext('Loaded');
        return true;
      }
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
     * Delegates to `_buildItems()` using the already-stored `_machineIdsArray`.
     *
     * @param {*} data - REST response (unused; data was stored in `manageSuccess`).
     */
    refresh(data) {
      this._buildItems();
    }

    /**
     * Stores `MachineIds` and `Dynamic` flag from the REST response.
     * Static groups (`Dynamic=false` or `forcestaticlist='true'`) rebuild
     * and transition to `Loaded`; dynamic groups delegate to `super.manageSuccess`
     * which schedules the next polling cycle via `refresh()`.
     *
     * @param {{ MachineIds: number[], Dynamic: boolean }} data
     */
    manageSuccess(data) {
      this.removeError();

      let newIds = (data.MachineIds || []).map(id => String(id));
      // Skip the DOM rebuild if the resolved id list is unchanged — moving
      // existing `.group-single` elements via jQuery `append` would trigger
      // disconnect/reconnect cycles on every cloned per-machine component,
      // disrupting in-flight ajax requests in their own state machines.
      let listChanged = newIds.length !== this._machineIdsArray.length
        || newIds.some((id, i) => id !== String(this._machineIdsArray[i]));

      this._machineIdsArray = newIds;
      this._dynamic = !!data.Dynamic;
      if (this.getConfigOrAttribute('forcestaticlist') == 'true' ||
        this.getConfigOrAttribute('forcestaticlist') == true) {
        this._dynamic = false;
      }

      if (!this._dynamic) {
        if (listChanged) this._buildItems();
        this.switchToContext('Loaded');
      } else {
        if (listChanged) {
          super.manageSuccess(data);
        } else {
          // Same ids — keep polling but skip refresh(data)/_buildItems.
          // Re-enter Normal directly so the next ajax is scheduled.
          this.switchToContext('Normal');
        }
      }
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     * when `machine` or `group` change.
     */
    onConfigChange(event) {
      if (event.target.config == 'machine' || event.target.config == 'group') {
        this.start();
      }
    }
  }

  pulseComponent.registerElement('x-grouplist', GroupComponent, ['templateid', 'group', 'machine', 'no-rotation']);
})();
