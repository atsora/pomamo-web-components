// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-loginchangepasswordbutton/x-loginchangepasswordbutton';

import * as pulseConfig from 'pulseConfig';
import * as pulseUtility from 'pulseUtility';

pulseConfig.setGlobal('path', 'http://localhost:8082/');
// The button hides itself unless changepasswordallowed != 'false'
// AND a non-dev/support login cookie is set.
pulseConfig.setGlobal('loginchangepasswordbutton.changepasswordallowed', 'true');
pulseUtility.createCookie('PulseLogin', 'Bruce', 1);

import '@atsora/pomamo-web-service-simulation/scripts/ChangePassword';