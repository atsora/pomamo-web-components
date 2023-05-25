// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-motiontime/x-motiontime');

require('x-reasonslotbar/x-reasonslotbar');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonColorSlots');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationSlots');