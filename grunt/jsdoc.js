// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  dist: {
    options: {
      relativeUrls: false,
      paths: [''],
      destination: './about/jsdoc',
      configure: './grunt/jsdoc.conf.json',
      template: './node_modules/@lemoineat/docdash',
      timeout: 120,
      verbose: true,
      debug: true
    },
    src: [
      'libraries/*.js',
      'x-*/*.js'
    ]
  }
};
