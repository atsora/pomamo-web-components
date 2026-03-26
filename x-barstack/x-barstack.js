/*
 * Copyright (C) 2025 Atsora Solutions
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// x-barstack
// Layout component: reads pulseConfig with its period-context to determine
// which bars to create. Forwards context attributes to children.
// No 'bars' or 'hidden-bars' attribute needed — config drives everything.
//
// Attributes:
//   period-context  — page context used for config lookup + forwarded to bars
//   motion-context  — forwarded to motion-sensitive bars only
//   machine-context — forwarded to all bars (optional)
//   machine-id      — forwarded to all bars
//   main-bar        — static override: 'reason' | 'running' | 'production'

var pulseConfig = require('pulseConfig');

require('x-shiftslotbar/x-shiftslotbar');
require('x-machinestatebar/x-machinestatebar');
require('x-observationstatebar/x-observationstatebar');
require('x-operationcyclebar/x-operationcyclebar');
require('x-operationslotbar/x-operationslotbar');
require('x-isofileslotbar/x-isofileslotbar');
require('x-productionstatebar/x-productionstatebar');
require('x-reasonslotbar/x-reasonslotbar');
require('x-cncalarmbar/x-cncalarmbar');
require('x-redstacklightbar/x-redstacklightbar');
require('x-runningslotbar/x-runningslotbar');
require('x-cncvaluebar/x-cncvaluebar');

(function () {
  'use strict';

  if (customElements.get('x-barstack')) return;

  // Thin informational bars — each controlled by its own config key
  const THIN_BAR_DEFS = [
    { tag: 'x-shiftslotbar',        key: 'showcoloredbar.shift' },
    { tag: 'x-machinestatebar',     key: 'showcoloredbar.machinestate' },
    { tag: 'x-observationstatebar', key: 'showcoloredbar.observationstate' },
    { tag: 'x-operationcyclebar',   key: 'showcoloredbar.cycle' },
    { tag: 'x-operationslotbar',    key: 'showcoloredbar.operation' },
    { tag: 'x-isofileslotbar',      key: 'showcoloredbar.isofile' },
  ];

  // Overlay bars — absolutely positioned inside the main bar group
  const OVERLAY_BAR_DEFS = [
    { tag: 'x-cncalarmbar',     key: 'showcoloredbar.cncalarm' },
    { tag: 'x-redstacklightbar',key: 'showcoloredbar.redstacklight' },
  ];

  // Bars that accept motion-context
  const MOTION_BARS = new Set([
    'x-reasonslotbar',
    'x-runningslotbar',
    'x-productionstatebar',
  ]);

  customElements.define('x-barstack', class extends HTMLElement {

    static get observedAttributes() {
      return ['period-context', 'motion-context', 'machine-context', 'machine-id', 'main-bar'];
    }

    connectedCallback() {
      this._build();
    }

    attributeChangedCallback() {
      if (this.isConnected) this._build();
    }

    _createElement(tag, periodContext, motionContext, machineContext, machineId) {
      const el = document.createElement(tag);
      if (periodContext) el.setAttribute('period-context', periodContext);
      if (machineContext) el.setAttribute('machine-context', machineContext);
      if (machineId) el.setAttribute('machine-id', machineId);
      if (motionContext && MOTION_BARS.has(tag)) {
        el.setAttribute('motion-context', motionContext);
      }
      return el;
    }

    _build() {
      this.innerHTML = '';

      const periodContext = this.getAttribute('period-context');
      const motionContext = this.getAttribute('motion-context');
      const machineContext = this.getAttribute('machine-context');
      const machineId = this.getAttribute('machine-id');
      const mainBar = this.getAttribute('main-bar');

      const mk = (tag) => this._createElement(tag, periodContext, motionContext, machineContext, machineId);

      // --- Thin bars (config-driven) ---
      THIN_BAR_DEFS
        .filter(def => pulseConfig.getBool(def.key, false, periodContext))
        .forEach(def => this.appendChild(mk(def.tag)));

      // --- Main bar group ---
      const overlayTags = OVERLAY_BAR_DEFS
        .filter(def => pulseConfig.getBool(def.key, false, periodContext))
        .map(def => def.tag);
      const hasOverlay = overlayTags.length > 0;

      if (mainBar !== null) {
        // Static single-bar mode (e.g. machinedashboard with main-bar="reason")
        const tag = mainBar === 'reason' ? 'x-reasonslotbar'
                  : mainBar === 'running' ? 'x-runningslotbar'
                  : 'x-productionstatebar';
        if (hasOverlay) {
          const group = document.createElement('div');
          group.className = 'barstack-reason-group';
          group.appendChild(mk(tag));
          overlayTags.forEach(t => group.appendChild(mk(t)));
          this.appendChild(group);
        } else {
          this.appendChild(mk(tag));
        }
      } else if (pulseConfig.getBool('showcoloredbar.running', false, periodContext)) {
        // Running bar mode — single bar, no switch needed
        if (hasOverlay) {
          const group = document.createElement('div');
          group.className = 'barstack-reason-group';
          group.appendChild(mk('x-runningslotbar'));
          overlayTags.forEach(t => group.appendChild(mk(t)));
          this.appendChild(group);
        } else {
          this.appendChild(mk('x-runningslotbar'));
        }
      } else {
        // Switchable mode: always create both reason and production bars.
        // _applySwitch() controls which one is visible via display style.
        if (hasOverlay) {
          const group = document.createElement('div');
          group.className = 'barstack-reason-group';
          group.appendChild(mk('x-reasonslotbar'));
          group.appendChild(mk('x-productionstatebar'));
          overlayTags.forEach(t => group.appendChild(mk(t)));
          this.appendChild(group);
        } else {
          this.appendChild(mk('x-reasonslotbar'));
          this.appendChild(mk('x-productionstatebar'));
        }
      }

      // --- Value bar (config-driven) ---
      if (pulseConfig.getBool('showcoloredbar.cncvalue', false, periodContext)) {
        this.appendChild(mk('x-cncvaluebar'));
      }

      this._applySwitch();
    }

    /**
     * Toggle display between x-reasonslotbar and x-productionstatebar
     * without rebuilding the component. Called by the page when
     * showproductionbar config changes.
     */
    _applySwitch() {
      const periodContext = this.getAttribute('period-context');
      // main-bar attribute means a fixed single bar — nothing to switch
      if (this.getAttribute('main-bar') !== null) return;
      // running mode — nothing to switch
      if (pulseConfig.getBool('showcoloredbar.running', false, periodContext)) return;

      const showProduction = pulseConfig.getBool('showproductionbar', false, periodContext);
      const reasonBar = this.querySelector('x-reasonslotbar');
      const productionBar = this.querySelector('x-productionstatebar');
      if (reasonBar) reasonBar.style.display = showProduction ? 'none' : '';
      if (productionBar) productionBar.style.display = showProduction ? '' : 'none';
    }
  });
})();
