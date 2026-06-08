// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-loginchangepasswordbutton/x-loginchangepasswordbutton');

var pulseConfig = require('pulseConfig');
var pulseUtility = require('pulseUtility');

pulseConfig.setGlobal('path', 'http://localhost:8082/');
// The button hides itself unless changepasswordallowed != 'false'
// AND a non-dev/support login cookie is set.
pulseConfig.setGlobal('loginchangepasswordbutton.changepasswordallowed', 'true');
pulseUtility.createCookie('PulseLogin', 'Bruce', 1);

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ChangePassword');