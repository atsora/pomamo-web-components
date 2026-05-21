// Copyright (C) 2009-2026 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-machineselection/x-machineselection');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/MachineGroups');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/MachinesFromGroups');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
