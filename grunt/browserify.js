// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  exportsjs: {
    options: {
      alias: [
        'pulse.config.js:pulseConfig',
        'pulse.login.js:pulseLogin',
        'pulse.service.js:pulseService',
        'pulse.utility.js:pulseUtility',
        'pulse.svg.js:pulseSvg',
        'pulse.range.js:pulseRange',
        'pulse.customdialog.js:pulseCustomDialog',
        'EventBus.js:eventBus'],
      browserifyOptions: {
        paths: ['./', 'libraries/'],
        debug: true /* for source map */
      }
    },
    files: [
      {
        expand: true,
        cwd: '',
        src: ['libraries/pulse.exports*.js'],
        dest: 'about/exports/scripts/',
        flatten: true
      }
    ]
  },
  demojs: {
    options: {
      alias: [
        'pulse.config.js:pulseConfig',
        'pulse.login.js:pulseLogin',
        'pulse.service.js:pulseService',
        'pulse.utility.js:pulseUtility',
        'pulse.svg.js:pulseSvg',
        'pulse.range.js:pulseRange',
        'pulse.customdialog.js:pulseCustomDialog',
        'EventBus.js:eventBus'],
      browserifyOptions: {
        paths: ['./', 'libraries/'],
        debug: true /* for source map */
      }
    },
    files: [
      {
        expand: true,
        cwd: '',
        src: ['x-*/demo/*.js'],
        dest: '<%= demo_script_dir %>/',
        flatten: true
      }
    ]
  },
  live: {
    options: {
      alias: [
        'pulse.config.js:pulseConfig',
        'pulse.login.js:pulseLogin',
        'pulse.service.js:pulseService',
        'pulse.utility.js:pulseUtility',
        'pulse.svg.js:pulseSvg',
        'pulse.range.js:pulseRange',
        'pulse.customdialog.js:pulseCustomDialog',
        'EventBus.js:eventBus'],
      browserifyOptions: {
        paths: ['./', 'libraries/'],
        debug: true /* for source map */
      }
    },
    files: [
      {
        expand: true,                       // Enable dynamic expansion.
        cwd: 'live/',               // Src matches are relative to this path.
        src: ['**/*.js'],                   // Actual pattern(s) to match.
        dest: '<%= live_script_dir %>/'      // Destination path prefix.        
      },
      {
        expand: true,
        cwd: '',
        src: ['x-*/live/*.js'],
        dest: '<%= live_script_dir %>/',
        flatten: true
      }
    ]
  }
};
