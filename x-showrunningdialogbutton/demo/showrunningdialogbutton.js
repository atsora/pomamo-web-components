// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import './showrunningdialogbutton_config';
import 'x-showrunningdialogbutton/x-showrunningdialogbutton';
import 'x-runningdialog/x-runningdialog';

import * as pulseConfig from 'pulseConfig';
import * as eventBus from 'eventBus';
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
  let checkbox = document.getElementById('show-running-button');
  checkbox.addEventListener('change', function () {
    PULSE_DEFAULT_CONFIG.general.showRunningButton = checkbox.checked;
    eventBus.EventBus.dispatchToAll('configChangeEvent', { config: 'showRunningButton' });
  });
}

window.onload = load;
