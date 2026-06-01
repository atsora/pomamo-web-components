// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-detailsatdialog
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
var pulseRange = require('pulseRange');

require('x-machinedisplay/x-machinedisplay');
require('x-datetimerange/x-datetimerange');
require('x-datetimegraduation/x-datetimegraduation');
require('x-barstack/x-barstack');

(function () {

  /**
   * `<x-detailsatdialog>` — dialog body that renders the "details at" view for
   * one machine at a specific instant.
   *
   * Builds a header (`x-machinedisplay`, formatted timestamp, `x-datetimerange`),
   * a graduation strip (`x-datetimegraduation`) and a `x-barstack` over the
   * given range, all wired to the `details` event-bus context. The scrollable
   * area is populated from the `showcoloredbar.showdetails` config array (list
   * of `x-detailed*` tag names); bar-only entries like `x-cncalarmbar` and
   * `x-redstacklightbar` are turned into per-context `showcoloredbar` flags
   * consumed by `x-barstack` instead of being appended directly.
   *
   * @element x-detailsatdialog
   * @attr {number} machine-id  machine id
   * @attr {string} when        ISO click datetime forwarded to `x-detailed*` children
   * @attr {string} range       ISO datetime range `begin;end` of the surrounding period
   * @extends pulseComponent.PulseInitializedComponent
   */
  class DetailsAtDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      return self;
    }

    initialize () {
      this.element.replaceChildren();

      let machineid = this.element.getAttribute('machine-id');
      let whenIso = this.element.getAttribute('when');
      let rangeStr = this.element.getAttribute('range');

      let fullRange = pulseRange.createDateRangeFromString(rangeStr);

      let title = document.createElement('div');
      title.className = 'detailsatdialog-title';
      let content = document.createElement('div');
      content.className = 'detailsatdialog-content';

      let xMachine = pulseUtility.createElementWithAttribute('x-machinedisplay', {
        'machine-id': machineid
      });

      let tmpDateRange = pulseRange.createDateRangeDefaultInclusivity(whenIso, whenIso);
      let atDisplay = pulseUtility.displayDateRange(tmpDateRange, true);
      let spanAt = document.createElement('span');
      spanAt.className = 'detailsatdialog-subtitle';
      spanAt.innerHTML = atDisplay;

      let xPeriodBar = pulseUtility.createElementWithAttribute('x-datetimerange', {
        'period-context': 'details',
        'range': fullRange.toString(d => d.toISOString()),
        'datetime-context': 'details',
        'when': whenIso
      });
      title.appendChild(xMachine);
      title.appendChild(spanAt);
      title.appendChild(xPeriodBar);
      this.element.appendChild(title);
      this.element.appendChild(content);

      // Graduation + bars — appended after title is in DOM for correct width
      let xGraduation = pulseUtility.createElementWithAttribute('x-datetimegraduation', {
        'period-context': 'details',
        'range': fullRange.toString(d => d.toISOString())
      });

      let configArray = pulseConfig.getArray('showcoloredbar.showdetails');
      if (configArray.length == 0) {
        console.warn('No details defined');
      }

      // Wire the legacy `showcoloredbar.showdetails` array to the per-context
      // flags read by x-barstack. The dialog must only render the main reason
      // bar plus the cncalarm/redstacklight/timeselection overlays — never the
      // thin info bars (shift/machinestate/observationstate/cycle/operation/
      // isofile) nor the below bars (cncvalue/highlightperiods) inherited from
      // the role or general scope. Pin every flag at the rolespages level so
      // it takes precedence over any role-wide override.
      if (typeof PULSE_DEFAULT_CONFIG !== 'undefined') {
        const role = pulseLogin.getRole();
        if (role) {
          PULSE_DEFAULT_CONFIG.rolespages = PULSE_DEFAULT_CONFIG.rolespages || {};
          PULSE_DEFAULT_CONFIG.rolespages[role] = PULSE_DEFAULT_CONFIG.rolespages[role] || {};
          PULSE_DEFAULT_CONFIG.rolespages[role].details = PULSE_DEFAULT_CONFIG.rolespages[role].details || {};
          PULSE_DEFAULT_CONFIG.rolespages[role].details.showcoloredbar = Object.assign(
            PULSE_DEFAULT_CONFIG.rolespages[role].details.showcoloredbar || {},
            {
              shift: false,
              machinestate: false,
              observationstate: false,
              cycle: false,
              operation: false,
              isofile: false,
              cncalarm: (configArray.indexOf('x-cncalarmbar') >= 0),
              redstacklight: (configArray.indexOf('x-redstacklightbar') >= 0),
              timeselection: true,
              cncvalue: false,
              highlightperiods: false,
              running: false
            }
          );
        }
      }

      for (let iConfig = 0; iConfig < configArray.length; iConfig++) {
        const tag = configArray[iConfig];
        if (tag === 'x-cncalarmbar' || tag === 'x-redstacklightbar') continue;
        content.appendChild(pulseUtility.createElementWithAttribute(tag, {
          'machine-id': machineid,
          'when': whenIso,
          'datetime-context': 'details',
          'range': fullRange.toString(d => d.toISOString()),
          'period-context': 'details'
        }));
      }

      let barHeight = 30;
      let xBarstack = pulseUtility.createElementWithAttribute('x-barstack', {
        'machine-id': machineid,
        'period-context': 'details',
        'main-bar': 'reason',
        'range': fullRange.toString(d => d.toISOString()),
        'when': whenIso,
        'datetime-context': 'details',
        'mainbar-showoverwriterequired': 'false'
      });
      let middlebar = document.createElement('div');
      middlebar.className = 'pulse-bar-div';
      middlebar.style.height = barHeight + 'px';
      middlebar.appendChild(xBarstack);
      title.appendChild(xGraduation);
      title.appendChild(middlebar);

      this.switchToNextContext();
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-detailsatdialog', DetailsAtDialogComponent);
})();
