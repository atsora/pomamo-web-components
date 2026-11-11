// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-task/x-task';

import * as pulseConfig from 'pulseConfig';
pulseConfig.setGlobal('path', 'http://localhost:8080/');
import '@atsora/pomamo-web-service-simulation/scripts/Tasks';

// The tasks are filtered by the role of the user, else by the PulseRole cookie
// that the web app may have left on localhost (the same for every port):
// show the tasks of the operator, unless the URL sets the role (?AppContext=)
if (!new URLSearchParams(window.location.search).has('AppContext')) {
  const url = new URL(window.location.href);
  url.searchParams.set('AppContext', 'operator');
  window.history.replaceState(null, '', url);
}

function load () {

}

window.onload = load;

