/* node --test kit-defaults.test.mjs
 *
 * A kit built with its own defaults has to come out as that kit. The defaults
 * are read from one variable and the build writes them into another (roles.mjs
 * MAP); when the two differ, the kit's own value goes in where a different one
 * belongs. That is how daisyUI's corners came out at half of daisyUI's and Ant
 * Design's text a shade lighter than Ant Design's, with every other gate green:
 * each half was right on its own. Measured against the kits' own docs pages
 * (decision 207). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MAP } from './roles.mjs'
import { TABLE } from './kit-defaults.mjs'

const kit = (id) => JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))

/* Read here, written there, on purpose. Each with why it is still the kit. */
const DIFFERENT_ON_PURPOSE = {
  // Tailwind publishes a palette and no roles: our Tailwind kit names its own
  // (--color-brand, --color-page, ...) and starts them where Tailwind Plus,
  // their own components, starts: indigo-600, gray-900 on white.
  'tailwind.brand': 'own variable', 'tailwind.page': 'own variable', 'tailwind.ink': 'own variable',
  'tailwind.inkMuted': 'own variable', 'tailwind.line': 'own variable',
  'tailwind.success': 'own variable', 'tailwind.warning': 'own variable', 'tailwind.danger': 'own variable',
  'tailwind.surface': 'own variable', 'tailwind.onBrand': 'own variable',
  // Tailwind Plus rounds its controls with rounded-md; the kit's controls are
  // rounded-lg, so --radius-lg carries that corner.
  'tailwind.radius': 'the Tailwind Plus corner',
  // daisyUI has no border colour: its line is a fact for the start card only.
  'daisyui.line': 'not written',
  // Bootstrap's own sheet never reads --bs-primary; the link colour is the
  // runtime variable that carries the same value (#0d6efd).
  'bootstrap.brand': 'same value',
  // Material derives its colour roles from the seed (the brand).
  'material.page': 'derived', 'material.ink': 'derived', 'material.inkMuted': 'derived', 'material.line': 'derived',
  // colorBgContainer and colorBgBase are both #fff out of the box.
  'antd.page': 'same value',
}

test('every default is read from the variable the build writes it into', () => {
  const off = []
  for (const [id, spec] of Object.entries(TABLE)) {
    for (const [role, read] of Object.entries(spec.vars)) {
      const written = MAP[id]?.[role]?.var
      if (written === read) continue
      if (DIFFERENT_ON_PURPOSE[`${id}.${role}`]) continue
      off.push(`${id}.${role}: read ${read}, written ${written ?? JSON.stringify(MAP[id]?.[role])}`)
    }
  }
  assert.deepEqual(off, [], 'a kit built with its own defaults would not be that kit')
})

test('where read and written differ for the same value, the value really is the same', () => {
  for (const [key, why] of Object.entries(DIFFERENT_ON_PURPOSE)) {
    if (why !== 'same value') continue
    const [id, role] = key.split('.')
    const vars = kit(id).modes.light
    const norm = (v) => String(v).trim().toLowerCase().replace(/^#fff$/, '#ffffff')
    assert.equal(norm(vars[MAP[id][role].var]), norm(vars[TABLE[id].vars[role]]), `${key}: no longer the same value`)
  }
})

test('the exceptions are still exceptions', () => {
  for (const key of Object.keys(DIFFERENT_ON_PURPOSE)) {
    const [id, role] = key.split('.')
    assert.notEqual(MAP[id]?.[role]?.var, TABLE[id].vars[role], `${key} now agrees: take it off the list`)
  }
})
