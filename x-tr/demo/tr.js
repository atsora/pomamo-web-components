// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-tr/x-tr');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/Catalog');

//# sourceMappingURL=tr.js.map

function load () {
  var demo = document.getElementById('demo-js');

  {
    let test1 = document.createElement('x-tr');
    test1.setAttribute('key', 'Test1');
    test1.setAttribute('path', 'http://localhost:8082/');
    demo.appendChild(test1);
  }

  {
    let test2 = document.createElement('x-tr');
    test2.setAttribute('key', 'Test2');
    test2.setAttribute('path', 'http://localhost:8082/');
    demo.appendChild(test2);
  }
  
}

window.onload = load;
