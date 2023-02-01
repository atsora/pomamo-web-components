// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  exports: {
    options: {
    },
    files: [
      {
        expand: true,                   // Enable dynamic expansion.
        cwd: 'about/exports/scripts/',  // Src matches are relative to this path.
        src: ['*.js'],                  // Actual pattern(s) to match.
        dest: 'about/exports/obfusc/'   // Destination path prefix.
      }
    ]
  }
}
