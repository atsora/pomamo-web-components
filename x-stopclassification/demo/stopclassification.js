// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-stopclassification/x-stopclassification');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots');


// FROM Save MST
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/MachineStateTemplates');
// TO ADD - 2016 12
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');

function load () {

}

window.onload = load;
