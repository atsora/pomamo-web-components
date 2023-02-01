// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  components: { // deprecated: same as release
    files: {
      '<%= ml_script_dir %>/': 'ocaml/x_ml.ml'
    },
    options: {
      ocamlbuild: ['-plugin-tag', 'package(ocamlbuild_atdgen)'],
      // js_of_ocaml options (--pretty, --no-inline, --debug-info, --source-map, --source-map-inline)
      js_of_ocaml: ['--opt', '3', '--source-map', '+weak.js', '+nat.js']
    }
  },
  dev: {
    files: {
      '<%= ml_script_dir %>/': 'ocaml/x_ml.ml'
    },
    options: {
      ocamlbuild: ['-plugin-tag', 'package(ocamlbuild_atdgen)'],
      // js_of_ocaml options (--pretty, --no-inline, --debug-info, --source-map, --source-map-inline)
      js_of_ocaml: ['--opt', '1', '--source-map', '+weak.js', '+nat.js']
    }
  },
  release: {
    files: {
      '<%= ml_script_dir %>/': 'ocaml/x_ml.ml'
    },
    options: {
      ocamlbuild: ['-plugin-tag', 'package(ocamlbuild_atdgen)'],
      // js_of_ocaml options (--pretty, --no-inline, --debug-info, --source-map, --source-map-inline)
      js_of_ocaml: ['--opt', '3', '--source-map', '+weak.js', '+nat.js']
    }
  },
  simulated_components: {
    files: {
      '<%= ml_script_dir %>/': 'ocaml/x_ml_simulation.ml'
    },
    options: {
      ocamlbuild: ['-plugin-tag', 'package(ocamlbuild_atdgen)'],
      // js_of_ocaml options (--pretty, --no-inline, --debug-info, --source-map, --source-map-inline)
      js_of_ocaml: ['--opt', '1', '--source-map', '+weak.js', '+nat.js']
    }
  }
}
