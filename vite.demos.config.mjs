// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Vite config for the component demos (replaces grunt browserify:demojs +
// bakedemo + lessThemes:demo). Mirrors the app's vite.config.mjs: a single
// resolveId plugin reproduces grunt-browserify's name aliases + path lookup, so
// @rollup/plugin-commonjs sees (and transforms) every module — including the REST
// mocks, which are still CommonJS. Driven by build/demos.mjs.

import { isAbsolute, resolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { defineConfig } from 'vite'

const pwc = resolve('.')
const lib = resolve(pwc, 'libraries')

// grunt browserify:demojs aliases (all the pulse.* libraries -> bare names).
const NAME_ALIASES = {
  pulseConfig: resolve(lib, 'pulse.config.js'),
  pulseLogin: resolve(lib, 'pulse.login.js'),
  pulseService: resolve(lib, 'pulse.service.js'),
  pulseUtility: resolve(lib, 'pulse.utility.js'),
  pulseSvg: resolve(lib, 'pulse.svg.js'),
  pulseRange: resolve(lib, 'pulse.range.js'),
  pulseCustomDialog: resolve(lib, 'pulse.customdialog.js'),
  eventBus: resolve(lib, 'EventBus.js'),
}

export function demoPaths () {
  // A bare specifier that is a file under these dirs resolves to it, like
  // grunt-browserify's paths: ['./', 'libraries/']. Handles pulsecomponent ->
  // libraries/, x-foo/x-foo -> pwc root, demo/scripts/foo -> pwc root, etc.
  const dirs = [lib, pwc]
  return {
    name: 'demo-paths',
    resolveId (source) {
      if (Object.prototype.hasOwnProperty.call(NAME_ALIASES, source)) {
        return NAME_ALIASES[source]
      }
      // let Vite resolve relative / absolute / scoped-npm (@atsora mocks, etc.)
      if (source.startsWith('.') || source.startsWith('\0') || source.startsWith('@') || isAbsolute(source)) {
        return null
      }
      for (const dir of dirs) {
        for (const candidate of [resolve(dir, source), resolve(dir, `${source}.js`)]) {
          if (existsSync(candidate) && statSync(candidate).isFile()) {
            return candidate
          }
        }
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [demoPaths()],
  build: {
    minify: 'esbuild',
    commonjsOptions: {
      // The REST mocks (@atsora/pomamo-web-service-simulation, symlinked to the
      // sibling repo) are still CommonJS. Match both the node_modules id and the
      // real (symlink-resolved) path so @rollup/plugin-commonjs transforms them.
      include: [/node_modules/, /pomamo-web-service-simulation/],
      transformMixedEsModules: true,
    },
  },
})
