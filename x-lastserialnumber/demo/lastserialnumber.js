// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-lastserialnumber/x-lastserialnumber');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetLastCycleWithSerialNumberV2');
//require ('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetCyclesInPeriod');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/SaveSerialNumber');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetCyclesWithWorkInformationsInPeriod');