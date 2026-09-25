// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

// Demo configuration. Imported before x-detailsatdialog because the dialog
// reads it at initialization, as soon as the element is defined.

PULSE_DEFAULT_CONFIG.general.showcoloredbar = {
  showdetails: [
    'x-detailedreasonat',
    'x-detailedcncvaluesat',
    'x-detailedalarmsat',
    'x-cncalarmbar' // bar only: displayed as an overlay of the reason bar
  ]
};
