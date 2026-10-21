#!/usr/bin/env node
/**
 * Live mode, end to end, on the apps a builder actually runs: a dev server on
 * localhost, `npx uisandbox-mcp open http://localhost:<port>` (the packed CLI,
 * mcp/dist), the page it opens, What we found, a look picked, hot reload, and
 * the kit's knobs carried along in the line (--carry), on the stage and in
 * each of the six looks; then the same app through the MCP tools an agent
 * uses (load, set, verify, screenshot, export).
 *
 *   pnpm mcp:build && node scripts/live-dev.mjs
 *
 * Four apps, written into .holdouts/live-apps (gitignored):
 *
 *   sb       SB Admin 2 on Vite: plain HTML, <link> stylesheets. Vite answers
 *            a bare .css request with a JS module; only a <link>'s Accept
 *            (text/css) gets the sheet. Unstyled, 1 value, until 0.5.3.
 *   react    Vite + React, CSS imported from JS, custom properties, a CSS module
 *   tw       Vite + React + Tailwind v4 (@tailwindcss/vite), shadcn's theme
 *            variables in oklch: what most AI-built apps are (npm install on
 *            the first run)
 *   static   the Bootstrap kit build on a plain python http.server, no Vite
 *
 * Every process is started with an argument list (execFileSync, spawn), never
 * through a shell.
 */
import { chromium } from 'playwright'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const work = join(root, '.holdouts', 'live-apps')
const cli = join(root, 'mcp', 'dist', 'server.mjs')
if (!existsSync(cli)) { console.error('No mcp/dist/server.mjs: run pnpm mcp:build first.'); process.exit(2) }
mkdirSync(work, { recursive: true })
const vite = join(root, 'node_modules', '.bin', 'vite')
// shadcn/ui turned to Brand #e11d48 and Shape ×1.8 (state/carry.ts carryToken)
const CARRY = 'N4IgdiBcIM4BYEMAmBjMB6ArgSxAGhAGsoBtEFABQCdsBbBKgT31gCMA6K5bTGEAXQIoooGKxEguSHn0gBGdgA4AvkOp0GzaAGIApnLlIALIpDLlQA'

const rows = []
const check = (app, name, pass, detail = '') => { rows.push({ app, name, pass, detail }); console.log(`${pass ? '✓' : '✗'} ${app}: ${name}${detail ? `  (${detail})` : ''}`) }
const procs = []
const up = async (url, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return true } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 300)) } return false }

// ── the apps ──────────────────────────────────────────────────────────────
const W = (dir, files) => { for (const [f, text] of Object.entries(files)) { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), text) } }
const emptyConfig = join(work, 'vite.empty.mjs'); writeFileSync(emptyConfig, 'export default {}\n')

const sbDir = join(work, 'sb', 'startbootstrap-sb-admin-2-master')
rmSync(join(work, 'sb'), { recursive: true, force: true }); mkdirSync(join(work, 'sb'), { recursive: true })
execFileSync('unzip', ['-q', '-o', join(root, 'fixtures', 'startbootstrap-sb-admin-2-master.zip'), '-d', join(work, 'sb')])

const reactDir = join(work, 'react')
rmSync(reactDir, { recursive: true, force: true })
W(reactDir, {
  'vite.config.mjs': `import react from ${JSON.stringify(join(root, 'node_modules', '@vitejs', 'plugin-react', 'dist', 'index.js'))}\nexport default { plugins: [react()] }\n`,
  'index.html': '<!doctype html><html><head><meta charset="utf-8"><title>Invoices</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',
  'src/main.jsx': `import { createRoot } from 'react-dom/client'\nimport './index.css'\nimport s from './Card.module.css'\nfunction App() { return <main><h1>Invoices</h1><div className={s.card}><p>Outstanding</p><b>€12,940.50</b><button className="primary">New invoice</button></div></main> }\ncreateRoot(document.getElementById('root')).render(<App />)\n`,
  'src/index.css': ':root { --brand: #7c3aed; --radius: 10px; --fg: #18181b; }\nbody { margin: 0; font: 15px/1.5 Georgia, serif; color: var(--fg); background: #fafafa; }\nmain { padding: 32px; }\n.primary { background: var(--brand); color: #fff; border: 0; border-radius: var(--radius); padding: 8px 14px; }\n',
  'src/Card.module.css': '.card { background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }\n',
})

