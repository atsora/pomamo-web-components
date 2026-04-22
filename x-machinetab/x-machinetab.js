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
   * `<x-machinetab>` — machine switcher list, indexed on machine selection.
   *
   * Resolves the machine list from `machine` config (comma-separated ids from
   * `x-machineselection`) or via AJAX `MachinesFromGroups` when `group` is set.
   * Renders one tab item per machine directly in the DOM (no nested custom elements).
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
   * Hides the `#grouparray` panel when only one machine is present.
   * Dispatches `groupIsReloaded` after each list rebuild.
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

      $(this.element).empty().addClass('group-main');
      this._listContainer = $(this.element);

      // Click delegation — one handler for all tab items
      this._listContainer.on('click', '.machinetab-machine-cell', (e) => {
        let machineId = Number($(e.currentTarget).closest('.group-single').attr('machine-id'));
        if (!isNaN(machineId)) {
          this._activateTab(machineId);
        }
      });
      this.switchToNextContext();
    }

    clearInitialization() {
      this._stopReasonPolling();
      eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
      eventBus.EventBus.removeEventListenerBySignal(this, 'askForMachineIdSignal');
      $(this.element).empty();
      this._listContainer = undefined;
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
      let groups = this.getConfigOrAttribute('group');
      let machines = this.getConfigOrAttribute('machine');
      if ((!groups || groups === '') && (!machines || machines === '')) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines')),
          () => this.removeError());
        return;
      }
      this.switchToNextContext();
    }

    displayError(message) { }
    removeError() { }

    get refreshRate() {
      return 1000 * 60 * 60; // 1 hr for dynamic groups; static groups never reach this
    }

    // ─── MACHINE LIST RESOLUTION ────────────────────────────────────────────

    // Handles the machine-only case (no group config) without AJAX
    _runAlternateGetData() {
      let groups = this.getConfigOrAttribute('group');
      if (!pulseUtility.isNotDefined(groups) && groups !== '') {
        return false; // defer to AJAX MachinesFromGroups
      }
      this.removeError();
      this._dynamic = false;
      this._machineIdsArray = this.getConfigOrAttribute('machine').split(',');
      this._renderList();
      this.switchToContext('Loaded');
      return true;
    }

    getShortUrl() {
      return 'MachinesFromGroups?GroupIds=' + this.getConfigOrAttribute('group');
    }

    manageSuccess(data) {
      this.removeError();
      this._machineIdsArray = data.MachineIds;
      this._dynamic = data.Dynamic;
      if (this.getConfigOrAttribute('forcestaticlist') === 'true') {
        this._dynamic = false;
      }
      if (!this._dynamic) {
        this._renderList();
        this.switchToContext('Loaded');
      } else {
        super.manageSuccess(data);
      }
    }

    refresh(data) {
      this._renderList();
    }

    onConfigChange(event) {
      if (event.target.config === 'machine' || event.target.config === 'group') {
        this.start();
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

      // Show/hide #grouparray panel when only one machine
      const panel = document.getElementById('grouparray');
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

      // Activate first if no machine is currently active
      if (this._activeMachineId === null && this._machineIdsArray.length > 0) {
        this._activateTab(Number(this._machineIdsArray[0]));
      }

      eventBus.EventBus.dispatchToAll('groupIsReloaded', {
        newMachinesList: this._machineIdsArray.join(',')
      });

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
