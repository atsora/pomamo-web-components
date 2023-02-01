// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  live: {
    options: {
      relativeUrls: false,
      paths: ['live/', 'node_modules/@bower_components/', 'styles/', 'libraries/']
    },
    files: [
      {
        expand: true,                      // Enable dynamic expansion.
        cwd: 'live/',                      // Src matches are relative to this path.
        src: ['*.less'],                   // Actual pattern(s) to match.
        dest: 'about/live/styles/',        // Destination path prefix.        
        ext: '.css',                       // Dest filepaths will have this extension.
        extDot: 'last'
      },
      {
        expand: true,
        cwd: '',
        src: ['x-*/live/*.less'],
        dest: 'about/live/styles',
        ext: '.css',
        extDot: 'last',
        flatten: true
      }
    ]
  }
};
