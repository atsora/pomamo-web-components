// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-defaultpie/x-defaultpie');
require('x-cycleprogresspie/x-cycleprogresspie');
require('x-partproductionstatuspie/x-partproductionstatuspie');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MachinePie');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/CycleProgress');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/OperationProductionMachiningStatus');
