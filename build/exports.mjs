// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// build-exports.mjs — port of the grunt 'exports' task (clean:exports +
// browserify:exportsjs + lessThemes:exports + obfuscator:exports) to the Vite-era
// toolchain. The grunt version is broken on vite-vue: pulse.exports.light.js was
// migrated to ESM, which grunt-browserify (script parser) can't read.
//
// Produces the DISTRIBUTABLE Pulse-web-components bundle — for embedding the x-*
// components in EXTERNAL apps (reporting, custom pages): one obfuscated classic
// (IIFE) script + one self-contained CSS + the images. Output -> about/exports/.
//   node build-exports.mjs           obfuscated (like grunt)
//   node build-exports.mjs --no-obf  readable (debug)
//
// CSS = the bridge (theme.less prepended), with theme-colors INLINED so the file is
// self-contained: the consumer includes one CSS and toggles `.dark` on <html>.
// (The old two-theme style_dark/light model can't be rebuilt: the migrated component
// .less now require the bridge's precomputed var(--color_*_lightenN) variants.)

import esbuild from 'esbuild'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, cpSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const PWC = resolve('.')
const lib = resolve(PWC, 'libraries')
const out = resolve(PWC, 'about/exports')
const obfuscate = !process.argv.includes('--no-obf')

// Same resolution as the demo/app builds (pulse.* aliases + dir lookup).
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
const pwcPaths = {
  name: 'pwc-paths',
  setup (build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      const s = args.path
      if (NAME_ALIASES[s]) return { path: NAME_ALIASES[s] }
      if (s.startsWith('.') || s.startsWith('@') || isAbsolute(s)) return null // relative / scoped-npm
      for (const dir of [lib, PWC]) {
        for (const c of [resolve(dir, s), resolve(dir, `${s}.js`)]) {
          if (existsSync(c) && statSync(c).isFile()) return { path: c }
        }
      }
      return null // bare npm (markdown-it…)
    })
  },
}

rmSync(out, { recursive: true, force: true })
mkdirSync(resolve(out, 'scripts'), { recursive: true })
mkdirSync(resolve(out, 'styles'), { recursive: true })

// --- 1. JS : esbuild classic IIFE (embeddable <script>) (+ obfuscation) ---
const res = await esbuild.build({
  entryPoints: [resolve(lib, 'pulse.exports.light.js')],
  bundle: true,
  format: 'iife',
  loader: { '.json': 'json' },
  minify: true,
  logLevel: 'error',
  write: false,
  plugins: [pwcPaths],
})
let js = res.outputFiles[0].text
if (obfuscate) js = JavaScriptObfuscator.obfuscate(js).getObfuscatedCode()
writeFileSync(resolve(out, 'scripts/pulse.exports.light.js'), js)

// --- 2. CSS : bridge (theme.less prepended) + theme-colors inlined (self-contained) ---
execSync(`node "${resolve(lib, 'build-theme.mjs')}"`, { stdio: 'inherit' }) // regen the bridge
const LESSC = resolve(PWC, 'node_modules/.bin/lessc')
const INC = [PWC, lib, resolve(lib, 'themes')].join(':')
const wrapper = resolve(out, '_exports.less')
writeFileSync(wrapper, `@import (once) "theme.less";\n@import (once) "${resolve(lib, 'pulse.exports.light.less')}";\n`)
const compCss = execSync(`"${LESSC}" --include-path="${INC}" --modify-var="imagedir=../images" "${wrapper}"`, { encoding: 'utf8' })
const themeColors = execSync(`"${LESSC}" "${resolve(lib, 'themes/theme-colors.less')}"`, { encoding: 'utf8' })
  .replaceAll('../../images/', '../images/')
writeFileSync(resolve(out, 'styles/pulse.exports.light.css'), `${themeColors}\n${compCss}`)
rmSync(wrapper)

// --- 3. images (referenced by the component CSS via ../images) ---
cpSync(resolve(PWC, 'images'), resolve(out, 'images'), { recursive: true })

process.stdout.write(`Built exports -> about/exports/  (JS ${obfuscate ? 'obfuscated' : 'readable'} + self-contained CSS + images)\n`)
