// Copyright (C) 2025 Atsora Solutions
// SPDX-License-Identifier: Apache-2.0

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');
var state = require('state');

(function () {
  /**
   * `<x-groupgrid>` — grid layout of machine items, driven by the rotation engine.
   *
   * Identical machine-source resolution to `x-grouplist`:
   *  1. `machine` config → renders all machines immediately, transitions to `Loaded`.
   *  2. `group` config → fetches `MachinesFromGroups?GroupIds=<group>`, then delegates to engine.
   *  3. Nothing → empty grid, `Loaded`.
   *
   * After rendering all machines into the DOM (`_displayAllMachines`), dispatches `groupGridRendered`.
   * The rotation engine then controls per-item visibility via `updateVisibleMachines` (context `'PAGE'`),
   * which updates `data-count` on the container and shows/hides `.groupgrid-item` divs.
   *
   * Attributes:
   *   templateid - id of the DOM element to clone per machine (default `'boxtoclone'`)
   *   group      - group id(s), resolved via REST
   *   machine    - comma-separated machine id list (takes priority)
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class GroupGridComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      self._machineIdsArray = [];
      self._waitingForEngine = false;
      return self;
    }

    get content() { return this._content; }

    initialize() {
      this.addClass('pulse-groupgrid');
      $(this.element).empty();

      this._content = $('<div></div>').addClass('groupgrid-main');
      $(this.element).append(this._content);

      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').hide();
      $(this._content).append($('<div></div>').addClass('pulse-loader-div').append(loader));
      this._messageSpan = $('<span></span>').addClass('pulse-message');
      $(this._content).append($('<div></div>').addClass('pulse-message-div').append(this._messageSpan));

      // Listen to the rotation engine's show/hide orders
      if (eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility);
      }

      this.switchToNextContext();
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr === 'machine' || attr === 'group') {
        this.start();
      }
    }

    getStartKey(context) {
      switch (context) {
        case 'Loaded': return 'Standard';
        default: return super.getStartKey(context);
      }
    }

    defineState(context, key) {
      switch (context) {
        case 'Loaded': return new state.StaticState(context, key, this);
        default: return super.defineState(context, key);
      }
    }

    /**
     * REST endpoint: `MachinesFromGroups?GroupIds=<group>`.
     * Only called when no `machine` config is set and a `group` config is present.
     *
     * @returns {string|null} Short URL without base path, or null if no group is configured.
     */
    getShortUrl() {
      let groups = pulseConfig.getString('group');
      if (!groups || groups === '') return null;
      return 'MachinesFromGroups?GroupIds=' + groups;
    }

    /**
     * Attempts to resolve machines without an AJAX call.
     * Priority: 1) `machine` config → renders immediately; 2) `group` config → returns false (triggers AJAX);
     * 3) nothing → empty grid. Returns true when handled without AJAX, false to trigger the REST request.
     *
     * @returns {boolean}
     */
    _runAlternateGetData() {
      if (this._waitingForEngine) return true;

      // 1. Priority: 'machine' config (set by common_page)
      let machinesStr = pulseConfig.getString('machine');
      if (machinesStr && machinesStr.trim() !== '') {
        this._machineIdsArray = machinesStr.split(',').map(s => s.trim()).filter(s => s !== '');
        this._displayAllMachines(); // On affiche TOUT le monde dans le DOM
        this.switchToContext('Loaded');
        return true;
      }

      // 2. Group
      let groups = pulseConfig.getString('group');
      if (groups && groups.trim() !== '') {
        return false; // Launch AJAX
      }

      this._machineIdsArray = [];
      this._displayAllMachines();
      this.switchToContext('Loaded');
      return true;
    }

    manageSuccess(data) {
      this.removeError();
      let allMachineIds = data.MachineIds || [];

      if (pulseConfig.getString('group')) {
        console.log('[DEBUG] x-groupgrid: Group loaded (' + allMachineIds.length + '). Delegating to Engine.');
        this._waitingForEngine = true;

        let payload = { newMachinesList: allMachineIds.join(',') };
        if (eventBus.EventBus.dispatchToAll) eventBus.EventBus.dispatchToAll('groupIsReloaded', payload);
        else if (eventBus.EventBus.dispatch) eventBus.EventBus.dispatch('groupIsReloaded', payload);

        // EventBus is synchronous: onConfigChange may have already processed the
        // configChangeEvent('machine') and rebuilt the grid (_waitingForEngine === false).
        // Only clear+rebuild if the engine has NOT yet responded (async path).
        if (this._waitingForEngine) {
          this._machineIdsArray = [];
          this._displayAllMachines();
        }
      }
      else {
        this._machineIdsArray = allMachineIds;
        this._displayAllMachines();
      }
      this.switchToContext('Loaded');
    }

    /**
     * Renders all machines from `_machineIdsArray` into the DOM as `.groupgrid-item` divs.
     * Clones the template element per machine, sets `data-count`, and dispatches `groupGridRendered`.
     * The rotation engine will later show/hide items via `onUpdateVisibility`.
     */
    _displayAllMachines() {
      let container = $(this._content);
      container.find('.groupgrid-item').remove();

      if (this._machineIdsArray.length > 0) {
        let templateId = this.element.getAttribute('templateid') || 'boxtoclone';

        this._machineIdsArray.forEach(machineId => {
          if (!machineId) return;
          let itemContent = pulseUtility.cloneWithNewMachineId(templateId, machineId);

          let item = $('<div></div>')
            .addClass('groupgrid-item')
            .attr('machine-id', machineId)
            .append(itemContent);

          container.append(item);
        });
        $(this._content).attr('data-count', this._machineIdsArray.length);

        console.log('[DEBUG] x-groupgrid: All items rendered. Signaling Engine.');
        if (eventBus.EventBus.dispatchToAll) eventBus.EventBus.dispatchToAll('groupGridRendered', {});
        else if (eventBus.EventBus.dispatch) eventBus.EventBus.dispatch('groupGridRendered', {});
      }

      console.log('[DEBUG] x-groupgrid: All ' + this._machineIdsArray.length + ' items rendered. Signaling Engine.');

      // Signal the engine that the DOM is ready to be manipulated
      if (eventBus.EventBus.dispatchToAll) eventBus.EventBus.dispatchToAll('groupGridRendered', {});
      else if (eventBus.EventBus.dispatch) eventBus.EventBus.dispatch('groupGridRendered', {});
    }

    /**
     * Rotation engine callback: shows/hides `.groupgrid-item` divs based on `visibleIds`.
     * Also updates `data-count` attribute with the visible item count for CSS layout.
     *
     * @param {{ target?: { machines: string[] }, machines?: string[] }} event
     */
    onUpdateVisibility(event) {
      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;

      let count = visibleIds.length;

      // Inject count so CSS can react to it (e.g. grid column calculations)
      $(this._content).attr('data-count', count);

      let items = $(this._content).find('.groupgrid-item');

      items.each(function () {
        let el = $(this);
        let id = el.attr('machine-id');

        if (visibleIds.includes(id)) {
          el.css('display', 'flex');
        } else {
          el.hide();
        }
      });
    }

    onConfigChange(event) {
      if (event.target.config === 'machine') {
        this._waitingForEngine = false;
        this.start();
      }
      else if (event.target.config === 'group') {
        if (pulseConfig.getString('group') !== '') {
          this._waitingForEngine = false;
          this.start();
        }
      }
    }

    validateParameters() { this.switchToNextContext(); }
    displayError(message) { $(this._messageSpan).html(message); }
    removeError() { $(this._messageSpan).html(''); }
  }

  pulseComponent.registerElement('x-groupgrid', GroupGridComponent, ['templateid', 'group', 'machine']);
})();
