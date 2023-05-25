// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-reasonslotbar/x-reasonslotbar');
require('x-periodtoolbar/x-periodtoolbar');

//require('demo/scripts/savereason');
require('x-reasonslotlist/demo/reasonslotlist');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonColorSlots');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetRangeAround');

