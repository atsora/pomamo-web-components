// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-datetimerange/x-datetimerange';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');

// from-now demo: getRangeString() is [now, no end) at the time of the click,
// until a range is validated in the dialog
document.addEventListener('click', function (e) {
  let getRangeBtn = e.target.closest('.from-now-get-range');
  if (getRangeBtn) {
    let dtr = document.getElementById(getRangeBtn.dataset.target);
    let result = getRangeBtn.parentElement.querySelector('.from-now-result');
    result.textContent = dtr.getRangeString();
    return;
  }
  let resetBtn = e.target.closest('.from-now-reset');
  if (resetBtn) {
    document.getElementById(resetBtn.dataset.target).setAttribute('from-now', 'true');
  }
});

