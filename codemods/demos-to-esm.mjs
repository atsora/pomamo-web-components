// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// One-shot: migrate the demo entries (x-*/demo/*.js + demo/common_demo.js +
// demo/scripts/*.js) from CommonJS to ESM. The general codemod
// (libraries/codemod-cjs-to-esm.mjs) deliberately excludes demo/ — and re-running
// it over the already-ESM module graph would misclassify those modules. The demo
// entries are trivial and uniform (only top-level requires, zero module.exports),
// so this dedicated rewrite is safer:
//   var X = require('m')   -> import * as X from 'm'   (every assigned require is a
//                                                       pulse lib with named exports)
//   require('m')           -> import 'm'               (side-effect: component / mock)
//   'node_modules/<pkg>'   -> '<pkg>'                  (bare specifier for Vite)
//   --report (default) / --apply
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PWC = resolve(dirname(fileURLToPath(import.meta.url)), '..') // repo root (this file lives in codemods/)
const APPLY = process.argv.includes('--apply')

const files = []
for (const entry of readdirSync(PWC)) {
  if (entry.startsWith('x-') && statSync(join(PWC, entry)).isDirectory()) {
    const demo = join(PWC, entry, 'demo')
    if (existsSync(demo)) {
      files.push(...readdirSync(demo).filter(f => f.endsWith('.js')).map(f => join(demo, f)))
    }
  }
}
const commonDemo = join(PWC, 'demo/common_demo.js')
if (existsSync(commonDemo)) files.push(commonDemo)
const demoScripts = join(PWC, 'demo/scripts')
if (existsSync(demoScripts)) {
  files.push(...readdirSync(demoScripts).filter(f => f.endsWith('.js')).map(f => join(demoScripts, f)))
}

const strip = s => s.replace(/^node_modules\//, '')
const ASSIGNED = /^([ \t]*)var\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)\s*;?[ \t]*$/gm
const SIDE = /^([ \t]*)require\(\s*['"]([^'"]+)['"]\s*\)\s*;?[ \t]*$/gm

let changed = 0
let imp = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  if (!/\brequire\(/.test(src)) continue
  let out = src.replace(ASSIGNED, (_, ind, name, spec) => {
    imp++
    return `${ind}import * as ${name} from '${strip(spec)}';`
  })
  out = out.replace(SIDE, (_, ind, spec) => {
    imp++
    return `${ind}import '${strip(spec)}';`
  })
  if (out !== src) {
    changed++
    if (APPLY) writeFileSync(f, out)
  }
  // flag any require left behind (nested / unusual)
  if (/\brequire\(/.test(out)) {
    process.stdout.write(`  ! require restant: ${f.replace(PWC + '/', '')}\n`)
  }
}

process.stdout.write(`${APPLY ? 'APPLIED' : 'REPORT'}: ${files.length} fichiers, ${changed} modifiés, ${imp} require->import\n`)
