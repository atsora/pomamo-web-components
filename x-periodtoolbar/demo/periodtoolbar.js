// Copyright (C) 2009-2026 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-periodtoolbar/x-periodtoolbar');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetRangeAround');

$(function () {
  var span = document.getElementById('range-display');
  if (!span) return;
  // Poll the toolbar's `range` attribute. Each click on a period/zoom/prev/next
  // updates it; reflect that in the read-out below.
  var tb = document.getElementById('with-context');
  if (!tb) return;
  var last = null;
  function tick () {
    var current = tb.getAttribute('range') || tb.querySelector('x-datetimerange')?.getAttribute('range') || '';
    if (current !== last) {
      last = current;
      span.textContent = current || '(no range yet)';
    }
  }
  tick();
  setInterval(tick, 250);
});
