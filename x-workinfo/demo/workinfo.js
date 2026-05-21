// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

// x-workinfo is a passive display — it listens to operationChangeEvent. We
// pair it with x-production / x-partproductionstatuspie, which actually
// fetch the data and emit the event.
require('x-workinfo/x-workinfo');
require('x-production/x-production');
require('x-partproductionstatuspie/x-partproductionstatuspie');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationPartProductionRange');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationProductionMachiningStatus');

var eventBus = require('eventBus');

$(function () {
  $('#dispatch-workinfo').click(function () {
    eventBus.EventBus.dispatchToContext('operationChangeEvent', '999', {
      workinformations: [
        { Kind: 'WorkOrder', Value: 'WO-MANUAL-001' },
        { Kind: 'Part',      Value: 'PART-MANUAL' },
        { Kind: 'Operation', Value: 'OP-MANUAL' }
      ]
    });
  });
});
