// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  // WARNING ! 'about/exports' MUST exist before starting lessTheme (browserify:exportsjs do it)
  exports: {
    options: {
      themes: ['dark', 'light'],
      themeDir: 'libraries/themes',
      output: 'about/exports',
      paths : ['', 'libraries/', 'about/exports/'],
      themeImport: 'about/exports/theme.less'
    },
    files: [
      {
        expand: true,                      // Enable dynamic expansion.
        src: ['libraries/pulse.exports*.less'],        // Actual pattern(s) to match.
        dest: 'style_{{themeName}}',       // Destination path prefix.
        ext: '.css',                       // Dest filepaths will have this extension.
        extDot: 'last',
        flatten: true
      }
    ]
  },
  // WARNING ! 'about/demo/styles' directory MUST exist before starting lessTheme (copy:css do it)
  demo: {
    options: {
      themes: ['dark', 'light'],
      themeDir: 'libraries/themes',
      output: 'about/demo/styles',
      paths : ['', 'demo/', 'libraries/', 'about/demo/styles/'],
      themeImport: 'about/demo/styles/theme.less'
    },
    files: [
      {
        expand: true,                      // Enable dynamic expansion.
        src: ['x-*/demo/*.less'],          // Actual pattern(s) to match.
        dest: 'style_{{themeName}}',       // Destination path prefix.
        ext: '.css',                       // Dest filepaths will have this extension.
        extDot: 'last',
        flatten: true
      }
    ]
  }
};