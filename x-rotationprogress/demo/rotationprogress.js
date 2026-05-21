// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-rotationprogress/x-rotationprogress');
var eventBus = require('eventBus');

var page = 0;
$(function () {
  $('#trigger-rotation').click(function () {
    page = (page % 5) + 1;
    eventBus.EventBus.dispatchToAll('rotationPageUpdate', { page: page, total: 5, delay: 4000 });
  });
});
