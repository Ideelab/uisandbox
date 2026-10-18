#!/usr/bin/env node
/**
 * The bridge, end to end: a RUNNING app on another origin, the one script
 * line in its <head>, UISandbox's "Your running app" door, and the zip that
 * comes out.
 *
 *   node scripts/live-bridge.mjs
 *
 * Three apps, served on their own port so they are a different origin from
 * the sandbox, as somebody's localhost:3000 would be:
 *
 *   /kit/    the Bootstrap kit build with the line in it      → Bootstrap
 *   /quiet/  the same build WITHOUT the line                  → silence
 *   /plain/  a hand-written page on no kit, with the line     → none of the nine
 *
 * The two controls are there so a pass means something: a door that said
 * "Connected · runs on Bootstrap" to every address would pass the first case
 * on its own.
 */
import { chromium } from 'playwright'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SANDBOX = 5301, APPS = 5303
const sandbox = `http://localhost:${SANDBOX}`, apps = `http://localhost:${APPS}`

// ── the three apps ────────────────────────────────────────────────────────
const site = mkdtempSync(join(tmpdir(), 'live-apps-'))
execFileSync('unzip', ['-q', '-o', join(root, 'public/kits/bootstrap.zip'), '-d', site])
const line = `<script src="${sandbox}/live.js"></script>`
for (const [dir, withLine] of [['kit', true], ['quiet', false]]) {
  mkdirSync(join(site, dir), { recursive: true })
  for (const f of readdirSync(join(site, 'bootstrap'))) {
    let text = readFileSync(join(site, 'bootstrap', f), f.endsWith('.html') || f.endsWith('.css') ? 'utf8' : undefined)
    if (withLine && f === 'index.html') text = text.replace('<head>', `<head>\n${line}`)
    writeFileSync(join(site, dir, f), text)
  }
}
mkdirSync(join(site, 'plain'), { recursive: true })
writeFileSync(join(site, 'plain', 'index.html'), `<!doctype html><html><head>${line}<title>Plain</title>
<style>body{font:16px/1.5 Georgia,serif;color:#222;background:#fafaf7}a{color:#a00}</style></head>
<body><h1>A page on no kit</h1><p>Hand-written CSS, <a href="#">a link</a>.</p></body></html>`)

const appServer = spawn('python3', ['-m', 'http.server', String(APPS), '--directory', site], { stdio: 'ignore' })
const vite = spawn('pnpm', ['exec', 'vite', '--port', String(SANDBOX), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('vite did not start')), 30000)
  vite.stdout.on('data', (d) => { if (String(d).includes(String(SANDBOX))) { clearTimeout(t); setTimeout(res, 900) } }) })

const rows = []
const check = (name, pass, detail = '') => rows.push({ name, pass, detail })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true })

async function door() {
  const page = await ctx.newPage()
  await page.goto(`${sandbox}/`, { waitUntil: 'networkidle' })
  await page.click('.intake__way:has-text("running app")')
  await page.waitForSelector('.live__snippet')
  return page
}
async function connect(page, url) {
  await page.fill('input[aria-label="The address your app runs on"]', url)
  // The submit button of THIS door: a bare has-text("Connect") also matches
  // the "Connect a repo" tab above it, and clicking that leaves the door.
  await page.click('.intake__drop--live button[type=submit]')
  await page.waitForFunction(() => { const t = document.querySelector('.live__status')?.textContent ?? ''; return t && !/Waiting/.test(t) }, null, { timeout: 15000 })
  return page.evaluate(() => document.querySelector('.live__status')?.textContent.replace(/\s+/g, ' ').trim())
}

