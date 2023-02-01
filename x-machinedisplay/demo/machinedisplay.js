// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-machinedisplay/x-machinedisplay');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@lemoineat/pomamo-web-service-simulation/scripts/GetMachine');

//# sourceMappingURL=machinedisplay.js.map

function load () {
  var demo = document.getElementById('demo-js');

  {
    let test1 = document.createElement('x-machinedisplay');
    test1.setAttribute('id', 'machinedisplay-js-test1');
    test1.setAttribute('machine-id', '18');
    test1.setAttribute('path', 'http://localhost:8082/');
    demo.appendChild(test1);
  }

  {
    let test2 = document.createElement('x-machinedisplay');
    test2.setAttribute('id', 'machinedisplay-js-test2');
    test2.setAttribute('machine-id', '128');
    test2.setAttribute('path', 'http://localhost:8082/');
    demo.appendChild(test2);
  }


  let demoFixed = document.getElementById('demo-js-auto-width');

  {
    let testFixed1 = document.createElement('x-machinedisplay');
    testFixed1.setAttribute('id', 'machinedisplay-js-auto-test1');
    testFixed1.setAttribute('machine-id', '18');
    testFixed1.setAttribute('path', 'http://localhost:8082/');
    demoFixed.appendChild(testFixed1);
  }

  {
    let testFixed2 = document.createElement('x-machinedisplay');
    testFixed2.setAttribute('id', 'machinedisplay-js-auto-test2');
    testFixed2.setAttribute('machine-id', '128');
    testFixed2.setAttribute('path', 'http://localhost:8082/');
    demoFixed.appendChild(testFixed2);
  }

}

window.onload = load;
