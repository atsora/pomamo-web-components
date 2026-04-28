// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-grouplist
 * @requires module:pulseComponent
 *
 * Stateless renderer driven by the `x-machineselection` source of truth.
 * Listens to two events:
 *   - `machineListChanged` (global) — emitted by x-machineselection with the resolved machine
 *      ids; the component clones its `templateid` per machine into a single-column list.
 *   - `updateVisibleMachines` (page context) — emitted by the rotation engine in common_page;
 *      the component shows/hides items and exposes `--visible-count` as a CSS custom property
 *      so page CSS can compute row heights (e.g. calc(100% / var(--visible-count))).
 *
 * Attributes:
 *   templateid           - id of the element to clone per machine (default `'boxtoclone'`)
 *   forcestaticlist      - if `'true'`, disables rotation engine integration (sidebar use)
 *   no-rotation          - if present, disables rotation engine integration
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var state = require('state');
var eventBus = require('eventBus');

(function () {

  class GroupComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._machineIdsArray = [];

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

    /** Returns true if this instance should NOT connect to the rotation engine */
    _isStandalone() {
      if (this.element.hasAttribute('no-rotation')) return true;
      let forceStatic = this.getConfigOrAttribute('forcestaticlist', 'false');
      return (forceStatic === 'true' || forceStatic === true);
    }

    /** Reconcile the DOM with the given machine id list (idempotent). */
    _buildItems(ids, isNetworkError) {
      this._machineIdsArray = (ids || []).map(s => String(s).trim()).filter(s => s !== '');

      let boxtocloneid = this.element.getAttribute('templateid') || 'boxtoclone';

      // Remove machines no longer in list
      let self = this;
      $(this.element).find('.group-single').each(function () {
        let machineId = String($(this).attr('machine-id')).trim();
        let found = self._machineIdsArray.some(id => id === machineId);
        if (!found) {
          $(this).remove();
        } else {
          $(this).find('*').addClass('disableDeleteWhenDisconnect');
        }
      });

      if (this._machineIdsArray.length === 0) {
        let msg = isNetworkError
          ? this.getTranslation('serverUnreachable', 'Server unreachable')
          : this.getTranslation('groupArray.noMachine', 'No machine in selection');
        this.displayError(msg);
        return;
      }
      this.removeError();

      // Add new / reuse existing items, preserving order
      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let singleid = this._machineIdsArray[i];
        let li;

        let machineRow = $(this._content).find(".group-single[machine-id='" + singleid + "']");
        if (machineRow.length != 0) {
          li = machineRow[0];
        } else {
          let copy = pulseUtility.cloneWithNewMachineId(boxtocloneid, singleid);
          li = $('<div></div>').addClass('group-single');
          li.attr('machine-id', singleid);
          li.append(copy);
        }
        $(this._content).append(li);
      }

      // Activate first machinetab if none active
      let $tabs = $(this._content).find('x-machinetab');
      if ($tabs && $tabs.length > 0) {
        let $activeTab = $tabs.filter('[active="true"]');
        if ($activeTab.length === 0) {
          $tabs[0].setAttribute('active', 'true');
        }
      }

      setTimeout(this._removeDisable.bind(this), 500);
    }

    _removeDisable() {
      $(this.element).find('.disableDeleteWhenDisconnect')
        .removeClass('disableDeleteWhenDisconnect');
    }

    /**
     * Source-of-truth callback: x-machineselection has resolved a new list of machine ids.
     */
    onMachineListChanged(event) {
      let ids = (event.target && event.target.ids) || event.ids || [];
      let isNetworkError = !!((event.target && event.target.error) || event.error);
      this._buildItems(ids, isNetworkError);
    }

    /**
     * Rotation engine callback: shows/hides items based on `visibleIds`.
     * Also exposes `--visible-count` for CSS height calculations.
     */
    onUpdateVisibility(event) {
      if (this._isStandalone()) return;

      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;
      let visibleStrIds = visibleIds.map(id => String(id).trim());

      this.element.style.setProperty('--visible-count', visibleStrIds.length);

      $(this._content).find('.group-single').each(function () {
        let el = $(this);
        let id = String(el.attr('machine-id')).trim();
        if (visibleStrIds.includes(id)) {
          el.show();
        } else {
          el.hide();
        }
      });
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

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr === 'templateid') {
        this.start();
      }
    }

    initialize() {
      this.addClass('pulse-bigdisplay');
      $(this.element).empty();

      this._content = $('<div></div>').addClass('group-main');
      $(this.element).addClass('group').append(this._content);

      // Loader DOM kept (hidden) for parity with the historical structure.
      let loader = $('<div></div>').addClass('pulse-loader')
        .html(this.getTranslation('loadingDots', 'Loading...')).hide();
      $(this._content).append($('<div></div>').addClass('pulse-loader-div').append(loader));

      this._messageSpan = $('<span></span>').addClass('pulse-message').html('');
      this._messageDiv = $('<div></div>').addClass('pulse-message-div').append(this._messageSpan);
      $(this._content).append(this._messageDiv);

      // Connect to source of truth (x-machineselection)
      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this, 'machineListChanged', this.onMachineListChanged.bind(this));
      }

      // Connect to rotation engine (unless standalone)
      if (!this._isStandalone() && eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility);
      }

      // Late-arrival sync: if x-machineselection already resolved before we initialized,
      // pull the current ids synchronously to render immediately (no flicker).
      try {
        let machineSel = document.querySelector('x-machineselection');
        if (machineSel && typeof machineSel.isReady === 'function' && machineSel.isReady()) {
          let initIds = machineSel.getResolvedMachineIds();
          if (initIds && initIds.length > 0) {
            this._buildItems(initIds);
          }
        }
      } catch (e) { /* no machineselection on this page */ }

      this.switchToNextContext();
    }

    clearInitialization() {
      $(this.element).empty();
      this.removeError();
      this._messageSpan = undefined;
      this._content = undefined;
      super.clearInitialization();
    }

    validateParameters() {
      // No validation: source of truth drives state. Render placeholder until events arrive.
      this.switchToNextContext();
    }

    displayError(message) {
      $(this._messageSpan).html(message);
      if (this._messageDiv) this._messageDiv.addClass('force-visibility');
    }

    removeError() {
      $(this._messageSpan).html('');
      if (this._messageDiv) this._messageDiv.removeClass('force-visibility');
    }

    get refreshRate() {
      return 1000 * 60 * 60; // 1 hr — unused; _runAlternateGetData short-circuits AJAX
    }

    /**
     * Stateless: no AJAX. Render is driven by `machineListChanged` events.
     * Short-circuits the framework's data-fetch lifecycle.
     */
    _runAlternateGetData() {
      this.switchToContext('Loaded');
      return true;
    }
  }

  pulseComponent.registerElement('x-grouplist', GroupComponent, ['templateid', 'no-rotation']);
})();
