// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Grunt -> Vite migration: bundle the components repo's JS with Vite (replacing
// grunt-browserify: exportsjs / demojs / live), in PARALLEL to Grunt (output ->
// dist-vite/). Per-target entries/output are driven by build-components.mjs.

import { isAbsolute, resolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { defineConfig } from 'vite'

const root = resolve('.')

// Replicate grunt-browserify's `paths: ['./', 'libraries/']`: a bare specifier
// that is a file in one of these dirs resolves to it (handles x-foo/x-foo from
// the repo root, and the pulse.* libraries).
function browserifyPaths() {
  const dirs = [root, resolve('libraries')]
  return {
    name: 'browserify-paths',
    resolveId(source) {
      if (source.startsWith('.') || source.startsWith('\0') || isAbsolute(source))
        return null
      for (const dir of dirs) {
        for (const candidate of [resolve(dir, source), resolve(dir, `${source}.js`)]) {
          if (existsSync(candidate) && statSync(candidate).isFile())
            return candidate
        }
      }
      return null
    },
  }
}

const lib = name => resolve('libraries', name)

export default defineConfig({
  plugins: [browserifyPaths()],
  // grunt-browserify's 8 name aliases (the components have no common_page).
  resolve: {
    alias: {
      pulseConfig: lib('pulse.config.js'),
      pulseLogin: lib('pulse.login.js'),
      pulseService: lib('pulse.service.js'),
      pulseUtility: lib('pulse.utility.js'),
      pulseSvg: lib('pulse.svg.js'),
      pulseRange: lib('pulse.range.js'),
      pulseCustomDialog: lib('pulse.customdialog.js'),
      eventBus: lib('EventBus.js'),
    },
  },
  // The pulse.customdialog singleton stores itself on `global` (browserify shim).
  define: { global: 'globalThis' },
  build: {
    emptyOutDir: false,
    minify: false,
    commonjsOptions: {
      include: [/node_modules/, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))],
      transformMixedEsModules: true,
    },
  },
})
