// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// "file://" build of the component demos — the portable, double-clickable variant
// (the old grunt/browserify behaviour). Same modern toolchain as the rest: it uses
// esbuild (the bundler Vite already ships) but asks it for CLASSIC scripts (IIFE)
// instead of ES modules, and relative asset paths — so a demo .html opens straight
// from disk (no server), and still works when served.
//
//   node build-demos-file.mjs [filter]   -> about/demo-file/
//
// Reuses build-demos-prep.mjs for the bake inputs / public assets / compiled CSS
// (CSS already uses a relative ../images, so it works from file:// too).

import esbuild from 'esbuild'
import {
  readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, cpSync,
} from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { prepDemos, publicDir } from './demos-prep.mjs'

const PWC = resolve('.')
const lib = resolve(PWC, 'libraries')
const out = resolve(PWC, 'about/demo-file')
const filter = process.argv[2] || null

// Same resolution as vite.demos.config's demoPaths, for esbuild.
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
const demoPathsPlugin = {
  name: 'demo-paths',
  setup (build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      const s = args.path
      if (NAME_ALIASES[s]) return { path: NAME_ALIASES[s] }
      // relative / absolute / scoped-npm (@atsora mocks…) -> esbuild's own resolver
      if (s.startsWith('.') || s.startsWith('@') || isAbsolute(s)) return null
      for (const dir of [lib, PWC]) {
        for (const c of [resolve(dir, s), resolve(dir, `${s}.js`)]) {
          if (existsSync(c) && statSync(c).isFile()) return { path: c }
        }
      }
      return null // bare npm dep (d3, markdown-it…)
    })
  },
}

// --- prep (bake inputs + public assets + compiled CSS, shared with the other builds)
const { demos, withIndex } = prepDemos(filter)

// --- 1. copy the public assets (lib / classic config scripts / styles / images)
rmSync(out, { recursive: true, force: true })
cpSync(publicDir, out, { recursive: true }) // -> out/{lib,scripts,styles,images}

// --- 2. esbuild: one classic IIFE per entry (common_demo + every demo entry)
const entryPoints = [
  resolve(PWC, 'demo/common_demo.js'),
  ...demos.map(d => resolve(PWC, d.entry, 'demo', `${d.name}.js`)),
]
await esbuild.build({
  entryPoints,
  bundle: true,
  format: 'iife',         // classic <script>, runs from file:// (no module CORS)
  outdir: resolve(out, 'scripts'),
  entryNames: '[name]',   // -> scripts/common_demo.js, scripts/<name>.js
  loader: { '.json': 'json' },
  minify: true,
  logLevel: 'error',
  plugins: [demoPathsPlugin],
})

// --- 3. bake each page: relative paths + classic (non-module) script tags
const tpl = readFileSync(resolve(PWC, 'demo/template_demo.html'), 'utf8')
function toFileHtml (html, name) {
  html = html.replace(/<!--\(bake\s+(.+?)\)-->/g, (_, rel) => {
    const f = resolve(PWC, rel.trim().replace(/^\//, ''))
    return existsSync(f) ? readFileSync(f, 'utf8') : ''
  })
  // absolute public refs -> relative (so file:// resolves them against the page)
  html = html.replaceAll('"/lib/', '"./lib/').replaceAll('"/scripts/', '"./scripts/').replaceAll('"/styles/', '"./styles/')
  // module entries -> classic scripts pointing at the IIFE bundles
  html = html.replace('<script type="module" src="../demo/common_demo.js"></script>', '<script src="./scripts/common_demo.js"></script>')
  html = html.replace(new RegExp(`<script type="module" src="\\.\\./x-${name}/demo/${name}\\.js"></script>`),
    `<script src="./scripts/${name}.js"></script>`)
  return html
}
mkdirSync(out, { recursive: true })
for (const d of demos) {
  writeFileSync(resolve(out, `${d.name}.html`), toFileHtml(tpl.replaceAll('{{pagename}}', d.name), d.name))
}
if (withIndex) {
  // index.html is its own static file (only the common_demo module + relative deps)
  let idx = readFileSync(resolve(PWC, 'demo/index.html'), 'utf8').replaceAll('{{pagename}}', 'index')
  idx = idx.replaceAll('"/lib/', '"./lib/').replaceAll('"/scripts/', '"./scripts/').replaceAll('"/styles/', '"./styles/')
  idx = idx.replace('<script type="module" src="../demo/common_demo.js"></script>', '<script src="./scripts/common_demo.js"></script>')
  writeFileSync(resolve(out, 'index.html'), idx)
}

process.stdout.write(`\nBuilt ${demos.length} demo(s) -> about/demo-file/ (double-clickable file://)\n`)
