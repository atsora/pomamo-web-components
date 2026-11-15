// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-workinfodocs/x-workinfodocs';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/WorkInfoDocCount';

// The web app opens the documents dialog on this event: the demo only shows it
window.addEventListener('atsora:open-workinfo-docs', function (event) {
  let target = document.getElementById('workinfodocs-event');
  if (target) target.textContent = JSON.stringify(event.detail);
});
