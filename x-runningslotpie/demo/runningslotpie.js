// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-runningslotpie/x-runningslotpie';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/RunningSlots';