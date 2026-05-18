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

/**
 * Build a custom tag <x-detailsatdialog> used as the content of a
 * pulseCustomDialog displaying details for a machine at a specific instant.
 *
 * The content inside the scrollable area is driven by the config key
 * `showcoloredbar.showdetails` (array of x-detailed* component names).
 *
 * Attributes:
 *   machine-id - machine id
 *   when       - ISO click time (for x-bartimeselection + x-detailed*)
 *   range      - ISO full range (period-context context)
 */
(function () {

  class DetailsAtDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      return self;
    }

    initialize () {
      $(this.element).empty();

      let machineid = this.element.getAttribute('machine-id');
      let whenIso = this.element.getAttribute('when');
      let rangeStr = this.element.getAttribute('range');

      let fullRange = pulseRange.createDateRangeFromString(rangeStr);

      let title = $('<div></div>').addClass('detailsatdialog-title');
      let content = $('<div></div>').addClass('detailsatdialog-content');

      let xMachine = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': machineid
      });

      let tmpDateRange = pulseRange.createDateRangeDefaultInclusivity(whenIso, whenIso);
      let atDisplay = pulseUtility.displayDateRange(tmpDateRange, true);
      let spanAt = $('<span></span>').addClass('detailsatdialog-subtitle').html(atDisplay);

      let xPeriodBar = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
        'period-context': 'details',
        'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString(),
        'datetime-context': 'details',
        'when': whenIso
      });
      title.append(xMachine).append(spanAt).append(xPeriodBar);
      $(this.element).append(title).append(content);

      // Graduation + bars — appended after title is in DOM for correct width
      let xGraduation = pulseUtility.createjQueryElementWithAttribute('x-datetimegraduation', {
        'period-context': 'details',
        'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString()
      });

      let configArray = pulseConfig.getArray('showcoloredbar.showdetails');
      if (configArray.length == 0) {
        console.warn('No details defined');
      }

      // Wire the legacy `showcoloredbar.showdetails` array to the per-context
      // flags read by x-barstack. Only the bar tags (cncalarm/redstacklight)
      // need translation; x-detailed* components are appended to `content`.
      // Write at rolespages level so the flags take precedence over role-wide
      // showcoloredbar overrides (e.g. roles.dev which disables cncalarm).
      if (typeof PULSE_DEFAULT_CONFIG !== 'undefined') {
        const role = pulseLogin.getRole();
        if (role) {
          PULSE_DEFAULT_CONFIG.rolespages = PULSE_DEFAULT_CONFIG.rolespages || {};
          PULSE_DEFAULT_CONFIG.rolespages[role] = PULSE_DEFAULT_CONFIG.rolespages[role] || {};
          PULSE_DEFAULT_CONFIG.rolespages[role].details = PULSE_DEFAULT_CONFIG.rolespages[role].details || {};
          PULSE_DEFAULT_CONFIG.rolespages[role].details.showcoloredbar = PULSE_DEFAULT_CONFIG.rolespages[role].details.showcoloredbar || {};
          PULSE_DEFAULT_CONFIG.rolespages[role].details.showcoloredbar.cncalarm = (configArray.indexOf('x-cncalarmbar') >= 0);
          PULSE_DEFAULT_CONFIG.rolespages[role].details.showcoloredbar.redstacklight = (configArray.indexOf('x-redstacklightbar') >= 0);
        }
      }

      for (let iConfig = 0; iConfig < configArray.length; iConfig++) {
        const tag = configArray[iConfig];
        if (tag === 'x-cncalarmbar' || tag === 'x-redstacklightbar') continue;
        content.append(pulseUtility.createjQueryElementWithAttribute(tag, {
          'machine-id': machineid,
          'when': whenIso,
          'datetime-context': 'details',
          'range': fullRange.toString(d => d.toISOString()),
          'period-context': 'details'
        }));
      }

      let barHeight = 30;
      let xBarstack = pulseUtility.createjQueryElementWithAttribute('x-barstack', {
        'machine-id': machineid,
        'period-context': 'details',
        'main-bar': 'reason',
        'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString(),
        'when': whenIso,
        'datetime-context': 'details',
        'mainbar-showoverwriterequired': 'false'
      });
      let middlebar = $('<div></div>').addClass('pulse-bar-div')
        .css('height', barHeight + 'px')
        .append(xBarstack);
      title.append(xGraduation).append(middlebar);

      this.switchToNextContext();
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-detailsatdialog', DetailsAtDialogComponent);
})();
