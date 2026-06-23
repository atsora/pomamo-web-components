// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-message/x-message';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');


import * as eventBus from 'eventBus';

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
