// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-machineselection/x-machineselection');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
// To Replace with Machine/Groups -> rename ?
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MachineGroups');
//require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MachinesFromGroups');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetMachine');
