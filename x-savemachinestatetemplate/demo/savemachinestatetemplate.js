// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-savemachinestatetemplate/x-savemachinestatetemplate';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/NextMachineStateTemplate';
import '@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate';
import '@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision';