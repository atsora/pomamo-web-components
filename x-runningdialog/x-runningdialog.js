// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-runningdialog
 * @requires module:pulseComponent
 *
 * Mirrors the running page layout inside a dialog for a single group.
 * All bars are config-driven via `x-barstack` with `period-context="runningdialog"`.
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');

require('x-grouplist/x-grouplist');
require('x-machinedisplay/x-machinedisplay');
require('x-productionmachiningstatus/x-productionmachiningstatus');
require('x-lastworkinformation/x-lastworkinformation');
require('x-currentcncvalue/x-currentcncvalue');
require('x-lastshift/x-lastshift');
require('x-datetimegraduation/x-datetimegraduation');
require('x-barstack/x-barstack');
require('x-motionpercentage/x-motionpercentage');
require('x-motiontime/x-motiontime');
require('x-periodtoolbar/x-periodtoolbar');
require('x-reasonbutton/x-reasonbutton');
require('x-clock/x-clock');
require('x-tr/x-tr');

(function () {

  class RunningDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      return self;
    }

    initialize () {
      $(this.element).empty();

      let groupId = this.element.getAttribute('group');

      // Hidden template cloned by x-grouparray for each machine in the group.
      let hiddenTemplate = $('\
<div class="one_machine_cell" id="boxtocloneRunningDialog"> \
  <div class="div-machine"> \
    <x-machinedisplay></x-machinedisplay> \
    <div class="div-current"> \
      <div class="div-current-left"> \
        <x-reasonbutton></x-reasonbutton> \
      </div> \
      <div class="div-current-right"> \
        <x-productionmachiningstatus bar-style="false"></x-productionmachiningstatus> \
        <x-lastworkinformation cancel-bar-style="true"></x-lastworkinformation> \
        <x-lastshift></x-lastshift> \
        <x-currentcncvalue></x-currentcncvalue> \
      </div> \
    </div> \
  </div> \
  <x-barstack period-context="runningdialog" motion-context="motion_machine"></x-barstack> \
  <div class="div-percent"> \
    <x-motionpercentage motion-context="motion_machine" period-context="runningdialog"></x-motionpercentage> \
    <x-motiontime motion-context="motion_machine" period-context="runningdialog"></x-motiontime> \
  </div> \
</div>');
      let hiddenWrapper = $('<div class="hidden-content"></div>').append(hiddenTemplate);

      // Header: period toolbar + clock (same pattern as running page)
      let header = $('\
<div class="running-header"> \
  <x-periodtoolbar period-context="runningdialog"></x-periodtoolbar> \
  <div class="div-datetime"> \
    <label class="label-current"><x-tr key="content.currentColon" default="Current:"></x-tr></label> \
    <x-clock display-seconds="false"></x-clock> \
  </div> \
</div>');

      // Main tile: datetime graduation + grouparray (1 column, group-scoped)
      let tile = $('\
<div class="tile"> \
  <x-datetimegraduation period-context="runningdialog"></x-datetimegraduation> \
  <x-grouplist templateid="boxtocloneRunningDialog" no-rotation donotwarngroupreload="true" group="' + groupId + '"></x-grouplist> \
</div>');

      $(this.element).append(hiddenWrapper).append(header).append(tile);

      // Apply currentdisplay visibility toggles (same logic as running page)
      let addProductionMachining = pulseConfig.getBool('currentdisplay.displayjobshiftpartcount', false);
      let displayJob = pulseConfig.getBool('currentdisplay.displayjob', true);
      let displayShift = pulseConfig.getBool('currentdisplay.displayshift', true);
      let displayCNCValue = pulseConfig.getBool('currentdisplay.displaycncvalue', true);

      let $el = $(this.element);
      $el.find('x-productionmachiningstatus').toggle(addProductionMachining);
      $el.find('x-lastworkinformation').toggle(displayJob);
      $el.find('x-lastshift').toggle(displayShift);
      $el.find('x-currentcncvalue').toggle(displayCNCValue);

      this.switchToNextContext();
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-runningdialog', RunningDialogComponent);
})();
