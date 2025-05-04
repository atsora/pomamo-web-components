// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  demoimage: {
    files: [
      {
        expand: true,
        cwd: '',
        src: ['x-*/demo/images/*.*'],
        dest: 'about/demo/images/',
        flatten: true
      },
      { cwd: 'images/', dest: 'about/demo/images/', src: ['*.*'], expand: true, dot: true }
    ]
  },
  demojscfg: {
    files: [
      {
        expand: true,
        cwd: 'about/exports/scripts/',
        src: ['pwc_export*.js'],
        dest: 'about/demo/scripts/'
      },
      {
        expand: true,
        cwd: 'libraries/',
        src: ['translation*.js', 'config*.js'],
        dest: 'about/demo/scripts/'
      },
      {
        expand: true,
        cwd: 'demo/',
        src: ['translation*.js', 'config*.js', 'common_demo.js'],
        dest: 'about/demo/scripts/'
      }
    ]
  },
  democss: {
    files: [
      {
        expand: true,
        cwd: 'about/exports/',
        src: ['*/pwc_export*.css'],
        dest: 'about/demo/*/'
      },
      {
        expand: true,
        cwd: 'demo/',
        src: ['*.css'],
        dest: 'about/demo/styles/'
      }
    ]
  },
  demoindexhtml: {
    files: [
      {
        expand: true,
        cwd: 'demo/',
        src: ['index.html'],
        dest: 'about/demo/'
      }
    ]
  },
  demojslib: {
    files: [
      { 'about/demo/lib/jquery/jquery.js': 'node_modules/@bower_components/jquery/dist/jquery.min.js' },
      { 'about/demo/lib/jquery-mockjax/jquery.mockjax.js': 'node_modules/@bower_components/jquery-mockjax/dist/jquery.mockjax.js' },
      { 'about/demo/lib/moment/moment.js': 'node_modules/@bower_components/momentjs/min/moment-with-locales.min.js' },
      { 'about/demo/lib/json2/json2.js': 'node_modules/@bower_components/json2/json2.js' },
      { 'about/demo/lib/d3/d3.min.js': 'node_modules/d3/dist/d3.min.js' }
    ]
  },
  exportsimage: {
    files: [
      {
        expand: true,
        cwd: 'images/',
        src: ['machineselection*.*', 'dialog*.*'],
        dest: 'about/exports/images/'
      }   
    ]
  },
  livehtml: {
    files: [
      {
        expand: true,
        cwd: '',
        src: ['x-*/live/*.html'],
        dest: 'about/docs/',
        flatten: true
      },
      {
        cwd: 'live',
        dest: 'about/live/',
        src: ['*.html'],
        expand: true,
        dot: true
      }
    ]
  },
  livecss: {
    files: [
      {
        expand: true,
        cwd: '',
        src: ['x-*/live/styles/*.css'],
        dest: 'about/live/styles/',
        flatten: true
      },
      {
        cwd: 'live',
        dest: 'about/live/styles/',
        src: ['*.css'],
        expand: true,
        dot: true
      }
    ]
  },
  liveimage: {
    files: [
      {
        expand: true,
        cwd: '',
        src: ['x-*/live/images/*.*'],
        dest: 'about/live/images/',
        flatten: true
      },
      { cwd: 'images/', dest: 'about/live/images/', src: ['*.*'], expand: true, dot: true },
      { cwd: 'live/images/', dest: 'about/live/images/', src: ['*.*'], expand: true, dot: true }
    ]
  },
  livejs: {
    files: [
      {
        expand: true,
        cwd: 'libraries/',
        src: ['translation*.js', 'config*.js'],
        dest: 'about/live/scripts/'
      }
    ]
  },
  livejslib: {
    files: [
      { 'about/live/lib/jquery/jquery.js': 'node_modules/@bower_components/jquery/dist/jquery.min.js' },
      { 'about/live/lib/jquery-mockjax/jquery.mockjax.js': 'node_modules/@bower_components/jquery-mockjax/jquery.mockjax.js' },
      { 'about/live/lib/moment/moment.js': 'node_modules/@bower_components/momentjs/min/moment-with-locales.min.js' },
      { 'about/live/lib/json2/json2.js': 'node_modules/@bower_components/json2/json2.js' },
    ]
  }
};
