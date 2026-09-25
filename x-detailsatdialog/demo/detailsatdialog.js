// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import './detailsatdialog_config';
import 'x-detailsatdialog/x-detailsatdialog';
import 'x-detailedreasonat/x-detailedreasonat';
import 'x-detailedcncvaluesat/x-detailedcncvaluesat';
import 'x-detailedalarmsat/x-detailedalarmsat';

import * as pulseConfig from 'pulseConfig';
import * as pulseUtility from 'pulseUtility';
import pulseCustomDialog from 'pulseCustomDialog';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonColorSlots';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots';
import '@atsora/pomamo-web-service-simulation/scripts/CncValueAt';
import '@atsora/pomamo-web-service-simulation/scripts/CncAlarmAt';
import '@atsora/pomamo-web-service-simulation/scripts/CncAlarmColor';

// Today at the given UTC hour. The demo template shifts the dates of every
// inserted x-* element to today, so keep all of them on the current UTC day.
function todayIso (hour) {
  let d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Same dialog as pulseDetailsPopup.openDetails (click on a bar with click="details")
function openDetailsDialog (machineId) {
  let dialog = pulseUtility.createElementWithAttribute('x-detailsatdialog', {
    'machine-id': machineId,
    'when': todayIso(10),
    'range': '[' + todayIso(6) + ';' + todayIso(18) + ')'
  });
  pulseCustomDialog.openDialog(dialog, {
    title: 'Details',
    okButton: 'hidden',
    autoClose: true,
    autoDelete: true,
    bigSize: true
  });
}

function load () {
  document.querySelectorAll('button[data-machine]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openDetailsDialog(btn.getAttribute('data-machine'));
    });
  });
}

window.onload = load;
