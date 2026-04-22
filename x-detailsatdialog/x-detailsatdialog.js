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
var pulseRange = require('pulseRange');

require('x-machinedisplay/x-machinedisplay');
require('x-datetimerange/x-datetimerange');
require('x-datetimegraduation/x-datetimegraduation');
require('x-reasonslotbar/x-reasonslotbar');
require('x-bartimeselection/x-bartimeselection');
require('x-cncalarmbar/x-cncalarmbar');
require('x-redstacklightbar/x-redstacklightbar');

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

      let barHeight = 30;
      let xReasonBar = pulseUtility.createjQueryElementWithAttribute('x-reasonslotbar', {
        'machine-id': machineid,
        'period-context': 'details',
        'height': barHeight,
        'range': fullRange.toString(d => d.toISOString()),
        'showoverwriterequired': false
      });
      let middlebar = $('<div></div>').addClass('pulse-bar-div').append(xReasonBar);

      let configArray = pulseConfig.getArray('showcoloredbar.showdetails');
      if (configArray.length == 0) {
        console.warn('No details defined');
      }
      else {
        for (let iConfig = 0; iConfig < configArray.length; iConfig++) {
          if (configArray[iConfig] == 'x-cncalarmbar') {
            middlebar.append(pulseUtility.createjQueryElementWithAttribute('x-cncalarmbar', {
              'machine-id': machineid,
              'period-context': 'details',
              'range': fullRange.toString(d => d.toISOString())
            }));
          }
          else if (configArray[iConfig] == 'x-redstacklightbar') {
            middlebar.append(pulseUtility.createjQueryElementWithAttribute('x-redstacklightbar', {
              'machine-id': machineid,
              'period-context': 'details',
              'range': fullRange.toString(d => d.toISOString())
            }));
          }
          else {
            content.append(pulseUtility.createjQueryElementWithAttribute(configArray[iConfig], {
              'machine-id': machineid,
              'when': whenIso,
              'datetime-context': 'details',
              'range': fullRange.toString(d => d.toISOString()),
              'period-context': 'details'
            }));
          }
        }
      }

      let xSelBar = pulseUtility.createjQueryElementWithAttribute('x-bartimeselection', {
        'height': barHeight,
        'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString(),
        'period-context': 'details',
        'datetime-context': 'details',
        'when': whenIso
      });
      middlebar.append(xSelBar);
      title.append(xGraduation).append(middlebar);

      this.switchToNextContext();
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-detailsatdialog', DetailsAtDialogComponent);
})();
