// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-toollifemachine/x-toollifemachine');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

// To display machine 18 :
let now = new Date();
let serverDate = new Date('2050-10-08T09:45:00Z');
let diffServerTimeMinusNowMSec = serverDate.getTime() - now.getTime();
pulseConfig.setGlobal('diffServerTimeMinusNowMSec', diffServerTimeMinusNowMSec);

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ToolLivesByMachine');
