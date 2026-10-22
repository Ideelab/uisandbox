#!/usr/bin/env node
/**
 * Every knob, on the canvas, in all three places it is seen (decision 219):
 * the screen (1), the six looks, and one look full size.
 *
 *   node scripts/knob-looks.mjs [http://localhost:5190]     a dev server (DEV: window.__us)
 *
 * knob-render.mjs holds each knob to what it must and must not move, on the
 * screen. This holds the looks to the knobs: with the six open, a font, a
 * radius or a spacing turned showed in none of them, because every look set
 * its own, and only colour (which no look sets) seemed to reach the canvas.
 * A knob passes when it moves the screen, the look full size, and at least
 * one of the first three cards (a card may already stand where the knob
 * goes: Soft's radius is ×1.8).
 */
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5190'
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage()
await p.goto(`${base}/?screen=overview.html`); await p.waitForSelector('.stage__foot', { timeout: 90000 }); await p.waitForTimeout(4000)
const KNOBS = [
  ['Colour (brand)', { cPrimary: '#e11d48' }], ['Type pair', { fontDisplay: 'IBM Plex Sans', fontBody: 'IBM Plex Sans' }],
  ['Heading font', { fontDisplay: 'Outfit' }], ['Text font', { fontBody: 'Nunito Sans' }],
  ['Background', { sb: { cBackground: '#eef2ff' } }], ['Status (danger)', { sb: { cDanger: '#7c3aed' } }], ['Grey tint', { neutral: 'auto' }],
  ...[['radius', 1.8], ['space', 1.3], ['type', 1.2], ['lineHeight', 1.2], ['tracking', 0.05], ['weight', 1], ['borderWidth', 2], ['shadow', 2], ['motion', 2], ['hue', 90], ['sat', 0.3], ['contrast', 0.15], ['borderTone', -0.08]].map(([k, v]) => [`dial ${k}`, { sb: { [k]: v } }]),
]
const probe = () => {
  const P = ['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'borderTopLeftRadius', 'paddingTop', 'boxShadow', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'transitionDuration']
  return [...document.querySelectorAll('body *')].slice(0, 1200).map((e) => { const c = getComputedStyle(e); return P.map((k) => c[k]).join(',') }).join('|')
}
const frames = async (mode) => {
  if (mode === '1') return [(await (await p.$('.stage__iframe')).contentFrame())]
  if (mode === 'six') return Promise.all((await p.$$('.looks__shot iframe')).slice(0, 3).map((h) => h.contentFrame()))
  return [(await (await p.$('.looks__stage iframe')).contentFrame())]
}
const read = async (mode) => Promise.all((await frames(mode)).map((f) => f.evaluate(probe).catch(() => 'ERR')))
const set = (patch) => p.evaluate((x) => { const u = window.__us; u.dispatch({ type: 'SET', patch: { ...x, sb: { ...u.cfg.sb, ...(x.sb ?? {}) } } }) }, patch)
const resetAll = () => p.evaluate(() => { const u = window.__us; u.dispatch({ type: 'REPLACE', cfg: u.baseline.cfg }) })
const out = {}
for (const mode of ['1', 'six', 'focus']) {
  await resetAll(); await p.waitForTimeout(800)
  if (mode === 'six') { await p.click('.ebar__view button[title^="Six"]'); await p.waitForTimeout(6000) }
  if (mode === 'focus') { await p.click('.looks__card:has-text("Classic")'); await p.waitForTimeout(3000) }
  for (const [name, patch] of KNOBS) {
    await resetAll(); await p.waitForTimeout(700)
    const before = await read(mode)
    await set(patch); await p.waitForTimeout(1500)
    const after = await read(mode)
    const moved = before.map((x, i) => x !== after[i]).filter(Boolean).length
    ;(out[name] ??= {})[mode] = `${moved}/${before.length}`
  }
}
let failed = 0
console.log('knob'.padEnd(22), '1'.padEnd(7), 'six'.padEnd(7), 'focus')
for (const [k, v] of Object.entries(out)) {
  const ok = /^1\//.test(v['1']) && /^1\//.test(v.focus) && !/^0\//.test(v.six)
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${k.padEnd(20)}`, (v['1'] ?? '').padEnd(7), (v.six ?? '').padEnd(7), v.focus ?? '')
}
console.log(`\n${Object.keys(out).length} knobs · ${failed} failed`)
await b.close()
process.exit(failed ? 1 : 0)
