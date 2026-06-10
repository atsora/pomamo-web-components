// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Grunt -> Vite migration driver for the components repo: rebuild the 3 browserify
// targets (exports / demos / live) as self-contained iife bundles with Vite, into
// dist-vite/ (parallel to Grunt). Mirrors grunt-browserify's entries + flatten.

import { readdirSync, statSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { build } from 'vite'

const root = resolve('.')
const ls = dir => { try { return readdirSync(dir) } catch { return [] } }
const isDir = p => { try { return statSync(p).isDirectory() } catch { return false } }

function walkJs(dir, acc = []) {
  for (const n of ls(dir)) {
    const p = resolve(dir, n)
    if (isDir(p)) walkJs(p, acc)
    else if (n.endsWith('.js')) acc.push(p)
  }
  return acc
}

const xdirs = ls(root).filter(n => n.startsWith('x-') && isDir(resolve(root, n)))

// exports: libraries/pulse.exports*.js -> about/exports/scripts/ (flatten)
const exportsEntries = ls('libraries')
  .filter(n => n.startsWith('pulse.exports') && n.endsWith('.js'))
  .map(n => ({ file: resolve('libraries', n), out: n }))

// demos: x-*/demo/*.js -> about/demo/scripts/ (flatten)
const demoEntries = xdirs.flatMap(x =>
  ls(resolve(root, x, 'demo')).filter(n => n.endsWith('.js'))
    .map(n => ({ file: resolve(root, x, 'demo', n), out: n })))

// live: live/**/*.js -> about/live/scripts/ (preserve structure)
const liveEntries = (isDir(resolve(root, 'live')) ? walkJs(resolve(root, 'live')) : [])
  .map(f => ({ file: f, out: relative(resolve(root, 'live'), f) }))

const targets = [
  { name: 'exports', dest: 'dist-vite/about/exports/scripts', entries: exportsEntries },
  { name: 'demos', dest: 'dist-vite/about/demo/scripts', entries: demoEntries },
  { name: 'live', dest: 'dist-vite/about/live/scripts', entries: liveEntries },
]

rmSync(resolve(root, 'dist-vite'), { recursive: true, force: true })

for (const t of targets) {
  let ok = 0
  const fails = []
  for (const e of t.entries) {
    try {
      await build({
        configFile: resolve(root, 'vite.config.mjs'),
        logLevel: 'error',
        build: {
          outDir: t.dest,
          emptyOutDir: false,
          rollupOptions: {
            input: { entry: e.file },
            output: { format: 'iife', entryFileNames: e.out, inlineDynamicImports: true },
          },
        },
      })
      ok++
    }
    catch (err) {
      fails.push({ out: e.out, msg: String(err.message).split('\n')[0] })
    }
  }
  process.stdout.write(`[${t.name}] ${ok}/${t.entries.length} OK, ${fails.length} échec(s)\n`)
  for (const f of fails.slice(0, 10))
    process.stdout.write(`   ✗ ${f.out}: ${f.msg}\n`)
  if (fails.length > 10)
    process.stdout.write(`   … +${fails.length - 10} autres\n`)
}
