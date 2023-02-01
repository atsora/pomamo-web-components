// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

'use strict';
require('x-currentcncvalue/x-currentcncvalue');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/CncValueCurrent');

//# sourceMappingURL=currentcncvalue.js.map

