// Copyright (C) 2009-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-savereason/x-savereason');

var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
pulseLogin.storeRole('operator');

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');
