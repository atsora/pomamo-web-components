// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

require('x-runninglegends/x-runninglegends');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

function load () {
  var demojs = document.getElementsByClassName('demojs');

  {
    var testDefault = document.createElement('x-runninglegends');
    testDefault.setAttribute('id', 'runninglegends_js_default');
    demojs[0].appendChild(testDefault);
  }
/*
    {
        var testType1 = document.createElement('x-runninglegends');
        testType1.setAttribute('id', 'runninglegends-js-attr-append');
        testType1.setAttribute('type', '1');
        demojs[0].appendChild(testType1);
    }

    {
        var testType1 = document.createElement('x-runninglegends');
        testType1.setAttribute('id', 'runninglegends-js-append-attr');
        demojs[0].appendChild(testType1);
        testType1.setAttribute('type', '1');
    }*/
}

window.onload = load;