try {
  // 1 — the snippet points at this sandbox, and is assembled into one line
  let page = await door()
  const snip = await page.evaluate(() => document.querySelector('.live__snippet code')?.textContent)
  check('the line to paste names this sandbox\'s live.js', snip === `<script src="${sandbox}/live.js"></script>`, snip)

  // 2 — a running app on Bootstrap
  const said = await connect(page, `${apps}/kit/`)
  check('a running Bootstrap app is recognised', /Connected · runs on Bootstrap 5\.3\.8/.test(said), said)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("design system")')])
  const out = mkdtempSync(join(tmpdir(), 'live-zip-'))
  await dl.saveAs(join(out, 'x.zip')); execFileSync('unzip', ['-q', '-o', join(out, 'x.zip'), '-d', join(out, 'x')])
  const x = join(out, 'x')
  const skills = existsSync(join(x, '.claude/skills')) ? readdirSync(join(x, '.claude/skills')) : []
  check('its design system comes with a SKILL.md', skills.length === 1, skills.join(', '))
  for (const f of ['_custom.scss', 'theme.css', 'install.md', 'MANIFEST.md', 'DESIGN.md', 'tokens.json']) check(`${f} ships`, existsSync(join(x, f)))
  check('and not the whole agent files that would overwrite a repo\'s', !['AGENTS.md', 'CLAUDE.md', '.cursor/rules'].some((f) => existsSync(join(x, f))))
  check('DESIGN.md says it was read off the running app', /read off .* while it ran, through UISandbox's live bridge/.test(readFileSync(join(x, 'DESIGN.md'), 'utf8')))

  // The same claim as a dropped build: the app's own variables win, so the
  // theme is a no-op on the app it was read from. Compared in the app's frame.
  const theme = readFileSync(join(x, 'theme.css'), 'utf8')
  const i = theme.indexOf('{'), j = theme.indexOf('}', i)
  const decls = [...theme.slice(i + 1, j).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  const app = page.frames().find((f) => f.url().startsWith(`${apps}/kit/`))
  const diffs = await app.evaluate((decls) => {
    const cs = getComputedStyle(document.documentElement), probe = document.createElement('span'); document.body.appendChild(probe)
    const col = (v) => { probe.style.color = ''; probe.style.color = v; return probe.style.color ? getComputedStyle(probe).color : null }
    const out = []
    for (const [n, want] of decls) { const have = cs.getPropertyValue(n).trim(); if (!have) continue
      const a = col(want), b = col(have); if (a && b ? a !== b : want.replace(/\s+/g, ' ') !== have.replace(/\s+/g, ' ')) out.push(`${n}: app ${have} · theme ${want}`) }
    probe.remove(); return out
  }, decls)
  check(`the theme is a no-op on the app it was read from (${decls.length} vars)`, diffs.length === 0, diffs.slice(0, 3).join(' | '))
  await page.close()

  // 3 — the same app without the line: silence, said as silence
  page = await door()
  const quiet = await connect(page, `${apps}/quiet/`)
  check('an app without the line is reported as silent, not as "no kit"', /Nothing heard back/.test(quiet), quiet)
  check('and offers no download', !(await page.$('button:has-text("design system")')))
  await page.close()

  // 4 — a page on no kit, with the line: heard, and said why there is nothing to write
  page = await door()
  const plain = await connect(page, `${apps}/plain/`)
  check('a page on no kit is heard and told so', /Connected\. This page runs on none of the nine/.test(plain), plain)
  check('and offers no download', !(await page.$('button:has-text("design system")')))
  await page.close()

  // 5 — the sandbox's own address is refused before it is framed
  page = await door()
  const self = await connect(page, `${sandbox}/`)
  check('UISandbox\'s own address is refused', /That is UISandbox itself/.test(self), self)
  check('and never framed', await page.evaluate(() => !document.querySelector('.live__frame')?.getAttribute('src')))
  await page.close()
} catch (e) { check('ran', false, String(e).split('\n')[0].slice(0, 120)) }

await browser.close(); vite.kill(); appServer.kill()
for (const r of rows) console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`)
const bad = rows.filter((r) => !r.pass)
console.log(`\n${rows.length} checks · ${bad.length} failed`)
process.exit(bad.length ? 1 : 0)
