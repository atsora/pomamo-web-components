// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-lastmachinestatus/x-lastmachinestatus');
//require('demo/script/savereason');
require('x-reasonslotlist/demo/reasonslotlist');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetLastMachineStatusV2');