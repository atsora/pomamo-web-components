// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Pure-Vite PRODUCTION build of the component demos — replaces the grunt chain
// (copy:demo* + browserify:demojs + lessThemes:demo + bakedemo).
//
//   node build-demos.mjs              build every demo  -> about/demo/
//   node build-demos.mjs currenttool  build only demos whose name matches (pilot)
//
// prep (build-demos-prep.mjs) bakes the HTML + stages public assets + compiles the
// CSS; then Vite bundles the ESM entries + the CJS mocks, hashes and minifies.

import { build } from 'vite'
import { resolve } from 'node:path'
import { prepDemos, stagingPages, publicDir } from './demos-prep.mjs'

const PWC = resolve('.')
const filter = process.argv[2] || null

const { demos, withIndex } = prepDemos(filter)

const input = Object.fromEntries(demos.map(d => [d.name, resolve(stagingPages, `${d.name}.html`)]))
if (withIndex) input.index = resolve(stagingPages, 'index.html')

await build({
  configFile: resolve(PWC, 'vite.demos.config.mjs'),
  root: stagingPages,
  publicDir,
  logLevel: 'warn',
  build: { outDir: resolve(PWC, 'about/demo'), emptyOutDir: true, rollupOptions: { input } },
})
process.stdout.write(`\nBuilt ${demos.length} demo(s) -> about/demo/\n`)
