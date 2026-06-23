// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-stopperiods/x-stopperiods';
// x-stopperiods auto-creates x-stopclassification when autocreate-stopclassification is set
import 'x-stopclassification/x-stopclassification';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');

// Endpoint for x-stopperiods itself
import '@atsora/pomamo-web-service-simulation/scripts/CurrentReason';
// Endpoints needed by x-stopclassification (auto-created)
import '@atsora/pomamo-web-service-simulation/scripts/ReasonSelection';
import '@atsora/pomamo-web-service-simulation/scripts/SaveReason';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots';
import '@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate';
import '@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision';

// Wrapped in a function: an ESM module body can't use a top-level `return`
// (the early-exit guard below) the way the old CommonJS module wrapper allowed.
function attachEventLog () {
  var log = document.getElementById('event-log');
  if (!log) return;
  var lines = [];
  document.body.addEventListener('stopperiods-range', function (e) {
    var src = e.target.id || e.target.tagName;
    var range = e.detail && e.detail.range;
    lines.push('[' + new Date().toLocaleTimeString() + '] ' + src + ' → range=' + (range || '(none)'));
    log.textContent = lines.join('\n');
  });
}

if (document.readyState !== 'loading') {
  attachEventLog();
} else {
  document.addEventListener('DOMContentLoaded', attachEventLog);
}
