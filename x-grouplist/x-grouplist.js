// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-grouplist
 * @requires module:pulseComponent
 *
 * Renders a list (single column) of machine items connected to the rotation engine.
 * The rotation engine controls which items are visible via the 'updateVisibleMachines' event.
 * On each visibility update, --visible-count is set as a CSS custom property so the page
 * CSS can compute row heights (e.g. calc(100% / var(--visible-count))).
 *
 * Attributes:
 *   templateid         - id of the element to clone per machine
 *   machine            - comma-separated list of machine ids
 *   group              - group id (resolved via AJAX)
 *   forcestaticlist    - if 'true', disables rotation engine integration (sidebar use)
 *   no-rotation        - if present, disables rotation engine integration
 *   donotwarngroupreload - if 'true', suppresses groupIsReloaded dispatch
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var state = require('state');
var eventBus = require('eventBus');

(function () {

  class GroupComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._dynamic = false;
      self._waitingForEngine = false;
      self._suppressNextGroupReloaded = false;
      self._machineIdsArray = [];

      self.methods = {
        'getMachinesList': self.getMachinesList
      };

      return self;
    }

    // Overload to always refresh value
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

    /** Build / update the DOM list of machine items */
    _buildMachineList() {
      let boxtocloneid = this.element.getAttribute('templateid') || 'boxtoclone';

      // Remove machines no longer in list
      let self = this;
      $(this.element).find('.group-single').each(function () {
        let machineId = String($(this).attr('machine-id')).trim();
        let found = self._machineIdsArray.some(id => String(id).trim() === machineId);
        if (!found) {
          $(this).remove();
        } else {
          $(this).find('*').addClass('disableDeleteWhenDisconnect');
        }
      });

      // Add new / reuse existing items
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

      // Machine tab activation
      let $tabs = $(this._content).find('x-machinetab');
      if ($tabs && $tabs.length > 0) {
        let $activeTab = $tabs.filter('[active="true"]');
        if ($activeTab.length === 0) {
          $tabs[0].setAttribute('active', 'true');
        }
      }

      // Delayed cleanup of disableDeleteWhenDisconnect
      setTimeout(this._removeDisable.bind(this), 500);

      // Warn other listeners (field-legend, machine selection…)
      // Suppressed when manageSuccess already dispatched it for the group AJAX path
      if (!this._suppressNextGroupReloaded &&
          'false' == this.getConfigOrAttribute('donotwarngroupreload', 'false')) {
        eventBus.EventBus.dispatchToAll('groupIsReloaded', {
          newMachinesList: this._machineIdsArray.join(',')
        });
      }
      this._suppressNextGroupReloaded = false;

      if (!this._isStandalone()) {
        eventBus.EventBus.dispatchToAll('groupGridRendered', {});
      }
    }

    _removeDisable() {
      $(this.element).find('.disableDeleteWhenDisconnect')
        .removeClass('disableDeleteWhenDisconnect');
    }

    /**
     * Called by the rotation engine with the list of machine ids to display.
     * Updates visibility of group-single items and sets --visible-count CSS property.
     */
    onUpdateVisibility(event) {
      if (this._isStandalone()) return;

      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;

      let visibleStrIds = visibleIds.map(id => String(id).trim());

      // Expose visible count for CSS height calculations
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
      switch (attr) {
        case 'templateid':
        case 'group':
        case 'machine':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('pulse-bigdisplay');
      $(this.element).empty();

      this._content = $('<div></div>').addClass('group-main');
      $(this.element).addClass('group').append(this._content);

      let loader = $('<div></div>').addClass('pulse-loader')
        .html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      $(this._content).append($('<div></div>').addClass('pulse-loader-div').append(loader));

      this._messageSpan = $('<span></span>').addClass('pulse-message').html('');
      $(this._content).append($('<div></div>').addClass('pulse-message-div').append(this._messageSpan));

      // Connect to rotation engine (unless standalone)
      if (!this._isStandalone() && eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility);
      }

      this.switchToNextContext();
    }

    clearInitialization() {
      $(this.element).empty();
      this.removeError();
      this._messageSpan = undefined;
      this._content = undefined;
      super.clearInitialization();
    }

    // No component-level validation: page-level getMissingConfigs handles user-facing errors
    validateParameters() {
      this.switchToNextContext();
    }

    displayError(message) {
      $(this._messageSpan).html(message);
      $('.grouparray-dependant').addClass('grouparray-in-error');
    }

    removeError() {
      $(this._messageSpan).html('');
      $('.grouparray-dependant').removeClass('grouparray-in-error');
    }

    get refreshRate() {
      if (this.element.hasAttribute('refreshrate')) {
        return 1000 * this.element.getAttribute('refreshrate');
      }
      return 1000 * 60 * 60; // 1 hr
    }

    _runAlternateGetData() {
      if (this._waitingForEngine) return true;

      // Priority: 'machine' config (set by common_page or URL params)
      let machinesStr = pulseConfig.getString('machine');
      if (machinesStr && machinesStr.trim() !== '') {
        this._dynamic = false;
        this._machineIdsArray = machinesStr.split(',').map(s => s.trim()).filter(s => s !== '');
        this._buildMachineList();
        this.switchToContext('Loaded');
        return true;
      }

      // Group: trigger AJAX
      let groups = this.getConfigOrAttribute('group');
      if (groups && groups.trim() !== '') {
        return false;
      }

      // Nothing configured
      this._machineIdsArray = [];
      this._buildMachineList();
      this.switchToContext('Loaded');
      return true;
    }

    getShortUrl() {
      let groups = this.getConfigOrAttribute('group');
      return 'MachinesFromGroups?GroupIds=' + groups;
    }

    refresh(data) {
      this._buildMachineList();
    }

    manageSuccess(data) {
      this.removeError();

      this._machineIdsArray = data.MachineIds || [];
      this._dynamic = data.Dynamic || false;

      if (this.getConfigOrAttribute('forcestaticlist') == 'true' ||
        this.getConfigOrAttribute('forcestaticlist') == true) {
        this._dynamic = false;
      }

      if (!this._isStandalone() && pulseConfig.getString('group')) {
        // Group loaded via AJAX — delegate machine list resolution to engine
        this._waitingForEngine = true;
        eventBus.EventBus.dispatchToAll('groupIsReloaded', {
          newMachinesList: this._machineIdsArray.join(',')
        });
        this._suppressNextGroupReloaded = true;
        // EventBus is synchronous: onConfigChange may have already processed the
        // configChangeEvent('machine') and rebuilt the list (_waitingForEngine === false).
        // Only clear+rebuild if the engine has NOT yet responded (async path).
        if (this._waitingForEngine) {
          this._machineIdsArray = [];
          this._buildMachineList();
        }
      } else {
        this._buildMachineList();
      }

      this.switchToContext('Loaded');
    }

    onConfigChange(event) {
      if (event.target.config === 'machine') {
        this._waitingForEngine = false;
        this.start();
      } else if (event.target.config === 'group') {
        // Only restart when a new group is being set, not when the engine clears it
        if (pulseConfig.getString('group') !== '') {
          this._waitingForEngine = false;
          this.start();
        }
      }
    }
  }

  pulseComponent.registerElement('x-grouplist', GroupComponent, ['templateid', 'group', 'machine', 'no-rotation']);
})();
