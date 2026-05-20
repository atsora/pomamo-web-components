/*
 * Copyright (C) 2025 Atsora Solutions
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * `<x-barstack>` — layout container that builds a vertical stack of bar
 * components driven by `pulseConfig` keys (`showcoloredbar.*`, `showproductionbar`,
 * `showcoloredbar.running`) read under the current `period-context`. Each context
 * attribute is forwarded to the children that accept it.
 *
 * Stack order: thin info bars (shift / machinestate / observationstate /
 * operationcycle / operationslot / isofileslot) on top, then a main-bar group
 * (reason or running or production, plus overlay bars `cncalarm` /
 * `redstacklight` / `timeselection` wrapped together when any overlay is
 * enabled), then the below-bars (`cncvalue`, `highlightperiods`).
 *
 * Two main-bar modes: with `main-bar` set, a single fixed bar is rendered;
 * without it, both `x-reasonslotbar` and `x-productionstatebar` are always
 * created and `_applySwitch()` toggles visibility based on `showproductionbar`.
 *
 * `mainbar-*` attributes on `<x-barstack>` are forwarded to the main bar with
 * the prefix stripped (e.g. `mainbar-click-to-change-reason` →
 * `click-to-change-reason`).
 *
 * @element x-barstack
 * @attr {string} period-context   config-lookup key; forwarded to every bar
 * @attr {string} motion-context   forwarded only to motion-sensitive bars (reason/running/production)
 * @attr {string} machine-context  forwarded to every bar (optional)
 * @attr {string} machine-id       forwarded to every bar
 * @attr {string} main-bar         static override: `'reason'` | `'running'` | `'production'`
 * @attr {string} range            forwarded to every child
 * @attr {string} when             forwarded only to `<x-bartimeselection>`
 * @attr {string} datetime-context forwarded only to `<x-bartimeselection>`
 * @attr {string} mainbar-*        forwarded to the main bar with the `mainbar-` prefix stripped
 * @extends HTMLElement
 */

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
require('x-bartimeselection/x-bartimeselection');
require('x-runningslotbar/x-runningslotbar');
require('x-cncvaluebar/x-cncvaluebar');
require('x-highlightperiodsbar/x-highlightperiodsbar');

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
    { tag: 'x-bartimeselection',key: 'showcoloredbar.timeselection' },
  ];

  // Below-bars — small ratio bars rendered under the main bar group
  const BELOW_BAR_DEFS = [
    { tag: 'x-cncvaluebar',         key: 'showcoloredbar.cncvalue' },
    { tag: 'x-highlightperiodsbar', key: 'showcoloredbar.highlightperiods' },
  ];

  // Bars that accept motion-context
  const MOTION_BARS = new Set([
    'x-reasonslotbar',
    'x-runningslotbar',
    'x-productionstatebar',
  ]);

  // Bars that accept when + datetime-context (time-selection overlay)
  const TIME_SELECTION_BARS = new Set([
    'x-bartimeselection',
  ]);

  customElements.define('x-barstack', class extends HTMLElement {

    static get observedAttributes() {
      return ['period-context', 'motion-context', 'machine-context', 'machine-id', 'main-bar',
        'range', 'when', 'datetime-context'];
    }

    connectedCallback() {
      this._build();
    }

    attributeChangedCallback() {
      if (this.isConnected) this._build();
    }

    _createElement(tag, ctx) {
      const el = document.createElement(tag);
      if (ctx.periodContext) el.setAttribute('period-context', ctx.periodContext);
      if (ctx.machineContext) el.setAttribute('machine-context', ctx.machineContext);
      if (ctx.machineId) el.setAttribute('machine-id', ctx.machineId);
      if (ctx.motionContext && MOTION_BARS.has(tag)) {
        el.setAttribute('motion-context', ctx.motionContext);
      }
      if (ctx.range) el.setAttribute('range', ctx.range);
      if (TIME_SELECTION_BARS.has(tag)) {
        if (ctx.when) el.setAttribute('when', ctx.when);
        if (ctx.datetimeContext) el.setAttribute('datetime-context', ctx.datetimeContext);
      }
      return el;
    }

    // Forward attributes starting with `mainbar-` from x-barstack to the main bar element,
    // stripping the prefix (e.g. mainbar-click-to-change-reason → click-to-change-reason).
    _applyMainbarAttrs(el) {
      for (const attr of this.attributes) {
        if (attr.name.startsWith('mainbar-')) {
          el.setAttribute(attr.name.slice('mainbar-'.length), attr.value);
        }
      }
    }

    _build() {
      this.innerHTML = '';

      const ctx = {
        periodContext: this.getAttribute('period-context'),
        motionContext: this.getAttribute('motion-context'),
        machineContext: this.getAttribute('machine-context'),
        machineId: this.getAttribute('machine-id'),
        range: this.getAttribute('range'),
        when: this.getAttribute('when'),
        datetimeContext: this.getAttribute('datetime-context'),
      };
      const periodContext = ctx.periodContext;
      const mainBar = this.getAttribute('main-bar');

      const mk = (tag) => this._createElement(tag, ctx);
      const mkMain = (tag) => {
        const el = this._createElement(tag, ctx);
        this._applyMainbarAttrs(el);
        return el;
      };

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
        // Static single-bar mode
        const tag = mainBar === 'reason' ? 'x-reasonslotbar'
                  : mainBar === 'running' ? 'x-runningslotbar'
                  : 'x-productionstatebar';
        if (hasOverlay) {
          const group = document.createElement('div');
          group.className = 'barstack-reason-group';
          group.appendChild(mkMain(tag));
          overlayTags.forEach(t => group.appendChild(mk(t)));
          this.appendChild(group);
        } else {
          this.appendChild(mkMain(tag));
        }
      } else if (pulseConfig.getBool('showcoloredbar.running', false, periodContext)) {
        // Running bar mode — single bar, no switch needed
        if (hasOverlay) {
          const group = document.createElement('div');
          group.className = 'barstack-reason-group';
          group.appendChild(mkMain('x-runningslotbar'));
          overlayTags.forEach(t => group.appendChild(mk(t)));
          this.appendChild(group);
        } else {
          this.appendChild(mkMain('x-runningslotbar'));
        }
      } else {
        // Switchable mode: always create both reason and production bars.
        // _applySwitch() controls which one is visible via display style.
        if (hasOverlay) {
          const group = document.createElement('div');
          group.className = 'barstack-reason-group';
          group.appendChild(mkMain('x-reasonslotbar'));
          group.appendChild(mkMain('x-productionstatebar'));
          overlayTags.forEach(t => group.appendChild(mk(t)));
          this.appendChild(group);
        } else {
          this.appendChild(mkMain('x-reasonslotbar'));
          this.appendChild(mkMain('x-productionstatebar'));
        }
      }

      // --- Below bars (config-driven, e.g. cncvaluebar, highlightperiodsbar) ---
      BELOW_BAR_DEFS
        .filter(def => pulseConfig.getBool(def.key, false, periodContext))
        .forEach(def => this.appendChild(mk(def.tag)));

      this._applySwitch();
    }

    /**
     * Toggles display between `x-reasonslotbar` and `x-productionstatebar`
     * without rebuilding, based on the current `showproductionbar` config.
     * No-op when `main-bar` is set or when running mode is active.
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
