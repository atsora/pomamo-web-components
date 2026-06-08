// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-message/x-message');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');


var eventBus = require('eventBus');

document.addEventListener('DOMContentLoaded', function () {
  console.log('document loaded begin');

  document.getElementById('displayBtn').addEventListener('click', function () {
    let id = document.getElementById('messageId').value;
    let message = document.getElementById('messageText').value;
    let time = document.getElementById('timeDuration').value;
    let level = document.getElementById('messageLevel').value;

    let messageInfo = {
      'message': message,
      'level': level
    };
    if (id != '') {
      messageInfo.id = id;
    }
    if (time != 'permanent') {
      messageInfo.time = time;
    }
    if ('withreload' == document.getElementById('reload').value) {
      messageInfo.reloadURL = window.location.href;
    }
    messageInfo.clickToClose = true;

    eventBus.EventBus.dispatchToAll('showMessageSignal',
      messageInfo);
    console.log('After launch event bus');
  });

});
