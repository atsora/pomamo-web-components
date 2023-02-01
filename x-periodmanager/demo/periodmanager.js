// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-periodmanager/x-periodmanager');
require('x-datetimegraduation/x-datetimegraduation');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/RangeAround');