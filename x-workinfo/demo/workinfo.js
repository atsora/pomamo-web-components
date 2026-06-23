// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

// x-workinfo is a passive display — it listens to operationChangeEvent. We
// pair it with x-production / x-partproductionstatuspie, which actually
// fetch the data and emit the event.
import 'x-workinfo/x-workinfo';
import 'x-production/x-production';
import 'x-partproductionstatuspie/x-partproductionstatuspie';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');

import '@atsora/pomamo-web-service-simulation/scripts/OperationPartProductionRange';
import '@atsora/pomamo-web-service-simulation/scripts/OperationProductionMachiningStatus';

import * as eventBus from 'eventBus';

if (document.readyState !== 'loading') {
  document.getElementById('dispatch-workinfo').addEventListener('click', function () {
    eventBus.EventBus.dispatchToContext('operationChangeEvent', '999', {
      workinformations: [
        { Kind: 'WorkOrder', Value: 'WO-MANUAL-001' },
        { Kind: 'Part',      Value: 'PART-MANUAL' },
        { Kind: 'Operation', Value: 'OP-MANUAL' }
      ]
    });
  });
} else {
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('dispatch-workinfo').addEventListener('click', function () {
      eventBus.EventBus.dispatchToContext('operationChangeEvent', '999', {
        workinformations: [
          { Kind: 'WorkOrder', Value: 'WO-MANUAL-001' },
          { Kind: 'Part',      Value: 'PART-MANUAL' },
          { Kind: 'Operation', Value: 'OP-MANUAL' }
        ]
      });
    });
  });
}
