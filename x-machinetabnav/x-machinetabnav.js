// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machinetabnav
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var state = require('state');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-machinetabnav>` — autonomous per-machine renderer + mobile prev/next nav.
   *
   * Source resolution: reads `group` and `machine` config (via
   * `getConfigOrAttribute`). With only `machine` set, the id list is used
   * as-is and the component switches to a static `Loaded` context. With a
   * `group`, fetches `MachinesFromGroups?GroupIds=<group>` via the standard
   * refresh framework; static groups (`Dynamic=false` or
   * `forcestaticlist='true'`) freeze in `Loaded`, dynamic groups keep polling
   * at `refreshrate` (default 30 s).
   *
   * Rendering: clones the element identified by `templateid` once per machine
   * (stamping `machine-id` on the clone and all its descendants) and appends
   * each clone inside a `<div class="group-single" machine-id="X">` under an
   * internal `<div class="machinetabnav-content">` host. Existing rows are
   * reused across refreshes; reordering re-appends only the rows at the wrong
   * index. Children of reused rows are marked with `disableDeleteWhenDisconnect`
   * during the move so the per-machine x-tags keep their `_webComponent`
   * reference; the marker is cleared 500 ms later. Activates the first
   * `x-machinetab` if none is active.
   *
   * Mobile-only chevrons (visible inside `@all-phones-media`) cycle between
   * machines: tracks the active id via `machineIdChangeSignal` on
   * `machine-context`, dispatches the new id on click.
   *
   * @element x-machinetabnav
   * @attr {string}  machine-context (required) event-bus context for machine signals
   * @attr {string}  templateid      id of the element to clone per machine
   * @attr {string}  group           group id(s) — comma-separated for multi-group
   * @attr {string}  machine         comma-separated machine id list (used when no `group`)
   * @attr {boolean} forcestaticlist `'true'` treats dynamic groups as static (stops polling)
   * @attr {number}  refreshrate     refresh interval in seconds (default `30`)
   * @fires machineIdChangeSignal    `{ newMachineId: number }` — on `machine-context`, on chevron click
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class MachineTabNavComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      self._machineIdsArray = [];
      self._activeMachineId = null;
      self._dynamic = false;
      self._content = undefined;
      self._chevronPrev = undefined;
      self._chevronNext = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal', newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        case 'group':
        case 'machine':
          if (this.isInitialized()) this.start();
          break;
        case 'templateid':
          if (this.isInitialized()) this._buildItems();
          break;
        default:
          break;
      }
    }

    initialize() {
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      this.element.replaceChildren();

      // Host for per-machine clones (rendered into .group-single rows by _buildItems).
      this._content = document.createElement('div');
      this._content.className = 'machinetabnav-content';
      this.element.appendChild(this._content);

      // Mobile chevrons: SVG icons inlined from images/previous.svg and
      // images/next.svg. CSS hides them on desktop, surfaces them inside
      // `@all-phones-media`.
      this._chevronPrev = document.createElement('div');
      this._chevronPrev.className = 'machinetabnav-chevron machinetabnav-chevron-prev';
      this._chevronPrev.setAttribute('role', 'button');
      this._chevronPrev.setAttribute('tabindex', '0');
      this._chevronPrev.setAttribute('aria-label',
        this.getTranslation('previousMachine', 'Previous machine'));

      this._chevronNext = document.createElement('div');
      this._chevronNext.className = 'machinetabnav-chevron machinetabnav-chevron-next';
      this._chevronNext.setAttribute('role', 'button');
      this._chevronNext.setAttribute('tabindex', '0');
      this._chevronNext.setAttribute('aria-label',
        this.getTranslation('nextMachine', 'Next machine'));

      this._chevronPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        this._navigateAdjacent(-1);
      });
      this._chevronNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this._navigateAdjacent(1);
      });

      this.element.appendChild(this._chevronPrev);
      this.element.appendChild(this._chevronNext);
      pulseSvg.inlineBackgroundSvg(this._chevronPrev);
      pulseSvg.inlineBackgroundSvg(this._chevronNext);

      this.switchToNextContext();
    }

    clearInitialization() {
      eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
      this.element.replaceChildren();
      this._content = undefined;
      this._chevronPrev = undefined;
      this._chevronNext = undefined;
      this._machineIdsArray = [];
      this._activeMachineId = null;
      super.clearInitialization();
    }

    /**
     * Renders the "no machine in selection" message inside `_content` and
     * clears any previously rendered `.group-single` rows.
     */
    displayError(message) {
      if (this._content == null) return;
      this._content.querySelectorAll('.group-single').forEach(row => row.remove());
      let existingMsg = this._content.querySelector('.machinetabnav-message');
      if (existingMsg) existingMsg.remove();
      if (message != null && message !== '') {
        let msg = document.createElement('div');
        msg.className = 'machinetabnav-message';
        msg.textContent = message;
        this._content.appendChild(msg);
      }
    }

    removeError() {
      if (this._content == null) return;
      let existingMsg = this._content.querySelector('.machinetabnav-message');
      if (existingMsg) existingMsg.remove();
    }

    /**
     * @override — adds the `Loaded` context for static lists (no polling).
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
     * Validate the (event) parameters: `machine-context` is required, and at
     * least one of `group` or `machine` must be set.
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-context')) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.missingMachineContext', 'Missing machine-context')),
          () => this.removeError());
        return;
      }
      let groups = this.getConfigOrAttribute('group');
      let machines = this.getConfigOrAttribute('machine');
      if ((groups == null || groups == '') && (machines == null || machines == '')) {
        // Delayed error — config may arrive later via onConfigChange.
        this.setError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines'));
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
     * Updates `_machineIdsArray` from the `machine` config and rebuilds rows.
     */
    _runAlternateGetData() {
      let groups = this.getConfigOrAttribute('group');
      if (pulseUtility.isNotDefined(groups) || groups == '') {
        this._dynamic = false;
        let machines = this.getConfigOrAttribute('machine');
        this._machineIdsArray = (machines || '').split(',').map(s => String(s).trim()).filter(s => s !== '');
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

    /**
     * No DOM rebuild — _buildItems() ran in manageSuccess(). The framework
     * still calls refresh(data) after a successful poll for dynamic groups,
     * so we keep it as a no-op for the polling cycle. _buildItems is
     * idempotent and re-runs only on actual list changes via manageSuccess.
     */
    refresh(data) {
      // No-op; rows are kept in sync from manageSuccess.
    }

    /**
     * Stores `MachineIds` and `Dynamic` flag from the REST response, then
     * rebuilds the row DOM.
     */
    manageSuccess(data) {
      this._machineIdsArray = (data.MachineIds || []).map(id => String(id));
      this._dynamic = !!data.Dynamic;
      if (this.getConfigOrAttribute('forcestaticlist') == 'true' ||
        this.getConfigOrAttribute('forcestaticlist') == true) {
        this._dynamic = false;
      }

      this._buildItems();

      if (!this._dynamic) {
        this.switchToContext('Loaded');
      }else {
        super.manageSuccess(data);
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

    /**
     * `machineIdChangeSignal` callback: track the active machine id so
     * prev/next navigation knows where to start from.
     */
    onMachineIdChange(event) {
      this._activeMachineId = Number(event.target.newMachineId);
    }

    /**
     * Navigate to the prev (-1) or next (+1) machine in the list with
     * wrap-around. Dispatches `machineIdChangeSignal` on `machine-context`.
     */
    _navigateAdjacent(direction) {
      if (!this._machineIdsArray || this._machineIdsArray.length <= 1) return;
      let len = this._machineIdsArray.length;
      let currentIdx = this._machineIdsArray.findIndex(
        id => Number(id) === this._activeMachineId);
      if (currentIdx === -1) currentIdx = 0;
      let newIdx = (currentIdx + direction + len) % len;
      let newId = Number(this._machineIdsArray[newIdx]);

      eventBus.EventBus.dispatchToContext('machineIdChangeSignal',
        this.element.getAttribute('machine-context'),
        { newMachineId: newId });
    }

    /**
     * Reconcile `_content` rows with the current `_machineIdsArray` (idempotent).
     *
     * - Removes rows whose `machine-id` is no longer in the list.
     * - Marks descendants of reused rows with `disableDeleteWhenDisconnect`
     *   so the per-machine x-tags survive a re-append.
     * - Adds new rows by cloning `#templateid` (stamping `machine-id` on the
     *   clone and all descendants) wrapped in `<div class="group-single">`.
     * - Re-appends an existing row only if its index doesn't match the
     *   expected order (avoids spurious disconnect/reconnect).
     * - Activates the first `<x-machinetab>` if none is `active="true"`.
     * - Clears `disableDeleteWhenDisconnect` 500 ms later.
     */
    _buildItems() {
      if (this._content == null) return;

      let templateid = this.element.getAttribute('templateid');
      if (templateid == null || templateid === '') return; // no template → nothing to render

      // 1. Cleanup: remove rows whose machine-id is no longer in the list.
      //    Mark surviving rows' descendants as disableDeleteWhenDisconnect so
      //    a subsequent re-append doesn't destroy their per-machine state.
      let idsSet = new Set(this._machineIdsArray.map(id => String(id).trim()));
      this._content.querySelectorAll('.group-single').forEach(row => {
        let mid = String(row.getAttribute('machine-id') || '').trim();
        if (!idsSet.has(mid)) {
          row.remove();
        } else {
          row.querySelectorAll('*').forEach(el => el.classList.add('disableDeleteWhenDisconnect'));
        }
      });

      // 2. Empty list → display message and bail.
      if (this._machineIdsArray.length === 0) {
        this.displayError(this.getTranslation('groupArray.noMachine', 'No machine in selection'));
        return;
      }
      this.removeError();

      // 3. For each id in order: reuse if present (re-append only if wrong
      //    index), otherwise clone the template and append a new row.
      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let singleid = String(this._machineIdsArray[i]).trim();
        let row = this._content.querySelector('.group-single[machine-id="' + singleid + '"]');
        if (row != null) {
          // Re-append only if not at expected position. querySelectorAll is
          // re-queried each iteration to reflect appendChild side-effects.
          let groupSingles = this._content.querySelectorAll('.group-single');
          if (groupSingles[i] !== row) {
            this._content.appendChild(row);
          }
        } else {
          let source = document.getElementById(templateid);
          if (source == null) {
            console.warn('x-machinetabnav: template id="' + templateid + '" not found');
            continue;
          }
          let clone = source.cloneNode(true);
          clone.removeAttribute('id');
          clone.setAttribute('machine-id', singleid);
          clone.querySelectorAll('*').forEach(d => d.setAttribute('machine-id', singleid));

          let li = document.createElement('div');
          li.className = 'group-single';
          li.setAttribute('machine-id', singleid);
          li.appendChild(clone);
          this._content.appendChild(li);
        }
      }

      // 4. Activate the first x-machinetab if none is active.
      let tabs = this._content.querySelectorAll('x-machinetab');
      if (tabs.length > 0) {
        let hasActive = false;
        tabs.forEach(t => { if (t.getAttribute('active') === 'true') hasActive = true; });
        if (!hasActive) tabs[0].setAttribute('active', 'true');
      }

      // 5. Mark single-machine selections so the host page can collapse the
      //    surrounding tab list (no point showing a one-row picker).
      this.element.classList.toggle('single-machine',
        this._machineIdsArray.length === 1);

      // 6. Clear the disableDeleteWhenDisconnect markers shortly after, once
      //    any pending move has had time to settle.
      setTimeout(this._removeDisable.bind(this), 500);
    }

    _removeDisable() {
      if (this._content == null) return;
      this._content.querySelectorAll('.disableDeleteWhenDisconnect').forEach(el => {
        el.classList.remove('disableDeleteWhenDisconnect');
      });
    }

  }

  pulseComponent.registerElement('x-machinetabnav', MachineTabNavComponent, ['machine-context', 'group', 'machine', 'templateid']);
})();
