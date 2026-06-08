// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-stopperiods/x-stopperiods');
// x-stopperiods auto-creates x-stopclassification when autocreate-stopclassification is set
require('x-stopclassification/x-stopclassification');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

// Endpoint for x-stopperiods itself
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/CurrentReason');
// Endpoints needed by x-stopclassification (auto-created)
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');

if (document.readyState !== 'loading') {
  var log = document.getElementById('event-log');
  if (!log) return;
  var lines = [];
  document.body.addEventListener('stopperiods-range', function (e) {
    var src = e.target.id || e.target.tagName;
    var range = e.detail && e.detail.range;
    lines.push('[' + new Date().toLocaleTimeString() + '] ' + src + ' → range=' + (range || '(none)'));
    log.textContent = lines.join('\n');
  });
} else {
  document.addEventListener('DOMContentLoaded', function () {
    var log = document.getElementById('event-log');
    if (!log) return;
    var lines = [];
    document.body.addEventListener('stopperiods-range', function (e) {
      var src = e.target.id || e.target.tagName;
      var range = e.detail && e.detail.range;
      lines.push('[' + new Date().toLocaleTimeString() + '] ' + src + ' → range=' + (range || '(none)'));
      log.textContent = lines.join('\n');
    });
  });
}
