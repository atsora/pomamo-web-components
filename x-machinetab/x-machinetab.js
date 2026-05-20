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
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');
var state = require('state');

require('x-machinedisplay/x-machinedisplay');
require('x-currenticonunansweredreason/x-currenticonunansweredreason');
require('x-currenticonnextstop/x-currenticonnextstop');
require('x-currenticonworkinformation/x-currenticonworkinformation');
require('x-currenticoncncalarm/x-currenticoncncalarm');

(function () {

  /**
   * `<x-machinetab>` — stateless machine-switcher tab strip.
   *
   * Performs no AJAX of its own for the tab list: it rebuilds from the ids
   * carried by the global `machineListChanged` event. Each tab is a
   * `.group-single` containing a `.machinetab-machine-cell` made of an
   * `x-machinedisplay` and an icon row (`x-currenticonunansweredreason`,
   * `x-currenticonworkinformation`, `x-currenticonnextstop`,
   * `x-currenticoncncalarm`); icon visibility is driven by the
   * `componentsToDisplay` config (and `showcoloredbar.cncalarm` for the
   * CNC-alarm icon). On its own timer (`refreshingRate.currentRefreshSeconds`,
   * default 10 s), polls `CurrentReason?MachineId=<id>` per tab and tints
   * the cell's left border with `data.Reason.Color`. Clicking a cell — or
   * the mobile prev/next chevrons (wrap-around) — dispatches
   * `machineIdChangeSignal` on `machine-context`; the same event from other
   * sources syncs the `.active` class. Responds to `askForMachineIdSignal`
   * by re-broadcasting `requestMachineIdSignal` with the active id. Adds
   * the `hidden-content` class on `#machine-tabs-panel` when at most one
   * machine is present.
   *
   * @element x-machinetab
   * @attr {string} machine-context (required) event-bus context for machine signals
   * @attr {string} period-context  forwarded to icon children
   * @attr {string} status-context  forwarded to icon children
   * @fires machineIdChangeSignal   `{ newMachineId: number }` — on `machine-context`, on click / chevron nav
   * @fires requestMachineIdSignal  `{ machineId: number }` — on `machine-context`, replies to `askForMachineIdSignal`
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

      // Click delegation — one handler for all tab items.
      // No-op when the clicked cell is already the active machine.
      this._listContainer.on('click', '.machinetab-machine-cell', (e) => {
        let machineId = Number($(e.currentTarget).closest('.group-single').attr('machine-id'));
        if (!isNaN(machineId) && machineId !== this._activeMachineId) {
          this._activateTab(machineId);
        }
      });

      // Mobile chevrons: prev/next navigation between machines. Hidden on desktop
      // via CSS; visible only inside @all-phones-media. SVG icons are inlined
      // from images/previous.svg and images/next.svg (same pattern as periodtoolbar).
      this._chevronPrev = $('<div></div>')
        .addClass('machinetab-chevron machinetab-chevron-prev')
        .attr('role', 'button')
        .attr('tabindex', '0')
        .attr('aria-label', this.getTranslation('previousMachine', 'Previous machine'));
      this._chevronNext = $('<div></div>')
        .addClass('machinetab-chevron machinetab-chevron-next')
        .attr('role', 'button')
        .attr('tabindex', '0')
        .attr('aria-label', this.getTranslation('nextMachine', 'Next machine'));
      this._chevronPrev.on('click', (e) => {
        e.stopPropagation();
        this._navigateAdjacent(-1);
      });
      this._chevronNext.on('click', (e) => {
        e.stopPropagation();
        this._navigateAdjacent(1);
      });
      this._listContainer.append(this._chevronPrev).append(this._chevronNext);
      pulseSvg.inlineBackgroundSvg(this._chevronPrev);
      pulseSvg.inlineBackgroundSvg(this._chevronNext);

      // Late-arrival sync: pull the already-resolved id list from an
      // x-machineselection sibling if it emitted machineListChanged before us.
      try {
        let machineSel = document.querySelector('x-machineselection');
        if (machineSel && typeof machineSel.isReady === 'function' && machineSel.isReady()) {
          let initIds = machineSel.getResolvedMachineIds();
          if (initIds && initIds.length > 0) {
            this._machineIdsArray = initIds.map(s => String(s));
            this._renderList();
          }
        }
      } catch (e) { /* no x-machineselection on the page */ }

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
      this._chevronPrev = undefined;
      this._chevronNext = undefined;
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
      // No validation: the id list is pushed via machineListChanged.
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
     * Stateless: no AJAX. Render is driven by `machineListChanged`.
     */
    _runAlternateGetData() {
      this.switchToContext('Loaded');
      return true;
    }

    /**
     * `machineListChanged` callback: rebuild the tab strip from the new id list.
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
          $(this).addClass('active');
          cell.addClass('active');
        } else {
          $(this).removeClass('active');
          cell.removeClass('active');
        }
      });
    }

    // Navigate to the prev (-1) or next (+1) machine in the list, with wrap-around.
    // Used by the mobile chevron buttons.
    _navigateAdjacent(direction) {
      if (!this._machineIdsArray || this._machineIdsArray.length <= 1) return;
      let len = this._machineIdsArray.length;
      let currentIdx = this._machineIdsArray.findIndex(
        id => Number(id) === this._activeMachineId);
      if (currentIdx === -1) currentIdx = 0;
      let newIdx = (currentIdx + direction + len) % len;
      let newId = Number(this._machineIdsArray[newIdx]);
      this._activateTab(newId);
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
