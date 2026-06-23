// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// One-shot codemod: migrate the Pulse sources from CommonJS to ESM.
//   node pomamo-web-components/libraries/codemod-cjs-to-esm.mjs --report   (dry run)
//   node pomamo-web-components/libraries/codemod-cjs-to-esm.mjs --apply    (rewrite)
// Run from the atracking-web root (or anywhere: paths resolve from this file).
//
// Scope (the bundled module graph only — classic <script> files like theme-init,
// pulse-shell, config_*/translation_* globals are NOT modules and are excluded):
//   - pomamo-web-components/libraries/*.js  (minus config_component*/translation_component*)
//   - pomamo-web-components/x-*/*.js        (component files; demo/ subdirs excluded)
//   - pomamo-web-app/src/pages/*/*.js       (page entries)
//   - pomamo-web-app/src/scripts/{common,common_page,custom_page,custom_page_with_machines,vue_bridge}.js
//
// Method: two passes.
//   1. Registry: classify every module's export style (default / named / none) so
//      imports can be rewritten correctly (`import X` needs a default export;
//      namespace-style consumers get `import * as X`). External npm specifiers
//      default to `import X from` (commonjs interop default).
//   2. Rewrite, top-level statements only:
//      var X = require('m')        -> import X from 'm' | import * as X from 'm'
//      require('m')                -> import 'm'
//      module.exports = expr       -> export default expr
//      var N =\n  exports.N = ...  -> export var N = ...   (wrap style)
//      var N = exports.N = ...     -> export var N = ...
//      exports.N = function (      -> export function N (
//      exports.N = <expr>          -> export const N = <expr>
//      global.                     -> globalThis.
//      Anything left (nested require/exports, renames) is FLAGGED for manual work.

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PWC = resolve(ROOT, 'pomamo-web-components')
const APP = resolve(ROOT, 'pomamo-web-app')

const APPLY = process.argv.includes('--apply')

// ---------------------------------------------------------------- collect set
function listDir (dir, filter) {
  return existsSync(dir)
    ? readdirSync(dir).filter(filter).map(f => join(dir, f))
    : []
}

const files = []
// component libraries (classic-script globals excluded: they are not modules)
files.push(...listDir(join(PWC, 'libraries'),
  f => f.endsWith('.js') && !/^(config_component|translation_component)/.test(f)))
// x-* component files (depth 1 only -> demo/ subdirs excluded)
for (const entry of readdirSync(PWC)) {
  if (entry.startsWith('x-') && statSync(join(PWC, entry)).isDirectory()) {
    files.push(...listDir(join(PWC, entry), f => f.endsWith('.js')))
  }
}
// app pages
const pagesDir = join(APP, 'src/pages')
for (const entry of readdirSync(pagesDir)) {
  const dir = join(pagesDir, entry)
  if (statSync(dir).isDirectory()) {
    files.push(...listDir(dir, f => f.endsWith('.js')))
  }
}
// app bundled scripts (whitelist; the rest of src/scripts are classic public scripts)
for (const name of ['common.js', 'common_page.js', 'custom_page.js', 'custom_page_with_machines.js', 'vue_bridge.js']) {
  const f = join(APP, 'src/scripts', name)
  if (existsSync(f)) files.push(f)
}

// ------------------------------------------------------- pass 1: the registry
// Mirrors the vite.config browserify-paths resolution (aliases + lookup dirs).
const NAME_ALIASES = {
  pulseUtility: join(PWC, 'libraries/pulse.utility.js'),
  pulseConfig: join(PWC, 'libraries/pulse.config.js'),
  pulseLogin: join(PWC, 'libraries/pulse.login.js'),
  pulseService: join(PWC, 'libraries/pulse.service.js'),
  pulseRange: join(PWC, 'libraries/pulse.range.js'),
  pulseSvg: join(PWC, 'libraries/pulse.svg.js'),
  pulseCustomDialog: join(PWC, 'libraries/pulse.customdialog.js'),
  eventBus: join(PWC, 'libraries/EventBus.js'),
  pulsePage: join(APP, 'src/scripts/common_page.js'),
}
const LOOKUP_DIRS = [join(APP, 'src/scripts'), join(PWC, 'libraries'), PWC]

function resolveSpecifier (spec, importer) {
  if (NAME_ALIASES[spec]) return NAME_ALIASES[spec]
  if (spec.startsWith('.')) {
    for (const c of [resolve(dirname(importer), spec), resolve(dirname(importer), `${spec}.js`)]) {
      if (existsSync(c) && statSync(c).isFile()) return c
    }
    return null
  }
  for (const dir of LOOKUP_DIRS) {
    for (const c of [resolve(dir, spec), resolve(dir, `${spec}.js`)]) {
      if (existsSync(c) && statSync(c).isFile()) return c
    }
  }
  return null // external (npm)
}

