// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machinetab
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseService = require('pulseService');
var eventBus = require('eventBus');
var state = require('state');

require('x-machinedisplay/x-machinedisplay');
require('x-currenticonunansweredreason/x-currenticonunansweredreason');
require('x-currenticonnextstop/x-currenticonnextstop');
require('x-currenticonworkinformation/x-currenticonworkinformation');
require('x-currenticoncncalarm/x-currenticoncncalarm');

(function () {

  /**
   * `<x-machinetab>` — machine switcher tab strip, stateless renderer.
   *
   * Listens to `machineListChanged` from `x-machineselection` (single source of truth)
   * to rebuild its tab list. Renders one tab item per machine directly in the DOM
   * (no nested group renderer).
   *
   * Each item contains:
   *  - a colored mode bar (polled from `CurrentReason?MachineId=<id>`)
   *  - `x-machinedisplay` for the machine name
   *  - icon row: `x-currenticonunansweredreason`, `x-currenticonworkinformation`,
   *    `x-currenticonnextstop`, `x-currenticoncncalarm` (visibility driven by
   *    `componentsToDisplay` config)
   *
   * Clicking an item dispatches `machineIdChangeSignal` on `machine-context` so all
   * page components switch to the selected machine.
   * Responds to `machineIdChangeSignal` to sync active state when another source
   * changes the selected machine.
   * Responds to `askForMachineIdSignal` to re-broadcast the currently active id.
   *
   * Hides the `#machine-tabs-panel` panel when only one machine is present (CSS hook).
   *
   * Attributes:
   *   machine-context - event bus context for machine selection signals
   *   period-context  - (optional) forwarded to icon components
   *   status-context  - (optional) forwarded to icon components
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class MachineTabComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      self._machineIdsArray = [];
      self._dynamic = false;
      self._listContainer = undefined;
      self._activeMachineId = null;
      self._reasonTimer = null;

      return self;
    }

    get content() {
      return this._listContainer;
    }

    // Static groups transition to Loaded (no further polling after first fetch)
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

    // ─── LIFECYCLE ──────────────────────────────────────────────────────────

    initialize() {
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
        eventBus.EventBus.addEventListener(this,
          'askForMachineIdSignal',
          this.element.getAttribute('machine-context'),
          this.onAskForMachineId.bind(this));
      }

      // Connect to source of truth (x-machineselection)
      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this,
          'machineListChanged', this.onMachineListChanged.bind(this));
      }

      $(this.element).empty().addClass('group-main');
      this._listContainer = $(this.element);

      // Loader DOM kept (hidden) for parity with the historical structure.
      let loader = $('<div></div>').addClass('pulse-loader')
        .html(this.getTranslation('loadingDots', 'Loading...')).hide();
      this._listContainer.append($('<div></div>').addClass('pulse-loader-div').append(loader));

      this._messageSpan = $('<span></span>').addClass('pulse-message');
      this._messageDiv = $('<div></div>').addClass('pulse-message-div').append(this._messageSpan);
      this._listContainer.append(this._messageDiv);

      // Click delegation — one handler for all tab items
      this._listContainer.on('click', '.machinetab-machine-cell', (e) => {
        let machineId = Number($(e.currentTarget).closest('.group-single').attr('machine-id'));
        if (!isNaN(machineId)) {
          this._activateTab(machineId);
        }
      });

      // Late-arrival sync: render immediately if machineselection already resolved
      try {
        let machineSel = document.querySelector('x-machineselection');
        if (machineSel && typeof machineSel.isReady === 'function' && machineSel.isReady()) {
          let initIds = machineSel.getResolvedMachineIds();
          if (initIds && initIds.length > 0) {
            this._machineIdsArray = initIds.map(s => String(s));
            this._renderList();
          }
        }
      } catch (e) { /* no machineselection on this page */ }

      this.switchToNextContext();
    }

    clearInitialization() {
      this._stopReasonPolling();
      eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
      eventBus.EventBus.removeEventListenerBySignal(this, 'askForMachineIdSignal');
      $(this.element).empty();
      this._listContainer = undefined;
      this._messageDiv = undefined;
      this._messageSpan = undefined;
      this._machineIdsArray = [];
      this._activeMachineId = null;
      super.clearInitialization();
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal', newVal, this.onMachineIdChange.bind(this));
            eventBus.EventBus.removeEventListenerBySignal(this, 'askForMachineIdSignal');
            eventBus.EventBus.addEventListener(this, 'askForMachineIdSignal', newVal, this.onAskForMachineId.bind(this));
            $(this._listContainer).find('[machine-context]').attr('machine-context', newVal);
          }
          break;
        case 'period-context':
          if (this.isInitialized()) {
            $(this._listContainer).find('[period-context]').attr('period-context', newVal);
          }
          break;
        case 'status-context':
          if (this.isInitialized()) {
            $(this._listContainer).find('[status-context]').attr('status-context', newVal);
          }
          break;
        default:
          break;
      }
    }

    validateParameters() {
      // No validation: source of truth (x-machineselection) drives state.
      this.switchToNextContext();
    }

    displayError(message) {
      if (this._messageSpan) $(this._messageSpan).html(message);
      if (this._messageDiv) this._messageDiv.addClass('force-visibility');
    }

    removeError() {
      if (this._messageSpan) $(this._messageSpan).html('');
      if (this._messageDiv) this._messageDiv.removeClass('force-visibility');
    }

    get refreshRate() {
      return 1000 * 60 * 60; // unused; _runAlternateGetData short-circuits AJAX
    }

    /**
     * Stateless: no AJAX. Render is driven by `machineListChanged` events.
     */
    _runAlternateGetData() {
      this.switchToContext('Loaded');
      return true;
    }

    /**
     * Source-of-truth callback: x-machineselection has resolved a new list of machine ids.
     */
    onMachineListChanged(event) {
      let ids = (event.target && event.target.ids) || event.ids || [];
      let isNetworkError = !!((event.target && event.target.error) || event.error);
      if (this._listContainer) {
        if (isNetworkError) {
          this.displayError(this.getTranslation('serverUnreachable', 'Server unreachable'));
        } else {
          this.removeError();
          this._machineIdsArray = ids.map(s => String(s));
          this._renderList();
        }
      }
    }

    // ─── RENDERING ──────────────────────────────────────────────────────────

    _renderList() {
      let self = this;

      // Remove machines no longer in the list
      $(this._listContainer).find('.group-single').each(function () {
        let machineId = String($(this).attr('machine-id'));
        if (!self._machineIdsArray.some(id => String(id) === machineId)) {
          if (Number(machineId) === self._activeMachineId) {
            self._activeMachineId = null;
          }
          $(this).remove();
        }
      });

      // Show/hide #machine-tabs-panel when only one machine
      const panel = document.getElementById('machine-tabs-panel');
      if (panel) {
        if (this._machineIdsArray.length <= 1) {
          panel.classList.add('hidden-content');
        } else {
          panel.classList.remove('hidden-content');
        }
      }

      // Add missing machines
      let componentsToDisplay = pulseConfig.getArray('componentsToDisplay', []);
      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let machineId = String(this._machineIdsArray[i]);
        if ($(this._listContainer).find('.group-single[machine-id="' + machineId + '"]').length === 0) {
          $(this._listContainer).append(this._createTabItem(machineId, componentsToDisplay));
        }
      }

      // Activate first if no machine is currently active.
      // Defer one microtask: x-machineselection's synchronous early-emit fires
      // machineListChanged DURING HTML parsing, so page-level components on the
      // same machine-context may not have connected yet — dispatching now would
      // miss them and leave them stuck in "Please select a machine".
      // The microtask ensures all synchronous connectedCallback chains have run.
      if (this._activeMachineId === null && this._machineIdsArray.length > 0) {
        let firstId = Number(this._machineIdsArray[0]);
        let self = this;
        Promise.resolve().then(function () {
          if (self._activeMachineId === null) self._activateTab(firstId);
        });
      }

      this._startReasonPolling();
    }

    _createTabItem(machineId, componentsToDisplay) {
      let machineContext = this.element.getAttribute('machine-context');
      let statusContext = this.element.getAttribute('status-context');
      let periodContext = this.element.getAttribute('period-context');

      let xmachinedisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': machineId
      });
      let machineDiv = $('<div></div>').addClass('machinetab-machine').append(xmachinedisplay);

      let iconsDiv = $('<div></div>').addClass('machinetab-icons');
      let iconDefs = [
        { tag: 'x-currenticonunansweredreason', showIf: 'x-lastmachinestatus' },
        { tag: 'x-currenticonworkinformation', showIf: 'x-lastworkinformation' },
        { tag: 'x-currenticonnextstop', showIf: 'x-cycleprogressbar' },
        { tag: 'x-currenticoncncalarm', showIf: null }
      ];
      for (let def of iconDefs) {
        let attrs = { 'machine-id': machineId, 'machine-context': machineContext };
        if (statusContext) attrs['status-context'] = statusContext;
        if (periodContext) attrs['period-context'] = periodContext;
        let xicon = pulseUtility.createjQueryElementWithAttribute(def.tag, attrs);
        $(xicon).addClass('machinetab-icon');
        if (def.showIf !== null) {
          if (componentsToDisplay.indexOf(def.showIf) === -1) {
            $(xicon).hide();
          }
        } else {
          // x-currenticoncncalarm: needs coloredbar + config flag
          let hasColoredBar = componentsToDisplay.indexOf('coloredbar') !== -1
            || componentsToDisplay.indexOf('coloredbarwithpercent') !== -1;
          if (!hasColoredBar || !pulseConfig.getBool('showcoloredbar.cncalarm', false)) {
            $(xicon).hide();
          }
        }
        iconsDiv.append(xicon);
      }

      let cellDiv = $('<div></div>').addClass('machinetab-machine-cell')
        .append(machineDiv).append(iconsDiv);

      return $('<div></div>').addClass('group-single').attr('machine-id', machineId)
        .append(cellDiv);
    }

    // ─── ACTIVE STATE ────────────────────────────────────────────────────────

    _activateTab(machineId) {
      eventBus.EventBus.dispatchToContext('machineIdChangeSignal',
        this.element.getAttribute('machine-context'),
        { newMachineId: machineId });
      $('.pulse-mainarea-full').animate({ scrollTop: 0 }, 'slow');
    }

    _syncActiveClass(machineId) {
      this._activeMachineId = machineId;
      $(this._listContainer).find('.group-single').each(function () {
        let cell = $(this).find('.machinetab-machine-cell');
        if (Number($(this).attr('machine-id')) === machineId) {
          cell.addClass('active');
        } else {
          cell.removeClass('active');
        }
      });
    }

    // ─── CURRENT REASON POLLING ──────────────────────────────────────────────

    _startReasonPolling() {
      this._stopReasonPolling();
      this._fetchAllReasons();
      let interval = 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
      this._reasonTimer = setInterval(() => this._fetchAllReasons(), interval);
    }

    _stopReasonPolling() {
      if (this._reasonTimer) {
        clearInterval(this._reasonTimer);
        this._reasonTimer = null;
      }
    }

    _fetchAllReasons() {
      for (let machineId of this._machineIdsArray) {
        this._fetchReason(String(machineId));
      }
    }

    _fetchReason(machineId) {
      if (!this.path) return;
      let url = this.path + 'CurrentReason?MachineId=' + machineId;
      let container = this._listContainer;
      pulseService.runAjaxSimple(url,
        function (data) {
          if (!container) return;
          let cell = container[0].querySelector('.group-single[machine-id="' + machineId + '"] .machinetab-machine-cell');
          if (cell && data.Reason && data.Reason.Color) {
            cell.style.borderLeftColor = data.Reason.Color;
          }
        },
        null, null
      );
    }

    // ─── EVENT CALLBACKS ─────────────────────────────────────────────────────

    onMachineIdChange(event) {
      if (this._listContainer) {
        this._syncActiveClass(event.target.newMachineId);
      }
    }

    onAskForMachineId() {
      if (this._activeMachineId !== null) {
        eventBus.EventBus.dispatchToContext('requestMachineIdSignal',
          this.element.getAttribute('machine-context'),
          { machineId: this._activeMachineId });
      }
    }

  }

  pulseComponent.registerElement('x-machinetab', MachineTabComponent, ['machine-context', 'period-context', 'status-context']);
})();
