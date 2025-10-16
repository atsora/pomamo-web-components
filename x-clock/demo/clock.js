// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-clock/x-clock');

function load () {
  var demo = document.getElementById('js-tests');

  {
    let test1 = document.createElement('x-clock');
    test1.setAttribute('id', 'productionshiftgoal-js-test1');
    test1.setAttribute('display-seconds', false);
    demo.appendChild(test1);
  }




}

window.onload = load;
