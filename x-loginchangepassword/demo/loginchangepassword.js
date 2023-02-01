// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-loginchangepassword/x-loginchangepassword');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/ChangePassword');