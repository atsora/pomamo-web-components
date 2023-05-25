// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-lastworkinformation/x-lastworkinformation');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetLastWorkInformationV3');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetListOfOperationSlotV2');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');