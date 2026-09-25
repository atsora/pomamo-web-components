// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-runningdialog/x-runningdialog';

import * as pulseConfig from 'pulseConfig';
import * as pulseDetailsPopup from 'pulsecomponent-detailspopup';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/MachinesFromGroups';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/CurrentReason';
import '@atsora/pomamo-web-service-simulation/scripts/OperationProductionMachiningStatus';
import '@atsora/pomamo-web-service-simulation/scripts/GetLastWorkInformationV3';
import '@atsora/pomamo-web-service-simulation/scripts/GetListOfOperationSlotV2';
import '@atsora/pomamo-web-service-simulation/scripts/GetLastShift';
import '@atsora/pomamo-web-service-simulation/scripts/CncValueCurrent';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonColorSlots';
import '@atsora/pomamo-web-service-simulation/scripts/ProductionStateColorSlots';
import '@atsora/pomamo-web-service-simulation/scripts/OperationSlots';
import '@atsora/pomamo-web-service-simulation/scripts/GetRangeAround';
import '@atsora/pomamo-web-service-simulation/scripts/RangeAround';
import '@atsora/pomamo-web-service-simulation/scripts/TimeCurrentRange';

function load () {
  document.querySelectorAll('button[data-group]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      pulseDetailsPopup.openRunningDialog(btn.getAttribute('data-group'));
    });
  });
}

window.onload = load;
