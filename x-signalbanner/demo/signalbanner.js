// Copyright (C) 2009-2026 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

require('x-signalbanner/x-signalbanner');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

// Local mocks for the /Signal/?GroupId=<id> endpoint.

var multiMessages = {
  Messages: [
    {
      Message: 'Maintenance scheduled at 14:00',
      BgColor: '#f97316',
      FgColor: '#ffffff'
    },
    {
      Message: 'High temperature warning on spindle',
      BgColor: '#ef4444',
      FgColor: '#ffffff'
    },
    {
      Message: 'Production target reached at 95%',
      BgColor: '#6f42c1',
      FgColor: '#ffffff'
    },
    {
      Message: 'Operator note: verify coolant level',
      BgColor: '#3b82f6',
      FgColor: '#ffffff'
    }
  ]
};

var singleMessage = {
  Messages: [
    {
      Message: 'All systems nominal',
      BgColor: '#22c55e',
      FgColor: '#ffffff'
    }
  ]
};

var emptyResponse = {
  Messages: []
};

var contrastTest = {
  Messages: [
    {
      Message: 'Yellow background, no fg — auto-computed to black',
      BgColor: '#ffff00',
      FgColor: ''
    },
    {
      Message: 'Navy background, no fg — auto-computed to white',
      BgColor: '#000080',
      FgColor: ''
    }
  ]
};

var allGroups = {
  Messages: [
    {
      Message: 'ALL: shop-wide notice (every group)',
      BgColor: '#0369A1',
      FgColor: '#ffffff'
    }
  ]
};

$.mockjax({
  url: /^http:\/\/localhost:8082\/Signal\/\?GroupId=1_23_53(&.*)?$/,
  responseTime: 200,
  responseText: multiMessages
});

$.mockjax({
  url: /^http:\/\/localhost:8082\/Signal\/\?GroupId=42(&.*)?$/,
  responseTime: 200,
  responseText: singleMessage
});

$.mockjax({
  url: /^http:\/\/localhost:8082\/Signal\/\?GroupId=99(&.*)?$/,
  responseTime: 200,
  responseText: emptyResponse
});

$.mockjax({
  url: /^http:\/\/localhost:8082\/Signal\/\?GroupId=contrast(&.*)?$/,
  responseTime: 200,
  responseText: contrastTest
});

$.mockjax({
  url: /^http:\/\/localhost:8082\/Signal\/\?GroupId=ALL(&.*)?$/,
  responseTime: 200,
  responseText: allGroups
});

//# sourceMappingURL=signalbanner.js.map
