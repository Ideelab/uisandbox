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
 *
 * What each check can and cannot prove, so none is read for more than it is:
 *
 *   no-op / is the screen   src/kits/pin.ts sets every variable the page
 *                           defines to the page's value, so these hold by
 *                           construction once pinning runs. They guard the
 *                           PATH — the real dialog, the real download, colours
 *                           compared as the browser resolves them — and they
 *                           were red before pinning existed (11 of 35 on
 *                           AdminLTE), so they demonstrably catch that fault.
 *   the brand moved         the one that is not circular: the turn has to
 *                           reach the page AND the file. If the knob did
 *                           nothing, "theme equals screen" would still pass.
 */
import { chromium } from 'playwright'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const UNREAD = JSON.parse(readFileSync(join(root, 'src/kits/engine/kits/unread.json'), 'utf8'))
const { generate } = await import(join(root, 'src/kits/engine/generate.mjs'))
const KIT_DATA = (id) => JSON.parse(readFileSync(join(root, `src/kits/engine/kits/${id}.json`), 'utf8'))
/** The files the engine writes for a kit, as a person should receive them:
 *  everything but the three whole agent files the export replaces with a
 *  block. Names do not depend on values, so any values will do. */
const NOT_SHIPPED = new Set(['AGENTS.md', 'CLAUDE.md', '.cursor/rules'])
const packageOf = (id) => { const f = generate({ brand: '#0d6efd' }, [id], { [id]: KIT_DATA(id) }, { name: 'x' })
  return Object.keys(f).filter((k) => typeof f[k] === 'string' && !NOT_SHIPPED.has(k) && !k.endsWith('/SKILL.md')) }
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
  // The kit door's own builds: through the door and out of the export.
  ...['bootstrap', 'tailwind', 'daisyui', 'shadcn', 'material', 'radix', 'mantine', 'antd'].map((k) => [`kit-${k}.zip`, k]),
]

