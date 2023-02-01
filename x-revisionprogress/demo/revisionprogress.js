// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-reasonslotbar/x-reasonslotbar');
require('x-periodtoolbar/x-periodtoolbar');
require('x-revisionprogress/x-revisionprogress');

var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
//var pulseRange = require('pulseRange');

require('x-periodtoolbar/x-periodtoolbar');
require('x-datetimegraduation/x-datetimegraduation');

(function () {
  ////////// ////////// ////////// ////////// ////////// 
  // Dynamic demo 1
  var modif_demo_1 = {
    revisionid: 123,
    machineid: 18,
    kind: 'Reason',
    range: '[2019-05-05T08:48:37.000Z;2019-05-05T08:50:36.000Z)',
    initModifications: undefined, // pending modifications the first time
    pendingModifications: undefined
  };
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 1000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 2000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 3000);
  // 0%
  setTimeout(function () {
    modif_demo_1.initModifications = 12;
    modif_demo_1.pendingModifications = 12;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 4000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 5000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 6000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 7000);

  // progression de 25%
  setTimeout(function () {
    //modif_demo_1.initModifications = 12;
    modif_demo_1.pendingModifications = 9;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 8000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 9000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 10000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 11000);

  // progression de 50%
  setTimeout(function () {
    //modif_demo_1.initModifications = 12;
    modif_demo_1.pendingModifications = 6;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 12000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 13000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 14000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 15000);

  // progression de 75%
  setTimeout(function () {
    //modif_demo_1.initModifications = 12;
    modif_demo_1.pendingModifications = 3;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 16000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 17000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 18000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 19000);

  // Progress completed
  setTimeout(function () {
    //modif_demo_1.initModifications = 12;
    modif_demo_1.pendingModifications = 0;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_1);
  }, 20000);

  ////////// ////////// ////////// ////////// ////////// 
  // Dynamic demo 2
  ////////// ////////// ////////// ////////// ////////// 
  var modif_demo_2 = {
    revisionid: 14,
    machineid: 18,
    kind: 'Reason',
    range: '[2019-05-05T08:48:37.000Z;2019-05-05T08:50:36.000Z)',
    initModifications: 4, // undefined can never be received
    pendingModifications: 4
  };
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 1000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 2000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 3000);
  // 0%
  setTimeout(function () {
    modif_demo_2.initModifications = 4;
    modif_demo_2.pendingModifications = 4;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 4000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 5000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 6000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 7000);

  // progression de 25%
  setTimeout(function () {
    //modif_demo_2.initModifications = 4;
    modif_demo_2.pendingModifications = 3;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 8000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 9000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 10000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 11000);

  // progression de 50%
  setTimeout(function () {
    //modif_demo_2.initModifications = 4;
    modif_demo_2.pendingModifications = 2;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 12000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 13000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 14000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 15000);

  // progression de 75%
  setTimeout(function () {
    //modif_demo_2.initModifications = 4;
    modif_demo_2.pendingModifications = 1;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 16000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 17000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 18000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 19000);

  // Progress completed
  setTimeout(function () {
    //modif_demo_2.initModifications = 4;
    modif_demo_2.pendingModifications = 0;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_2);
  }, 20000);


  ////////// ////////// ////////// ////////// ////////// 
  // Dynamic demo 3
  ////////// ////////// ////////// ////////// ////////// 
  var modif_demo_3 = {
    revisionid: 13,
    machineid: 18,
    kind: 'Reason',
    range: '[2019-05-05T08:48:37.000Z;2019-05-05T08:50:36.000Z)',
    initModifications: undefined, // pending modifications the first time
    pendingModifications: undefined
  };
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 1000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 2000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 3000);
  // 0%
  setTimeout(function () {
    modif_demo_3.initModifications = 1;
    modif_demo_3.pendingModifications = 1;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 4000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 5000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 6000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 7000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 8000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 9000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 10000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 11000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 12000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 13000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 14000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 15000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 16000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 17000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 18000);
  setTimeout(function () {
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 19000);
  // Progress completed
  setTimeout(function () {
    modif_demo_3.initModifications = 1;
    modif_demo_3.pendingModifications = 0;
    eventBus.EventBus.dispatchToAll('modificationEvent', modif_demo_3);
  }, 20000);

})();