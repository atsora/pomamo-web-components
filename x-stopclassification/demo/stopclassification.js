// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-stopclassification/x-stopclassification';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/ReasonSelection';
import '@atsora/pomamo-web-service-simulation/scripts/SaveReason';
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';
import '@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots';


// FROM Save MST
// TO ADD - 2016 12
import '@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate';
import '@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision';

function load () {

}

window.onload = load;
