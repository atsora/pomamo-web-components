// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-reasonslotlist/x-reasonslotlist');

//require('demo/scripts/savereason');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonColorSlots');

//# sourceMappingURL=reasonslotlist.js.map

