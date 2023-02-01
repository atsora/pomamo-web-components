// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-message/x-message');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');


var eventBus = require('eventBus');

$(function () {
  console.log('document loaded begin');

  $('#displayBtn').click(function () {
    let id = $('#messageId').val();
    let message = $('#messageText').val();
    let time = $('#timeDuration').val();
    let level = $('#messageLevel').val();

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
    if ('withreload' == $('#reload').val()) {
      messageInfo.reloadURL = window.location.href;
    }
    messageInfo.clickToClose = true;

    eventBus.EventBus.dispatchToAll('showMessageSignal',
      messageInfo);
    console.log('After launch event bus');
  });

});
