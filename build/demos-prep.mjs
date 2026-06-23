// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Demo build "prep": everything before Vite — discover demos, bake the per-page
// HTML (template_demo.html + partials + pagename), stage the public assets, and
// compile each demo's LESS once with the shared theme bridge. Shared by the
// production build (build-demos.mjs -> Vite build) and the dev server
// (vite.demos.dev.config.mjs -> Vite serve with HMR).
//
//   node build-demos-prep.mjs [filter]   run standalone (used by the dev script)

import {
  readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, cpSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PWC = resolve(fileURLToPath(new URL('..', import.meta.url))) // repo root (this file lives in build/)
export const stagingPages = resolve(PWC, 'dist-demos-pages')
export const publicDir = resolve(PWC, 'dist-demos-public')

export function prepDemos (filter = null) {
  // -------------------------------------------------------------- discover
  const demos = []
  for (const entry of readdirSync(PWC)) {
    if (!entry.startsWith('x-') || !statSync(resolve(PWC, entry)).isDirectory()) continue
    const name = entry.slice(2) // x-foo -> foo
    const js = resolve(PWC, entry, 'demo', `${name}.js`)
    const html = resolve(PWC, entry, 'demo', 'demo.html')
    if (existsSync(js) && existsSync(html) && (!filter || name.includes(filter))) {
      demos.push({ entry, name })
    }
  }
  if (demos.length === 0) {
    process.stderr.write(`no demo matched ${filter ? `"${filter}"` : ''}\n`)
    process.exit(1)
  }

  // --------------------------------------------------------- 1. bake HTML
  const tpl = readFileSync(resolve(PWC, 'demo/template_demo.html'), 'utf8')
  const bake = (name) => tpl
    .replaceAll('{{pagename}}', name)
    // partials: <!--(bake /x-name/demo/foo.html)--> -> file content (pwc-root relative)
    .replace(/<!--\(bake\s+(.+?)\)-->/g, (_, rel) => {
      const f = resolve(PWC, rel.trim().replace(/^\//, ''))
      return existsSync(f) ? readFileSync(f, 'utf8') : ''
    })
  rmSync(stagingPages, { recursive: true, force: true })
  mkdirSync(stagingPages, { recursive: true })
  for (const d of demos) writeFileSync(resolve(stagingPages, `${d.name}.html`), bake(d.name))
  // landing page (its own static file, no partials) — only on a full prep
  const withIndex = !filter && existsSync(resolve(PWC, 'demo/index.html'))
  if (withIndex) {
    writeFileSync(resolve(stagingPages, 'index.html'),
      readFileSync(resolve(PWC, 'demo/index.html'), 'utf8').replaceAll('{{pagename}}', 'index'))
  }

  // ---------------------------------------------------- 2. public assets
  rmSync(publicDir, { recursive: true, force: true })
  const cp = (from, to) => { mkdirSync(resolve(publicDir, to, '..'), { recursive: true }); cpSync(resolve(PWC, from), resolve(publicDir, to)) }
  // jQuery is gone: nothing live uses $() any more (only dead commented code remains).
  cp('node_modules/@bower_components/momentjs/min/moment-with-locales.min.js', 'lib/moment/moment.js')
  cp('node_modules/d3/dist/d3.min.js', 'lib/d3/d3.min.js')
  // classic config / translation globals (NOT modules)
  const scriptsOut = resolve(publicDir, 'scripts')
  mkdirSync(scriptsOut, { recursive: true })
  for (const dir of ['libraries', 'demo']) {
    for (const f of readdirSync(resolve(PWC, dir)).filter(n => /^(config|translation).*\.js$/.test(n))) {
      cpSync(resolve(PWC, dir, f), resolve(scriptsOut, f))
    }
  }
  // images: shared pwc dir + per-demo images (flattened)
  const imagesOut = resolve(publicDir, 'images')
  mkdirSync(imagesOut, { recursive: true })
  cpSync(resolve(PWC, 'images'), imagesOut, { recursive: true })
  for (const d of demos) {
    const imgDir = resolve(PWC, d.entry, 'demo/images')
    if (existsSync(imgDir)) for (const f of readdirSync(imgDir)) cpSync(resolve(imgDir, f), resolve(imagesOut, f))
  }

  // ------------------------------------------------ 3. CSS (compile-once)
  execSync(`node "${resolve(PWC, 'libraries/build-theme.mjs')}"`, { stdio: 'inherit' })
  const stylesOut = resolve(publicDir, 'styles')
  mkdirSync(stylesOut, { recursive: true })
  const LESSC = resolve(PWC, 'node_modules/.bin/lessc')
  const INC = [PWC, resolve(PWC, 'demo'), resolve(PWC, 'libraries'), resolve(PWC, 'libraries/themes')].join(':')
  // imagedir is RELATIVE (../images from the /styles/ dir) so the compiled url()s
  // resolve everywhere: Vite build, dev server, AND file:// (where /images would
  // point at the disk root). Same target as /images on a server (styles/../images).
  const lessc = (src, out) => execSync(`"${LESSC}" --include-path="${INC}" --modify-var="imagedir=../images" "${src}" "${out}"`, { stdio: 'pipe' })
  let cssOk = 0
  const cssFail = []
  for (const d of demos) {
    const src = resolve(PWC, d.entry, 'demo', `${d.name}.less`)
    if (!existsSync(src)) continue // some demos have no own less
    try { lessc(src, resolve(stylesOut, `${d.name}.css`)); cssOk++ }
    catch (err) {
      const msg = String(err.stderr || err.message).split('\n').find(l => /error|undefined|not found/i.test(l)) || ''
      cssFail.push({ name: d.name, msg: msg.trim().slice(0, 90) })
    }
  }
  if (withIndex) lessc(resolve(PWC, 'demo/demo.less'), resolve(stylesOut, 'index.css'))
  // color values (one file: :root = light, html.dark = dark) — no bridge prepend
  const themeColors = resolve(stylesOut, 'theme-colors.css')
  execSync(`"${LESSC}" "${resolve(PWC, 'libraries/themes/theme-colors.less')}" "${themeColors}"`, { stdio: 'pipe' })
  // theme-colors.less hardcodes the body background as ../../images/... — fine when
  // served from a root (../../ clamps to /images), but in file:// it escapes the
  // demo dir (-> about/images, missing -> white bands). Rewrite to ../images so it
  // resolves from styles/ everywhere (server, dev AND file://).
  writeFileSync(themeColors, readFileSync(themeColors, 'utf8').replaceAll('../../images/', '../images/'))
  process.stdout.write(`CSS: ${cssOk} compilées, ${cssFail.length} échec(s)\n`)
  for (const f of cssFail.slice(0, 15)) process.stdout.write(`  ✗ ${f.name}: ${f.msg}\n`)

  return { demos, withIndex }
}

// CLI entry (used by the dev script)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { demos } = prepDemos(process.argv[2] || null)
  process.stdout.write(`prep: ${demos.length} demo(s) -> dist-demos-pages/ + dist-demos-public/\n`)
}
