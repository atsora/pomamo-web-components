// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-productionshiftgoal/x-productionshiftgoal');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/OperationReserveCapacityCurrentShiftChartByGroup');


function load () {
  var demo = document.getElementById('demo-js');
  var demoError = document.getElementById('demo-js-error');

  {
    let test1 = document.createElement('x-productionshiftgoal');
    test1.setAttribute('id', 'productionshiftgoal-js-test1');
    test1.setAttribute('machine-id', '18');
    test1.setAttribute('path', 'http://localhost:8082/');
    demo.appendChild(test1);
  }

  {
    let test2 = document.createElement('x-productionshiftgoal');
    test2.setAttribute('id', 'productionshiftgoal-js-test2');
    test2.setAttribute('machine-id', '128');
    test2.setAttribute('path', 'http://localhost:8082/');
    demoError.appendChild(test2);
  }

  {
    let test3 = document.createElement('x-productionshiftgoal');
    test3.setAttribute('id', 'productionshiftgoal-js-test1');
    test3.setAttribute('path', 'http://localhost:8082/');
    demoError.appendChild(test3);
  }




}

window.onload = load;
