// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-highlightperiodsbar/x-highlightperiodsbar';
import 'x-datetimegraduation/x-datetimegraduation';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');

import * as pulseRange from 'pulseRange';

// Anchor every highlight to TODAY so they always fall inside the bar's
// `range=` attribute (which the template patcher also rewrites to today).
function todayIso (hour, minute) {
  var d = new Date();
  d.setUTCHours(hour, minute || 0, 0, 0);
  return d.toISOString();
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('HL_1').addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(8) + ',' + todayIso(12) + ')'));

  document.getElementById('HL_2').addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(12) + ',' + todayIso(14) + ')'));

  document.getElementById('HL_3').addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(14) + ',' + todayIso(16) + ')'));
  document.getElementById('HL_3').addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(9) + ',' + todayIso(10) + ')'));
});
