// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-machineselector/x-machineselector');
require('x-machinedisplay/x-machinedisplay');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MachineGroups');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetMachine');
