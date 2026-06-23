// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-savereason/x-savereason';

import * as pulseConfig from 'pulseConfig';
import * as pulseLogin from 'pulseLogin';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
pulseLogin.storeRole('operator');

import '@atsora/pomamo-web-service-simulation/scripts/ReasonSelection';
import '@atsora/pomamo-web-service-simulation/scripts/SaveReason';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots';
import '@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate';
import '@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision';
