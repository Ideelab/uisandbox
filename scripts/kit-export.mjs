#!/usr/bin/env node
/**
 * The kit export, CONSUMED: what a person actually downloads, unpacked and
 * read, on real builds.
 *
 *   node scripts/kit-export.mjs              own dev server
 *   … --base http://localhost:5190           a running one
 *
 * Unit tests caught neither of the two faults this found on its first runs.
 * The export claimed AdminLTE ran on no kit, because it was opened before the
 * screen had been read; and it wrote a success colour of #6a9955, which was
 * the syntax highlighting in AdminLTE's docs pages. So this downloads the zip
 * through the real button and reads the files.
 *
 * The claim it holds is the 1:1 claim, applied to the export: an untouched
 * build exports a theme that changes NOTHING. Every variable in theme.css's
 * light block must equal what the page itself computes for that variable.
 * A theme that "faithfully" writes the painted ground into --bs-body-bg would
 * turn every card that reads it grey, and this is the check that says so.
 */
import { chromium } from 'playwright'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }

/* kit: the kit the build runs on, or null. From kit-detect.mjs's table, which
 * says how each was established. */
const BUILDS = [
  ['s13-adminlte.zip', 'bootstrap'],
  ['bootstrap-53.zip', 'bootstrap'],
  ['s11-mantine.zip', 'mantine'],
  ['s11-vitepress.zip', null],
  ['startbootstrap-sb-admin-2-master.zip', null],   // Bootstrap 4: not the 5.3.8 kit
]

let server = null
let base = opt('--base', '')
if (!base) {
  const port = 5269
  server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  base = `http://localhost:${port}`
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('vite did not start')), 30000)
    server.stdout.on('data', (d) => { if (String(d).includes(String(port))) { clearTimeout(t); setTimeout(res, 800) } }) })
}

/** The first `{ … }` block of declarations: the light theme. */
const lightBlock = (css) => {
  const i = css.indexOf('{'), j = css.indexOf('}', i)
  return i < 0 ? [] : [...css.slice(i + 1, j).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const rows = []
const check = (build, name, pass, detail = '') => rows.push({ build, name, pass, detail })

for (const [f, kit] of BUILDS) {
  const page = await ctx.newPage()
  try {
    await page.goto(`${base}/?load=${encodeURIComponent('/fixtures/' + f)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('.stage__foot'), null, { timeout: 120000 })
    // Wait for the screen to have been READ, as the dialog says it is doing.
    await page.waitForFunction(() => !!window.__us?.coverage, null, { timeout: 60000 })
    await page.click('button:has-text("Export")')
    await page.waitForSelector('.dialog')
    if (kit) await page.waitForFunction(() => /SKILL\.md in /.test(document.querySelector('.dialog')?.textContent ?? ''), null, { timeout: 20000 }).catch(() => {})
    const card = await page.evaluate(() => [...document.querySelectorAll('.exp__card')].map((c) => c.textContent).find((t) => /agent/i.test(t)) ?? '')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Everything")')])
    const dir = mkdtempSync(join(tmpdir(), 'kit-export-'))
    await dl.saveAs(join(dir, 'x.zip'))
    execFileSync('unzip', ['-q', '-o', join(dir, 'x.zip'), '-d', join(dir, 'x')])
    const x = join(dir, 'x')
    const skills = existsSync(join(x, '.claude/skills')) ? readdirSync(join(x, '.claude/skills')) : []

    if (!kit) {
      check(f, 'no SKILL.md without a kit', skills.length === 0, skills.join(', '))
      check(f, 'says why there is none', /none of the nine kits/.test(card), card.slice(0, 80))
      check(f, 'the measured DESIGN.md still ships', existsSync(join(x, 'DESIGN.md')))
    } else {
      check(f, `SKILL.md for ${kit}`, skills.length === 1, skills.join(', ') || 'none')
      for (const file of ['theme.css', 'install.md', 'MANIFEST.md', 'tokens.json', 'DESIGN.md']) check(f, `${file} ships`, existsSync(join(x, file)))
      const theme = readFileSync(join(x, 'theme.css'), 'utf8')
      const design = readFileSync(join(x, 'DESIGN.md'), 'utf8')
      check(f, 'DESIGN.md says the values were read, not chosen', /read off .* own build in UISandbox, not chosen/.test(design))
      check(f, 'MANIFEST.md does not claim nothing is unread', !/^Nothing\. Every variable this theme writes is read/m.test(readFileSync(join(x, 'MANIFEST.md'), 'utf8')))
      check(f, 'tokens.json parses', (() => { try { JSON.parse(readFileSync(join(x, 'tokens.json'), 'utf8')); return true } catch { return false } })())

      // The 1:1 claim, on the export. Compared in the frame, so a colour is
      // compared as the browser resolves it rather than as two spellings.
      const decls = lightBlock(theme)
      const frame = await (await page.$('.stage__frame iframe')).contentFrame()
      const diffs = await frame.evaluate((decls) => {
        const root = document.documentElement, cs = getComputedStyle(root)
        const probe = document.createElement('span'); document.body.appendChild(probe)
        const asColour = (v) => { probe.style.color = ''; probe.style.color = v; return probe.style.color ? getComputedStyle(probe).color : null }
        const asPx = (v) => { const m = String(v).trim().match(/^(-?\d*\.?\d+)(px|rem)?$/); return m ? (m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])) : null }
        const out = []
        for (const [name, want] of decls) {
          const have = cs.getPropertyValue(name).trim()
          if (!have) continue   // a variable the page does not set: theme.css adds it, nothing to compare
          const cw = asColour(want), ch = asColour(have)
          const same = cw && ch ? cw === ch
            : asPx(want) !== null && asPx(have) !== null ? Math.abs(asPx(want) - asPx(have)) < 0.01
            : want.replace(/\s+/g, ' ') === have.replace(/\s+/g, ' ')
          if (!same) out.push(`${name}: page ${have} · theme ${want}`)
        }
        probe.remove()
        return { compared: decls.length, out }
      }, decls)
      check(f, `an untouched build exports a no-op theme (${diffs.compared} vars)`, diffs.out.length === 0, `${diffs.out.length} of ${diffs.compared} differ`)
    }
  } catch (e) { check(f, 'ran', false, String(e).split('\n')[0].slice(0, 100)) }
  await page.close()
}
await browser.close()
if (server) server.kill()

let last = ''
for (const r of rows) { if (r.build !== last) { console.log(`\n${r.build}`); last = r.build } console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`) }
const bad = rows.filter((r) => !r.pass)
console.log(`\n${rows.length} checks · ${bad.length} failed`)
process.exit(bad.length ? 1 : 0)
