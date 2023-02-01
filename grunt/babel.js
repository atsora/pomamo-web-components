// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  live: {
    options: {
      sourceMap: false,
      presets: ['@babel/preset-env'],
      plugins: ['@babel/transform-new-target' // juste pour les new.target 
      ]
    },
    files: [
      {
        expand: true,                       // Enable dynamic expansion.
        cwd: '<%= live_script_dir %>/',      // Src matches are relative to this path.
        src: ['**/*.js'],                   // Actual pattern(s) to match.
        dest: '<%= live_babel_dir %>/'      // Destination path prefix.
      }
    ]
  }
}
