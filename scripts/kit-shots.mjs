#!/usr/bin/env node
/**
 * The kit pages' screenshots: each kit as it ships, in the editor.
 *
 *   node scripts/kit-shots.mjs [--base http://localhost:5190]
 *
 * Needs a running app at --base (the dev server). Writes public/kits/<id>.jpg.
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const base = args[args.indexOf('--base') + 1] && args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5190'
const DOOR = JSON.parse(readFileSync(join(root, 'src/kits/door.json'), 'utf8')).filter((k) => k.renders)
const b = await chromium.launch()
for (const k of DOOR) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })).newPage()
  await p.goto(`${base}/?load=${encodeURIComponent(`/kits/${k.id}.zip`)}`)
  await p.waitForFunction(() => document.querySelector('.stage__foot .chip'), null, { timeout: 60000 })
  await p.waitForTimeout(1800)
  await p.screenshot({ path: join(root, 'public/kits', `${k.id}.jpg`), type: 'jpeg', quality: 82 })
  console.log(k.id); await p.close()
}
await b.close()
