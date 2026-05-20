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
   * `<x-groupgrid>` — stateless CSS-grid renderer for a list of machines.
   *
   * Performs no AJAX of its own. Rebuilds its grid from the ids carried by
   * the global `machineListChanged` event, cloning the element identified by
   * `templateid` (default `'boxtoclone'`) once per machine into a
   * `.groupgrid-item`. Re-uses existing items and marks them with
   * `disableDeleteWhenDisconnect` during reordering so the framework keeps
   * the `_webComponent` reference alive (removed 500ms later). On the
   * `updateVisibleMachines` event (context `'PAGE'`), shows/hides items based
   * on the carried id list and exposes the visible count via the
   * `data-count` attribute on `.groupgrid-main`. Shows a "No machine in
   * selection" / "Server unreachable" message when the resolved id list is
   * empty.
   *
   * @element x-groupgrid
   * @attr {string} templateid id of the element to clone per machine (default `'boxtoclone'`)
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class GroupGridComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      self._machineIdsArray = [];
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

      // Loader DOM kept (hidden) for parity with the historical structure.
      // Cells inside each item show their own loading state — no top-level spinner.
      let loader = $('<div></div>').addClass('pulse-loader')
        .html(this.getTranslation('loadingDots', 'Loading...')).hide();
      $(this._content).append($('<div></div>').addClass('pulse-loader-div').append(loader));
      this._messageSpan = $('<span></span>').addClass('pulse-message');
      this._messageDiv = $('<div></div>').addClass('pulse-message-div').append(this._messageSpan);
      $(this._content).append(this._messageDiv);

      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this, 'machineListChanged', this.onMachineListChanged.bind(this));
      }

      if (eventBus.EventBus.addEventListener) {
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

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr === 'templateid') {
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
     * Renders all machines from `ids` into the DOM as `.groupgrid-item` divs.
     * Idempotent: removes items not in list, reuses existing items, appends new ones.
     *
     * Reordering existing items via jQuery `append` triggers the browser's
     * `disconnectedCallback` → `connectedCallback` cycle, which would null out
     * the framework's `_webComponent` reference. We mark items with the
     * `disableDeleteWhenDisconnect` class before reorder so the framework keeps
     * the reference alive (class removed after 500ms via `_removeDisable`).
     */
    _buildItems(ids, isNetworkError) {
      this._machineIdsArray = (ids || []).map(s => String(s).trim()).filter(s => s !== '');

      let container = $(this._content);
      let templateId = this.element.getAttribute('templateid') || 'boxtoclone';

      // Mark survivors before any DOM mutation, then remove items not in new list
      let self = this;
      container.find('.groupgrid-item').each(function () {
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
        $(this._content).attr('data-count', 0);
        return;
      }
      this.removeError();

      // Add or reuse items in order
      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let machineId = this._machineIdsArray[i];
        let existing = container.find(".groupgrid-item[machine-id='" + machineId + "']");
        if (existing.length > 0) {
          container.append(existing[0]);
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
     * `machineListChanged` callback: rebuild the grid from the new id list.
     */
    onMachineListChanged(event) {
      let ids = (event.target && event.target.ids) || event.ids || [];
      let isNetworkError = !!((event.target && event.target.error) || event.error);
      this._buildItems(ids, isNetworkError);
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

    validateParameters() {
      // No validation: the id list is pushed via machineListChanged.
      this.switchToNextContext();
    }

    /**
     * Stateless: no AJAX. Render is driven by `machineListChanged`.
     */
    _runAlternateGetData() {
      this.switchToContext('Loaded');
      return true;
    }

    get refreshRate() {
      return 1000 * 60 * 60; // unused
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
  }

  pulseComponent.registerElement('x-groupgrid', GroupGridComponent, ['templateid']);
})();
