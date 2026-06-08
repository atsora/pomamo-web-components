// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var pulseConfig = require('pulseConfig');

require('x-scrapstatus/x-scrapstatus');

pulseConfig.setGlobal('path', 'http://localhost:8082/');

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetLastMachineStatusV2');
