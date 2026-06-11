// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-groupgrid
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseConfig from 'pulseConfig';
import * as state from 'state';
import * as eventBus from 'eventBus';

(function () {
  /**
   * `<x-groupgrid>` — autonomous CSS-grid renderer for a list of machines.
   *
   * Source resolution: reads `group` and `machine` config (via `getConfigOrAttribute`).
   * With only `machine` set, the id list is used as-is and the component switches
   * to a static `Loaded` context. With a `group`, fetches
   * `MachinesFromGroups?GroupIds=<group>` via the standard refresh framework;
   * static groups (`Dynamic=false` or `forcestaticlist='true'`) freeze in
   * `Loaded`, dynamic groups keep polling at `refreshrate` (default 30 s).
   *
   * Renders one `<div class="groupgrid-item">` per machine inside a
   * `<div class="groupgrid-main">`, cloning the element identified by
   * `templateid` (default `'boxtoclone'`) and stamping `machine-id`. Reuses
   * existing items and marks them with `disableDeleteWhenDisconnect` during
   * reordering so the framework keeps the `_webComponent` reference alive
   * (removed 500 ms later). On the `updateVisibleMachines` event (context
   * `'PAGE'`), shows/hides items based on the carried id list and exposes the
   * visible count via the `data-count` attribute on `.groupgrid-main`. Shows
   * a "No machine in selection" message when the resolved id list is empty.
   *
   * @element x-groupgrid
   * @attr {string}  templateid      id of the element to clone per machine (default `'boxtoclone'`)
   * @attr {string}  group           group id(s) — comma-separated for multi-group
   * @attr {string}  machine         comma-separated machine id list (used when no `group`)
   * @attr {boolean} forcestaticlist `'true'` treats dynamic groups as static (stops polling)
   * @attr {number}  refreshrate     refresh interval in seconds (default `30`)
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class GroupGridComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      self._machineIdsArray = [];
      // Subset of `_machineIdsArray` actually mounted in the DOM. `null` =
      // no pagination yet known; `_buildItems` falls back to the first slice
      // of size `machinesperpage` in live mode, or the full list otherwise.
      // Updated on each `updateVisibleMachines` event from the rotation engine.
      self._visibleMachineIds = null;
      self._dynamic = false;
      return self;
    }

    /**
     * Returns the machine ids that should actually be mounted in the DOM.
     *
     * In non-live mode (or when no rotation is needed) the full list is used.
     * In live mode with rotation active, the rotation engine drives
     * `_visibleMachineIds` via `updateVisibleMachines`; before the first
     * event arrives we pre-slice the first page so initial mount stays bounded.
     */
    _getActiveIds() {
      let tmpContexts = pulseUtility.getURLParameterValues(window.location.href, 'AppContext');
      let isLive = tmpContexts && tmpContexts.includes('live');
      if (!isLive) return this._machineIdsArray;

      let isDefault = pulseConfig.getBool('defaultlayout', true);
      let perPage = isDefault ? 100 : pulseConfig.getInt('machinesperpage', 12);
      if (perPage < 1) perPage = 12;
      if (this._machineIdsArray.length <= perPage) return this._machineIdsArray;

      if (this._visibleMachineIds && this._visibleMachineIds.length > 0) {
        let visibleSet = new Set(this._visibleMachineIds.map(id => String(id).trim()));
        return this._machineIdsArray.filter(id => visibleSet.has(String(id).trim()));
      }

      // No visibility event yet: pre-mount only the first page.
      return this._machineIdsArray.slice(0, perPage);
    }

    get content() { return this._content; }

    get isVisible() {
      return !!this._connected;
    }

    initialize() {
      this.addClass('pulse-groupgrid');
      this.element.replaceChildren();

      this._content = document.createElement('div');
      this._content.classList.add('groupgrid-main');
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
      this._messageDiv = document.createElement('div');
      this._messageDiv.classList.add('pulse-message-div');
      this._messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(this._messageDiv);

      if (eventBus.EventBus.addEventListener) {
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
      this._visibleMachineIds = null;
      super.clearInitialization();
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

    /**
     * Renders all machines from `_machineIdsArray` into the DOM as `.groupgrid-item` divs.
     * Idempotent: removes items not in list, reuses existing items, appends new ones.
     *
     * Reordering existing items via jQuery `append` triggers the browser's
     * `disconnectedCallback` → `connectedCallback` cycle, which would null out
     * the framework's `_webComponent` reference. We mark items with the
     * `disableDeleteWhenDisconnect` class before reorder so the framework keeps
     * the reference alive (class removed after 500 ms via `_removeDisable`).
     */
    _buildItems() {
      let templateId = this.element.getAttribute('templateid') || 'boxtoclone';

      // Only mount what the rotation engine considers active. Items for
      // machines on other pages are removed so their per-machine components
      // stop polling until the rotation brings them back.
      let activeIds = this._getActiveIds();
      let activeStrIds = activeIds.map(id => String(id).trim());

      let items = this._content.querySelectorAll('.groupgrid-item');
      items.forEach(item => {
        let machineId = String(item.getAttribute('machine-id')).trim();
        let found = activeStrIds.includes(machineId);
        if (!found) {
          item.remove();
        } else {
          let allDescendants = item.querySelectorAll('*');
          allDescendants.forEach(el => el.classList.add('disableDeleteWhenDisconnect'));
        }
      });

      if (this._machineIdsArray.length === 0) {
        this.displayError(this.getTranslation('groupArray.noMachine', 'No machine in selection'));
        this._content.setAttribute('data-count', 0);
        return;
      }
      this.removeError();

      for (let i = 0; i < activeStrIds.length; i++) {
        let machineId = activeStrIds[i];
        let existing = this._content.querySelector(".groupgrid-item[machine-id='" + machineId + "']");
        if (existing) {
          let currentItems = this._content.querySelectorAll('.groupgrid-item');
          if (currentItems[i] !== existing) {
            this._content.appendChild(existing);
          }
        } else {
          let itemContent = pulseUtility.cloneWithNewMachineId(templateId, machineId);
          let item = document.createElement('div');
          item.classList.add('groupgrid-item');
          item.setAttribute('machine-id', machineId);
          item.appendChild(itemContent);
          this._content.appendChild(item);
        }
      }

      this._content.setAttribute('data-count', activeStrIds.length);

      setTimeout(this._removeDisable.bind(this), 500);
    }

    _removeDisable() {
      let elements = this.element.querySelectorAll('.disableDeleteWhenDisconnect');
      elements.forEach(el => el.classList.remove('disableDeleteWhenDisconnect'));
    }

    /**
     * `updateVisibleMachines` callback: update `_visibleMachineIds` and
     * rebuild the DOM so only the active page's machines are mounted.
     * Items leaving the page are removed (their per-machine components stop
     * polling); items entering the page are cloned fresh from the template.
     */
    onUpdateVisibility(event) {
      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;
      this._visibleMachineIds = visibleIds.map(id => String(id).trim());
      if (this._content) {
        this._buildItems();
      }
    }

    displayError(message) {
      this._messageSpan.textContent = message;
      if (this._messageDiv) {
        this._messageDiv.classList.add('force-visibility');
      }
    }

    removeError() {
      this._messageSpan.textContent = '';
      if (this._messageDiv) {
        this._messageDiv.classList.remove('force-visibility');
      }
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

    /**
     * Refresh interval in ms (default 30 s).
     */
    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshrate', 30));
    }

    /**
     * Handles the machine-only case (no `group` config) without an AJAX call.
     */
    _runAlternateGetData() {
      let groups = this.getConfigOrAttribute('group');
      if (pulseUtility.isNotDefined(groups) || groups == '') {
        this.removeError();

        this._dynamic = false;
        let machines = this.getConfigOrAttribute('machine');
        this._machineIdsArray = (machines || '').split(',').filter(s => s !== '');
        this._buildItems();

        this.switchToContext('Loaded');
        return true;
      }
      return false;
    }

    /**
     * REST endpoint: `MachinesFromGroups?GroupIds=<group>`.
     */
    getShortUrl() {
      let groups = this.getConfigOrAttribute('group');
      return 'MachinesFromGroups?GroupIds=' + groups;
    }

    refresh(data) {
      this._buildItems();
    }

    manageSuccess(data) {
      this.removeError();

      let newIds = (data.MachineIds || []).map(id => String(id));
      // Skip the DOM rebuild if the resolved id list is unchanged — same
      // reasoning as in x-grouplist: moving existing `.groupgrid-item`
      // elements would trigger needless disconnect/reconnect on every
      // cloned per-machine component.
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

  pulseComponent.registerElement('x-groupgrid', GroupGridComponent, ['templateid', 'group', 'machine']);
})();
