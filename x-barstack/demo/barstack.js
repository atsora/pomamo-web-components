// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import './barstack_config';
import 'x-barstack/x-barstack';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/ReasonColorSlots';
import '@atsora/pomamo-web-service-simulation/scripts/RunningSlots';
import '@atsora/pomamo-web-service-simulation/scripts/ProductionStateColorSlots';
import '@atsora/pomamo-web-service-simulation/scripts/GetListOfShiftSlot';
import '@atsora/pomamo-web-service-simulation/scripts/MachineStateTemplateSlots';
import '@atsora/pomamo-web-service-simulation/scripts/ObservationStateSlots';
import '@atsora/pomamo-web-service-simulation/scripts/OperationCycleSlots';
import '@atsora/pomamo-web-service-simulation/scripts/OperationSlots';
import '@atsora/pomamo-web-service-simulation/scripts/IsoFileSlots';
import '@atsora/pomamo-web-service-simulation/scripts/CncAlarmColor';
import '@atsora/pomamo-web-service-simulation/scripts/RedStackLight';
import '@atsora/pomamo-web-service-simulation/scripts/CncValueColor';

function load () {
  let checkbox = document.getElementById('show-production');
  checkbox.addEventListener('change', function () {
    PULSE_DEFAULT_CONFIG.pages.barstack_switch.showproductionbar = checkbox.checked;
    // Any observed attribute change rebuilds the stack
    let barstack = document.getElementById('switch-barstack');
    barstack.setAttribute('period-context', barstack.getAttribute('period-context'));
  });
}

window.onload = load;
