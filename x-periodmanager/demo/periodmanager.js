// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-periodmanager/x-periodmanager';
import 'x-datetimegraduation/x-datetimegraduation';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/RangeAround';
import '@atsora/pomamo-web-service-simulation/scripts/GetRangeAround';

import * as eventBus from 'eventBus';

document.addEventListener('DOMContentLoaded', function () {
  // Hour-based periodmanagers dispatch their range synchronously during init —
  // earlier than this DOMContentLoaded callback. Listen first, then nudge each
  // periodmanager with `askForDateTimeRangeEvent` so it re-emits.
  document.querySelectorAll('.range-output').forEach(function (el) {
    var ctx = el.getAttribute('data-context');
    if (!ctx) return;
    eventBus.EventBus.addEventListener({}, 'dateTimeRangeChangeEvent', ctx, function (e) {
      var r = e.target.daterange;
      if (r) {
        el.textContent = '[' + r.lower.toISOString() + ', ' + r.upper.toISOString() + ')';
      }
      else if (e.target.stringrange) {
        el.textContent = String(e.target.stringrange);
      }
    });
    // Trigger re-emit (periodmanager listens to askForDateTimeRangeEvent on its context)
    setTimeout(function () {
      eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent', ctx, {});
    }, 50);
  });
});
