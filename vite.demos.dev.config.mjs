// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0
//
// Dev server for the component demos — the Vite payoff for the demos: native ESM
// serving with HMR. Edit a component (x-foo/x-foo.js) and the demo reloads, no
// rebuild. Run the prep once, then start:
//   node build/demos-prep.mjs [filter] && vite --config vite.demos.dev.config.mjs
//
// root = the package itself, so the baked HTML's file-relative module entries
// (../demo/common_demo.js, ../x-foo/demo/foo.js) resolve against the real tree
// with no aliasing. The baked pages live at /dist-demos-pages/<name>.html; the
// classic head deps + compiled CSS are served from publicDir (dist-demos-public).

import { resolve, basename } from 'node:path'
import { readdirSync, existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import { demoPaths } from './vite.demos.config.mjs'

const PWC = resolve('.')

// Serve the baked pages at clean URLs: /foo.html -> /dist-demos-pages/foo.html,
// / -> the landing. The page's file-relative module entries (../x-foo/…, ../demo/…)
// still resolve correctly against root=PWC from the browser's /foo.html base.
function prettyUrls () {
  return {
    name: 'demo-pretty-urls',
    configureServer (server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '') req.url = '/dist-demos-pages/index.html'
        else if (/^\/[a-z0-9_-]+\.html(\?.*)?$/i.test(req.url)) req.url = '/dist-demos-pages' + req.url
        next()
      })
    },
  }
}

// CSS HMR: pull each page's .less INTO the Vite module graph (replacing the static
// <link href="/styles/<name>.css">) so editing a component/demo .less hot-swaps the
// styles live, no reload. Dev only — the prod/file builds keep their compile-once
// CSS (build/demos-prep). Vite compiles the .less with the bridge on its include
// path; theme-colors.css (the var values) stays a plain <link>.
function cssHmr () {
  return {
    name: 'demo-css-hmr',
    transformIndexHtml: {
      order: 'pre',
      handler (html, ctx) {
        const name = basename(ctx.filename || ctx.path || '', '.html')
        let less = null
        if (existsSync(resolve(PWC, `x-${name}/demo/${name}.less`))) less = `/x-${name}/demo/${name}.less`
        else if (name === 'index') less = '/demo/demo.less'
        if (!less) return html
        // drop the static compiled stylesheet, import the .less instead (HMR-tracked)
        html = html.replace(new RegExp(`\\s*<link rel="stylesheet" href="/styles/${name}\\.css">`), '')
        return html.replace('</head>', `  <script type="module">import '${less}'</script>\n</head>`)
      },
    },
  }
}

// The REST mocks are CommonJS and must be pre-bundled (esbuild dep discovery is
// off — it doesn't run demoPaths' bare-specifier resolution). List every mock
// endpoint so they share ONE pre-bundled _helpers (single fetch interceptor +
// registry). The component sources are ESM and served on demand through the
// plugin chain; the few CJS npm deps (markdown-it…) are listed too.
const mockDir = resolve(PWC, 'node_modules/@atsora/pomamo-web-service-simulation/scripts')
const mocks = readdirSync(mockDir)
  .filter(f => f.endsWith('.js'))
  .map(f => `@atsora/pomamo-web-service-simulation/scripts/${f.replace(/\.js$/, '')}`)

export default defineConfig({
  root: PWC,
  publicDir: resolve(PWC, 'dist-demos-public'),
  plugins: [demoPaths(), prettyUrls(), cssHmr()],
  appType: 'mpa',
  css: {
    preprocessorOptions: {
      less: {
        // resolve the bridge (theme.less) + component/demo @imports, like the lessc CLI
        paths: [PWC, resolve(PWC, 'demo'), resolve(PWC, 'libraries'), resolve(PWC, 'libraries/themes')],
        modifyVars: { imagedir: '../images' }, // url(@{imagedir}/…) -> ../images (resolved by Vite)
      },
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [...mocks, 'markdown-it', 'd3-time-format'],
  },
  server: {
    port: 5191,
    fs: { allow: [PWC] },
  },
})
