#!/usr/bin/env node
/**
 * Which kit does a DROPPED build run on? `detectKit` against real builds.
 *
 *   node scripts/kit-detect.mjs              own dev server
 *   … --base http://localhost:5190           a running one
 *
 * The expectation is written down from what each build IS (its own repo, its
 * own package.json), not from what the detector said the first time. A gate
 * whose answers were copied from the thing under test can only ever agree
 * with it.
 *
 * The rules run inside the sandbox frame, on the TOKENISED build: every
 * literal there is already `var(--us-vN)`, and a detector that only worked on
 * the untouched page would be no use to the export.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectKit } from '../src/kits/engine/detect.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }

/* The question is not "which repo is this". It is "which kit's VOCABULARY can
 * this rendered page be addressed in" — because that is what the export does
 * with the answer. A build can be Bootstrap and still be `null` here.
 *
 * The first version of this table was written the other way, from the repo
 * name, and four rows disagreed with the detector. Each was looked up in the
 * build itself, and in all four the detector was right about the page:
 *
 *   SB Admin 2       Bootstrap 4 (`:root{--primary}`, no `--bs-`); the kit is
 *                    5.3.8, and a theme in v5 names would never reach it
 *   twcdn            Tailwind v3 (cdn.tailwindcss.com); the kit is 4.3.3, whose
 *                    @theme variables v3 does not publish
 *   bootstrap-rtl    Bootstrap 5.3.8, but the screen it opens on links no
 *                    stylesheet — its CSS sits under docs/5.3/, unloaded at /
 *   open-props       `src/` is outside the served base (#165), so its own
 *                    variables never load
 *
 * The first two are the ones that matter. Calling them Bootstrap or Tailwind
 * would ship an export that silently does nothing. `null` is the safe answer;
 * a later version should SAY why ("Bootstrap 4; the engine speaks 5.3"). */
const EXPECT = {
  // Bootstrap 5: publishes --bs-* on :root
  's13-adminlte.zip': 'bootstrap',
  'bootstrap-53.zip': 'bootstrap',
  's11-bootstrap-rtl.zip': null,                    // BS5, but its CSS is not loaded on the screen it opens
  's11-ng-bootstrap.github.io.zip': 'bootstrap',
  's13-material-dashboard.zip': 'bootstrap',        // Creative Tim, built on Bootstrap 5
  'startbootstrap-agency-master.zip': 'bootstrap',  // updated to Bootstrap 5
  // Bootstrap 4: IS Bootstrap, but not the 5.3.8 the kit describes
  'startbootstrap-sb-admin-2-master.zip': null,
  // Ant Design
  's11-ant-design.zip': 'antd',
  's14-ant-design-pro.zip': 'antd',
  // Mantine
  's11-mantine.zip': 'mantine',
  // Open Props (its docsite)
  's11-open-props.zip': null,                       // its variables live outside the served base
  // Tailwind v3 via the Play CDN: not the 4.3.3 the kit describes
  'twcdn.zip': null,
  // None of the nine
  's11-vitepress.zip': null,
  's7-docsify.zip': null,
  's16-tufte.zip': null,
  'water-docs.zip': null,
  'simple.css-main.zip': null,
  's16-tacit.zip': null,
}

let server = null
let base = opt('--base', '')
if (!base) {
  const port = 5241
  server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  base = `http://localhost:${port}`
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('vite did not start')), 30000)
    server.stdout.on('data', (d) => { if (String(d).includes(String(port))) { clearTimeout(t); setTimeout(res, 800) } }) })
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const rows = []
for (const [f, want] of Object.entries(EXPECT)) {
  const page = await ctx.newPage()
  let got = '?', note = ''
  try {
    await page.goto(`${base}/?load=${encodeURIComponent('/fixtures/' + f)}`, { waitUntil: 'domcontentloaded' })
    const st = await page.waitForFunction(() => {
      if (document.querySelector('.intake__error')) return 'refused'
      if (document.querySelector('.stage__foot')) return 'ok'
      return null
    }, null, { timeout: 120000 }).then((h) => h.jsonValue())
    if (st === 'refused') { got = 'refused'; note = 'door refused it' }
    else {
      await page.waitForTimeout(3500)
      const frame = await (await page.$('.stage__frame iframe'))?.contentFrame()
      got = frame ? await frame.evaluate(detectKit) : 'no frame'
    }
  } catch (e) { got = 'error'; note = String(e).split('\n')[0].slice(0, 60) }
  rows.push({ f, want, got, note, pass: got === want })
  await page.close()
}
await browser.close()
if (server) server.kill()

for (const r of rows) console.log(`${r.pass ? '✓' : '✗'} ${r.f.padEnd(40)} want ${String(r.want).padEnd(10)} got ${String(r.got).padEnd(10)} ${r.note}`)
const bad = rows.filter((r) => !r.pass)
console.log(`\n${rows.length} builds · ${rows.length - bad.length} agree · ${bad.length} disagree`)
process.exit(bad.length ? 1 : 0)
