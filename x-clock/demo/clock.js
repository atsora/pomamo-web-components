// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-clock/x-clock';

function load () {
  var demo = document.getElementById('js-tests');
  if (!demo) { return; } // #js-tests was removed from the demo template; the declarative <x-clock> covers the demo

  {
    let test1 = document.createElement('x-clock');
    test1.setAttribute('id', 'productionshiftgoal-js-test1');
    test1.setAttribute('display-seconds', false);
    demo.appendChild(test1);
  }




}

window.onload = load;
