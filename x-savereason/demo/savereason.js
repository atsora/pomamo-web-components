// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-savereason/x-savereason');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision')
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots');


// FROM Save MST
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/MachineStateTemplates');
// TO ADD - 2016 12
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');

$(function () {
  console.log('Begin main function');

  var SR1 = $('#SR_1');
  if (SR1.length > 0) {
    //xtag.addObserver(SR1.get(0), "inserted", function(){
    SR1.get(0).addRange('[2017-01-16T00:35:00Z,2017-01-16T12:00:00)');
    SR1.load();
  }
  var SR2 = $('#SR_2');
  if (SR2.length > 0) {
    //xtag.addObserver(SR2.get(0), "inserted", function(){
    SR2.get(0).addRange('[2017-01-16T00:35:00Z,2017-01-16T12:00:00)');
    SR2.load();
  }
  var SR3 = $('#SR_3');
  if (SR3.length > 0) {
    //xtag.addObserver(SR3.get(0), "inserted", function(){
    SR3.get(0).addRange('[2017-01-16T00:35:00Z,2017-01-16T10:00:00)');
    SR3.get(0).addRange('[2017-01-16T10:00:00Z,2017-01-16T12:00:00)');
    SR3.load();
  }

  console.log('End main function');
});
