// The stills from the LIVE app, as it opens now (decision 216): the editor on a
// kit's Dashboard, and that Dashboard six ways (the editor's first view).
//
//   node scripts/og/og-from-site.mjs [base]       dev server on :5190 by default
//
// Writes brand/marketing/og-site-light.png and og-site-dark.png (1200×630, the
// six looks: the one picture that says what this is) and copies the light one
// to public/og.png; and brand/marketing/site-hero-light-1440.png (the editor
// at 1440, for the README header and posts).
import { chromium } from 'playwright'
import { copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const out = join(root, 'brand', 'marketing')
const base = process.argv[2] ?? 'http://localhost:5190'
const b = await chromium.launch()
const open = async (w, h, scheme, dsf = 2) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, colorScheme: scheme })).newPage()
  await p.goto(base, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.stage__foot', { timeout: 90000 }); await p.waitForTimeout(5000)
  // the hint pill is for a person at the keys, not for a still
  await p.addStyleTag({ content: '.peek{display:none!important}' })
  await p.evaluate(() => document.querySelectorAll('.popcard .popcard__x').forEach((x) => x.click()))
  return p
}
// The editor lands on the six (decision 217); 6 in the bar, should it not have.
const looks = async (p) => {
  await p.evaluate(() => document.querySelector('.ebar__view button[title^="Six"]')?.click())
  await p.waitForTimeout(7000)
}

for (const scheme of ['light', 'dark']) {
  // 1600 x 840 at 1.5: room for both rows of six, written at 2400 x 1260
  const p = await open(1600, 840, scheme, 1.5)
  await p.addStyleTag({ content: '.foot{display:none!important}' })
  // a brand first, so the card shows what a look keeps: one colour, six styles
  await p.evaluate(() => { const u = window.__us; u.dispatch({ type: 'SET', patch: { cPrimary: '#2563eb' } }) }); await p.waitForTimeout(800)
  // the app's own dark mode for the dark card: the kit follows the app
  if (scheme === 'dark') { await p.evaluate(() => { const u = window.__us; u.dispatch({ type: 'SET', patch: { sb: { ...u.cfg.sb, dark: 'dark' } } }) }); await p.waitForTimeout(1500) }
  await looks(p)
  await p.screenshot({ path: join(out, `og-site-${scheme}.png`) })
  await p.context().close()
}
copyFileSync(join(out, 'og-site-light.png'), join(root, 'public', 'og.png'))

// the hero is the one screen the six open on
const hero = await open(1440, 900, 'light')
await hero.evaluate(() => document.querySelector('.ebar__view button[title^="One"]')?.click()); await hero.waitForTimeout(1500)
await hero.screenshot({ path: join(out, 'site-hero-light-1440.png') })
await b.close(); console.log('ok')
