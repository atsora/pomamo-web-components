// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  babel: {
    options: {
      patterns: [
        {
          match: /es2015/g,
          replacement: 'scripts'
        },
        {
          match: /<!--babel:/g,
          replacement: ''
        },
        {
          match: /babel:-->/g,
          replacement: ''
        }
      ]
    },
    files: [
      {
        expand: true,                      // Enable dynamic expansion.
        cwd: 'about/docs/',                // Src matches are relative to this path.
        src: ['*.html'],                   // Actual pattern(s) to match.
        dest: 'about/docs-babel/',         // Destination path prefix.
      },
      {
        expand: true,                      // Enable dynamic expansion.
        cwd: 'about/live/',                // Src matches are relative to this path.
        src: ['*.html'],                   // Actual pattern(s) to match.
        dest: 'about/live-babel/',         // Destination path prefix.
      }
    ]
  }
}
