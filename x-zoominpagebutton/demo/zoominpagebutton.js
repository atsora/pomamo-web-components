// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-zoominpagebutton/x-zoominpagebutton';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/GroupZoomIn';

// Current selection of the page (overridden by ?group= in the URL), pushed as ancestor on click
PULSE_DEFAULT_CONFIG.general.group = '100';

function load () {
  // A click reloads the page with ?group=<group>&ancestor<N>=<previous group>
  let params = new URLSearchParams(window.location.search);
  let shown = [];
  params.forEach(function (value, key) {
    if (key == 'group' || key == 'machine' || key.startsWith('ancestor')) {
      shown.push(key + '=' + value);
    }
  });
  document.getElementById('url-params').textContent = shown.length ? shown.join(' & ') : '(none)';
  document.getElementById('reset-url').href = window.location.pathname;
}

window.onload = load;
