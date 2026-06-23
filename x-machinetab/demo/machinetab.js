// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-machinetab/x-machinetab';
import 'x-periodmanager/x-periodmanager';

import * as pulseConfig from 'pulseConfig';
import * as eventBus from 'eventBus';

pulseConfig.setGlobal('path', 'http://localhost:8082/');

// Each tab embeds icon children driven by these endpoints — enable them via
// componentsToDisplay so the icons aren't hidden by default.
pulseConfig.setGlobal('componentsToDisplay', [
  'x-lastmachinestatus',      // unanswered-reason icon
  'x-lastworkinformation',    // missing-work-info icon
  'x-cycleprogressbar'        // next-stop icon
]);

// Mocks
import '@atsora/pomamo-web-service-simulation/scripts/_helpers';
import '@atsora/pomamo-web-service-simulation/scripts/scenario';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/CurrentReason';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonUnanswered';
import '@atsora/pomamo-web-service-simulation/scripts/MissingWorkInformation';
import '@atsora/pomamo-web-service-simulation/scripts/CycleProgress';
import '@atsora/pomamo-web-service-simulation/scripts/CncAlarm';

if (document.readyState !== 'loading') {
  setupDemo();
} else {
  document.addEventListener('DOMContentLoaded', setupDemo);
}

function setupDemo() {
  // Surface clicks so the wiring on machine-context is observable.
  eventBus.EventBus.addEventListener({ element: document.body },
    'machineIdChangeSignal', 'demo',
    function (event) {
      var newId = event.target && event.target.newMachineId;
      let selectedMachineEl = document.getElementById('selected-machine');
      if (selectedMachineEl) {
        selectedMachineEl.textContent = newId != null ? String(newId) : '—';
      }
    });
}
