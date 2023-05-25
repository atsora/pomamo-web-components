// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-workexplorer/x-workexplorer');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/WorkNew');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/WorkRead');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/WorkRelation');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/WorkStructure');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/WorkUpdate');

//# sourceMappingURL=workexplorer.js.map

