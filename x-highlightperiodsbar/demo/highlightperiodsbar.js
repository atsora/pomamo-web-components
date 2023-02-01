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
  //xtag.addObserver(HL1.get(0), "inserted", function(){
  HL1.get(0).addRange(pulseRange.createDateRangeFromString('[2013-11-06T08:00:00.000Z,2013-11-06T12:00:00.000Z)'));
  //});
  var HL2 = $('#HL_2');
  //xtag.addObserver(HL2.get(0), "inserted", function(){
  HL2.get(0).addRange(pulseRange.createDateRangeFromString('[2013-11-06T12:00:00.000Z,2013-11-06T14:00:00.000Z)'));
  //});
  var HL3 = $('#HL_3');
  //xtag.addObserver(HL3.get(0), "inserted", function(){
  //HL3.get(0).addCallbackIsInserted( function() { TODO : Creer une callback...  --RR
  HL3.get(0).addRange(pulseRange.createDateRangeFromString('[2013-11-06T14:00:00.000Z,2013-11-06T16:00:00.000Z)'));
  HL3.get(0).addRange(pulseRange.createDateRangeFromString('[2013-11-06T09:00:00.000Z,2013-11-06T10:00:00.000Z)'));
  //});

  console.log('End main function');
});
