// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import * as pulseConfig from 'pulseConfig';

import 'x-scrapstatus/x-scrapstatus';

pulseConfig.setGlobal('path', 'http://localhost:8082/');

import '@atsora/pomamo-web-service-simulation/scripts/ScrapCurrentShift';
// Scrap declaration dialog (button) and the machine in its title
import '@atsora/pomamo-web-service-simulation/scripts/ScrapReasons';
import '@atsora/pomamo-web-service-simulation/scripts/ScrapAt';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';

// Machine of the machine context, as x-machinetabnav does in the dashboards
import * as eventBus from 'eventBus';
setTimeout(() => eventBus.EventBus.dispatchToContext('machineIdChangeSignal', 'demo-machine', { newMachineId: 2 }), 1000);
