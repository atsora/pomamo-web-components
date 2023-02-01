// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  ocamldoc: {
    options: {
      target: 'ocaml/ml.docdir/index.html',
      args: ['-plugin-tag','package(ocamlbuild_atdgen)']
    }
  }
}
