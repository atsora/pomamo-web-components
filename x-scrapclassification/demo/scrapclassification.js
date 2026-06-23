// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import * as pulseConfig from 'pulseConfig';

import 'x-scrapclassification/x-scrapclassification';

pulseConfig.setGlobal('path', 'http://localhost:8082/');

import '@atsora/pomamo-web-service-simulation/scripts/GetPartsInformation';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonScrapSelection';
import '@atsora/pomamo-web-service-simulation/scripts/SaveReason';




import '@atsora/pomamo-web-service-simulation/scripts/ReasonSelection';
import '@atsora/pomamo-web-service-simulation/scripts/SaveReason';
import '@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots';


// FROM Save MST
// TO ADD - 2016 12
import '@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate';
import '@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision';