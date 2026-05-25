// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-highlightperiodsbar/x-highlightperiodsbar');
require('x-datetimegraduation/x-datetimegraduation');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

var pulseRange = require('pulseRange');

// Anchor every highlight to TODAY so they always fall inside the bar's
// `range=` attribute (which the template patcher also rewrites to today).
function todayIso (hour, minute) {
  var d = new Date();
  d.setUTCHours(hour, minute || 0, 0, 0);
  return d.toISOString();
}

$(function () {
  $('#HL_1').get(0).addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(8) + ',' + todayIso(12) + ')'));

  $('#HL_2').get(0).addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(12) + ',' + todayIso(14) + ')'));

  $('#HL_3').get(0).addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(14) + ',' + todayIso(16) + ')'));
  $('#HL_3').get(0).addRange(pulseRange.createDateRangeFromString(
    '[' + todayIso(9) + ',' + todayIso(10) + ')'));
});
