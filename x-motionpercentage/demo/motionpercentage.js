// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-motionpercentage/x-motionpercentage');

require('x-reasonslotbar/x-reasonslotbar');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/ReasonColorSlots');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/OperationSlots');