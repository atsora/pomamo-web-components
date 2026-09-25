// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-reasoncommentdialog/x-reasoncommentdialog';

import * as pulseConfig from 'pulseConfig';
import * as pulseUtility from 'pulseUtility';
import pulseCustomDialog from 'pulseCustomDialog';
pulseConfig.setGlobal('path', 'http://localhost:8082/');
import '@atsora/pomamo-web-service-simulation/scripts/GetMachine';

// Today at the given UTC time. The demo template shifts the dates of every
// inserted x-* element to today, so keep all of them on the current UTC day.
function todayIso (hour, minute) {
  let d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Same dialog as pulseDetailsPopup.openReasonCommentDialog
function openCommentDialog (detailsRequired) {
  let range = '[' + todayIso(9, 15) + ';' + todayIso(10, 0) + ')';
  let result = document.getElementById('dialog-result');
  result.textContent = '';

  let rcdlg = pulseUtility.createElementWithAttribute('x-reasoncommentdialog', {
    'machine-id': '2',
    'range': range,
    'reason-name': 'Awaiting material',
    'details-required': detailsRequired ? 'true' : 'false'
  });
  let dialogId = pulseCustomDialog.openDialog(rcdlg, {
    title: 'Reason details',
    onOk: function () {
      result.textContent = 'Saved with comment: "' + rcdlg.getDetails() + '"';
      pulseCustomDialog.close('#' + dialogId);
    },
    autoClose: false,
    autoDelete: true
  });
}

function load () {
  document.getElementById('get-details').addEventListener('click', function () {
    document.getElementById('details-value').textContent =
      '"' + document.getElementById('inline-comment').getDetails() + '"';
  });
  document.getElementById('open-optional').addEventListener('click', function () {
    openCommentDialog(false);
  });
  document.getElementById('open-required').addEventListener('click', function () {
    openCommentDialog(true);
  });
}

window.onload = load;
