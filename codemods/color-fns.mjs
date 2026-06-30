// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Bridge codemod (function-only): rewrite the LESS color FUNCTIONS that can't run
// on a CSS var, to the precomputed variant variables (which the bridge maps to
// var(--x_<fn><n>)). Plain @color_x usages are LEFT ALONE — the bridge handles them.
//   lighten(@x, 15%) / darken / fade  ->  @x_<fn><n>
// Usage: node codemod-color-fns.mjs <dir-or-file> [...]

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const variants = [
  ['color_highlight', 'lighten', 15], ['box_color', 'darken', 10], ['input_background_color', 'darken', 10],
  ['color_background_alternate', 'lighten', 15], ['color_window_alternate', 'darken', 10],
  ['color_window', 'lighten', 15], ['box_color', 'lighten', 10], ['color_window', 'darken', 5],
  ['color_window', 'lighten', 4], ['color_background_alternate', 'lighten', 10], ['color_window', 'darken', 4],
  ['input_background_color', 'lighten', 10], ['color_window_border', 'lighten', 15], ['color_window', 'lighten', 5],
  ['color_background_alternate', 'lighten', 35], ['color_background', 'lighten', 10], ['color_white', 'darken', 10],
  ['color_background', 'darken', 10],
  ['color_text', 'fade', 90], ['color_red', 'fade', 70], ['color_highlight', 'fade', 5],
  ['color_highlight', 'fade', 2], ['color_purple', 'fade', 50],
]

const SKIP = new Set(['node_modules', '.git', 'dist', 'dist-es2015', 'dist-vite', 'about', 'bower_components', 'live', 'ocamljs', 'ocaml'])
// dark/light = vestigial palette source; theme/theme-colors = generated.
const SKIP_FILES = new Set(['dark.less', 'light.less', 'theme.less', 'theme-colors.less'])
function lessFiles(p, acc = []) {
  const st = statSync(p)
  if (st.isFile()) { if (p.endsWith('.less') && !SKIP_FILES.has(p.split('/').pop())) acc.push(p); return acc }
  for (const n of readdirSync(p)) { if (!SKIP.has(n)) lessFiles(join(p, n), acc) }
  return acc
}

function rewrite(src) {
  let s = src
  for (const [v, fn, n] of variants)
    s = s.replace(new RegExp(`${fn}\\(\\s*@${v}\\s*,\\s*${n}\\s*%?\\s*\\)`, 'g'), `@${v}_${fn}${n}`)
  return s
}

let touched = 0
const files = process.argv.slice(2).flatMap(p => lessFiles(p))
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const out = rewrite(src)
  if (out !== src) { writeFileSync(f, out); touched++ }
}
process.stdout.write(`${touched}/${files.length} .less files rewritten (color functions)\n`)