const twDir = join(work, 'tw')
W(twDir, {
  'package.json': JSON.stringify({ name: 'tw', private: true, type: 'module' }),
  'vite.config.mjs': "import react from '@vitejs/plugin-react'\nimport tailwindcss from '@tailwindcss/vite'\nexport default { plugins: [react(), tailwindcss()] }\n",
  'index.html': '<!doctype html><html><head><meta charset="utf-8"><title>Ledger</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',
  'src/main.jsx': "import { createRoot } from 'react-dom/client'\nimport './index.css'\nfunction App() { return <main className=\"p-8 bg-background text-foreground min-h-screen\"><h1 className=\"text-2xl font-semibold\">Dashboard</h1><div className=\"mt-4 rounded-lg border border-border p-5 shadow-sm\"><p className=\"text-muted-foreground\">Revenue</p><b className=\"text-3xl\">€48,210.00</b><button className=\"mt-3 block rounded-md bg-primary px-4 py-2 text-primary-foreground\">New invoice</button></div></main> }\ncreateRoot(document.getElementById('root')).render(<App />)\n",
  'src/index.css': '@import "tailwindcss";\n:root { --background: oklch(1 0 0); --foreground: oklch(0.145 0 0); --primary: oklch(0.546 0.245 262.881); --primary-foreground: oklch(0.985 0 0); --muted-foreground: oklch(0.556 0 0); --border: oklch(0.922 0 0); --radius: 0.625rem; }\n@theme inline { --color-background: var(--background); --color-foreground: var(--foreground); --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground); --color-muted-foreground: var(--muted-foreground); --color-border: var(--border); --radius-lg: var(--radius); --radius-md: calc(var(--radius) - 2px); }\n',
})
if (!existsSync(join(twDir, 'node_modules', '@tailwindcss', 'vite'))) {
  console.log('installing Tailwind v4 for the tw app (first run)…')
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--silent', 'vite@8', 'react@19', 'react-dom@19', '@vitejs/plugin-react', 'tailwindcss@4', '@tailwindcss/vite@4'], { cwd: twDir, stdio: 'inherit' })
}

const staticDir = join(work, 'static')
rmSync(staticDir, { recursive: true, force: true }); mkdirSync(staticDir, { recursive: true })
execFileSync('unzip', ['-q', '-o', join(root, 'public', 'kits', 'bootstrap.zip'), '-d', staticDir])

