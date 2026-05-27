// Copyright (C) 2025 Atsora Solutions
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-groupgrid
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var state = require('state');
var eventBus = require('eventBus');

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
      self._dynamic = false;
      return self;
    }

    get content() { return this._content; }

    get isVisible() {
      return !!this._connected;
    }

    initialize() {
      this.addClass('pulse-groupgrid');
      $(this.element).empty();

      this._content = $('<div></div>').addClass('groupgrid-main');
      $(this.element).append(this._content);

      // Loader DOM kept (hidden) — surfaced by CSS via `.pulse-component-loading`.
      let loader = $('<div></div>').addClass('pulse-loader')
        .html(this.getTranslation('loadingDots', 'Loading...')).hide();
      $(this._content).append($('<div></div>').addClass('pulse-loader-div').append(loader));
      this._messageSpan = $('<span></span>').addClass('pulse-message');
      this._messageDiv = $('<div></div>').addClass('pulse-message-div').append(this._messageSpan);
      $(this._content).append(this._messageDiv);

      if (eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility);
      }

      this.switchToNextContext();
    }

    clearInitialization() {
      $(this.element).empty();
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
      let container = $(this._content);
      let templateId = this.element.getAttribute('templateid') || 'boxtoclone';

      // Mark survivors before any DOM mutation, then remove items not in new list
      let self = this;
      container.find('.groupgrid-item').each(function () {
        let machineId = String($(this).attr('machine-id')).trim();
        let found = self._machineIdsArray.some(id => String(id).trim() === machineId);
        if (!found) {
          $(this).remove();
        } else {
          $(this).find('*').addClass('disableDeleteWhenDisconnect');
        }
      });

      if (this._machineIdsArray.length === 0) {
        this.displayError(this.getTranslation('groupArray.noMachine', 'No machine in selection'));
        $(this._content).attr('data-count', 0);
        return;
      }
      this.removeError();

      // Add or reuse items in order. Only re-append an existing item if it's
      // not already at the right position — append() detaches and re-attaches
      // the element, triggering disconnect/reconnect on every cloned
      // per-machine component.
      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let machineId = String(this._machineIdsArray[i]).trim();
        let existing = container.find(".groupgrid-item[machine-id='" + machineId + "']");
        if (existing.length > 0) {
          let items = container.find('.groupgrid-item');
          if (items[i] !== existing[0]) {
            container.append(existing[0]);
          }
        } else {
          let itemContent = pulseUtility.cloneWithNewMachineId(templateId, machineId);
          let item = $('<div></div>')
            .addClass('groupgrid-item')
            .attr('machine-id', machineId)
            .append(itemContent);
          container.append(item);
        }
      }

      $(this._content).attr('data-count', this._machineIdsArray.length);

      setTimeout(this._removeDisable.bind(this), 500);
    }

    _removeDisable() {
      $(this.element).find('.disableDeleteWhenDisconnect')
        .removeClass('disableDeleteWhenDisconnect');
    }

    /**
     * `updateVisibleMachines` callback: show/hide `.groupgrid-item` divs based
     * on the carried id list and update `data-count` for CSS sizing.
     */
    onUpdateVisibility(event) {
      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;
      let visibleStrIds = visibleIds.map(id => String(id).trim());

      $(this._content).attr('data-count', visibleStrIds.length);

      $(this._content).find('.groupgrid-item').each(function () {
        let el = $(this);
        let id = String(el.attr('machine-id')).trim();
        if (visibleStrIds.includes(id)) {
          el.css('display', 'flex');
        } else {
          el.hide();
        }
      });
    }

    displayError(message) {
      $(this._messageSpan).html(message);
      if (this._messageDiv) {
        this._messageDiv.addClass('force-visibility');
      }
    }

    removeError() {
      $(this._messageSpan).html('');
      if (this._messageDiv) {
        this._messageDiv.removeClass('force-visibility');
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
