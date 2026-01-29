// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-cycletask/x-cycletask');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8080/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/Tasks');

function load () {

}

window.onload = load;

