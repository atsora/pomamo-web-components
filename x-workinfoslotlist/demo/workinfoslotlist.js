// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-workinfoslotlist/x-workinfoslotlist';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/GetListOfOperationSlotV2';
import '@atsora/pomamo-web-service-simulation/scripts/OperationSlots';
