// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-grouparray/x-grouparray');
require('x-machinedisplay/x-machinedisplay');
require('x-reasonbutton/x-reasonbutton');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/CurrentReason');