// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  dist: { // All: ascii + png
    files: [
      {
        expand: true,                     // Enable dynamic expansion.
        cwd: 'graph/',                    // Src matches are relative to this path.
        src: ['*.txt'],                   // Actual pattern(s) to match.
        dest: 'about/graphimages/',       // Destination path prefix.        
        ext: '.ascii',                    // Dest filepaths will have this extension.
        extDot: 'last'
      },
      {
        expand: true,                     // Enable dynamic expansion.
        cwd: 'graph/',                    // Src matches are relative to this path.
        src: ['*.txt'],                   // Actual pattern(s) to match.
        dest: 'about/graphimages/',       // Destination path prefix.        
        ext: '.png',                    // Dest filepaths will have this extension.
        extDot: 'last'
      }      
    ]
  },
  ascii: { // ascii only
    files: [
      {
        expand: true,                     // Enable dynamic expansion.
        cwd: 'graph/',                    // Src matches are relative to this path.
        src: ['*.txt'],                   // Actual pattern(s) to match.
        dest: 'about/graphimages/',       // Destination path prefix.        
        ext: '.ascii',                    // Dest filepaths will have this extension.
        extDot: 'last'
      }
    ]
  },
  png: { // png only
    files: [
      {
        expand: true,                      // Enable dynamic expansion.
        cwd: 'graph/',                     // Src matches are relative to this path.
        src: ['*.txt'],                    // Actual pattern(s) to match.
        dest: 'about/graphimages/',        // Destination path prefix.        
        ext: '.png',                       // Dest filepaths will have this extension.
        extDot: 'last'
      }
    ]
  },
  jsdoc: { // graph images for jsdoc
    files: [
      {
        expand: true,                      // Enable dynamic expansion.
        cwd: 'graph/',                     // Src matches are relative to this path.
        src: ['*.txt'],                    // Actual pattern(s) to match.
        dest: 'about/jsdoc/images',        // Destination path prefix.        
        ext: '.png',                       // Dest filepaths will have this extension.
        extDot: 'last'
      }
    ]
  }
}
