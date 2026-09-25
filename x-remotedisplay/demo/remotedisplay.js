// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-remotedisplay/x-remotedisplay';

import * as eventBus from 'eventBus';

function load () {
  document.getElementById('send-display').addEventListener('click', function () {
    let context = document.getElementById('display-context').value;
    let data = { Display: document.getElementById('display-text').value };
    let highlight = document.getElementById('display-highlight').value;
    if (highlight == 'add') {
      data.ClassToAdd = 'demo-highlight';
    }
    else if (highlight == 'remove') {
      data.ClassToRemove = 'demo-highlight';
    }
    eventBus.EventBus.dispatchToContext('displayChangeEvent', context, data);
  });

  document.getElementById('clear-display').addEventListener('click', function () {
    let context = document.getElementById('display-context').value;
    eventBus.EventBus.dispatchToContext('displayChangeEvent', context, {});
  });
}

window.onload = load;