const APPS = [
  { id: 'sb', port: 5411, brandEl: '.btn-primary', start: () => spawn(vite, [sbDir, '--port', '5411', '--strictPort', '--config', emptyConfig], { stdio: 'ignore' }),
    probe: () => { const s = document.querySelector('.sidebar'); return s ? getComputedStyle(s).backgroundImage : 'none' }, styled: (v) => /linear-gradient/.test(v),
    hot: { file: join(sbDir, 'css', 'sb-admin-2.min.css'), add: '\n.sidebar-brand-text{letter-spacing:7px}\n', read: () => getComputedStyle(document.querySelector('.sidebar-brand-text')).letterSpacing, want: '7px' } },
  { id: 'react', port: 5412, brandEl: '.primary', start: () => spawn(vite, ['--port', '5412', '--strictPort'], { cwd: reactDir, stdio: 'ignore' }),
    probe: () => { const b = document.querySelector('.primary'); return b ? getComputedStyle(b).backgroundColor : 'none' }, styled: (v) => v === 'rgb(124, 58, 237)',
    hot: { file: join(reactDir, 'src', 'index.css'), replace: ['--fg: #18181b', '--fg: #0f766e'], read: () => getComputedStyle(document.body).color, want: 'rgb(15, 118, 110)' } },
  { id: 'tw', port: 5413, brandEl: 'button', start: () => spawn(join(twDir, 'node_modules', '.bin', 'vite'), ['--port', '5413', '--strictPort'], { cwd: twDir, stdio: 'ignore' }),
    probe: () => { const b = document.querySelector('button'); return b ? getComputedStyle(b).backgroundColor : 'none' }, styled: (v) => /oklch|rgb\(/.test(v) && !/rgba\(0, 0, 0, 0\)/.test(v),
    hot: { file: join(twDir, 'src', 'index.css'), replace: ['--foreground: oklch(0.145 0 0)', '--foreground: oklch(0.5 0.15 150)'], read: () => getComputedStyle(document.querySelector('main')).color, want: /oklch\(0\.5 0\.15 150\)/ } },
  { id: 'static', port: 5414, brandEl: '.btn-primary', start: () => spawn('python3', ['-m', 'http.server', '5414', '--directory', join(staticDir, 'bootstrap')], { stdio: 'ignore' }),
    probe: () => { const b = document.querySelector('.btn-primary'); return b ? getComputedStyle(b).backgroundColor : 'none' }, styled: (v) => /^rgb\((?!0, 0, 0\))/.test(v) },
]

const moved = (page) => page.evaluate(() => Number(/(\d+) values? moved/.exec(document.querySelector('.stage__foot')?.textContent ?? '')?.[1] ?? 0))
const browser = await chromium.launch()
try {
  for (const app of APPS) {
    const p = app.start(); procs.push(p)
    const url = `http://localhost:${app.port}/`
    if (!(await up(url))) { check(app.id, 'the dev server starts', false); continue }
    for (const carry of [false, true]) {
      const tag = carry ? `${app.id}+carry` : app.id
      const c = spawn('node', [cli, 'open', url, '--no-browser', ...(carry ? [`--carry=${CARRY}`] : [])], { stdio: ['ignore', 'pipe', 'pipe'] }); procs.push(c)
      const opened = await new Promise((res) => { let out = ''; const t = setTimeout(() => res(null), 60000); c.stdout.on('data', (d) => { out += d; const m = out.match(/UISandbox is open: (\S+)/); if (m) { clearTimeout(t); res(m[1]) } }); c.on('exit', () => res(null)) })
      if (!opened) { check(tag, 'the line opens the sandbox', false); c.kill(); continue }
      const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage()
      const frame = () => page.frames().find((f) => f !== page.mainFrame() && /__sb=/.test(f.url()) && f.parentFrame() === page.mainFrame())
      try {
        await page.goto(opened, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('.found__facts', { timeout: 60000 })
        await page.waitForTimeout(3000)
        const facts = await page.evaluate(() => [...document.querySelectorAll('.found__facts dt')].map((d) => d.textContent.trim()))
        check(tag, 'What we found shows', facts.length === 4, facts.join(' · '))
        if (!carry) check(tag, 'its CSS is read (values the knobs reach)', Number(facts[1]) >= 5, facts[1])
        const legend = await page.evaluate(() => document.querySelector('.found__carry legend')?.textContent ?? '')
        check(tag, carry ? 'the kit\'s knobs are offered' : 'nothing offered without --carry', carry ? /2 knobs on shadcn\/ui/.test(legend) : !legend, legend)
        if (carry) {
          await page.click('.found__opt:has-text("Bring what you tuned")')
          await page.click('text=See it six ways'); await page.waitForTimeout(3000)
          check(tag, 'then the six', (await page.$$('.looks__card')).length === 6)
          // each of the six wears the brand that came along: a runtime <style>
          // (Vite's injected CSS) is rewritten in the looks' frames too
          await page.waitForTimeout(3000)
          const cards = page.frames().filter((f) => f.parentFrame() === page.mainFrame() && f !== frame())
          const bgs = []
          for (const f of cards) { try { bgs.push(await f.evaluate((sel) => { const b = document.querySelector(sel); return b ? getComputedStyle(b).backgroundColor : 'none' }, app.brandEl)) } catch { bgs.push('?') } }
          check(tag, 'the six wear the brand that came along', bgs.length >= 6 && bgs.every((b) => b === 'rgb(225, 29, 72)'), bgs.join(' '))
          await page.click('.ebar__view button[title^="One"]'); await page.waitForTimeout(1500)
          const panel = await page.evaluate(() => document.querySelector('aside.panel')?.textContent ?? '')
          check(tag, 'the brand came along (Colour: Red)', /Colour\s*Red/.test(panel))
          const n = await moved(page)
          check(tag, 'and moved values on the page', n > 0, `${n} moved`)
        } else {
          await page.click('text=Tune it directly'); await page.waitForTimeout(2500)
          const f = frame()
          const v = f ? await f.evaluate(app.probe) : 'no frame'
          check(tag, 'the page renders styled', app.styled(v), v.slice(0, 70))
          // a look, picked: the knobs move the page
          await page.click('.ebar__view button[title^="Six"]'); await page.waitForTimeout(5000)
          await page.click('.looks__card:has-text("Soft")'); await page.waitForTimeout(1200)
          await page.click('text=Pick this one'); await page.waitForTimeout(1500)
          const n = await moved(page)
          check(tag, 'Soft picked moves values', n > 0, `${n} moved`)
          if (app.hot) {
            const before = readFileSync(app.hot.file, 'utf8')
            writeFileSync(app.hot.file, app.hot.add ? before + app.hot.add : before.replace(app.hot.replace[0], app.hot.replace[1]))
            const hit = (g) => (app.hot.want instanceof RegExp ? app.hot.want.test(g) : g === app.hot.want)
            let got = ''
            for (let i = 0; i < 24 && !hit(got); i++) { await page.waitForTimeout(500); const fr = frame(); try { got = fr ? await fr.evaluate(app.hot.read) : '' } catch { got = '' } }
            writeFileSync(app.hot.file, before)
            check(tag, 'a saved CSS change shows (hot reload)', hit(got), got)
            const still = await moved(page)
            check(tag, 'with the look still on', still > 0, `${still} moved`)
          }
          await page.screenshot({ path: join(work, `${tag}.png`) })
        }
      } catch (e) { check(tag, 'ran through', false, String(e.message).split('\n')[0]) }
      await page.context().close(); c.kill()
    }
    // The agent's route (MCP): what Claude Code does with "open this app".
    // A live app's CSS is written at runtime, so set, verify, screenshot and
    // the patch are measured in a headless page, quiet (no What we found).
    const tag = `${app.id}·mcp`
    const mcp = new Client({ name: 'live-dev', version: '1' })
    try {
      await mcp.connect(new StdioClientTransport({ command: 'node', args: [cli] }))
      const text = (r) => r.content.filter((x) => x.type === 'text').map((x) => x.text).join('\n')
      const loaded = JSON.parse(text(await mcp.callTool({ name: 'load', arguments: { devUrl: url } })))
      const set = JSON.parse(text(await mcp.callTool({ name: 'set', arguments: { id: loaded.id, knobs: { cPrimary: '#e11d48', radius: 1.8 } } })))
      check(tag, 'set moves values on the running app', set.moved > 0 && set.of >= 5, `${set.moved} of ${set.of}`)
      const v = JSON.parse(text(await mcp.callTool({ name: 'verify', arguments: { id: loaded.id } })))
      const paired = Number(/(\d+) elements paired/.exec(v.result)?.[1] ?? 0)
      check(tag, 'verify renders the app 1:1, not a shell', v.ok && paired >= 5 && !v.warnings.length, `${paired} paired${v.warnings.length ? ' · ' + v.warnings[0].slice(0, 60) : ''}`)
      const shot = await mcp.callTool({ name: 'screenshot', arguments: { id: loaded.id } })
      const png = shot.content.find((x) => x.type === 'image')
      check(tag, 'screenshot is an image of the app', !!png && png.data.length > 8000, png ? `${Math.round(png.data.length / 1365)} KB` : 'none')
      const patch = text(await mcp.callTool({ name: 'export', arguments: { id: loaded.id, format: 'patch' } }))
      check(tag, 'export patch carries the brand', /→\s+#e11d48/.test(patch), patch.split('\n').find((l) => /^## /.test(l)) ?? patch.slice(0, 60))
    } catch (e) { check(tag, 'ran through', false, String(e.message).split('\n')[0]) }
    await mcp.close().catch(() => {})
  }
} finally {
  await browser.close()
  for (const p of procs) { try { p.kill() } catch { /* gone */ } }
}
const failed = rows.filter((r) => !r.pass)
console.log(`\n${rows.length} checks · ${failed.length} failed`)
process.exit(failed.length ? 1 : 0)
