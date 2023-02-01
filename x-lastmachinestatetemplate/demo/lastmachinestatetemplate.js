// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-lastmachinestatetemplate/x-lastmachinestatetemplate');
require('x-savemachinestatetemplate/x-savemachinestatetemplate');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MachineStateTemplateSlots');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/MachineStateTemplates');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');