let server = null
let base = opt('--base', '')
if (!base) {
  const port = 5299
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

/** Builds on which a knob is also turned, to hold the export to the screen
 *  after a change and not only at rest. */
const TURN = new Set(['s13-adminlte.zip'])
/** The variable each kit's components read for the brand (roles.mjs MAP). */
const KIT_BRAND = { bootstrap: '--bs-link-color', mantine: '--mantine-primary-color-filled' }

async function exportZip(page, kit) {
  await page.click('button:has-text("Export")')
  await page.waitForSelector('.dialog')
  if (kit) await page.waitForFunction(() => /SKILL\.md in /.test(document.querySelector('.dialog')?.textContent ?? ''), null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(600)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Everything")')])
  const dir = mkdtempSync(join(tmpdir(), 'kit-export-'))
  await dl.saveAs(join(dir, 'x.zip'))
  execFileSync('unzip', ['-q', '-o', join(dir, 'x.zip'), '-d', join(dir, 'x')])
  return join(dir, 'x')
}

/** Every light-block declaration the page also sets must equal it, compared
 *  in the frame so a colour is compared as the browser resolves it. */
async function agreesWithScreen(page, theme) {
  const decls = lightBlock(theme)
  const frame = await (await page.$('.stage__frame iframe')).contentFrame()
  return frame.evaluate((decls) => {
    const cs = getComputedStyle(document.documentElement)
    const probe = document.createElement('span'); document.body.appendChild(probe)
    const asColour = (v) => { probe.style.color = ''; probe.style.color = v; return probe.style.color ? getComputedStyle(probe).color : null }
    const asPx = (v) => { const m = String(v).trim().match(/^(-?\d*\.?\d+)(px|rem)?$/); return m ? (m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])) : null }
    const out = []
    for (const [name, want] of decls) {
      const have = cs.getPropertyValue(name).trim()
      if (!have) continue   // the build does not set it: derivation fills it, nothing to compare
      const cw = asColour(want), ch = asColour(have)
      const same = cw && ch ? cw === ch
        : asPx(want) !== null && asPx(have) !== null ? Math.abs(asPx(want) - asPx(have)) < 0.01
        : want.replace(/\s+/g, ' ') === have.replace(/\s+/g, ' ')
      if (!same) out.push(`${name}: page ${have} · theme ${want}`)
    }
    probe.remove()
    return { compared: decls.length, out }
  }, decls)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const rows = []
const check = (build, name, pass, detail = '') => rows.push({ build, name, pass, detail })

for (const [f, kit] of BUILDS) {
  const page = await ctx.newPage()
  try {
    // quiet: no What we found over the editor (decision 217); the export is what is tested
    await page.goto(`${base}/?load=${encodeURIComponent('/fixtures/' + f)}&quiet=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('.stage__foot'), null, { timeout: 120000 })
    // Wait for the screen to have been READ, as the dialog says it is doing.
    await page.waitForFunction(() => !!window.__us?.coverage, null, { timeout: 60000 })
    const x = await exportZip(page, kit)
    const card = await page.evaluate(() => [...document.querySelectorAll('.exp__card')].map((c) => c.textContent).find((t) => /agent/i.test(t)) ?? '')
    const skills = existsSync(join(x, '.claude/skills')) ? readdirSync(join(x, '.claude/skills')) : []

    // A kit door build has to be ALIVE, not merely faithful. Check 1:1 cannot
    // tell the two apart: the first Radix build rendered as bare text, with
    // every var(--accent-9) and var(--space-3) resolving to nothing, and
    // untouched and tokenised were exactly equally bare, so it passed. So the
    // primary action must have a real fill and real padding.
    if (f.startsWith('kit-')) {
      const frame = await (await page.$('.stage__frame iframe')).contentFrame()
      const btn = await frame.evaluate(() => {
        const walk = (root, out = []) => { for (const el of root.querySelectorAll('*')) { out.push(el); if (el.shadowRoot) walk(el.shadowRoot, out) } return out }
        const els = walk(document)
        const host = els.find((el) => /^\s*Publish\s*$/.test(el.textContent ?? '') && el.children.length <= 2 && el.getBoundingClientRect().width > 0)
        if (!host) return null
        // Material's fill lives inside its own shadow root; read the largest painted box there.
        const boxes = [host, ...(host.shadowRoot ? walk(host.shadowRoot) : [])]
        const painted = boxes.map((el) => getComputedStyle(el)).find((cs) => cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')
        const r = host.getBoundingClientRect()
        return { fill: painted?.backgroundColor ?? 'none', w: Math.round(r.width), h: Math.round(r.height) }
      })
      check(f, `the kit is alive: its primary action has a fill (${btn?.fill ?? 'no Publish button'})`, !!btn && btn.fill !== 'none')
      check(f, `and the size of a control, not of a word (${btn?.w}×${btn?.h})`, !!btn && btn.h >= 24 && btn.w >= 50)
    }

    if (!kit) {
      check(f, 'no SKILL.md without a kit', skills.length === 0, skills.join(', '))
      check(f, 'says why there is none', /none of the nine kits/.test(card), card.slice(0, 80))
      check(f, 'the measured DESIGN.md still ships', existsSync(join(x, 'DESIGN.md')))
    } else {
      check(f, `SKILL.md for ${kit}`, skills.length === 1, skills.join(', ') || 'none')
      // Every file the engine writes for this kit is in the zip: install.md
      // must never name a file the person was not given. (The first export
      // told Bootstrap users to compile _custom.scss and left it out.)
      const want = packageOf(kit)
      const missing = want.filter((file) => !existsSync(join(x, file)))
      check(f, `every file the engine writes ships (${want.join(', ')})`, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '')
      const named = [...new Set((readFileSync(join(x, 'install.md'), 'utf8').match(/[\w.-]+\.(scss|ts|css|js|json)\b/g) ?? []))].filter((n) => want.includes(n))
      check(f, `and every one install.md names is there (${named.join(', ') || 'none named'})`, named.every((n) => existsSync(join(x, n))))
      const theme = readFileSync(join(x, 'theme.css'), 'utf8')
      const design = readFileSync(join(x, 'DESIGN.md'), 'utf8')
      check(f, 'DESIGN.md says the values were read, not chosen', /read off .* own CSS in UISandbox, not chosen/.test(design))
      // MANIFEST.md must agree with the MEASUREMENT for this kit. Where the
      // unread list has rows, it names them; where it has none, "Nothing" is
      // what orphans.mjs found, not a claim made for want of data. (The first
      // version of this check demanded rows everywhere, generalised from
      // Bootstrap, and failed four kits that genuinely have none.)
      const manifest = readFileSync(join(x, 'MANIFEST.md'), 'utf8')
      const rows = UNREAD.filter((u) => u.kit === kit)
      const saysNothing = /^Nothing\. Every variable this theme writes is read/m.test(manifest)
      // A kit that compiles through Tailwind gets no "Nothing": the measurement
      // cannot establish it there, and the manifest says so (decision 191).
      const saysUnproven = /^None found, and for .* that is not a proof/m.test(manifest)
      const compiled = ['tailwind', 'daisyui', 'shadcn'].includes(kit)
      check(f, `MANIFEST.md agrees with the unread measurement (${rows.length} row${rows.length === 1 ? '' : 's'}${compiled ? ', compiled through Tailwind' : ''})`,
        rows.length ? !saysNothing && rows.every((r) => manifest.includes(r.names[0])) : compiled ? saysUnproven && !saysNothing : saysNothing)
      check(f, 'tokens.json parses', (() => { try { JSON.parse(readFileSync(join(x, 'tokens.json'), 'utf8')); return true } catch { return false } })())

      const untouched = await agreesWithScreen(page, theme)
      check(f, `an untouched build exports a no-op theme (${untouched.compared} vars)`, untouched.out.length === 0, untouched.out.slice(0, 3).join(' | '))

      // And after a knob: the export must still be the screen the person sees.
      if (TURN.has(f)) {
        await page.click('.dialog [aria-label="Close"]'); await page.waitForTimeout(400)
        await page.evaluate(() => window.__us.dispatch({ type: 'SET', patch: { cPrimary: '#c2410c' } }))
        await page.waitForTimeout(1500)
        const turned = await exportZip(page, true)
        const t2 = readFileSync(join(turned, 'theme.css'), 'utf8')
        const after = await agreesWithScreen(page, t2)
        check(f, `after turning the brand, theme.css is the screen (${after.compared} vars)`, after.out.length === 0, after.out.slice(0, 3).join(' | '))
        const brandVar = KIT_BRAND[kit]
        const brandNow = await (await (await page.$('.stage__frame iframe')).contentFrame()).evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), brandVar)
        check(f, `and the brand moved (${brandVar} → ${brandNow})`, brandNow && brandNow.toLowerCase() !== '#0d6efd', brandNow)
      }
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
