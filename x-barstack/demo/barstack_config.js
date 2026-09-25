// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

// Demo configuration, one entry per period-context. Imported before
// x-barstack because the stack is built as soon as the element is defined.

PULSE_DEFAULT_CONFIG.pages = PULSE_DEFAULT_CONFIG.pages || {};

PULSE_DEFAULT_CONFIG.pages.barstack_switch = {
  showproductionbar: false
};

PULSE_DEFAULT_CONFIG.pages.barstack_full = {
  showcoloredbar: {
    shift: true,
    machinestate: true,
    observationstate: true,
    cycle: true,
    operation: true,
    isofile: true,
    cncalarm: true,
    redstacklight: true,
    timeselection: true,
    cncvalue: true
  }
};
