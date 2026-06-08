// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-productionshiftgoal/x-productionshiftgoal');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationReserveCapacityCurrentShiftChartByGroup');

function load () {
  var demo = document.getElementById('demo-js');
  var demoError = document.getElementById('demo-js-error');

  var test1 = document.createElement('x-productionshiftgoal');
  test1.setAttribute('id', 'productionshiftgoal-js-test1');
  test1.setAttribute('machine-id', '100');
  test1.setAttribute('path', 'http://localhost:8082/');
  demo.appendChild(test1);

  var test2 = document.createElement('x-productionshiftgoal');
  test2.setAttribute('id', 'productionshiftgoal-js-error');
  test2.setAttribute('machine-id', '999');
  test2.setAttribute('path', 'http://localhost:8082/');
  demoError.appendChild(test2);
}

window.addEventListener('load', load);
