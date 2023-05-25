// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-detailedoperationcycleat/x-detailedoperationcycleat');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationCycleAt');