// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-production/x-production');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationPartProductionRange');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationProductionMachiningStatus');
