// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  options: {
    /*separator: ";"*/
  },
  live: {
    files: {
      'about/live/lib/globalize/globalize.js': ['node_modules/@bower_components/globalize/lib/globalize.js','node_modules/@bower_components/globalize/lib/cultures/globalize.cultures.js'],
      'about/live/lib/d3/d3.min.js': ['node_modules/d3/dist/d3.min.js'],
    }
  }
};
