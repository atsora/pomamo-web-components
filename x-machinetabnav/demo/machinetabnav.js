// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-machinetabnav/x-machinetabnav');

var eventBus = require('eventBus');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

function dispatchIds(ids) {
  eventBus.EventBus.dispatchToAll('machineListChanged', { ids: ids });
}

function load() {
  // Seed the list so the component knows what to cycle through.
  setTimeout(function () { dispatchIds(['1', '2', '3', '4']); }, 100);

  // Listen for selection changes from the chevrons.
  eventBus.EventBus.addEventListener({}, 'machineIdChangeSignal', 'demo', function (event) {
    var span = document.getElementById('selected-machine');
    if (span) span.textContent = String(event.target.newMachineId);
  });
  eventBus.EventBus.addEventListener({}, 'machineIdChangeSignal', 'demo2', function (event) {
    var span = document.getElementById('selected-machine-2');
    if (span) span.textContent = String(event.target.newMachineId);
  });

  var btnAll = document.getElementById('dispatch-all');
  if (btnAll) btnAll.addEventListener('click', function () { dispatchIds(['1', '2', '3', '4']); });

  var btnEmpty = document.getElementById('dispatch-empty');
  if (btnEmpty) btnEmpty.addEventListener('click', function () { dispatchIds([]); });
}

window.onload = load;
