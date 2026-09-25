// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-alertdialog/x-alertdialog';

import pulseCustomDialog from 'pulseCustomDialog';

function load () {
  // pulseCustomDialog.openDialog(<string>, { type }) wraps the message in an x-alertdialog
  document.querySelectorAll('button[data-type]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      let type = btn.getAttribute('data-type');
      let result = document.getElementById('dialog-result');
      result.textContent = '';
      let attrs = { type: type };
      if (type === 'Question') {
        attrs.onOk = function () { result.textContent = 'OK'; };
        attrs.onCancel = function () { result.textContent = 'Cancel'; };
      }
      else {
        attrs.onClose = function () { result.textContent = 'Closed'; };
      }
      pulseCustomDialog.openDialog(document.getElementById('dialog-message').value, attrs);
    });
  });
}

window.onload = load;
