// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-machinetab/x-machinetab');
require('x-periodmanager/x-periodmanager');

var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

pulseConfig.setGlobal('path', 'http://localhost:8082/');

// x-machinetab no longer takes a `machine-id` attribute: the tab list is
// rebuilt from the global `machineListChanged` event. We dispatch it below
// with the canonical scenario machines (1..4) so the demo shows a real strip.
// Each tab also embeds icon children driven by these endpoints — enable them
// via componentsToDisplay so the icons aren't hidden by default.
pulseConfig.setGlobal('componentsToDisplay', [
  'x-lastmachinestatus',      // unanswered-reason icon
  'x-lastworkinformation',    // missing-work-info icon
  'x-cycleprogressbar'        // next-stop icon
]);

// Mocks
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/_helpers');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/scenario');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/CurrentReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonUnanswered');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/MissingWorkInformation');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/CycleProgress');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/CncAlarm');

$(function () {
  var ids = SCENARIO.MACHINES.map(function (m) { return String(m.id); });

  // Late-dispatch so x-machinetab's initialize() has run and is subscribed.
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('machineListChanged', { ids: ids, source: 'user' });
  }, 0);

  // Surface clicks so we can see machine-context wiring is working.
  eventBus.EventBus.addEventListener({ element: document.body },
    'machineIdChangeSignal', 'demo',
    function (event) {
      var newId = event.target && event.target.newMachineId;
      $('#selected-machine').text(newId != null ? String(newId) : '—');
    });

  $('#dispatch-empty').click(function () {
    eventBus.EventBus.dispatchToAll('machineListChanged', { ids: [], source: 'user' });
  });
  $('#dispatch-all').click(function () {
    eventBus.EventBus.dispatchToAll('machineListChanged', { ids: ids, source: 'user' });
  });
  $('#dispatch-error').click(function () {
    eventBus.EventBus.dispatchToAll('machineListChanged', { ids: [], error: 'network' });
  });
});
