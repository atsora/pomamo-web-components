// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

module.exports = function (grunt) {

  // measures the time each task takes
  require('time-grunt')(grunt);

  // load grunt config
  require('load-grunt-config')(grunt, {
    config: {
      ml_script_dir: 'ocamljs',
      demo_script_dir: 'about/demo/scripts',
      live_script_dir: 'about/live/es2015',
      live_babel_dir: 'about/live/scripts',
      test_script_dir: 'about/tests/scripts'
    }
  });
  
  /**
   * Helper function dynamically creates config object for `bake` Task.
   * We dynamically generate this to obtain the filename and use it.
   */
  function bakeHtml() {
    var glob = 'x-*/demo/*.js',
      config = {};

    grunt.file.expand({ filter: 'isFile' }, glob).forEach(function (filePath) {
      var fileName = filePath.split('/').pop().split('.')[0];
      config[fileName] = {
        options: {
          content: { pagename: fileName },
          paths: ['', 'demo/', 'libraries/']
        },
        files: [{
          src: 'demo/template_demo.html',
          dest: 'about/demo/'+fileName+'.html'
        }]
      }
    });

    grunt.config('bake', config);
    grunt.task.run(['bake']);
  }

  grunt.loadNpmTasks('grunt-bake');
  grunt.registerTask('bakedemo', bakeHtml);

};
