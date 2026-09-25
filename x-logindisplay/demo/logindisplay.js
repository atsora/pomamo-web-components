// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import 'x-logindisplay/x-logindisplay';

import * as pulseLogin from 'pulseLogin';

// The component reads the login / role once, at initialization: re-create it
function renderLoginDisplay () {
  let box = document.getElementById('logindisplay-box');
  box.replaceChildren(document.createElement('x-logindisplay'));
  document.getElementById('current-role').textContent = pulseLogin.getRole() || '(none)';
}

function load () {
  // Restore the role of the other demo pages when leaving this one (login cookies excepted)
  let initialRole = pulseLogin.getRole();
  window.addEventListener('pagehide', function () {
    pulseLogin.cleanLoginRole();
    if (initialRole != '') {
      pulseLogin.storeRole(initialRole);
    }
  });

  document.getElementById('role-operator').addEventListener('click', function () {
    pulseLogin.cleanLoginRole();
    pulseLogin.storeRole('operator');
    renderLoginDisplay();
  });
  document.getElementById('role-manager').addEventListener('click', function () {
    pulseLogin.cleanLoginRole();
    pulseLogin.storeRole('manager');
    renderLoginDisplay();
  });
  document.getElementById('login-user').addEventListener('click', function () {
    pulseLogin.storeLoginRole('jdoe', 'manager', 'John Doe', '', '', '', '', true);
    renderLoginDisplay();
  });
  document.getElementById('no-role').addEventListener('click', function () {
    pulseLogin.cleanLoginRole();
    renderLoginDisplay();
  });

  // A click on the component logs out and goes to the login page: intercept it
  // (capture phase) to stay on the demo page
  document.getElementById('logindisplay-box').addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('click-info').textContent =
      'Click intercepted: the component would call pulseLogin.cleanLoginRole() then pulseConfig.goToPageLogin().';
  }, true);

  renderLoginDisplay();
}

window.onload = load;
