// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-rotationprogress/x-rotationprogress');
var eventBus = require('eventBus');

var page = 0;
if (document.readyState !== 'loading') {
  document.getElementById('trigger-rotation').addEventListener('click', function () {
    page = (page % 5) + 1;
    eventBus.EventBus.dispatchToAll('rotationPageUpdate', { page: page, total: 5, delay: 4000 });
  });
} else {
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('trigger-rotation').addEventListener('click', function () {
      page = (page % 5) + 1;
      eventBus.EventBus.dispatchToAll('rotationPageUpdate', { page: page, total: 5, delay: 4000 });
    });
  });
}
