// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  ml: {
    files: [{
      dot: true,
      src: ['<%= ml_script_dir %>']
    }]
  },
  exports: {
    files: [{
      dot: true,
      src: ['about/exports']
    }]
  },
  demo: {
    files: [{
      dot: true,
      src: ['about/demo']
    }]
  },
  docs: { // Removed - to clean in 2021
    files: [{
      dot: true,
      src: ['about/docs']
    }]
  },
  live: {
    files: [{
      dot: true,
      src: ['about/live']
    }]
  },
  jsdoc: { /* Doc auto générée */
    files: [{
      dot: true,
      src: ['about/jsdoc']
    }]
  },
  dist: {
    files: [{
      dot: true,
      src: ['about']
    }]
  }
};
