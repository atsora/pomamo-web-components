// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-reasonsubdetails/x-reasonsubdetails';

import * as pulseConfig from 'pulseConfig';
import * as pulseUtility from 'pulseUtility';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/ReasonAllAt';

// x-reasonsubdetails is headless: it is created at the click position,
// requests Reason/AllAt/Get once and opens the popup
function openSubDetails (machineId, e) {
  let container = document.getElementById('subdetails-container');
  let showScore = document.getElementById('show-score').checked;
  PULSE_DEFAULT_CONFIG.general.reasonsubdetails = { showReasonScore: showScore };

  let when = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  container.replaceChildren(pulseUtility.createElementWithAttribute('x-reasonsubdetails', {
    'machine-id': machineId,
    'when': when,
    'clientX': e.clientX,
    'clientY': e.clientY
  }));
}

function load () {
  document.querySelectorAll('button[data-machine]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      openSubDetails(btn.getAttribute('data-machine'), e);
    });
  });
}

window.onload = load;
