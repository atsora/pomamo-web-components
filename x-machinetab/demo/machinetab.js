// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-machinetab/x-machinetab');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
// Machine name
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetMachine');
// Color on the left
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/CurrentReason');
// Icons
// TO ADD : 
//require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MissingWorkInformation');
//require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/CncAlarm');
//require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/CycleProgress');
//require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/ReasonUnanswered')