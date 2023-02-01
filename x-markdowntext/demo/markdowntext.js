// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-markdowntext/x-markdowntext');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

$(function () {
  console.log('document loaded begin');

  $('.showtextbutton').click(function () {
    console.log('click detected');

    let message = $('.inputtext')[0].value;
    console.log('message is : ' + message);

    $('x-markdowntext')[0].setText(message);
   
    console.log('Text should be displayed');
  });

});
