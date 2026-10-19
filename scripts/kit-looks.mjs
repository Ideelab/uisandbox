#!/usr/bin/env node
/**
 * The Look presets: each kit's own out-of-the-box values, as the engine's
 * start cards read them (kit-defaults.mjs) from the fetched kit data. Written
 * small, so the page does not fetch 4 MB of kit JSON to show eight presets.
 *
 *   node scripts/kit-looks.mjs        writes src/kits/looks.json
 *
 * src/kits/__tests__/looks.test.ts fails when this file is behind the kits.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kitDefaults } from '../src/kits/engine/kit-defaults.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const door = JSON.parse(readFileSync(join(root, 'src/kits/door.json'), 'utf8')).filter((k) => k.renders)
const kits = Object.fromEntries(['tailwind', ...door.map((k) => k.id)].map((id) => [id, JSON.parse(readFileSync(join(root, `src/kits/engine/kits/${id}.json`), 'utf8'))]))
const cards = kitDefaults(kits, door.map((k) => k.id))
export const KEEP = ['brand', 'page', 'success', 'warning', 'danger', 'fontBody', 'radius']
const looks = door.filter((k) => cards[k.id]).map((k) => ({ id: k.id, name: k.name, values: Object.fromEntries(KEEP.filter((r) => cards[k.id].values[r] != null).map((r) => [r, cards[k.id].values[r]])) }))
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(root, 'src/kits/looks.json'), JSON.stringify(looks, null, 1) + '\n')
  console.log(`${looks.length} looks: ${looks.map((l) => `${l.id} (${Object.keys(l.values).length})`).join(', ')}`)
}
export { looks }
