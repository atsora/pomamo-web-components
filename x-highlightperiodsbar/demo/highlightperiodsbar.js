// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-highlightperiodsbar/x-highlightperiodsbar');
require('x-datetimegraduation/x-datetimegraduation');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

//# sourceMappingURL=highlightperiodsbar.js.map

var pulseRange = require('pulseRange');

$(function () {
  console.log('Begin main function');

  var HL1 = $('#HL_1');
  HL1.get(0).addRange(pulseRange.createDateRangeFromString('[2026-05-20T08:00:00.000Z,2026-05-20T12:00:00.000Z)'));
  var HL2 = $('#HL_2');
  HL2.get(0).addRange(pulseRange.createDateRangeFromString('[2026-05-20T12:00:00.000Z,2026-05-20T14:00:00.000Z)'));
  var HL3 = $('#HL_3');
  HL3.get(0).addRange(pulseRange.createDateRangeFromString('[2026-05-20T14:00:00.000Z,2026-05-20T16:00:00.000Z)'));
  HL3.get(0).addRange(pulseRange.createDateRangeFromString('[2026-05-20T09:00:00.000Z,2026-05-20T10:00:00.000Z)'));
  //});

  console.log('End main function');
});
