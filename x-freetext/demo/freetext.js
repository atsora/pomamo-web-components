// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-freetext/x-freetext';

import * as eventBus from 'eventBus';

// Current text per context, returned when a x-freetext asks for it
var texts = {
  'demo': 'Text sent on context <b>demo</b>',
  'machine-id_1': 'Machine 1: maintenance planned at 14:00',
  'machine-id_2': ''
};

function sendText (context) {
  eventBus.EventBus.dispatchToContext('textChangeEvent', context, { text: texts[context] });
}

// x-freetext dispatches askForTextChangeEvent at initialization
Object.keys(texts).forEach(function (context) {
  eventBus.EventBus.addEventListener({}, 'askForTextChangeEvent', context, function () {
    sendText(context);
  });
});

function load () {
  // In case the components asked before the listeners above were registered
  Object.keys(texts).forEach(sendText);

  document.getElementById('send-text').addEventListener('click', function () {
    let context = document.getElementById('text-context').value;
    texts[context] = document.getElementById('text-value').value;
    sendText(context);
  });

  document.getElementById('clean-display').addEventListener('click', function () {
    document.getElementById('freetext-demo').cleanDisplay();
  });
}

window.onload = load;
