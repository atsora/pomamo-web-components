// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-runningdialog
 * @requires module:pulseComponent
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

  /**
   * `<x-runningdialog>` — dialog body that renders the running-view of one
   * group.
   *
   * Builds a header with `x-periodtoolbar` (period-context
   * `"runningdialog"`) and an `x-clock`, then a tile with
   * `x-datetimegraduation` and an `x-grouplist` whose `templateid` points
   * at a hidden template containing `x-machinedisplay`,
   * `x-reasonbutton`, `x-productionmachiningstatus`,
   * `x-lastworkinformation`, `x-lastshift`, `x-currentcncvalue`,
   * `x-barstack` (period-context `"runningdialog"`,
   * motion-context `"motion_machine"`), `x-motionpercentage` and
   * `x-motiontime`.
   *
   * @element x-runningdialog
   * @attr {string} group (required) group id
   * @extends pulseComponent.PulseInitializedComponent
   */
  class RunningDialogComponent extends pulseComponent.PulseInitializedComponent {
    constructor (...args) {
      const self = super(...args);
      return self;
    }

    initialize () {
      this.element.replaceChildren();

      let groupId = this.element.getAttribute('group');

      // Hidden template cloned by x-grouplist for each machine in the group.
      let hiddenTemplate = document.createElement('div');
      hiddenTemplate.innerHTML = '\
<div class="one_machine_cell" id="boxtocloneRunningDialog"> \
  <div class="div-machine"> \
    <x-machinedisplay></x-machinedisplay> \
    <div class="div-current"> \
      <div class="div-current-left"> \
        <x-reasonbutton></x-reasonbutton> \
      </div> \
      <div class="div-current-right"> \
        <x-productionmachiningstatus bar-style="false"></x-productionmachiningstatus> \
        <x-lastworkinformation></x-lastworkinformation> \
        <x-lastshift></x-lastshift> \
        <x-currentcncvalue></x-currentcncvalue> \
      </div> \
    </div> \
  </div> \
  <x-barstack period-context="runningdialog" motion-context="motion_machine" auto-min-height></x-barstack> \
  <div class="div-percent"> \
    <x-motionpercentage motion-context="motion_machine" period-context="runningdialog"></x-motionpercentage> \
    <x-motiontime motion-context="motion_machine" period-context="runningdialog"></x-motiontime> \
  </div> \
</div>';
      let hiddenWrapper = document.createElement('div');
      hiddenWrapper.className = 'hidden-content';
      hiddenWrapper.appendChild(hiddenTemplate.firstElementChild);

      // Header: period toolbar + clock (same pattern as running page)
      let header = document.createElement('div');
      header.innerHTML = '\
<div class="running-header"> \
  <x-periodtoolbar period-context="runningdialog"></x-periodtoolbar> \
  <div class="div-datetime"> \
    <label class="label-current"><x-tr key="content.currentColon" default="Current:"></x-tr></label> \
    <x-clock display-seconds="false"></x-clock> \
  </div> \
</div>';

      // Main tile: datetime graduation + grouplist (1 column, group-scoped)
      let tile = document.createElement('div');
      tile.innerHTML = '\
<div class="tile"> \
  <x-datetimegraduation period-context="runningdialog"></x-datetimegraduation> \
  <x-grouplist templateid="boxtocloneRunningDialog" no-rotation donotwarngroupreload="true" group="' + groupId + '"></x-grouplist> \
</div>';

      this.element.appendChild(hiddenWrapper);
      this.element.appendChild(header.firstElementChild);
      this.element.appendChild(tile.firstElementChild);

      // Apply currentdisplay visibility toggles (same logic as running page)
      let addProductionMachining = pulseConfig.getBool('currentdisplay.displayjobshiftpartcount', false);
      let displayJob = pulseConfig.getBool('currentdisplay.displayjob', true);
      let displayShift = pulseConfig.getBool('currentdisplay.displayshift', true);
      let displayCNCValue = pulseConfig.getBool('currentdisplay.displaycncvalue', true);

      let productionStatus = this.element.querySelector('x-productionmachiningstatus');
      if (productionStatus) productionStatus.style.display = addProductionMachining ? '' : 'none';
      let jobInfo = this.element.querySelector('x-lastworkinformation');
      if (jobInfo) jobInfo.style.display = displayJob ? '' : 'none';
      let shift = this.element.querySelector('x-lastshift');
      if (shift) shift.style.display = displayShift ? '' : 'none';
      let cncValue = this.element.querySelector('x-currentcncvalue');
      if (cncValue) cncValue.style.display = displayCNCValue ? '' : 'none';

      this.switchToNextContext();
    }

    displayError (message) { }
    removeError () { }
    onConfigChange (event) { }
  }

  pulseComponent.registerElement('x-runningdialog', RunningDialogComponent);
})();
