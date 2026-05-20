// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
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
   * `<x-grouplist>` — stateless single-column renderer for a list of machines.
   *
   * Performs no AJAX of its own. Rebuilds its list from the ids carried by the
   * global `machineListChanged` event, cloning the element identified by
   * `templateid` (default `'boxtoclone'`) once per machine into a
   * `.group-single` row. Re-uses existing rows and marks them with
   * `disableDeleteWhenDisconnect` during reordering so the framework keeps the
   * `_webComponent` reference alive (removed 500ms later); activates the first
   * `x-machinetab` if none is active. On the `updateVisibleMachines` event
   * (context `'PAGE'`), shows/hides rows based on the carried id list and sets
   * the `--visible-count` CSS custom property so styles can compute row
   * heights. Listening to `updateVisibleMachines` is skipped when
   * `forcestaticlist === 'true'` or the `no-rotation` attribute is present.
   * Shows a "No machine in selection" / "Server unreachable" message when the
   * resolved id list is empty.
   *
   * @element x-grouplist
   * @attr {string}  templateid      id of the element to clone per machine (default `'boxtoclone'`)
   * @attr {boolean} forcestaticlist `'true'` opts out of the `updateVisibleMachines` listener
   * @attr {boolean} no-rotation     presence opts out of the `updateVisibleMachines` listener
   * @method getMachinesList         current machine id list, comma-separated
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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

    /** True when the `updateVisibleMachines` listener should be skipped. */
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
     * `machineListChanged` callback: rebuild the list from the new id list.
     */
    onMachineListChanged(event) {
      let ids = (event.target && event.target.ids) || event.ids || [];
      let isNetworkError = !!((event.target && event.target.error) || event.error);
      this._buildItems(ids, isNetworkError);
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

      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this, 'machineListChanged', this.onMachineListChanged.bind(this));
      }

      if (!this._isStandalone() && eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility);
      }

      // Late-arrival sync: pull the already-resolved id list from an
      // x-machineselection sibling if it emitted machineListChanged before us.
      try {
        let machineSel = document.querySelector('x-machineselection');
        if (machineSel && typeof machineSel.isReady === 'function' && machineSel.isReady()) {
          let initIds = machineSel.getResolvedMachineIds();
          if (initIds && initIds.length > 0) {
            this._buildItems(initIds);
          }
        }
      } catch (e) { /* no x-machineselection on the page */ }

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
      // No validation: the id list is pushed via machineListChanged.
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
     * Stateless: no AJAX. Render is driven by `machineListChanged`.
     * Short-circuits the framework's data-fetch lifecycle.
     */
    _runAlternateGetData() {
      this.switchToContext('Loaded');
      return true;
    }
  }

  pulseComponent.registerElement('x-grouplist', GroupComponent, ['templateid', 'no-rotation']);
})();