// Export style per file: 'default' | 'named' | 'mixed' | 'none'
const registry = new Map()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const hasDefault = /^module\.exports\s*=/m.test(src)
  const hasNamed = /^exports\.\w+\s*=/m.test(src)
    || /^(?:var|let|const)\s+\w+\s*=\s*exports\.\w+\s*=/m.test(src)
    || /^(?:var|let|const)\s+\w+\s*=[ \t]*\r?\n[ \t]+exports\.\w+\s*=/m.test(src)
  registry.set(f, hasDefault && hasNamed ? 'mixed' : hasDefault ? 'default' : hasNamed ? 'named' : 'none')
}

// ------------------------------------------------------------ pass 2: rewrite
const stats = { imports: 0, sideEffectImports: 0, namedExports: 0, defaultExports: 0, globals: 0 }
const flags = []
const externals = new Set()

function rewrite (file) {
  let src = readFileSync(file, 'utf8')

  // wrap style: `var N =\n  exports.N = ...` -> `export var N = ...`
  src = src.replace(/^(?:var|let|const)\s+(\w+)\s*=[ \t]*\r?\n[ \t]+exports\.\1\s*=\s*/gm, (m, name) => {
    stats.namedExports++
    return `export var ${name} = `
  })

  // import: `var X = require('m');` (kind-aware)
  src = src.replace(/^(?:var|let|const)\s+(\w+)\s*=\s*require\((['"])([^'"]+)\2\)\s*;?[ \t]*(\/\/.*)?$/gm,
    (m, name, q, spec, comment) => {
      stats.imports++
      const target = resolveSpecifier(spec, file)
      const kind = target ? registry.get(target) : 'external'
      if (!target) externals.add(spec)
      if (kind === 'mixed') flags.push(`${file}: import of MIXED-export module '${spec}'`)
      const form = (kind === 'default' || kind === 'external')
        ? `import ${name} from '${spec}';`
        : `import * as ${name} from '${spec}';`
      return comment ? `${form} ${comment}` : form
    })

  // side-effect import: `require('m');`
  src = src.replace(/^require\((['"])([^'"]+)\1\)\s*;?[ \t]*(\/\/.*)?$/gm, (m, q, spec, comment) => {
    stats.sideEffectImports++
    return comment ? `import '${spec}'; ${comment}` : `import '${spec}';`
  })

  // default export
  src = src.replace(/^module\.exports\s*=\s*(.+?);?[ \t]*$/gm, (m, expr) => {
    stats.defaultExports++
    return `export default ${expr};`
  })

  // `var N = exports.N = ...` (single line)
  src = src.replace(/^(?:var|let|const)\s+(\w+)\s*=\s*exports\.\1\s*=\s*/gm, (m, name) => {
    stats.namedExports++
    return `export var ${name} = `
  })

  // `exports.N = function N (` (named expression, names must match)
  src = src.replace(/^exports\.(\w+)\s*=\s*function\s+(\w+)\s*\(/gm, (m, name, fnName) => {
    if (name !== fnName) {
      flags.push(`${file}: exports.${name} = function ${fnName} (name mismatch)`)
      return m
    }
    stats.namedExports++
    return `export function ${name} (`
  })

  // `exports.N = function (`
  src = src.replace(/^exports\.(\w+)\s*=\s*function\s*\(/gm, (m, name) => {
    stats.namedExports++
    return `export function ${name} (`
  })

  // `exports.N = <expr>` (everything else)
  src = src.replace(/^exports\.(\w+)\s*=\s*/gm, (m, name) => {
    stats.namedExports++
    return `export const ${name} = `
  })

  // browserify's `global` shim -> the standard
  src = src.replace(/\bglobal\./g, () => {
    stats.globals++
    return 'globalThis.'
  })

  // flag what is left (skip pure comment lines)
  src.split('\n').forEach((line, i) => {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
    if (/\brequire\(/.test(line) || /\bexports\./.test(line) || /\bmodule\.exports/.test(line)) {
      flags.push(`${file}:${i + 1}: ${t.slice(0, 90)}`)
    }
  })

  return src
}

let changed = 0
for (const f of files) {
  const out = rewrite(f)
  if (out !== readFileSync(f, 'utf8')) {
    changed++
    if (APPLY) writeFileSync(f, out)
  }
}

// --------------------------------------------------------------------- report
const w = process.stdout.write.bind(process.stdout)
w(`${APPLY ? 'APPLIED' : 'DRY RUN'} — ${files.length} files in scope, ${changed} rewritten\n`)
w(`  imports: ${stats.imports} | side-effect imports: ${stats.sideEffectImports}`
  + ` | named exports: ${stats.namedExports} | default exports: ${stats.defaultExports}`
  + ` | global.->globalThis.: ${stats.globals}\n`)
const kinds = {}
for (const k of registry.values()) kinds[k] = (kinds[k] || 0) + 1
w(`  module kinds: ${JSON.stringify(kinds)}\n`)
w(`  external npm specifiers: ${[...externals].sort().join(', ') || '(none)'}\n`)
w(`\nFLAGS (manual work): ${flags.length}\n`)
for (const f of flags) w(`  ! ${f}\n`)
