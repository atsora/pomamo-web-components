// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import * as pulseConfig from 'pulseConfig';

import 'x-scrapstatus/x-scrapstatus';

pulseConfig.setGlobal('path', 'http://localhost:8082/');

import '@atsora/pomamo-web-service-simulation/scripts/GetLastMachineStatusV2';
